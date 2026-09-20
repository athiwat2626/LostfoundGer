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
-- OTP
CREATE TABLE IF NOT EXISTS otp_codes (
    otp_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


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
