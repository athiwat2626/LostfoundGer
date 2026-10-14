// การเชื่อมบัญชี: รหัสใช้ครั้งเดียว, หมดอายุ, กันเชื่อมซ้ำหลายบัญชี, ยกเลิกและเชื่อมใหม่ + การตรวจสิทธิ์ของ API
const { test, describe, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const express = require("express");
const { createAccountLinking, LinkError } = require("../services/line/accountLinking");
const { createLineController } = require("../controller/lineController");
const { userAuth } = require("../middleware/userAuth");
const { createMemoryRepo } = require("./helpers/memoryRepo");

process.env.JWT_SECRET = "test-jwt-secret";
const silent = { info() {}, warn() {}, error() {} };

describe("accountLinking", () => {
  let clock;
  let repo;
  let linking;

  beforeEach(async () => {
    clock = new Date("2026-10-14T10:00:00Z");
    repo = createMemoryRepo({ now: () => clock });
    linking = createAccountLinking({ repo, ttlMinutes: () => 15, now: () => clock });
    await repo.upsertFollow({ lineUserId: "U-a", displayName: "A" });
    await repo.upsertFollow({ lineUserId: "U-b", displayName: "B" });
  });

  const expectLinkError = async (promise, code) => {
    await assert.rejects(promise, (error) => error instanceof LinkError && error.code === code);
  };

  test("ยืนยันด้วยรหัสที่ถูกต้อง → เชื่อมบัญชีและเปิดรับแจ้งเตือน", async () => {
    const { token, expiresAt } = await linking.issueLinkToken("U-a");
    assert.equal(expiresAt.getTime() - clock.getTime(), 15 * 60_000);

    const preview = await linking.previewLink(token);
    assert.equal(preview.display_name, "A");

    const { account, alreadyLinked } = await linking.confirmLink(token, "6510000001");
    assert.equal(alreadyLinked, false);
    assert.equal(account.student_id, "6510000001");
    assert.equal(account.notify_enabled, true);
    assert.ok(account.linked_at);
  });

  test("ดูตัวอย่าง (preview) ไม่ใช้รหัส", async () => {
    const { token } = await linking.issueLinkToken("U-a");
    await linking.previewLink(token);
    await linking.previewLink(token);
    await linking.confirmLink(token, "6510000001");
  });

  test("รหัสใช้ได้ครั้งเดียว", async () => {
    const { token } = await linking.issueLinkToken("U-a");
    await linking.confirmLink(token, "6510000001");
    await expectLinkError(linking.confirmLink(token, "6510000001"), "used");
    await expectLinkError(linking.previewLink(token), "used");
  });

  test("รหัสหมดอายุหลังครบเวลา", async () => {
    const { token } = await linking.issueLinkToken("U-a");
    clock = new Date(clock.getTime() + 15 * 60_000);
    await expectLinkError(linking.previewLink(token), "expired");
    await expectLinkError(linking.confirmLink(token, "6510000001"), "expired");
    assert.equal((await repo.findAccountByLineUser("U-a")).student_id, null);
  });

  test("รหัสผิดรูปแบบหรือไม่มีในระบบ → invalid", async () => {
    await expectLinkError(linking.confirmLink("short", "6510000001"), "invalid");
    await expectLinkError(linking.confirmLink(undefined, "6510000001"), "invalid");
    await expectLinkError(linking.confirmLink("A".repeat(43), "6510000001"), "invalid");
  });

  test("ขอรหัสใหม่ → รหัสเก่าใช้ไม่ได้", async () => {
    const first = await linking.issueLinkToken("U-a");
    const second = await linking.issueLinkToken("U-a");
    await expectLinkError(linking.confirmLink(first.token, "6510000001"), "invalid");
    await linking.confirmLink(second.token, "6510000001");
  });

  test("LINE ที่เชื่อมกับบัญชีอื่นแล้ว ไม่ถูกย้ายไปบัญชีใหม่โดยอัตโนมัติ", async () => {
    await linking.confirmLink((await linking.issueLinkToken("U-a")).token, "6510000001");
    const { token } = await linking.issueLinkToken("U-a");
    await expectLinkError(linking.confirmLink(token, "6510000002"), "line_linked_other");
    assert.equal((await repo.findAccountByLineUser("U-a")).student_id, "6510000001");
  });

  test("บัญชีที่เชื่อม LINE หนึ่งแล้ว เชื่อม LINE อื่นซ้ำไม่ได้", async () => {
    await linking.confirmLink((await linking.issueLinkToken("U-a")).token, "6510000001");
    const { token } = await linking.issueLinkToken("U-b");
    await expectLinkError(linking.confirmLink(token, "6510000001"), "student_linked_other");
  });

  test("ยกเลิกการเชื่อมแล้วเชื่อมใหม่ได้ / เชื่อมซ้ำกับบัญชีเดิมได้", async () => {
    await linking.confirmLink((await linking.issueLinkToken("U-a")).token, "6510000001");
    const again = await linking.confirmLink((await linking.issueLinkToken("U-a")).token, "6510000001");
    assert.equal(again.alreadyLinked, true);

    await repo.unlinkByStudent("6510000001");
    const relinked = await linking.confirmLink((await linking.issueLinkToken("U-b")).token, "6510000001");
    assert.equal(relinked.account.line_user_id, "U-b");
  });

  test("ผู้ใช้ที่ยกเลิกการเป็นเพื่อนแล้วใช้ลิงก์ไม่ได้", async () => {
    const { token } = await linking.issueLinkToken("U-a");
    // จำลองกรณีรหัสยังอยู่แต่ผู้ใช้บล็อกบอท
    repo._state.accounts.get("U-a").is_following = false;
    await expectLinkError(linking.confirmLink(token, "6510000001"), "not_following");
  });
});

describe("/api/line API (ต้องเข้าสู่ระบบ)", () => {
  let server;
  let baseUrl;
  let repo;
  let linking;

  const tokenFor = (studentId) => jwt.sign({ role: "user", student_id: studentId, email: `${studentId}@ku.th` }, process.env.JWT_SECRET);
  const call = (method, path, { auth, body } = {}) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });

  beforeEach(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    repo = createMemoryRepo();
    linking = createAccountLinking({ repo, ttlMinutes: () => 15 });
    const controller = createLineController({
      repo,
      linking,
      getConfig: () => ({ channelAccessToken: "x", channelSecret: "y", addFriendUrl: "https://line.me/R/ti/p/%40kulf" }),
      logger: silent,
    });
    const app = express();
    app.use(express.json());
    app.use("/api/line", userAuth);
    app.get("/api/line/status", controller.getStatus);
    app.post("/api/line/link", controller.confirmLink);
    app.delete("/api/line/link", controller.unlink);
    app.patch("/api/line/preferences", controller.updatePreferences);
    app.get("/api/line/notifications", controller.listMyDeliveries);
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    await repo.upsertFollow({ lineUserId: "U-a", displayName: "A" });
  });

  test("ไม่มี token / token ปลอม → 401", async () => {
    assert.equal((await call("GET", "/api/line/status")).status, 401);
    assert.equal((await call("GET", "/api/line/status", { auth: "forged.token.value" })).status, 401);
    const { token } = await linking.issueLinkToken("U-a");
    assert.equal((await call("POST", "/api/line/link", { body: { token } })).status, 401);
    assert.equal((await repo.findAccountByLineUser("U-a")).student_id, null);
  });

  test("เชื่อมบัญชีใช้ student_id จาก JWT เท่านั้น (ไม่รับจาก body)", async () => {
    const { token } = await linking.issueLinkToken("U-a");
    const res = await call("POST", "/api/line/link", {
      auth: tokenFor("6510000001"),
      body: { token, student_id: "6519999999" },
    });
    assert.equal(res.status, 200);
    assert.equal((await repo.findAccountByLineUser("U-a")).student_id, "6510000001");

    const status = await (await call("GET", "/api/line/status", { auth: tokenFor("6510000001") })).json();
    assert.equal(status.linked, true);
    assert.equal(status.line.display_name, "A");
    assert.equal(status.add_friend_url, "https://line.me/R/ti/p/%40kulf");

    const other = await (await call("GET", "/api/line/status", { auth: tokenFor("6510000002") })).json();
    assert.equal(other.linked, false);
    assert.equal(other.line, null);
  });

  test("รหัสหมดอายุ/ใช้แล้ว ได้ข้อความภาษาไทยและ code ที่ชัดเจน", async () => {
    const { token } = await linking.issueLinkToken("U-a");
    await call("POST", "/api/line/link", { auth: tokenFor("6510000001"), body: { token } });
    const res = await call("POST", "/api/line/link", { auth: tokenFor("6510000001"), body: { token } });
    assert.equal(res.status, 410);
    assert.equal((await res.json()).code, "used");
  });

  test("ปิดการแจ้งเตือน / ยกเลิกการเชื่อม ทำได้เฉพาะบัญชีตัวเอง", async () => {
    const { token } = await linking.issueLinkToken("U-a");
    await call("POST", "/api/line/link", { auth: tokenFor("6510000001"), body: { token } });

    assert.equal((await call("PATCH", "/api/line/preferences", { auth: tokenFor("6510000001"), body: { notify_enabled: "no" } })).status, 400);
    const off = await call("PATCH", "/api/line/preferences", { auth: tokenFor("6510000001"), body: { notify_enabled: false } });
    assert.equal((await off.json()).line.notify_enabled, false);

    // ผู้ใช้อื่นยกเลิกการเชื่อมของคนอื่นไม่ได้
    assert.equal((await call("DELETE", "/api/line/link", { auth: tokenFor("6510000002") })).status, 404);
    assert.equal((await repo.findAccountByLineUser("U-a")).student_id, "6510000001");

    assert.equal((await call("DELETE", "/api/line/link", { auth: tokenFor("6510000001") })).status, 200);
    assert.equal((await repo.findAccountByLineUser("U-a")).student_id, null);
  });

  test("GET /api/line/info เปิดได้โดยไม่ต้องเข้าสู่ระบบ และไม่มีข้อมูลลับ", async () => {
    const controller = createLineController({
      repo,
      linking,
      getConfig: () => ({ channelAccessToken: "secret-token", channelSecret: "secret", basicId: "@158wqahr", addFriendUrl: "https://line.me/R/ti/p/%40158wqahr", addFriendQrUrl: "https://qr-official.line.me/sid/L/158wqahr.png" }),
      getBotInfo: async () => ({ displayName: "KULostFound", pictureUrl: null }),
      logger: silent,
    });
    const res = { status: () => res, json: (body) => Object.assign(res, { body }) };
    await controller.getPublicInfo({}, res);
    assert.equal(res.body.display_name, "KULostFound");
    assert.equal(res.body.qr_url, "https://qr-official.line.me/sid/L/158wqahr.png");
    assert.doesNotMatch(JSON.stringify(res.body), /secret/);
  });

  test("ประวัติการแจ้งเตือน LINE แสดงเฉพาะของผู้ใช้คนนั้น", async () => {
    await repo.createDelivery({ studentId: "6510000001", lineUserId: "U-a", notificationType: "match", itemType: "lost", itemId: 1, title: "a", payload: [], retryKey: "k1" });
    await repo.createDelivery({ studentId: "6510000002", lineUserId: "U-b", notificationType: "match", itemType: "lost", itemId: 2, title: "b", payload: [], retryKey: "k2" });
    const body = await (await call("GET", "/api/line/notifications", { auth: tokenFor("6510000001") })).json();
    assert.deepEqual(body.deliveries.map((d) => d.title), ["a"]);
  });

  after(() => {
    server.closeAllConnections();
    server.close();
  });
});
