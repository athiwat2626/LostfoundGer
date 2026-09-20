import { useCallback, useEffect, useState } from "react";
import { Clock, ShieldAlert, UserX, CheckCircle2 } from "lucide-react";
import adminApi from "../api/adminApi";
import StatTile from "../components/StatTile";
import ReportDetailPanel from "./ReportDetailPanel";

const STATUS_LABEL = {
  pending: "Pending",
  under_review: "Under Review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-600",
  under_review: "bg-blue-50 text-blue-600",
  resolved: "bg-emerald-50 text-emerald-600",
  dismissed: "bg-slate-100 text-slate-500",
};

const ReviewCenter = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");

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
      <h1 className="text-xl font-bold text-slate-800 mb-1">Review Center</h1>
      <p className="text-sm text-slate-500 mb-4">ตรวจสอบและจัดการรายงานจากผู้ใช้</p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatTile
            icon={Clock}
            label="Pending Reports"
            value={stats.pending}
            color="amber"
            active={statusFilter === "pending"}
            onClick={() => toggleFilter("pending")}
          />
          <StatTile
            icon={ShieldAlert}
            label="Under Review"
            value={stats.underReview}
            color="blue"
            active={statusFilter === "under_review"}
            onClick={() => toggleFilter("under_review")}
          />
          <StatTile icon={UserX} label="Suspended" value={stats.suspended} color="red" />
          <StatTile
            icon={CheckCircle2}
            label="Resolved"
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
        <div className="lg:col-span-3 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-4 py-3">Report ID</th>
                <th className="px-4 py-3">Reported User</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
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
                    selectedId === r.report_id ? "bg-teal-50/60" : ""
                  }`}
                  onClick={() => setSelectedId(r.report_id)}
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
                        setSelectedId(r.report_id);
                      }}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-2">
          <ReportDetailPanel reportId={selectedId} onActionDone={load} />
        </div>
      </div>
    </div>
  );
};

export default ReviewCenter;
