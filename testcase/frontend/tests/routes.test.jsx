// FE-RT-xx : ProtectedRoute (ผู้ใช้ — ต้องมี token จากการยืนยัน OTP ที่ยังไม่หมดอายุ) และ AdminProtectedRoute (แอดมิน)
import { screen } from "@testing-library/react";
import ProtectedRoute from "@app/page/ProtectedRoute";
import AdminProtectedRoute from "@app/admin/AdminProtectedRoute";
import { hasValidUserSession } from "@app/component/session";
import { renderAt, fakeJwt } from "./utils";

describe("ProtectedRoute", () => {
  test("FE-RT-01 ยังไม่ login → พาไป /login พร้อมข้อความ และจำหน้าที่จะเปิด", () => {
    renderAt(<ProtectedRoute><p>หน้าลับ</p></ProtectedRoute>, { path: "/my-posts", route: "/my-posts?tab=lost" });

    expect(screen.queryByText("หน้าลับ")).not.toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
    const state = JSON.parse(screen.getByTestId("location-state").textContent);
    expect(state).toEqual({ message: "กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน", from: "/my-posts?tab=lost" });
  });

  test("FE-RT-02 มี token ผู้ใช้ที่ยังไม่หมดอายุ → แสดงเนื้อหา", () => {
    localStorage.setItem("userToken", fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    renderAt(<ProtectedRoute><p>หน้าลับ</p></ProtectedRoute>, { path: "/home" });
    expect(screen.getByText("หน้าลับ")).toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/home");
  });

  test("FE-RT-03 มีแค่ isLoggedIn=true แต่ไม่มี token → ถือว่ายังไม่ login", () => {
    localStorage.setItem("isLoggedIn", "true");
    renderAt(<ProtectedRoute><p>หน้าลับ</p></ProtectedRoute>, { path: "/home" });
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
  });

  test("FE-RT-06 token หมดอายุ → ล้าง session แล้วพาไป /login", () => {
    localStorage.setItem("userToken", fakeJwt({ exp: Math.floor(Date.now() / 1000) - 60 }));
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("email", "a@ku.th");
    renderAt(<ProtectedRoute><p>หน้าลับ</p></ProtectedRoute>, { path: "/home" });
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
    expect(localStorage.getItem("userToken")).toBeNull();
    expect(localStorage.getItem("email")).toBeNull();
  });

  test("FE-RT-07 token รูปแบบเสีย → hasValidUserSession = false", () => {
    localStorage.setItem("userToken", "not-a-jwt");
    expect(hasValidUserSession()).toBe(false);
  });
});

describe("AdminProtectedRoute", () => {
  test("FE-RT-04 ไม่มี adminToken → ไปหน้า /admin/login", () => {
    renderAt(<AdminProtectedRoute><p>แผงควบคุม</p></AdminProtectedRoute>, { path: "/admin/dashboard" });
    expect(screen.queryByText("แผงควบคุม")).not.toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/admin/login");
  });

  test("FE-RT-05 มี adminToken → แสดงเนื้อหา", () => {
    localStorage.setItem("adminToken", "token");
    renderAt(<AdminProtectedRoute><p>แผงควบคุม</p></AdminProtectedRoute>, { path: "/admin/dashboard" });
    expect(screen.getByText("แผงควบคุม")).toBeInTheDocument();
  });
});
