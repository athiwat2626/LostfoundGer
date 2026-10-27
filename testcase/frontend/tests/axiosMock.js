// axios จำลองที่รองรับ axios.create() (userApi / adminApi ใช้ instance ของตัวเอง)
// ใช้ในไฟล์เทส: vi.mock("axios", () => import("./axiosMock.js"));
// แล้ว import { api, mockRoutes } from "./axiosMock" เพื่อกำหนดผลลัพธ์ตาม URL
import { vi } from "vitest";

const instance = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  defaults: { headers: { common: {} } },
  interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
});

/** instance ที่ axios.create() คืนให้ (userApi ในแอป) */
export const api = instance();

const axios = { ...instance(), create: vi.fn(() => api), isAxiosError: (e) => Boolean(e?.isAxiosError) };
export default axios;

const notFound = (url) => Object.assign(new Error(`unmocked ${url}`), { response: { status: 404, data: {} } });

// ค่าเริ่มต้นของ endpoint ที่ทุกหน้าผู้ใช้เรียก (UserLayout, กระดิ่ง, ค่าระบบ)
const DEFAULT_ROUTES = {
  "/api/me": { user: { student_id: "6410500001", first_name: "Somchai", last_name: "Jaidee", email: "somchai@ku.th" } },
  "/api/inbox": { notifications: [], unread: 0 },
  "/api/settings/public": { categories: ["กระเป๋า", "กุญแจ", "อุปกรณ์อิเล็กทรอนิกส์", "เอกสาร", "อื่น ๆ"], deposit_points: [], announcement: null, maintenance: { enabled: false } },
};

/**
 * ตั้งผลลัพธ์ของ GET ทั้ง axios.get และ api.get ตามท้าย URL
 * routes: { "/foundItem": data | Error | (url) => data }
 */
export function mockRoutes(routes = {}) {
  const all = { ...DEFAULT_ROUTES, ...routes };
  const handler = async (url) => {
    const path = String(url).replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    if (!(path in all)) throw notFound(url);
    const value = typeof all[path] === "function" ? all[path](url) : all[path];
    if (value instanceof Error) throw value;
    return { data: value };
  };
  axios.get.mockReset().mockImplementation(handler);
  api.get.mockReset().mockImplementation(handler);
  api.post.mockReset().mockResolvedValue({ data: { success: true } });
  axios.post.mockReset().mockResolvedValue({ data: { success: true } });
  api.patch.mockReset().mockResolvedValue({ data: { success: true } });
  api.delete.mockReset().mockResolvedValue({ data: { success: true } });
}
