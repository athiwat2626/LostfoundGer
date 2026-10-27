// SET-xx / MNT-xx / AUD-xx : ค่าระบบ, โหมดปิดปรับปรุง และประวัติการดำเนินการของแอดมิน
const request = require("supertest");
const { backendPath, loadApp, routeQueries, useTransactionClient, findQuery, adminToken, userToken } = require("./helpers");

jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/services/lineNotification", () => ({ sendLineNotification: jest.fn() }));

const db = require(backendPath("db.js"));
const { DEFAULTS, clearSettingsCache } = require(backendPath("services/settings.js"));

let app;
beforeAll(async () => {
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  app = await loadApp();
});

beforeEach(() => {
  db.query.mockReset();
  useTransactionClient(db);
  routeQueries(db.query);
  clearSettingsCache();
});

const auth = (token = adminToken()) => ({ Authorization: `Bearer ${token}` });
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
// ค่าที่เก็บในตาราง system_settings
const stored = (settings) => [
  /SELECT key, value FROM system_settings$/,
  { rows: Object.entries(settings).map(([key, value]) => ({ key, value })) },
];

describe("SET ค่าระบบ", () => {
  test("SET-01 GET /admin/settings ยังไม่เคยตั้งค่า → คืนค่าเริ่มต้นทั้งหมด", async () => {
    const res = await request(app).get("/admin/settings").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.settings).toEqual(DEFAULTS);
    expect(res.body.settings.categories).toContain("อื่น ๆ");
  });

  test("SET-02 GET /admin/settings ไม่มี token แอดมิน → 401", async () => {
    const res = await request(app).get("/admin/settings").set(auth(userToken()));
    expect(res.status).toBe(401);
  });

  test("SET-03 PUT /admin/settings แก้เกณฑ์จับคู่ → บันทึก + audit log ใน transaction", async () => {
    const res = await request(app).put("/admin/settings").set(auth()).send({ settings: { match_min_score: 75 } });
    expect(res.status).toBe(200);
    expect(res.body.changed).toEqual(["match_min_score"]);

    const [, params] = findQuery(db.query, /INSERT INTO system_settings/);
    expect(params).toEqual(["match_min_score", "75", 1]);
    const [, audit] = findQuery(db.query, /INSERT INTO admin_audit_logs/);
    expect(audit[2]).toBe("settings.update");
    expect(audit[5]).toContain("เกณฑ์คะแนนการจับคู่");
    expect(findQuery(db.query, /^COMMIT$/)).toBeDefined();
  });

  test("SET-04 PUT ค่าเดิม (ไม่เปลี่ยนแปลง) → ไม่บันทึกและไม่สร้าง audit log", async () => {
    const res = await request(app).put("/admin/settings").set(auth()).send({ settings: { match_min_score: DEFAULTS.match_min_score } });
    expect(res.status).toBe(200);
    expect(res.body.changed).toEqual([]);
    expect(findQuery(db.query, /INSERT INTO system_settings/)).toBeUndefined();
    expect(findQuery(db.query, /INSERT INTO admin_audit_logs/)).toBeUndefined();
  });

  test.each([
    ["SET-05 เกณฑ์จับคู่ต่ำกว่า 30", { match_min_score: 10 }],
    ["SET-06 เกียรติบัตรทุก 0 ครั้ง", { certificate_milestone: 0 }],
    ["SET-07 หมวดหมู่น้อยกว่า 2 รายการ", { categories: ["กระเป๋า"] }],
    ["SET-08 ตัวเลือกวันระงับเกิน 365 วัน", { suspend_durations: [3, 400] }],
    ["SET-09 ประกาศวันเริ่มอยู่หลังวันสิ้นสุด", { announcement: { enabled: true, message: "x", tone: "info", starts_on: "2026-10-10", ends_on: "2026-10-01" } }],
    ["SET-16 เปิดประกาศแต่ไม่มีข้อความ", { announcement: { enabled: true, message: "  " } }],
    ["SET-10 คีย์ที่ไม่รู้จัก", { admin_password: "x" }],
  ])("%s → 400 ไม่บันทึก", async (_name, settings) => {
    const res = await request(app).put("/admin/settings").set(auth()).send({ settings });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(findQuery(db.query, /INSERT INTO system_settings/)).toBeUndefined();
  });

  test("SET-17 ประกาศ tone ที่ไม่รู้จัก → ปรับเป็น info", async () => {
    const res = await request(app).put("/admin/settings").set(auth()).send({ settings: { announcement: { enabled: true, message: "x", tone: "party" } } });
    expect(res.status).toBe(200);
    const [, params] = findQuery(db.query, /INSERT INTO system_settings/);
    expect(JSON.parse(params[1]).tone).toBe("info");
  });

  test("SET-11 PUT body ไม่มี settings → 400", async () => {
    const res = await request(app).put("/admin/settings").set(auth()).send({ match_min_score: 70 });
    expect(res.status).toBe(400);
  });

  test("SET-12 บันทึก audit log ไม่ได้ → ROLLBACK และตอบ 500", async () => {
    routeQueries(db.query, [[/INSERT INTO admin_audit_logs/, new Error("audit down")]]);
    const res = await request(app).put("/admin/settings").set(auth()).send({ settings: { certificate_milestone: 5 } });
    expect(res.status).toBe(500);
    expect(findQuery(db.query, /^ROLLBACK$/)).toBeDefined();
    expect(findQuery(db.query, /^COMMIT$/)).toBeUndefined();
  });

  test("SET-13 GET /api/settings/public → ส่งเฉพาะค่าสาธารณะ ไม่มีค่าภายใน", async () => {
    const res = await request(app).get("/api/settings/public");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, categories: DEFAULTS.categories, announcement: null, maintenance: { enabled: false } });
    expect(res.body).not.toHaveProperty("match_min_score");
    expect(res.body).not.toHaveProperty("certificate_signer_name");
  });

  test("SET-14 ประกาศที่อยู่ในช่วงวันที่ → แสดงใน /api/settings/public", async () => {
    routeQueries(db.query, [stored({ announcement: { enabled: true, message: "ปิดรับของวันหยุด", tone: "important", starts_on: today(), ends_on: today() } })]);
    const res = await request(app).get("/api/settings/public");
    expect(res.body.announcement).toMatchObject({ message: "ปิดรับของวันหยุด", tone: "important" });
  });

  test("SET-15 ประกาศที่หมดอายุแล้ว → ไม่แสดง", async () => {
    routeQueries(db.query, [stored({ announcement: { enabled: true, message: "เก่า", tone: "info", starts_on: "2020-01-01", ends_on: "2020-01-02" } })]);
    const res = await request(app).get("/api/settings/public");
    expect(res.body.announcement).toBeNull();
  });
});

