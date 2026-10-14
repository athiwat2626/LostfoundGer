// LINE-xx : services/lineNotification.js
const { backendPath } = require("./helpers");
const { sendLineNotification } = require(backendPath("services/lineNotification.js"));

describe("sendLineNotification", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "line-token";
    process.env.LINE_USER_ID = "U-default";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    delete process.env.LINE_USER_ID;
  });

  test("LINE-01 ไม่ได้ตั้งค่า token → ข้าม ไม่เรียก API", async () => {
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    await expect(sendLineNotification("hi")).resolves.toEqual({ skipped: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("LINE-02 ส่งสำเร็จไปยังผู้รับ default พร้อม Bearer token", async () => {
    global.fetch.mockResolvedValue({ ok: true });
    await expect(sendLineNotification("มีของหายใหม่")).resolves.toEqual({ success: true });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.line.me/v2/bot/message/push");
    expect(options.headers.Authorization).toBe("Bearer line-token");
    expect(JSON.parse(options.body)).toEqual({ to: "U-default", messages: [{ type: "text", text: "มีของหายใหม่" }] });
  });

  test("LINE-03 ระบุผู้รับเองจะใช้แทน default", async () => {
    global.fetch.mockResolvedValue({ ok: true });
    await sendLineNotification("hi", "U-custom");
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).to).toBe("U-custom");
  });

  test("LINE-04 ข้อความยาวเกิน 5000 ตัวอักษรถูกตัด", async () => {
    global.fetch.mockResolvedValue({ ok: true });
    await sendLineNotification("x".repeat(6000));
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).messages[0].text).toHaveLength(5000);
  });

  test("LINE-05 LINE API ตอบ error → throw พร้อมรหัสสถานะ", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401, text: async () => "invalid token" });
    await expect(sendLineNotification("hi")).rejects.toThrow("LINE API 401: invalid token");
  });
});
