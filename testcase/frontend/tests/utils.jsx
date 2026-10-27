import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// แสดง path และ state ปัจจุบัน เพื่อให้เทสตรวจการ navigate ได้
export function LocationProbe() {
  const location = useLocation();
  return (
    <>
      <div data-testid="pathname">{location.pathname}</div>
      <div data-testid="location-state">{JSON.stringify(location.state ?? null)}</div>
    </>
  );
}

/**
 * render หน้าเดียวภายใต้ router
 * @param {JSX.Element} ui คอมโพเนนต์ที่จะทดสอบ
 * @param {{ path?: string, route?: string | { pathname: string, state?: unknown } }} options
 */
export function renderAt(ui, { path = "/", route = path } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={ui} />
        <Route path="*" element={null} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );
}

/** JWT ปลอม (ไม่มีลายเซ็นจริง) สำหรับทดสอบการอ่านวันหมดอายุฝั่งหน้าเว็บ */
export function fakeJwt(payload) {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role: "user", student_id: "6410500001", ...payload })}.signature`;
}

/** ตั้ง session ผู้ใช้ที่ login แล้ว (token อายุ 1 ชั่วโมง) */
export function loginAsUser({ email = "somchai@ku.th", student_id = "6410500001" } = {}) {
  localStorage.setItem("userToken", fakeJwt({ email, student_id, exp: Math.floor(Date.now() / 1000) + 3600 }));
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("email", email);
  localStorage.setItem("student_id", student_id);
}
