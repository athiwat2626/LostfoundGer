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
    student_id VARCHAR(20) NOT NULL,
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
    student_id VARCHAR(20) NOT NULL,
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