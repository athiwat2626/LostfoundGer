#!/usr/bin/env bash
# ติดตั้ง FOUND&LOST ตัวใหม่ที่ app.foundlost.tech บน VPS ครั้งแรก — รันด้วย root:
#   bash <(curl -fsSL https://raw.githubusercontent.com/athiwat2626/LostfoundGer/main/FOUNDLOST/deploy/install.sh)
# (ใช้ bash <(...) ไม่ใช่ curl | bash เพื่อให้ถามอีเมลได้)
#
# เลือกวิธีเองตามสิ่งที่ถือพอร์ต 80/443 อยู่:
#   - ว่าง / Nginx           → ใช้ Nginx + certbot ของเครื่อง (deploy/nginx.conf)
#   - Caddy ใน container อื่น → ต่อท้าย Caddyfile ของตัวนั้น (สำรองก่อน, validate, ถ้าพังคืนค่าเดิม)
#                              แล้วให้ web ของแอปนี้เข้า network ของมัน (deploy/compose.shared-caddy.yml)
# หยุดก่อนแตะอะไรถ้าเจอสิ่งที่ไม่รู้จัก
set -euo pipefail
RAW=https://raw.githubusercontent.com/athiwat2626/LostfoundGer/main/FOUNDLOST
APP_DIR=/opt/foundlost
DOMAIN=app.foundlost.tech
ALIAS=foundlost-app-web
[[ $EUID -eq 0 ]] || { echo "ต้องรันด้วย root"; exit 1; }

