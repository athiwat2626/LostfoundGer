// SRV-xx : การเริ่มต้นเซิร์ฟเวอร์ (startServer) และกรณีไม่ได้ตั้งค่าอีเมล
const request = require("supertest");
const bcrypt = require("bcryptjs");
const { backendPath, loadApp, routeQueries, findQuery } = require("./helpers");

jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/services/lineNotification", () => ({ sendLineNotification: jest.fn() }));

const db = require(backendPath("db.js"));

let app;
beforeAll(async () => {
  // จำลองว่าไม่ได้ตั้งค่า Gmail และมีการตั้งค่าแอดมินเริ่มต้น
  delete process.env.MAIL_USER;
  delete process.env.MAIL_APP_PASSWORD;
  process.env.ADMIN_SEED_EMAIL = " Seed@KU.th ";
  process.env.ADMIN_SEED_PASSWORD = "seed-password";
  routeQueries(db.query);
  app = await loadApp();
});

afterAll(() => {
  process.env.MAIL_USER = "noreply@test.local";
  process.env.MAIL_APP_PASSWORD = "app-password";
  delete process.env.ADMIN_SEED_EMAIL;
  delete process.env.ADMIN_SEED_PASSWORD;
});

test("SRV-01 startServer สร้างตาราง otp_codes / admins / reports และเพิ่มคอลัมน์ที่จำเป็น", () => {
  expect(findQuery(db.query, /CREATE TABLE IF NOT EXISTS otp_codes/)).toBeDefined();
  expect(findQuery(db.query, /CREATE TABLE IF NOT EXISTS admins/)).toBeDefined();
  expect(findQuery(db.query, /CREATE TABLE IF NOT EXISTS reports/)).toBeDefined();
  expect(findQuery(db.query, /ADD COLUMN IF NOT EXISTS successful_returns/)).toBeDefined();
  expect(findQuery(db.query, /ADD COLUMN IF NOT EXISTS is_banned/)).toBeDefined();
});

test("SRV-02 สร้างบัญชีแอดมินเริ่มต้นจาก ADMIN_SEED_* (อีเมลตัวพิมพ์เล็ก, รหัสผ่านถูก hash)", async () => {
  const [, [email, hash, name]] = findQuery(db.query, /INSERT INTO admins/);
  expect(email).toBe("seed@ku.th");
  expect(name).toBe("Admin");
  expect(hash).not.toBe("seed-password");
  await expect(bcrypt.compare("seed-password", hash)).resolves.toBe(true);
});

test("SRV-03 ไม่ได้ตั้งค่า MAIL_USER/MAIL_APP_PASSWORD → /api/send-otp ตอบ 503", async () => {
  const res = await request(app).post("/api/send-otp").send({ email: "a@ku.th" });
  expect(res.status).toBe(503);
  expect(res.body.message).toBe("Email service is not configured");
});
