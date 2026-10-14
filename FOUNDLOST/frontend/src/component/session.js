// สถานะการเข้าสู่ระบบของผู้ใช้ (อ้างอิง token ที่ได้จากการยืนยัน OTP)
const SESSION_KEYS = ["isLoggedIn", "email", "student_id", "userToken"];

// อ่านวันหมดอายุจาก JWT (ไม่ได้ตรวจลายเซ็น — การตรวจจริงทำที่ server ทุกครั้ง)
const tokenExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const hasValidUserSession = () => {
  const token = localStorage.getItem("userToken");
  if (!token) return false;
  const expiry = tokenExpiry(token);
  return expiry !== null && expiry > Date.now();
};

export const clearUserSession = () => {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
};
