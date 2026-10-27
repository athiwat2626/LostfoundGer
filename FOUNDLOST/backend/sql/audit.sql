-- บันทึกการกระทำของแอดมิน (audit log) — เพิ่มได้อย่างเดียว ห้ามแก้ไข/ลบ
-- รันอัตโนมัติตอนเริ่ม backend (server.js) และรันซ้ำได้

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    -- ไม่ตั้ง ON DELETE: ลบบัญชีแอดมินที่มีประวัติไม่ได้ (ให้ปิดใช้งานแทน) ประวัติจึงไม่หาย
    admin_id BIGINT REFERENCES admins(admin_id),
    -- อีเมลขณะเกิดเหตุ (ล็อกอินล้มเหลวด้วยอีเมลที่ไม่มีในระบบ จะมีแต่อีเมล ไม่มี admin_id)
    admin_email VARCHAR(255),
    action VARCHAR(40) NOT NULL,
    target_type VARCHAR(20),
    target_id VARCHAR(64),
    summary VARCHAR(300) NOT NULL,
    -- ค่าก่อน/หลัง และรายละเอียดอื่น (ไม่เก็บรหัสผ่านหรือ token)
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);

-- กันการแก้ไข/ลบบันทึกจากแอปพลิเคชัน (ต้องมีสิทธิ์เจ้าของฐานข้อมูลจึงจะปิด trigger ได้)
CREATE OR REPLACE FUNCTION admin_audit_logs_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'admin_audit_logs is append-only (% not allowed)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_audit_logs_append_only ON admin_audit_logs;
CREATE TRIGGER trg_admin_audit_logs_append_only
    BEFORE UPDATE OR DELETE ON admin_audit_logs
    FOR EACH ROW EXECUTE FUNCTION admin_audit_logs_append_only();
