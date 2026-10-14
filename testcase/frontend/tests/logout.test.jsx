// FE-LO-xx : ป๊อปอัพยืนยันการออกจากระบบ (ConfirmLogoutModal) ใน Home, Navbar และ AdminLayout
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConfirmLogoutModal from "@app/component/ConfirmLogoutModal";
import Navbar from "@app/component/Navbar";
import AdminLayout from "@app/admin/AdminLayout";
import adminApi from "@app/admin/api/adminApi";
import { LocationProbe, renderAt } from "./utils";

vi.mock("@app/admin/api/adminApi", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const dialog = () => screen.getByRole("dialog", { name: "ออกจากระบบ?" });
const confirmButton = () => within(dialog()).getByRole("button", { name: "ออกจากระบบ" });

describe("ConfirmLogoutModal", () => {
  const setup = (open = true) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmLogoutModal open={open} onConfirm={onConfirm} onCancel={onCancel} />);
    return { onConfirm, onCancel };
  };

  test("FE-LO-01 ปิดอยู่ (open=false) → ไม่แสดงอะไร", () => {
    setup(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("FE-LO-02 แสดงคำถามยืนยัน และโฟกัสปุ่ม 'ยกเลิก' ไว้ก่อน (กัน Enter ออกโดยไม่ตั้งใจ)", () => {
    setup();
    expect(within(dialog()).getByText("คุณต้องการออกจากระบบจริง ๆ ใช่ไหม")).toBeInTheDocument();
    expect(within(dialog()).getByRole("button", { name: "ยกเลิก" })).toHaveFocus();
  });

  test("FE-LO-03 กด 'ออกจากระบบ' → onConfirm", () => {
    const { onConfirm, onCancel } = setup();
    fireEvent.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  test.each([
    ["กด 'ยกเลิก'", () => fireEvent.click(within(dialog()).getByRole("button", { name: "ยกเลิก" }))],
    ["กด Esc", () => fireEvent.keyDown(window, { key: "Escape" })],
    ["คลิกพื้นหลังนอกกล่อง", () => fireEvent.click(dialog().parentElement)],
  ])("FE-LO-04 %s → onCancel และไม่ออกจากระบบ", (_name, act) => {
    const { onConfirm, onCancel } = setup();
    act();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("FE-LO-05 คลิกภายในกล่อง → ไม่ปิด", () => {
    const { onCancel } = setup();
    fireEvent.click(within(dialog()).getByText("คุณต้องการออกจากระบบจริง ๆ ใช่ไหม"));
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe("Navbar", () => {
  beforeEach(() => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("email", "a@ku.th");
    localStorage.setItem("student_id", "641");
  });

  test("FE-LO-06 กดออกจากระบบแล้วยกเลิก → ยังอยู่หน้าเดิม ข้อมูล login ยังอยู่", () => {
    renderAt(<Navbar />, { path: "/foundPage" });
    fireEvent.click(screen.getByRole("button", { name: "ออกจากระบบ" }));
    fireEvent.click(within(dialog()).getByRole("button", { name: "ยกเลิก" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/foundPage");
    expect(localStorage.getItem("isLoggedIn")).toBe("true");
  });

  test("FE-LO-07 กดออกจากระบบแล้วยืนยัน → ล้าง isLoggedIn/email/student_id และไป /login", () => {
    renderAt(<Navbar />, { path: "/foundPage" });
    fireEvent.click(screen.getByRole("button", { name: "ออกจากระบบ" }));
    fireEvent.click(confirmButton());

    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
    expect(localStorage.getItem("isLoggedIn")).toBeNull();
    expect(localStorage.getItem("email")).toBeNull();
    expect(localStorage.getItem("student_id")).toBeNull();
  });

  test("FE-LO-08 เมนูมือถือ: กดออกจากระบบ → ปิดเมนูและแสดงป๊อปอัพยืนยัน", () => {
    renderAt(<Navbar />, { path: "/foundPage" });
    fireEvent.click(screen.getByRole("button", { name: "☰" }));
    const buttons = screen.getAllByRole("button", { name: "ออกจากระบบ" });
    fireEvent.click(buttons[buttons.length - 1]);

    expect(dialog()).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "ออกจากระบบ" })).toHaveLength(2); // ปุ่ม desktop + ปุ่มในป๊อปอัพ
  });
});

describe("AdminLayout", () => {
  beforeEach(() => {
    adminApi.get.mockResolvedValue({ data: { admin: { email: "admin@ku.th", display_name: "Admin" }, stats: { pendingReports: 0 } } });
    localStorage.setItem("adminToken", "token");
    localStorage.setItem("adminEmail", "admin@ku.th");
  });

  const renderLayout = () =>
    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<p>dashboard</p>} />
          </Route>
          <Route path="*" element={null} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    );

  const openLogout = async () => {
    await screen.findByText("dashboard");
    fireEvent.click(screen.getByText("admin@ku.th", { exact: false }).closest("button"));
    fireEvent.click(screen.getByRole("button", { name: "ออกจากระบบ" }));
  };

  test("FE-LO-09 แอดมินกดออกจากระบบแล้วยกเลิก → token ยังอยู่", async () => {
    renderLayout();
    await openLogout();
    fireEvent.click(within(dialog()).getByRole("button", { name: "ยกเลิก" }));
    expect(localStorage.getItem("adminToken")).toBe("token");
    expect(screen.getByTestId("pathname")).toHaveTextContent("/admin/dashboard");
  });

  test("FE-LO-10 แอดมินยืนยันออกจากระบบ → ลบ token และไป /admin/login", async () => {
    renderLayout();
    await openLogout();
    fireEvent.click(confirmButton());
    expect(localStorage.getItem("adminToken")).toBeNull();
    expect(localStorage.getItem("adminEmail")).toBeNull();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/admin/login");
  });
});
