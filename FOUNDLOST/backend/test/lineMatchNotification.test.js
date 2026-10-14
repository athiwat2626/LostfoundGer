// แจ้งเตือนคู่ที่อาจตรงกัน: ใช้ Matching Algorithm เดิม → บันทึกคู่ (กันซ้ำ) → ส่ง LINE → จัดการกรณี LINE ล้มเหลว
const fakeDb = require("./helpers/fakeDb"); // ต้องมาก่อนโมดูลที่ใช้ db
const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { findMatches, scorePair } = require("../services/matching");
const { createMatchNotifier } = require("../services/matchNotifier");
const { createMatchDelivery, RETRY_WINDOW_MS } = require("../services/line/matchDelivery");
const { MATCH_HEADLINE, DISCLAIMER } = require("../services/line/messages");
const client = require("../services/line/lineClient");
const { createMemoryRepo } = require("./helpers/memoryRepo");
const { mockLineApi, json } = require("./helpers/lineApiMock");

const silent = { info() {}, warn() {}, error() {} };
const OWNER = "6510000001";
const FINDER = "6510000099";

// ของพบในฐานข้อมูล (ผลจาก SELECT ใน findMatches)
const foundWallet = {
  item_id: "77",
  item_name: "กระเป๋าสตางค์สีดำ",
  category: "กระเป๋า",
  item_color: "ดำ",
  date: new Date(2026, 9, 12),
  location: "อาคารเรียนรวม 1",
  student_id: FINDER,
  description: "เจอใต้โต๊ะ มีบัตรนิสิตชื่อ ... โทร 08x",
  deposit_location: "ห้องกิจการนิสิต",
  created_at: new Date(),
};
const foundUmbrella = { ...foundWallet, item_id: "78", item_name: "ร่มสีแดง", category: "อื่น ๆ", location: "โรงอาหารกลาง" };
const lostWallet = { item_id: "15", item_name: "กระเป๋าสตางค์", category: "กระเป๋า", date: "2026-10-11", location: "อาคารเรียนรวม 1", student_id: OWNER };

describe("Matching Algorithm เดิม (services/matching.js)", () => {
  beforeEach(() => fakeDb.reset());

  test("ของหายกับของพบที่ชื่อ/หมวด/สถานที่/วันใกล้กัน ได้คะแนนสูงพร้อมเหตุผล", () => {
    const { score, reasons } = scorePair(lostWallet, foundWallet);
    assert.ok(score >= 60, `score=${score}`);
    assert.deepEqual(reasons, ["หมวดเดียวกัน", "ชื่อคล้ายกัน", "สถานที่ใกล้เคียง", "ช่วงเวลาใกล้กัน"]);
    assert.ok(scorePair(lostWallet, foundUmbrella).score < 60);
  });

  test("findMatches ค้นเฉพาะโพสต์ฝั่งตรงข้ามที่ยังเปิด ไม่รวมโพสต์ของตัวเอง และกรองตามคะแนน", async () => {
    fakeDb.handler = (sql) => (sql.includes("FROM found_items") ? { rows: [foundWallet, foundUmbrella] } : undefined);
    const matches = await findMatches("lost", lostWallet, { minScore: 60 });
    assert.deepEqual(matches.map((m) => m.item_id), ["77"]);
    const [{ sql, params }] = fakeDb.calls;
    assert.match(sql, /status = 'open'/);
    assert.match(sql, /student_id IS DISTINCT FROM \$4/);
    assert.equal(params[3], OWNER);
  });
});

