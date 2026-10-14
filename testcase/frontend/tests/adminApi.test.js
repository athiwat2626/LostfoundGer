// FE-API-xx : admin/api/adminApi.js (axios instance ของแอดมิน)
import adminApi from "@app/admin/api/adminApi";

const respondWith = (status, data = {}) =>
  vi.fn(async (config) => {
    if (status >= 400) {
      const error = new Error(`Request failed with status code ${status}`);
      error.config = config;
      error.response = { status, data, config, headers: {} };
      throw error;
    }
    return { status, data, config, headers: {}, statusText: "OK" };
  });

describe("adminApi", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/admin/dashboard", href: "http://localhost/admin/dashboard" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  test("FE-API-01 baseURL ชี้ไปที่ backend http://localhost:3000", () => {
    expect(adminApi.defaults.baseURL).toBe("http://localhost:3000");
  });

  test("FE-API-02 มี adminToken → แนบ Authorization: Bearer <token>", async () => {
    localStorage.setItem("adminToken", "abc123");
    const adapter = respondWith(200, { ok: true });
    await adminApi.get("/admin/users", { adapter });
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe("Bearer abc123");
  });

  test("FE-API-03 ไม่มี token → ไม่แนบ Authorization", async () => {
    const adapter = respondWith(200);
    await adminApi.get("/admin/users", { adapter });
    expect(adapter.mock.calls[0][0].headers.Authorization).toBeUndefined();
  });

  test("FE-API-04 ได้ 401 → ลบ token/email และพาไป /admin/login", async () => {
    localStorage.setItem("adminToken", "expired");
    localStorage.setItem("adminEmail", "a@ku.th");
    await expect(adminApi.get("/admin/users", { adapter: respondWith(401) })).rejects.toThrow();

    expect(localStorage.getItem("adminToken")).toBeNull();
    expect(localStorage.getItem("adminEmail")).toBeNull();
    expect(window.location.href).toBe("/admin/login");
  });

  test("FE-API-05 ได้ 401 ขณะอยู่หน้า login อยู่แล้ว → ไม่ redirect ซ้ำ", async () => {
    window.location.pathname = "/admin/login";
    await expect(adminApi.post("/admin/auth/login", {}, { adapter: respondWith(401) })).rejects.toThrow();
    expect(window.location.href).toBe("http://localhost/admin/dashboard");
  });

  test("FE-API-06 error อื่น (500) → ไม่ลบ token", async () => {
    localStorage.setItem("adminToken", "keep");
    await expect(adminApi.get("/admin/users", { adapter: respondWith(500) })).rejects.toThrow();
    expect(localStorage.getItem("adminToken")).toBe("keep");
  });
});
