// API ฝั่งผู้ใช้ทั่วไปใน server.js: health check, สมัครสมาชิก, OTP, โปรไฟล์, จัดอันดับ, แจ้งเตือน LINE
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { backendPath, loadApp, routeQueries, findQuery, pgError, adminToken } = require("./helpers");

jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/services/lineNotification", () => ({ sendLineNotification: jest.fn() }));
const mockSendMail = jest.fn();
jest.mock("nodemailer", () => ({ createTransport: jest.fn(() => ({ sendMail: mockSendMail })) }));

const db = require(backendPath("db.js"));
const { sendLineNotification } = require(backendPath("services/lineNotification.js"));

let app;
beforeAll(async () => {
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  app = await loadApp();
});

beforeEach(() => {
  db.query.mockReset();
  routeQueries(db.query);
  mockSendMail.mockReset().mockResolvedValue({});
  sendLineNotification.mockReset();
});

const activeUser = {
  student_id: "6410500001",
  first_name: "Somchai",
  last_name: "Jaidee",
  email: "somchai@ku.th",
  profile_image: null,
  is_banned: false,
  suspended_until: null,
};

describe("HC Health check", () => {
  test("HC-01 GET / → 200 Hello World!", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Hello World!");
  });

  test("HC-02 GET /api-docs → เปิดหน้า Swagger UI ได้", async () => {
    const res = await request(app).get("/api-docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });
});

describe("REG POST /api/register", () => {
  const body = { student_id: "6410500001", first_name: " Somchai ", last_name: "Jaidee", email: " Somchai@KU.th " };

  test("REG-01 ข้อมูลถูกต้อง → 201 และ normalize ชื่อ/อีเมล", async () => {
    routeQueries(db.query, [[/INSERT INTO users/, (_sql, params) => ({ rows: [{ student_id: params[0], first_name: params[1], last_name: params[2], email: params[3] }] })]]);
    const res = await request(app).post("/api/register").send(body);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      user: { student_id: "6410500001", first_name: "Somchai", last_name: "Jaidee", email: "somchai@ku.th" },
    });
  });

  test("REG-02 ไม่ส่ง student_id → ระบบสร้างรหัส USERxxxx ให้ (ไม่เกิน 20 ตัวอักษร)", async () => {
    routeQueries(db.query, [[/INSERT INTO users/, (_sql, params) => ({ rows: [{ student_id: params[0] }] })]]);
    const res = await request(app).post("/api/register").send({ ...body, student_id: undefined });

    expect(res.status).toBe(201);
    expect(res.body.user.student_id).toMatch(/^USER[a-z0-9]+$/);
    expect(res.body.user.student_id.length).toBeLessThanOrEqual(20);
  });

  test.each([
    ["REG-03 ไม่มีชื่อ", { first_name: "" }],
    ["REG-04 ไม่มีนามสกุล", { last_name: "   " }],
    ["REG-05 อีเมลผิดรูปแบบ", { email: "somchai" }],
    ["REG-06 รหัสนิสิตยาวเกิน 20 ตัว", { student_id: "1".repeat(21) }],
    ["REG-07 ชื่อยาวเกิน 100 ตัว", { first_name: "ก".repeat(101) }],
  ])("%s → 400", async (_name, override) => {
    const res = await request(app).post("/api/register").send({ ...body, ...override });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(findQuery(db.query, /INSERT INTO users/)).toBeUndefined();
  });

  test("REG-08 รหัสนิสิต/อีเมลซ้ำ (unique violation) → 409", async () => {
    routeQueries(db.query, [[/INSERT INTO users/, pgError("23505")]]);
    const res = await request(app).post("/api/register").send(body);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("รหัสนิสิตหรืออีเมลนี้มีอยู่ในระบบแล้ว");
  });

  test("REG-09 ฐานข้อมูลผิดพลาดอื่น ๆ → 500", async () => {
    routeQueries(db.query, [[/INSERT INTO users/, new Error("down")]]);
    const res = await request(app).post("/api/register").send(body);
    expect(res.status).toBe(500);
  });
});

