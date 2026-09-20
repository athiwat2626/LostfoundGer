import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, Home, FileText, Clock, MessageSquare } from "lucide-react";

function formatThaiDate(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  const thaiMonths = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
  ];
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} เวลา ${hh}:${mm} น.`;
}

export default function ReportSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reportId, createdAt } = location.state || {};

  return (
    <div className="min-h-screen bg-[#f7f3ea] bg-dot-pattern flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Success icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-24 h-24 mb-4">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={52} className="text-emerald-600" strokeWidth={1.8} />
            </div>
            {/* small shield */}
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 text-center">
            ส่งรายงานเรียบร้อยแล้ว
          </h1>
          <p className="text-sm text-slate-500 text-center mt-2 max-w-xs leading-relaxed">
            ขอบคุณที่ช่วยทำให้ KuLost&Found เป็นพื้นที่ที่ปลอดภัยสำหรับทุกคน
          </p>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100 mb-4">
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">หมายเลขรายงาน</p>
              <p className="text-sm font-semibold text-slate-800 tracking-wide">
                {reportId || "RPT-XXXX-XXXXXX"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">วันที่ส่งรายงาน</p>
              <p className="text-sm font-semibold text-slate-800">
                {formatThaiDate(createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <MessageSquare size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">สถานะการตรวจสอบ</p>
              <p className="text-sm font-semibold text-slate-800">
                แอดมินจะตรวจสอบรายงานของคุณภายใน 24 ชั่วโมง
              </p>
            </div>
          </div>
        </div>

        {/* Status stepper */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            สถานะปัจจุบัน
          </p>
          <div className="space-y-4">
            {/* Step 1 — done */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">ส่งรายงาน</p>
                <p className="text-xs text-slate-400">{formatThaiDate(createdAt)}</p>
              </div>
            </div>

            {/* Connector */}
            <div className="ml-3.5 h-6 w-0.5 bg-slate-200 rounded" />

            {/* Step 2 — in progress */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full border-2 border-emerald-400 bg-white flex items-center justify-center shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-slate-600">อยู่ระหว่างตรวจสอบ</p>
            </div>

            {/* Connector */}
            <div className="ml-3.5 h-6 w-0.5 bg-slate-200 rounded" />

            {/* Step 3 — pending */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              </div>
              <p className="text-sm text-slate-400">ดำเนินการแล้ว</p>
            </div>
          </div>
        </div>

        {/* Back home */}
        <button
          onClick={() => navigate("/home")}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          <Home size={17} />
          กลับหน้าหลัก
        </button>
      </div>
    </div>
  );
}