describe("MNT โหมดปิดปรับปรุง", () => {
  const maintenanceOn = () => routeQueries(db.query, [stored({ maintenance: { enabled: true, message: "ปรับปรุงระบบ 1 ชม." } })]);

  test("MNT-01 เปิดโหมดปิดปรับปรุง → ผู้ใช้ทั่วไปได้ 503 พร้อมข้อความและ Retry-After", async () => {
    maintenanceOn();
    const res = await request(app).get("/foundItem");
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ maintenance: true, message: "ปรับปรุงระบบ 1 ชม." });
    expect(res.headers["retry-after"]).toBe("600");
  });

  test("MNT-02 ผู้ใช้ที่ล็อกอิน (token ผู้ใช้) ก็ถูกปิดกั้น → 503", async () => {
    maintenanceOn();
    const res = await request(app).get("/api/my-items").set(auth(userToken()));
    expect(res.status).toBe(503);
  });

  test("MNT-03 แอดมินยังเรียก API ได้ตามปกติ", async () => {
    maintenanceOn();
    const res = await request(app).get("/foundItem").set(auth());
    expect(res.status).toBe(200);
  });

  test.each(["/api/settings/public", "/admin/auth/login", "/"])("MNT-04 เส้นทาง %s ยังเปิดอยู่", async (url) => {
    maintenanceOn();
    const res = url === "/admin/auth/login" ? await request(app).post(url).send({}) : await request(app).get(url);
    expect(res.status).not.toBe(503);
  });

  test("MNT-05 ปิดโหมดปิดปรับปรุง → ผู้ใช้ใช้งานได้ปกติ", async () => {
    const res = await request(app).get("/foundItem");
    expect(res.status).toBe(200);
  });

  test("MNT-06 อ่านค่าระบบไม่ได้ (ฐานข้อมูลล่ม) → ใช้ค่าเริ่มต้น (ไม่ปิดระบบ)", async () => {
    routeQueries(db.query, [[/FROM system_settings/, new Error("down")]]);
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    const items = await request(app).get("/api/rankings/returners");
    expect(items.status).not.toBe(503);
  });
});

