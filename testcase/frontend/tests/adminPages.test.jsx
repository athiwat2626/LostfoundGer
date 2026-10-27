// FE-AD-xx : หน้าแอดมิน Dashboard และ Users
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import adminApi from "@app/admin/api/adminApi";
import Dashboard from "@app/admin/pages/Dashboard";
import Users from "@app/admin/pages/Users";
import { renderAt } from "./utils";

vi.mock("@app/admin/api/adminApi", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

// ตอบตาม URL ที่หน้าเรียก (หน้าเดียวเรียกหลาย endpoint)
const routeGet = (routes) =>
  adminApi.get.mockImplementation(async (url) => {
    if (url in routes) {
      const value = routes[url];
      if (value instanceof Error || value?.response) throw value;
      return { data: value };
    }
    return { data: {} };
  });

beforeEach(() => {
  adminApi.get.mockReset();
  adminApi.post.mockReset();
});

describe("Dashboard", () => {
  const stats = {
    totalUsers: 120, totalFoundItems: 40, totalLostItems: 55, pendingReports: 3,
    underReviewReports: 2, resolvedReports: 9, suspendedUsers: 4, bannedUsers: 1,
    postsThisMonth: 7, newUsers24h: 6, newUsersPrev24h: 3, successfulReturns: 12, flaggedContent: 2,
  };
  const trend = { range: "24h", points: [{ label: "10:00", lost: 1, found: 2 }] };
  const loadDashboard = () => {
    routeGet({ "/admin/dashboard/stats": { stats }, "/admin/dashboard/trend": trend });
    renderAt(<Dashboard />, { path: "/admin/dashboard" });
  };
  const tile = async (label) => (await screen.findByText(label)).closest("button");

  test("FE-AD-01 แสดงสถิติภาพรวม 8 ช่องจาก /admin/dashboard/stats", async () => {
    loadDashboard();
    expect(within(await tile("จำนวนผู้ใช้งานทั้งหมด")).getByText("120")).toBeInTheDocument();
    expect(within(await tile("แจ้งของหาย")).getByText("55")).toBeInTheDocument();
    expect(within(await tile("พบของแล้ว")).getByText("40")).toBeInTheDocument();
    expect(within(await tile("ผู้ใช้ที่ถูกแบน")).getByText("1")).toBeInTheDocument();
    expect(adminApi.get).toHaveBeenCalledWith("/admin/dashboard/stats");
  });

  test("FE-AD-10 การ์ดตัวเลขหลัก: โพสต์ทั้งหมด, ผู้ใช้ใหม่เทียบวันก่อน, รายงานค้าง", async () => {
    loadDashboard();
    expect(await screen.findByText("95")).toBeInTheDocument(); // 55 + 40
    expect(screen.getByText("+7 เดือนนี้")).toBeInTheDocument();
    expect(screen.getByText("+100% จากวันก่อน")).toBeInTheDocument(); // 6 เทียบ 3
    expect(screen.getByText("ต้องตรวจสอบ")).toBeInTheDocument(); // pending 3 + under_review 2
  });

  test("FE-AD-11 เปลี่ยนช่วงกราฟเป็น 7 วัน → เรียก trend ด้วย range=7d", async () => {
    loadDashboard();
    await screen.findByText("แนวโน้มการแจ้ง");
    fireEvent.click(screen.getByRole("button", { name: "7 วัน" }));
    await waitFor(() => expect(adminApi.get).toHaveBeenCalledWith("/admin/dashboard/trend", { params: { range: "7d" } }));
  });

  test.each([
    ["จำนวนผู้ใช้งานทั้งหมด", "/admin/users"],
    ["แจ้งของหาย", "/admin/lost-items"],
    ["พบของแล้ว", "/admin/found-items"],
    ["รายงานที่รอดำเนินการ", "/admin/reports"],
  ])("FE-AD-02 กดช่อง '%s' → ไป %s", async (label, path) => {
    loadDashboard();
    fireEvent.click(await tile(label));
    expect(screen.getByTestId("pathname")).toHaveTextContent(path);
  });

  test("FE-AD-03 โหลดไม่สำเร็จ → แสดงข้อความ error", async () => {
    routeGet({ "/admin/dashboard/stats": { response: { data: { message: "Internal server error" } } }, "/admin/dashboard/trend": trend });
    renderAt(<Dashboard />, { path: "/admin/dashboard" });
    expect(await screen.findByText("Internal server error")).toBeInTheDocument();
  });
});

describe("Users", () => {
  const users = [
    { student_id: "641", first_name: "สมชาย", last_name: "ใจดี", email: "a@ku.th", warning_count: 0, is_banned: false, suspended_until: null },
    { student_id: "642", first_name: "สมหญิง", last_name: "รักเรียน", email: "b@ku.th", warning_count: 2, is_banned: true, suspended_until: null },
    { student_id: "643", first_name: "มานะ", last_name: "อดทน", email: "c@ku.th", warning_count: 1, is_banned: false, suspended_until: new Date(Date.now() + 86_400_000).toISOString() },
  ];
  // หน้านี้แสดงทั้งการ์ด (มือถือ) และตาราง (จอใหญ่) — เทสใช้แถวในตาราง
  const row = (name) => screen.getAllByText(new RegExp(name)).map((el) => el.closest("tr")).find(Boolean);
  const loadUsers = async () => {
    renderAt(<Users />, { path: "/admin/users" });
    await screen.findAllByText(/สมชาย/);
  };

  beforeEach(() => {
    routeGet({ "/admin/users": { users, total: 3 }, "/admin/settings": { settings: { suspend_durations: [3, 7, 30] } } });
    adminApi.post.mockResolvedValue({ data: { success: true } });
  });

  test("FE-AD-04 แสดงรายชื่อ, จำนวนทั้งหมด และสถานะ ใช้งานปกติ / ถูกแบน / ถูกระงับ", async () => {
    await loadUsers();
    expect(screen.getByText("ทั้งหมด 3 คน")).toBeInTheDocument();
    expect(within(row("สมชาย")).getByText("ใช้งานปกติ")).toBeInTheDocument();
    expect(within(row("สมหญิง")).getByText("ถูกแบน")).toBeInTheDocument();
    expect(within(row("มานะ")).getByText("ถูกระงับ")).toBeInTheDocument();
  });

  test("FE-AD-05 พิมพ์ค้นหา → เรียก API พร้อมพารามิเตอร์ q", async () => {
    await loadUsers();
    fireEvent.change(screen.getByPlaceholderText("ค้นหาชื่อ, อีเมล, รหัสนิสิต..."), { target: { value: "641" } });
    await waitFor(() => expect(adminApi.get).toHaveBeenLastCalledWith("/admin/users", { params: { q: "641" } }));
  });

  test.each([
    ["สมชาย", "ออกคำเตือน", "641", { action: "warn" }],
    ["สมชาย", "แบนถาวร", "641", { action: "ban" }],
    ["สมหญิง", "ยกเลิกการแบน", "642", { action: "unban" }],
    ["มานะ", "ยกเลิกการระงับ", "643", { action: "unsuspend" }],
  ])("FE-AD-06 แถว %s กดปุ่ม %s → POST action ที่ถูกต้อง", async (name, title, id, body) => {
    await loadUsers();
    await act(async () => fireEvent.click(within(row(name)).getByTitle(title)));
    expect(adminApi.post).toHaveBeenCalledWith(`/admin/users/${id}/action`, body);
  });

  test("FE-AD-07 ระงับบัญชี 7 วันผ่านหน้าต่างยืนยัน (ตัวเลือกวันมาจากค่าระบบ)", async () => {
    await loadUsers();
    fireEvent.click(within(row("สมชาย")).getByTitle("ระงับบัญชี"));
    expect(screen.getByText("ระงับบัญชีผู้ใช้?")).toBeInTheDocument();
    await waitFor(() => expect(adminApi.get).toHaveBeenCalledWith("/admin/settings"));

    fireEvent.click(screen.getByRole("button", { name: "7 วัน" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" })));

    expect(adminApi.post).toHaveBeenCalledWith("/admin/users/641/action", { action: "suspend", duration_days: 7 });
    await waitFor(() => expect(screen.queryByText("ระงับบัญชีผู้ใช้?")).not.toBeInTheDocument());
  });

  test("FE-AD-12 ตัวเลือกวันระงับตามค่าระบบที่แอดมินตั้ง (เช่น 1/14 วัน)", async () => {
    routeGet({ "/admin/users": { users, total: 3 }, "/admin/settings": { settings: { suspend_durations: [1, 14] } } });
    await loadUsers();
    fireEvent.click(within(row("สมชาย")).getByTitle("ระงับบัญชี"));
    expect(await screen.findByRole("button", { name: "14 วัน" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "30 วัน" })).not.toBeInTheDocument();
  });

  test("FE-AD-08 ดำเนินการไม่สำเร็จ → alert ข้อความจาก server", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    adminApi.post.mockRejectedValue({ response: { data: { message: "User not found" } } });
    await loadUsers();
    await act(async () => fireEvent.click(within(row("สมชาย")).getByTitle("ออกคำเตือน")));
    expect(alert).toHaveBeenCalledWith("User not found");
  });

  test("FE-AD-09 ไม่มีผู้ใช้ → แสดง 'ไม่พบผู้ใช้'", async () => {
    routeGet({ "/admin/users": { users: [], total: 0 } });
    renderAt(<Users />, { path: "/admin/users" });
    expect((await screen.findAllByText("ไม่พบผู้ใช้")).length).toBeGreaterThan(0);
  });
});
