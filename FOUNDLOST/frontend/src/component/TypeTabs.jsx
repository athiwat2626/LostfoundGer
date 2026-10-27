// แท็บแยกประเภทรายการ: ทั้งหมด / ของหาย / ของที่พบ (แบบ segmented control)
const TABS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "lost", label: "ของหาย" },
  { id: "found", label: "ของที่พบ" },
];

const TypeTabs = ({ value, onChange, items, className = "" }) => {
  const count = (id) => (id === "all" ? items.length : items.filter((item) => item.type === id).length);

  return (
    <div role="tablist" aria-label="ประเภทรายการ" className={`grid grid-cols-3 rounded-2xl bg-slate-100 p-1 sm:inline-grid sm:rounded-xl ${className}`}>
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`tap flex items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1.5 text-[13px] font-semibold transition sm:min-h-0 sm:gap-1.5 sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm ${
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {items.length > 0 && <span className={`text-xs ${active ? "text-brand" : "text-slate-400"}`}>{count(tab.id)}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default TypeTabs;
