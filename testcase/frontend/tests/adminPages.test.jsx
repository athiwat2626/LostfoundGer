// FE-AD-xx : หน้าแอดมิน Dashboard และ Users
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import adminApi from "@app/admin/api/adminApi";
import Dashboard from "@app/admin/pages/Dashboard";
import Users from "@app/admin/pages/Users";
import { renderAt } from "./utils";

vi.mock("@app/admin/api/adminApi", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

beforeEach(() => {
  adminApi.get.mockReset();
  adminApi.post.mockReset();
});

describe("Dashboard", () => {
  const stats = {
    totalUsers: 120, totalFoundItems: 40, totalLostItems: 55, pendingReports: 3,
    underReviewReports: 2, resolvedReports: 9, suspendedUsers: 4, bannedUsers: 1,
  };

  test("FE-AD-01 แสดงสถิติทั้ง 8 ช่องจาก /admin/dashboard/stats", async () => {
    adminApi.get.mockResolvedValue({ data: { stats } });
    renderAt(<Dashboard />, { path: "/admin/dashboard" });

    const tile = async (label) => (await screen.findByText(label)).closest("button");
    expect(within(await tile("จำนวนผู้ใช้งานทั้งหมด")).getByText("120")).toBeInTheDocument();
    expect(within(await tile("แจ้งของหาย")).getByText("55")).toBeInTheDocument();
    expect(within(await tile("พบของแล้ว")).getByText("40")).toBeInTheDocument();
    expect(within(await tile("ผู้ใช้ที่ถูกแบน")).getByText("1")).toBeInTheDocument();
    expect(adminApi.get).toHaveBeenCalledWith("/admin/dashboard/stats");
  });

  test.each([
    ["จำนวนผู้ใช้งานทั้งหมด", "/admin/users"],
    ["แจ้งของหาย", "/admin/lost-items"],
    ["พบของแล้ว", "/admin/found-items"],
    ["รายงานที่รอดำเนินการ", "/admin/reports"],
  ])("FE-AD-02 กดช่อง '%s' → ไป %s", async (label, path) => {
    adminApi.get.mockResolvedValue({ data: { stats } });
    renderAt(<Dashboard />, { path: "/admin/dashboard" });
    fireEvent.click((await screen.findByText(label)).closest("button"));
    expect(screen.getByTestId("pathname")).toHaveTextContent(path);
  });

  test("FE-AD-03 โหลดไม่สำเร็จ → แสดงข้อความ error", async () => {
    adminApi.get.mockRejectedValue({ response: { data: { message: "Internal server error" } } });
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
  const row = (name) => screen.getByText(new RegExp(name)).closest("tr");

  beforeEach(() => {
    adminApi.get.mockResolvedValue({ data: { users, total: 3 } });
    adminApi.post.mockResolvedValue({ data: { success: true } });
  });

  test("FE-AD-04 แสดงรายชื่อ, จำนวนทั้งหมด และสถานะ Active / Banned / Suspended", async () => {
    renderAt(<Users />, { path: "/admin/users" });
    await screen.findByText(/สมชาย/);
    expect(screen.getByText("ทั้งหมด 3 คน")).toBeInTheDocument();
    expect(within(row("สมชาย")).getByText("Active")).toBeInTheDocument();
    expect(within(row("สมหญิง")).getByText("Banned")).toBeInTheDocument();
    expect(within(row("มานะ")).getByText("Suspended")).toBeInTheDocument();
  });

  test("FE-AD-05 พิมพ์ค้นหา → เรียก API พร้อมพารามิเตอร์ q", async () => {
    renderAt(<Users />, { path: "/admin/users" });
    await screen.findByText(/สมชาย/);
    fireEvent.change(screen.getByPlaceholderText("ค้นหาชื่อ, อีเมล, รหัสนิสิต..."), { target: { value: "641" } });
    await waitFor(() => expect(adminApi.get).toHaveBeenLastCalledWith("/admin/users", { params: { q: "641" } }));
  });

  test.each([
    ["สมชาย", "Issue Warning", "641", { action: "warn" }],
    ["สมชาย", "Ban Permanently", "641", { action: "ban" }],
    ["สมหญิง", "Unban", "642", { action: "unban" }],
    ["มานะ", "Unsuspend", "643", { action: "unsuspend" }],
  ])("FE-AD-06 แถว %s กดปุ่ม %s → POST action ที่ถูกต้อง", async (name, title, id, body) => {
    renderAt(<Users />, { path: "/admin/users" });
    await screen.findByText(/สมชาย/);
    await act(async () => fireEvent.click(within(row(name)).getByTitle(title)));
    expect(adminApi.post).toHaveBeenCalledWith(`/admin/users/${id}/action`, body);
  });

  test("FE-AD-07 ระงับบัญชี 7 วันผ่านหน้าต่างยืนยัน", async () => {
    renderAt(<Users />, { path: "/admin/users" });
    await screen.findByText(/สมชาย/);
    fireEvent.click(within(row("สมชาย")).getByTitle("Suspend"));
    expect(screen.getByText("Suspend Account?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "7 Days" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Confirm" })));

    expect(adminApi.post).toHaveBeenCalledWith("/admin/users/641/action", { action: "suspend", duration_days: 7 });
    await waitFor(() => expect(screen.queryByText("Suspend Account?")).not.toBeInTheDocument());
  });

  test("FE-AD-08 ดำเนินการไม่สำเร็จ → alert ข้อความจาก server", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    adminApi.post.mockRejectedValue({ response: { data: { message: "User not found" } } });
    renderAt(<Users />, { path: "/admin/users" });
    await screen.findByText(/สมชาย/);
    await act(async () => fireEvent.click(within(row("สมชาย")).getByTitle("Issue Warning")));
    expect(alert).toHaveBeenCalledWith("User not found");
  });

  test("FE-AD-09 ไม่มีผู้ใช้ → แสดง 'ไม่พบผู้ใช้'", async () => {
    adminApi.get.mockResolvedValue({ data: { users: [], total: 0 } });
    renderAt(<Users />, { path: "/admin/users" });
    expect(await screen.findByText("ไม่พบผู้ใช้")).toBeInTheDocument();
  });
});
