import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Tag,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Flag,
  Handshake,
  Mail,
  Phone,
  MessageCircle,
  UserRound,
  PartyPopper,
  Palette,
} from "lucide-react";
import userApi from "./userApi";
import { API_URL, timeAgo, formatThaiDate, QUICK_FILTERS } from "./itemUtils";
import StatusPill from "./StatusPill";

export const QuickFilters = ({ value, onChange }) => (
  <div>
    <p className="mb-2 text-xs font-semibold text-slate-600">ค้นหาด่วน</p>
    {/* มือถือ: เลื่อนแนวนอนชิดขอบจอ / จอใหญ่: ตัดบรรทัดแบบเดิม */}
    <div className="scroll-x -mx-4 flex gap-2 px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
      {QUICK_FILTERS.map(({ id, label, icon: Icon, tone }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-white shadow-sm transition md:py-1.5 ${tone} ${
            value === id ? "ring-2 ring-slate-400 ring-offset-2" : ""
          }`}
        >
          {Icon && <Icon size={13} />}
          {label}
        </button>
      ))}
    </div>
  </div>
);

// ─── การ์ดรายการ ──────────────────────────────────────────────────────────────
const TypeBadge = ({ type, status, className = "" }) => {
  if (status === "returned") {
    return (
      <span className={`flex items-center gap-1 rounded-md bg-sky-500 px-2 py-1 text-[11px] font-semibold text-white shadow ${className}`}>
        <CheckCircle2 size={12} />
        คืนของสำเร็จ
      </span>
    );
  }
  const isFound = type === "found";
  return (
    <span
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-white shadow ${
        isFound ? "bg-green-500" : "bg-orange-500"
      } ${className}`}
    >
      {isFound ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
      {isFound ? "ของที่พบ" : "ของหาย"}
    </span>
  );
};

const ItemImage = ({ item, className, iconSize }) =>
  item.image_url ? (
    <img src={`${API_URL}${item.image_url}`} alt={item.item_name} loading="lazy" decoding="async" className={className} />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-slate-300">
      <PackageOpen size={iconSize} />
    </div>
  );

// มือถือ: การ์ดแนวนอน (รูปซ้าย ข้อมูลขวา) / จอ sm ขึ้นไป: การ์ดแนวตั้งแบบเดิม
export const ItemCard = ({ item, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2.5 text-left shadow-(--shadow-card) transition active:scale-[0.99] sm:flex-col sm:gap-0 sm:rounded-xl sm:p-0 sm:shadow-sm sm:hover:-translate-y-0.5 sm:hover:shadow-md"
  >
    <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:aspect-4/3 sm:w-full sm:rounded-none">
      <ItemImage item={item} className="h-full w-full object-cover" iconSize={40} />
      <TypeBadge type={item.type} status={item.status} className="absolute left-1.5 top-1.5 sm:left-2 sm:top-2" />
    </div>

    <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5 sm:p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-1 text-sm font-bold text-slate-900">{item.item_name}</p>
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
          <Clock size={11} />
          {timeAgo(item.created_at || item.date)}
        </span>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Tag size={12} className="shrink-0" />
        <span className="truncate">{item.category || "ไม่ระบุหมวดหมู่"}</span>
      </p>
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <MapPin size={12} className="shrink-0" />
        <span className="truncate">{item.location || "ไม่ระบุสถานที่"}</span>
      </p>
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <CalendarDays size={12} className="shrink-0" />
        {formatThaiDate(item.date)}
      </p>
      {/* มือถือ: ป้ายสถานะ (จอใหญ่ดูในป๊อปอัพรายละเอียด) */}
      <div className="mt-auto sm:hidden">
        <StatusPill item={item} />
      </div>
    </div>
  </button>
);

// columns: จำนวนคอลัมน์บนจอใหญ่ (หน้าที่มีแถบตัวกรองด้านข้างใช้ 3)
export const ItemGrid = ({ loading, items, emptyText, onSelect, columns = "lg:grid-cols-4" }) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 ${columns}`} aria-busy="true" aria-label="กำลังโหลดรายการ">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-sm sm:block sm:rounded-xl sm:p-0">
            <div className="h-28 w-28 shrink-0 animate-pulse rounded-xl bg-slate-100 sm:h-44 sm:w-full sm:rounded-b-none" />
            <div className="flex-1 space-y-2 py-1 sm:p-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
          <PackageOpen size={28} aria-hidden="true" />
        </span>
        <p className="text-sm text-slate-500">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 ${columns}`}>
      {items.map((item) => (
        <ItemCard key={`${item.type}-${item.item_id}`} item={item} onClick={() => onSelect(item)} />
      ))}
    </div>
  );
};

