// Rich Menu: โครงเมนู 6 ช่อง (2 แบบตามสถานะการเชื่อม), ตรวจภาพ, สร้างใหม่ / ใช้ของเดิม / อัปเดตแล้วลบเวอร์ชันเก่า
// และการสลับเมนูรายคน (ผ่าน LINE API จำลอง)
const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const client = require("../services/line/lineClient");
const {
  buildRichMenu,
  deployRichMenu,
  createRichMenuSwitcher,
  readImageInfo,
  validateImage,
  NAME_PREFIX,
  LINKED_NAME_PREFIX,
  MENU_ITEMS,
} = require("../services/line/richMenu");
const { mockLineApi, json } = require("./helpers/lineApiMock");

const silent = { info() {}, warn() {}, error() {} };
const BASE = "https://lostfound.example.test";
const IMAGE = fs.readFileSync(path.join(__dirname, "..", "assets", "line", "richmenu.png"));
const LINKED_IMAGE = fs.readFileSync(path.join(__dirname, "..", "assets", "line", "richmenu-linked.png"));

describe("โครง Rich Menu", () => {
  const PAGE_AREAS = [
    ["แจ้งของหาย", `${BASE}/lostItem`],
    ["ค้นหาของ", `${BASE}/home`],
    ["รายการของฉัน", `${BASE}/my-posts`],
    ["แจ้งพบของ", `${BASE}/foundItem`],
    ["บัญชีของฉัน", `${BASE}/profile`],
  ];
  const pageAreas = (menu) => menu.areas.filter((a) => a.action.type === "uri").map((a) => [a.action.label, a.action.uri]);

  test("6 ช่อง 2 แถว × 3 คอลัมน์ ครอบเต็มภาพ 2500×1686 ไม่ซ้อนกัน และเปิด URL จาก APP_BASE_URL", () => {
    for (const linked of [false, true]) {
      const menu = buildRichMenu(`${BASE}/`, { linked });
      assert.deepEqual(menu.size, { width: 2500, height: 1686 });
      assert.equal(menu.areas.length, 6);
      const area = menu.areas.reduce((sum, a) => sum + a.bounds.width * a.bounds.height, 0);
      assert.equal(area, 2500 * 1686);
      assert.deepEqual(pageAreas(menu), PAGE_AREAS);
      menu.areas.forEach((a) => assert.ok(a.action.label.length <= 20));
      assert.ok(menu.chatBarText.length <= 14);
    }
  });

  test("ช่องแถว 2 ตรงกลาง: ยังไม่เชื่อม → ส่ง \"เชื่อมบัญชี\" / เชื่อมแล้ว → postback ถามยืนยันยกเลิก", () => {
    const slot = (menu) => menu.areas.find((a) => a.bounds.x === 833 && a.bounds.y === 843).action;
    assert.deepEqual(slot(buildRichMenu(BASE)), { type: "message", label: "เชื่อมบัญชี", text: "เชื่อมบัญชี" });
    const unlink = slot(buildRichMenu(BASE, { linked: true }));
    assert.equal(unlink.type, "postback");
    assert.equal(unlink.data, "action=unlink_prompt");
    assert.equal(buildRichMenu(BASE).name, NAME_PREFIX);
    assert.equal(buildRichMenu(BASE, { linked: true }).name, LINKED_NAME_PREFIX);
  });

  test("ไม่มี APP_BASE_URL หรือ URL ไม่ถูกต้อง → แจ้งข้อผิดพลาด ไม่เดา URL", () => {
    assert.throws(() => buildRichMenu(""), /APP_BASE_URL is not set/);
    assert.throws(() => buildRichMenu("lostfound"), /not a valid URL/);
    assert.throws(() => buildRichMenu("ftp://x.test"), /https/);
  });

  test("path ในเมนูมีอยู่จริงใน frontend/src/App.jsx", () => {
    const app = fs.readFileSync(path.join(__dirname, "..", "..", "frontend", "src", "App.jsx"), "utf8");
    MENU_ITEMS.forEach((item) => assert.ok(app.includes(`path="${item.path}"`), item.path));
  });

  test("ภาพเมนูที่เตรียมไว้ถูกขนาดและไม่เกิน 1 MB / ภาพผิดขนาดถูกปฏิเสธ", () => {
    assert.deepEqual(readImageInfo(IMAGE), { type: "image/png", width: 2500, height: 1686 });
    validateImage(IMAGE);
    validateImage(LINKED_IMAGE);
    const wrong = Buffer.from(IMAGE);
    wrong.writeUInt32BE(1000, 16);
    assert.throws(() => validateImage(wrong), /2500x1686/);
    assert.throws(() => validateImage(Buffer.from("not an image")), /PNG or JPEG/);
  });
});

