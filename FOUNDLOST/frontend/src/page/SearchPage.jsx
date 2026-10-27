import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X, RotateCcw, SearchX, WifiOff } from "lucide-react";
import UserLayout from "../component/UserLayout";
import TypeTabs from "../component/TypeTabs";
import { ItemGrid, Pagination, ItemDetailModal } from "../component/itemUi";
import { fetchItems, matchesQuery, paginate, reportState } from "../component/itemUtils";
import { useSiteSettings } from "../component/siteSettings";

const STATUS_OPTIONS = [
  { id: "all", label: "ทุกสถานะ" },
  { id: "open", label: "ยังไม่ได้คืน" },
  { id: "returned", label: "คืนของสำเร็จ" },
];
const EMPTY_FILTERS = { type: "all", category: "", location: "", from: "", to: "", status: "all" };

// วันที่ของรายการ (DATE จาก API เป็นเวลา UTC) → YYYY-MM-DD ตามเวลาเครื่องผู้ใช้
const localDate = (value) => (value ? new Date(value).toLocaleDateString("sv-SE") : "");

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 md:text-sm";

// ─── หน้าค้นหา: ค้นจากรายการของหาย + ของพบ (API เดิม GET /lostItem, /foundItem) แล้วกรองบนเครื่อง ───
const SearchPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const query = params.get("q") || "";
  const { categories } = useSiteSettings();

  // fetchItems คืน [] เมื่อโหลดไม่ได้ → ถ้าว่างทั้งคู่และออฟไลน์ ให้แสดงสถานะเชื่อมต่อไม่ได้
  const fetchAll = () =>
    Promise.all([fetchItems("lost"), fetchItems("found")]).then(([lost, found]) => {
      const all = [...lost, ...found].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
      setItems(all);
      setLoadFailed(all.length === 0 && !navigator.onLine);
      setLoading(false);
    });

  const load = () => {
    setLoading(true);
    setLoadFailed(false);
    fetchAll();
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const setQuery = (value) => {
    setParams(value ? { q: value } : {}, { replace: true });
    setPage(1);
  };
  const setFilter = (name, value) => {
    setFilters((prev) => {
      const next = { ...prev, [name]: value };
      // พิมพ์วันที่เองได้ข้าม min/max ของช่อง → ถ้าช่วงกลับด้านให้สลับให้ถูก
      if (next.from && next.to && next.from > next.to) [next.from, next.to] = [next.to, next.from];
      return next;
    });
    setPage(1);
  };
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setQuery("");
  };

  const activeCount = ["category", "location", "from", "to"].filter((k) => filters[k]).length + (filters.status !== "all" ? 1 : 0);

  const filtered = useMemo(() => {
    const location = filters.location.trim().toLowerCase();
    return items.filter((item) => {
      if (filters.type !== "all" && item.type !== filters.type) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (location && !String(item.location || "").toLowerCase().includes(location)) return false;
      if (filters.status !== "all" && (item.status || "open") !== filters.status) return false;
      const date = localDate(item.date);
      if (filters.from && date < filters.from) return false;
      if (filters.to && date > filters.to) return false;
      return matchesQuery(item, query);
    });
  }, [items, filters, query]);
  const { totalPages, currentPage, pageItems } = paginate(filtered, page);
  const hasCriteria = Boolean(query) || activeCount > 0 || filters.type !== "all";

  return (
    <UserLayout search={{ value: query, onChange: setQuery, placeholder: "ค้นหาชื่อสิ่งของ สถานที่ หรือคำสำคัญ" }}>
      <ItemDetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onReport={(item) => navigate("/report", { state: reportState(item) })}
      />

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">ค้นหาสิ่งของ</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm" aria-live="polite">
            {loading ? "กำลังโหลด..." : `พบ ${filtered.length} จาก ${items.length} รายการ`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="search-filters"
          className="tap relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm md:hidden"
        >
          <SlidersHorizontal size={16} /> ตัวกรอง
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] text-white">{activeCount}</span>
          )}
        </button>
      </div>

      <TypeTabs value={filters.type} onChange={(v) => setFilter("type", v)} items={items} className="mt-4" />

      <div className="mt-4 grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
        {/* ── ตัวกรอง (มือถือ: กดเปิด/ปิด / จอใหญ่: แสดงตลอด) ── */}
        <aside id="search-filters" className={`${showFilters ? "block" : "hidden"} card self-start p-4 md:block`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">ตัวกรอง</h2>
            <button type="button" onClick={() => setShowFilters(false)} aria-label="ซ่อนตัวกรอง" className="tap -mr-2 flex items-center justify-center rounded-full text-slate-400 md:hidden">
              <X size={18} />
            </button>
          </div>

          <fieldset>
            <legend className={labelClass}>หมวดหมู่</legend>
            <div className="flex flex-wrap gap-2">
              {[{ value: "", label: "ทั้งหมด" }, ...categories].map(({ value, label, icon: Icon }) => {
                const active = filters.category === value;
                return (
                  <button
                    key={value || "all"}
                    type="button"
                    onClick={() => setFilter("category", value)}
                    aria-pressed={active}
                    className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                      active ? "border-brand bg-brand-50 text-brand" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {Icon && <Icon size={13} aria-hidden="true" />}
                    {label || value}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-4">
            <label htmlFor="filter-location" className={labelClass}>สถานที่</label>
            <input
              id="filter-location"
              value={filters.location}
              onChange={(e) => setFilter("location", e.target.value)}
              placeholder="เช่น อาคาร, ห้องสมุด"
              className={inputClass}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="filter-from" className={labelClass}>ตั้งแต่วันที่</label>
              <input id="filter-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter("from", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="filter-to" className={labelClass}>ถึงวันที่</label>
              <input id="filter-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter("to", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="filter-status" className={labelClass}>สถานะ</label>
            <select id="filter-status" value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasCriteria}
            className="tap mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <RotateCcw size={15} /> ล้างตัวกรอง
          </button>
        </aside>

        {/* ── ผลลัพธ์ ── */}
        <section aria-label="ผลการค้นหา">
          {loadFailed ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
              <WifiOff size={30} className="text-slate-300" aria-hidden="true" />
              <p className="text-sm text-slate-600">โหลดรายการไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</p>
              <button type="button" onClick={load} className="tap rounded-xl gradient-primary px-5 text-sm font-semibold text-white">ลองอีกครั้ง</button>
            </div>
          ) : !loading && filtered.length === 0 && hasCriteria ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                <SearchX size={28} aria-hidden="true" />
              </span>
              <p className="font-semibold text-slate-800">ไม่พบรายการที่ตรงกับการค้นหา</p>
              <p className="text-sm text-slate-500">ลองเปลี่ยนคำค้นหา หรือลดตัวกรองลง</p>
              <button type="button" onClick={clearFilters} className="tap mt-1 rounded-xl border border-brand-soft px-5 text-sm font-semibold text-brand hover:bg-brand-50">
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <ItemGrid loading={loading} items={pageItems} emptyText="ยังไม่มีรายการในระบบ" onSelect={setSelected} columns="lg:grid-cols-3" />
          )}
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </section>
      </div>
    </UserLayout>
  );
};

export default SearchPage;
