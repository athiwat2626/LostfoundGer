import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import adminApi from "./api/adminApi";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <section className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-600"
        >
          <ArrowLeft size={16} />
          กลับหน้าแรก
        </button>

        <div className="mb-5 flex items-center gap-2 text-teal-700">
          <ShieldCheck size={24} />
          <h1 className="text-2xl font-bold text-slate-800">Admin Login</h1>
        </div>
        <p className="mb-5 text-sm text-slate-500">
          KU Lost&amp;Found Admin Control — เข้าสู่ระบบด้วยอีเมลและรหัสผ่านของแอดมิน
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200"
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-teal-600 px-4 py-3 font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default AdminLogin;
