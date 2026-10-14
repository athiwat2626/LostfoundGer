-- Users
CREATE TABLE IF NOT EXISTS users (
    student_id VARCHAR(20) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- ช่องทางติดต่อของผู้ใช้ (หน้าตั้งค่า)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_contact VARCHAR(10) NOT NULL DEFAULT 'email';
-- OTP
CREATE TABLE IF NOT EXISTS otp_codes (
    otp_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;


-- Lost Items
CREATE TABLE IF NOT EXISTS lost_items (
    item_id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(20),
    image_url TEXT,
    lost_date DATE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    item_color VARCHAR(100),
    lost_location VARCHAR(255),
    description TEXT,
    deposit_location VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lost_items_user
        FOREIGN KEY (student_id)
        REFERENCES users(student_id)
        ON DELETE CASCADE
);


-- Found Items
CREATE TABLE IF NOT EXISTS found_items (
    item_id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(20),
    image_url TEXT,
    found_date DATE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    item_color VARCHAR(100),
    found_location VARCHAR(255),
    description TEXT,
    deposit_location VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_found_items_user
        FOREIGN KEY (student_id)
        REFERENCES users(student_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lost_items_location
    ON lost_items(lost_location);

-- Admins
CREATE TABLE IF NOT EXISTS admins (
    admin_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Moderation state on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS warning_count INTEGER NOT NULL DEFAULT 0;

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    report_id VARCHAR(20) PRIMARY KEY,
    reporter_student_id VARCHAR(20),
    reported_item_id BIGINT NOT NULL,
    item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('found', 'lost')),
    reason VARCHAR(100) NOT NULL,
    detail TEXT,
    evidence_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Moderation state on reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by BIGINT REFERENCES admins(admin_id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS action_taken VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

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