describe("AUD ประวัติการดำเนินการของแอดมิน", () => {
  test("AUD-01 GET /admin/audit-logs → รายการ + จำนวนทั้งหมด + รายชื่อแอดมิน", async () => {
    const logs = [{ log_id: 2, action: "user.ban", summary: "แบนถาวรผู้ใช้ 641" }];
    routeQueries(db.query, [
      [/FROM admin_audit_logs l LEFT JOIN/, { rows: logs }],
      [/COUNT\(\*\)::int AS total FROM admin_audit_logs/, { rows: [{ total: 1 }] }],
      [/FROM admins ORDER BY email/, { rows: [{ admin_id: 1, email: "admin@ku.th" }] }],
    ]);
    const res = await request(app).get("/admin/audit-logs").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, logs, total: 1 });
    expect(findQuery(db.query, /FROM admin_audit_logs l LEFT JOIN/)[1]).toEqual([30, 0]);
  });

  test("AUD-02 กรองตามกลุ่ม + คำค้น + ช่วงวันที่ → เงื่อนไขและพารามิเตอร์ถูกต้อง", async () => {
    await request(app)
      .get("/admin/audit-logs")
      .query({ group: "item", q: " ipad ", from: "2026-10-01", to: "2026-10-31", limit: 500 })
      .set(auth());
    const [sql, params] = findQuery(db.query, /FROM admin_audit_logs l LEFT JOIN/);
    expect(sql).toMatch(/l\.action LIKE \$1/);
    expect(sql).toMatch(/Asia\/Bangkok/);
    expect(params).toEqual(["item.%", "%ipad%", "2026-10-01", "2026-10-31", 100, 0]);
  });

  test.each([
    ["AUD-03 group ไม่ถูกต้อง", { group: "hack" }],
    ["AUD-04 admin_id ไม่ใช่ตัวเลข", { admin_id: "1 OR 1=1" }],
    ["AUD-05 target_type ไม่ถูกต้อง", { target_type: "table" }],
    ["AUD-06 วันที่ผิดรูปแบบ", { from: "01/10/2026" }],
  ])("%s → 400", async (_name, query) => {
    const res = await request(app).get("/admin/audit-logs").query(query).set(auth());
    expect(res.status).toBe(400);
  });

  test("AUD-07 ไม่มี endpoint แก้ไข/ลบประวัติ (append-only)", async () => {
    const del = await request(app).delete("/admin/audit-logs/1").set(auth());
    const put = await request(app).put("/admin/audit-logs/1").set(auth()).send({ summary: "x" });
    expect(del.status).toBe(404);
    expect(put.status).toBe(404);
    expect(db.query.mock.calls.some(([sql]) => /(DELETE FROM|UPDATE) admin_audit_logs/.test(sql))).toBe(false);
  });

  test("AUD-08 ไม่มี token แอดมิน → 401", async () => {
    const res = await request(app).get("/admin/audit-logs");
    expect(res.status).toBe(401);
  });

  test("AUD-09 ข้อมูลลับไม่ถูกเก็บลง details (strip password/token/otp)", () => {
    const { strip } = require(backendPath("services/auditLog.js"));
    expect(strip({ email: "a@ku.th", password: "x", nested: { token: "t", otp: "1", keep: 1 } })).toEqual({
      email: "a@ku.th",
      nested: { keep: 1 },
    });
  });
});
