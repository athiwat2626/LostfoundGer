import { useEffect, useState } from "react";
import {
  Search as SearchIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCog,
  Package,
  FileWarning,
  KeyRound,
  RotateCcw,
  History,
  SlidersHorizontal,
} from "lucide-react";
import adminApi from "../api/adminApi";

const PAGE_SIZE = 30;

// ชื่อการกระทำภาษาไทย (action ใน admin_audit_logs)
const ACTION_LABEL = {
  "report.dismiss": "ยกเลิกรายงาน",
  "report.warn": "ออกคำเตือนจากรายงาน",
  "report.suspend": "ระงับบัญชีจากรายงาน",
  "report.ban": "แบนจากรายงาน",
  "user.warn": "ออกคำเตือนผู้ใช้",
  "user.suspend": "ระงับบัญชี",
  "user.ban": "แบนถาวร",
  "user.unsuspend": "ยกเลิกการระงับ",
  "user.unban": "ยกเลิกการแบน",
  "item.create": "เพิ่มรายการ",
  "item.update": "แก้ไขรายการ",
  "item.delete": "ลบรายการ",
  "admin.login": "เข้าสู่ระบบ",
  "admin.login_failed": "เข้าสู่ระบบไม่สำเร็จ",
  "admin.profile_update": "เปลี่ยนชื่อที่แสดง",
  "admin.password_change": "เปลี่ยนรหัสผ่าน",
  "admin.password_change_failed": "เปลี่ยนรหัสผ่านไม่สำเร็จ",
  "settings.update": "แก้ไขค่าระบบ",
};

const GROUPS = [
  { id: "", label: "ทุกประเภท" },
  { id: "report", label: "รายงาน", icon: FileWarning, tone: "bg-amber-50 text-amber-600" },
  { id: "user", label: "ผู้ใช้", icon: UserCog, tone: "bg-sky-50 text-sky-600" },
  { id: "item", label: "รายการ", icon: Package, tone: "bg-brand-50 text-brand" },
  { id: "admin", label: "บัญชีแอดมิน", icon: KeyRound, tone: "bg-slate-100 text-slate-600" },
  { id: "settings", label: "ค่าระบบ", icon: SlidersHorizontal, tone: "bg-violet-100 text-violet-700" },
];
const groupOf = (action) => GROUPS.find((g) => g.id && action.startsWith(`${g.id}.`)) || GROUPS[4];
// เหตุการณ์ที่ควรสังเกต (ลบ/แบน/ล็อกอินล้มเหลว)
const isSensitive = (action) => /delete|ban$|failed/.test(action);

const FIELD_LABEL = {
  item_name: "ชื่อสิ่งของ",
  category: "หมวดหมู่",
  item_color: "สี/จุดสังเกต",
  found_location: "สถานที่พบ",
  lost_location: "สถานที่หาย",
  description: "รายละเอียด",
  deposit_location: "จุดรับฝาก",
  found_date: "วันที่พบ",
  lost_date: "วันที่หาย",
  warning_count: "จำนวนคำเตือน",
  suspended_until: "ระงับถึง",
  is_banned: "ถูกแบน",
  display_name: "ชื่อที่แสดง",
  match_min_score: "เกณฑ์คะแนนการจับคู่",
  certificate_milestone: "เกียรติบัตรทุกกี่ครั้ง",
  certificate_signer_name: "ชื่อผู้ลงนาม",
  certificate_signer_title: "ตำแหน่งผู้ลงนาม",
  suspend_durations: "ตัวเลือกวันระงับ",
  categories: "หมวดหมู่สิ่งของ",
  deposit_points: "จุดรับฝากของ",
  announcement: "ประกาศ",
  maintenance: "โหมดปิดปรับปรุง",
};

const formatDateTime = (value) =>
  new Date(value).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "ใช่" : "ไม่ใช่";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-brand sm:rounded-lg sm:py-2 sm:text-sm";