describe("OTP POST /api/send-otp", () => {
  test("OTP-01 อีเมลผิดรูปแบบ → 400", async () => {
    const res = await request(app).post("/api/send-otp").send({ email: "abc" });
    expect(res.status).toBe(400);
  });

  test("OTP-02 อีเมลไม่มีในระบบ → 404 และไม่ส่งเมล", async () => {
    const res = await request(app).post("/api/send-otp").send({ email: "nobody@ku.th" });
    expect(res.status).toBe(404);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test("OTP-03 บัญชีถูกแบนถาวร → 403", async () => {
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [{ ...activeUser, is_banned: true }] }]]);
    const res = await request(app).post("/api/send-otp").send({ email: activeUser.email });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("ระงับถาวร");
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test("OTP-04 บัญชีถูกระงับชั่วคราว (ยังไม่หมดเวลา) → 403 พร้อม suspended_until", async () => {
    const until = new Date(Date.now() + 86_400_000).toISOString();
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [{ ...activeUser, suspended_until: until }] }]]);
    const res = await request(app).post("/api/send-otp").send({ email: activeUser.email });
    expect(res.status).toBe(403);
    expect(res.body.suspended_until).toBe(until);
  });

  test("OTP-05 ระงับชั่วคราวแต่หมดเวลาแล้ว → ส่ง OTP ได้ตามปกติ", async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [{ ...activeUser, suspended_until: past }] }]]);
    const res = await request(app).post("/api/send-otp").send({ email: activeUser.email });
    expect(res.status).toBe(200);
  });

  test("OTP-06 ส่งสำเร็จ → ลบ OTP เก่า, บันทึก OTP 6 หลัก, ส่งอีเมลรหัสเดียวกัน", async () => {
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [activeUser] }]]);
    const res = await request(app).post("/api/send-otp").send({ email: " SomChai@ku.th " });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: "OTP Sent Successfully" });
    expect(findQuery(db.query, /DELETE FROM otp_codes WHERE email = \$1$/)[1]).toEqual(["somchai@ku.th"]);

    const [, [email, otp]] = findQuery(db.query, /INSERT INTO otp_codes/);
    expect(email).toBe("somchai@ku.th");
    expect(otp).toMatch(/^\d{6}$/);
    expect(mockSendMail.mock.calls[0][0].to).toBe("somchai@ku.th");
    expect(mockSendMail.mock.calls[0][0].html).toContain(otp);
  });

  test("OTP-08 ขอ OTP ซ้ำภายใน 60 วินาที → 429 พร้อม retry_after และไม่ส่งรหัสใหม่", async () => {
    routeQueries(db.query, [
      [/FROM users WHERE email/, { rows: [activeUser] }],
      [/AS wait FROM otp_codes/, { rows: [{ wait: 45 }] }],
    ]);
    const res = await request(app).post("/api/send-otp").send({ email: activeUser.email });
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ success: false, retry_after: 45, message: "กรุณารอ 45 วินาทีก่อนขอรหัส OTP ใหม่" });
    expect(findQuery(db.query, /INSERT INTO otp_codes/)).toBeUndefined();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test("OTP-07 ส่งอีเมลล้มเหลว → 500", async () => {
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [activeUser] }]]);
    mockSendMail.mockRejectedValue(new Error("smtp down"));
    const res = await request(app).post("/api/send-otp").send({ email: activeUser.email });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Failed to send OTP");
  });
});

