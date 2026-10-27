// GGL-xx / GSV-xx : เข้าสู่ระบบ/สมัครด้วย Google แบบ 2 ขั้น (POST /api/auth/google → OTP → /api/verify-otp)
// ใช้กุญแจ RSA ที่สร้างขึ้นในเทสแทนกุญแจของ Google และจำลอง fetch ที่ดึงกุญแจสาธารณะ — ไม่ต่ออินเทอร์เน็ต
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { backendPath, loadApp, routeQueries, findQuery, pgError } = require("./helpers");

jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/services/lineNotification", () => ({ sendLineNotification: jest.fn() }));
const mockSendMail = jest.fn();
jest.mock("nodemailer", () => ({ createTransport: jest.fn(() => ({ sendMail: mockSendMail })) }));

const db = require(backendPath("db.js"));
const { verifyGoogleIdToken, resetGoogleKeyCache } = require(backendPath("services/googleAuth.js"));

const CLIENT_ID = "1234567890-test.apps.googleusercontent.com";
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const JWK = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };
const certsResponse = () => ({ ok: true, headers: { get: () => "public, max-age=3600" }, json: async () => ({ keys: [JWK] }) });

// Google ID token ปลอมที่ลงลายเซ็นด้วยกุญแจของเทส
const googleToken = (claims = {}, { key = privateKey, kid = "test-key", expiresIn = "5m" } = {}) =>
  jwt.sign(
    { iss: "https://accounts.google.com", aud: CLIENT_ID, sub: "1001", email: "Somchai@KU.th", email_verified: true, given_name: "Somchai", family_name: "Jaidee", name: "Somchai Jaidee", ...claims },
    key,
    { algorithm: "RS256", keyid: kid, expiresIn }
  );

const existingUser = { student_id: "6410500001", email: "somchai@ku.th", is_banned: false, suspended_until: null };
const login = (credential = googleToken()) => request(app).post("/api/auth/google").send({ credential });

let app;
const realFetch = global.fetch;
beforeAll(async () => {
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  app = await loadApp();
});
afterAll(() => {
  global.fetch = realFetch;
});

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
  delete process.env.GOOGLE_ALLOWED_DOMAINS;
  resetGoogleKeyCache();
  global.fetch = jest.fn(async () => certsResponse());
  db.query.mockReset();
  routeQueries(db.query);
  mockSendMail.mockReset().mockResolvedValue({});
});

