import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../component/UserLayout";
import {
  fetchItems,
  matchesFilter,
  matchesQuery,
  paginate,
  reportState,
} from "../component/itemUtils";
import { QuickFilters, ItemGrid, Pagination, ItemDetailModal } from "../component/itemUi";

const PAGES = {
  found: {
    title: "รายการของที่พบ",
    subtitle: "ของที่มีผู้พบและรายงานเข้าสู่ระบบ",
    empty: "ยังไม่มีรายการของที่พบ",
    search: "ค้นหาของที่พบ เช่น โทรศัพท์ กระเป๋า กุญแจ",
  },
  lost: {
    title: "รายการของที่หาย",
    subtitle: "ของที่มีผู้รายงานว่าสูญหาย",
    empty: "ยังไม่มีรายการของที่หาย",
    search: "ค้นหาของหาย เช่น โทรศัพท์ กระเป๋า กุญแจ",
  },
};

// หน้ารายการของที่พบ / ของที่หาย (ใช้ร่วมกันทั้งสองแบบ)
const ItemListPage = ({ type }) => {
  const navigate = useNavigate();
  const page = PAGES[type];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [pageNo, setPageNo] = useState(1);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchItems(type).then((list) => {
      setItems(list);
      setLoading(false);
    });
  }, [type]);

  const filtered = useMemo(
    () => items.filter((item) => matchesFilter(item, quickFilter) && matchesQuery(item, query)),
    [items, quickFilter, query]
  );
  const { totalPages, currentPage, pageItems } = paginate(filtered, pageNo);

  const updateFilter = (setter) => (value) => {
    setter(value);
    setPageNo(1);
  };

  return (
    <UserLayout search={{ value: query, onChange: updateFilter(setQuery), placeholder: page.search }}>
      <ItemDetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onReport={(item) => navigate("/report", { state: reportState(item) })}
      />

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{page.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {page.subtitle} — {items.length} รายการ
          </p>
        </div>

        <QuickFilters value={quickFilter} onChange={updateFilter(setQuickFilter)} />
      </div>

      <section className="mt-6">
        <ItemGrid
          loading={loading}
          items={pageItems}
          emptyText={query || quickFilter !== "all" ? "ไม่พบรายการที่ตรงกับการค้นหา" : page.empty}
          onSelect={setSelected}
        />
      </section>

      <Pagination page={currentPage} totalPages={totalPages} onChange={setPageNo} />
    </UserLayout>
  );
};

export default ItemListPage;
