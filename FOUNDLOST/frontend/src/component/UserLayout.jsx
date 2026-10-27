import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import userApi from "./userApi";
import { clearUserSession } from "./session";
import {
  Plus,
  Home as HomeIcon,
  Trophy,
  LogOut,
  Search,
  X,
  PackageSearch,
  ClipboardList,
  CircleHelp,
  HandHelping,
  Heart,
  Package,
  Settings,
  ListChecks,
  Bell,
  UserRound,
} from "lucide-react";
import ConfirmLogoutModal from "./ConfirmLogoutModal";
import NotificationBell from "./NotificationBell";
import BottomNav from "./BottomNav";
import AnnouncementBanner from "./AnnouncementBanner";
import { API_URL } from "./itemUtils";

// ─── แถบเมนูด้านซ้าย (แบบเดียวกับฝั่งแอดมิน: จอใหญ่หุบเหลือไอคอนแล้วกางเมื่อเอาเมาส์ชี้ / มือถือเป็น drawer) ───
const NAV_ITEMS = [
  { to: "/home", label: "หน้าหลัก", icon: HomeIcon },
  { to: "/search", label: "ค้นหา", icon: Search },
  { to: "/foundPage", label: "หน้าโพสพบของ", icon: PackageSearch },
  { to: "/lostPage", label: "หน้าโพสของหาย", icon: ClipboardList },
  { to: "/my-posts", label: "โพสต์ของฉัน", icon: ListChecks },
  { to: "/notifications", label: "การแจ้งเตือน", icon: Bell },
  { to: "/ranking", label: "จัดอันดับ", icon: Trophy },
  { to: "/profile", label: "โปรไฟล์", icon: UserRound },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
];

const SideRail = ({ onAdd, onLogout, mobileOpen, onClose, collapsed, onHoverChange }) => {
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
          <Link to="/home" className={`min-w-0 whitespace-nowrap text-xl font-extrabold text-white ${labelClass}`}>
            KU <span className="font-semibold text-lime-300">Lost &amp; Found</span>
          </Link>
          {collapsed && (
            <Link to="/home" className="hidden w-full text-center text-lg font-extrabold text-white md:block">
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

        <button type="button" onClick={onAdd} title="แจ้งสิ่งของ" aria-label="แจ้งสิ่งของ" className={`${itemClass(false)} mb-3 bg-white/10`}>
          <Plus size={20} className="shrink-0 rounded-md border-2 border-current" />
          <span className={`whitespace-nowrap ${labelClass}`} aria-hidden="true">แจ้งสิ่งของ</span>
        </button>

        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} title={label} aria-label={label} className={itemClass(pathname === to || pathname.startsWith(`${to}/`))}>
            <Icon size={20} className="shrink-0" />
            <span className={`whitespace-nowrap ${labelClass}`} aria-hidden="true">{label}</span>
          </Link>
        ))}

        <button type="button" onClick={onLogout} title="ออกจากระบบ" aria-label="ออกจากระบบ" className={`${itemClass(false)} mt-auto`}>
          <LogOut size={20} className="shrink-0" />
          <span className={`whitespace-nowrap ${labelClass}`} aria-hidden="true">ออกจากระบบ</span>
        </button>
      </aside>
    </>
  );
};

// ─── ป๊อปอัพเลือกประเภทการแจ้ง (ปุ่ม +) ────────────────────────────────────────────
// แว่นขยายที่มีเครื่องหมาย ? อยู่ในเลนส์ (เลนส์ของ lucide Search อยู่ที่ 11,11 จากกรอบ 24)
const LostIcon = () => (
  <span className="relative block h-16 w-16">
    <Search size={64} strokeWidth={1.6} />
    <span className="absolute left-[45.8%] top-[45.8%] -translate-x-1/2 -translate-y-1/2 text-2xl font-bold leading-none">
      ?
    </span>
  </span>
);

// มือถือกล่องพัสดุ
const FoundIcon = () => (
  <span className="relative flex h-16 w-16 items-end justify-center">
    <Package size={30} strokeWidth={1.6} className="absolute left-1/2 top-0 -translate-x-1/2" />
    <HandHelping size={48} strokeWidth={1.6} />
  </span>
);

const REPORT_CHOICES = [
  {
    to: "/lostItem",
    title: "ของหาย",
    subtitle: "แจ้งของหาย",
    icon: LostIcon,
    watermark: CircleHelp,
    tone: "gradient-lost hover:brightness-105",
  },
  {
    to: "/foundItem",
    title: "ของที่พบ",
    subtitle: "รายงานสิ่งของที่พบ",
    icon: FoundIcon,
    watermark: Heart,
    tone: "gradient-found hover:brightness-105",
  },
];