// ─── เลขหน้า ─────────────────────────────────────────────────────────────────
const pageNumbers = (current, total) => {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [`gap-${p}`, p] : [p]));
};

export const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  const navClass =
    "tap flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0 md:min-w-0 md:rounded-lg";

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="เลขหน้า">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} className={navClass} aria-label="หน้าก่อนหน้า">
        <ChevronLeft size={14} /> <span className="hidden sm:inline">ก่อนหน้า</span>
      </button>
      {pageNumbers(page, totalPages).map((p) =>
        typeof p === "string" ? (
          <span key={p} className="px-1 text-xs text-slate-400">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`h-11 min-w-11 rounded-xl px-2 text-xs font-semibold md:h-8 md:min-w-8 md:rounded-lg ${
              p === page ? "gradient-primary text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === totalPages} className={navClass} aria-label="หน้าถัดไป">
        <span className="hidden sm:inline">ถัดไป</span> <ChevronRight size={14} />
      </button>
    </nav>
  );
};

// ─── ช่องทางติดต่อ ───────────────────────────────────────────────────────────
const CONTACT_LABEL = { email: "อีเมล", phone: "โทรศัพท์" };

export const ContactCard = ({ person, title }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
    {title && <p className="mb-2 text-xs font-semibold text-slate-500">{title}</p>}
    <p className="flex items-center gap-2 font-semibold text-slate-800">
      {person.profile_image ? (
        <img src={`${API_URL}${person.profile_image}`} alt="" className="h-6 w-6 rounded-full object-cover" />
      ) : (
        <UserRound size={16} className="text-slate-400" />
      )}
      {person.name || "-"}
    </p>
    <div className="mt-2 space-y-1 text-slate-600">
      {person.email && (
        <a href={`mailto:${person.email}`} className="flex items-center gap-2 hover:text-brand hover:underline">
          <Mail size={14} className="shrink-0" /> {person.email}
        </a>
      )}
      {person.phone && (
        <a href={`tel:${person.phone}`} className="flex items-center gap-2 hover:text-brand hover:underline">
          <Phone size={14} className="shrink-0" /> {person.phone}
        </a>
      )}
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <MessageCircle size={13} className="shrink-0" /> สะดวกให้ติดต่อทาง{CONTACT_LABEL[person.preferred_contact] || "อีเมล"}
      </p>
    </div>
  </div>
);

// ปุ่ม "ฉันเจอของชิ้นนี้" (โพสต์ของหาย) / "นี่ของฉัน" (โพสต์ของพบ)
const ClaimPanel = ({ item }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const isLost = item.type === "lost";
  const label = isLost ? "ฉันเจอของชิ้นนี้" : "นี่ของฉัน";

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await userApi.post("/api/claims", { item_type: item.type, item_id: item.item_id, message });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "ส่งข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-3 rounded-xl border border-brand-soft bg-brand-50/60 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand">
          <PartyPopper size={16} /> แจ้งเจ้าของโพสต์แล้ว ติดต่อได้ตามช่องทางนี้
        </p>
        {result.owner ? (
          <ContactCard person={result.owner} />
        ) : (
          <p className="text-sm text-slate-600">
            ติดต่อรับของได้ที่ <span className="font-semibold">{result.deposit_location || "จุดรับฝากของ"}</span>
          </p>
        )}
        <p className="text-xs text-slate-500">
          {isLost
            ? "เมื่อส่งของคืนแล้ว เจ้าของจะกดยืนยัน และคุณจะได้รับเครดิตการคืนของ"
            : "เมื่อได้รับของแล้ว กด “ได้รับของคืนแล้ว” ที่หน้าโพสต์ของฉัน เพื่อให้เครดิตผู้พบ"}
        </p>
        <Link to="/my-posts" className="inline-block text-xs font-semibold text-brand hover:underline">
          ไปหน้าโพสต์ของฉัน →
        </Link>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-semibold text-white"
      >
        <Handshake size={16} />
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <label htmlFor="claim-message" className="block text-sm font-semibold text-slate-800">
        {isLost ? "ข้อความถึงเจ้าของ (ไม่บังคับ)" : "บอกลักษณะที่ยืนยันว่าเป็นของคุณ (ไม่บังคับ)"}
      </label>
      <textarea
        id="claim-message"
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
        rows={3}
        placeholder={isLost ? "เช่น เจอที่โต๊ะชั้น 2 ฝากไว้ที่เคาน์เตอร์" : "เช่น ในกระเป๋ามีบัตรนิสิตชื่อ..."}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-xl gradient-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "กำลังส่ง..." : "ส่งและดูช่องทางติดต่อ"}
        </button>
      </div>
    </div>
  );
};

// ─── ป๊อปอัพรายละเอียดรายการ ────────────────────────────────────────────────────
const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 text-sm">
    <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
    <span className="w-20 shrink-0 text-slate-400 sm:w-24">{label}</span>
    <span className="font-medium leading-relaxed text-slate-800">{value}</span>
  </div>
);

export const ItemDetailModal = ({ item, onClose, onReport }) => {
  useEffect(() => {
    if (!item) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [item, onClose]);

  if (!item) return null;

  const isFound = item.type === "found";
  const currentStudentId = localStorage.getItem("student_id") || "";
  const isOwnPost = Boolean(currentStudentId) && item.student_id === currentStudentId;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.item_name}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-2xl sm:max-h-[90vh] sm:rounded-2xl sm:pb-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-56 w-full bg-slate-100 sm:h-60">
          <ItemImage item={item} className="h-full w-full object-contain" iconSize={48} />
          <TypeBadge type={item.type} status={item.status} className="absolute left-3 top-3" />
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow transition hover:bg-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <StatusPill item={item} className="mb-2" />
            <h2 className="text-lg font-bold text-slate-900">{item.item_name}</h2>
            <p className="mt-0.5 text-xs text-slate-400">รายงานเมื่อ {timeAgo(item.created_at || item.date)}</p>
          </div>

          <div className="space-y-3">
            <DetailRow icon={Tag} label="หมวดหมู่" value={item.category || "-"} />
            <DetailRow icon={CalendarDays} label={isFound ? "วันที่พบ" : "วันที่หาย"} value={formatThaiDate(item.date, "long")} />
            <DetailRow icon={MapPin} label={isFound ? "สถานที่พบ" : "สถานที่หาย"} value={item.location || "-"} />
            {item.item_color && <DetailRow icon={Palette} label="สี / จุดสังเกต" value={item.item_color} />}
            {item.deposit_location && <DetailRow icon={Building2} label="จุดรับของ" value={item.deposit_location} />}
            {item.description && <DetailRow icon={FileText} label="รายละเอียด" value={item.description} />}
          </div>

          {item.status === "returned" ? (
            <p className="flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
              <CheckCircle2 size={18} /> คืนของสำเร็จแล้ว — ปิดโพสต์นี้แล้ว
            </p>
          ) : isOwnPost ? (
            <Link
              to="/my-posts"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-soft py-2.5 text-sm font-semibold text-brand hover:bg-brand-50"
            >
              นี่คือโพสต์ของคุณ — จัดการโพสต์
            </Link>
          ) : (
            <ClaimPanel key={`${item.type}-${item.item_id}`} item={item} />
          )}

          {!isOwnPost && item.status !== "returned" && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReport(item);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
            >
              <Flag size={15} />
              รายงานโพสต์นี้
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
