// FND-xx / LST-xx : แจ้งพบของ (/foundItem, /datafound) และแจ้งของหาย (/lostItem, /datalost)
// การแจ้ง (POST) ต้องมี token ผู้ใช้หรือแอดมิน: ผู้ใช้ → student_id มาจาก token, แอดมิน → ระบุเองหรือเว้นว่าง
const fs = require("fs");
const request = require("supertest");
const { backendPath, loadApp, routeQueries, findQuery, adminToken, userToken, pgError } = require("./helpers");

jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/services/lineNotification", () => ({ sendLineNotification: jest.fn() }));

const db = require(backendPath("db.js"));
const { sendLineNotification } = require(backendPath("services/lineNotification.js"));

// PNG ขนาด 1x1 พิกเซล
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

let app;
beforeAll(async () => {
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  app = await loadApp();
});

beforeEach(() => {
  db.query.mockReset();
  routeQueries(db.query, [[/INSERT INTO (found|lost)_items/, { rows: [{ item_id: 42 }] }]]);
  sendLineNotification.mockReset().mockResolvedValue({ success: true });
});

const CASES = [
  {
    prefix: "FND",
    label: "แจ้งพบของ",
    url: "/foundItem",
    alias: "/datafound",
    table: "found_items",
    uploadDir: "foundUploads",
    dateField: "found_date",
    locationField: "found_location",
    notifyText: "มีผู้รายงานพบของใหม่",
  },
  {
    prefix: "LST",
    label: "แจ้งของหาย",
    url: "/lostItem",
    alias: "/datalost",
    table: "lost_items",
    uploadDir: "lostUploads",
    dateField: "lost_date",
    locationField: "lost_location",
    notifyText: "มีผู้รายงานของหายใหม่",
  },
];

