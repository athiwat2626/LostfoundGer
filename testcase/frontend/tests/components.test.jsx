// FE-CP-xx : คอมโพเนนต์ย่อยและข้อมูลคงที่ (SuspendModal, StatTile, BottomNav, สถานะโพสต์, ประกาศ, การแสดงผล, หมวดหมู่, สถานที่)
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Users } from "lucide-react";
import adminApi from "@app/admin/api/adminApi";
import SuspendModal from "@app/admin/components/SuspendModal";
import StatTile from "@app/admin/components/StatTile";
import BottomNav from "@app/component/BottomNav";
import { AnnouncementCard } from "@app/component/AnnouncementBanner";
import { announcementPeriod, announcementType } from "@app/component/announcementTypes";
import { itemStatus } from "@app/component/itemStatus";
import { setDisplayPrefs, useDisplayPrefs } from "@app/component/displayPrefs";
import { campusLocations } from "@app/data/campusLocations";
import { CATEGORIES, withCategoryIcons } from "@app/data/categories";
import { mockRoutes } from "./axiosMock";
import { loginAsUser } from "./utils";

vi.mock("axios", () => import("./axiosMock.js"));
vi.mock("@app/admin/api/adminApi", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe("SuspendModal", () => {
  const setup = (props = {}) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<SuspendModal userLabel="สมชาย ใจดี" onConfirm={onConfirm} onCancel={onCancel} {...props} />);
    return { onConfirm, onCancel };
  };

  beforeEach(() => {
    adminApi.get.mockReset().mockResolvedValue({ data: { settings: { suspend_durations: [3, 7, 30] } } });
  });

  test("FE-CP-01 แสดงชื่อผู้ใช้ และค่าเริ่มต้นคือระงับ 3 วัน", async () => {
    const { onConfirm } = setup();
    expect(screen.getByText("สมชาย ใจดี")).toBeInTheDocument();
    await waitFor(() => expect(adminApi.get).toHaveBeenCalledWith("/admin/settings"));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(onConfirm).toHaveBeenCalledWith({ action: "suspend", duration_days: 3 });
  });

  test.each([
    ["7 วัน", { action: "suspend", duration_days: 7 }],
    ["30 วัน", { action: "suspend", duration_days: 30 }],
    ["ถาวร (แบน)", { action: "ban" }],
  ])("FE-CP-02 เลือก %s → onConfirm(%j)", async (label, expected) => {
    const { onConfirm } = setup();
    await waitFor(() => expect(adminApi.get).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: label }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(onConfirm).toHaveBeenCalledWith(expected);
  });

  test("FE-CP-03 กดยกเลิก → onCancel และไม่ยืนยัน", () => {
    const { onConfirm, onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("FE-CP-04 ระหว่างส่ง (submitting) → ปุ่มยืนยันถูกปิด", () => {
    setup({ submitting: true });
    expect(screen.getByRole("button", { name: "..." })).toBeDisabled();
  });

  test("FE-CP-12 โหลดค่าระบบไม่ได้ → ใช้ตัวเลือกเริ่มต้น 3/7/30 วัน", async () => {
    adminApi.get.mockRejectedValue(new Error("down"));
    setup();
    await waitFor(() => expect(adminApi.get).toHaveBeenCalled());
    ["3 วัน", "7 วัน", "30 วัน", "ถาวร (แบน)"].forEach((label) =>
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument()
    );
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

  test("FE-CP-13 wrapLabel → ป้ายขึ้นได้ 2 บรรทัด (การ์ดแคบบนมือถือ)", () => {
    render(<StatTile icon={Users} label="รายการที่ยังไม่มีเจ้าของ" value={3} wrapLabel />);
    expect(screen.getByText("รายการที่ยังไม่มีเจ้าของ")).toHaveClass("line-clamp-2");
  });
});

describe("BottomNav (มือถือ)", () => {
  beforeEach(() => {
    loginAsUser();
    mockRoutes({ "/api/inbox": { notifications: [], unread: 3 } });
  });

  const renderNav = (path, props = {}) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <BottomNav onReport={vi.fn()} {...props} />
      </MemoryRouter>
    );

  test("FE-CP-07 แท็บ หน้าหลัก / ค้นหา / แจ้งเตือน / ตั้งค่า ลิงก์ถูกต้อง และไฮไลต์หน้าปัจจุบัน", async () => {
    renderNav("/search");
    expect(screen.getByRole("link", { name: /หน้าหลัก/ })).toHaveAttribute("href", "/home");
    expect(screen.getByRole("link", { name: /ค้นหา/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /แจ้งเตือน/ })).toHaveAttribute("href", "/notifications");
    expect(screen.getByRole("link", { name: /ตั้งค่า/ })).toHaveAttribute("href", "/settings");
    expect(screen.queryByRole("link", { name: /โปรไฟล์/ })).not.toBeInTheDocument();
  });

  test("FE-CP-14 หน้าโปรไฟล์/โพสต์ของฉันอยู่ใต้แท็บ 'ตั้งค่า'", () => {
    renderNav("/my-posts");
    expect(screen.getByRole("link", { name: /ตั้งค่า/ })).toHaveAttribute("aria-current", "page");
  });

  test("FE-CP-15 แสดงจำนวนแจ้งเตือนที่ยังไม่อ่านจาก /api/inbox", async () => {
    renderNav("/home");
    expect(await screen.findByText("3")).toBeInTheDocument();
  });

  test("FE-CP-16 ปุ่ม + กลาง → เรียก onReport", () => {
    const onReport = vi.fn();
    renderNav("/home", { onReport });
    fireEvent.click(screen.getByRole("button", { name: "แจ้งรายการ (ของหาย / พบของ)" }));
    expect(onReport).toHaveBeenCalled();
  });
});

describe("สถานะโพสต์ (itemStatus)", () => {
  test.each([
    [{ status: "returned", type: "lost" }, "returned", "คืนของสำเร็จ"],
    [{ status: "open", type: "lost", pending_claims: 2 }, "contacted", "มีผู้ติดต่อ รอรับคืน"],
    [{ status: "open", type: "found" }, "waiting", "รอเจ้าของมารับ"],
    [{ status: "open", type: "lost" }, "searching", "กำลังตามหา"],
  ])("FE-CP-17 %j → %s", (item, key, label) => {
    expect(itemStatus(item)).toMatchObject({ key, label });
  });
});

describe("ประกาศ (AnnouncementCard / announcementTypes)", () => {
  test.each([
    ["info", "ประกาศ"],
    ["important", "ประกาศสำคัญ"],
    ["maintenance", "แจ้งปิดปรับปรุงระบบ"],
    ["warning", "โปรดทราบ"],
    ["success", "ข่าวดี"],
    ["unknown-tone", "ประกาศ"],
  ])("FE-CP-18 ประเภท %s → หัวข้อ '%s'", (tone, title) => {
    expect(announcementType(tone).title).toBe(title);
  });

  test.each([
    [{ starts_on: "2026-10-14", ends_on: "2026-10-14" }, "เฉพาะวันที่ 14 ต.ค. 2569"],
    [{ starts_on: "2026-10-01", ends_on: "2026-10-31" }, "1 ต.ค. 2569 – 31 ต.ค. 2569"],
    [{ ends_on: "2026-12-31" }, "ถึง 31 ธ.ค. 2569"],
    [{ starts_on: "2026-01-05" }, "ตั้งแต่ 5 ม.ค. 2569"],
    [{}, null],
  ])("FE-CP-19 ช่วงวันที่ %j → %s (ปี พ.ศ.)", (input, expected) => {
    expect(announcementPeriod(input)).toBe(expected);
  });

  test("FE-CP-20 การ์ดประกาศแสดงหัวข้อ ข้อความ ช่วงวันที่ และปุ่มปิด", () => {
    const onDismiss = vi.fn();
    render(
      <AnnouncementCard announcement={{ tone: "warning", message: "งดรับฝากของวันเสาร์", starts_on: "2026-10-14", ends_on: "2026-10-14" }} onDismiss={onDismiss} />
    );
    const card = screen.getByRole("status");
    expect(card).toHaveTextContent("โปรดทราบ");
    expect(card).toHaveTextContent("งดรับฝากของวันเสาร์");
    expect(card).toHaveTextContent("เฉพาะวันที่ 14 ต.ค. 2569");
    fireEvent.click(screen.getByRole("button", { name: "ปิดประกาศ" }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe("การแสดงผล (displayPrefs)", () => {
  const Probe = () => {
    const prefs = useDisplayPrefs();
    return <p data-testid="prefs">{`${prefs.theme}/${prefs.resolvedTheme}/${prefs.fontScale}`}</p>;
  };

  test("FE-CP-21 เลือกโหมดมืด + ตัวอักษรใหญ่ → ตั้ง data-theme/font-size ที่ <html> และจำไว้ในเครื่อง", () => {
    render(<Probe />);
    act(() => setDisplayPrefs({ theme: "dark", fontScale: "large" }));
    expect(screen.getByTestId("prefs")).toHaveTextContent("dark/dark/large");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.fontSize).toBe("112.5%");
    expect(JSON.parse(localStorage.getItem("displayPrefs"))).toEqual({ theme: "dark", fontScale: "large" });

    act(() => setDisplayPrefs({ theme: "light", fontScale: "normal" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.fontSize).toBe("100%");
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

  test("FE-CP-11 หมวดหมู่เริ่มต้นมี 'อื่น ๆ' และหมวดใหม่จากแอดมินได้ไอคอนทั่วไป", () => {
    expect(CATEGORIES.map((c) => c.value)).toContain("อื่น ๆ");
    const [known, custom] = withCategoryIcons(["กุญแจ", "ร่ม"]);
    expect(known).toBe(CATEGORIES.find((c) => c.value === "กุญแจ"));
    expect(custom).toMatchObject({ value: "ร่ม", tone: "text-teal-600" });
    expect(custom.icon).toBeTruthy();
  });
});
