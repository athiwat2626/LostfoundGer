// FE-RT-xx : ProtectedRoute (ผู้ใช้) และ AdminProtectedRoute (แอดมิน)
import { screen } from "@testing-library/react";
import ProtectedRoute from "@app/page/ProtectedRoute";
import AdminProtectedRoute from "@app/admin/AdminProtectedRoute";
import { renderAt } from "./utils";

describe("ProtectedRoute", () => {
  test("FE-RT-01 ยังไม่ login → แจ้งเตือนและพาไป /login พร้อมข้อความ", () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    renderAt(<ProtectedRoute><p>หน้าลับ</p></ProtectedRoute>, { path: "/home" });

    expect(alert).toHaveBeenCalledWith("ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน");
    expect(screen.queryByText("หน้าลับ")).not.toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
    expect(screen.getByTestId("location-state")).toHaveTextContent("ยังไม่ได้เข้าสู่ระบบ");
  });

  test("FE-RT-02 login แล้ว (isLoggedIn=true) → แสดงเนื้อหา", () => {
    localStorage.setItem("isLoggedIn", "true");
    renderAt(<ProtectedRoute><p>หน้าลับ</p></ProtectedRoute>, { path: "/home" });
    expect(screen.getByText("หน้าลับ")).toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/home");
  });

  test("FE-RT-03 ค่า isLoggedIn ไม่ใช่ 'true' → ถือว่ายังไม่ login", () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    localStorage.setItem("isLoggedIn", "yes");
    renderAt(<ProtectedRoute><p>หน้าลับ</p></ProtectedRoute>, { path: "/home" });
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
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
