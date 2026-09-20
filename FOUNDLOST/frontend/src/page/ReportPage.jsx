import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, User, Star, X, ImagePlus, AlertTriangle } from "lucide-react";
import axios from "axios";

const REASONS = [
  "การรายงานของหายปลอม",
  "การรายงานของพบปลอม",
  "หลอกลวง / อื่นใด",
  "ทุจริต / ฉ้อโกง",
  "เนื้อหาไม่เหมาะสม",
  "สแปม",
  "อื่น ๆ",
];

export default function ReportPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // รับ item info จาก navigate state
  const { itemId, itemType, itemName, reportedUser } = location.state || {};

  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [previews, setPreviews] = useState([]); // [{ file, url }]
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const studentId = localStorage.getItem("student_id") || "";

  const handleFiles = (files) => {
    const allowed = Array.from(files).slice(0, 3 - previews.length);
    const newPreviews = allowed.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePreview = (idx) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return setError("กรุณาเลือกเหตุผลในการรายงาน");
    setError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("reported_item_id", itemId);
      formData.append("item_type", itemType || "found");
      formData.append("reason", reason);
      formData.append("detail", detail);
      if (studentId) formData.append("reporter_student_id", studentId);
      if (previews[0]) formData.append("evidence", previews[0].file);

      const res = await axios.post("http://localhost:3000/report", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/report/success", {
        state: {
          reportId: res.data.report_id,
          createdAt: res.data.created_at,
        },
        replace: true,
      });
    } catch (err) {
      setError(err.response?.data?.error || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          ย้อนกลับ
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">รายงานผู้ใช้</h1>
        <p className="text-sm text-slate-500 mb-6">
          ช่วยกันทำให้ KuLost&Found เป็นพื้นที่ที่ปลอดภัยสำหรับทุกคน
        </p>

        {/* Reported user card */}
        {(itemName || reportedUser) && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <User size={24} />
            </div>
            <div className="flex-1 min-w-0">
              {reportedUser && (
                <p className="text-sm font-semibold text-slate-800 truncate">{reportedUser}</p>
              )}
              {itemName && (
                <p className="text-xs text-slate-500 truncate mt-0.5">รายการ: {itemName}</p>
              )}
            </div>
            <div className="flex items-center gap-0.5 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill="currentColor" />
              ))}
            </div>
            <span className="text-sm font-semibold text-slate-600 ml-1">85 / 100</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reason */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-800 mb-3">
              เหตุผลในการรายงาน <span className="text-red-500">*</span>
            </p>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${
                    reason === r
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-emerald-600 w-4 h-4 shrink-0"
                  />
                  <span className="text-sm text-slate-700">{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              รายละเอียดเพิ่มเติม
              <span className="text-slate-400 font-normal ml-2">{detail.length}/500</span>
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value.slice(0, 500))}
              rows={4}
              placeholder="อธิบายรายละเอียดเพิ่มเติม..."
              className="w-full text-sm text-slate-700 placeholder-slate-400 bg-slate-50 rounded-xl px-4 py-3 outline-none resize-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>

          {/* Evidence */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-800 mb-1">แนบหลักฐาน</p>
            <p className="text-xs text-slate-400 mb-3">
              สามารถแนบได้สูงสุด 3 ไฟล์ • รองรับ JPG, PNG (PDF ยังไม่รองรับ)
            </p>

            {/* Preview grid */}
            {previews.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {previews.map((p, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePreview(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {previews.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-emerald-400 hover:text-emerald-400 transition-colors"
                  >
                    <ImagePlus size={20} />
                  </button>
                )}
              </div>
            )}

            {previews.length === 0 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 flex flex-col items-center gap-2 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
              >
                <ImagePlus size={24} />
                <span className="text-xs">คลิกเพื่อเลือกรูปภาพ</span>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Warning note */}
          <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <span className="font-semibold">คำเตือน:</span> การรายงานเท็จถือเป็นการละเมิดข้อกำหนดการใช้งาน
              ระบบจะตรวจสอบรายงานของคุณภายใน 24 ชั่วโมง
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
          >
            {submitting ? "กำลังส่ง..." : "ส่งรายงาน"}
          </button>
        </form>
      </div>
    </div>
  );
}
