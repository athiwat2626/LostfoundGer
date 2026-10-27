import { Link, useLocation } from "react-router-dom";
import { Home as HomeIcon, Search, Plus, Bell, Settings } from "lucide-react";
import { useInbox } from "./inboxStore";

// เมนูที่ถือว่าอยู่ในแท็บเดียวกัน (เช่น หน้าโปรไฟล์/โพสต์ของฉัน อยู่ใต้ "ตั้งค่า" — หน้าโปรไฟล์เปิดจากรูปที่มุมขวาบน)
const TABS = [
  { to: "/home", label: "หน้าหลัก", icon: HomeIcon, match: ["/home", "/foundPage", "/lostPage"] },
  { to: "/search", label: "ค้นหา", icon: Search, match: ["/search"] },
  { center: true },
  { to: "/notifications", label: "แจ้งเตือน", icon: Bell, match: ["/notifications"], badge: true },
  { to: "/settings", label: "ตั้งค่า", icon: Settings, match: ["/settings", "/profile", "/my-posts", "/ranking", "/line"] },
];

const isActive = (pathname, match) => match.some((path) => pathname === path || pathname.startsWith(`${path}/`));

// ─── แถบเมนูล่างสำหรับมือถือ (ซ่อนบนจอ md ขึ้นไป ซึ่งใช้แถบเมนูซ้ายแทน) ─────────────
const BottomNav = ({ onReport, reportActive }) => {
  const { pathname } = useLocation();
  const { unread } = useInbox();

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 pb-safe shadow-(--shadow-float) backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          if (tab.center) {
            return (
              <li key="report" className="flex justify-center">
                <button
                  type="button"
                  onClick={onReport}
                  aria-label="แจ้งรายการ (ของหาย / พบของ)"
                  aria-haspopup="dialog"
                  className="-mt-5 flex flex-col items-center gap-0.5"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-white ring-4 ring-white transition active:scale-95 ${
                      reportActive ? "brightness-110" : ""
                    }`}
                  >
                    <Plus size={26} strokeWidth={2.4} />
                  </span>
                  <span className={`text-[11px] font-semibold ${reportActive ? "text-brand" : "text-slate-500"}`}>แจ้งรายการ</span>
                </button>
              </li>
            );
          }
          const active = isActive(pathname, tab.match);
          const Icon = tab.icon;
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
                  active ? "text-brand" : "text-slate-500 active:text-slate-700"
                }`}
              >
                <span className={`relative flex h-8 w-12 items-center justify-center rounded-full transition ${active ? "bg-brand-50" : ""}`}>
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                  {tab.badge && unread > 0 && (
                    <span className="absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                      {unread > 99 ? "99+" : unread}
                      <span className="sr-only"> รายการที่ยังไม่อ่าน</span>
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
