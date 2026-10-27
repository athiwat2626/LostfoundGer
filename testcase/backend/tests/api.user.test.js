// ME-xx / INB-xx / CLM-xx / MYI-xx : ฟีเจอร์ของผู้ใช้ที่ล็อกอิน (โปรไฟล์, กล่องแจ้งเตือน, ติดต่อเจ้าของโพสต์, โพสต์ของฉัน)
const request = require("supertest");
const { backendPath, loadApp, routeQueries, useTransactionClient, findQuery, adminToken, userToken } = require("./helpers");

jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/services/lineNotification", () => ({ sendLineNotification: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/services/notify", () => ({ notify: jest.fn() }));

const db = require(backendPath("db.js"));
const { notify } = require(backendPath("services/notify.js"));

let app;
beforeAll(async () => {
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  app = await loadApp();
});

beforeEach(() => {
  db.query.mockReset();
  useTransactionClient(db);
  routeQueries(db.query);
  notify.mockReset();
});

const ME = "6410500001";
const auth = (token = userToken({ student_id: ME })) => ({ Authorization: `Bearer ${token}` });
const profile = { student_id: ME, first_name: "Somchai", last_name: "Jaidee", email: "somchai@ku.th" };

describe("ME โปรไฟล์ /api/me", () => {
  test("ME-01 GET /api/me → ข้อมูลของผู้ใช้จาก token", async () => {
    routeQueries(db.query, [[/FROM users WHERE student_id = \$1/, { rows: [profile] }]]);
    const res = await request(app).get("/api/me").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(profile);
    expect(findQuery(db.query, /FROM users WHERE student_id/)[1]).toEqual([ME]);
  });

  test("ME-02 GET /api/me ไม่มี token → 401", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
  });

  test("ME-03 GET /api/me ด้วย token แอดมิน → 401 (ต้องเป็น token ผู้ใช้)", async () => {
    const res = await request(app).get("/api/me").set(auth(adminToken()));
    expect(res.status).toBe(401);
  });

  test("ME-04 GET /api/me token หมดอายุ → 401", async () => {
    const res = await request(app).get("/api/me").set(auth(userToken({}, { expiresIn: -10 })));
    expect(res.status).toBe(401);
  });

  test("ME-05 PATCH /api/me แก้ชื่อ + เบอร์โทร → 200 (trim และบันทึกเฉพาะของตัวเอง)", async () => {
    routeQueries(db.query, [[/UPDATE users/, { rows: [{ ...profile, phone: "0812345678" }] }]]);
    const res = await request(app)
      .patch("/api/me")
      .set(auth())
      .send({ first_name: " Somchai ", last_name: "Jaidee", phone: "0812345678", preferred_contact: "phone", student_id: "hack", email: "x@y.z" });
    expect(res.status).toBe(200);
    const [sql, params] = findQuery(db.query, /UPDATE users/);
    expect(sql).not.toMatch(/\bemail = \$/); // แก้ได้เฉพาะ contact_email ไม่ใช่อีเมลเข้าสู่ระบบ
    expect(params).toEqual(["Somchai", "Jaidee", "0812345678", null, "phone", ME]);
  });

  test.each([
    ["ME-06 ไม่มีชื่อ", { first_name: "", last_name: "J" }],
    ["ME-07 เบอร์โทรผิดรูปแบบ", { first_name: "A", last_name: "B", phone: "abc" }],
    ["ME-08 อีเมลสำรองผิดรูปแบบ", { first_name: "A", last_name: "B", contact_email: "abc" }],
    ["ME-09 เลือกติดต่อทางโทรศัพท์แต่ไม่มีเบอร์", { first_name: "A", last_name: "B", preferred_contact: "phone" }],
    ["ME-10 ช่องทางติดต่อไม่รู้จัก", { first_name: "A", last_name: "B", preferred_contact: "fax" }],
  ])("%s → 400", async (_name, body) => {
    const res = await request(app).patch("/api/me").set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(findQuery(db.query, /UPDATE users/)).toBeUndefined();
  });

  test("ME-11 POST /api/me/avatar ไม่แนบรูป → 400", async () => {
    const res = await request(app).post("/api/me/avatar").set(auth());
    expect(res.status).toBe(400);
  });
});

