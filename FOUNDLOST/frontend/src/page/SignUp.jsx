import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../component/AuthShell";
import { API_URL } from "../component/itemUtils";

const inputClass =
  "w-full rounded-full border-2 border-brand/70 bg-white/90 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";
const labelClass = "mb-2 block text-sm font-semibold text-slate-800";

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      await axios.post(`${API_URL}/api/register`, formData);
      navigate("/login", { state: { message: "สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบด้วยอีเมลของคุณ" } });
    } catch (error) {
      setMessage(error.response?.data?.message || "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-slate-900">สมัครสมาชิก</h1>
      <p className="mt-1 text-sm text-slate-700">กรอกข้อมูลเพื่อสร้างบัญชี FOUND&amp;LOST</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="signup-first-name" className={labelClass}>ชื่อ</label>
            <input
              id="signup-first-name"
              name="first_name"
              placeholder="ชื่อ"
              value={formData.first_name}
              onChange={handleChange}
              required
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="signup-last-name" className={labelClass}>นามสกุล</label>
            <input
              id="signup-last-name"
              name="last_name"
              placeholder="นามสกุล"
              value={formData.last_name}
              onChange={handleChange}
              required
              maxLength={100}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="signup-email" className={labelClass}>อีเมล</label>
          <input
            id="signup-email"
            type="email"
            name="email"
            placeholder="อีเมล"
            value={formData.email}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full gradient-primary py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
        </button>
      </form>

      {message && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-600">
          {message}
        </p>
      )}

      <p className="mt-8 text-center text-sm text-slate-700">
        มีบัญชีแล้ว?{" "}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </AuthShell>
  );
};

export default SignUp;
