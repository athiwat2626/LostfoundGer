import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import adminApi from "./api/adminApi";
import AuthShell from "../component/AuthShell";

const inputClass =
  "w-full rounded-full border-2 border-brand/70 bg-white/90 py-2.5 pl-11 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700";
const iconClass = "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await adminApi.post("/admin/auth/login", { email, password });
      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("adminEmail", res.data.admin.email);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-brand">KU Lost &amp; Found</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="admin-email" className={labelClass}>
            Username
          </label>
          <div className="relative">
            <KeyRound size={18} className={iconClass} />
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder="Administrative Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`${inputClass} pr-4`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="admin-password" className={labelClass}>
            Password
          </label>
          <div className="relative">
            <Lock size={18} className={iconClass} />
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-full gradient-primary py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(45,212,191,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "กำลังเข้าสู่ระบบ..." : "Login to Console"}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-300/60 pt-4 text-right">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800 hover:text-brand hover:underline">
          <ArrowLeft size={16} />
          กลับสู่หน้าหลัก
        </Link>
        <p className="text-xs text-slate-500">User portal here</p>
      </div>
    </AuthShell>
  );
};

export default AdminLogin;
