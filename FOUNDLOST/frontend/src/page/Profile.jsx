import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserRoundPen,
  ListChecks,
  Handshake,
  Bell,
  Trophy,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Mail,
  IdCard,
  QrCode,
  AlertCircle,
} from "lucide-react";
import UserLayout from "../component/UserLayout";
import userApi from "../component/userApi";
import LineConnectionCard from "../component/LineConnectionCard";
import DisplaySettingsCard from "../component/DisplaySettingsCard";
import ConfirmLogoutModal from "../component/ConfirmLogoutModal";
import { clearUserSession } from "../component/session";
import { useInbox } from "../component/inboxStore";
import { API_URL, formatThaiDate } from "../component/itemUtils";

const MenuRow = ({ to, icon: Icon, label, hint, badge, tone = "bg-brand-50 text-brand" }) => (
  <li>
    <Link to={to} className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50 active:bg-slate-100">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        {hint && <span className="block truncate text-xs text-slate-500">{hint}</span>}
      </span>
      {badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{badge}</span>
      )}
      <ChevronRight size={18} className="shrink-0 text-slate-300" aria-hidden="true" />
    </Link>
  </li>
);

const MenuGroup = ({ title, children }) => (
  <section aria-label={title}>
    <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</h2>
    <ul className="card divide-y divide-slate-100 overflow-hidden">{children}</ul>
  </section>
);

// ─── หน้าโปรไฟล์ / เมนูบัญชี (แท็บ "โปรไฟล์" ใน Bottom Navigation) ────────────────
const Profile = () => {
  const navigate = useNavigate();
  const { unread } = useInbox();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    userApi
      .get("/api/me")
      .then((res) => setUser(res.data.user))
      .catch((err) => setError(err.response?.data?.message || "โหลดข้อมูลบัญชีไม่สำเร็จ"));
    userApi
      .get("/api/my-items")
      .then((res) => setItems(res.data.items))
      .catch(() => setItems([]));
  }, []);

  const logout = () => {
    clearUserSession();
    navigate("/login");
  };

  const name = user ? `${user.first_name} ${user.last_name}` : "";
  const openItems = items?.filter((item) => item.status === "open").length ?? 0;
  const pendingClaims = items?.reduce((sum, item) => sum + (item.status === "open" ? item.pending_claims || 0 : 0), 0) ?? 0;

  return (
    <UserLayout>
      <ConfirmLogoutModal open={confirmLogout} onConfirm={logout} onCancel={() => setConfirmLogout(false)} />

      <div className="mx-auto mt-6 max-w-2xl space-y-6 sm:mt-8">
        {/* ── การ์ดโปรไฟล์ ── */}
        {error ? (
          <p role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle size={18} /> {error}
          </p>
        ) : !user ? (
          <div className="h-48 animate-pulse rounded-3xl bg-white shadow-sm" aria-busy="true" />
        ) : (
          <section className="relative overflow-hidden rounded-3xl gradient-hero p-5 text-white shadow-md sm:p-6">
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
            <div className="relative flex items-center gap-4">
              {user.profile_image ? (
                <img src={`${API_URL}${user.profile_image}`} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/60" />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold uppercase">
                  {user.first_name?.[0] || "?"}
                </span>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold sm:text-xl">{name}</h1>
                <p className="flex items-center gap-1.5 truncate text-xs text-white/85">
                  <Mail size={12} aria-hidden="true" /> {user.email}
                </p>
                {user.student_id && !user.student_id.startsWith("USER") && (
                  <p className="flex items-center gap-1.5 text-xs text-white/85">
                    <IdCard size={12} aria-hidden="true" /> {user.student_id}
                  </p>
                )}
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                  <ShieldCheck size={12} aria-hidden="true" /> บัญชีใช้งานได้ · ยืนยันอีเมลแล้ว
                </span>
              </div>
            </div>

            <dl className="relative mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "โพสต์ทั้งหมด", value: items ? items.length : "–" },
                { label: "ยังไม่ปิด", value: items ? openItems : "–" },
                { label: "คืนของสำเร็จ", value: user.successful_returns ?? 0 },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white/15 px-2 py-2.5">
                  <dt className="text-[11px] text-white/80">{stat.label}</dt>
                  <dd className="text-lg font-bold">{stat.value}</dd>
                </div>
              ))}
            </dl>
            <p className="relative mt-3 text-[11px] text-white/70">สมาชิกตั้งแต่ {formatThaiDate(user.created_at, "long")}</p>
          </section>
        )}

        <MenuGroup title="รายการของฉัน">
          <MenuRow to="/my-posts" icon={ListChecks} label="โพสต์ของฉัน" hint="จัดการ แก้ไข และปิดโพสต์" badge={pendingClaims} />
          <MenuRow to="/my-posts?tab=claims" icon={Handshake} label="ของที่ฉันติดต่อไป" hint="ประวัติการติดต่อเจ้าของโพสต์" tone="bg-amber-50 text-amber-600" />
          <MenuRow to="/notifications" icon={Bell} label="การแจ้งเตือน" hint="รายการที่อาจตรงกันและสถานะรายการ" badge={unread} tone="bg-sky-50 text-sky-600" />
        </MenuGroup>

        <LineConnectionCard />

        <DisplaySettingsCard />

        <MenuGroup title="บัญชีและการตั้งค่า">
          <MenuRow to="/settings" icon={UserRoundPen} label="ข้อมูลส่วนตัวและช่องทางติดต่อ" hint="ชื่อ รูปโปรไฟล์ เบอร์โทร อีเมลสำรอง" />
          <MenuRow to="/line/add" icon={QrCode} label="เพิ่มเพื่อน LINE" hint="สแกน QR เพื่อรับแจ้งเตือนทาง LINE" tone="bg-[#06C755]/10 text-[#06C755]" />
          <MenuRow to="/ranking" icon={Trophy} label="อันดับผู้คืนของ" hint="ผู้คืนของมากที่สุดและจุดที่ของหายบ่อย" tone="bg-amber-50 text-amber-600" />
        </MenuGroup>

        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className="card flex min-h-14 w-full items-center justify-center gap-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={18} aria-hidden="true" /> ออกจากระบบ
        </button>
      </div>
    </UserLayout>
  );
};

export default Profile;