describe("deployRichMenu", () => {
  let api;
  let menus;
  let defaultId;
  let images;
  let nextId;
  let userMenus;

  beforeEach(() => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
    userMenus = new Map();
    menus = [];
    defaultId = null;
    images = new Set();
    nextId = 1;
    api = mockLineApi((req) => {
      const { url, method } = req;
      if (url.endsWith("/richmenu/validate")) return json(200, {});
      if (url.endsWith("/richmenu/list")) return json(200, { richmenus: menus.map((m) => ({ ...m })) });
      if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
        const richMenuId = `richmenu-${nextId++}`;
        menus.push({ richMenuId, ...req.body });
        return json(200, { richMenuId });
      }
      const content = /richmenu\/([^/]+)\/content$/.exec(url);
      if (content && method === "POST") {
        images.add(content[1]);
        return json(200, {});
      }
      if (content) return images.has(content[1]) ? new Response("png", { status: 200, headers: { "content-type": "image/png" } }) : json(404, { message: "Not found" });
      if (url.endsWith("/richmenu/bulk/link")) {
        req.body.userIds.forEach((userId) => userMenus.set(userId, req.body.richMenuId));
        return json(202, {});
      }
      if (url.endsWith("/user/all/richmenu")) return defaultId ? json(200, { richMenuId: defaultId }) : json(404, { message: "no default" });
      const setDefault = /user\/all\/richmenu\/([^/]+)$/.exec(url);
      if (setDefault) {
        defaultId = setDefault[1];
        return json(200, {});
      }
      const del = /richmenu\/([^/]+)$/.exec(url);
      if (del && method === "DELETE") {
        menus = menus.filter((m) => m.richMenuId !== del[1]);
        return json(200, {});
      }
      return json(404, { message: `unexpected ${method} ${url}` });
    });
  });

  afterEach(() => api.restore());

  test("ครั้งแรก: สร้างเมนู อัปโหลดภาพ และตั้งเป็นเมนูเริ่มต้น", async () => {
    const result = await deployRichMenu({ client, appBaseUrl: BASE, image: IMAGE, logger: silent });
    assert.equal(result.created, true);
    assert.equal(result.imageUploaded, true);
    assert.equal(result.defaultChanged, true);
    assert.equal(defaultId, result.richMenuId);
    assert.ok(result.name.startsWith(NAME_PREFIX));
    const upload = api.requests.find((r) => r.url.includes("api-data.line.me") && r.method === "POST");
    assert.equal(upload.headers["content-type"], "image/png");
    assert.equal(upload.headers.authorization, "Bearer test-access-token");
  });

  test("รันซ้ำโดยไม่มีการเปลี่ยนแปลง: ไม่สร้างเมนูซ้ำ ไม่อัปโหลดซ้ำ", async () => {
    const first = await deployRichMenu({ client, appBaseUrl: BASE, image: IMAGE, logger: silent });
    const before = api.requests.length;
    const second = await deployRichMenu({ client, appBaseUrl: BASE, image: IMAGE, logger: silent });
    assert.equal(second.richMenuId, first.richMenuId);
    assert.equal(second.created, false);
    assert.equal(second.imageUploaded, false);
    assert.equal(second.defaultChanged, false);
    assert.equal(menus.length, 1);
    assert.ok(api.requests.slice(before).every((r) => !(r.method === "POST" && r.url.endsWith("/v2/bot/richmenu"))));
  });

  test("เมนูเดิมที่ภาพยังไม่ถูกอัปโหลด (รอบก่อนล้มเหลว) → อัปโหลดภาพให้", async () => {
    const first = await deployRichMenu({ client, appBaseUrl: BASE, image: IMAGE, logger: silent });
    images.clear();
    const second = await deployRichMenu({ client, appBaseUrl: BASE, image: IMAGE, logger: silent });
    assert.equal(second.richMenuId, first.richMenuId);
    assert.equal(second.imageUploaded, true);
  });

  test("อัปเดต URL: สร้างเวอร์ชันใหม่ ตั้งเป็นค่าเริ่มต้น และลบเฉพาะเวอร์ชันเก่าของระบบนี้", async () => {
    menus.push({ richMenuId: "manual-menu", name: "เมนูที่สร้างจาก OA Manager" });
    const first = await deployRichMenu({ client, appBaseUrl: BASE, image: IMAGE, logger: silent });
    const second = await deployRichMenu({ client, appBaseUrl: "https://new.example.test", image: IMAGE, logger: silent });
    assert.notEqual(second.richMenuId, first.richMenuId);
    assert.equal(defaultId, second.richMenuId);
    assert.deepEqual(second.deleted, [first.richMenuId]);
    assert.deepEqual(menus.map((m) => m.richMenuId).sort(), ["manual-menu", second.richMenuId].sort());
  });

  test("อัปโหลดภาพไม่สำเร็จ → ลบเมนูที่เพิ่งสร้าง ไม่ทิ้ง resource ค้าง", async () => {
    api.restore();
    api = mockLineApi((req) => {
      if (req.url.endsWith("/richmenu/list")) return json(200, { richmenus: [] });
      if (req.url.endsWith("/richmenu/validate")) return json(200, {});
      if (req.url.endsWith("/v2/bot/richmenu")) return json(200, { richMenuId: "richmenu-x" });
      if (req.url.includes("/content")) return json(500, { message: "upload failed" });
      if (req.method === "DELETE") return json(200, {});
      return json(404, {});
    });
    await assert.rejects(deployRichMenu({ client, appBaseUrl: BASE, image: IMAGE, logger: silent }), /500/);
    assert.ok(api.requests.some((r) => r.method === "DELETE" && r.url.endsWith("/richmenu/richmenu-x")));
  });

  test("deploy ทั้ง 2 แบบ: เมนูเริ่มต้นเป็นแบบยังไม่เชื่อม และผูกเมนูแบบเชื่อมแล้วให้ผู้ที่เชื่อมแล้ว", async () => {
    const userIds = Array.from({ length: 501 }, (_, i) => `U${i}`);
    const result = await deployRichMenu({ client, appBaseUrl: BASE, image: IMAGE, linkedImage: LINKED_IMAGE, linkedUserIds: userIds, logger: silent });
    assert.equal(defaultId, result.richMenuId);
    assert.ok(result.linked.name.startsWith(LINKED_NAME_PREFIX));
    assert.notEqual(result.linked.richMenuId, result.richMenuId);
    assert.equal(result.linked.usersLinked, 501);
    // ส่งเป็นชุดละไม่เกิน 500 คน
    assert.equal(api.requests.filter((r) => r.url.endsWith("/richmenu/bulk/link")).length, 2);
    assert.ok(userIds.every((id) => userMenus.get(id) === result.linked.richMenuId));
  });

  test("deploy ทั้ง 2 แบบซ้ำหลังเปลี่ยน URL: ลบเวอร์ชันเก่าของทั้งสองแบบ ผู้ที่เชื่อมแล้วย้ายไปเมนูใหม่", async () => {
    const options = { client, image: IMAGE, linkedImage: LINKED_IMAGE, linkedUserIds: ["U1"], logger: silent };
    const first = await deployRichMenu({ ...options, appBaseUrl: BASE });
    const second = await deployRichMenu({ ...options, appBaseUrl: "https://new.example.test" });
    assert.deepEqual(second.deleted.sort(), [first.richMenuId, first.linked.richMenuId].sort());
    assert.deepEqual(menus.map((m) => m.richMenuId).sort(), [second.richMenuId, second.linked.richMenuId].sort());
    assert.equal(userMenus.get("U1"), second.linked.richMenuId);
  });
});

