import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2 } from "lucide-react";
import logo from "../assets/images/logo.png";
import { API_URL } from "../component/itemUtils";

const SCALE = [
  { value: 5, label: "มากที่สุด" },
  { value: 4, label: "มาก" },
  { value: 3, label: "ปานกลาง" },
  { value: 2, label: "น้อย" },
  { value: 1, label: "น้อยที่สุด" },
];
const DONE_KEY = "surveySubmitted";

// ─── แบบประเมินความพึงพอใจ (เปิดได้โดยไม่ต้องเข้าสู่ระบบ ลิงก์ /survey) ───────────────
const Survey = () => {
  const [questions, setQuestions] = useState(null);
  const [roles, setRoles] = useState({});
  const [role, setRole] = useState("");
  const [answers, setAnswers] = useState({});
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(DONE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    axios
      .get(`${API_URL}/api/survey/questions`)
      .then((res) => {
        setQuestions(res.data.questions);
        setRoles(res.data.roles);
      })
      .catch(() => setError("โหลดแบบประเมินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  }, []);

  const answer = (key, value) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!role) return setError("กรุณาเลือกสถานะผู้ตอบ");
    const missing = questions.find((q) => !q.optional && !answers[q.key]);
    if (missing) return setError(`กรุณาให้คะแนนข้อ "${missing.text}"`);
    setError("");
    setSending(true);
    try {
      await axios.post(`${API_URL}/api/survey`, { respondent_role: role, ...answers, suggestion });
      try {
        localStorage.setItem(DONE_KEY, "1");
      } catch {
        // บันทึกไม่ได้ก็ไม่เป็นไร
      }
      setDone(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.response?.data?.message || "ส่งแบบประเมินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-slate-100 px-4 py-8">
      <main className="mx-auto max-w-2xl">
        <header className="mb-6 text-center">
          <img src={logo} alt="KU FOUND&LOST" className="mx-auto w-32" />
          <h1 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl">แบบประเมินความพึงพอใจ</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            ระบบสื่อกลางช่วยติดต่อเพื่อคืนของหาย KU Lost &amp; Found (FOUND&amp;LOST)
            <br />
            ใช้เวลาประมาณ 2 นาที ไม่เก็บชื่อหรืออีเมลของผู้ตอบ
          </p>
        </header>

        {done ? (
          <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <CheckCircle2 size={56} className="mx-auto text-teal-600" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">ขอบคุณที่ตอบแบบประเมิน</h2>
            <p className="mt-2 text-sm text-slate-600">คำตอบของคุณจะนำไปใช้ปรับปรุงระบบให้ดีขึ้น</p>
            <a href="/home" className="mt-6 inline-block rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
              ไปที่ระบบ FOUND&amp;LOST
            </a>
            <button
              type="button"
              onClick={() => setDone(false)}
              className="mt-3 block w-full text-xs text-slate-400 underline hover:text-slate-600"
            >
              ตอบอีกครั้ง (ผู้ใช้คนอื่นบนเครื่องนี้)
            </button>
          </section>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-bold text-slate-900">ส่วนที่ 1 ข้อมูลผู้ตอบ</h2>
              <p className="mt-1 text-sm text-slate-500">สถานะของคุณ</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(roles).map(([value, label]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-xl border px-4 py-2 text-sm transition ${
                      role === value ? "border-teal-600 bg-teal-50 font-semibold text-teal-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-bold text-slate-900">ส่วนที่ 2 ความพึงพอใจต่อการใช้งานระบบ</h2>
              <p className="mt-1 text-sm text-slate-500">5 = มากที่สุด, 4 = มาก, 3 = ปานกลาง, 2 = น้อย, 1 = น้อยที่สุด</p>
              {!questions && !error && <div className="mt-4 h-40 animate-pulse rounded-2xl bg-slate-100" />}
              <ol className="mt-4 space-y-5">
                {questions?.map((q, index) => (
                  <li key={q.key}>
                    <p className="text-sm font-medium text-slate-800">
                      {index + 1}. {q.text}
                    </p>
                    <div className="mt-2 grid grid-cols-5 gap-1.5 sm:gap-2" role="radiogroup" aria-label={q.text}>
                      {SCALE.map((s) => (
                        <label
                          key={s.value}
                          className={`flex cursor-pointer flex-col items-center rounded-xl border py-2 text-center transition ${
                            answers[q.key] === s.value
                              ? "border-teal-600 bg-teal-600 text-white"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.key}
                            value={s.value}
                            checked={answers[q.key] === s.value}
                            onChange={() => answer(q.key, s.value)}
                            className="sr-only"
                          />
                          <span className="text-base font-bold">{s.value}</span>
                          <span className="text-[10px] leading-tight sm:text-xs">{s.label}</span>
                        </label>
                      ))}
                    </div>
                    {q.optional && (
                      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={answers[q.key] === ""}
                          onChange={(e) => answer(q.key, e.target.checked ? "" : undefined)}
                        />
                        ไม่ได้ใช้ / ยังไม่ได้เชื่อม LINE
                      </label>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-bold text-slate-900">ส่วนที่ 3 ข้อเสนอแนะ (ไม่บังคับ)</h2>
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="สิ่งที่ชอบ ปัญหาที่พบ หรือสิ่งที่อยากให้ปรับปรุง"
                className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </section>

            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={sending || !questions}
              className="w-full rounded-2xl bg-teal-700 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
            >
              {sending ? "กำลังส่ง..." : "ส่งแบบประเมิน"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default Survey;
