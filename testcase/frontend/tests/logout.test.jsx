// FE-LO-xx : ป๊อปอัพยืนยันการออกจากระบบ (ConfirmLogoutModal) ใน UserLayout (ผู้ใช้) และ AdminLayout (แอดมิน)
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConfirmLogoutModal from "@app/component/ConfirmLogoutModal";
import UserLayout from "@app/component/UserLayout";
import { mockRoutes } from "./axiosMock";
import AdminLayout from "@app/admin/AdminLayout";
import adminApi from "@app/admin/api/adminApi";
import { LocationProbe, loginAsUser, renderAt } from "./utils";

vi.mock("axios", () => import("./axiosMock.js"));
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

describe("UserLayout (ฝั่งผู้ใช้)", () => {
  beforeEach(() => {
    mockRoutes();
    loginAsUser();
  });

  const renderLayout = async () => {
    renderAt(<UserLayout><p>เนื้อหา</p></UserLayout>, { path: "/home" });
    await screen.findByText("เนื้อหา");
    fireEvent.click(screen.getByRole("button", { name: "ออกจากระบบ" }));
  };

  test("FE-LO-06 กดออกจากระบบแล้วยกเลิก → session ยังอยู่ และอยู่หน้าเดิม", async () => {
    await renderLayout();
    fireEvent.click(within(dialog()).getByRole("button", { name: "ยกเลิก" }));
    expect(localStorage.getItem("userToken")).not.toBeNull();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/home");
  });

  test("FE-LO-07 ยืนยันออกจากระบบ → ล้าง token/อีเมล/รหัสนิสิต และไป /login", async () => {
    await renderLayout();
    fireEvent.click(confirmButton());
    ["userToken", "isLoggedIn", "email", "student_id"].forEach((key) => expect(localStorage.getItem(key)).toBeNull());
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
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
