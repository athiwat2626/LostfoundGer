import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Search, Bell, LogOut, User, ChevronDown } from "lucide-react";
import adminApi from "./api/adminApi";
import Sidebar from "./components/Sidebar";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState({
    email: localStorage.getItem("adminEmail") || "",
    display_name: "Admin",
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-4 bg-white border-b border-slate-200 px-6 py-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="ค้นหา รายการ / เลขที่ / ชื่อผู้ใช้..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white transition-colors"
            />
          </div>

          <div className="ml-auto flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/reports")}
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
              title="รายงานที่รอดำเนินการ"
            >
              <Bell size={18} />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <User size={16} />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{admin.display_name || "Admin"}</p>
                  <p className="text-xs text-slate-400 leading-tight">{admin.email}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {menuOpen && (
                <>
                  <button
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuOpen(false)}
                    aria-label="close menu"
                  />
                  <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <LogOut size={15} />
                      ออกจากระบบ
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