const ReportTypeModal = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-type-title"
        className="w-full max-w-2xl rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="report-type-title" className="text-lg font-bold text-slate-900">
            แจ้งสิ่งของ
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6">
          {REPORT_CHOICES.map(({ to, title, subtitle, icon: Icon, watermark: Watermark, tone }) => (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl px-3 py-7 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] sm:px-4 sm:py-12 ${tone}`}
            >
              <Watermark size={110} strokeWidth={1.5} className="absolute -bottom-4 right-4 text-white/10" aria-hidden="true" />
              <Icon />
              <span className="mt-4 text-lg font-bold">{title}</span>
              <span className="mt-2 text-xs text-white/90">{subtitle}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

// ช่องค้นหาเก็บค่าที่พิมพ์ไว้เอง แล้วค่อยส่งให้หน้าหลังหยุดพิมพ์ 300ms
// (ถ้าส่งทุกครั้งที่กด หน้าที่เขียน ?q= ลง URL จะส่งค่าเก่ากลับมาทับตอนพิมพ์เร็ว ตัวอักษรหาย)
const SEARCH_DEBOUNCE_MS = 300;
const SearchInput = ({ value, onChange, placeholder }) => {
  const [draft, setDraft] = useState(value);
  const sent = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // ค่าจากหน้าเปลี่ยนเอง (เช่น กดล้างตัวกรอง) → แสดงตาม
  useEffect(() => {
    if (value === sent.current) return;
    sent.current = value;
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === sent.current) return undefined;
    const timer = setTimeout(() => {
      sent.current = draft;
      onChangeRef.current(draft);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  return (
    <input
      type="search"
      enterKeyHint="search"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent text-base text-slate-700 placeholder-slate-400 outline-none md:text-sm"
    />
  );
};

// ─── โครงหน้าผู้ใช้: แถบเมนูซ้าย + แถบค้นหา/คำทักทาย + ป๊อปอัพแจ้งสิ่งของ/ออกจากระบบ ──────
// search: { value, onChange, placeholder } — หน้าที่ไม่มีช่องค้นหาไม่ต้องส่ง
const UserLayout = ({ search, children }) => {
  const navigate = useNavigate();
  const email = localStorage.getItem("email") || "";
  const [profile, setProfile] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [reportTypeOpen, setReportTypeOpen] = useState(false);
  // จอใหญ่: หุบเหลือไอคอนไว้ และกางออกอัตโนมัติเมื่อเอาเมาส์ชี้ — เนื้อหาหน้าขยับตาม
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!email) return undefined;
    const loadProfile = () =>
      userApi
        .get("/api/me")
        .then((res) => setProfile(res.data.user))
        .catch(() => setProfile(null));
    loadProfile();
    // หน้าตั้งค่าส่ง event นี้หลังบันทึกชื่อ/รูปโปรไฟล์
    window.addEventListener("profile-updated", loadProfile);
    return () => window.removeEventListener("profile-updated", loadProfile);
  }, [email]);

  // แต่ละหน้ามี UserLayout ของตัวเอง หน้าต่างนี้จึงปิดเองเมื่อเปลี่ยนหน้า
  const openReport = () => setReportTypeOpen(true);

  const handleLogout = () => {
    clearUserSession();
    navigate("/login");
  };

  const displayName = profile?.first_name || email.split("@")[0] || "ผู้ใช้";

  return (
    // user-app: ขอบเขตของโหมดมืด (App.css) — หน้าแอดมิน/ล็อกอินไม่ได้รับผล
    <div className={`user-app min-h-screen gradient-app transition-all duration-300 ${sidebarHovered ? "md:pl-60" : "md:pl-20"}`}>
      {/* จอ md ขึ้นไป: แถบเมนูซ้าย / มือถือ: Bottom Navigation */}
      <SideRail
        onAdd={openReport}
        onLogout={() => setConfirmLogout(true)}
        collapsed={!sidebarHovered}
        onHoverChange={setSidebarHovered}
        mobileOpen={false}
        onClose={() => {}}
      />
      <ReportTypeModal open={reportTypeOpen} onClose={() => setReportTypeOpen(false)} />
      <ConfirmLogoutModal open={confirmLogout} onConfirm={handleLogout} onCancel={() => setConfirmLogout(false)} />

      <div className="mx-auto max-w-6xl px-4 pb-bottom-nav pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 md:py-5">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-3 sm:gap-x-4">
          {/* โลโก้ (มือถือ — จอใหญ่อยู่ในแถบเมนูซ้าย) */}
          <Link to="/home" className="mr-auto flex items-center gap-2 md:hidden" aria-label="KU Lost & Found หน้าหลัก">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-xs font-extrabold text-white">KU</span>
            <span className="text-base font-extrabold leading-tight text-slate-900">
              Lost <span className="text-brand">&amp;</span> Found
            </span>
          </Link>

          {search ? (
            <label className="order-last flex w-full min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 md:order-none md:w-auto md:flex-1 md:rounded-xl md:py-2.5">
              <Search size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
              <span className="sr-only">ค้นหา</span>
              <SearchInput value={search.value} onChange={search.onChange} placeholder={search.placeholder} />
            </label>
          ) : (
            <div className="hidden flex-1 md:block" />
          )}

          <NotificationBell />

          <Link to="/profile" className="flex shrink-0 items-center gap-3 rounded-full" aria-label="โปรไฟล์ของฉัน">
            <div className="hidden text-right sm:block">
              <p className="text-[11px] text-slate-400">ยินดีต้อนรับ</p>
              <p className="text-sm font-bold text-slate-900">สวัสดี, {displayName}</p>
            </div>
            {profile?.profile_image ? (
              <img src={`${API_URL}${profile.profile_image}`} alt="" className="h-10 w-10 rounded-full object-cover shadow" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-sm font-bold uppercase text-white">
                {displayName[0]}
              </span>
            )}
          </Link>
        </header>

        <AnnouncementBanner />

        {children}
      </div>

      <BottomNav onReport={openReport} reportActive={pathname === "/lostItem" || pathname === "/foundItem"} />
    </div>
  );
};

export default UserLayout;
