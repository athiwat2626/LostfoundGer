import { useEffect, useState } from "react";
import { Download, Link as LinkIcon, Copy } from "lucide-react";
import adminApi from "../api/adminApi";

const fmt = (n) => (n == null ? "-" : n.toFixed(2));
const SURVEY_URL = `${window.location.origin}/survey`;

// ผลแบบประเมินความพึงพอใจ: ค่าเฉลี่ย S.D. และระดับ ตามรูปแบบตารางที่ 4.5 ในรูปเล่ม
const AdminSurvey = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    adminApi
      .get("/admin/survey/summary")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "โหลดข้อมูลไม่สำเร็จ"));
  }, []);

  const download = async () => {
    try {
      const res = await adminApi.get("/admin/survey/export", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "foundlost-survey.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("ดาวน์โหลดไฟล์ไม่สำเร็จ");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SURVEY_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // คัดลอกไม่ได้ก็ยังเห็นลิงก์บนหน้าจอ
    }
  };

  const summary = data?.summary;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
        <div>
          <h1 className="mb-1 text-xl font-bold text-slate-900 sm:text-2xl">แบบประเมินความพึงพอใจ</h1>
          <p className="text-sm text-slate-500">ผลการประเมินจากผู้ใช้ที่ตอบผ่านลิงก์แบบประเมิน (ไม่ต้องเข้าสู่ระบบ)</p>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={!summary?.responses}
          className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          <Download size={16} /> ดาวน์โหลด CSV
        </button>
      </div>

      <section className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
        <LinkIcon size={16} className="text-teal-700" />
        <span className="text-slate-500">ลิงก์แบบประเมิน:</span>
        <a href="/survey" target="_blank" rel="noreferrer" className="font-semibold text-teal-700 underline">
          {SURVEY_URL}
        </a>
        <button type="button" onClick={copyLink} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
          <Copy size={14} /> {copied ? "คัดลอกแล้ว" : "คัดลอก"}
        </button>
      </section>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {!data && !error && <div className="h-40 animate-pulse rounded-2xl bg-white shadow-sm" />}

      {summary && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">ผู้ตอบทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-900">{summary.responses}</p>
            </div>
            {Object.entries(data.roles).map(([key, label]) => (
              <div key={key} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{summary.by_role[key] || 0}</p>
              </div>
            ))}
          </div>

          <section className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">รายการประเมิน</th>
                  <th className="px-4 py-3 text-center">จำนวน</th>
                  <th className="px-4 py-3 text-center">ค่าเฉลี่ย</th>
                  <th className="px-4 py-3 text-center">S.D.</th>
                  <th className="px-4 py-3 text-center">ระดับ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.items.map((item, index) => (
                  <tr key={item.key}>
                    <td className="px-4 py-3 text-slate-800">
                      {index + 1}. {item.text}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{item.n}</td>
                    <td className="px-4 py-3 text-center font-semibold">{fmt(item.mean)}</td>
                    <td className="px-4 py-3 text-center">{fmt(item.sd)}</td>
                    <td className="px-4 py-3 text-center">{item.level}</td>
                  </tr>
                ))}
                <tr className="bg-teal-50 font-semibold">
                  <td className="px-4 py-3">ค่าเฉลี่ยรวม</td>
                  <td className="px-4 py-3 text-center">{summary.overall.n}</td>
                  <td className="px-4 py-3 text-center">{fmt(summary.overall.mean)}</td>
                  <td className="px-4 py-3 text-center">{fmt(summary.overall.sd)}</td>
                  <td className="px-4 py-3 text-center">{summary.overall.level}</td>
                </tr>
              </tbody>
            </table>
          </section>
          <p className="mt-2 text-xs text-slate-400">
            เกณฑ์: 4.21–5.00 มากที่สุด, 3.41–4.20 มาก, 2.61–3.40 ปานกลาง, 1.81–2.60 น้อย, 1.00–1.80 น้อยที่สุด · S.D. แบบกลุ่มตัวอย่าง (n − 1) · ข้อ 6 ไม่นับผู้ที่ไม่ได้ใช้ LINE
          </p>

          <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 font-bold text-slate-900">ข้อเสนอแนะล่าสุด</h2>
            {data.suggestions.length === 0 ? (
              <p className="text-sm text-slate-400">ยังไม่มีข้อเสนอแนะ</p>
            ) : (
              <ul className="space-y-2">
                {data.suggestions.map((s, i) => (
                  <li key={i} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {s.text}
                    <span className="mt-1 block text-xs text-slate-400">
                      {data.roles[s.role]} · {new Date(s.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminSurvey;
