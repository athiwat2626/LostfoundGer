#!/usr/bin/env bash
# สร้าง .env และ backend.env บน VPS จากไฟล์ตัวอย่าง พร้อมสุ่มรหัสผ่าน/secret ให้ (ไม่ต้องพิมพ์ความลับเอง)
#   bash deploy/make-env.sh <อีเมลแอดมินแรก>
# ไม่เขียนทับไฟล์ที่มีอยู่แล้ว (รหัส DB ต้องตรงกับ volume เดิม)
# ค่าที่สุ่มไม่ได้ (Gmail App Password, LINE, Google) ใส่เองภายหลังด้วย: nano backend.env
set -euo pipefail
cd "$(dirname "$0")/.."

ADMIN_EMAIL="${1:?ระบุอีเมลแอดมินแรก เช่น bash deploy/make-env.sh you@example.com}"
DOMAIN=app.foundlost.tech
rand() { openssl rand -hex "$1"; }
umask 077

if [[ -f .env ]]; then
  echo "มี .env อยู่แล้ว — ข้าม"
else
  sed -e "s#^POSTGRES_PASSWORD=.*#POSTGRES_PASSWORD=$(rand 24)#" deploy/.env.deploy.example > .env
  echo "สร้าง .env แล้ว (สุ่ม POSTGRES_PASSWORD)"
fi

if [[ -f backend.env ]]; then
  echo "มี backend.env อยู่แล้ว — ข้าม"
else
  sed -e "s#^JWT_SECRET=.*#JWT_SECRET=$(rand 48)#" \
      -e "s#^ADMIN_SEED_EMAIL=.*#ADMIN_SEED_EMAIL=${ADMIN_EMAIL}#" \
      -e "s#^ADMIN_SEED_PASSWORD=.*#ADMIN_SEED_PASSWORD=$(rand 12)#" \
      -e "s#^APP_BASE_URL=.*#APP_BASE_URL=https://${DOMAIN}#" \
      deploy/backend.env.example > backend.env
  echo "สร้าง backend.env แล้ว (สุ่ม JWT_SECRET, ADMIN_SEED_PASSWORD)"
fi

chmod 600 .env backend.env
cat <<EOF

ขั้นต่อไป:
  - ดูรหัสแอดมินแรก (แล้วเปลี่ยนในหน้าตั้งค่าหลัง login):  grep ADMIN_SEED_PASSWORD backend.env
  - ใส่ MAIL_*, LINE_*, GOOGLE_* เอง:                     nano backend.env
  - ตรวจว่าไม่ชนแอปอื่น:                                  bash deploy/check-vps.sh
EOF
