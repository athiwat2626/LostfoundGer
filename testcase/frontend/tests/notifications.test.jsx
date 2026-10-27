// FE-NT-xx : หน้าการแจ้งเตือน (page/Notifications.jsx) — ข้อมูลจาก /api/inbox ผ่าน inboxStore
import { act, fireEvent, screen, within } from "@testing-library/react";
import Notifications from "@app/page/Notifications";
import { refreshInbox } from "@app/component/inboxStore";
import { api, mockRoutes } from "./axiosMock";
import { loginAsUser, renderAt } from "./utils";

vi.mock("axios", () => import("./axiosMock.js"));

const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
const inbox = [
  { notification_id: 1, type: "match", title: "พบของที่อาจเป็นของคุณ", body: "กระเป๋าสีดำ คะแนน 82", link: "/my-posts", is_read: false, created_at: minutesAgo(5) },
  { notification_id: 2, type: "claim", title: "มีคนแจ้งว่าเจอ ร่ม ของคุณ", body: "ติดต่อได้ที่โพสต์ของฉัน", link: "/my-posts", is_read: true, created_at: minutesAgo(90) },
  { notification_id: 3, type: "announcement", title: "ระบบปิดปรับปรุงคืนนี้", body: "22:00–23:00", link: null, is_read: true, created_at: minutesAgo(600) },
];

const serveInbox = async (notifications = inbox, unread = notifications.filter((n) => !n.is_read).length) => {
  mockRoutes({ "/api/inbox": { notifications, unread }, "/api/line/notifications": { deliveries: [] } });
  await act(() => refreshInbox());
};
const list = () => screen.getByRole("region", { name: "รายการแจ้งเตือน" });

describe("Notifications", () => {
  beforeEach(() => loginAsUser());

  test("FE-NT-01 แสดงรายการแจ้งเตือนและจำนวนที่ยังไม่อ่าน", async () => {
    await serveInbox();
    renderAt(<Notifications />, { path: "/notifications" });
    expect(await screen.findByText("พบของที่อาจเป็นของคุณ")).toBeInTheDocument();
    expect(screen.getByText("ยังไม่อ่าน 1 รายการ")).toBeInTheDocument();
    expect(within(list()).getByText("ระบบปิดปรับปรุงคืนนี้")).toBeInTheDocument();
  });

  test.each([
    ["ยังไม่อ่าน", ["พบของที่อาจเป็นของคุณ"]],
    ["อาจตรงกัน", ["พบของที่อาจเป็นของคุณ"]],
    ["สถานะรายการ", ["มีคนแจ้งว่าเจอ ร่ม ของคุณ"]],
    ["ระบบ", ["ระบบปิดปรับปรุงคืนนี้"]],
  ])("FE-NT-02 แท็บ '%s' → กรองตามประเภท", async (tab, expected) => {
    await serveInbox();
    renderAt(<Notifications />, { path: "/notifications" });
    await screen.findByText("พบของที่อาจเป็นของคุณ");
    fireEvent.click(screen.getByRole("tab", { name: new RegExp(`^${tab}`) }));
    expect(screen.getByRole("tab", { name: new RegExp(`^${tab}`) })).toHaveAttribute("aria-selected", "true");
    inbox.forEach((n) =>
      expected.includes(n.title)
        ? expect(within(list()).getByText(n.title)).toBeInTheDocument()
        : expect(within(list()).queryByText(n.title)).not.toBeInTheDocument()
    );
  });

  test("FE-NT-03 กดรายการที่ยังไม่อ่าน → ทำเครื่องหมายอ่านแล้ว และเปิดลิงก์", async () => {
    await serveInbox();
    renderAt(<Notifications />, { path: "/notifications" });
    fireEvent.click(await screen.findByText("พบของที่อาจเป็นของคุณ"));
    expect(api.post).toHaveBeenCalledWith("/api/inbox/1/read");
    expect(screen.getByTestId("pathname")).toHaveTextContent("/my-posts");
  });

  test("FE-NT-04 กด 'อ่านทั้งหมด' → POST /api/inbox/read-all", async () => {
    await serveInbox();
    renderAt(<Notifications />, { path: "/notifications" });
    await screen.findByText("พบของที่อาจเป็นของคุณ");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /อ่านทั้งหมด/ })));
    expect(api.post).toHaveBeenCalledWith("/api/inbox/read-all");
  });

  test("FE-NT-05 ไม่มีการแจ้งเตือน → แสดงข้อความว่าง", async () => {
    await serveInbox([]);
    renderAt(<Notifications />, { path: "/notifications" });
    expect(await screen.findByText("ยังไม่มีการแจ้งเตือน")).toBeInTheDocument();
    expect(screen.getByText("อ่านครบทุกรายการแล้ว")).toBeInTheDocument();
  });
});
