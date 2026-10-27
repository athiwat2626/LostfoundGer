#!/usr/bin/env bash
# ตรวจว่า FOUND&LOST จะไม่ชนกับแอปอื่นบน VPS (อ่านอย่างเดียว ไม่แก้อะไร)
#   bash deploy/check-vps.sh
# ตรวจ: พอร์ต APP_PORT, ชื่อ compose project, โดเมนใน config Nginx, DNS
# deploy.sh เรียกสคริปต์นี้ก่อน up ทุกครั้ง — ถ้าชนจะหยุดก่อนแตะ container ใด ๆ
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT=foundlost
DOMAIN="${APP_DOMAIN:-app.foundlost.tech}"
APP_PORT="$(grep -E '^APP_PORT=' .env 2>/dev/null | cut -d= -f2 || true)"
APP_PORT="${APP_PORT:-3310}"
problems=0
fail() { echo "✗ $*" >&2; problems=1; }
ok() { echo "✓ $*"; }

# 1) พอร์ต: ว่าง หรือเป็น container ของ project นี้เอง (ตอน deploy ซ้ำ)
if ss -Hltn "sport = :$APP_PORT" | grep -q .; then
  owner="$(docker ps --filter "publish=$APP_PORT" --format '{{.Label "com.docker.compose.project"}}' | sort -u)"
  if [[ "$owner" == "$PROJECT" ]]; then
    ok "พอร์ต $APP_PORT ใช้โดย $PROJECT อยู่แล้ว (deploy ซ้ำ)"
  else
    fail "พอร์ต $APP_PORT ถูกใช้โดยโปรแกรมอื่น${owner:+ (compose project: $owner)} — เปลี่ยน APP_PORT ใน .env และ proxy_pass ใน nginx.conf"
  fi
else
  ok "พอร์ต 127.0.0.1:$APP_PORT ว่าง"
fi

# 2) compose project ชื่อเดียวกันที่รันจากโฟลเดอร์อื่น
other_dir="$(docker compose ls -a --format json 2>/dev/null \
  | grep -o "\"Name\":\"$PROJECT\"[^}]*\"ConfigFiles\":\"[^\"]*\"" \
  | sed -E 's/.*"ConfigFiles":"([^"]*)".*/\1/' || true)"
if [[ -n "$other_dir" && "$other_dir" != *"$(pwd)/compose.deploy.yml"* ]]; then
  fail "มี compose project ชื่อ $PROJECT จากไฟล์อื่นอยู่แล้ว: $other_dir"
else
  ok "ชื่อ compose project '$PROJECT' ไม่ชน"
fi

# 3) โดเมนต้องมีใน Nginx เฉพาะไฟล์ของแอปนี้ (foundlost.conf)
SHARED_NET="$(grep -E '^SHARED_CADDY_NETWORK=' .env 2>/dev/null | cut -d= -f2 || true)"
if [[ -n "$SHARED_NET" ]]; then
  # โหมดใช้ Caddy ของโปรเจกต์อื่น: network ต้องมีอยู่ และชื่อ foundlost-app-web ต้องไม่ถูกตัวอื่นใช้
  if docker network inspect "$SHARED_NET" >/dev/null 2>&1; then
    ok "network $SHARED_NET มีอยู่"
    users="$(docker network inspect "$SHARED_NET" --format '{{range .Containers}}{{.Name}} {{end}}')"
    for c in $users; do
      [[ "$c" == "$PROJECT"-* ]] && continue
      if docker inspect "$c" --format '{{range .NetworkSettings.Networks}}{{join .Aliases " "}} {{end}}' | grep -qw foundlost-app-web; then
        fail "ชื่อ foundlost-app-web ถูก container $c ใช้อยู่แล้ว"
      fi
    done
  else
    fail "ไม่พบ network $SHARED_NET (SHARED_CADDY_NETWORK ใน .env)"
  fi
elif [[ -d /etc/nginx ]]; then
  others="$(grep -rlsE "server_name[^;]*[[:space:]]$DOMAIN([[:space:]]|;)" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null \
    | xargs -r -n1 readlink -f | sort -u | grep -v '/foundlost\.conf$' || true)"
  if [[ -n "$others" ]]; then
    fail "$DOMAIN ถูกตั้งใน config Nginx อื่นแล้ว: $others"
  else
    ok "$DOMAIN ไม่ชนกับ config Nginx อื่น"
  fi
  [[ -e /etc/nginx/sites-enabled/foundlost.conf ]] \
    || echo "! ยังไม่ได้ติดตั้ง deploy/nginx.conf (ดู DEPLOY_GUIDE.md ข้อ 7)"
else
  echo "! ไม่พบ Nginx บนเครื่องนี้ — รัน deploy/setup-vps.sh ก่อน"
fi

# 4) DNS (แจ้งเตือนเท่านั้น)
resolved="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)"
echo "${resolved:+i $DOMAIN → $resolved}${resolved:-! $DOMAIN ยังไม่มี DNS A record}"

exit "$problems"
