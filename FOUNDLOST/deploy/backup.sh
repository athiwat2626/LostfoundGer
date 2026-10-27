#!/usr/bin/env bash
# สำรองฐานข้อมูล + รูปที่ผู้ใช้อัปโหลด ไปที่ $BACKUP_DIR/<วันเวลา>/
#   ./deploy/backup.sh
# ตั้งรันทุกวัน (crontab -e):
#   0 3 * * * /opt/foundlost/deploy/backup.sh >> /opt/foundlost/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f compose.deploy.yml)
BACKUP_DIR="${BACKUP_DIR:-$HOME/foundlost-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

if [[ -z "$("${COMPOSE[@]}" ps -q --status running db 2>/dev/null)" ]]; then
  echo "ยังไม่มีฐานข้อมูลที่ทำงานอยู่ — ข้ามการสำรอง"
  exit 0
fi

DEST="$BACKUP_DIR/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"
chmod 700 "$BACKUP_DIR" "$DEST"

"${COMPOSE[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DEST/db.dump"

if [[ -n "$("${COMPOSE[@]}" ps -q --status running backend 2>/dev/null)" ]]; then
  "${COMPOSE[@]}" exec -T backend tar czf - -C /app/assets \
    foundUploads lostUploads profileUploads reportUploads > "$DEST/uploads.tgz"
fi

# ลบเฉพาะโฟลเดอร์สำรองที่เก่ากว่า KEEP_DAYS วันใน BACKUP_DIR
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime "+$KEEP_DAYS" -exec rm -rf {} +

echo "สำรองข้อมูลแล้ว: $DEST ($(du -sh "$DEST" | cut -f1))"