describe("INB กล่องแจ้งเตือน /api/inbox", () => {
  test("INB-01 GET /api/inbox → รายการล่าสุด 30 รายการ + จำนวนที่ยังไม่อ่าน", async () => {
    const rows = [{ notification_id: 1, title: "พบของที่อาจเป็นของคุณ", is_read: false }];
    routeQueries(db.query, [
      [/SELECT notification_id/, { rows }],
      [/COUNT\(\*\)::int AS count FROM notifications/, { rows: [{ count: 1 }] }],
    ]);
    const res = await request(app).get("/api/inbox").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, notifications: rows, unread: 1 });
    expect(findQuery(db.query, /SELECT notification_id/)[1]).toEqual([ME, 30]);
  });

  test("INB-02 อ่านแล้วทีละรายการ → อัปเดตเฉพาะของตัวเอง", async () => {
    const res = await request(app).post("/api/inbox/5/read").set(auth());
    expect(res.status).toBe(200);
    expect(findQuery(db.query, /UPDATE notifications SET is_read = true WHERE notification_id/)[1]).toEqual(["5", ME]);
  });

  test("INB-03 id ไม่ใช่ตัวเลข → 400", async () => {
    const res = await request(app).post("/api/inbox/abc/read").set(auth());
    expect(res.status).toBe(400);
  });

  test("INB-04 อ่านทั้งหมด → อัปเดตทุกรายการที่ยังไม่อ่านของตัวเอง", async () => {
    const res = await request(app).post("/api/inbox/read-all").set(auth());
    expect(res.status).toBe(200);
    expect(findQuery(db.query, /is_read = false/)[1]).toEqual([ME]);
  });

  test("INB-05 ไม่มี token → 401", async () => {
    const res = await request(app).get("/api/inbox");
    expect(res.status).toBe(401);
  });
});

