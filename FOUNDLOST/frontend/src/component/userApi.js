import axios from "axios";
import { API_URL } from "./itemUtils";
import { clearUserSession } from "./session";
import { refreshSiteSettings } from "./siteSettings";

// axios สำหรับ API ที่ต้องยืนยันตัวตนผู้ใช้ (token ได้จากการยืนยัน OTP ตอนเข้าสู่ระบบ)
const userApi = axios.create({ baseURL: API_URL });

userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("userToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// token หมดอายุ/ไม่ถูกต้อง → ออกจากระบบแล้วกลับไปหน้าเข้าสู่ระบบ
userApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // ระบบเพิ่งเข้าโหมดปิดปรับปรุง → โหลดค่าระบบใหม่ หน้าเว็บจะเปลี่ยนเป็นหน้าแจ้งปิดเอง
    if (error.response?.status === 503 && error.response.data?.maintenance) {
      refreshSiteSettings();
    }
    if (error.response?.status === 401) {
      clearUserSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default userApi;
