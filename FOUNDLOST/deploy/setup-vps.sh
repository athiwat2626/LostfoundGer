#!/usr/bin/env bash
# เตรียม VPS (Ubuntu 22.04/24.04) สำหรับ FOUND&LOST ครั้งเดียว — รันด้วย sudo
#   sudo bash setup-vps.sh <ผู้ใช้สำหรับ deploy> [โฟลเดอร์แอป]
# ปลอดภัยกับ VPS ที่มีแอปอื่นอยู่แล้ว: ติดตั้งเฉพาะสิ่งที่ยังไม่มี, ไม่เปิด/ปิดไฟร์วอลล์ให้เอง,
# ไม่แก้ config Nginx ของเว็บอื่น และไม่ยุ่งกับ container อื่น
set -euo pipefail

DEPLOY_USER="${1:?ระบุชื่อผู้ใช้ deploy เช่น deploy}"
APP_DIR="${2:-/opt/foundlost}"

if [[ -d "$APP_DIR" && -n "$(ls -A "$APP_DIR" 2>/dev/null)" && ! -f "$APP_DIR/compose.deploy.yml" && ! -d "$APP_DIR/deploy" ]]; then
  echo "โฟลเดอร์ $APP_DIR มีไฟล์ของโปรแกรมอื่นอยู่ — เลือกโฟลเดอร์ใหม่" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl

command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
# Nginx/certbot ใช้เมื่อ 80/443 ว่างหรือเป็น Nginx อยู่แล้ว — ถ้าโปรแกรมอื่นถืออยู่ (เช่น Caddy ของอีกโปรเจกต์)
# ข้ามไป เพราะ Nginx จะเริ่มไม่ได้ และแอปนี้ใช้ deploy/compose.shared-caddy.yml แทน
if command -v nginx >/dev/null || ! ss -Hltn '( sport = :80 or sport = :443 )' | grep -q .; then
  command -v nginx >/dev/null || apt-get install -y nginx
  command -v certbot >/dev/null || apt-get install -y certbot python3-certbot-nginx
else
  echo "พอร์ต 80/443 ถูกโปรแกรมอื่นใช้อยู่ — ไม่ติดตั้ง Nginx/certbot"
fi

id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"

# ไฟร์วอลล์: เพิ่มกฎ allow 80/443 เท่านั้น (ไม่ enable ufw ให้เอง — อาจบล็อกแอปอื่นที่ใช้พอร์ตอื่น)
if [[ -f /etc/iptables/rules.v4 ]] && grep -q "REJECT" /etc/iptables/rules.v4; then
  # Oracle Cloud: image มีกฎ iptables ของตัวเอง — เปิด 80/443 ก่อนกฎ REJECT
  # และต้องเปิด 80/443 ใน Security List ของ VCN บนหน้าเว็บ Oracle ด้วย
  for rule in "-p tcp --dport 80" "-p tcp --dport 443"; do
    # shellcheck disable=SC2086
    iptables -C INPUT -m state --state NEW $rule -j ACCEPT 2>/dev/null \
      || iptables -I INPUT 5 -m state --state NEW $rule -j ACCEPT
  done
  netfilter-persistent save
elif command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp
  ufw allow 443/tcp
fi
# พอร์ตแอป (APP_PORT) bind ที่ 127.0.0.1 จึงไม่ต้องเปิดไฟร์วอลล์

mkdir -p "$APP_DIR/deploy"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

cat <<EOF
เสร็จแล้ว ขั้นต่อไป (ดู DEPLOY_GUIDE.md ข้อ 7):
  1. ใส่ public key ของ GitHub Actions ใน /home/$DEPLOY_USER/.ssh/authorized_keys
  2. ตั้ง DNS A record "app" ของ foundlost.tech ให้ชี้มาที่ IP ของเครื่องนี้
  3. คัดลอกไฟล์ FOUNDLOST/compose.deploy.yml และ deploy/ มาไว้ที่ $APP_DIR
     แล้วรัน: bash deploy/make-env.sh <อีเมลแอดมิน> && bash deploy/check-vps.sh
  4. ติดตั้ง deploy/nginx.conf → nginx -t → reload → certbot --nginx -d app.foundlost.tech --redirect
  5. รัน workflow "Deploy" บน GitHub
EOF
