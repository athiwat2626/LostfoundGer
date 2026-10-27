// หน้าจัดการรายการของแอดมิน: GET /admin/items/summary, /admin/items/search, /admin/items/:type/:id
const fakeDb = require("./helpers/fakeDb"); // ต้องมาก่อนโมดูลที่ใช้ db
const { test, describe, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-jwt-secret";
const adminAuth = require("../middleware/adminAuth");
const adminRoute = require("../routes/adminRoute");

const adminToken = jwt.sign({ admin_id: 1, email: "admin@ku.th" }, process.env.JWT_SECRET);
const userToken = jwt.sign({ role: "user", student_id: "6510000001", email: "u@ku.th" }, process.env.JWT_SECRET);

let server;
let baseUrl;
const get = (path, token = adminToken) =>
  fetch(`${baseUrl}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

beforeEach(async () => {
  fakeDb.reset();
  if (!server) {
    const app = express();
    app.use(express.json());
    app.use("/admin", adminAuth, adminRoute);
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  }
});
after(() => {
  server.closeAllConnections();
  server.close();
});

describe("สิทธิ์แอดมิน (ตรวจที่ backend)", () => {
  for (const path of ["/admin/items/summary?type=lost", "/admin/items/search?type=lost", "/admin/items/lost/1"]) {
    test(`${path} ไม่มี token / token ผู้ใช้ทั่วไป → 401`, async () => {
      assert.equal((await get(path, null)).status, 401);
      assert.equal((await get(path, userToken)).status, 401);
      assert.equal(fakeDb.calls.length, 0, "ไม่แตะฐานข้อมูล");
    });
  }
});

describe("GET /admin/items/summary", () => {
  test("type ผิด → 400", async () => {
    assert.equal((await get("/admin/items/summary?type=users")).status, 400);
  });

  test("นับจากสถานะจริง (open/returned) + 7 วันล่าสุด และคืนหมวดที่มีในรายการ", async () => {
    fakeDb.handler = (sql) => {
      if (sql.includes("COUNT(*) FILTER")) return { rows: [{ total: 12, recent: 3, open: 9, returned: 3 }] };
      if (sql.includes("DISTINCT category")) return { rows: [{ category: "กระเป๋า" }, { category: "ร่ม" }] };
    };
    const res = await get("/admin/items/summary?type=found");
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(body.summary, { total: 12, recent: 3, open: 9, returned: 3 });
    assert.deepEqual(body.categories, ["กระเป๋า", "ร่ม"]);
    assert.match(fakeDb.calls[0].sql, /FROM found_items/);
    assert.match(fakeDb.calls[0].sql, /status = 'open'/);
    assert.match(fakeDb.calls[0].sql, /status = 'returned'/);
  });
});

describe("GET /admin/items/search", () => {
  const rows = { rows: [{ item_id: 5, item_name: "กระเป๋า", owner_first_name: "A" }] };

  test("ค้นหา + ตัวกรองทั้งหมด → SQL ใช้พารามิเตอร์ (ไม่ต่อสตริง) และแบ่งหน้าได้", async () => {
    fakeDb.handler = (sql) => (sql.includes("COUNT(*)::int AS count") ? { rows: [{ count: 41 }] } : rows);
    const res = await get(
      "/admin/items/search?type=lost&q=กระ&status=open&category=กระเป๋า&from=2026-10-01&to=2026-10-14&limit=20&offset=20"
    );
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.total, 41);
    assert.equal(body.items[0].item_id, 5);

    const list = fakeDb.calls.find((c) => c.sql.includes("LEFT JOIN users u"));
    assert.match(list.sql, /FROM lost_items i/);
    assert.match(list.sql, /i\.item_name ILIKE \$1 OR i\.student_id ILIKE \$1/);
    assert.match(list.sql, /i\.status = \$2/);
    assert.match(list.sql, /i\.category = \$3/);
    assert.match(list.sql, /Asia\/Bangkok/);
    assert.deepEqual(list.params, ["%กระ%", "open", "กระเป๋า", "2026-10-01", "2026-10-14", "lost", 20, 20]);
    const count = fakeDb.calls.find((c) => c.sql.includes("COUNT(*)::int AS count"));
    assert.deepEqual(count.params, ["%กระ%", "open", "กระเป๋า", "2026-10-01", "2026-10-14"]);
  });

  test("ไม่มีตัวกรอง → ไม่มี WHERE และ limit ถูกจำกัดไม่เกิน 100", async () => {
    fakeDb.handler = (sql) => (sql.includes("COUNT(*)::int AS count") ? { rows: [{ count: 0 }] } : { rows: [] });
    await get("/admin/items/search?type=found&limit=5000");
    const list = fakeDb.calls.find((c) => c.sql.includes("LEFT JOIN users u"));
    // มี WHERE เฉพาะใน subquery นับผู้ติดต่อ ไม่มีเงื่อนไขกรองรายการ
    assert.doesNotMatch(list.sql, /WHERE \(|i\.status =|i\.category =/);
    assert.doesNotMatch(fakeDb.calls.find((c) => c.sql.includes("COUNT(*)::int AS count")).sql, /WHERE/);
    assert.deepEqual(list.params, ["found", 100, 0]);
  });

  test("สถานะ/วันที่ไม่ถูกต้อง → 400 โดยไม่แตะฐานข้อมูล", async () => {
    assert.equal((await get("/admin/items/search?type=lost&status=deleted")).status, 400);
    assert.equal((await get("/admin/items/search?type=lost&from=14/10/2026")).status, 400);
    assert.equal((await get("/admin/items/search?type=other")).status, 400);
    assert.equal(fakeDb.calls.length, 0);
  });
});

describe("GET /admin/items/:type/:item_id", () => {
  test("พบรายการ → ข้อมูล + ผู้ติดต่อ + จำนวนคู่ + ประวัติ (target ของ audit log ตรงกับรายการ)", async () => {
    fakeDb.handler = (sql) => {
      if (sql.includes("LEFT JOIN users r")) return { rows: [{ item_id: 7, item_name: "ร่ม", status: "open" }] };
      if (sql.includes("FROM claims c")) return { rows: [{ claim_id: 1, status: "pending" }] };
      if (sql.includes("FROM match_notifications")) return { rows: [{ count: 2 }] };
      if (sql.includes("FROM admin_audit_logs")) return { rows: [{ log_id: 9, summary: "แก้ไข" }] };
    };
    const res = await get("/admin/items/found/7");
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.item.item_name, "ร่ม");
    assert.equal(body.claims.length, 1);
    assert.equal(body.match_count, 2);
    assert.equal(body.history[0].log_id, 9);
    assert.match(fakeDb.calls.find((c) => c.sql.includes("match_notifications")).sql, /found_item_id = \$1/);
    assert.deepEqual(fakeDb.calls.find((c) => c.sql.includes("admin_audit_logs")).params, ["found_item", "7"]);
  });

  test("ไม่พบ → 404 / id หรือ type ผิด → 400", async () => {
    assert.equal((await get("/admin/items/lost/999")).status, 404);
    assert.equal((await get("/admin/items/lost/abc")).status, 400);
    assert.equal((await get("/admin/items/users/1")).status, 400);
  });
});
