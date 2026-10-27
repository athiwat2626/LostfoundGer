import { useEffect, useState } from "react";
import {
  X,
  Mail,
  AtSign,
  Phone,
  IdCard,
  CalendarDays,
  MessageCircle,
  ShieldAlert,
  Handshake,
  Flag,
  FileWarning,
  Layers,
  PackageOpen,
  MapPin,
} from "lucide-react";
import adminApi from "../api/adminApi";
import { API_URL } from "../../component/itemUtils";

const CONTACT_LABEL = { email: "อีเมล", phone: "โทรศัพท์" };

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const d = new Date(value);
  return withTime
    ? d.toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

const statusOf = (user) => {
  if (user.is_banned) return { label: "ถูกแบน", tone: "bg-red-50 text-red-600" };
  if (user.suspended_until && new Date(user.suspended_until) > new Date())
    return { label: `ถูกระงับถึง ${formatDate(user.suspended_until, true)}`, tone: "bg-amber-50 text-amber-600" };
  return { label: "ใช้งานปกติ", tone: "bg-brand-50 text-brand" };
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 text-sm">
    <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
    <span className="w-28 shrink-0 text-slate-400 sm:w-32">{label}</span>
    <span className="min-w-0 break-words font-medium text-slate-800">{value || "-"}</span>
  </div>
);

const StatBox = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-xl border border-slate-100 px-3 py-2.5">
    <p className={`flex items-center gap-1.5 text-xs ${tone}`}>
      <Icon size={13} /> {label}
    </p>
    <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
  </div>
);

// ป๊อปอัพข้อมูลผู้ใช้สำหรับแอดมิน (อ่านอย่างเดียว)
const UserDetailModal = ({ studentId, onClose }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    adminApi
      .get(`/admin/users/${encodeURIComponent(studentId)}`)
      .then((res) => active && setData(res.data))
      .catch((err) => active && setError(err.response?.data?.message || "โหลดข้อมูลผู้ใช้ไม่สำเร็จ"));
    return () => {
      active = false;
    };
  }, [studentId]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const user = data?.user;
  const status = user ? statusOf(user) : null;
  const fullName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ข้อมูลผู้ใช้"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* หัวป๊อปอัพ */}
        <div className="relative rounded-t-3xl gradient-hero px-5 pb-5 pt-5 text-white sm:rounded-t-2xl sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
          >
            <X size={18} />
          </button>
          <p className="text-xs font-medium text-white/70">ข้อมูลผู้ใช้</p>
          {user && (
            <div className="mt-3 flex items-center gap-4">
              {user.profile_image ? (
                <img src={`${API_URL}${user.profile_image}`} alt={fullName} className="h-16 w-16 rounded-full border-2 border-white/70 object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/70 bg-white/20 text-2xl font-bold uppercase">
                  {(fullName || user.email)[0]}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{fullName || "-"}</h2>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.tone}`}>
                  {status.label}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
          {!data && !error && <div className="h-64 animate-pulse rounded-xl bg-slate-100" />}

          {user && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatBox icon={Layers} label="โพสต์ทั้งหมด" value={data.stats.totalPosts} tone="text-sky-600" />
                <StatBox icon={Handshake} label="คืนของสำเร็จ" value={user.successful_returns} tone="text-emerald-600" />
                <StatBox icon={ShieldAlert} label="คำเตือน" value={user.warning_count} tone="text-amber-600" />
                <StatBox icon={FileWarning} label="ถูกรายงาน" value={data.stats.reportsAgainst} tone="text-red-600" />
              </div>

              <h3 className="mt-6 text-sm font-bold text-slate-900">ข้อมูลบัญชีและการติดต่อ</h3>
              <div className="mt-3 space-y-2.5">
                <InfoRow icon={IdCard} label="รหัสผู้ใช้" value={user.student_id} />
                <InfoRow icon={Mail} label="อีเมลเข้าสู่ระบบ" value={user.email} />
                <InfoRow icon={AtSign} label="อีเมลสำรอง" value={user.contact_email} />
                <InfoRow icon={Phone} label="เบอร์โทรศัพท์" value={user.phone} />
                <InfoRow icon={MessageCircle} label="ช่องทางที่สะดวก" value={CONTACT_LABEL[user.preferred_contact]} />
                <InfoRow icon={CalendarDays} label="สมัครสมาชิกเมื่อ" value={formatDate(user.created_at, true)} />
                <InfoRow icon={Flag} label="รายงานผู้อื่น" value={`${data.stats.reportsMade} ครั้ง`} />
              </div>

              <h3 className="mt-6 text-sm font-bold text-slate-900">
                โพสต์ล่าสุด <span className="font-normal text-slate-400">({data.posts.length})</span>
              </h3>
              {data.posts.length === 0 ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                  <PackageOpen size={18} /> ยังไม่มีโพสต์
                </p>
              ) : (
                <ul className="mt-3 max-h-60 divide-y divide-slate-50 overflow-auto rounded-xl border border-slate-100">
                  {data.posts.map((post) => (
                    <li key={`${post.type}-${post.item_id}`} className="flex items-center gap-3 px-3 py-2.5">
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold text-white ${
                          post.type === "found" ? "bg-green-500" : "bg-orange-500"
                        }`}
                      >
                        {post.type === "found" ? "ของที่พบ" : "ของหาย"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{post.item_name}</span>
                        <span className="flex items-center gap-1 truncate text-xs text-slate-400">
                          <MapPin size={11} className="shrink-0" /> {post.location || "-"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{formatDate(post.date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;
