-- ค่าระบบที่แอดมินปรับได้จากหน้าตั้งค่า (ไม่มีแถว = ใช้ค่าเริ่มต้นใน services/settings.js)
-- รันอัตโนมัติตอนเริ่ม backend (server.js) และรันซ้ำได้
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by BIGINT REFERENCES admins(admin_id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