describe("GGL POST /api/auth/google", () => {
  test("GGL-01 ผู้ใช้เดิม → ยืนยัน Google แล้วส่ง OTP ไปที่อีเมล Google (ยังไม่ออก token)", async () => {
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [existingUser] }]]);
    const res = await login();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, created: false, otp_required: true, email: "somchai@ku.th" });
    expect(res.body.token).toBeUndefined();
    const [, [email, otp]] = findQuery(db.query, /INSERT INTO otp_codes/);
    expect(email).toBe("somchai@ku.th");
    expect(otp).toMatch(/^\d{6}$/);
    expect(mockSendMail.mock.calls[0][0].to).toBe("somchai@ku.th");
    expect(findQuery(db.query, /INSERT INTO users/)).toBeUndefined();
  });

  test("GGL-02 ยังไม่มีบัญชี → สร้างบัญชีจากชื่อ Google (201) แล้วส่ง OTP", async () => {
    routeQueries(db.query, [[/INSERT INTO users/, (_sql, p) => ({ rows: [{ student_id: p[0], email: p[3], is_banned: false, suspended_until: null }] })]]);
    const res = await login();

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, created: true, otp_required: true, email: "somchai@ku.th" });
    const [, params] = findQuery(db.query, /INSERT INTO users/);
    expect(params[0]).toMatch(/^USER[a-z0-9]+$/);
    expect(params[0].length).toBeLessThanOrEqual(20);
    expect(params.slice(1)).toEqual(["Somchai", "Jaidee", "somchai@ku.th"]);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  test("GGL-03 สมัครพร้อมกัน (อีเมลซ้ำ 23505) → ใช้บัญชีที่มีอยู่ และยังส่ง OTP", async () => {
    let lookups = 0;
    routeQueries(db.query, [
      [/FROM users WHERE email/, () => ({ rows: lookups++ === 0 ? [] : [existingUser] })],
      [/INSERT INTO users/, pgError("23505")],
    ]);
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  test("GGL-04 บัญชีถูกแบน → 403 และไม่ส่ง OTP", async () => {
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [{ ...existingUser, is_banned: true }] }]]);
    const res = await login();
    expect(res.status).toBe(403);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test("GGL-05 บัญชีถูกระงับชั่วคราว → 403 พร้อม suspended_until", async () => {
    const until = new Date(Date.now() + 86_400_000).toISOString();
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [{ ...existingUser, suspended_until: until }] }]]);
    const res = await login();
    expect(res.status).toBe(403);
    expect(res.body.suspended_until).toBe(until);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test("GGL-06 ขอซ้ำภายใน 60 วินาที → ไม่ส่งรหัสใหม่ แจ้ง retry_after ให้ใช้รหัสเดิม", async () => {
    routeQueries(db.query, [
      [/FROM users WHERE email/, { rows: [existingUser] }],
      [/AS wait FROM otp_codes/, { rows: [{ wait: 42 }] }],
    ]);
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ otp_required: true, retry_after: 42 });
    expect(mockSendMail).not.toHaveBeenCalled();
    expect(findQuery(db.query, /INSERT INTO otp_codes/)).toBeUndefined();
  });

  test.each([
    ["GGL-07 ลายเซ็นปลอม (กุญแจอื่น)", () => googleToken({}, { key: crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey })],
    ["GGL-08 Client ID ไม่ตรง (aud)", () => googleToken({ aud: "other-app.apps.googleusercontent.com" })],
    ["GGL-09 token หมดอายุ", () => googleToken({}, { expiresIn: -10 })],
    ["GGL-10 ผู้ออก token ไม่ใช่ Google", () => googleToken({ iss: "https://evil.example" })],
    ["GGL-11 อีเมลยังไม่ยืนยันกับ Google", () => googleToken({ email_verified: false })],
    ["GGL-12 kid ไม่มีในกุญแจของ Google", () => googleToken({}, { kid: "unknown" })],
    ["GGL-13 credential ไม่ใช่ JWT", () => "not-a-jwt"],
  ])("%s → 401 ไม่แตะบัญชีผู้ใช้", async (_name, makeToken) => {
    const res = await login(makeToken());
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(findQuery(db.query, /FROM users/)).toBeUndefined();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test("GGL-14 จำกัดโดเมน (GOOGLE_ALLOWED_DOMAINS=ku.th) → อีเมลโดเมนอื่น 401", async () => {
    process.env.GOOGLE_ALLOWED_DOMAINS = "ku.th";
    const blocked = await login(googleToken({ email: "someone@gmail.com" }));
    expect(blocked.status).toBe(401);
    expect(blocked.body.message).toContain("@ku.th");

    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [existingUser] }]]);
    const allowed = await login();
    expect(allowed.status).toBe(200);
  });

  test("GGL-15 ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID → 503", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const res = await login();
    expect(res.status).toBe(503);
    expect(res.body.message).toBe("ยังไม่ได้ตั้งค่า Google Sign-In");
  });

  test("GGL-16 ดึงกุญแจของ Google ไม่ได้ → 502", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, headers: { get: () => null } }));
    const res = await login();
    expect(res.status).toBe(502);
  });

  test("GGL-17 ส่งอีเมล OTP ไม่สำเร็จ → 500", async () => {
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [existingUser] }]]);
    mockSendMail.mockRejectedValue(new Error("smtp down"));
    const res = await login();
    expect(res.status).toBe(500);
  });

  test("GGL-18 ขั้นที่ 2: OTP ที่ส่งไปใช้กับ /api/verify-otp ได้ และได้ token ผู้ใช้", async () => {
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [existingUser] }]]);
    await login();
    const [, [, otp]] = findQuery(db.query, /INSERT INTO otp_codes/);

    routeQueries(db.query, [
      [/SELECT otp_id, otp FROM otp_codes/, { rows: [{ otp_id: 7, otp }] }],
      [/DELETE FROM otp_codes WHERE otp_id/, { rows: [{ otp_id: 7 }], rowCount: 1 }],
      [/SELECT student_id, email, is_banned, suspended_until FROM users/, { rows: [existingUser] }],
    ]);
    const verified = await request(app).post("/api/verify-otp").send({ email: "somchai@ku.th", otp });
    expect(verified.status).toBe(200);
    expect(jwt.verify(verified.body.token, process.env.JWT_SECRET)).toMatchObject({ role: "user", student_id: existingUser.student_id });
  });

  test("GGL-19 กุญแจของ Google ถูก cache — เข้าสู่ระบบ 2 ครั้งดึงกุญแจครั้งเดียว", async () => {
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [existingUser] }], [/AS wait FROM otp_codes/, { rows: [{ wait: 30 }] }]]);
    await login();
    await login();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("GGL-20 /api/settings/public ส่ง google_client_id ให้หน้าเว็บ (ไม่ตั้ง = null)", async () => {
    const { clearSettingsCache } = require(backendPath("services/settings.js"));
    clearSettingsCache();
    expect((await request(app).get("/api/settings/public")).body.google_client_id).toBe(CLIENT_ID);
    delete process.env.GOOGLE_CLIENT_ID;
    expect((await request(app).get("/api/settings/public")).body.google_client_id).toBeNull();
  });
});

