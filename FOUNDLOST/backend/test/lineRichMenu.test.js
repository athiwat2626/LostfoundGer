// Rich Menu: โครงเมนู 6 ช่อง, ตรวจภาพ, สร้างใหม่ / ใช้ของเดิม / อัปเดตแล้วลบเวอร์ชันเก่า (ผ่าน LINE API จำลอง)
const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const client = require("../services/line/lineClient");
const { buildRichMenu, deployRichMenu, readImageInfo, validateImage, NAME_PREFIX, MENU_ITEMS } = require("../services/line/richMenu");
const { mockLineApi, json } = require("./helpers/lineApiMock");

const silent = { info() {}, warn() {}, error() {} };
const BASE = "https://lostfound.example.test";
const IMAGE = fs.readFileSync(path.join(__dirname, "..", "assets", "line", "richmenu.png"));

describe("โครง Rich Menu", () => {
  test("6 ช่อง 2 แถว × 3 คอลัมน์ ครอบเต็มภาพ 2500×1686 ไม่ซ้อนกัน และเปิด URL จาก APP_BASE_URL", () => {
    const menu = buildRichMenu(`${BASE}/`);
    assert.deepEqual(menu.size, { width: 2500, height: 1686 });
    assert.equal(menu.areas.length, 6);
    const area = menu.areas.reduce((sum, a) => sum + a.bounds.width * a.bounds.height, 0);
    assert.equal(area, 2500 * 1686);
    assert.deepEqual(
      menu.areas.map((a) => [a.action.label, a.action.uri]),
      [
        ["แจ้งของหาย", `${BASE}/lostItem`],
        ["ค้นหาของ", `${BASE}/home`],
        ["รายการของฉัน", `${BASE}/my-posts`],
        ["แจ้งพบของ", `${BASE}/foundItem`],
        ["การแจ้งเตือน", `${BASE}/notifications`],
        ["บัญชีของฉัน", `${BASE}/profile`],
      ]
    );
    menu.areas.forEach((a) => {
      assert.equal(a.action.type, "uri");
      assert.ok(a.action.label.length <= 20);
    });
    assert.ok(menu.chatBarText.length <= 14);
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

  beforeEach(() => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
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
});
