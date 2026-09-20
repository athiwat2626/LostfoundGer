import { useEffect, useState } from "react";
import { User, AlertTriangle, ShieldOff, ShieldAlert as WarningIcon, UserX, Ban } from "lucide-react";
import adminApi from "../api/adminApi";
import SuspendModal from "../components/SuspendModal";

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-600",
  under_review: "bg-blue-50 text-blue-600",
  resolved: "bg-emerald-50 text-emerald-600",
  dismissed: "bg-slate-100 text-slate-500",
};

const UserCard = ({ title, name, email, tone, badge }) => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
    <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${tone}`}>
      <User size={18} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="text-sm font-semibold text-slate-800 truncate">{name || "ไม่ทราบชื่อ"}</p>
      <p className="text-xs text-slate-400 truncate">{email}</p>
    </div>
    {badge}
  </div>
);

const ReportDetailPanel = ({ reportId, onActionDone }) => {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      return;
    }
    adminApi
      .get(`/admin/reports/${reportId}`)
      .then((res) => {
        setReport(res.data.report);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "โหลดรายละเอียดไม่สำเร็จ"));
  }, [reportId]);

  const runAction = async (body) => {
    setBusy(true);
    try {
      await adminApi.post(`/admin/reports/${reportId}/moderate`, body);
      const res = await adminApi.get(`/admin/reports/${reportId}`);
      setReport(res.data.report);
      setShowSuspendModal(false);
      onActionDone?.();
    } catch (err) {
      window.alert(err.response?.data?.message || "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  if (!reportId) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-400">
        เลือกรายงานเพื่อดูรายละเอียด
      </div>
    );
  }

  if (error) {
    return <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!report) {
    return <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-400">กำลังโหลด...</div>;
  }

  const resolved = report.status === "resolved" || report.status === "dismissed";
  const reportedName = `${report.reported_first_name || ""} ${report.reported_last_name || ""}`.trim();
  const reporterName = `${report.reporter_first_name || ""} ${report.reporter_last_name || ""}`.trim();

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">Report Details</p>
          <p className="text-xs text-slate-400">
            ID #{report.report_id} · {new Date(report.created_at).toLocaleDateString("th-TH")}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${STATUS_BADGE[report.status] || "bg-slate-100 text-slate-500"}`}>
          {report.status.replace("_", " ")}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <UserCard title="REPORTER" name={reporterName} email={report.reporter_email} tone="bg-teal-50 text-teal-600" />
          <UserCard
            title="REPORTED USER"
            name={reportedName}
            email={report.reported_email}
            tone="bg-red-50 text-red-500"
            badge={
              (report.reported_is_banned || report.reported_suspended_until) && (
                <span className="text-[10px] font-semibold uppercase text-red-500">
                  {report.reported_is_banned ? "Banned" : "Suspended"}
                </span>
              )
            }
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-slate-500">เหตุผลการรายงาน: {report.reason}</p>
          {report.detail && <p className="text-sm text-slate-600 leading-relaxed">{report.detail}</p>}
        </div>

        {report.evidence_url && (
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">หลักฐาน</p>
            <img
              src={`http://localhost:3000${report.evidence_url}`}
              alt="evidence"
              className="h-28 w-28 rounded-xl object-cover border border-slate-100"
            />
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">SYSTEM TIMELINE</p>
          <div className="space-y-2 border-l-2 border-slate-100 pl-3">
            {report.timeline.map((t, i) => (
              <div key={i}>
                <p className="text-sm text-slate-700">{t.label}</p>
                <p className="text-xs text-slate-400">{new Date(t.at).toLocaleString("th-TH")}</p>
              </div>
            ))}
          </div>
        </div>

        {!resolved && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              disabled={busy}
              onClick={() => runAction({ action: "dismiss" })}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <ShieldOff size={15} />
              Dismiss Report
            </button>
            <button
              disabled={busy}
              onClick={() => runAction({ action: "warn" })}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-100 disabled:opacity-60"
            >
              <WarningIcon size={15} />
              Issue Warning
            </button>
            <button
              disabled={busy}
              onClick={() => setShowSuspendModal(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              <UserX size={15} />
              Suspend Account
            </button>
            <button
              disabled={busy}
              onClick={() => runAction({ action: "ban" })}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Ban size={15} />
              Ban Permanently
            </button>
          </div>
        )}

        {resolved && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            <AlertTriangle size={14} />
            รายงานนี้ถูกดำเนินการแล้ว ({report.action_taken || report.status})
          </div>
        )}
      </div>

      {showSuspendModal && (
        <SuspendModal
          userLabel={reportedName || "ผู้ใช้"}
          submitting={busy}
          onCancel={() => setShowSuspendModal(false)}
          onConfirm={runAction}
        />
      )}
    </div>
  );
};

export default ReportDetailPanel;