describe("CLM ติดต่อเจ้าของโพสต์ /api/claims", () => {
  const owner = { item_name: "ร่มสีดำ", status: "open", deposit_location: "กองกิจการนิสิต", student_id: "6410599999", first_name: "Ann", last_name: "B", email: "ann@ku.th", preferred_contact: "email" };
  const itemRow = (item) => [/FROM (found|lost)_items i LEFT JOIN users u/, { rows: item ? [item] : [] }];

  test("CLM-01 ส่งคำขอครั้งแรก → 201 แจ้งเตือนเจ้าของ และคืนช่องทางติดต่อ", async () => {
    routeQueries(db.query, [itemRow(owner), [/INSERT INTO claims/, { rows: [{ claim_id: 9, inserted: true }] }]]);
    const res = await request(app).post("/api/claims").set(auth()).send({ item_type: "lost", item_id: 3, message: " เจอที่ SC-2 " });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, claim_id: 9, deposit_location: "กองกิจการนิสิต" });
    expect(findQuery(db.query, /INSERT INTO claims/)[1]).toEqual(["lost", 3, ME, "เจอที่ SC-2"]);
    expect(notify).toHaveBeenCalledWith("6410599999", expect.objectContaining({ type: "claim" }), { email: true });
  });

  test("CLM-02 ส่งซ้ำรายการเดิม → 200 และไม่แจ้งเตือนซ้ำ", async () => {
    routeQueries(db.query, [itemRow(owner), [/INSERT INTO claims/, { rows: [{ claim_id: 9, inserted: false }] }]]);
    const res = await request(app).post("/api/claims").set(auth()).send({ item_type: "lost", item_id: 3 });
    expect(res.status).toBe(200);
    expect(notify).not.toHaveBeenCalled();
  });

  test("CLM-03 ติดต่อโพสต์ของตัวเอง → 400", async () => {
    routeQueries(db.query, [itemRow({ ...owner, student_id: ME })]);
    const res = await request(app).post("/api/claims").set(auth()).send({ item_type: "found", item_id: 3 });
    expect(res.status).toBe(400);
    expect(findQuery(db.query, /INSERT INTO claims/)).toBeUndefined();
  });

  test("CLM-04 รายการที่คืนแล้ว → 400", async () => {
    routeQueries(db.query, [itemRow({ ...owner, status: "returned" })]);
    const res = await request(app).post("/api/claims").set(auth()).send({ item_type: "found", item_id: 3 });
    expect(res.status).toBe(400);
  });

  test("CLM-05 ไม่พบรายการ → 404", async () => {
    const res = await request(app).post("/api/claims").set(auth()).send({ item_type: "found", item_id: 404 });
    expect(res.status).toBe(404);
  });

  test.each([
    ["CLM-06 item_type ไม่ถูกต้อง", { item_type: "other", item_id: 1 }],
    ["CLM-07 item_id ไม่ใช่ตัวเลข", { item_type: "lost", item_id: "1 OR 1=1" }],
  ])("%s → 400", async (_name, body) => {
    const res = await request(app).post("/api/claims").set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe("MYI โพสต์ของฉัน /api/my-items", () => {
  const validLost = { lost_date: "2026-10-01", item_name: "ร่ม", lost_location: "SC-2", category: "อื่น ๆ" };

  test("MYI-01 GET /api/my-items → เฉพาะโพสต์ของตัวเอง", async () => {
    routeQueries(db.query, [[/student_id = \$1/, { rows: [{ item_id: 1, type: "lost" }] }]]);
    const res = await request(app).get("/api/my-items").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([{ item_id: 1, type: "lost" }]);
    expect(findQuery(db.query, /student_id = \$1/)[1]).toContain(ME);
  });

  test("MYI-02 แก้ไขโพสต์ของคนอื่น (ไม่พบในโพสต์ของฉัน) → 404 ไม่อัปเดต", async () => {
    const res = await request(app).patch("/api/my-items/lost/7").set(auth()).send(validLost);
    expect(res.status).toBe(404);
    expect(findQuery(db.query, /UPDATE lost_items/)).toBeUndefined();
  });

  test("MYI-03 แก้ไขโพสต์ของตัวเอง → 200 (WHERE มี student_id)", async () => {
    routeQueries(db.query, [
      [/SELECT item_id, item_name, status, student_id FROM lost_items/, { rows: [{ item_id: 7, status: "open", student_id: ME }] }],
      [/UPDATE lost_items/, { rows: [{ item_id: 7, item_name: "ร่ม" }] }],
    ]);
    const res = await request(app).patch("/api/my-items/lost/7").set(auth()).send(validLost);
    expect(res.status).toBe(200);
    const [sql, params] = findQuery(db.query, /UPDATE lost_items/);
    expect(sql).toMatch(/AND student_id = \$8/);
    expect(params[7]).toBe(ME);
  });

  test("MYI-04 แก้ไขโพสต์ที่คืนแล้ว → 400", async () => {
    routeQueries(db.query, [[/SELECT item_id, item_name, status, student_id FROM lost_items/, { rows: [{ item_id: 7, status: "returned", student_id: ME }] }]]);
    const res = await request(app).patch("/api/my-items/lost/7").set(auth()).send(validLost);
    expect(res.status).toBe(400);
  });

  test("MYI-05 ลบโพสต์ของตัวเอง → ลบรายการและคำขอที่เกี่ยวข้องใน transaction", async () => {
    routeQueries(db.query, [[/FOR UPDATE/, { rows: [{ item_id: 7, status: "open", student_id: ME }] }]]);
    const res = await request(app).delete("/api/my-items/found/7").set(auth());
    expect(res.status).toBe(200);
    expect(findQuery(db.query, /DELETE FROM found_items WHERE item_id = \$1 AND student_id = \$2/)[1]).toEqual(["7", ME]);
    expect(findQuery(db.query, /DELETE FROM claims/)).toBeDefined();
    expect(findQuery(db.query, /^COMMIT$/)).toBeDefined();
  });

  test("MYI-06 ลบโพสต์ที่คืนของสำเร็จแล้ว → 400 และ ROLLBACK", async () => {
    routeQueries(db.query, [[/FOR UPDATE/, { rows: [{ item_id: 7, status: "returned", student_id: ME }] }]]);
    const res = await request(app).delete("/api/my-items/found/7").set(auth());
    expect(res.status).toBe(400);
    expect(findQuery(db.query, /DELETE FROM found_items/)).toBeUndefined();
    expect(findQuery(db.query, /^ROLLBACK$/)).toBeDefined();
  });

  test("MYI-07 type ไม่ถูกต้อง → 400", async () => {
    const res = await request(app).delete("/api/my-items/users/1").set(auth());
    expect(res.status).toBe(400);
  });

  test("MYI-08 ไม่มี token → 401", async () => {
    const res = await request(app).get("/api/my-items");
    expect(res.status).toBe(401);
  });
});
