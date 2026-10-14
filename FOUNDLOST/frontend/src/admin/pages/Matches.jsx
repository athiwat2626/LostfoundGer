import { useEffect, useState } from "react";
import { PackageOpen, MapPin, CalendarDays, ArrowRight, UserRound } from "lucide-react";
import adminApi from "../api/adminApi";
import { API_URL } from "../../component/itemUtils";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-";

const Thumb = ({ item }) => (
  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
    {item.image_url ? (
      <img src={`${API_URL}${item.image_url}`} alt="" className="h-full w-full object-cover" />
    ) : (
      <PackageOpen size={22} className="m-auto mt-4 text-slate-300" />
    )}
  </div>
);

const ItemSummary = ({ item }) => (
  <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-semibold text-slate-800">{item.item_name}</p>
    <p className="flex items-center gap-1 truncate text-xs text-slate-500">
      <MapPin size={11} className="shrink-0" /> {item.location || "-"}
    </p>
    <p className="flex items-center gap-1 text-xs text-slate-500">
      <CalendarDays size={11} className="shrink-0" /> {formatDate(item.date)}
    </p>
  </div>
);

// ระบบจับคู่อัตโนมัติ: โพสต์ของหายที่ยังไม่ได้คืน กับโพสต์ของพบที่อาจเป็นชิ้นเดียวกัน
const Matches = () => {
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .get("/admin/matches")
      .then((res) => setResults(res.data.results))
      .catch((err) => setError(err.response?.data?.message || "โหลดข้อมูลไม่สำเร็จ"));
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-900 sm:text-2xl">จับคู่อัตโนมัติ</h1>
      <p className="mb-5 text-sm text-slate-500 sm:mb-6">
        โพสต์ของหายที่ยังไม่ได้คืน และโพสต์ของพบที่ระบบคิดว่าอาจเป็นชิ้นเดียวกัน (จากหมวด ชื่อ สถานที่ และช่วงวันที่)
      </p>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {!results && !error && <div className="h-40 animate-pulse rounded-2xl bg-white shadow-sm" />}
      {results && results.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
          ยังไม่มีคู่ที่น่าจะตรงกัน
        </p>
      )}

      <div className="space-y-4">
        {results?.map(({ lost, matches }) => (
          <section key={lost.item_id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] lg:items-start">
              <div>
                <p className="mb-2 text-xs font-semibold text-orange-600">ของหาย</p>
                <div className="flex gap-3">
                  <Thumb item={lost} />
                  <ItemSummary item={lost} />
                </div>
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <UserRound size={12} /> {`${lost.first_name || ""} ${lost.last_name || ""}`.trim() || "ไม่ระบุเจ้าของ"}
                </p>
              </div>

              <ArrowRight size={20} className="hidden text-slate-300 lg:mt-10 lg:block" />

              <div>
                <p className="mb-2 text-xs font-semibold text-green-600">ของพบที่อาจตรงกัน</p>
                <ul className="space-y-2">
                  {matches.map((m) => (
                    <li key={m.item_id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                      <Thumb item={m} />
                      <ItemSummary item={m} />
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold text-brand">{m.score}%</p>
                        <p className="hidden max-w-32 text-[10px] leading-tight text-slate-400 sm:block">{m.reasons.join(" · ")}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Matches;
