// FE-CP-xx : คอมโพเนนต์ย่อย (SuspendModal, StatTile, BottomNav, Sidebar) และข้อมูลคงที่
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Users } from "lucide-react";
import SuspendModal from "@app/admin/components/SuspendModal";
import StatTile from "@app/admin/components/StatTile";
import BottomNav from "@app/component/BottomNav";
import Sidebar from "@app/admin/components/Sidebar";
import { campusLocations } from "@app/data/campusLocations";
import { colorOptions } from "@app/data/colorOptions";

describe("SuspendModal", () => {
  const setup = (props = {}) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<SuspendModal userLabel="สมชาย ใจดี" onConfirm={onConfirm} onCancel={onCancel} {...props} />);
    return { onConfirm, onCancel };
  };

  test("FE-CP-01 แสดงชื่อผู้ใช้ และค่าเริ่มต้นคือระงับ 3 วัน", () => {
    const { onConfirm } = setup();
    expect(screen.getByText("สมชาย ใจดี")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith({ action: "suspend", duration_days: 3 });
  });

  test.each([
    ["7 Days", { action: "suspend", duration_days: 7 }],
    ["30 Days", { action: "suspend", duration_days: 30 }],
    ["Permanent", { action: "ban" }],
  ])("FE-CP-02 เลือก %s → onConfirm(%j)", (label, expected) => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: label }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith(expected);
  });

  test("FE-CP-03 กด Cancel → onCancel และไม่ยืนยัน", () => {
    const { onConfirm, onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("FE-CP-04 ระหว่างส่ง (submitting) → ปุ่มยืนยันถูกปิด", () => {
    setup({ submitting: true });
    expect(screen.getByRole("button", { name: "..." })).toBeDisabled();
  });
});

describe("StatTile", () => {
  test("FE-CP-05 มี onClick → เป็นปุ่มที่กดได้", () => {
    const onClick = vi.fn();
    render(<StatTile icon={Users} label="ผู้ใช้ทั้งหมด" sublabel="Users" value={120} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  test("FE-CP-06 ไม่มี onClick → ไม่ใช่ปุ่ม", () => {
    render(<StatTile icon={Users} label="ผู้ใช้ทั้งหมด" value={0} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

describe("BottomNav", () => {
  test("FE-CP-07 เมนูที่ตรงกับหน้าปัจจุบันถูกไฮไลต์ และลิงก์ถูกต้อง", () => {
    render(<MemoryRouter initialEntries={["/ranking"]}><BottomNav /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "จัดอันดับ" })).toHaveClass("text-emerald-700");
    expect(screen.getByRole("link", { name: "หน้าหลัก" })).toHaveAttribute("href", "/home");
    expect(screen.getByRole("link", { name: "ค้นหา" })).toHaveAttribute("href", "/foundPage");
    expect(screen.getByRole("link", { name: "จัดอันดับ" })).toHaveAttribute("href", "/ranking");
  });
});

describe("Sidebar (แอดมิน)", () => {
  test("FE-CP-08 แสดงเมนูแอดมินครบ 6 รายการ และไฮไลต์หน้าปัจจุบัน", () => {
    render(<MemoryRouter initialEntries={["/admin/users"]}><Sidebar /></MemoryRouter>);
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/admin/dashboard", "/admin/lost-items", "/admin/found-items", "/admin/reports", "/admin/users", "/admin/settings",
    ]);
    expect(screen.getByRole("link", { name: "ผู้ใช้งาน" })).toHaveClass("bg-emerald-600");
    expect(screen.getByRole("link", { name: "หน้าหลัก" })).not.toHaveClass("bg-emerald-600");
  });
});

describe("ข้อมูลคงที่", () => {
  test("FE-CP-09 campusLocations: มีชื่อ และพิกัดอยู่ในพื้นที่ ม.เกษตร กำแพงแสน", () => {
    expect(campusLocations.length).toBeGreaterThan(100);
    for (const location of campusLocations) {
      expect(location.name.trim()).not.toBe("");
      const [lat, lng] = location.position;
      expect(lat).toBeGreaterThan(14.0);
      expect(lat).toBeLessThan(14.05);
      expect(lng).toBeGreaterThan(99.95);
      expect(lng).toBeLessThan(100.0);
    }
  });

  test("FE-CP-10 campusLocations: ชื่อสถานที่ไม่ซ้ำกัน (ใช้เป็น React key)", () => {
    const names = campusLocations.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test("FE-CP-11 colorOptions: ทุกสีมีชื่อภาษาไทยและรหัสสี hex", () => {
    expect(colorOptions).toHaveLength(8);
    for (const color of colorOptions) {
      expect(color.name).toMatch(/^สี/);
      expect(color.value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
