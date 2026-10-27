// การทำงานร่วมกับระบบเดิม: การแจ้งของหาย/พบของยังทำงานเหมือนเดิม และการเปิดดูรายการต้องเป็นเจ้าของเท่านั้น
const fakeDb = require("./helpers/fakeDb"); // ต้องมาก่อนโมดูลที่ใช้ db
const { test, describe, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const { mockLineApi, json } = require("./helpers/lineApiMock");

process.env.JWT_SECRET = "test-jwt-secret";
const tokenFor = (studentId) => jwt.sign({ role: "user", student_id: studentId, email: `${studentId}@ku.th` }, process.env.JWT_SECRET);

const lostItemRoute = require("../routes/lostItemRoute");
const myItemRoute = require("../routes/myItemRoute");
const { sendLineNotification } = require("../services/lineNotification");

let server;
let baseUrl;
let api;

const start = async () => {
  const app = express();
  app.use(express.json());
  app.use("/lostItem", lostItemRoute);
  app.use("/api/my-items", myItemRoute);
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
};

beforeEach(async () => {
  fakeDb.reset();
  api = mockLineApi(() => json(200, {}));
  if (!server) await start();
});
afterEach(() => api.restore());
after(() => {
  server.closeAllConnections();
  server.close();
});

describe("POST /lostItem (ระบบเดิม)", () => {
  test("ยังต้องเข้าสู่ระบบ", async () => {
    const res = await fetch(`${baseUrl}/lostItem`, { method: "POST" });
    assert.equal(res.status, 401);
  });

  test("ข้อมูลไม่ครบ → 400 เหมือนเดิม", async () => {
    const form = new FormData();
    form.append("item_name", "กระเป๋า");
    const res = await fetch(`${baseUrl}/lostItem`, { method: "POST", headers: { authorization: `Bearer ${tokenFor("6510000001")}` }, body: form });
    assert.equal(res.status, 400);
  });

  test("แจ้งของหายสำเร็จ → 201 พร้อม item_id และเรียกจับคู่เบื้องหลังโดยไม่บล็อกการตอบกลับ", async () => {
    fakeDb.handler = (sql) => {
      if (sql.includes("INSERT INTO lost_items")) return { rows: [{ item_id: "501" }] };
      return undefined; // ไม่มีของพบที่ตรงกัน
    };
    const form = new FormData();
    form.append("item_name", "กระเป๋าสตางค์");
    form.append("lost_date", "2026-10-11");
    form.append("lost_location", "อาคารเรียนรวม 1");
    form.append("category", "กระเป๋า");
    form.append("item_color", "ดำ");
    const res = await fetch(`${baseUrl}/lostItem`, { method: "POST", headers: { authorization: `Bearer ${tokenFor("6510000001")}` }, body: form });
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { item_id: "501" });

    const insert = fakeDb.calls.find((c) => c.sql.includes("INSERT INTO lost_items"));
    assert.equal(insert.params[0], "6510000001", "ใช้ student_id จาก token");
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(fakeDb.calls.some((c) => c.sql.includes("FROM found_items")), "เรียก Matching Algorithm เดิม");
  });
});

describe("GET /api/my-items/:type/:id/matches (ลิงก์จากข้อความ LINE)", () => {
  test("ไม่มี token → 401", async () => {
    assert.equal((await fetch(`${baseUrl}/api/my-items/lost/15/matches`)).status, 401);
  });

  test("รายการของผู้อื่น → 404 (query กรองด้วย student_id จาก token เสมอ)", async () => {
    fakeDb.handler = (sql, params) =>
      sql.includes("FROM lost_items WHERE item_id = $1 AND student_id = $2") && params[1] === "6510000001"
        ? { rows: [{ item_id: "15", item_name: "กระเป๋า", date: "2026-10-11", student_id: "6510000001", status: "open" }] }
        : undefined;
    const res = await fetch(`${baseUrl}/api/my-items/lost/15/matches`, { headers: { authorization: `Bearer ${tokenFor("6510000002")}` } });
    assert.equal(res.status, 404);
    const lookup = fakeDb.calls.find((c) => c.sql.includes("FROM lost_items WHERE item_id"));
    assert.deepEqual(lookup.params, ["15", "6510000002"]);
  });

  test("เจ้าของรายการ → 200", async () => {
    fakeDb.handler = (sql, params) =>
      sql.includes("FROM lost_items WHERE item_id = $1 AND student_id = $2") && params[1] === "6510000001"
        ? { rows: [{ item_id: "15", item_name: "กระเป๋า", date: "2026-10-11", student_id: "6510000001", status: "open" }] }
        : undefined;
    const res = await fetch(`${baseUrl}/api/my-items/lost/15/matches`, { headers: { authorization: `Bearer ${tokenFor("6510000001")}` } });
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).matches, []);
  });

  test("พารามิเตอร์แปลกปลอม → 400", async () => {
    const res = await fetch(`${baseUrl}/api/my-items/lost/1%20OR%201=1/matches`, { headers: { authorization: `Bearer ${tokenFor("6510000001")}` } });
    assert.equal(res.status, 400);
  });
});

describe("sendLineNotification (ฟีดแจ้งผู้ดูแลเดิม)", () => {
  test("ไม่ได้ตั้งค่า → skipped ไม่เรียก LINE", async () => {
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    delete process.env.LINE_USER_ID;
    assert.deepEqual(await sendLineNotification("x"), { skipped: true });
    assert.equal(api.requests.length, 0);
  });

  test("ตั้งค่าแล้ว → push ข้อความไปยัง LINE_USER_ID", async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
    process.env.LINE_USER_ID = "U-admin";
    assert.deepEqual(await sendLineNotification("มีโพสต์ใหม่"), { success: true });
    assert.deepEqual(api.requests[0].body, { to: "U-admin", messages: [{ type: "text", text: "มีโพสต์ใหม่" }] });
  });
});
