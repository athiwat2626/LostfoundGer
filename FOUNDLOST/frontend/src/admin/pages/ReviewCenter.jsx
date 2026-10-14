import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, ShieldAlert, UserX, CheckCircle2 } from "lucide-react";
import adminApi from "../api/adminApi";
import StatTile from "../components/StatTile";
import { STATUS_LABEL } from "../labels";
import ReportDetailPanel from "./ReportDetailPanel";

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-600",
  under_review: "bg-blue-50 text-blue-600",
  resolved: "bg-brand-50 text-brand",
  dismissed: "bg-slate-100 text-slate-500",
};

const ReviewCenter = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const detailRef = useRef(null);

  // จอเล็ก: แผงรายละเอียดอยู่ใต้รายการ จึงเลื่อนลงไปให้เห็นทันทีที่เลือก
  const selectReport = (id) => {
    setSelectedId(id);
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };

  const load = useCallback(() => {
    adminApi
      .get("/admin/reports", { params: { status: statusFilter } })
      .then((res) => {
        setReports(res.data.reports);
        setStats(res.data.stats);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "โหลดรายงานไม่สำเร็จ"));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFilter = (value) => setStatusFilter((prev) => (prev === value ? "all" : value));

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1 sm:text-2xl">ตรวจสอบรายการ</h1>
      <p className="text-sm text-slate-500 mb-4">ตรวจสอบและจัดการรายงานจากผู้ใช้</p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5 sm:gap-4 sm:mb-6">
          <StatTile
            icon={Clock}
            label="รอดำเนินการ"
            value={stats.pending}
            color="amber"
            active={statusFilter === "pending"}
            onClick={() => toggleFilter("pending")}
          />
          <StatTile
            icon={ShieldAlert}
            label="กำลังตรวจสอบ"
            value={stats.underReview}
            color="blue"
            active={statusFilter === "under_review"}
            onClick={() => toggleFilter("under_review")}
          />
          <StatTile icon={UserX} label="ผู้ใช้ที่ถูกระงับ" value={stats.suspended} color="red" />
          <StatTile
            icon={CheckCircle2}
            label="ดำเนินการแล้ว"
            value={stats.resolved}
            color="emerald"
            active={statusFilter === "resolved"}
            onClick={() => toggleFilter("resolved")}
          />
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* มือถือ: แสดงเป็นการ์ด */}
        <ul className="space-y-2.5 md:hidden">
          {reports.length === 0 && (
            <li className="rounded-2xl border border-slate-100 bg-white py-8 text-center text-sm text-slate-400">ไม่พบรายงาน</li>
          )}
          {reports.map((r) => (
            <li key={r.report_id}>
              <button
                type="button"
                onClick={() => selectReport(r.report_id)}
                className={`w-full rounded-2xl border bg-white p-3.5 text-left shadow-sm transition ${
                  selectedId === r.report_id ? "border-brand ring-2 ring-brand-50" : "border-slate-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-400">#{r.report_id.replace("RPT-", "")}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                  {`${r.reported_first_name || ""} ${r.reported_last_name || ""}`.trim() || "-"}
                </p>
                <p className="truncate text-xs text-slate-500">{r.reason}</p>
              </button>
            </li>
          ))}
        </ul>

        <div className="hidden lg:col-span-3 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-4 py-3">เลขที่รายงาน</th>
                <th className="px-4 py-3">ผู้ถูกรายงาน</th>
                <th className="px-4 py-3">เหตุผล</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    ไม่พบรายงาน
                  </td>
                </tr>
              )}
              {reports.map((r) => (
                <tr
                  key={r.report_id}
                  className={`cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 ${
                    selectedId === r.report_id ? "bg-brand-50/60" : ""
                  }`}
                  onClick={() => selectReport(r.report_id)}
                >
                  <td className="px-4 py-3 font-medium text-slate-700">#{r.report_id.replace("RPT-", "")}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {`${r.reported_first_name || ""} ${r.reported_last_name || ""}`.trim() || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectReport(r.report_id);
                      }}
                      className="rounded-lg gradient-primary px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      ดู
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div ref={detailRef} className="scroll-mt-16 lg:col-span-2">
          <ReportDetailPanel reportId={selectedId} onActionDone={load} />
        </div>
      </div>
    </div>
  );
};

export default ReviewCenter;
