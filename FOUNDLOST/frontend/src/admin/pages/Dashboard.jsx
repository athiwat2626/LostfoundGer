import { useEffect, useState } from "react";
import {
  Users,
  PackageCheck,
  Search,
  Clock,
  ShieldAlert,
  UserX,
  Ban,
  CheckCircle2,
  Leaf,
  Layers,
  UserPlus,
  Handshake,
  TriangleAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  Flag,
  ChevronRight,
  Table2,
  LineChart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import adminApi from "../api/adminApi";
import StatTile from "../components/StatTile";
import TrendChart, { TrendLegend, TrendTable } from "../components/TrendChart";

const RANGES = [
  { id: "24h", label: "24 ชม." },
  { id: "7d", label: "7 วัน" },
  { id: "30d", label: "30 วัน" },
];

// การ์ดตัวเลขหลักด้านบน
const KpiCard = ({ label, value, icon: Icon, iconTone, note, noteTone = "text-slate-500", noteIcon: NoteIcon }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-2 sm:gap-3">
      <p className="text-[11px] font-semibold uppercase leading-snug tracking-wide text-slate-500">{label}</p>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${iconTone}`}>
        <Icon size={18} />
      </span>
    </div>
    <p className="mt-1 text-2xl font-extrabold text-slate-900 sm:-mt-2 sm:text-3xl">{value.toLocaleString("th-TH")}</p>
    <p className={`mt-1.5 flex items-start gap-1 text-[11px] font-medium leading-snug sm:mt-2 sm:text-xs ${noteTone}`}>
      {NoteIcon && <NoteIcon size={13} className="mt-px shrink-0" />}
      {note}
    </p>
  </div>
);

// งานด่วนที่แอดมินควรจัดการ
const ActionRow = ({ icon: Icon, tone, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-left transition hover:border-brand-soft hover:bg-brand-50/60"
  >
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
      <Icon size={18} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-slate-800">{title}</span>
      <span className="block text-xs text-slate-500">{subtitle}</span>
    </span>
    <ChevronRight size={16} className="shrink-0 text-slate-400" />
  </button>
);

// เทียบผู้ใช้ใหม่ 24 ชม. กับ 24 ชม. ก่อนหน้า
const compareNewUsers = (now, prev) => {
  if (now === prev) return { note: "เท่ากับวันก่อน", tone: "text-slate-500", icon: Minus };
  if (prev === 0) return { note: `+${now} จากวันก่อน`, tone: "text-emerald-600", icon: TrendingUp };
  const pct = Math.round(((now - prev) / prev) * 100);
  return pct >= 0
    ? { note: `+${pct}% จากวันก่อน`, tone: "text-emerald-600", icon: TrendingUp }
    : { note: `${pct}% จากวันก่อน`, tone: "text-red-600", icon: TrendingDown };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState("24h");
  const [trend, setTrend] = useState({ range: "24h", points: [] });
  const [trendError, setTrendError] = useState("");
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    adminApi
      .get("/admin/dashboard/stats")
      .then((res) => setStats(res.data.stats))
      .catch((err) => setError(err.response?.data?.message || "โหลดข้อมูลไม่สำเร็จ"));
  }, []);

  useEffect(() => {
    let active = true;
    adminApi
      .get("/admin/dashboard/trend", { params: { range } })
      .then((res) => {
        if (!active) return;
        setTrend({ range: res.data.range, points: res.data.points });
        setTrendError("");
      })
      .catch(() => active && setTrendError("โหลดข้อมูลกราฟไม่สำเร็จ"));
    return () => {
      active = false;
    };
  }, [range]);

  const unresolved = stats ? stats.pendingReports + stats.underReviewReports : 0;
  const newUsers = stats ? compareNewUsers(stats.newUsers24h, stats.newUsersPrev24h) : null;
  const trendEmpty = trend.points.every((p) => p.lost === 0 && p.found === 0);

  return (
    <div>
      {/* Welcome banner */}
      <div className="relative mb-5 overflow-hidden rounded-2xl gradient-hero shadow-md px-5 py-6 sm:mb-6 sm:px-8 sm:py-10">
        <div className="relative z-10">
          <p className="text-sm text-white/80">ยินดีต้อนรับสู่</p>
          <h1 className="text-xl sm:text-3xl font-bold text-white">KU Lost&amp;Found</h1>
          <p className="mt-2 max-w-md text-sm text-white/90">
            พื้นที่กลางสำหรับการแจ้งของหายและพบของ มหาวิทยาลัยเกษตรศาสตร์
          </p>
          <p className="mt-1 text-sm font-medium text-lime-300">"ของหาย...อาจได้คืน"</p>
        </div>
        <Leaf className="absolute -right-6 -top-6 h-28 w-28 text-white/10 sm:h-36 sm:w-36" />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {stats && (
        <>
          {/* ตัวเลขหลัก */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <KpiCard
              label="โพสต์ทั้งหมดในระบบ"
              value={stats.totalLostItems + stats.totalFoundItems}
              icon={Layers}
              iconTone="bg-sky-50 text-sky-600"
              note={`+${stats.postsThisMonth.toLocaleString("th-TH")} เดือนนี้`}
              noteTone="text-emerald-600"
              noteIcon={TrendingUp}
            />
            <KpiCard
              label="ผู้ใช้ใหม่ (24 ชม.)"
              value={stats.newUsers24h}
              icon={UserPlus}
              iconTone="bg-emerald-50 text-emerald-600"
              note={newUsers.note}
              noteTone={newUsers.tone}
              noteIcon={newUsers.icon}
            />
            <KpiCard
              label="คืนของสำเร็จ"
              value={stats.successfulReturns}
              icon={Handshake}
              iconTone="bg-amber-50 text-amber-600"
              note="รวมทุกครั้งที่ยืนยันการคืนของ"
              noteTone="text-sky-600"
              noteIcon={CheckCircle2}
            />
            <KpiCard
              label="รายงานที่ยังไม่ได้จัดการ"
              value={unresolved}
              icon={TriangleAlert}
              iconTone="bg-red-50 text-red-600"
              note={unresolved > 0 ? "ต้องตรวจสอบ" : "ไม่มีรายงานค้าง"}
              noteTone={unresolved > 0 ? "text-red-600" : "text-emerald-600"}
              noteIcon={unresolved > 0 ? TrendingUp : CheckCircle2}
            />
          </div>

          <div className="mt-5 grid gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-3">
            {/* กราฟแนวโน้ม */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">แนวโน้มการแจ้ง</h2>
                  <p className="text-xs text-slate-500">จำนวนการแจ้งของหายและของพบที่เข้ามาในระบบ</p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <div className="flex flex-1 rounded-lg bg-slate-100 p-1 sm:flex-none">
                    {RANGES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRange(r.id)}
                        aria-pressed={range === r.id}
                        className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition sm:flex-none sm:py-1 ${
                          range === r.id ? "gradient-primary text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTable((v) => !v)}
                    title={showTable ? "ดูเป็นกราฟ" : "ดูเป็นตาราง"}
                    aria-label={showTable ? "ดูเป็นกราฟ" : "ดูเป็นตาราง"}
                    className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:text-slate-900"
                  >
                    {showTable ? <LineChart size={16} /> : <Table2 size={16} />}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {trendError ? (
                  <p className="py-16 text-center text-sm text-red-600">{trendError}</p>
                ) : showTable ? (
                  <TrendTable points={trend.points} range={trend.range} />
                ) : (
                  <TrendChart points={trend.points} range={trend.range} />
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <TrendLegend />
                {trendEmpty && !trendError && <p className="text-xs text-slate-400">ยังไม่มีการแจ้งในช่วงเวลานี้</p>}
              </div>
            </section>

            {/* งานที่ต้องจัดการ */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-bold text-slate-900">งานที่ต้องจัดการ</h2>
              <p className="text-xs text-slate-500">ทางลัดไปยังรายการที่รอดำเนินการ</p>
              <div className="mt-4 space-y-3">
                <ActionRow
                  icon={ShieldAlert}
                  tone="bg-red-50 text-red-600"
                  title="เนื้อหาไม่เหมาะสม"
                  subtitle={`${stats.flaggedContent} รายการที่ยังไม่ได้จัดการ`}
                  onClick={() => navigate("/admin/reports")}
                />
                <ActionRow
                  icon={Flag}
                  tone="bg-amber-50 text-amber-600"
                  title="รายงานรอตรวจสอบ"
                  subtitle={`${stats.pendingReports} รายการรอการตรวจสอบ`}
                  onClick={() => navigate("/admin/reports")}
                />
                <ActionRow
                  icon={UserX}
                  tone="bg-sky-50 text-sky-600"
                  title="ผู้ใช้ที่ถูกระงับ / แบน"
                  subtitle={`${stats.suspendedUsers + stats.bannedUsers} บัญชี`}
                  onClick={() => navigate("/admin/users")}
                />
              </div>
            </section>
          </div>

          {/* ภาพรวมทั้งหมด */}
          <h2 className="mb-3 mt-6 text-base font-bold text-slate-900 sm:mt-8">ภาพรวมทั้งหมด</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <StatTile
              icon={Users}
              label="จำนวนผู้ใช้งานทั้งหมด"
              sublabel="ผู้ใช้ที่ลงทะเบียน"
              value={stats.totalUsers}
              color="blue"
              onClick={() => navigate("/admin/users")}
            />
            <StatTile
              icon={Search}
              label="แจ้งของหาย"
              sublabel="รายการทั้งหมด"
              value={stats.totalLostItems}
              color="orange"
              onClick={() => navigate("/admin/lost-items")}
            />
            <StatTile
              icon={PackageCheck}
              label="พบของแล้ว"
              sublabel="รายการทั้งหมด"
              value={stats.totalFoundItems}
              color="emerald"
              onClick={() => navigate("/admin/found-items")}
            />
            <StatTile
              icon={Clock}
              label="รายงานที่รอดำเนินการ"
              sublabel="รายงานใหม่"
              value={stats.pendingReports}
              color="amber"
              onClick={() => navigate("/admin/reports")}
            />
            <StatTile
              icon={ShieldAlert}
              label="อยู่ระหว่างตรวจสอบ"
              sublabel="แอดมินเปิดดูแล้ว"
              value={stats.underReviewReports}
              color="blue"
              onClick={() => navigate("/admin/reports")}
            />
            <StatTile
              icon={CheckCircle2}
              label="รายงานที่ได้รับการแก้ไขแล้ว"
              sublabel="ปิดรายงานแล้ว"
              value={stats.resolvedReports}
              color="emerald"
              onClick={() => navigate("/admin/reports")}
            />
            <StatTile
              icon={UserX}
              label="ผู้ใช้ที่ถูกระงับ"
              sublabel="ระงับชั่วคราว"
              value={stats.suspendedUsers}
              color="orange"
              onClick={() => navigate("/admin/users")}
            />
            <StatTile
              icon={Ban}
              label="ผู้ใช้ที่ถูกแบน"
              sublabel="แบนถาวร"
              value={stats.bannedUsers}
              color="red"
              onClick={() => navigate("/admin/users")}
            />
          </div>
        </>
      )}

      <div className="mt-8 flex flex-col items-center gap-1 border-t border-slate-100 pt-5 text-center">
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Leaf size={13} className="text-brand" />
          ร่วมกันสร้างสังคมแห่งการแบ่งปัน มหาวิทยาลัยเกษตรศาสตร์
        </p>
        <p className="text-xs font-semibold text-slate-500">Kasetsart University</p>
      </div>
    </div>
  );
};

export default Dashboard;
