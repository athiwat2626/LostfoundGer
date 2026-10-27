// AAU-xx : /admin/auth (login, me, profile, change-password)
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { backendPath, loadApp, routeQueries, findQuery, adminToken, useTransactionClient } = require("./helpers");

jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/services/lineNotification", () => ({ sendLineNotification: jest.fn() }));

const db = require(backendPath("db.js"));

let app;
let passwordHash;
const admin = { admin_id: 1, email: "admin@ku.th", display_name: "Admin" };
const auth = () => ({ Authorization: `Bearer ${adminToken({ admin_id: 1, email: admin.email })}` });

beforeAll(async () => {
  passwordHash = await bcrypt.hash("correct-password", 4);
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  app = await loadApp();
});

beforeEach(() => {
  db.query.mockReset();
  useTransactionClient(db);
  routeQueries(db.query, [
    [/SELECT admin_id, email, password_hash/, (_sql, [email]) => ({ rows: email === admin.email ? [{ ...admin, password_hash: passwordHash }] : [] })],
    [/SELECT password_hash FROM admins/, { rows: [{ password_hash: passwordHash }] }],
    [/SELECT admin_id, email, display_name FROM admins/, { rows: [admin] }],
    [/UPDATE admins SET display_name/, (_sql, [name]) => ({ rows: [{ ...admin, display_name: name }] })],
  ]);
});

describe("AAU POST /admin/auth/login", () => {
  test("AAU-01 อีเมล/รหัสผ่านถูกต้อง → 200 พร้อม JWT ที่มี admin_id", async () => {
    const res = await request(app).post("/admin/auth/login").send({ email: " Admin@KU.th ", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.admin).toEqual(admin);
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload).toMatchObject({ admin_id: 1, email: "admin@ku.th" });
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
    expect(res.body.admin.password_hash).toBeUndefined();
  });

  test("AAU-02 รหัสผ่านผิด → 401", async () => {
    const res = await request(app).post("/admin/auth/login").send({ email: admin.email, password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  test("AAU-03 อีเมลไม่มีในระบบ → 401 (ข้อความเดียวกับรหัสผิด)", async () => {
    const res = await request(app).post("/admin/auth/login").send({ email: "who@ku.th", password: "x" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  test.each([
    ["AAU-04 ไม่มีรหัสผ่าน", { email: admin.email }],
    ["AAU-05 อีเมลผิดรูปแบบ", { email: "admin", password: "x" }],
    ["AAU-06 รหัสผ่านไม่ใช่ string", { email: admin.email, password: 12345678 }],
  ])("%s → 400", async (_name, body) => {
    const res = await request(app).post("/admin/auth/login").send(body);
    expect(res.status).toBe(400);
  });

  test("AAU-07 ฐานข้อมูลผิดพลาด → 500", async () => {
    routeQueries(db.query, [[/./, new Error("down")]]);
    const res = await request(app).post("/admin/auth/login").send({ email: admin.email, password: "x" });
    expect(res.status).toBe(500);
  });
});

describe("AAU GET /admin/auth/me", () => {
  test("AAU-08 มี token → ข้อมูลแอดมิน", async () => {
    const res = await request(app).get("/admin/auth/me").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.admin).toEqual(admin);
  });

  test("AAU-09 ไม่มี token → 401", async () => {
    const res = await request(app).get("/admin/auth/me");
    expect(res.status).toBe(401);
  });

  test("AAU-10 token ถูกต้องแต่แอดมินถูกลบไปแล้ว → 404", async () => {
    routeQueries(db.query);
    const res = await request(app).get("/admin/auth/me").set(auth());
    expect(res.status).toBe(404);
  });
});

describe("AAU PATCH /admin/auth/profile", () => {
  test("AAU-11 เปลี่ยนชื่อที่แสดง → 200 (trim แล้ว)", async () => {
    const res = await request(app).patch("/admin/auth/profile").set(auth()).send({ display_name: "  Head Admin  " });
    expect(res.status).toBe(200);
    expect(res.body.admin.display_name).toBe("Head Admin");
  });

  test.each([
    ["AAU-12 ชื่อว่าง", "   "],
    ["AAU-13 ชื่อยาวเกิน 100 ตัว", "x".repeat(101)],
    ["AAU-14 ไม่ส่งชื่อ", undefined],
  ])("%s → 400", async (_name, display_name) => {
    const res = await request(app).patch("/admin/auth/profile").set(auth()).send({ display_name });
    expect(res.status).toBe(400);
  });

  test("AAU-15 ไม่มี token → 401", async () => {
    const res = await request(app).patch("/admin/auth/profile").send({ display_name: "x" });
    expect(res.status).toBe(401);
  });
});

describe("AAU POST /admin/auth/change-password", () => {
  test("AAU-16 รหัสเดิมถูก + รหัสใหม่ ≥ 8 ตัว → 200 และบันทึก hash ใหม่", async () => {
    const res = await request(app)
      .post("/admin/auth/change-password")
      .set(auth())
      .send({ current_password: "correct-password", new_password: "new-password-123" });

    expect(res.status).toBe(200);
    const [, [newHash, adminId]] = findQuery(db.query, /UPDATE admins SET password_hash/);
    expect(adminId).toBe(1);
    await expect(bcrypt.compare("new-password-123", newHash)).resolves.toBe(true);
  });

  test("AAU-17 รหัสเดิมผิด → 401 และไม่เปลี่ยนรหัส", async () => {
    const res = await request(app)
      .post("/admin/auth/change-password")
      .set(auth())
      .send({ current_password: "wrong", new_password: "new-password-123" });
    expect(res.status).toBe(401);
    expect(findQuery(db.query, /UPDATE admins SET password_hash/)).toBeUndefined();
  });

  test("AAU-18 รหัสใหม่สั้นกว่า 8 ตัว → 400", async () => {
    const res = await request(app)
      .post("/admin/auth/change-password")
      .set(auth())
      .send({ current_password: "correct-password", new_password: "1234567" });
    expect(res.status).toBe(400);
  });
});
