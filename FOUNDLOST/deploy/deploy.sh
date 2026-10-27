#!/usr/bin/env bash
# deploy / rollback FOUND&LOST บน VPS
#   ./deploy/deploy.sh sha-1a2b3c4     ← ใช้ tag ที่ GitHub Actions push (rollback = ใส่ tag เก่า)
#   ./deploy/deploy.sh                 ← ใช้ image เดิมใน .env (เช่น หลังแก้ backend.env)
# ทำตามลำดับ: สำรองข้อมูล → ตั้ง image tag → pull → up → รอ backend healthy
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f compose.deploy.yml)
# อยู่ร่วม VPS กับ Caddy ของโปรเจกต์อื่น (ดู deploy/compose.shared-caddy.yml)
grep -qs '^SHARED_CADDY_NETWORK=.' .env && COMPOSE+=(-f deploy/compose.shared-caddy.yml)
TAG="${1:-}"

for f in .env backend.env; do
  [[ -f "$f" ]] || { echo "ไม่พบไฟล์ $f (ดู deploy/*.example)" >&2; exit 1; }
done

./deploy/backup.sh

if [[ -n "$TAG" ]]; then
  [[ "$TAG" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "tag ไม่ถูกต้อง: $TAG" >&2; exit 1; }
  # เปลี่ยนเฉพาะส่วน tag หลัง : ของ image เดิม
  sed -i -E "s#^(BACKEND_IMAGE=[^:]+(:[0-9]+)?/[^:]+):.*#\1:${TAG}#; s#^(WEB_IMAGE=[^:]+(:[0-9]+)?/[^:]+):.*#\1:${TAG}#" .env
fi
grep -E '^(BACKEND|WEB)_IMAGE=' .env

bash deploy/check-vps.sh
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" pull
"${COMPOSE[@]}" up -d --remove-orphans

echo "รอ backend healthy..."
for _ in $(seq 1 40); do
  id="$("${COMPOSE[@]}" ps -q backend)"
  status="$(docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null || echo starting)"
  if [[ "$status" == "healthy" ]]; then
    "${COMPOSE[@]}" ps
    echo "deploy สำเร็จ"
    exit 0
  fi
  sleep 3
done

echo "backend ไม่ healthy ภายใน 2 นาที" >&2
"${COMPOSE[@]}" ps >&2
"${COMPOSE[@]}" logs --tail=100 backend >&2
exit 1
