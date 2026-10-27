// Webhook: ลายเซ็น, follow/unfollow, คำสั่งในแชต และกัน event ซ้ำ
const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { computeSignature, verifySignature } = require("../services/line/signature");
const { createWebhookHandler } = require("../services/line/webhook");
const { createAccountLinking } = require("../services/line/accountLinking");
const client = require("../services/line/lineClient");
const { getLineConfig } = require("../services/line/config");
const { createMemoryRepo } = require("./helpers/memoryRepo");
const { mockLineApi, json } = require("./helpers/lineApiMock");

const SECRET = "test-channel-secret";
const silent = { info() {}, warn() {}, error() {} };

describe("X-Line-Signature", () => {
  const body = Buffer.from(JSON.stringify({ destination: "U0", events: [] }));

  test("ลายเซ็นที่ถูกต้องผ่านการตรวจ", () => {
    assert.equal(verifySignature(body, computeSignature(body, SECRET), SECRET), true);
  });

  test("ลายเซ็นผิด / secret ผิด / body ถูกแก้ / ไม่มีลายเซ็น ไม่ผ่าน", () => {
    const signature = computeSignature(body, SECRET);
    assert.equal(verifySignature(body, computeSignature(body, "other-secret"), SECRET), false);
    assert.equal(verifySignature(Buffer.from(`${body} `), signature, SECRET), false);
    assert.equal(verifySignature(body, "", SECRET), false);
    assert.equal(verifySignature(body, undefined, SECRET), false);
    assert.equal(verifySignature(body, signature, ""), false);
  });
});