echo "== 1/7 ตรวจของเดิมบนเครื่อง"
holders="$(ss -Hltnp '( sport = :80 or sport = :443 )' | grep -o 'users:(("[^"]*"' | cut -d'"' -f2 | sort -u | tr '\n' ' ')"
holders="${holders% }"
echo "พอร์ต 80/443 ใช้โดย: ${holders:-ไม่มี}"
if [[ -z "$holders" || "$holders" == nginx ]]; then
  MODE=nginx
elif [[ "$holders" == docker-proxy ]]; then
  MODE=shared
  CADDY_C="$(docker ps --filter publish=443 --format '{{.Names}}' | head -1)"
  CADDY_F="$(docker inspect "$CADDY_C" --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)"
  nets="$(docker inspect "$CADDY_C" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null || true)"
  SHARED_NET="$(tr ' ' '\n' <<<"$nets" | grep -m1 edge || tr ' ' '\n' <<<"$nets" | grep -m1 .)"
  if [[ -z "$CADDY_C" || -z "$CADDY_F" || ! -f "$CADDY_F" || -z "$SHARED_NET" ]]; then
    echo "หยุด: 80/443 เป็นของ container '${CADDY_C:-?}' แต่ไม่พบ Caddyfile ที่ mount จากเครื่อง — ส่งผลนี้ให้ Claude"
    docker ps --format '{{.Names}}  {{.Ports}}'; exit 1
  fi
else
  echo "หยุด: 80/443 ถูกใช้โดย '$holders' — ส่งผลนี้ให้ Claude ปรับวิธี"; exit 1
fi
if docker compose ls -a 2>/dev/null | awk 'NR>1{print $1}' | grep -qx foundlost \
   && ! docker compose ls -a 2>/dev/null | grep -q "$APP_DIR/compose.deploy.yml"; then
  echo "หยุด: มี compose project ชื่อ foundlost จากโฟลเดอร์อื่นอยู่แล้ว"; docker compose ls -a; exit 1
fi

echo "วิธีที่จะใช้: $MODE"
if [[ $MODE == shared ]]; then
  cat <<EOF
จะแตะโปรเจกต์เดิมเท่านี้:
  - ต่อท้าย $CADDY_F ด้วย block ของ $DOMAIN (สำรองไฟล์เดิมไว้ก่อน)
  - restart container $CADDY_C 1 ครั้ง (เว็บเดิมสะดุด ~2–5 วินาที)
  - web ของแอปใหม่เข้า network $SHARED_NET ในชื่อ $ALIAS
EOF
fi
read -rp "พิมพ์ yes เพื่อติดตั้งต่อ: " answer
[[ "$answer" == yes ]] || { echo "ยกเลิก — ยังไม่มีอะไรถูกแก้"; exit 1; }
read -rp "อีเมลแอดมินแรกของเว็บ: " ADMIN_EMAIL
[[ "$ADMIN_EMAIL" == *@*.* ]] || { echo "อีเมลไม่ถูกต้อง"; exit 1; }

echo "== 2/7 ติดตั้ง Docker (และ Nginx/certbot ถ้าใช้) + ผู้ใช้ deploy"
curl -fsSL "$RAW/deploy/setup-vps.sh" -o /tmp/setup-vps.sh
bash /tmp/setup-vps.sh deploy "$APP_DIR"

echo "== 3/7 ดาวน์โหลดไฟล์ deploy ไปที่ $APP_DIR"
curl -fsSL "$RAW/compose.deploy.yml" -o "$APP_DIR/compose.deploy.yml"
for f in .env.deploy.example backend.env.example compose.shared-caddy.yml deploy.sh backup.sh restore.sh check-vps.sh make-env.sh nginx.conf install.sh; do
  curl -fsSL "$RAW/deploy/$f" -o "$APP_DIR/deploy/$f"
done
chmod +x "$APP_DIR"/deploy/*.sh

echo "== 4/7 สร้าง .env / backend.env (สุ่มรหัสให้)"
chown -R deploy:deploy "$APP_DIR"
sudo -u deploy bash "$APP_DIR/deploy/make-env.sh" "$ADMIN_EMAIL"
if [[ $MODE == shared ]] && ! grep -q '^SHARED_CADDY_NETWORK=' "$APP_DIR/.env"; then
  echo "SHARED_CADDY_NETWORK=$SHARED_NET" >> "$APP_DIR/.env"
fi

echo "== 5/7 ตรวจการชน"
sudo -u deploy bash "$APP_DIR/deploy/check-vps.sh"

echo "== 6/7 เส้นทางเว็บ + HTTPS ของ $DOMAIN"
if [[ $MODE == shared ]]; then
  if grep -qE "^[[:space:]]*$DOMAIN[[:space:]]*\{" "$CADDY_F"; then
    echo "$CADDY_F มี $DOMAIN อยู่แล้ว — ข้าม"
  else
    BAK="$CADDY_F.bak-$(date +%Y%m%d-%H%M%S)"
    cp -p "$CADDY_F" "$BAK"
    # >> เขียนต่อไฟล์เดิม (inode เดิม) container จึงเห็นทันทีโดยไม่ต้อง recreate
    printf '\n# FOUNDLOST ตัวใหม่ — เพิ่มโดย %s/deploy/install.sh (ไฟล์เดิม: %s)\n%s {\n\tencode zstd gzip\n\treverse_proxy %s:80\n}\n' \
      "$APP_DIR" "$BAK" "$DOMAIN" "$ALIAS" >> "$CADDY_F"
    if ! docker exec "$CADDY_C" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
      cat "$BAK" > "$CADDY_F"
      echo "หยุด: Caddyfile ใหม่ไม่ผ่าน validate — คืนไฟล์เดิมแล้ว (container เดิมไม่ถูก restart)"; exit 1
    fi
    old_domain="$(docker exec "$CADDY_C" printenv APP_DOMAIN 2>/dev/null || true)"
    docker restart "$CADDY_C" >/dev/null
    up=""
    for _ in $(seq 1 20); do
      sleep 3
      if [[ -z "$old_domain" ]] || curl -sk -o /dev/null --resolve "$old_domain:443:127.0.0.1" "https://$old_domain/"; then up=1; break; fi
    done
    if [[ -z "$up" ]]; then
      echo "เว็บเดิม ($old_domain) ไม่ตอบหลัง restart — คืนไฟล์เดิมแล้ว restart อีกครั้ง"
      cat "$BAK" > "$CADDY_F"; docker restart "$CADDY_C" >/dev/null; exit 1
    fi
    echo "Caddy เดิมรับ $DOMAIN แล้ว — เว็บเดิม ($old_domain) ยังตอบปกติ"
  fi
else
  cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/foundlost.conf
  ln -sf /etc/nginx/sites-available/foundlost.conf /etc/nginx/sites-enabled/foundlost.conf
  nginx -t
  systemctl reload nginx
  my_ip="$(curl -4fsS https://ifconfig.me || true)"
  if [[ -n "$my_ip" ]] && getent ahostsv4 "$DOMAIN" | awk '{print $1}' | grep -qx "$my_ip"; then
    certbot --nginx -d "$DOMAIN" --redirect --non-interactive --agree-tos -m "$ADMIN_EMAIL"
  else
    echo "! DNS ของ $DOMAIN ยังไม่ชี้มาที่เครื่องนี้ — รันทีหลัง: certbot --nginx -d $DOMAIN --redirect"
  fi
fi

echo "== 7/7 สร้าง SSH key ให้ GitHub Actions"
KEY=/root/foundlost_gha
[[ -f $KEY ]] || ssh-keygen -q -t ed25519 -N "" -C github-actions-foundlost -f "$KEY"
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
grep -qF "$(cat $KEY.pub)" /home/deploy/.ssh/authorized_keys || cat "$KEY.pub" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

cat <<EOF

================ ติดตั้งบน VPS เสร็จ ================
($DOMAIN จะขึ้น 502 จนกว่าจะรัน workflow Deploy ครั้งแรก)
GitHub → repo LostfoundGer → Settings → Environments → New environment ชื่อ: production
เพิ่ม Environment secrets:
  VPS_HOST        = IP ของเครื่องนี้
  VPS_USER        = deploy
  VPS_APP_DIR     = $APP_DIR
  APP_HEALTH_URL  = https://$DOMAIN/backend/health
  VPS_SSH_KEY     = ข้อความทั้งหมดระหว่างเส้นด้านล่าง (รวมบรรทัด BEGIN/END)
และ Settings → Secrets and variables → Actions → Variables: DEPLOY_ENABLED = true
-----------------------------------------------------------
EOF
cat "$KEY"
cat <<EOF
-----------------------------------------------------------
คัดลอกเสร็จแล้วลบ private key ออกจาก VPS:  rm $KEY
ดูรหัสแอดมินแรก:  grep ADMIN_SEED_PASSWORD $APP_DIR/backend.env
EOF
