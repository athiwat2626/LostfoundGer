// RPT-xx : รายงานโพสต์ไม่เหมาะสม POST /report (ต้องเข้าสู่ระบบ ผู้รายงานมาจาก token)
const fs = require("fs");
const request = require("supertest");
const { backendPath, loadApp, routeQueries, findQuery, userToken } = require("./helpers");

jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/services/lineNotification", () => ({ sendLineNotification: jest.fn() }));

const db = require(backendPath("db.js"));

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
  routeQueries(db.query, [[/SELECT student_id FROM (found|lost)_items/, { rows: [{ student_id: "owner-1" }] }]]);
});

const REPORTER = "reporter-1";
const body = { reported_item_id: "10", item_type: "found", reason: "สแปม", detail: "โพสต์ซ้ำ" };
const report = (studentId = REPORTER) =>
  request(app).post("/report").set("Authorization", `Bearer ${userToken({ student_id: studentId })}`);

describe("RPT POST /report", () => {
  test("RPT-01 ข้อมูลครบ → 201 พร้อม report_id รูปแบบ RPT-ปี-เลข 6 หลัก", async () => {
    const res = await report().send(body);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.report_id).toMatch(new RegExp(`^RPT-${new Date().getFullYear()}-\\d{6}$`));
    expect(Number.isNaN(Date.parse(res.body.created_at))).toBe(false);

    const [, params] = findQuery(db.query, /INSERT INTO reports/);
    expect(params).toEqual([res.body.report_id, REPORTER, "10", "found", "สแปม", "โพสต์ซ้ำ", null]);
  });

  test("RPT-02 รายงานรายการ lost → ตรวจเจ้าของจากตาราง lost_items", async () => {
    await report().send({ ...body, item_type: "lost" });
    expect(findQuery(db.query, /SELECT student_id FROM lost_items/)).toBeDefined();
  });

  test.each([
    ["RPT-03 ไม่มี reported_item_id", { reported_item_id: "" }],
    ["RPT-04 ไม่มี item_type", { item_type: "" }],
    ["RPT-05 ไม่มี reason", { reason: "" }],
    ["RPT-12 reported_item_id ไม่ใช่ตัวเลข", { reported_item_id: "1;DROP" }],
  ])("%s → 400", async (_name, override) => {
    const res = await report().send({ ...body, ...override });
    expect(res.status).toBe(400);
    expect(findQuery(db.query, /INSERT INTO reports/)).toBeUndefined();
  });

  test("RPT-06 item_type ไม่ใช่ found/lost → 400", async () => {
    const res = await report().send({ ...body, item_type: "other" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("item_type ต้องเป็น found หรือ lost เท่านั้น");
  });

  test("RPT-07 รายงานโพสต์ของตัวเอง → 400", async () => {
    const res = await report("owner-1").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ไม่สามารถรายงานโพสต์ของตัวเองได้");
    expect(findQuery(db.query, /INSERT INTO reports/)).toBeUndefined();
  });

  test("RPT-08 ไม่เข้าสู่ระบบ → 401 และไม่บันทึกรายงาน", async () => {
    const res = await request(app).post("/report").send({ ...body, reporter_student_id: "spoofed" });
    expect(res.status).toBe(401);
    expect(findQuery(db.query, /INSERT INTO reports/)).toBeUndefined();
  });

  test("RPT-09 แนบรูปหลักฐาน → evidence_url อยู่ใน /assets/reportUploads/", async () => {
    let req = report();
    Object.entries(body).forEach(([key, value]) => {
      req = req.field(key, value);
    });
    const res = await req.attach("evidence", PNG_1PX, { filename: "proof.png", contentType: "image/png" });

    expect(res.status).toBe(201);
    const evidenceUrl = findQuery(db.query, /INSERT INTO reports/)[1][6];
    expect(evidenceUrl).toMatch(/^\/assets\/reportUploads\/\d+-[0-9a-f]{8}\.png$/);
    fs.unlinkSync(backendPath("assets", "reportUploads", evidenceUrl.split("/").pop()));
  });

  test("RPT-10 แนบไฟล์หลักฐานที่ไม่ใช่รูป → 400", async () => {
    const res = await report().attach("evidence", Buffer.from("%PDF"), { filename: "proof.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Only image files are allowed" });
  });

  test("RPT-11 ฐานข้อมูลผิดพลาด → 500", async () => {
    routeQueries(db.query, [
      [/SELECT student_id FROM found_items/, { rows: [{ student_id: "owner-1" }] }],
      [/INSERT INTO reports/, new Error("down")],
    ]);
    const res = await report().send(body);
    expect(res.status).toBe(500);
  });

  test("RPT-13 ไม่พบรายการที่รายงาน → 404", async () => {
    routeQueries(db.query, []);
    const res = await report().send(body);
    expect(res.status).toBe(404);
  });

  test("RPT-14 ผู้รายงานมาจาก token ไม่ใช่ body (ปลอม reporter_student_id ไม่ได้)", async () => {
    const res = await report().send({ ...body, reporter_student_id: "someone-else" });
    expect(res.status).toBe(201);
    expect(findQuery(db.query, /INSERT INTO reports/)[1][1]).toBe(REPORTER);
  });
});