describe("POST /api/line/webhook", () => {
  let server;
  let baseUrl;
  let repo;
  let api;
  let scheduled;
  let menuSwitches;

  const post = (payload, { signature, rawBody } = {}) => {
    const body = rawBody ?? JSON.stringify(payload);
    return fetch(`${baseUrl}/api/line/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(signature !== null ? { "x-line-signature": signature ?? computeSignature(Buffer.from(body), SECRET) } : {}),
      },
      body,
    });
  };
  const flush = async () => {
    while (scheduled.length) await scheduled.shift()();
  };
  const replies = () => api.requests.filter((r) => r.url.endsWith("/message/reply"));
  const event = (type, extra = {}) => ({
    type,
    webhookEventId: `01H${Math.random().toString(36).slice(2, 12)}`,
    deliveryContext: { isRedelivery: false },
    timestamp: Date.now(),
    source: { type: "user", userId: "Uline-user-1" },
    replyToken: `reply-${type}`,
    mode: "active",
    ...extra,
  });

  beforeEach(async () => {
    process.env.LINE_CHANNEL_SECRET = SECRET;
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
    process.env.APP_BASE_URL = "https://lostfound.example.test";
    repo = createMemoryRepo();
    scheduled = [];
    menuSwitches = [];
    const linking = createAccountLinking({ repo, ttlMinutes: () => 15 });
    const webhook = createWebhookHandler({
      repo,
      client,
      linking,
      getConfig: getLineConfig,
      richMenus: { apply: async (lineUserId, linked) => menuSwitches.push([lineUserId, linked]) },
      schedule: (fn) => scheduled.push(fn),
      logger: silent,
    });
    api = mockLineApi((req) => {
      if (req.url.includes("/profile/")) return json(200, { displayName: "สมชาย" });
      return json(200, {});
    });

    const app = express();
    app.post("/api/line/webhook", express.raw({ type: "*/*" }), webhook.handler);
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(async () => {
    api.restore();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  test("ลายเซ็นไม่ถูกต้อง → 401 และไม่ประมวลผล event", async () => {
    const res = await post({ events: [event("follow")] }, { signature: "invalid-signature" });
    assert.equal(res.status, 401);
    assert.equal(scheduled.length, 0);
    assert.equal(repo._state.accounts.size, 0);
  });

  test("ไม่มี header ลายเซ็น → 401", async () => {
    const res = await post({ events: [event("follow")] }, { signature: null });
    assert.equal(res.status, 401);
  });

  test("ยังไม่ได้ตั้ง LINE_CHANNEL_SECRET → 503 (ไม่รับ webhook ที่ตรวจสอบไม่ได้)", async () => {
    delete process.env.LINE_CHANNEL_SECRET;
    const res = await post({ events: [] });
    assert.equal(res.status, 503);
  });

  test("ปุ่ม Verify ของ LINE (events ว่าง) → 200", async () => {
    const res = await post({ destination: "U0", events: [] });
    assert.equal(res.status, 200);
    assert.equal(scheduled.length, 0);
  });

  test("follow: ตอบ 200 ก่อน แล้วบันทึกบัญชีและส่งข้อความต้อนรับพร้อมปุ่มเชื่อมบัญชี", async () => {
    const res = await post({ events: [event("follow")] });
    assert.equal(res.status, 200);
    assert.equal(repo._state.accounts.size, 0, "ยังไม่ประมวลผลก่อนตอบกลับ");

    await flush();
    const account = repo._state.accounts.get("Uline-user-1");
    assert.equal(account.is_following, true);
    assert.equal(account.student_id, null);
    assert.equal(account.display_name, "สมชาย");
    assert.equal(repo._state.tokens.size, 1);

    const [reply] = replies();
    assert.equal(reply.body.replyToken, "reply-follow");
    assert.equal(reply.headers.authorization, "Bearer test-access-token");
    const button = reply.body.messages.find((m) => m.type === "template");
    const uri = button.template.actions[0].uri;
    assert.match(uri, /^https:\/\/lostfound\.example\.test\/line\/link\?token=[A-Za-z0-9_-]{43}$/);
    // รหัสจริงไม่ได้ถูกเก็บในฐานข้อมูล (เก็บเฉพาะ hash)
    const token = new URL(uri).searchParams.get("token");
    assert.equal(repo._state.tokens.has(token), false);
  });

  test("follow ของผู้ที่เชื่อมบัญชีแล้ว → ข้อความต้อนรับกลับ ไม่ออกรหัสใหม่", async () => {
    await repo.upsertFollow({ lineUserId: "Uline-user-1" });
    repo._state.accounts.get("Uline-user-1").student_id = "6510000001";
    await post({ events: [event("follow")] });
    await flush();
    assert.equal(repo._state.tokens.size, 0);
    assert.match(replies()[0].body.messages[0].text, /เชื่อมกับบัญชีเว็บแอปแล้ว/);
  });

  test("unfollow: ปิดสถานะการเป็นเพื่อน คงการเชื่อมบัญชีไว้ และยกเลิกรหัสที่ยังไม่ได้ใช้", async () => {
    await post({ events: [event("follow")] });
    await flush();
    repo._state.accounts.get("Uline-user-1").student_id = "6510000001";

    await post({ events: [event("unfollow", { replyToken: undefined })] });
    await flush();
    const account = repo._state.accounts.get("Uline-user-1");
    assert.equal(account.is_following, false);
    assert.ok(account.unfollowed_at);
    assert.equal(account.student_id, "6510000001");
    assert.equal(repo._state.tokens.size, 0);
  });

  test("event ที่ LINE ส่งซ้ำ (webhookEventId เดิม) ประมวลผลครั้งเดียว", async () => {
    const follow = event("follow");
    await post({ events: [follow] });
    await post({ events: [{ ...follow, deliveryContext: { isRedelivery: true } }] });
    await flush();
    assert.equal(replies().length, 1);
  });

  test("พิมพ์ \"เชื่อมบัญชี\" → ได้ลิงก์ใหม่ / \"ยกเลิกการเชื่อม\" → ยกเลิกการเชื่อม", async () => {
    await post({ events: [event("message", { message: { type: "text", id: "1", text: "เชื่อมบัญชี" } })] });
    await flush();
    assert.equal(replies()[0].body.messages[0].type, "template");

    repo._state.accounts.get("Uline-user-1").student_id = "6510000001";
    await post({ events: [event("message", { message: { type: "text", id: "2", text: "ยกเลิกการเชื่อม" } })] });
    await flush();
    assert.equal(repo._state.accounts.get("Uline-user-1").student_id, null);
    assert.match(replies()[1].body.messages[0].text, /ยกเลิกการเชื่อมบัญชีแล้ว/);
    assert.deepEqual(menuSwitches, [["Uline-user-1", false]], "ยกเลิกแล้วกลับเป็นเมนูปุ่ม \"เชื่อมบัญชี\"");
  });

  test("follow / พิมพ์ \"เชื่อมบัญชี\" ของผู้ที่เชื่อมแล้ว → สลับเป็นเมนูปุ่ม \"ยกเลิกการเชื่อม\"", async () => {
    await repo.upsertFollow({ lineUserId: "Uline-user-1" });
    repo._state.accounts.get("Uline-user-1").student_id = "6510000001";
    await post({ events: [event("follow")] });
    await post({ events: [event("message", { message: { type: "text", id: "5", text: "เชื่อมบัญชี" } })] });
    await flush();
    assert.deepEqual(menuSwitches, [
      ["Uline-user-1", true],
      ["Uline-user-1", true],
    ]);
    assert.match(replies()[1].body.messages[0].text, /เชื่อมกับบัญชีเว็บแอปแล้ว/);
  });

  test("ปุ่ม \"ยกเลิกการเชื่อม\" ในเมนู → ถามยืนยันก่อน / ไม่ยกเลิก → คงการเชื่อม / ยืนยัน → ยกเลิกและสลับเมนู", async () => {
    await repo.upsertFollow({ lineUserId: "Uline-user-1" });
    repo._state.accounts.get("Uline-user-1").student_id = "6510000001";
    const postback = (data) => event("postback", { postback: { data } });

    await post({ events: [postback("action=unlink_prompt")] });
    await flush();
    const confirm = replies()[0].body.messages[0];
    assert.equal(confirm.template.type, "confirm");
    assert.deepEqual(
      confirm.template.actions.map((a) => a.data),
      ["action=unlink", "action=unlink_cancel"]
    );
    assert.equal(repo._state.accounts.get("Uline-user-1").student_id, "6510000001", "ยังไม่ยกเลิกจนกว่าจะยืนยัน");

    await post({ events: [postback("action=unlink_cancel")] });
    await flush();
    assert.equal(repo._state.accounts.get("Uline-user-1").student_id, "6510000001");
    assert.match(replies()[1].body.messages[0].text, /ยังเชื่อมบัญชีอยู่/);

    await post({ events: [postback("action=unlink")] });
    await flush();
    assert.equal(repo._state.accounts.get("Uline-user-1").student_id, null);
    assert.match(replies()[2].body.messages[0].text, /ยกเลิกการเชื่อมบัญชีแล้ว/);
    assert.deepEqual(menuSwitches, [["Uline-user-1", false]]);
  });

  test("กดปุ่ม \"ยกเลิกการเชื่อม\" ทั้งที่ยังไม่ได้เชื่อม (เมนูค้าง) → แจ้งว่ายังไม่เชื่อม และคืนเมนูเริ่มต้น", async () => {
    await repo.upsertFollow({ lineUserId: "Uline-user-1" });
    await post({ events: [event("postback", { postback: { data: "action=unlink_prompt" } })] });
    await flush();
    assert.match(replies()[0].body.messages[0].text, /ยังไม่ได้เชื่อม/);
    assert.deepEqual(menuSwitches, [["Uline-user-1", false]]);
  });

  test("ข้อความอื่นได้คำแนะนำการใช้งาน และ event จากกลุ่มถูกข้าม", async () => {
    await post({
      events: [
        event("message", { message: { type: "text", id: "3", text: "สวัสดี" } }),
        event("message", { source: { type: "group", groupId: "G1", userId: "U2" }, message: { type: "text", id: "4", text: "เชื่อมบัญชี" } }),
      ],
    });
    await flush();
    assert.equal(replies().length, 1);
    assert.match(replies()[0].body.messages[0].text, /คำสั่งที่ใช้ได้/);
  });

  test("ตอบกลับไม่สำเร็จ (reply token หมดอายุ) ไม่ทำให้การบันทึกล้มเหลว", async () => {
    api.restore();
    const linking = createAccountLinking({ repo, ttlMinutes: () => 15 });
    const { processEvents } = createWebhookHandler({ repo, client, linking, getConfig: getLineConfig, logger: silent });
    const mock = mockLineApi((req) => (req.url.endsWith("/message/reply") ? json(400, { message: "Invalid reply token" }) : json(200, {})));
    try {
      await processEvents([event("follow")]);
    } finally {
      mock.restore();
    }
    assert.equal(repo._state.accounts.get("Uline-user-1").is_following, true);
  });
});
