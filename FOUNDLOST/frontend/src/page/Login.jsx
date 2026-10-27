import { useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, KeyRound, ShieldCheck } from "lucide-react";
import AuthShell from "../component/AuthShell";
import { API_URL } from "../component/itemUtils";
import { saveUserSession } from "../component/session";
import GoogleSignInButton from "../component/GoogleSignInButton";

const inputClass =
  "w-full rounded-full border-2 border-brand/70 bg-white/90 py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";
const primaryButtonClass =
  "w-full rounded-full gradient-primary py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60";

// รับเฉพาะ path ภายในเว็บ (กันการพาไปเว็บอื่นหลังเข้าสู่ระบบ)
const safeRedirect = (from) =>
  typeof from === "string" && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/login") ? from : "/home";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = safeRedirect(location.state?.from);
  // มาจากการสมัคร/เข้าด้วย Google ในหน้าสมัคร → เริ่มที่ขั้นตอนกรอก OTP ของอีเมลนั้นเลย
  const googleEmail = location.state?.otpEmail || "";
  const [step, setStep] = useState(googleEmail ? "otp" : "email"); // "email" → "otp"
  const [email, setEmail] = useState(googleEmail);
  const [otp, setOtp] = useState("");
  const [notice, setNotice] = useState(location.state?.message || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // ส่ง OTP ไปที่อีเมล แล้วไปขั้นตอนกรอกรหัส
  const sendOTP = async (event) => {
    event?.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      localStorage.removeItem("isLoggedIn");
      await axios.post(`${API_URL}/api/send-otp`, { email });
      setStep("otp");
      setOtp("");
      setNotice(`ส่งรหัส OTP ไปที่ ${email} แล้ว`);
    } catch (err) {
      setError(err.response?.data?.message || "ไม่สามารถส่ง OTP ได้");
    } finally {
      setBusy(false);
    }
  };

  // ตรวจรหัส OTP และบันทึกสถานะเข้าสู่ระบบ
  const verifyOTP = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await axios.post(`${API_URL}/api/verify-otp`, { email, otp });
      saveUserSession({ token: response.data.token, email, student_id: response.data.student_id });
      setNotice("OTP ถูกต้อง กำลังเข้าสู่ระบบ...");
      setTimeout(() => navigate(redirectTo, { replace: true }), 2000);
    } catch (err) {
      setError(err.response?.data?.message === "Invalid or expired OTP"
        ? "OTP ไม่ถูกต้องหรือหมดอายุ"
        : err.response?.data?.message || "OTP ไม่ถูกต้อง");
      setBusy(false);
    }
  };

  // ขั้นที่ 1 ยืนยันกับ Google สำเร็จ (บัญชีใหม่ถูกสร้างให้อัตโนมัติ) → ขั้นที่ 2 กรอก OTP ที่ส่งไปอีเมล Google
  const handleGoogle = (data) => {
    setEmail(data.email);
    setOtp("");
    setError("");
    setStep("otp");
    setNotice(
      data.retry_after
        ? `ส่งรหัส OTP ไปที่ ${data.email} แล้วเมื่อสักครู่ กรุณาใช้รหัสล่าสุดในอีเมล`
        : `ยืนยันบัญชี Google แล้ว ส่งรหัส OTP ไปที่ ${data.email} แล้ว`
    );
  };

  const backToEmail = () => {
    setStep("email");
    setError("");
    setNotice("");
  };

  return (
    <AuthShell>
      {step === "email" ? (
        <form onSubmit={sendOTP} className="space-y-5">
          <h1 className="text-2xl font-bold text-slate-900">ลงชื่อเข้าใช้</h1>

          <div>
            <label htmlFor="login-email" className="mb-2 block text-base font-semibold text-slate-800">
              อีเมล
            </label>
            <div className="relative">
              <KeyRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className={inputClass}
              />
            </div>
          </div>

          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? "กำลังส่งรหัส..." : "ลงชื่อเข้าใช้"}
          </button>

          <GoogleSignInButton text="signin_with" onSuccess={handleGoogle} onError={setError} />
        </form>
      ) : (
        <form onSubmit={verifyOTP} className="space-y-5">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <button type="button" onClick={backToEmail} aria-label="กลับไปแก้อีเมล" className="-ml-1 rounded-full p-1 hover:bg-white/60">
              <ChevronLeft size={22} />
            </button>
            ยืนยันรหัส OTP
          </h1>

          <div>
            <label htmlFor="login-otp" className="mb-2 block text-base font-semibold text-slate-800">
              รหัส OTP 6 หลัก
            </label>
            <div className="relative">
              <ShieldCheck size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="login-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className={`${inputClass} tracking-[0.5em]`}
              />
            </div>
          </div>

          <button type="submit" disabled={busy || otp.length !== 6} className={primaryButtonClass}>
            {busy ? "กำลังตรวจสอบ..." : "ยืนยัน"}
          </button>

          <p className="text-center text-sm text-slate-600">
            ไม่ได้รับรหัส?{" "}
            <button type="button" onClick={sendOTP} disabled={busy} className="font-semibold text-brand hover:underline">
              ส่งรหัสอีกครั้ง
            </button>
          </p>
        </form>
      )}

      {notice && (
        <p role="status" className="mt-5 rounded-xl bg-white/70 px-3 py-2 text-center text-sm text-slate-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-1 text-center text-sm text-slate-700">
        <p>
          ยังไม่มีบัญชี?{" "}
          <Link to="/signup" className="font-semibold text-brand hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
        <p>
          เป็นแอดมิน?{" "}
          <Link to="/admin/login" className="font-semibold text-brand hover:underline">
            เข้าสู่ระบบแอดมิน
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default Login;
