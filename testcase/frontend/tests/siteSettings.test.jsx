// FE-SS-xx : ค่าระบบสาธารณะ (/api/settings/public) → โหมดปิดปรับปรุง (MaintenanceGate) และป้ายประกาศ (AnnouncementBanner)
// siteSettings เก็บค่าไว้ระดับโมดูล: แต่ละเทสตั้งผลลัพธ์ของ API แล้วสั่งโหลดใหม่ด้วย refreshSiteSettings()
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MaintenanceGate from "@app/component/MaintenanceGate";
import AnnouncementBanner from "@app/component/AnnouncementBanner";
import { refreshSiteSettings } from "@app/component/siteSettings";
import { mockRoutes } from "./axiosMock";

vi.mock("axios", () => import("./axiosMock.js"));

const publicSettings = (patch) => ({
  categories: ["กระเป๋า", "อื่น ๆ"],
  deposit_points: [],
  announcement: null,
  maintenance: { enabled: false },
  ...patch,
});

const serve = async (response) => {
  mockRoutes({ "/api/settings/public": response });
  await act(() => refreshSiteSettings());
};

const renderGate = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <MaintenanceGate>
        <p>เนื้อหาเว็บ</p>
      </MaintenanceGate>
    </MemoryRouter>
  );

describe("MaintenanceGate", () => {
  test("FE-SS-01 ปิดปรับปรุง → หน้าผู้ใช้แสดงข้อความจากแอดมินแทนเนื้อหา", async () => {
    await serve(publicSettings({ maintenance: { enabled: true, message: "ปรับปรุงฐานข้อมูล 1 ชม." } }));
    renderGate("/home");
    expect(screen.getByRole("heading", { name: "ระบบปิดปรับปรุงชั่วคราว" })).toBeInTheDocument();
    expect(screen.getByText("ปรับปรุงฐานข้อมูล 1 ชม.")).toBeInTheDocument();
    expect(screen.queryByText("เนื้อหาเว็บ")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "สำหรับผู้ดูแลระบบ" })).toHaveAttribute("href", "/admin/login");
  });

  test("FE-SS-02 ปิดปรับปรุง → หน้าแอดมินยังใช้งานได้", async () => {
    await serve(publicSettings({ maintenance: { enabled: true, message: "x" } }));
    renderGate("/admin/dashboard");
    expect(screen.getByText("เนื้อหาเว็บ")).toBeInTheDocument();
  });

  test("FE-SS-03 แอดมินเปิดระบบแล้ว (โหลดค่าใหม่) → แสดงเนื้อหาตามปกติ", async () => {
    await serve(publicSettings({ maintenance: { enabled: true, message: "x" } }));
    renderGate("/home");
    expect(screen.queryByText("เนื้อหาเว็บ")).not.toBeInTheDocument();
    await serve(publicSettings());
    expect(screen.getByText("เนื้อหาเว็บ")).toBeInTheDocument();
  });

  test("FE-SS-04 โหลดค่าระบบไม่ได้ → ใช้ค่าล่าสุดที่โหลดได้ (ไม่ปิดเว็บเอง)", async () => {
    await serve(publicSettings());
    await serve(new Error("Network Error"));
    renderGate("/home");
    expect(screen.getByText("เนื้อหาเว็บ")).toBeInTheDocument();
  });
});

describe("AnnouncementBanner", () => {
  const announcement = { message: "งดรับฝากของวันเสาร์นี้", tone: "important", starts_on: null, ends_on: null };

  test("FE-SS-05 มีประกาศ → แสดงหัวข้อตามประเภทและข้อความ", async () => {
    await serve(publicSettings({ announcement }));
    render(<AnnouncementBanner />);
    const card = screen.getByRole("status");
    expect(card).toHaveTextContent("ประกาศสำคัญ");
    expect(card).toHaveTextContent("งดรับฝากของวันเสาร์นี้");
  });

  test("FE-SS-06 กดปิดประกาศ → ซ่อน และจำไว้ (ข้อความเดิมไม่แสดงซ้ำ)", async () => {
    await serve(publicSettings({ announcement }));
    const { unmount } = render(<AnnouncementBanner />);
    fireEvent.click(screen.getByRole("button", { name: "ปิดประกาศ" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(localStorage.getItem("dismissedAnnouncement")).toBe(announcement.message);

    unmount();
    render(<AnnouncementBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("FE-SS-07 ข้อความประกาศเปลี่ยน → แสดงอีกครั้งแม้เคยปิดประกาศเก่า", async () => {
    localStorage.setItem("dismissedAnnouncement", "ประกาศเก่า");
    await serve(publicSettings({ announcement }));
    render(<AnnouncementBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(announcement.message);
  });

  test("FE-SS-08 ไม่มีประกาศ → ไม่แสดงอะไร", async () => {
    await serve(publicSettings());
    render(<AnnouncementBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
