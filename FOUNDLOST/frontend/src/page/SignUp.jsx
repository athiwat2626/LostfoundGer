import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
      await axios.post("http://localhost:3000/api/register", formData);
      navigate("/login", { state: { message: "สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบด้วยอีเมลของคุณ" } });
    } catch (error) {
      setMessage(error.response?.data?.message || "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f3ea] bg-dot-pattern p-6">
      <section className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-slate-800">สมัครสมาชิก</h1>
        <p className="mb-5 text-slate-500">กรอกข้อมูลเพื่อสร้างบัญชี FOUND&LOST</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-emerald-600" name="first_name" placeholder="ชื่อ" value={formData.first_name} onChange={handleChange} required maxLength={100} />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-emerald-600" name="last_name" placeholder="นามสกุล" value={formData.last_name} onChange={handleChange} required maxLength={100} />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-emerald-600" type="email" name="email" placeholder="อีเมล" value={formData.email} onChange={handleChange} required />
          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm text-red-600">{message}</p>}
        <p className="mt-5 text-center text-sm text-slate-500">
          มีบัญชีแล้ว?{" "}
          <button type="button" onClick={() => navigate("/login")} className="font-medium text-emerald-600 hover:underline">
            เข้าสู่ระบบ
          </button>
        </p>
      </section>
    </main>
  );
};

export default SignUp;