describe("สลับเมนูรายคน (createRichMenuSwitcher)", () => {
  let api;
  let menus;
  let userMenus;
  let configured;

  const switcher = () => createRichMenuSwitcher({ client, isConfigured: () => configured, logger: silent });

  beforeEach(() => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
    configured = true;
    menus = [
      { richMenuId: "main-1", name: `${NAME_PREFIX}aaa` },
      { richMenuId: "linked-1", name: `${LINKED_NAME_PREFIX}bbb` },
    ];
    userMenus = new Map();
    api = mockLineApi(({ url, method }) => {
      if (url.endsWith("/richmenu/list")) return json(200, { richmenus: menus });
      const link = /user\/([^/]+)\/richmenu\/([^/]+)$/.exec(url);
      if (link && method === "POST") {
        if (!menus.some((m) => m.richMenuId === link[2])) return json(404, { message: "Not found" });
        userMenus.set(link[1], link[2]);
        return json(200, {});
      }
      const unlink = /user\/([^/]+)\/richmenu$/.exec(url);
      if (unlink && method === "DELETE") {
        userMenus.delete(unlink[1]);
        return json(200, {});
      }
      return json(404, { message: `unexpected ${method} ${url}` });
    });
  });

  afterEach(() => api.restore());

  test("เชื่อมแล้ว → ผูกเมนูแบบเชื่อมแล้ว / ยกเลิก → ลบเมนูรายคน (กลับไปใช้เมนูเริ่มต้น)", async () => {
    const s = switcher();
    await s.apply("U1", true);
    assert.equal(userMenus.get("U1"), "linked-1");
    await s.apply("U1", false);
    assert.equal(userMenus.has("U1"), false);
  });

  test("เมนูถูก deploy ใหม่ (id เดิมใน cache ถูกลบ) → ค้นหาใหม่แล้วผูกสำเร็จ", async () => {
    const s = switcher();
    await s.apply("U1", true);
    menus = [{ richMenuId: "linked-2", name: `${LINKED_NAME_PREFIX}ccc` }];
    await s.apply("U2", true);
    assert.equal(userMenus.get("U2"), "linked-2");
  });

  test("ยังไม่ได้ตั้งค่า LINE หรือยังไม่มีเมนูแบบเชื่อมแล้ว → ไม่เรียก LINE / ไม่ throw", async () => {
    configured = false;
    await switcher().apply("U1", true);
    assert.equal(api.requests.length, 0);

    configured = true;
    menus = [{ richMenuId: "main-1", name: `${NAME_PREFIX}aaa` }];
    await switcher().apply("U1", true);
    assert.equal(userMenus.size, 0);
  });

  test("LINE API ล้มเหลว → บันทึก log แต่ไม่ throw (ไม่กระทบการเชื่อม/ยกเลิก)", async () => {
    api.restore();
    api = mockLineApi(() => json(500, { message: "down" }));
    await assert.doesNotReject(switcher().apply("U1", false));
    await assert.doesNotReject(switcher().apply("U1", true));
  });
});