describe("GSV services/googleAuth.js (unit)", () => {
  const fetchImpl = async () => certsResponse();

  test("GSV-01 token ถูกต้อง → คืนอีเมลตัวพิมพ์เล็ก ชื่อ และนามสกุล", async () => {
    await expect(verifyGoogleIdToken(googleToken(), { clientId: CLIENT_ID, fetchImpl })).resolves.toEqual({
      sub: "1001", email: "somchai@ku.th", firstName: "Somchai", lastName: "Jaidee", picture: null,
    });
  });

  test("GSV-02 ไม่มี given_name/family_name → แยกชื่อจาก name, ไม่มีนามสกุลใช้ '-'", async () => {
    const r1 = await verifyGoogleIdToken(googleToken({ given_name: undefined, family_name: undefined, name: "Ann Marie Lee" }), { clientId: CLIENT_ID, fetchImpl });
    expect([r1.firstName, r1.lastName]).toEqual(["Ann", "Marie Lee"]);
    resetGoogleKeyCache();
    const r2 = await verifyGoogleIdToken(googleToken({ given_name: undefined, family_name: undefined, name: "Prince" }), { clientId: CLIENT_ID, fetchImpl });
    expect([r2.firstName, r2.lastName]).toEqual(["Prince", "-"]);
  });

  test("GSV-03 ชื่อยาวเกิน 100 ตัว → ตัดให้พอดีคอลัมน์", async () => {
    const r = await verifyGoogleIdToken(googleToken({ given_name: "ก".repeat(150) }), { clientId: CLIENT_ID, fetchImpl });
    expect(r.firstName).toHaveLength(100);
  });

  test("GSV-04 Google หมุนกุญแจ (kid ใหม่) → โหลดกุญแจใหม่ 1 ครั้งแล้วตรวจผ่าน", async () => {
    const { privateKey: newKey, publicKey: newPub } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    let rotated = false;
    const rotatingFetch = jest.fn(async () => ({
      ok: true,
      headers: { get: () => "max-age=3600" },
      json: async () => ({ keys: rotated ? [{ ...newPub.export({ format: "jwk" }), kid: "new-key" }] : [JWK] }),
    }));
    await verifyGoogleIdToken(googleToken(), { clientId: CLIENT_ID, fetchImpl: rotatingFetch });
    rotated = true;
    await expect(verifyGoogleIdToken(googleToken({}, { key: newKey, kid: "new-key" }), { clientId: CLIENT_ID, fetchImpl: rotatingFetch })).resolves.toMatchObject({ email: "somchai@ku.th" });
    expect(rotatingFetch).toHaveBeenCalledTimes(2);
  });
});