describe("VOTP POST /api/verify-otp", () => {
  // ขั้นตอนปัจจุบัน: ดึง OTP ล่าสุดที่ยังไม่หมดอายุ → เทียบแบบ timing-safe → ลบด้วย otp_id
  const otpRow = [/SELECT otp_id, otp FROM otp_codes/, { rows: [{ otp_id: 1, otp: "123456" }] }];
  const consumeRow = [/DELETE FROM otp_codes WHERE otp_id = \$1 RETURNING otp_id/, { rows: [{ otp_id: 1 }], rowCount: 1 }];
  const userRow = (user) => [/SELECT student_id, email, is_banned, suspended_until FROM users/, { rows: user ? [user] : [] }];

  test.each([
    ["VOTP-01 OTP 5 หลัก", { email: "a@ku.th", otp: "12345" }],
    ["VOTP-02 OTP มีตัวอักษร", { email: "a@ku.th", otp: "12a456" }],
    ["VOTP-03 OTP เป็นตัวเลข (ไม่ใช่ string)", { email: "a@ku.th", otp: 123456 }],
    ["VOTP-04 อีเมลผิดรูปแบบ", { email: "a", otp: "123456" }],
  ])("%s → 400", async (_name, body) => {
    const res = await request(app).post("/api/verify-otp").send(body);
    expect(res.status).toBe(400);
  });

  test("VOTP-05 ไม่มี OTP ที่ยังไม่หมดอายุ → 400 และล้าง OTP ที่หมดอายุ", async () => {
    const res = await request(app).post("/api/verify-otp").send({ email: "a@ku.th", otp: "000000" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid or expired OTP");
    expect(findQuery(db.query, /expires_at <= NOW\(\)/)).toBeDefined();
  });

  test("VOTP-06 OTP ถูกต้อง → 200 พร้อม student_id และ token ผู้ใช้", async () => {
    routeQueries(db.query, [otpRow, consumeRow, userRow(activeUser)]);
    const res = await request(app).post("/api/verify-otp").send({ email: "Somchai@ku.th", otp: "123456" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, student_id: activeUser.student_id });
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload).toMatchObject({ role: "user", student_id: activeUser.student_id, email: activeUser.email });
    expect(findQuery(db.query, /SELECT otp_id, otp FROM otp_codes/)[1]).toEqual(["somchai@ku.th"]);
  });

  test("VOTP-07 OTP ถูกต้องแต่บัญชีถูกแบน → 403", async () => {
    routeQueries(db.query, [otpRow, consumeRow, userRow({ ...activeUser, is_banned: true })]);
    const res = await request(app).post("/api/verify-otp").send({ email: activeUser.email, otp: "123456" });
    expect(res.status).toBe(403);
  });

  test("VOTP-08 OTP ถูกต้องแต่ไม่พบผู้ใช้ → student_id = 'unknown' และไม่มี token", async () => {
    routeQueries(db.query, [otpRow, consumeRow]);
    const res = await request(app).post("/api/verify-otp").send({ email: activeUser.email, otp: "123456" });
    expect(res.status).toBe(200);
    expect(res.body.student_id).toBe("unknown");
    expect(res.body.token).toBeNull();
  });

  test("VOTP-09 ฐานข้อมูลผิดพลาด → 500", async () => {
    routeQueries(db.query, [[/FROM otp_codes/, new Error("down")]]);
    const res = await request(app).post("/api/verify-otp").send({ email: activeUser.email, otp: "123456" });
    expect(res.status).toBe(500);
  });

  test("VOTP-10 OTP ผิด → นับจำนวนครั้ง และยังไม่ลบ OTP", async () => {
    routeQueries(db.query, [otpRow, [/SET attempts = attempts \+ 1/, { rows: [{ attempts: 1 }] }]]);
    const res = await request(app).post("/api/verify-otp").send({ email: activeUser.email, otp: "999999" });
    expect(res.status).toBe(400);
    expect(findQuery(db.query, /DELETE FROM otp_codes WHERE otp_id/)).toBeUndefined();
  });

  test("VOTP-11 OTP ผิดครบ 5 ครั้ง → 429 และลบ OTP ทิ้ง", async () => {
    routeQueries(db.query, [otpRow, [/SET attempts = attempts \+ 1/, { rows: [{ attempts: 5 }] }]]);
    const res = await request(app).post("/api/verify-otp").send({ email: activeUser.email, otp: "999999" });
    expect(res.status).toBe(429);
    expect(findQuery(db.query, /DELETE FROM otp_codes WHERE otp_id/)).toBeDefined();
  });

  test("VOTP-12 OTP ถูกต้องแต่บัญชีถูกระงับชั่วคราว → 403 พร้อม suspended_until", async () => {
    const until = new Date(Date.now() + 86_400_000).toISOString();
    routeQueries(db.query, [otpRow, consumeRow, userRow({ ...activeUser, suspended_until: until })]);
    const res = await request(app).post("/api/verify-otp").send({ email: activeUser.email, otp: "123456" });
    expect(res.status).toBe(403);
    expect(res.body.suspended_until).toBe(until);
  });
});

describe("USR ข้อมูลผู้ใช้", () => {
  const userToken = (email = activeUser.email) =>
    jwt.sign({ role: "user", student_id: activeUser.student_id, email }, process.env.JWT_SECRET, { expiresIn: "1h" });

  test("USR-01 GET /api/users/:email ของตัวเอง → 200 (ค้นด้วยอีเมลตัวพิมพ์เล็ก)", async () => {
    routeQueries(db.query, [[/FROM users WHERE email/, { rows: [activeUser] }]]);
    const res = await request(app).get("/api/users/SOMCHAI@ku.th").set("Authorization", `Bearer ${userToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(activeUser.email);
    expect(findQuery(db.query, /FROM users WHERE email/)[1]).toEqual(["somchai@ku.th"]);
  });

  test("USR-02 GET /api/users/:email ไม่พบ → 404", async () => {
    const res = await request(app).get("/api/users/nobody@ku.th").set("Authorization", `Bearer ${userToken("nobody@ku.th")}`);
    expect(res.status).toBe(404);
  });

  test("USR-03 GET /api/users/:email อีเมลผิดรูปแบบ → 400", async () => {
    const res = await request(app).get("/api/users/not-an-email").set("Authorization", `Bearer ${userToken()}`);
    expect(res.status).toBe(400);
  });

  test("USR-04 GET /api/users/:email ไม่มี token → 401", async () => {
    const res = await request(app).get(`/api/users/${activeUser.email}`);
    expect(res.status).toBe(401);
    expect(db.query).not.toHaveBeenCalled();
  });

  test("USR-05 GET /api/users/:email ของคนอื่น → 403", async () => {
    const res = await request(app).get("/api/users/other@ku.th").set("Authorization", `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });

  test("USR-06 GET /user ด้วย token แอดมิน → รายชื่อผู้ใช้ทั้งหมด", async () => {
    db.query.mockImplementation((_sql, cb) => cb(null, { rows: [activeUser] }));
    const res = await request(app).get("/user").set("Authorization", `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([activeUser]);
  });

  test("USR-07 GET /user ฐานข้อมูลผิดพลาด → 500", async () => {
    db.query.mockImplementation((_sql, cb) => cb(new Error("down")));
    const res = await request(app).get("/user").set("Authorization", `Bearer ${adminToken()}`);
    expect(res.status).toBe(500);
  });

  test("USR-08 GET /user ด้วย token ผู้ใช้ทั่วไป → 401", async () => {
    const res = await request(app).get("/user").set("Authorization", `Bearer ${userToken()}`);
    expect(res.status).toBe(401);
  });
});

describe("RNK จัดอันดับ", () => {
  test("RNK-01 GET /api/rankings/returners → top 10 ผู้คืนของ", async () => {
    const rows = [{ student_id: "1", first_name: "A", successful_returns: 5 }];
    routeQueries(db.query, [[/successful_returns > 0/, { rows }]]);
    const res = await request(app).get("/api/rankings/returners");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(findQuery(db.query, /successful_returns > 0/)[0]).toMatch(/LIMIT 10/);
  });

  test("RNK-02 GET /api/rankings/lost-locations → จุดที่ของหายบ่อย", async () => {
    const rows = [{ location: "SC-2", lost_count: 4 }];
    routeQueries(db.query, [[/GROUP BY lost_location/, { rows }]]);
    const res = await request(app).get("/api/rankings/lost-locations");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  test.each(["/api/rankings/returners", "/api/rankings/lost-locations"])("RNK-03 %s ฐานข้อมูลผิดพลาด → 500", async (url) => {
    routeQueries(db.query, [[/./, new Error("down")]]);
    const res = await request(app).get(url);
    expect(res.status).toBe(500);
  });
});

describe("LN POST /api/notifications/line", () => {
  afterEach(() => delete process.env.NOTIFY_API_KEY);
  const post = () => request(app).post("/api/notifications/line").set("x-api-key", "secret");

  test("LN-01 key ถูกต้องแต่ไม่มี message → 400", async () => {
    process.env.NOTIFY_API_KEY = "secret";
    const res = await post().send({ message: "  " });
    expect(res.status).toBe(400);
  });

  test("LN-02 ตั้ง NOTIFY_API_KEY แล้วส่ง key ผิด → 401", async () => {
    process.env.NOTIFY_API_KEY = "secret";
    const res = await request(app).post("/api/notifications/line").set("x-api-key", "wrong").send({ message: "hi" });
    expect(res.status).toBe(401);
    expect(sendLineNotification).not.toHaveBeenCalled();
  });

  test("LN-03 key ถูกต้อง → ส่งข้อความที่ trim แล้ว", async () => {
    process.env.NOTIFY_API_KEY = "secret";
    sendLineNotification.mockResolvedValue({ success: true });
    const res = await post().send({ message: "  hello  ", userId: "U1" });
    expect(res.status).toBe(200);
    expect(sendLineNotification).toHaveBeenCalledWith("hello", "U1");
  });

  test("LN-04 LINE API ล้มเหลว → 502", async () => {
    process.env.NOTIFY_API_KEY = "secret";
    sendLineNotification.mockRejectedValue(new Error("LINE API 500"));
    const res = await post().send({ message: "hi" });
    expect(res.status).toBe(502);
  });

  test("LN-05 ไม่ได้ตั้ง NOTIFY_API_KEY → endpoint ปิดใช้งาน (401)", async () => {
    const res = await request(app).post("/api/notifications/line").send({ message: "hi" });
    expect(res.status).toBe(401);
    expect(sendLineNotification).not.toHaveBeenCalled();
  });
});
