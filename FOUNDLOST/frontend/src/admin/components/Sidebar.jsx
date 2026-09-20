import { Link, useLocation } from "react-router-dom";
import { Home, Search, PackageCheck, ClipboardList, Users, Settings } from "lucide-react";
import logo from "../../assets/images/logo.png";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "หน้าหลัก", icon: Home },
  { to: "/admin/lost-items", label: "แจ้งของหาย", icon: Search },
  { to: "/admin/found-items", label: "แจ้งพบของ", icon: PackageCheck },
  { to: "/admin/reports", label: "ตรวจสอบรายการ", icon: ClipboardList },
  { to: "/admin/users", label: "ผู้ใช้งาน", icon: Users },
  { to: "/admin/settings", label: "ตั้งค่า", icon: Settings },
];

const Sidebar = () => {
  const { pathname } = useLocation();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-emerald-950 text-emerald-200 min-h-screen">
      <div className="px-5 py-6 border-b border-emerald-900/60">
        <img src={logo} alt="KU Lost&Found" className="h-14 w-auto object-contain" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-emerald-600 text-white"
                  : "text-emerald-200/80 hover:bg-emerald-900 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-emerald-900/60 px-5 py-4">
        <p className="text-xs font-semibold text-emerald-100">Kasetsart University</p>
        <p className="text-[11px] text-emerald-300/70 leading-relaxed">เกษตรศาสตร์ สร้างอนาคต</p>
      </div>
    </aside>
  );
};

export default Sidebar;