describe.each(CASES)("$prefix $label", (c) => {
  const post = (token = userToken()) => request(app).post(c.url).set("Authorization", `Bearer ${token}`);

  const validBody = () => ({
    student_id: "6410500001",
    [c.dateField]: "2026-09-01",
    item_name: "กระเป๋าสตางค์",
    category: "กระเป๋า",
    item_color: "สีดำ",
    [c.locationField]: "โรงอาหารกลาง 1",
    description: "สีดำ มีบัตรนิสิต",
    deposit_location: "กองกิจการนิสิต",
  });

  test(`${c.prefix}-01 ข้อมูลครบ (ไม่มีรูป) → 201 คืน item_id และแจ้งเตือน LINE`, async () => {
    const res = await post().send(validBody());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ item_id: 42 });
    const [sql, params] = findQuery(db.query, new RegExp(`INSERT INTO ${c.table}`));
    expect(sql).toContain(c.locationField);
    expect(params).toEqual([
      "6410500001", null, "2026-09-01", "กระเป๋าสตางค์", "กระเป๋า", "สีดำ", "โรงอาหารกลาง 1", "สีดำ มีบัตรนิสิต", "กองกิจการนิสิต",
    ]);
    expect(sendLineNotification.mock.calls[0][0]).toContain(c.notifyText);
    expect(sendLineNotification.mock.calls[0][0]).toContain("กระเป๋าสตางค์");
  });

  test(`${c.prefix}-02 ส่งแบบ multipart พร้อมรูปภาพ → บันทึก image_url ใน /assets/${c.uploadDir}/`, async () => {
    const body = validBody();
    let req = post();
    Object.entries(body).forEach(([key, value]) => {
      req = req.field(key, value);
    });
    const res = await req.attach("image", PNG_1PX, { filename: "photo.png", contentType: "image/png" });

    expect(res.status).toBe(201);
    const imageUrl = findQuery(db.query, new RegExp(`INSERT INTO ${c.table}`))[1][1];
    expect(imageUrl).toMatch(new RegExp(`^/assets/${c.uploadDir}/\\d+-[0-9a-f]{8}\\.png$`));

    // ลบไฟล์ที่เทสอัปโหลดออก
    const saved = backendPath("assets", c.uploadDir, imageUrl.split("/").pop());
    expect(fs.existsSync(saved)).toBe(true);
    fs.unlinkSync(saved);
  });

  test(`${c.prefix}-03 อัปโหลดไฟล์ที่ไม่ใช่รูปภาพ → 400`, async () => {
    const res = await post()
      .field("item_name", "x")
      .attach("image", Buffer.from("hello"), { filename: "note.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Only image files are allowed" });
  });

  test(`${c.prefix}-04 รูปภาพใหญ่เกิน 5 MB → 400`, async () => {
    const res = await post()
      .attach("image", Buffer.alloc(5 * 1024 * 1024 + 1), { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Image must not exceed 5 MB" });
  });

  test.each([
    ["05 ไม่มีชื่อสิ่งของ", { item_name: "" }, "item_name is required"],
    ["06 วันที่ผิดรูปแบบ", { [c.dateField]: "01-09-2026" }, `${c.dateField} must use YYYY-MM-DD format`],
    ["07 วันที่ไม่มีจริง", { [c.dateField]: "2026-13-01" }, `${c.dateField} is not a valid date`],
    ["08 ไม่มีสถานที่", { [c.locationField]: "" }, `${c.locationField} is required`],
    ["09 ชื่อยาวเกิน 255 ตัว", { item_name: "x".repeat(256) }, "item_name must not exceed 255 characters"],
  ])(`${c.prefix}-%s → 400`, async (_name, override, message) => {
    const res = await post().send({ ...validBody(), ...override });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: message });
    expect(findQuery(db.query, /INSERT INTO/)).toBeUndefined();
  });

  test(`${c.prefix}-10 token ผู้ใช้ → student_id มาจาก token แม้ body จะส่งค่าอื่นมา`, async () => {
    await post(userToken({ student_id: "6410599999" })).send({ ...validBody(), student_id: "someone-else" });
    expect(findQuery(db.query, new RegExp(`INSERT INTO ${c.table}`))[1][0]).toBe("6410599999");
  });

  test(`${c.prefix}-11 แจ้งเตือน LINE ล้มเหลว ไม่กระทบการบันทึก → ยัง 201`, async () => {
    sendLineNotification.mockRejectedValue(new Error("LINE down"));
    const res = await post().send(validBody());
    expect(res.status).toBe(201);
  });

  test(`${c.prefix}-12 ฐานข้อมูลผิดพลาดตอนบันทึก → 500`, async () => {
    routeQueries(db.query, [[/INSERT INTO/, new Error("down")]]);
    const res = await post().send(validBody());
    expect(res.status).toBe(500);
    expect(sendLineNotification).not.toHaveBeenCalled();
  });

  test(`${c.prefix}-13 GET ${c.url} → รายการทั้งหมดเรียงจากใหม่ไปเก่า`, async () => {
    const rows = [{ item_id: 2 }, { item_id: 1 }];
    routeQueries(db.query, [[new RegExp(`SELECT \\* FROM ${c.table}`), { rows }]]);
    const res = await request(app).get(c.url);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(findQuery(db.query, new RegExp(`FROM ${c.table}`))[0]).toMatch(/ORDER BY item_id DESC/);
  });

  test(`${c.prefix}-14 GET ${c.alias} (path สำรอง) ใช้งานได้เหมือนกัน`, async () => {
    routeQueries(db.query, [[/SELECT \*/, { rows: [{ item_id: 1 }] }]]);
    const res = await request(app).get(c.alias);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ item_id: 1 }]);
  });

  test(`${c.prefix}-15 GET ${c.url} ฐานข้อมูลผิดพลาด → 500`, async () => {
    routeQueries(db.query, [[/./, new Error("down")]]);
    const res = await request(app).get(c.url);
    expect(res.status).toBe(500);
  });

  test(`${c.prefix}-16 ไม่มี token → 401 และไม่บันทึก`, async () => {
    const res = await request(app).post(c.url).send(validBody());
    expect(res.status).toBe(401);
    expect(findQuery(db.query, /INSERT INTO/)).toBeUndefined();
  });

  test(`${c.prefix}-17 แอดมินเพิ่มรายการโดยไม่ระบุเจ้าของ → student_id = null และบันทึก audit log`, async () => {
    const res = await post(adminToken()).send({ ...validBody(), student_id: "  " });
    expect(res.status).toBe(201);
    expect(findQuery(db.query, new RegExp(`INSERT INTO ${c.table}`))[1][0]).toBeNull();
    const [, audit] = findQuery(db.query, /INSERT INTO admin_audit_logs/);
    expect(audit[2]).toBe("item.create");
    expect(audit[5]).toContain("ไม่มีเจ้าของโพสต์");
  });

  test(`${c.prefix}-18 ผู้ใช้ทั่วไปแจ้ง → ไม่บันทึก audit log ของแอดมิน`, async () => {
    await post().send(validBody());
    expect(findQuery(db.query, /INSERT INTO admin_audit_logs/)).toBeUndefined();
  });

  test(`${c.prefix}-19 แอดมินระบุรหัสนิสิตที่ไม่มีในระบบ (FK violation) → 400`, async () => {
    routeQueries(db.query, [[/INSERT INTO (found|lost)_items/, pgError("23503")]]);
    const res = await post(adminToken()).send({ ...validBody(), student_id: "9999999999" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ไม่พบรหัสนิสิตเจ้าของรายการนี้ในระบบ");
  });
});
