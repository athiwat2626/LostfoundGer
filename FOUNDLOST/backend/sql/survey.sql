-- แบบประเมินความพึงพอใจ (หน้า /survey ตอบได้โดยไม่ต้องเข้าสู่ระบบ)
-- q1–q8 = คะแนน 1–5 ตามข้อใน services/survey.js (q6 การแจ้งเตือนผ่าน LINE ตอบ "ไม่ได้ใช้" ได้ = NULL)
-- รันอัตโนมัติตอนเริ่ม backend (server.js) และรันซ้ำได้
CREATE TABLE IF NOT EXISTS satisfaction_surveys (
    survey_id BIGSERIAL PRIMARY KEY,
    respondent_role VARCHAR(20) NOT NULL CHECK (respondent_role IN ('student', 'staff', 'other')),
    q1 SMALLINT NOT NULL CHECK (q1 BETWEEN 1 AND 5),
    q2 SMALLINT NOT NULL CHECK (q2 BETWEEN 1 AND 5),
    q3 SMALLINT NOT NULL CHECK (q3 BETWEEN 1 AND 5),
    q4 SMALLINT NOT NULL CHECK (q4 BETWEEN 1 AND 5),
    q5 SMALLINT NOT NULL CHECK (q5 BETWEEN 1 AND 5),
    q6 SMALLINT CHECK (q6 BETWEEN 1 AND 5),
    q7 SMALLINT NOT NULL CHECK (q7 BETWEEN 1 AND 5),
    q8 SMALLINT NOT NULL CHECK (q8 BETWEEN 1 AND 5),
    suggestion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_created ON satisfaction_surveys(created_at DESC);
