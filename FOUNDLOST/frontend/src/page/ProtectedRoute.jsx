import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearUserSession, hasValidUserSession } from "../component/session";

// เข้าได้เฉพาะเมื่อมี token ผู้ใช้ที่ยังไม่หมดอายุ (ได้จากการยืนยัน OTP)
const ProtectedRoute = ({ children }) => {
  const loggedIn = hasValidUserSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loggedIn) {
      clearUserSession();
      navigate("/login", {
        replace: true,
        // จำหน้าที่ตั้งใจจะเปิด (เช่น ลิงก์จากเมนู LINE) แล้วพากลับมาหลังเข้าสู่ระบบ
        state: { message: "กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน", from: `${location.pathname}${location.search}` },
      });
    }
  }, [loggedIn, navigate, location.pathname, location.search]);

  if (!loggedIn) return null;

  return children;
};

export default ProtectedRoute;
