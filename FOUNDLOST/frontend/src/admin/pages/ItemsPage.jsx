import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search as SearchIcon,
  Eye,
  Pencil,
  Trash2,
  PackageOpen,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  SearchX,
  Users as UsersIcon,
  MapPin,
} from "lucide-react";
import adminApi from "../api/adminApi";
import StatTile from "../components/StatTile";
import ConfirmDialog from "../../component/ConfirmDialog";
import ItemStatusBadge from "../components/items/ItemStatusBadge";
import ItemFormModal from "../components/items/ItemFormModal";
import ItemDetailModal from "../components/items/ItemDetailModal";
import { ITEM_TYPES, STATUS_FILTERS, formatDate, ownerName } from "../components/items/itemMeta";
import { useSiteSettings } from "../../component/siteSettings";
import { API_URL } from "../../component/itemUtils";

const PAGE_SIZE = 20;
const EMPTY_FILTERS = { status: "", category: "", from: "", to: "" };
const controlClass =
  "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 sm:text-sm";

// วันที่ N วันก่อนหน้า (YYYY-MM-DD ตามเวลาเครื่อง) — ใช้กับการ์ด "แจ้งใหม่ 7 วัน"
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("sv-SE");
};

const Thumb = ({ item, size = "h-14 w-14" }) => (
  <span className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100`}>
    {item.image_url ? (
      <img src={`${API_URL}${item.image_url}`} alt="" loading="lazy" className="h-full w-full object-cover" />
    ) : (
      <PackageOpen size={20} className="text-slate-300" aria-hidden="true" />
    )}
  </span>
);

const ActionButtons = ({ item, onView, onEdit, onDelete, large = false }) => {
  const size = large ? "h-11 w-11" : "h-9 w-9";
  return (
    <div className="flex items-center justify-end gap-1">
      <button type="button" onClick={() => onView(item)} title="ดูรายละเอียด" aria-label={`ดูรายละเอียด ${item.item_name}`} className={`flex ${size} items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800`}>
        <Eye size={17} />
      </button>
      <button type="button" onClick={() => onEdit(item)} title="แก้ไข" aria-label={`แก้ไข ${item.item_name}`} className={`flex ${size} items-center justify-center rounded-lg text-brand transition hover:bg-brand-50`}>
        <Pencil size={16} />
      </button>
      <button type="button" onClick={() => onDelete(item)} title="ลบ" aria-label={`ลบ ${item.item_name}`} className={`flex ${size} items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600`}>
        <Trash2 size={16} />
      </button>
    </div>
  );
};

const OwnerCell = ({ item }) =>
  item.student_id ? (
    <span className="block min-w-0">
      <span className="block truncate text-slate-700" title={ownerName(item) || item.student_id}>{ownerName(item) || "ไม่พบข้อมูลผู้ใช้"}</span>
      <span className="block truncate text-xs text-slate-400">{item.student_id}</span>
    </span>
  ) : (
    <span className="text-xs text-slate-400">ไม่ระบุผู้แจ้ง</span>
  );

// เลขหน้าแบบย่อ: 1 … 4 5 6 … 12
const pageNumbers = (current, total) => {
  const pages = [...new Set([1, total, current - 1, current, current + 1])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? [`gap-${p}`, p] : [p]));
};

// ─── หน้าจัดการรายการของหาย / ของพบ (ใช้ร่วมกันผ่าน prop `type`) ──────────────────
const ItemsPage = ({ type }) => {
  const meta = ITEM_TYPES[type];
  const { categoryNames } = useSiteSettings();

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState({ key: null, items: [], total: 0, error: "" });
  const [summary, setSummary] = useState({ summary: null, categories: [] });

  const [viewing, setViewing] = useState(null); // item_id
  const [editing, setEditing] = useState(null); // item | "new"
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toast, setToast] = useState(null); // { type, text }

  // คำค้นหา: รอพิมพ์เสร็จ 300ms แล้วค่อยค้น (กลับไปหน้าแรก)
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(qInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [qInput]);

  const requestKey = JSON.stringify({ type, q, filters, page, reloadKey });
  const loading = list.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    const params = { type, limit: PAGE_SIZE, offset: page * PAGE_SIZE, q: q || undefined };
    Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
    adminApi
      .get("/admin/items/search", { params })
      .then((res) => !cancelled && setList({ key: requestKey, items: res.data.items, total: res.data.total, error: "" }))
      .catch((err) => !cancelled && setList({ key: requestKey, items: [], total: 0, error: err.response?.data?.message || "โหลดรายการไม่สำเร็จ" }));
    return () => {
      cancelled = true;
    };
  }, [requestKey, type, q, filters, page]);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .get("/admin/items/summary", { params: { type } })
      .then((res) => !cancelled && setSummary({ summary: res.data.summary, categories: res.data.categories }))
      .catch(() => !cancelled && setSummary((prev) => ({ ...prev, summary: null })));
    return () => {
      cancelled = true;
    };
  }, [type, reloadKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // หมวดหมู่ในตัวกรอง = หมวดจากค่าระบบ + หมวดที่มีอยู่จริงในรายการ
  const categoryOptions = useMemo(() => [...new Set([...categoryNames, ...summary.categories])], [categoryNames, summary.categories]);

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(0);
  };
  const hasFilters = Boolean(qInput || Object.values(filters).some(Boolean));
  const clearFilters = () => {
    setQInput("");
    setQ("");
    setFilters(EMPTY_FILTERS);
    setPage(0);
  };
  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await adminApi.delete(`/admin/items/${type}/${deleting.item_id}`);
      setToast({ type: "success", text: `ลบ "${deleting.item_name}" แล้ว` });
      // ลบรายการสุดท้ายของหน้า → ถอยกลับหนึ่งหน้า
      if (list.items.length === 1 && page > 0) setPage((p) => p - 1);
      setDeleting(null);
      setViewing(null);
      refresh();
    } catch (err) {
      setToast({ type: "error", text: err.response?.data?.message || "ลบไม่สำเร็จ" });
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const s = summary.summary;
  const recentFrom = daysAgo(6);
  const cards = [
    { key: "all", icon: Layers, label: "ทั้งหมด", value: s?.total, color: "slate", active: !filters.status && !filters.from, onClick: () => setFilters(EMPTY_FILTERS) },
    { key: "recent", icon: Sparkles, label: "แจ้งเข้ามา 7 วันล่าสุด", value: s?.recent, color: "blue", active: filters.from === recentFrom && !filters.to, onClick: () => setFilters({ ...EMPTY_FILTERS, from: recentFrom }) },
    { key: "open", icon: Clock, label: type === "lost" ? "กำลังตามหา" : "รอเจ้าของมารับ", value: s?.open, color: type === "lost" ? "orange" : "emerald", active: filters.status === "open", onClick: () => setFilters({ ...EMPTY_FILTERS, status: "open" }) },
    { key: "returned", icon: CheckCircle2, label: type === "lost" ? "ได้รับคืนแล้ว" : "ส่งคืนเจ้าของแล้ว", value: s?.returned, color: "blue", active: filters.status === "returned", onClick: () => setFilters({ ...EMPTY_FILTERS, status: "returned" }) },
  ];

  const totalPages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  const firstShown = list.total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastShown = Math.min((page + 1) * PAGE_SIZE, list.total);
  const actions = { onView: (item) => setViewing(item.item_id), onEdit: (item) => setEditing(item), onDelete: (item) => setDeleting(item) };

  return (
    <div className="pb-[env(safe-area-inset-bottom)]">
      {/* ── หัวหน้า ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
            {meta.title}
            {s && <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-semibold text-brand">{s.total.toLocaleString("th-TH")} รายการ</span>}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{meta.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl gradient-primary px-4 text-sm font-semibold text-white"
        >
          <Plus size={18} aria-hidden="true" /> เพิ่มรายการ
        </button>
      </div>

      {/* ── การ์ดสรุป (กดเพื่อกรอง) ── */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) =>
          s ? (
            <StatTile key={c.key} icon={c.icon} label={c.label} value={(c.value ?? 0).toLocaleString("th-TH")} color={c.color} active={c.active} onClick={c.onClick} wrapLabel />
          ) : (
            <div key={c.key} className="h-[74px] animate-pulse rounded-2xl bg-white shadow-sm" />
          )
        )}
      </div>

      {/* ── ค้นหาและตัวกรอง ── */}
      <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="ค้นหาชื่อสิ่งของ หรือรหัสนิสิต"
              aria-label="ค้นหาชื่อสิ่งของ หรือรหัสนิสิต"
              className={`${controlClass} pl-9`}
            />
          </div>
          <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} aria-label="สถานะ" className={controlClass}>
            {STATUS_FILTERS(type).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select value={filters.category} onChange={(e) => setFilter("category", e.target.value)} aria-label="หมวดหมู่" className={controlClass}>
            <option value="">ทุกหมวดหมู่</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter("from", e.target.value)} aria-label="แจ้งตั้งแต่วันที่" title="แจ้งตั้งแต่วันที่" className={controlClass} />
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter("to", e.target.value)} aria-label="แจ้งถึงวันที่" title="แจ้งถึงวันที่" className={controlClass} />
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <RotateCcw size={14} aria-hidden="true" /> ล้างตัวกรอง
          </button>
        </div>
        <p className="mt-2 px-1 text-xs text-slate-500" aria-live="polite">
          {loading ? "กำลังค้นหา..." : `พบ ${list.total.toLocaleString("th-TH")} รายการ${hasFilters ? " ตามตัวกรอง" : ""}`}
        </p>
      </div>

      {toast && (
        <p
          role={toast.type === "error" ? "alert" : "status"}
          className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
            toast.type === "error" ? "border-red-200 bg-red-50 text-red-600" : "border-brand-soft/50 bg-brand-50 text-brand"
          }`}
        >
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.text}
        </p>
      )}

      {/* ── รายการ ── */}
      {list.error && !loading ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
          <AlertCircle size={28} className="text-red-400" aria-hidden="true" />
          <p className="text-sm text-slate-600">{list.error}</p>
          <button type="button" onClick={refresh} className="min-h-10 rounded-lg gradient-primary px-5 text-sm font-semibold text-white">ลองอีกครั้ง</button>
        </div>
      ) : !loading && list.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            {hasFilters ? <SearchX size={26} aria-hidden="true" /> : <PackageOpen size={26} aria-hidden="true" />}
          </span>
          <p className="font-semibold text-slate-700">{hasFilters ? "ไม่พบรายการที่ตรงกับการค้นหา" : `ยังไม่มี${type === "lost" ? "รายการแจ้งของหาย" : "รายการแจ้งพบของ"}`}</p>
          {hasFilters ? (
            <button type="button" onClick={clearFilters} className="min-h-10 rounded-lg border border-brand-soft px-4 text-sm font-semibold text-brand hover:bg-brand-50">ล้างตัวกรอง</button>
          ) : (
            <button type="button" onClick={() => setEditing("new")} className="min-h-10 rounded-lg gradient-primary px-4 text-sm font-semibold text-white">เพิ่มรายการแรก</button>
          )}
        </div>
      ) : (
        <>
          {/* มือถือ: การ์ด */}
          <ul className="space-y-2.5 md:hidden" aria-busy={loading}>
            {loading
              ? [0, 1, 2, 3].map((i) => <li key={i} className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />)
              : list.items.map((item) => (
                  <li key={item.item_id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                    <button type="button" onClick={() => actions.onView(item)} className="flex w-full items-start gap-3 text-left">
                      <Thumb item={item} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="truncate font-semibold text-slate-900">{item.item_name}</span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                          <MapPin size={12} className="shrink-0" aria-hidden="true" /> {item[meta.locationField] || "-"}
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-400">
                          {ownerName(item) || item.student_id || "ไม่ระบุผู้แจ้ง"} · แจ้ง {formatDate(item.created_at)}
                        </span>
                      </span>
                    </button>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-50 pt-2">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <ItemStatusBadge type={type} status={item.status} />
                        {item.pending_claims > 0 && item.status === "open" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            <UsersIcon size={11} aria-hidden="true" /> {item.pending_claims}
                          </span>
                        )}
                      </span>
                      <ActionButtons item={item} {...actions} large />
                    </div>
                  </li>
                ))}
          </ul>

          {/* แท็บเล็ต/เดสก์ท็อป: ตาราง */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:block">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-xs font-semibold text-slate-500">
                  <th scope="col" className="px-4 py-3">รายการ</th>
                  <th scope="col" className="hidden w-[18%] px-3 py-3 lg:table-cell">สถานที่</th>
                  <th scope="col" className="hidden w-[17%] px-3 py-3 lg:table-cell">ผู้แจ้ง</th>
                  <th scope="col" className="w-[14%] px-3 py-3">วันที่แจ้ง</th>
                  <th scope="col" className="w-[24%] px-3 py-3 lg:w-[17%]">สถานะ</th>
                  <th scope="col" className="w-[124px] px-3 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100" aria-busy={loading}>
                {loading
                  ? [0, 1, 2, 3, 4].map((i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-14 w-14 animate-pulse rounded-xl bg-slate-100" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                              <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  : list.items.map((item) => (
                      <tr key={item.item_id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => actions.onView(item)} className="flex w-full min-w-0 items-center gap-3 text-left" title={item.item_name}>
                            <Thumb item={item} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-slate-900 hover:text-brand">{item.item_name}</span>
                              <span className="block truncate text-xs text-slate-500">
                                {item.category || "ไม่ระบุหมวด"}
                                {item.item_color ? ` · ${item.item_color}` : ""}
                              </span>
                              <span className="block truncate text-xs text-slate-400 lg:hidden">{item[meta.locationField] || "-"}</span>
                              {/* แท็บเล็ต: ผู้แจ้งอยู่ใต้ชื่อรายการ (จอใหญ่มีคอลัมน์แยก) */}
                              <span className="block truncate text-xs text-slate-400 lg:hidden">
                                โดย {ownerName(item) || item.student_id || "ไม่ระบุผู้แจ้ง"}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="hidden px-3 py-3 lg:table-cell">
                          <span className="block truncate text-slate-600" title={item[meta.locationField] || ""}>{item[meta.locationField] || "-"}</span>
                          {item.deposit_location && (
                            <span className="block truncate text-xs text-slate-400" title={`จุดรับฝาก: ${item.deposit_location}`}>ฝากที่ {item.deposit_location}</span>
                          )}
                        </td>
                        <td className="hidden px-3 py-3 lg:table-cell"><OwnerCell item={item} /></td>
                        <td className="px-3 py-3">
                          <span className="block whitespace-nowrap text-slate-600">{formatDate(item.created_at)}</span>
                          <span className="block truncate text-xs text-slate-400" title={meta.dateLabel}>
                            {meta.dateLabel.replace("วันที่", "")} {formatDate(item[meta.dateField])}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <ItemStatusBadge type={type} status={item.status} />
                          {item.pending_claims > 0 && item.status === "open" && (
                            <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                              <UsersIcon size={11} aria-hidden="true" /> มีผู้ติดต่อ {item.pending_claims}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <ActionButtons item={item} {...actions} />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* ── แบ่งหน้า ── */}
          {list.total > 0 && (
            <nav className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="เลขหน้า">
              <p className="text-xs text-slate-500">
                แสดง {firstShown.toLocaleString("th-TH")}–{lastShown.toLocaleString("th-TH")} จาก {list.total.toLocaleString("th-TH")} รายการ · หน้า {page + 1}/{totalPages}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 0} aria-label="หน้าก่อนหน้า" className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
                    <ChevronLeft size={16} />
                  </button>
                  {pageNumbers(page + 1, totalPages).map((p) =>
                    typeof p === "string" ? (
                      <span key={p} className="px-1 text-xs text-slate-400">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p - 1)}
                        aria-current={p === page + 1 ? "page" : undefined}
                        className={`h-10 min-w-10 rounded-lg px-2 text-sm font-semibold ${p === page + 1 ? "gradient-primary text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages} aria-label="หน้าถัดไป" className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </nav>
          )}
        </>
      )}

      {viewing && (
        <ItemDetailModal
          type={type}
          itemId={viewing}
          onClose={() => setViewing(null)}
          onEdit={(item) => {
            setViewing(null);
            setEditing(item);
          }}
          onDelete={(item) => setDeleting(item)}
        />
      )}

      {editing && (
        <ItemFormModal
          type={type}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setToast({ type: "success", text });
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="ลบรายการนี้?"
        message={deleting ? `"${deleting.item_name}" และผู้ติดต่อที่เกี่ยวข้องจะถูกลบถาวร การลบจะถูกบันทึกในประวัติการดำเนินการ` : ""}
        confirmLabel="ลบรายการ"
        tone="danger"
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default ItemsPage;