describe("แจ้งเตือนเมื่อมีคู่รายการใหม่", () => {
  let repo;
  let api;
  let notified;
  let notifier;
  let delivery;
  let clock;

  const pushes = () => api.requests.filter((r) => r.url.endsWith("/message/push"));
  const linkOwner = async ({ notify = true, following = true } = {}) => {
    await repo.upsertFollow({ lineUserId: "U-owner" });
    Object.assign(repo._state.accounts.get("U-owner"), { student_id: OWNER, notify_enabled: notify, is_following: following });
  };
  const setup = (respond) => {
    api?.restore();
    api = mockLineApi(respond);
  };

  beforeEach(() => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
    process.env.APP_BASE_URL = "https://lostfound.example.test";
    clock = new Date("2026-10-14T10:00:00Z");
    fakeDb.reset();
    fakeDb.handler = (sql) => (sql.includes("FROM found_items") ? { rows: [foundWallet, foundUmbrella] } : undefined);
    repo = createMemoryRepo({ now: () => clock });
    notified = [];
    let uuid = 0;
    delivery = createMatchDelivery({
      repo,
      client,
      isConfigured: () => Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
      now: () => clock,
      logger: silent,
      randomUUID: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}`,
    });
    notifier = createMatchNotifier({
      findMatches,
      notify: async (studentId, notification, options) => notified.push({ studentId, notification, options }),
      repo,
      lineDelivery: delivery,
      logger: silent,
    });
    setup(() => json(200, {}, { "x-line-request-id": "req-ok" }));
  });

  afterEach(() => api.restore());

  test("ของหายใหม่ที่มีของพบตรงกัน → push LINE ถึงเจ้าของ พร้อมรายละเอียดและปุ่มเปิดเว็บ", async () => {
    await linkOwner();
    const result = await notifier.notifyNewItemMatches("lost", lostWallet);
    assert.equal(result.notified, 1);

    // ช่องทางเดิมยังทำงาน (กระดิ่ง + อีเมล) และลิงก์ไปที่รายการนั้นโดยตรง
    assert.equal(notified.length, 1);
    assert.equal(notified[0].studentId, OWNER);
    assert.equal(notified[0].options.email, true);
    assert.equal(notified[0].notification.link, "/my-posts?type=lost&item=15&panel=matches");

    const [push] = pushes();
    assert.equal(push.body.to, "U-owner");
    assert.equal(push.headers.authorization, "Bearer test-access-token");
    assert.match(push.headers["x-line-retry-key"], /^00000000-/);
    const [intro, flex] = push.body.messages;
    assert.equal(intro.text, `${MATCH_HEADLINE}\n\n${DISCLAIMER}`);
    const bubble = flex.contents;
    const textOf = JSON.stringify(bubble);
    assert.match(textOf, /กระเป๋าสตางค์สีดำ/);
    assert.match(textOf, /กระเป๋า · สีดำ/);
    assert.match(textOf, /อาคารเรียนรวม 1/);
    assert.match(textOf, /12 ต\.ค\. 2569/);
    assert.equal(bubble.footer.contents[0].action.uri, "https://lostfound.example.test/my-posts?type=lost&item=15&panel=matches");

    // ไม่อ้างว่าตรงกันแน่นอน และไม่เปิดเผยข้อมูลผู้แจ้งพบ
    const all = JSON.stringify(push.body);
    assert.doesNotMatch(all, /แน่นอน/);
    assert.doesNotMatch(all, new RegExp(FINDER));
    assert.doesNotMatch(all, /โทร 08x|บัตรนิสิต/);

    const [saved] = repo._state.deliveries.values();
    assert.equal(saved.status, "sent");
    assert.equal(saved.line_request_id, "req-ok");
    assert.equal([...repo._state.matchPairs.values()][0].lineDeliveryId, saved.delivery_id);
  });

  test("ของพบใหม่ → แจ้งเจ้าของโพสต์ของหายที่อาจตรงกัน", async () => {
    await linkOwner();
    fakeDb.handler = (sql) =>
      sql.includes("FROM lost_items") ? { rows: [{ ...lostWallet, date: new Date(2026, 9, 11), image_url: null }] } : undefined;
    await notifier.notifyNewItemMatches("found", { ...foundWallet, date: "2026-10-12" });
    assert.equal(pushes().length, 1);
    assert.equal(pushes()[0].body.to, "U-owner");
    assert.match(notified[0].notification.title, /มีคนแจ้งพบ/);
  });

  test("ไม่พบคู่ที่ผ่านเกณฑ์ → ไม่ส่งแจ้งเตือนใด ๆ", async () => {
    await linkOwner();
    fakeDb.handler = (sql) => (sql.includes("FROM found_items") ? { rows: [foundUmbrella] } : undefined);
    await notifier.notifyNewItemMatches("lost", lostWallet);
    assert.equal(pushes().length, 0);
    assert.equal(notified.length, 0);
    assert.equal(repo._state.matchPairs.size, 0);
  });

  test("คู่รายการเดิมแจ้งเพียงครั้งเดียว แม้จับคู่ซ้ำ", async () => {
    await linkOwner();
    await notifier.notifyNewItemMatches("lost", lostWallet);
    await notifier.notifyNewItemMatches("lost", lostWallet);
    // ฝั่งของพบเรียกจับคู่กลับมาที่คู่เดิม
    fakeDb.handler = (sql) => (sql.includes("FROM lost_items") ? { rows: [{ ...lostWallet, date: new Date(2026, 9, 11) }] } : undefined);
    await notifier.notifyNewItemMatches("found", { ...foundWallet, date: "2026-10-12" });

    assert.equal(pushes().length, 1);
    assert.equal(notified.length, 1);
    assert.equal(repo._state.deliveries.size, 1);
  });

  test("ผู้ใช้ที่ยังไม่เชื่อม LINE / ปิดแจ้งเตือน / ยกเลิกเพื่อน → ได้เฉพาะแจ้งเตือนในเว็บ", async () => {
    await notifier.notifyNewItemMatches("lost", lostWallet);
    assert.equal(pushes().length, 0);
    assert.equal(notified.length, 1);

    for (const [i, state] of [{ notify: false }, { following: false }].entries()) {
      repo = createMemoryRepo({ now: () => clock });
      delivery = createMatchDelivery({ repo, client, isConfigured: () => true, now: () => clock, logger: silent });
      notifier = createMatchNotifier({ findMatches, notify: async () => {}, repo, lineDelivery: delivery, logger: silent });
      await linkOwner(state);
      await notifier.notifyNewItemMatches("lost", { ...lostWallet, item_id: String(100 + i) });
    }
    assert.equal(pushes().length, 0);
  });

  test("ยังไม่ได้ตั้งค่า LINE → ข้ามการส่ง (ไม่แสร้งว่าส่งสำเร็จ) แต่แจ้งเตือนในเว็บยังทำงาน", async () => {
    await linkOwner();
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    await notifier.notifyNewItemMatches("lost", lostWallet);
    assert.equal(pushes().length, 0);
    assert.equal(repo._state.deliveries.size, 0);
    assert.equal(notified.length, 1);
  });

  test("LINE ตอบ 500 → บันทึกข้อผิดพลาดและนัดลองใหม่ด้วย retry key เดิม → สำเร็จ", async () => {
    await linkOwner();
    setup(() => json(500, { message: "Internal error" }));
    await notifier.notifyNewItemMatches("lost", lostWallet);
    const saved = () => [...repo._state.deliveries.values()][0];
    assert.equal(saved().status, "retry");
    assert.equal(saved().last_error_code, "http_500");
    assert.match(saved().last_error_message, /Internal error/);
    assert.doesNotMatch(saved().last_error_message, /test-access-token/);
    const firstKey = pushes()[0].headers["x-line-retry-key"];

    // ยังไม่ถึงเวลา → ไม่ส่ง
    assert.deepEqual(await delivery.processDueDeliveries(), []);

    clock = new Date(clock.getTime() + 2 * 60_000);
    const previous = api.requests;
    setup(() => json(200, {}, { "x-line-request-id": "req-retry" }));
    assert.deepEqual(await delivery.processDueDeliveries(), ["sent"]);
    assert.equal(pushes()[0].headers["x-line-retry-key"], firstKey);
    assert.deepEqual(pushes()[0].body, previous[0].body);
    assert.equal(saved().status, "sent");
    assert.equal(saved().attempts, 2);
  });

  test("ผลไม่แน่ชัด (timeout) → ลองใหม่ได้ และถ้า LINE รับไปแล้ว (409 + accepted id) ถือว่าส่งสำเร็จโดยไม่ส่งซ้ำ", async () => {
    await linkOwner();
    setup(() => {
      throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    });
    await notifier.notifyNewItemMatches("lost", lostWallet);
    const saved = () => [...repo._state.deliveries.values()][0];
    assert.equal(saved().status, "retry");
    assert.equal(saved().last_error_code, "timeout");

    clock = new Date(clock.getTime() + 2 * 60_000);
    setup(() => json(409, { message: "The retry key is already accepted" }, { "x-line-accepted-request-id": "req-first" }));
    assert.deepEqual(await delivery.processDueDeliveries(), ["sent"]);
    assert.equal(saved().status, "sent");
    assert.equal(saved().line_request_id, "req-first");
  });

  test("LINE ตอบ 400 (คำขอผิด) → failed ไม่ลองใหม่", async () => {
    await linkOwner();
    setup(() => json(400, { message: "The request body has 1 error(s)", details: [{ property: "messages[0].text", message: "May not be empty" }] }));
    await notifier.notifyNewItemMatches("lost", lostWallet);
    const saved = [...repo._state.deliveries.values()][0];
    assert.equal(saved.status, "failed");
    assert.equal(saved.last_error_code, "http_400");
    assert.match(saved.last_error_message, /messages\[0\]\.text: May not be empty/);
  });

  test("ลองใหม่ครบจำนวนครั้ง → failed", async () => {
    await linkOwner();
    setup(() => json(503, {}));
    await notifier.notifyNewItemMatches("lost", lostWallet);
    for (let i = 0; i < 10; i += 1) {
      clock = new Date(clock.getTime() + 4 * 60 * 60_000);
      if (clock.getTime() - new Date("2026-10-14T10:00:00Z").getTime() >= RETRY_WINDOW_MS) break;
      await delivery.processDueDeliveries();
    }
    const saved = [...repo._state.deliveries.values()][0];
    assert.equal(saved.status, "failed");
    assert.equal(pushes().length, 6);
  });

  test("ระหว่างรอลองใหม่ ผู้ใช้ยกเลิกการเชื่อม → ไม่ส่ง", async () => {
    await linkOwner();
    setup(() => json(500, {}));
    await notifier.notifyNewItemMatches("lost", lostWallet);
    await repo.unlinkByStudent(OWNER);
    clock = new Date(clock.getTime() + 2 * 60_000);
    setup(() => json(200, {}));
    assert.deepEqual(await delivery.processDueDeliveries(), ["failed"]);
    assert.equal(pushes().length, 0);
    assert.equal([...repo._state.deliveries.values()][0].last_error_code, "recipient_inactive");
  });

  test("LINE ล่มไม่ทำให้การแจ้งเตือนในเว็บหรือการสร้างโพสต์ล้มเหลว", async () => {
    await linkOwner();
    setup(() => {
      throw new TypeError("fetch failed");
    });
    const result = await notifier.notifyNewItemMatches("lost", lostWallet);
    assert.equal(result.notified, 1);
    assert.equal(notified.length, 1);
    assert.equal([...repo._state.deliveries.values()][0].last_error_code, "network_error");
  });
});
