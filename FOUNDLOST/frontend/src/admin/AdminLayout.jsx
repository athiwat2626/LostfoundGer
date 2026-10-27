import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, PackageCheck, ClipboardList, Users, Settings, Bell, LogOut, ShieldCheck, Shuffle, Menu, X, History, ClipboardCheck } from "lucide-react";
import adminApi from "./api/adminApi";
import ConfirmLogoutModal from "../component/ConfirmLogoutModal";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "หน้าหลัก", icon: Home },
  { to: "/admin/lost-items", label: "แจ้งของหาย", icon: Search },
  { to: "/admin/found-items", label: "แจ้งพบของ", icon: PackageCheck },
  { to: "/admin/matches", label: "จับคู่อัตโนมัติ", icon: Shuffle },
  { to: "/admin/reports", label: "ตรวจสอบรายการ", icon: ClipboardList, badge: true },
  { to: "/admin/users", label: "ผู้ใช้งาน", icon: Users },
  { to: "/admin/audit", label: "ประวัติการดำเนินการ", icon: History },
  { to: "/admin/survey", label: "แบบประเมิน", icon: ClipboardCheck },
  { to: "/admin/settings", label: "ตั้งค่า", icon: Settings },
];

const AdminSideRail = ({ pendingCount, onLogout, mobileOpen, onClose, collapsed, onHoverChange }) => {
  const { pathname } = useLocation();

  // ซ่อนข้อความเมนูเมื่อหุบ (เฉพาะจอ md ขึ้นไป — บนมือถือเป็น drawer แสดงข้อความเสมอ)
  const labelClass = collapsed ? "md:hidden" : "";
  const itemClass = (active) =>
    `relative flex h-11 w-full shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
      collapsed ? "md:justify-center md:px-0" : ""
    } ${active ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`;

  return (
    <>
      {/* ฉากหลังมืดตอนเปิดเมนูบนมือถือ */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-slate-900/40 transition-opacity md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />

      <aside
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-1 overflow-y-auto overflow-x-hidden gradient-sidebar px-4 py-6 transition-all duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-20 md:px-3" : "md:w-60"}`}
      >
        <div className="mb-6 flex items-center justify-between gap-2 px-3">
          <Link to="/admin/dashboard" className={`min-w-0 ${labelClass}`}>
            <p className="whitespace-nowrap text-xl font-extrabold text-white">
              KU <span className="font-semibold text-lime-300">Lost &amp; Found</span>
            </p>
            <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[11px] font-medium uppercase tracking-widest text-white/60">
              <ShieldCheck size={12} /> ระบบผู้ดูแล
            </p>
          </Link>
          {collapsed && (
            <Link to="/admin/dashboard" className="hidden w-full text-center text-lg font-extrabold text-white md:block">
              KU
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white md:hidden"
            aria-label="ปิดเมนู"
          >
            <X size={20} />
          </button>
        </div>

        {NAV_ITEMS.map(({ to, label, icon: Icon, badge }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          const count = badge ? pendingCount : 0;
          return (
            <Link key={to} to={to} title={label} aria-label={label} className={itemClass(active)}>
              <Icon size={20} className="shrink-0" />
              <span className={`flex-1 whitespace-nowrap ${labelClass}`} aria-hidden="true">{label}</span>
              {count > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ${
                    collapsed ? "md:absolute md:right-1 md:top-0.5" : ""
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}

        <button type="button" onClick={onLogout} title="ออกจากระบบ" aria-label="ออกจากระบบ" className={`${itemClass(false)} mt-auto`}>
          <LogOut size={20} className="shrink-0" />
          <span className={`whitespace-nowrap ${labelClass}`} aria-hidden="true">ออกจากระบบ</span>
        </button>
      </aside>
    </>
  );
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [admin, setAdmin] = useState({
    email: localStorage.getItem("adminEmail") || "",
    display_name: "แอดมิน",
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // จอใหญ่: หุบเหลือไอคอนไว้ และกางออกอัตโนมัติเมื่อเอาเมาส์ชี้ — เนื้อหาหน้าขยับตาม
  const [sidebarHovered, setSidebarHovered] = useState(false);

  useEffect(() => {
    adminApi
      .get("/admin/auth/me")
      .then((res) => setAdmin(res.data.admin))
      .catch(() => {});
    adminApi
      .get("/admin/dashboard/stats")
      .then((res) => setPendingCount(res.data.stats.pendingReports))
      .catch(() => {});
  }, []);

  // ปิด drawer บนมือถือเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    navigate("/admin/login", { replace: true });
  };

  const displayName = admin.display_name || "แอดมิน";

  return (
    <div className={`min-h-screen gradient-app transition-all duration-300 ${sidebarHovered ? "md:pl-60" : "md:pl-20"}`}>
      <AdminSideRail
        pendingCount={pendingCount}
        collapsed={!sidebarHovered}
        onHoverChange={setSidebarHovered}
        onLogout={() => setConfirmLogout(true)}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <ConfirmLogoutModal open={confirmLogout} onConfirm={handleLogout} onCancel={() => setConfirmLogout(false)} />

      <div className="mx-auto max-w-6xl md:px-8 md:py-5">
        {/* มือถือ: แถบหัวติดด้านบน มีปุ่มเมนู + โลโก้ */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-100 bg-white/90 px-3 py-2 backdrop-blur md:static md:gap-4 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
            title="เปิดเมนู"
            aria-label="เปิดเมนู"
          >
            <Menu size={22} />
          </button>

          <Link to="/admin/dashboard" className="min-w-0 text-base font-extrabold text-brand md:hidden">
            KU <span className="font-semibold text-slate-700">Lost &amp; Found</span>
          </Link>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => navigate("/admin/reports")}
            className="relative rounded-full p-2 text-slate-500 transition hover:bg-white hover:shadow-sm"
            title="รายงานที่รอดำเนินการ"
            aria-label="รายงานที่รอดำเนินการ"
          >
            <Bell size={20} />
            {pendingCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {pendingCount}
              </span>
            )}
          </button>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[11px] text-slate-400">{admin.email}</p>
              <p className="text-sm font-bold text-slate-900">สวัสดี, {displayName}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-sm font-bold uppercase text-white md:h-10 md:w-10">
              {displayName[0]}
            </span>
          </div>
        </header>

        <main className="overflow-x-hidden px-4 pb-8 pt-4 md:mt-8 md:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
