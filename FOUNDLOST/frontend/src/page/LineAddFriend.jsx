import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { API_URL } from "../component/itemUtils";
import LineLogo, { LINE_GREEN } from "../component/LineLogo";

// ─── หน้าเพิ่มเพื่อน LINE Official Account (เปิดได้โดยไม่ต้องเข้าสู่ระบบ) ─────────────
const LineAddFriend = () => {
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/line/info`)
      .then((res) => setInfo(res.data))
      .catch(() => setFailed(true));
  }, []);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/settings"));
  const name = info?.display_name || "KULost&Found";
  const unavailable = failed || (info && !info.available);

  return (
    <div className="min-h-screen bg-slate-100 sm:py-10">
      <main className="mx-auto flex min-h-screen max-w-md flex-col bg-white sm:min-h-0 sm:rounded-3xl sm:shadow-xl">
        <header className="relative flex items-center justify-center border-b border-slate-100 px-4 py-4">
          <button
            type="button"
            onClick={goBack}
            aria-label="ย้อนกลับ"
            className="absolute left-3 rounded-full p-2 text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-bold text-slate-900">เพิ่มเพื่อน LINE</h1>
        </header>

        <section className="flex flex-1 flex-col items-center px-6 pb-8 pt-8 text-center">
          {/* โลโก้ + เครื่องหมายบัญชีทางการ */}
          <div className="relative">
            <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-50 shadow-inner ring-1 ring-slate-100">
              {info?.picture_url ? (
                <img src={info.picture_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <LineLogo size={34} />
              )}
            </span>
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-white"
              style={{ background: LINE_GREEN }}
              aria-hidden="true"
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-900">{name}</h2>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Official Account</p>
          {info?.basic_id && <p className="mt-1 text-xs text-slate-500">{info.basic_id}</p>}

          {/* QR code */}
          <div className="mt-7 w-full rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-100">
            <div className="mx-auto w-full max-w-[220px] rounded-2xl bg-white p-4 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)]">
              {info?.qr_url ? (
                <img src={info.qr_url} alt={`QR code เพิ่มเพื่อน ${name}`} className="aspect-square w-full" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                  {unavailable ? "ยังไม่ได้ตั้งค่า LINE" : ""}
                </div>
              )}
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <LineLogo size={16} />
                <span className="text-[11px] font-semibold text-slate-500">สแกนด้วยแอป LINE</span>
              </div>
            </div>
          </div>

          <h3 className="mt-7 text-base font-bold text-slate-900">สแกนเพื่อเพิ่มเพื่อน</h3>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
            เพิ่มเพื่อนใน LINE Official Account เพื่อรับการแจ้งเตือนเกี่ยวกับสถานะการแจ้งของหาย การจับคู่รายการ และข่าวสารจากระบบ
          </p>

          {/* บนมือถือที่สแกนหน้าจอตัวเองไม่ได้ → กดเพิ่มเพื่อนได้ทันที */}
          {info?.add_friend_url && (
            <a
              href={info.add_friend_url}
              target="_blank"
              rel="noreferrer"
              className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 bg-white py-3 text-sm font-bold transition hover:bg-[#06C755]/5 active:scale-[0.99]"
              style={{ borderColor: LINE_GREEN, color: LINE_GREEN }}
            >
              <LineLogo size={24} />
              เพิ่มเพื่อนใน LINE
            </a>
          )}
          <p className="mt-3 text-xs text-slate-400">
            เพิ่มเพื่อนแล้ว กดปุ่ม “เชื่อมบัญชี” ในแชตเพื่อรับแจ้งเตือนของบัญชีคุณ
          </p>

          <div className="mt-auto flex w-full items-center gap-3 pt-10 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            <span className="h-px flex-1 bg-slate-200" />
            Kasetsart University
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </section>
      </main>
    </div>
  );
};

export default LineAddFriend;
