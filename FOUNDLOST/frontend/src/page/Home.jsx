import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import UserLayout from "../component/UserLayout";
import {
  fetchItems,
  matchesFilter,
  matchesQuery,
  paginate,
  reportState,
} from "../component/itemUtils";
import { QuickFilters, ItemGrid, Pagination, ItemDetailModal } from "../component/itemUi";
import TypeTabs from "../component/TypeTabs";
import QuickReportButtons from "../component/QuickReportButtons";

// ─── แบนเนอร์ต้อนรับ (เปลี่ยนสไลด์อัตโนมัติ) ─────────────────────────────────────
const SLIDES = [
  { title: "ยินดีต้อนรับสู่ระบบแจ้งของพบ-ของหาย", subtitle: "Welcome to the Lost & Found System" },
  { title: "ทำของหาย? แจ้งได้ทันที", subtitle: "Report a lost item and let the community help you find it" },
  { title: "เจอของ? ช่วยส่งคืนเจ้าของ", subtitle: "Report a found item and earn a certificate of appreciation" },
];

const WelcomeBanner = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <section className="relative mt-5 overflow-hidden rounded-3xl gradient-hero px-5 py-6 text-center text-white shadow-md sm:mt-6 sm:rounded-2xl sm:px-6 sm:py-10">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/10" />
      <h2 className="relative text-lg font-bold sm:text-3xl">{slide.title}</h2>
      <p className="relative mt-1.5 text-xs text-white/90 sm:mt-2 sm:text-base">{slide.subtitle}</p>
      <div className="relative mt-4 flex justify-center gap-1.5 sm:mt-6">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`สไลด์ที่ ${i + 1}`}
            className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white/100" : "w-2 bg-white/50"}`}
          />
        ))}
      </div>
    </section>
  );
};

// ─── หน้าหลัก ────────────────────────────────────────────────────────────────
const Home = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState("all");
  const [typeTab, setTypeTab] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    // รวมของพบและของหายไว้ด้วยกัน เรียงจากใหม่ไปเก่า (ป้ายบนการ์ดบอกประเภท)
    Promise.all([fetchItems("found"), fetchItems("lost")]).then(([found, lost]) => {
      setItems(
        [...found, ...lost].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
      );
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) => (typeTab === "all" || item.type === typeTab) && matchesFilter(item, quickFilter) && matchesQuery(item, query)
      ),
    [items, typeTab, quickFilter, query]
  );
  const { totalPages, currentPage, pageItems } = paginate(filtered, page);

  // เปลี่ยนตัวกรองแล้วกลับไปหน้า 1
  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <UserLayout
      search={{ value: query, onChange: updateFilter(setQuery), placeholder: "ค้นหากุญแจ โทรศัพท์ กระเป๋า หรืออื่นๆ" }}
    >
      <ItemDetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onReport={(item) => navigate("/report", { state: reportState(item) })}
      />

      <WelcomeBanner />

      {/* มือถือ: ปุ่มแจ้งของหาย / แจ้งพบของ (จอใหญ่ใช้ปุ่ม "แจ้งสิ่งของ" ในแถบเมนูซ้าย) */}
      <QuickReportButtons className="mt-4 md:hidden" />

      <div className="mt-7 flex items-end justify-between gap-3 sm:mt-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">ค้นพบรายการต่างๆ</h1>
        <Link to="/search" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand hover:underline">
          <SlidersHorizontal size={14} /> ค้นหาขั้นสูง
        </Link>
      </div>

      <TypeTabs value={typeTab} onChange={updateFilter(setTypeTab)} items={items} className="mt-4" />

      <div className="mt-4">
        <QuickFilters value={quickFilter} onChange={updateFilter(setQuickFilter)} />
      </div>

      <section className="mt-6">
        <ItemGrid
          loading={loading}
          items={pageItems}
          emptyText={query || quickFilter !== "all" || typeTab !== "all" ? "ไม่พบรายการที่ตรงกับการค้นหา" : "ยังไม่มีรายการ"}
          onSelect={setSelected}
        />
      </section>

      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
    </UserLayout>
  );
};

export default Home;
