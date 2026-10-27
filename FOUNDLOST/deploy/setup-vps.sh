#!/usr/bin/env bash
# เตรียม VPS ใหม่ (Ubuntu 22.04/24.04 เช่น Hostinger KVM) ครั้งเดียว — รันด้วย sudo
#   sudo bash setup-vps.sh <ผู้ใช้สำหรับ deploy> [โฟลเดอร์แอป]
# ติดตั้ง Docker, เปิดไฟร์วอลล์เฉพาะ 22/80/443, สร้างผู้ใช้ deploy และโฟลเดอร์แอป
set -euo pipefail

DEPLOY_USER="${1:?ระบุชื่อผู้ใช้ deploy เช่น deploy}"
APP_DIR="${2:-/opt/foundlost}"

apt-get update
apt-get install -y ca-certificates curl ufw

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

mkdir -p "$APP_DIR/deploy"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

cat <<EOF
เสร็จแล้ว ขั้นต่อไป:
  1. ใส่ public key ของ GitHub Actions ใน /home/$DEPLOY_USER/.ssh/authorized_keys
  2. สร้าง $APP_DIR/.env และ $APP_DIR/backend.env จาก deploy/*.example แล้ว chmod 600
  3. ตั้ง DNS A record ของโดเมนให้ชี้มาที่ IP ของเครื่องนี้
  4. รัน workflow "Deploy" บน GitHub (หรือ $APP_DIR/deploy/deploy.sh <tag>)
EOF
