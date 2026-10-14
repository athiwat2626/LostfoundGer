-- ระบบ LINE Bot: เชื่อมบัญชี, ประวัติการแจ้งเตือน และกันแจ้งเตือนคู่รายการซ้ำ
-- รันอัตโนมัติตอนเริ่ม backend (server.js) และรันซ้ำได้โดยไม่ทำให้ข้อมูลเดิมเสียหาย
-- ไม่มีการเก็บ Channel Access Token / Channel Secret ในฐานข้อมูล (อยู่ใน environment variables เท่านั้น)

-- บัญชี LINE ที่เพิ่มเพื่อน OA และบัญชีผู้ใช้ที่เชื่อมไว้ (1 LINE ↔ 1 บัญชี)
CREATE TABLE IF NOT EXISTS line_accounts (
    line_user_id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE REFERENCES users(student_id) ON DELETE SET NULL,
    display_name VARCHAR(100),
    is_following BOOLEAN NOT NULL DEFAULT TRUE,
    notify_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    linked_at TIMESTAMPTZ,
    followed_at TIMESTAMPTZ,
    unfollowed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- รหัสเชื่อมบัญชีแบบใช้ครั้งเดียว (เก็บเฉพาะ SHA-256 ของรหัส ไม่เก็บรหัสจริง)
CREATE TABLE IF NOT EXISTS line_link_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    line_user_id VARCHAR(64) NOT NULL REFERENCES line_accounts(line_user_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by_student_id VARCHAR(20) REFERENCES users(student_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_line_user ON line_link_tokens(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_expires ON line_link_tokens(expires_at);

-- webhook event ที่ประมวลผลแล้ว (กัน LINE ส่ง event ซ้ำตอน redelivery)
CREATE TABLE IF NOT EXISTS line_webhook_events (
    webhook_event_id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(30) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_line_webhook_events_received ON line_webhook_events(received_at);

-- การส่งข้อความ LINE แต่ละครั้ง (ประวัติการแจ้งเตือน + สถานะ + retry)
-- status: sending → sent | retry → ... | failed
-- retry_key ใช้เป็น X-Line-Retry-Key: ส่งซ้ำด้วย key เดิม LINE จะไม่ส่งข้อความซ้ำให้ผู้ใช้
CREATE TABLE IF NOT EXISTS line_deliveries (
    delivery_id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(20) REFERENCES users(student_id) ON DELETE SET NULL,
    line_user_id VARCHAR(64) NOT NULL,
    notification_type VARCHAR(30) NOT NULL,
    item_type VARCHAR(10) CHECK (item_type IN ('found', 'lost')),
    item_id BIGINT,
    title VARCHAR(200) NOT NULL,
    payload JSONB NOT NULL,
    retry_key UUID NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'sending'
        CHECK (status IN ('sending', 'sent', 'retry', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ,
    last_error_code VARCHAR(40),
    last_error_message VARCHAR(500),
    line_request_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_line_deliveries_student ON line_deliveries(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_deliveries_due ON line_deliveries(status, next_attempt_at);

-- คู่ของหาย ↔ ของพบ ที่แจ้งเตือนไปแล้ว (1 คู่แจ้งได้ครั้งเดียว ไม่ว่าจะจับคู่ซ้ำกี่ครั้ง)
CREATE TABLE IF NOT EXISTS match_notifications (
    match_notification_id BIGSERIAL PRIMARY KEY,
    lost_item_id BIGINT NOT NULL REFERENCES lost_items(item_id) ON DELETE CASCADE,
    found_item_id BIGINT NOT NULL REFERENCES found_items(item_id) ON DELETE CASCADE,
    recipient_student_id VARCHAR(20) REFERENCES users(student_id) ON DELETE SET NULL,
    score INTEGER NOT NULL,
    line_delivery_id BIGINT REFERENCES line_deliveries(delivery_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lost_item_id, found_item_id)
);
CREATE INDEX IF NOT EXISTS idx_match_notifications_recipient ON match_notifications(recipient_student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_notifications_found ON match_notifications(found_item_id);
