-- สถานะโพสต์: open = ยังไม่ได้คืน / returned = รับคืนแล้ว
ALTER TABLE found_items ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open';
ALTER TABLE found_items ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE found_items ADD COLUMN IF NOT EXISTS returned_by VARCHAR(20);
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open';
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS returned_by VARCHAR(20);

-- การติดต่อเรื่องสิ่งของ ("ฉันเจอของชิ้นนี้" / "นี่ของฉัน")
CREATE TABLE IF NOT EXISTS claims (
    claim_id BIGSERIAL PRIMARY KEY,
    item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('found', 'lost')),
    item_id BIGINT NOT NULL,
    claimant_student_id VARCHAR(20) NOT NULL REFERENCES users(student_id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (item_type, item_id, claimant_student_id)
);
CREATE INDEX IF NOT EXISTS idx_claims_item ON claims(item_type, item_id);

-- การแจ้งเตือนของผู้ใช้ (กระดิ่ง)
CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL REFERENCES users(student_id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    link VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(student_id, is_read, created_at DESC);
