// ADM-xx : /admin/* (ต้องใช้ token แอดมิน) — dashboard, reports, users, items
const request = require("supertest");
const { backendPath, loadApp, routeQueries, findQuery, adminToken } = require("./helpers");

jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/services/lineNotification", () => ({ sendLineNotification: jest.fn() }));

const db = require(backendPath("db.js"));

let app;
const auth = () => ({ Authorization: `Bearer ${adminToken({ admin_id: 9, email: "admin@ku.th" })}` });

beforeAll(async () => {
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  app = await loadApp();
});

beforeEach(() => {
  db.query.mockReset();
  db.connect.mockReset();
  routeQueries(db.query, [[/COUNT\(\*\)/, { rows: [{ count: 0 }] }]]);
});

describe("ADM การป้องกันสิทธิ์", () => {
  test.each([
    ["get", "/admin/dashboard/stats"],
    ["get", "/admin/activity"],
    ["get", "/admin/reports"],
    ["get", "/admin/reports/RPT-2026-000001"],
    ["post", "/admin/reports/RPT-2026-000001/moderate"],
    ["get", "/admin/users"],
    ["post", "/admin/users/641/action"],
    ["get", "/admin/items?type=found"],
    ["patch", "/admin/items/found/1"],
    ["delete", "/admin/items/found/1"],
  ])("ADM-01 %s %s โดยไม่มี token → 401", async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe("ADM Dashboard / Activity", () => {
  test("ADM-02 GET /admin/dashboard/stats → รวมตัวเลขทุกหมวด", async () => {
    const counts = [
      [/FROM users$/, 120], [/FROM found_items/, 40], [/FROM lost_items/, 55],
      [/status = 'pending'/, 3], [/status = 'under_review'/, 2], [/status = 'resolved'/, 9],
      [/suspended_until > NOW/, 4], [/is_banned = true/, 1],
    ];
    routeQueries(db.query, counts.map(([re, n]) => [re, { rows: [{ count: n }] }]));

    const res = await request(app).get("/admin/dashboard/stats").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual({
      totalUsers: 120, totalFoundItems: 40, totalLostItems: 55, pendingReports: 3,
      underReviewReports: 2, resolvedReports: 9, suspendedUsers: 4, bannedUsers: 1,
    });
  });

  test("ADM-03 GET /admin/activity?limit=500 → จำกัดไม่เกิน 100", async () => {
    await request(app).get("/admin/activity?limit=500").set(auth());
    expect(findQuery(db.query, /resolved_at IS NOT NULL/)[1]).toEqual([100]);
  });

  test("ADM-04 GET /admin/activity ค่า default limit = 20", async () => {
    const res = await request(app).get("/admin/activity").set(auth());
    expect(res.status).toBe(200);
    expect(findQuery(db.query, /resolved_at IS NOT NULL/)[1]).toEqual([20]);
  });

  test("ADM-05 dashboard ฐานข้อมูลผิดพลาด → 500", async () => {
    routeQueries(db.query, [[/./, new Error("down")]]);
    const res = await request(app).get("/admin/dashboard/stats").set(auth());
    expect(res.status).toBe(500);
  });
});

describe("ADM Reports", () => {
  test("ADM-06 GET /admin/reports?status=pending&q=กระเป๋า → กรองสถานะ + คำค้น พร้อม total/stats", async () => {
    routeQueries(db.query, [
      [/ORDER BY created_at DESC/, { rows: [{ report_id: "RPT-1" }] }],
      [/COUNT\(\*\)::int AS count FROM \(/, { rows: [{ count: 1 }] }],
      [/COUNT\(\*\)/, { rows: [{ count: 7 }] }],
    ]);
    const res = await request(app).get("/admin/reports").query({ status: "pending", q: " กระเป๋า ", limit: 5, offset: 10 }).set(auth());

    expect(res.status).toBe(200);
    expect(res.body.reports).toEqual([{ report_id: "RPT-1" }]);
    expect(res.body.total).toBe(1);
    expect(res.body.stats).toEqual({ pending: 7, underReview: 7, resolved: 7, suspended: 7 });
    expect(findQuery(db.query, /ORDER BY created_at DESC/)[1]).toEqual(["pending", "%กระเป๋า%", 5, 10]);
  });

  test("ADM-07 GET /admin/reports?status=all → ไม่กรองสถานะ", async () => {
    await request(app).get("/admin/reports?status=all").set(auth());
    const [sql, params] = findQuery(db.query, /ORDER BY created_at DESC/);
    expect(sql).not.toMatch(/WHERE status/);
    expect(params).toEqual([20, 0]);
  });

  test("ADM-08 GET /admin/reports/:id ไม่พบ → 404", async () => {
    const res = await request(app).get("/admin/reports/RPT-X").set(auth());
    expect(res.status).toBe(404);
  });

  test("ADM-09 เปิดดูรายงานสถานะ pending → เปลี่ยนเป็น under_review และมี timeline", async () => {
    routeQueries(db.query, [[/WHERE r.report_id = \$1/, { rows: [{ report_id: "RPT-1", status: "pending", created_at: "2026-09-01T00:00:00Z", resolved_at: null }] }]]);
    const res = await request(app).get("/admin/reports/RPT-1").set(auth());

    expect(res.status).toBe(200);
    expect(res.body.report.status).toBe("under_review");
    expect(findQuery(db.query, /UPDATE reports SET status = 'under_review'/)[1]).toEqual(["RPT-1"]);
    expect(res.body.report.timeline.map((t) => t.label)).toEqual(["Report submitted", "Assigned to review"]);
  });

  test("ADM-10 รายงานที่ดำเนินการแล้ว → timeline แสดงผู้ดำเนินการ ไม่เปลี่ยนสถานะ", async () => {
    routeQueries(db.query, [[/WHERE r.report_id = \$1/, {
      rows: [{ report_id: "RPT-1", status: "resolved", action_taken: "ban", resolved_by_email: "admin@ku.th", created_at: "2026-09-01", resolved_at: "2026-09-02" }],
    }]]);
    const res = await request(app).get("/admin/reports/RPT-1").set(auth());

    expect(findQuery(db.query, /UPDATE reports/)).toBeUndefined();
    expect(res.body.report.timeline[1].label).toBe("Action taken: ban by admin@ku.th");
  });
});

describe("ADM Moderate report (transaction)", () => {
  let client;
  const setupClient = (rules) => {
    client = { query: jest.fn(), release: jest.fn() };
    routeQueries(client.query, rules);
    db.connect.mockResolvedValue(client);
  };
  const reportRow = [/FROM reports WHERE report_id = \$1 FOR UPDATE/, { rows: [{ reported_item_id: 5, item_type: "lost" }] }];
  const ownerRow = [/SELECT student_id FROM lost_items/, { rows: [{ student_id: "641" }] }];
  const updated = [/UPDATE reports/, (_sql, params) => ({ rows: [{ status: params[0], action_taken: params[1] }] })];
  const moderate = (body) => request(app).post("/admin/reports/RPT-1/moderate").set(auth()).send(body);
  const sqlList = () => client.query.mock.calls.map(([sql]) => String(sql).replace(/\s+/g, " "));

  test("ADM-11 action ไม่ถูกต้อง → 400", async () => {
    const res = await moderate({ action: "delete" });
    expect(res.status).toBe(400);
    expect(db.connect).not.toHaveBeenCalled();
  });

  test.each([undefined, 1, 14, "abc"])("ADM-12 suspend ด้วย duration_days=%p → 400", async (duration_days) => {
    const res = await moderate({ action: "suspend", duration_days });
    expect(res.status).toBe(400);
  });

  test("ADM-13 ไม่พบรายงาน → 404 และ ROLLBACK", async () => {
    setupClient([]);
    const res = await moderate({ action: "warn" });
    expect(res.status).toBe(404);
    expect(sqlList()).toContain("ROLLBACK");
    expect(client.release).toHaveBeenCalled();
  });

  test("ADM-14 warn → เพิ่ม warning_count, สถานะ resolved, action_taken=warning, COMMIT", async () => {
    setupClient([reportRow, ownerRow, updated]);
    const res = await moderate({ action: "warn", note: "เตือนครั้งแรก" });

    expect(res.status).toBe(200);
    expect(res.body.report).toEqual({ status: "resolved", action_taken: "warning" });
    expect(findQuery(client.query, /warning_count = warning_count \+ 1/)[1]).toEqual(["641"]);
    const updateParams = findQuery(client.query, /UPDATE reports/)[1];
    expect(updateParams).toEqual(["resolved", "warning", "เตือนครั้งแรก", 9, "RPT-1"]);
    expect(sqlList()).toEqual(expect.arrayContaining(["BEGIN", "COMMIT"]));
    expect(client.release).toHaveBeenCalled();
  });

  test("ADM-15 suspend 7 วัน → ตั้ง suspended_until", async () => {
    setupClient([reportRow, ownerRow, updated]);
    const res = await moderate({ action: "suspend", duration_days: 7 });
    expect(res.status).toBe(200);
    expect(findQuery(client.query, /SET suspended_until = NOW\(\)/)[1]).toEqual(["7", "641"]);
  });

  test("ADM-16 ban → ตั้ง is_banned = true", async () => {
    setupClient([reportRow, ownerRow, updated]);
    await moderate({ action: "ban" });
    expect(findQuery(client.query, /SET is_banned = true/)[1]).toEqual(["641"]);
  });

  test("ADM-17 dismiss รายการที่ไม่มีเจ้าของ → ยกเลิกรายงานได้ (status dismissed)", async () => {
    setupClient([reportRow, updated]);
    const res = await moderate({ action: "dismiss" });
    expect(res.status).toBe(200);
    expect(res.body.report).toEqual({ status: "dismissed", action_taken: "dismissed" });
  });

  test("ADM-18 ban รายการที่หาเจ้าของไม่ได้ → 404 และ ROLLBACK", async () => {
    setupClient([reportRow]);
    const res = await moderate({ action: "ban" });
    expect(res.status).toBe(404);
    expect(sqlList()).toContain("ROLLBACK");
  });

  test("ADM-19 ฐานข้อมูลผิดพลาดกลางทาง → 500, ROLLBACK และคืน connection", async () => {
    setupClient([reportRow, ownerRow, [/warning_count/, new Error("down")]]);
    const res = await moderate({ action: "warn" });
    expect(res.status).toBe(500);
    expect(sqlList()).toContain("ROLLBACK");
    expect(sqlList()).not.toContain("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });
});

describe("ADM Users", () => {
  test("ADM-20 GET /admin/users?q=som → ค้นชื่อ/อีเมล/รหัสนิสิต", async () => {
    routeQueries(db.query, [[/FROM users .*ORDER BY/, { rows: [{ student_id: "641" }] }], [/COUNT/, { rows: [{ count: 1 }] }]]);
    const res = await request(app).get("/admin/users?q=som").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, users: [{ student_id: "641" }], total: 1 });
    expect(findQuery(db.query, /ORDER BY created_at DESC/)[1]).toEqual(["%som%", 20, 0]);
  });

  test.each([
    ["suspended", /suspended_until > NOW\(\)/],
    ["banned", /is_banned = true/],
    ["active", /is_banned = false AND/],
  ])("ADM-21 GET /admin/users?status=%s → เงื่อนไขกรองถูกต้อง", async (status, pattern) => {
    await request(app).get(`/admin/users?status=${status}`).set(auth());
    expect(findQuery(db.query, /ORDER BY created_at DESC/)[0]).toMatch(pattern);
  });

  test.each([
    ["warn", {}, /warning_count = warning_count \+ 1/],
    ["suspend", { duration_days: 30 }, /suspended_until = NOW\(\)/],
    ["ban", {}, /is_banned = true/],
    ["unsuspend", {}, /suspended_until = NULL/],
    ["unban", {}, /is_banned = false/],
  ])("ADM-22 POST /admin/users/:id/action action=%s → อัปเดตถูกคอลัมน์", async (action, extra, pattern) => {
    routeQueries(db.query, [[/UPDATE users/, { rows: [{ student_id: "641" }] }]]);
    const res = await request(app).post("/admin/users/641/action").set(auth()).send({ action, ...extra });
    expect(res.status).toBe(200);
    expect(findQuery(db.query, pattern)).toBeDefined();
  });

  test("ADM-23 action ไม่ถูกต้อง → 400", async () => {
    const res = await request(app).post("/admin/users/641/action").set(auth()).send({ action: "delete" });
    expect(res.status).toBe(400);
  });

  test("ADM-24 suspend โดยไม่ระบุจำนวนวันที่อนุญาต (3/7/30) → 400", async () => {
    const res = await request(app).post("/admin/users/641/action").set(auth()).send({ action: "suspend", duration_days: 10 });
    expect(res.status).toBe(400);
  });

  test("ADM-25 ไม่พบผู้ใช้ → 404", async () => {
    const res = await request(app).post("/admin/users/nobody/action").set(auth()).send({ action: "ban" });
    expect(res.status).toBe(404);
  });
});

describe("ADM Items", () => {
  const validFound = { found_date: "2026-09-01", item_name: "ร่ม", found_location: "SC-2", category: "อื่น ๆ" };

  test("ADM-26 GET /admin/items ไม่ระบุ type → 400", async () => {
    const res = await request(app).get("/admin/items").set(auth());
    expect(res.status).toBe(400);
  });

  test("ADM-27 GET /admin/items?type=lost&q=กุญแจ → ค้นหาจาก lost_items", async () => {
    routeQueries(db.query, [[/SELECT \* FROM lost_items/, { rows: [{ item_id: 1 }] }], [/COUNT/, { rows: [{ count: 1 }] }]]);
    const res = await request(app).get("/admin/items").query({ type: "lost", q: "กุญแจ" }).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, items: [{ item_id: 1 }], total: 1 });
    expect(findQuery(db.query, /SELECT \* FROM lost_items/)[1]).toEqual(["%กุญแจ%", 20, 0]);
  });

  test("ADM-28 PATCH /admin/items/found/1 ข้อมูลถูกต้อง → 200", async () => {
    routeQueries(db.query, [[/UPDATE found_items/, { rows: [{ item_id: 1, item_name: "ร่ม" }] }]]);
    const res = await request(app).patch("/admin/items/found/1").set(auth()).send(validFound);
    expect(res.status).toBe(200);
    const [sql, params] = findQuery(db.query, /UPDATE found_items/);
    expect(sql).toMatch(/found_location = \$4/);
    expect(params).toEqual(["ร่ม", "อื่น ๆ", null, "SC-2", null, null, "2026-09-01", "1"]);
  });

  test("ADM-29 PATCH ข้อมูลไม่ผ่าน validation → 400", async () => {
    const res = await request(app).patch("/admin/items/found/1").set(auth()).send({ ...validFound, found_date: "bad" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("found_date must use YYYY-MM-DD format");
  });

  test("ADM-30 PATCH type ไม่ถูกต้อง → 400", async () => {
    const res = await request(app).patch("/admin/items/other/1").set(auth()).send(validFound);
    expect(res.status).toBe(400);
  });

  test("ADM-31 PATCH ไม่พบรายการ → 404", async () => {
    const res = await request(app).patch("/admin/items/found/999").set(auth()).send(validFound);
    expect(res.status).toBe(404);
  });

  test("ADM-32 DELETE /admin/items/lost/3 → 200", async () => {
    routeQueries(db.query, [[/DELETE FROM lost_items/, { rows: [{ item_id: 3 }] }]]);
    const res = await request(app).delete("/admin/items/lost/3").set(auth());
    expect(res.status).toBe(200);
    expect(findQuery(db.query, /DELETE FROM lost_items/)[1]).toEqual(["3"]);
  });

  test("ADM-33 DELETE ไม่พบรายการ → 404", async () => {
    const res = await request(app).delete("/admin/items/found/999").set(auth());
    expect(res.status).toBe(404);
  });

  test("ADM-34 DELETE type ไม่ถูกต้อง → 400", async () => {
    const res = await request(app).delete("/admin/items/users/1").set(auth());
    expect(res.status).toBe(400);
  });
});
