import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Link2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import UserLayout from "../component/UserLayout";
import userApi from "../component/userApi";

const cardClass = "mx-auto mt-8 max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8";

// ─── ยืนยันการเชื่อมบัญชี LINE (เปิดจากปุ่มในแชต LINE: /line/link?token=...) ──────────
// ต้องเข้าสู่ระบบก่อน (ProtectedRoute) และต้องกดยืนยันเอง — ไม่เชื่อมอัตโนมัติเมื่อเปิดลิงก์
const LineLink = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState(token ? "loading" : "error"); // loading | ready | done | error
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(token ? "" : "ไม่พบรหัสเชื่อมบัญชี กรุณาเปิดลิงก์จากแชต LINE อีกครั้ง");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    userApi
      .post("/api/line/link/preview", { token })
      .then((res) => {
        setPreview(res.data);
        setState("ready");
      })
      .catch((err) => {
        setError(err.response?.data?.message || "ตรวจสอบลิงก์ไม่สำเร็จ");
        setState("error");
      });
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    try {
      await userApi.post("/api/line/link", { token });
      setState("done");
    } catch (err) {
      setError(err.response?.data?.message || "เชื่อมบัญชีไม่สำเร็จ");
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <UserLayout>
      <div className={cardClass}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#06C755]/10 text-[#06C755]">
          <Link2 size={26} />
        </span>
        <h1 className="mt-4 text-center text-xl font-bold text-slate-900">เชื่อมบัญชี LINE</h1>

        {state === "loading" && <div className="mt-6 h-24 animate-pulse rounded-xl bg-slate-100" />}

        {state === "ready" && (
          <>
            <p className="mt-3 text-center text-sm text-slate-600">
              เชื่อมบัญชีเว็บแอปของคุณกับ LINE
              {preview?.display_name && <span className="font-semibold text-slate-900"> “{preview.display_name}”</span>}
              {" "}เพื่อรับแจ้งเตือนเมื่อมีรายการที่อาจตรงกับของที่คุณแจ้งหาย
            </p>
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-slate-700">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand" />
              <p>กดยืนยันเฉพาะเมื่อคุณเป็นผู้ขอลิงก์นี้จากแชต LINE ของคุณเอง ระบบไม่เคยขอรหัสผ่านหรือรหัส OTP ผ่าน LINE</p>
            </div>
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className="mt-6 w-full rounded-xl bg-[#06C755] py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {busy ? "กำลังเชื่อมบัญชี..." : "ยืนยันการเชื่อมบัญชี"}
            </button>
            <Link to="/home" className="mt-3 block text-center text-sm text-slate-500 hover:underline">
              ยกเลิก
            </Link>
          </>
        )}

        {state === "done" && (
          <div className="mt-4 text-center">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-brand">
              <CheckCircle2 size={18} /> เชื่อมบัญชีสำเร็จ
            </p>
            <p className="mt-2 text-sm text-slate-600">ระบบจะส่งแจ้งเตือนทาง LINE เมื่อพบรายการที่อาจตรงกับของที่คุณแจ้งหาย</p>
            <Link to="/settings" className="mt-6 inline-block rounded-xl gradient-primary px-6 py-2.5 text-sm font-semibold text-white">
              ไปที่บัญชีของฉัน
            </Link>
          </div>
        )}

        {state === "error" && (
          <div className="mt-4 text-center">
            <p role="alert" className="flex items-start justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-left text-sm text-red-600">
              <AlertCircle size={18} className="mt-0.5 shrink-0" /> {error}
            </p>
            <Link to="/settings" className="mt-5 inline-block text-sm font-semibold text-brand hover:underline">
              ดูสถานะการเชื่อม LINE ของฉัน
            </Link>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default LineLink;
