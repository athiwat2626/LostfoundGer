import { Link, useLocation } from "react-router-dom";
import { Home, Search, Plus, Trophy, User } from "lucide-react";

const NAV_ITEMS = [
  { to: "/home", label: "หน้าหลัก", icon: Home },
  { to: "/foundPage", label: "ค้นหา", icon: Search },
  { to: "/foundItem", label: "", icon: Plus, isFab: true },
  { to: "/ranking", label: "จัดอันดับ", icon: Trophy },
  { to: "/profile", label: "โปรไฟล์", icon: User },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-end justify-around px-2 pb-2 pt-1 z-50">
      {NAV_ITEMS.map(({ to, label, icon: Icon, isFab }) =>
        isFab ? (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-700 text-white shadow-lg -mt-6 hover:bg-emerald-800 transition-colors"
          >
            <Icon size={26} />
          </Link>
        ) : (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-0.5 text-[11px] px-3 py-1 rounded-lg transition-colors ${
              pathname === to
                ? "text-emerald-700 font-medium"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon size={20} strokeWidth={pathname === to ? 2.5 : 1.8} />
            {label}
          </Link>
        )
      )}
    </nav>
  );
}
