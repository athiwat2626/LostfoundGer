import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, MapPin, Clock, Tag, Filter, SearchX, X, CalendarDays, Palette, Building2, FileText } from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  { id: "กระเป๋า", label: "กระเป๋า" },
  { id: "กุญแจ", label: "กุญแจ" },
  { id: "เครื่องประดับ", label: "เครื่องประดับ" },
  { id: "อื่นๆ", label: "อื่นๆ" },
];

const CATEGORY_BADGE = {
  กระเป๋า: "bg-lime-100 text-lime-700 border-lime-200",
  กุญแจ: "bg-amber-100 text-amber-700 border-amber-200",
  เครื่องประดับ: "bg-sky-100 text-sky-700 border-sky-200",
  อื่นๆ: "bg-slate-100 text-slate-600 border-slate-200",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff} วินาทีที่แล้ว`;
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function ItemDetailModal({ item, onClose, onReport, currentStudentId }) {
  if (!item) return null;
  const raw = item.category || "อื่นๆ";
  const cat = ["กระเป๋า", "กุญแจ", "เครื่องประดับ"].includes(raw) ? raw : "อื่นๆ";
  const badgeStyle = CATEGORY_BADGE[cat] || CATEGORY_BADGE["อื่นๆ"];
  const isOwnPost = Boolean(currentStudentId) && item.student_id === currentStudentId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative w-full h-56 bg-slate-100 rounded-t-2xl overflow-hidden">
          {item.image_url ? (
            <img
              src={`http://localhost:3000${item.image_url}`}
              alt={item.item_name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
              <SearchX size={48} />
              <span className="text-sm">ไม่มีรูปภาพ</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{item.item_name}</h2>
            <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1 ${badgeStyle}`}>
              <Tag size={10} />
              {cat}
            </span>
          </div>

          {/* Info rows */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <CalendarDays size={16} className="text-slate-400 shrink-0" />
              <span className="text-slate-400 w-24 shrink-0">วันที่หาย</span>
              <span className="font-medium text-slate-800">{formatDate(item.lost_date)}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <MapPin size={16} className="text-slate-400 shrink-0" />
              <span className="text-slate-400 w-24 shrink-0">สถานที่หาย</span>
              <span className="font-medium text-slate-800">{item.lost_location || "-"}</span>
            </div>
            {item.deposit_location && (
              <div className="flex items-center gap-3 text-slate-600">
                <Building2 size={16} className="text-slate-400 shrink-0" />
                <span className="text-slate-400 w-24 shrink-0">จุดฝากของ</span>
                <span className="font-medium text-slate-800">{item.deposit_location}</span>
              </div>
            )}
            {item.item_color && (
              <div className="flex items-center gap-3 text-slate-600">
                <Palette size={16} className="text-slate-400 shrink-0" />
                <span className="text-slate-400 w-24 shrink-0">สี</span>
                <span className="font-medium text-slate-800">{item.item_color}</span>
              </div>
            )}
            {item.description && (
              <div className="flex items-start gap-3 text-slate-600">
                <FileText size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-400 w-24 shrink-0">รายละเอียด</span>
                <span className="font-medium text-slate-800 leading-relaxed">{item.description}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-slate-600">
              <Clock size={16} className="text-slate-400 shrink-0" />
              <span className="text-slate-400 w-24 shrink-0">รายงานเมื่อ</span>
              <span className="font-medium text-slate-800">{timeAgo(item.created_at || item.lost_date)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              แจ้งพบของ
            </button>
            {!isOwnPost && (
              <button
                onClick={() => { onClose(); onReport(item); }}
                className="border border-red-200 hover:bg-red-50 text-red-500 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                รายงาน
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, onReport, onDetail, currentStudentId }) {
  const raw = item.category || "อื่นๆ";
  const cat = ["กระเป๋า", "กุญแจ", "เครื่องประดับ"].includes(raw) ? raw : "อื่นๆ";
  const badgeStyle = CATEGORY_BADGE[cat] || CATEGORY_BADGE["อื่นๆ"];
  const isOwnPost = Boolean(currentStudentId) && item.student_id === currentStudentId;

  return (
    <article className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group">
      {/* Image */}
      <div className="w-full h-44 bg-slate-100 overflow-hidden">
        {item.image_url ? (
          <img
            src={`http://localhost:3000${item.image_url}`}
            alt={item.item_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
            <SearchX size={36} />
            <span className="text-xs">ไม่มีรูปภาพ</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h2 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
          {item.item_name}
        </h2>

        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 text-slate-400 text-xs">
            <Clock size={12} />
            {timeAgo(item.created_at || item.lost_date)}
          </span>
          {item.lost_location && (
            <span className="flex items-center gap-1 text-slate-400 text-xs">
              <MapPin size={12} />
              {item.lost_location}
            </span>
          )}
        </div>

        <span
          className={`self-start text-xs font-medium px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${badgeStyle}`}
        >
          <Tag size={10} />
          {cat}
        </span>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2">
          <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 rounded-lg transition-colors">
            แจ้งพบของ
          </button>
          <button
            onClick={() => onDetail(item)}
            className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium py-2 rounded-lg transition-colors">
            รายละเอียด
          </button>
          {!isOwnPost && (
            <button
              onClick={() => onReport(item)}
              className="border border-red-200 hover:bg-red-50 text-red-500 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              รายงาน
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

const LostPage = () => {
  const navigate = useNavigate();
  const currentStudentId = localStorage.getItem("student_id") || "";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:3000/lostItem")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const cat = item.category || "อื่นๆ";
      const normalizedCat = ["กระเป๋า", "กุญแจ", "เครื่องประดับ"].includes(cat) ? cat : "อื่นๆ";
      const matchCat = activeCategory === "all" || normalizedCat === activeCategory;
      const matchQ = (item.item_name || "").toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    });
  }, [items, activeCategory, query]);

  const handleReport = (item) => {
    navigate("/report", {
      state: {
        itemId: item.item_id,
        itemType: "lost",
        itemName: item.item_name,
        reportedUser: item.student_id,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onReport={handleReport}
        currentStudentId={currentStudentId}
      />
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">รายการของที่หาย</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              ของที่มีผู้รายงานว่าสูญหาย — {items.length} รายการ
            </p>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2.5 w-full sm:w-80">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาของหาย โทรศัพท์ กระเป๋า..."
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6 flex gap-6">
        {/* ── Sidebar Filter ── */}
        <aside className="hidden lg:flex flex-col gap-1 w-48 shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Filter size={12} />
            หมวดหมู่
          </p>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-left text-sm px-3.5 py-2 rounded-xl transition-colors font-medium ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                }`}
              >
                {cat.label}
                {isActive && (
                  <span className="ml-1.5 text-emerald-200 text-xs">
                    ({filteredItems.length})
                  </span>
                )}
              </button>
            );
          })}

          <hr className="my-3 border-slate-200" />

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            ดูเพิ่มเติม
          </p>
          <button
            onClick={() => navigate("/foundPage")}
            className="text-left text-sm px-3.5 py-2 rounded-xl text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-colors font-medium"
          >
            รายการของที่พบ →
          </button>
        </aside>

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0">
          {/* Mobile category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 lg:hidden scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full transition-colors ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Tab switch (mobile) */}
          <div className="flex gap-2 mb-5 lg:hidden">
            <button
              onClick={() => navigate("/foundPage")}
              className="flex-1 text-xs font-semibold py-2.5 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
            >
              ของที่พบ
            </button>
            <button className="flex-1 text-xs font-semibold py-2.5 rounded-xl bg-white text-slate-800 shadow-sm border border-slate-200">
              ของที่หาย
            </button>
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 h-64 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="text-center py-24 text-slate-400">
              <SearchX size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-base font-medium">
                {items.length === 0 ? "ยังไม่มีรายการของที่หาย" : "ไม่พบรายการที่ตรงกัน"}
              </p>
              <p className="text-sm mt-1">ลองเปลี่ยนหมวดหมู่หรือคำค้นหา</p>
            </div>
          )}

          {!loading && filteredItems.length > 0 && (
            <>
              <p className="text-xs text-slate-400 mb-4">
                แสดง {filteredItems.length} รายการ
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.item_id}
                    item={item}
                    onReport={handleReport}
                    onDetail={setSelectedItem}
                    currentStudentId={currentStudentId}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LostPage;
