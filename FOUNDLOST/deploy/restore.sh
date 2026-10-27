#!/usr/bin/env bash
# กู้คืนข้อมูลจากโฟลเดอร์ที่ backup.sh สร้าง
#
#   ./deploy/restore.sh <backup-dir>
#       ซ้อมกู้คืน (ค่าเริ่มต้น): restore ลงฐานทดสอบ foundlost_restore_test แล้วนับแถว ไม่แตะฐานจริง
#
#   ./deploy/restore.sh <backup-dir> --production
#       เขียนทับฐานจริงและรูปอัปโหลด — ต้องพิมพ์ RESTORE ยืนยัน, ระบบจะ backup สถานะปัจจุบันก่อน
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f compose.deploy.yml)
# อยู่ร่วม VPS กับ Caddy ของโปรเจกต์อื่น (ดู deploy/compose.shared-caddy.yml)
grep -qs '^SHARED_CADDY_NETWORK=.' .env && COMPOSE+=(-f deploy/compose.shared-caddy.yml)
SRC="${1:?ระบุโฟลเดอร์ backup เช่น ~/foundlost-backups/20261027-030000}"
MODE="${2:-}"
[[ -f "$SRC/db.dump" ]] || { echo "ไม่พบ $SRC/db.dump" >&2; exit 1; }

psql_db() { "${COMPOSE[@]}" exec -T db sh -c "psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d $1"; }

if [[ "$MODE" != "--production" ]]; then
  TEST_DB=foundlost_restore_test
  echo "DROP DATABASE IF EXISTS $TEST_DB; CREATE DATABASE $TEST_DB;" | psql_db postgres
  "${COMPOSE[@]}" exec -T db sh -c "pg_restore -U \"\$POSTGRES_USER\" -d $TEST_DB --no-owner" < "$SRC/db.dump"
  echo "SELECT 'users' AS t, count(*) FROM users UNION ALL SELECT 'found_items', count(*) FROM found_items UNION ALL SELECT 'lost_items', count(*) FROM lost_items;" | psql_db "$TEST_DB"
  echo "ซ้อมกู้คืนสำเร็จบน $TEST_DB (ฐานจริงไม่ถูกแตะ) — ลบได้ด้วย: DROP DATABASE $TEST_DB"
  exit 0
fi

read -r -p "จะเขียนทับฐานข้อมูลและรูปจริงด้วย $SRC — พิมพ์ RESTORE เพื่อยืนยัน: " answer
[[ "$answer" == "RESTORE" ]] || { echo "ยกเลิก"; exit 1; }

./deploy/backup.sh
"${COMPOSE[@]}" stop backend
"${COMPOSE[@]}" exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < "$SRC/db.dump"
if [[ -f "$SRC/uploads.tgz" ]]; then
  "${COMPOSE[@]}" run --rm --no-deps --entrypoint tar backend xzf - -C /app/assets < "$SRC/uploads.tgz"
fi
"${COMPOSE[@]}" start backend
echo "กู้คืนสำเร็จ — ตรวจ https://<APP_DOMAIN>/backend/health"