// รายละเอียดของบันทึก: ตารางค่าก่อน → หลัง หรือข้อมูลอื่น ๆ
const LogDetails = ({ log }) => {
  const { changes, deleted, ...rest } = log.details || {};
  const extra = Object.entries(rest).filter(([, v]) => v !== null && v !== undefined);
  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-3 text-xs">
      {changes && Object.keys(changes).length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="pb-1 pr-2 font-medium">ช่อง</th>
              <th className="pb-1 pr-2 font-medium">ก่อน</th>
              <th className="pb-1 font-medium">หลัง</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(changes).map(([field, { from, to }]) => (
              <tr key={field} className="align-top">
                <td className="py-1 pr-2 font-semibold text-slate-600">{FIELD_LABEL[field] || field}</td>
                <td className="py-1 pr-2 text-red-600 line-through decoration-red-300">{formatValue(from)}</td>
                <td className="py-1 text-emerald-700">{formatValue(to)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {changes && Object.keys(changes).length === 0 && <p className="text-slate-500">ไม่มีข้อมูลที่เปลี่ยนแปลง</p>}
      {deleted && (
        <div>
          <p className="mb-1 font-semibold text-slate-600">ข้อมูลก่อนลบ</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {Object.entries(deleted)
              .filter(([k, v]) => v !== null && FIELD_LABEL[k])
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-slate-400">{FIELD_LABEL[k]}</dt>
                  <dd className="break-words text-slate-700">{formatValue(v)}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}
      {extra.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          {extra.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-400">{FIELD_LABEL[k] || k}</dt>
              <dd className="break-words text-slate-700">{formatValue(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-slate-400">
        บันทึก #{log.log_id}
        {log.ip_address && ` · IP ${log.ip_address}`}
      </p>
    </div>
  );
};

const LogRow = ({ log }) => {
  const [open, setOpen] = useState(false);
  const group = groupOf(log.action);
  const Icon = group.icon || History;
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  return (
    <li className={`rounded-2xl border bg-white p-3.5 shadow-sm ${isSensitive(log.action) ? "border-red-200" : "border-slate-100"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${group.tone}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={`text-xs font-semibold ${isSensitive(log.action) ? "text-red-600" : "text-slate-500"}`}>
              {ACTION_LABEL[log.action] || log.action}
            </span>
            <span className="text-[11px] text-slate-400">{formatDateTime(log.created_at)}</span>
          </span>
          <span className="mt-0.5 block text-sm text-slate-800">{log.summary}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            โดย {log.admin_name ? `${log.admin_name} (${log.admin_email})` : log.admin_email || "ไม่ทราบ"}
          </span>
        </span>
        {hasDetails && (
          <ChevronDown size={18} className={`mt-1 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="mt-3">
          <LogDetails log={log} />
        </div>
      )}
    </li>
  );
};

// ─── หน้าประวัติการดำเนินการ (audit log) ───────────────────────────────────────
const AuditLog = () => {
  const [filters, setFilters] = useState({ group: "", admin_id: "", q: "", from: "", to: "" });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ logs: [], total: 0, admins: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ค้นหาด้วยข้อความ: รอพิมพ์เสร็จก่อนค่อยเรียก API
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(filters);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v));
    adminApi
      .get("/admin/audit-logs", { params: { ...params, limit: PAGE_SIZE, offset: page * PAGE_SIZE } })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setError("");
      })
      .catch((err) => !cancelled && setError(err.response?.data?.message || "โหลดประวัติไม่สำเร็จ"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, page]);

  const setFilter = (name, value) => setFilters((prev) => ({ ...prev, [name]: value }));
  const hasFilters = Object.values(filters).some(Boolean);
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-900 sm:text-2xl">ประวัติการดำเนินการ</h1>
      <p className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
        <ShieldCheck size={15} className="text-brand" aria-hidden="true" />
        บันทึกทุกการกระทำของแอดมิน แก้ไขหรือลบไม่ได้ · ทั้งหมด {data.total} รายการ
      </p>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="ค้นหา รหัสนิสิต, หมายเลขรายการ, อีเมล..."
            aria-label="ค้นหาประวัติ"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={filters.group} onChange={(e) => setFilter("group", e.target.value)} aria-label="ประเภท" className={inputClass}>
          {GROUPS.map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
        <select value={filters.admin_id} onChange={(e) => setFilter("admin_id", e.target.value)} aria-label="แอดมิน" className={inputClass}>
          <option value="">แอดมินทุกคน</option>
          {data.admins.map((a) => (
            <option key={a.admin_id} value={a.admin_id}>{a.display_name || a.email}</option>
          ))}
        </select>
        <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter("from", e.target.value)} aria-label="ตั้งแต่วันที่" className={inputClass} />
        <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter("to", e.target.value)} aria-label="ถึงวันที่" className={inputClass} />
        <button
          type="button"
          onClick={() => setFilters({ group: "", admin_id: "", q: "", from: "", to: "" })}
          disabled={!hasFilters}
          className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 sm:rounded-lg"
        >
          <RotateCcw size={14} /> ล้าง
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      ) : data.logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <History size={28} className="text-slate-300" aria-hidden="true" />
          <p className="text-sm text-slate-500">{hasFilters ? "ไม่พบประวัติที่ตรงกับตัวกรอง" : "ยังไม่มีประวัติการดำเนินการ"}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {data.logs.map((log) => (
            <LogRow key={log.log_id} log={log} />
          ))}
        </ul>
      )}

      {data.total > PAGE_SIZE && (
        <nav className="mt-6 flex items-center justify-center gap-3" aria-label="เลขหน้า">
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 disabled:opacity-40"
          >
            <ChevronLeft size={15} /> ก่อนหน้า
          </button>
          <span className="text-sm text-slate-500">
            หน้า {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page + 1 >= totalPages}
            className="flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 disabled:opacity-40"
          >
            ถัดไป <ChevronRight size={15} />
          </button>
        </nav>
      )}
    </div>
  );
};

export default AuditLog;
