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
