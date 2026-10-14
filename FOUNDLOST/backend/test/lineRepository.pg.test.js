// ทดสอบ SQL จริงของ lineRepository + migration กับ PostgreSQL
// ข้ามอัตโนมัติถ้าไม่ได้ตั้ง TEST_DATABASE_URL (เช่น postgres://postgres:pass@localhost:55432/postgres)
// สร้าง schema ชั่วคราวแยกต่างหากแล้วลบทิ้งเมื่อจบ — ห้ามชี้ไปที่ฐานข้อมูล production
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const { createLineRepository } = require("../services/line/lineRepository");
const { createAccountLinking, LinkError } = require("../services/line/accountLinking");

const url = process.env.TEST_DATABASE_URL;
const sql = (name) => fs.readFileSync(path.join(__dirname, "..", ...name), "utf8");

describe("lineRepository (PostgreSQL)", { skip: !url && "TEST_DATABASE_URL not set" }, () => {
  const schema = `line_test_${crypto.randomBytes(4).toString("hex")}`;
  let admin;
  let pool;
  let repo;

  before(async () => {
    admin = new Pool({ connectionString: url });
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new Pool({ connectionString: url, options: `-c search_path=${schema}` });
    await pool.query(sql(["database.sql"]));
    await pool.query(sql(["sql", "features.sql"]));
    await pool.query(sql(["sql", "line.sql"]));
    await pool.query(sql(["sql", "line.sql"])); // รันซ้ำได้
    await pool.query(
      `INSERT INTO users (student_id, first_name, last_name, email) VALUES
       ('6510000001', 'A', 'A', 'a@ku.th'), ('6510000002', 'B', 'B', 'b@ku.th')`
    );
    await pool.query(
      `INSERT INTO lost_items (item_id, student_id, lost_date, item_name) VALUES (15, '6510000001', '2026-10-11', 'กระเป๋า')`
    );
    await pool.query(
      `INSERT INTO found_items (item_id, student_id, found_date, item_name) VALUES (77, '6510000002', '2026-10-12', 'กระเป๋าสตางค์'), (78, NULL, '2026-10-12', 'ร่ม')`
    );
    repo = createLineRepository(pool);
  });

  after(async () => {
    await pool?.end();
    await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin?.end();
  });

  test("follow → link → unfollow → unlink ด้วย SQL จริง", async () => {
    const linking = createAccountLinking({ repo, ttlMinutes: () => 15 });
    const account = await repo.upsertFollow({ lineUserId: "U-a", displayName: "A" });
    assert.equal(account.is_following, true);

    const { token } = await linking.issueLinkToken("U-a");
    assert.equal((await linking.previewLink(token)).display_name, "A");
    const { account: linked } = await linking.confirmLink(token, "6510000001");
    assert.equal(linked.student_id, "6510000001");
    await assert.rejects(linking.confirmLink(token, "6510000001"), (e) => e instanceof LinkError && e.code === "used");

    // UNIQUE(student_id): LINE อื่นเชื่อมบัญชีเดียวกันไม่ได้
    await repo.upsertFollow({ lineUserId: "U-b" });
    const other = await linking.issueLinkToken("U-b");
    await assert.rejects(linking.confirmLink(other.token, "6510000001"), (e) => e.code === "student_linked_other");

    const unfollowed = await repo.markUnfollowed("U-a");
    assert.equal(unfollowed.is_following, false);
    assert.equal(unfollowed.student_id, "6510000001");
    assert.equal((await repo.upsertFollow({ lineUserId: "U-a" })).display_name, "A", "follow ใหม่ไม่ลบชื่อเดิม");

    assert.equal((await repo.setNotifyEnabled("6510000001", false)).notify_enabled, false);
    assert.equal((await repo.unlinkByStudent("6510000001")).student_id, null);
    assert.equal(await repo.unlinkByLineUser("U-a"), null);
  });

  test("รหัสที่หมดอายุแล้วใช้ไม่ได้ (ข้อมูลจริงในฐานข้อมูล)", async () => {
    const linking = createAccountLinking({ repo, ttlMinutes: () => 15, now: () => new Date(Date.now() - 60 * 60_000) });
    await repo.upsertFollow({ lineUserId: "U-c" });
    const { token } = await linking.issueLinkToken("U-c");
    const real = createAccountLinking({ repo, ttlMinutes: () => 15 });
    await assert.rejects(real.confirmLink(token, "6510000002"), (e) => e.code === "expired");
  });

  test("webhook event ซ้ำถูกตรวจพบ", async () => {
    assert.equal(await repo.recordWebhookEvent("evt-1", "follow"), true);
    assert.equal(await repo.recordWebhookEvent("evt-1", "follow"), false);
  });

  test("คู่รายการเดิมบันทึกได้ครั้งเดียว และผูกกับการส่ง LINE ได้", async () => {
    const pair = { lostItemId: "15", foundItemId: "77", recipientStudentId: "6510000001", score: 85 };
    const first = await repo.recordMatchPairs([pair, { ...pair, foundItemId: "78", score: 61 }]);
    assert.equal(first.length, 2);
    assert.deepEqual(await repo.recordMatchPairs([pair]), []);

    const delivery = await repo.createDelivery({
      studentId: "6510000001",
      lineUserId: "U-a",
      notificationType: "match",
      itemType: "lost",
      itemId: 15,
      title: "x",
      payload: [{ type: "text", text: "ทดสอบ" }],
      retryKey: crypto.randomUUID(),
    });
    assert.equal(delivery.status, "sending");
    assert.deepEqual(delivery.payload, [{ type: "text", text: "ทดสอบ" }]);
    await repo.attachDeliveryToMatches(delivery.delivery_id, first.map((f) => f.matchNotificationId));
    const linked = await pool.query("SELECT COUNT(*)::int AS n FROM match_notifications WHERE line_delivery_id = $1", [delivery.delivery_id]);
    assert.equal(linked.rows[0].n, 2);
  });

  test("retry: จองงานที่ถึงเวลา (SKIP LOCKED) → sent", async () => {
    const delivery = await repo.createDelivery({
      studentId: "6510000001",
      lineUserId: "U-a",
      notificationType: "match",
      itemType: "lost",
      itemId: 15,
      title: "retry",
      payload: [],
      retryKey: crypto.randomUUID(),
    });
    await repo.markDeliveryRetry(delivery.delivery_id, { nextAttemptAt: new Date(Date.now() + 60_000), code: "http_500", message: "x" });
    assert.equal((await repo.claimDueDeliveries()).length, 0, "ยังไม่ถึงเวลา");

    await repo.markDeliveryRetry(delivery.delivery_id, { nextAttemptAt: new Date(Date.now() - 1000), code: "http_500", message: "x" });
    const [claimed] = await repo.claimDueDeliveries();
    assert.equal(claimed.delivery_id, delivery.delivery_id);
    assert.equal(claimed.attempts, 2);
    assert.equal((await repo.claimDueDeliveries()).length, 0, "งานที่จองแล้วไม่ถูกหยิบซ้ำ");

    await repo.markDeliverySent(delivery.delivery_id, "req-1");
    const [row] = (await repo.listDeliveriesForStudent("6510000001")).filter((d) => d.delivery_id === delivery.delivery_id);
    assert.equal(row.status, "sent");
    assert.equal((await repo.listDeliveries({ status: "sent" })).length >= 1, true);
  });

  test("ลบผู้ใช้/รายการ ไม่ทำให้ข้อมูลค้างผิดรูป (foreign keys)", async () => {
    await pool.query("DELETE FROM found_items WHERE item_id = 78");
    const pairs = await pool.query("SELECT COUNT(*)::int AS n FROM match_notifications WHERE found_item_id = 78");
    assert.equal(pairs.rows[0].n, 0);
  });
});
