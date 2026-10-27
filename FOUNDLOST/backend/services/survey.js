// ข้อคำถามและการสรุปผลแบบประเมินความพึงพอใจ (ตรงกับตารางที่ 4.4 และ 4.5 ในรูปเล่มปัญหาพิเศษ)
const QUESTIONS = [
  { key: "q1", text: "ระบบใช้งานง่ายและเข้าใจได้ทันที" },
  { key: "q2", text: "การแจ้งของหายและแจ้งพบของสะดวกรวดเร็ว" },
  { key: "q3", text: "การค้นหาและกรองรายการตรงกับความต้องการ" },
  { key: "q4", text: "การจับคู่และการแจ้งเตือนช่วยให้พบของได้เร็วขึ้น" },
  { key: "q5", text: "การติดต่อเจ้าของโพสต์สะดวกและปลอดภัย" },
  { key: "q6", text: "การแจ้งเตือนผ่าน LINE มีประโยชน์", optional: true },
  { key: "q7", text: "หน้าจอสวยงามและแสดงผลดีบนโทรศัพท์มือถือ" },
  { key: "q8", text: "ความพึงพอใจโดยรวมต่อระบบ" },
];

const ROLES = { student: "นิสิต", staff: "บุคลากร", other: "อื่น ๆ" };

// เกณฑ์การแปลผลค่าเฉลี่ย (ตารางที่ 4.4)
const levelOf = (mean) => {
  if (mean == null) return "-";
  if (mean >= 4.21) return "มากที่สุด";
  if (mean >= 3.41) return "มาก";
  if (mean >= 2.61) return "ปานกลาง";
  if (mean >= 1.81) return "น้อย";
  return "น้อยที่สุด";
};

const round2 = (n) => Math.round(n * 100) / 100;

// ค่าเฉลี่ย และส่วนเบี่ยงเบนมาตรฐานของกลุ่มตัวอย่าง (n − 1)
const describe = (values) => {
  const n = values.length;
  if (n === 0) return { n, mean: null, sd: null, level: "-" };
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const sd = n > 1 ? Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1)) : 0;
  // แปลผลจากค่าที่ปัดแล้ว (ค่าเดียวกับที่แสดงในตาราง)
  return { n, mean: round2(mean), sd: round2(sd), level: levelOf(round2(mean)) };
};

const summarize = (rows) => {
  const items = QUESTIONS.map((q) => ({
    key: q.key,
    text: q.text,
    ...describe(rows.map((r) => r[q.key]).filter((v) => v != null).map(Number)),
  }));
  const all = rows.flatMap((r) => QUESTIONS.map((q) => r[q.key]).filter((v) => v != null).map(Number));
  const byRole = Object.fromEntries(Object.keys(ROLES).map((role) => [role, rows.filter((r) => r.respondent_role === role).length]));
  return { responses: rows.length, by_role: byRole, items, overall: describe(all) };
};

// ตรวจคำตอบจากหน้าเว็บ → แถวที่บันทึกได้ หรือ { error }
const parseSubmission = (body = {}) => {
  if (!Object.hasOwn(ROLES, body.respondent_role)) return { error: "กรุณาเลือกสถานะผู้ตอบ" };
  const row = { respondent_role: body.respondent_role };
  for (const q of QUESTIONS) {
    const raw = body[q.key];
    if (q.optional && (raw === null || raw === undefined || raw === "")) {
      row[q.key] = null;
      continue;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > 5) return { error: `กรุณาให้คะแนนข้อ "${q.text}"` };
    row[q.key] = value;
  }
  const suggestion = typeof body.suggestion === "string" ? body.suggestion.trim() : "";
  if (suggestion.length > 2000) return { error: "ข้อเสนอแนะยาวเกิน 2,000 ตัวอักษร" };
  row.suggestion = suggestion || null;
  return { row };
};

module.exports = { QUESTIONS, ROLES, levelOf, describe, summarize, parseSubmission };
