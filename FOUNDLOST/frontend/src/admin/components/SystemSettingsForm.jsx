import { useState } from "react";
import { Plus, X, Lock, Sparkles, Award, UserX, Tags, MapPin, RotateCcw, Save, CheckCircle2, AlertCircle } from "lucide-react";
import adminApi from "../api/adminApi";

const OTHER_CATEGORY = "อื่น ๆ";
const cardClass = "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5";
const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 sm:py-2 sm:text-sm";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";
const iconButton = "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 sm:h-9 sm:w-9";

const SYSTEM_KEYS = [
  "match_min_score",
  "certificate_milestone",
  "certificate_signer_name",
  "certificate_signer_title",
  "suspend_durations",
  "categories",
  "deposit_points",
];
const pick = (settings) => Object.fromEntries(SYSTEM_KEYS.map((k) => [k, settings[k]]));

const Section = ({ icon: Icon, title, hint, children }) => (
  <section className={cardClass}>
    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
      <Icon size={18} className="text-brand" aria-hidden="true" /> {title}
    </h2>
    {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    <div className="mt-4 space-y-3">{children}</div>
  </section>
);

// ─── ค่าระบบ: การจับคู่, เกียรติบัตร, วันระงับบัญชี, หมวดหมู่, จุดรับฝาก ─────────────
const SystemSettingsForm = ({ settings, defaults, onSaved }) => {
  const [form, setForm] = useState(() => pick(settings));
  const [newDuration, setNewDuration] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }

  const original = pick(settings);
  const dirty = JSON.stringify(form) !== JSON.stringify(original);
  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const addDuration = () => {
    const days = Number(newDuration);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setMessage({ type: "error", text: "จำนวนวันระงับต้องเป็นจำนวนเต็ม 1–365" });
      return;
    }
    set("suspend_durations", [...new Set([...form.suspend_durations, days])].sort((a, b) => a - b));
    setNewDuration("");
  };

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    if (form.categories.includes(name)) {
      setMessage({ type: "error", text: `มีหมวด "${name}" อยู่แล้ว` });
      return;
    }
    // เพิ่มก่อนหมวด "อื่น ๆ" ให้ "อื่น ๆ" อยู่ท้ายเสมอ
    const others = form.categories.filter((c) => c !== OTHER_CATEGORY);
    set("categories", [...others, name, ...(form.categories.includes(OTHER_CATEGORY) ? [OTHER_CATEGORY] : [])]);
    setNewCategory("");
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const changed = Object.fromEntries(SYSTEM_KEYS.filter((k) => JSON.stringify(form[k]) !== JSON.stringify(original[k])).map((k) => [k, form[k]]));
    try {
      const res = await adminApi.put("/admin/settings", { settings: changed });
      onSaved(res.data.settings);
      setForm(pick(res.data.settings));
      setMessage({ type: "success", text: "บันทึกแล้ว — มีผลทันทีกับทั้งระบบ" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "บันทึกไม่สำเร็จ" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 sm:space-y-5">
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <Section icon={Sparkles} title="การจับคู่อัตโนมัติ" hint="แจ้งเตือนเจ้าของของหาย (กระดิ่ง อีเมล LINE) เมื่อคะแนนความใกล้เคียงถึงเกณฑ์">
          <div>
            <label htmlFor="set-min-score" className={labelClass}>
              เกณฑ์คะแนนขั้นต่ำ: <span className="font-bold text-slate-800">{form.match_min_score}</span> / 100
            </label>
            <input
              id="set-min-score"
              type="range"
              min={30}
              max={100}
              step={5}
              value={form.match_min_score}
              onChange={(e) => set("match_min_score", Number(e.target.value))}
              className="w-full accent-[#006664]"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>30 · แจ้งบ่อย อาจไม่ตรง</span>
              <span>ค่าเริ่มต้น {defaults.match_min_score}</span>
              <span>100 · แจ้งเฉพาะที่ตรงมาก</span>
            </div>
          </div>
        </Section>

        <Section icon={Award} title="เกียรติบัตร" hint="ส่งเกียรติบัตร PDF ทางอีเมลเมื่อผู้ใช้คืนของครบตามจำนวน">
          <div>
            <label htmlFor="set-milestone" className={labelClass}>ออกเกียรติบัตรทุก ๆ (ครั้งที่คืนของสำเร็จ)</label>
            <input
              id="set-milestone"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={form.certificate_milestone}
              onChange={(e) => set("certificate_milestone", Number(e.target.value))}
              className={`${inputClass} sm:max-w-32`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="set-signer" className={labelClass}>ชื่อผู้ลงนาม (ไม่บังคับ)</label>
              <input id="set-signer" value={form.certificate_signer_name} maxLength={100} onChange={(e) => set("certificate_signer_name", e.target.value)} placeholder="เช่น ผศ.ดร.สมชาย ใจดี" className={inputClass} />
            </div>
            <div>
              <label htmlFor="set-signer-title" className={labelClass}>ตำแหน่ง</label>
              <input id="set-signer-title" value={form.certificate_signer_title} maxLength={100} onChange={(e) => set("certificate_signer_title", e.target.value)} placeholder="เช่น ผู้ช่วยคณบดีฝ่ายกิจการนิสิต" className={inputClass} />
            </div>
          </div>
        </Section>
      </div>

      <Section icon={UserX} title="ตัวเลือกระยะเวลาระงับบัญชี" hint="ตัวเลือกที่แสดงตอนแอดมินระงับบัญชีผู้ใช้ (1–6 ตัวเลือก, 1–365 วัน)">
        <div className="flex flex-wrap items-center gap-2">
          {form.suspend_durations.map((days) => (
            <span key={days} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 text-sm font-medium text-slate-700">
              {days} วัน
              <button
                type="button"
                onClick={() => set("suspend_durations", form.suspend_durations.filter((d) => d !== days))}
                disabled={form.suspend_durations.length <= 1}
                aria-label={`ลบตัวเลือก ${days} วัน`}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-red-500 disabled:opacity-30"
              >
                <X size={14} />
              </button>
            </span>
          ))}
          {form.suspend_durations.length < 6 && (
            <span className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDuration())}
                placeholder="วัน"
                aria-label="จำนวนวันระงับที่จะเพิ่ม"
                className={`${inputClass} w-24`}
              />
              <button type="button" onClick={addDuration} className="flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <Plus size={15} /> เพิ่ม
              </button>
            </span>
          )}
        </div>
      </Section>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <Section icon={Tags} title="หมวดหมู่สิ่งของ" hint="แสดงในฟอร์มแจ้งของ หน้าค้นหา และหน้าแก้ไขโพสต์ (2–20 หมวด) — โพสต์เดิมไม่เปลี่ยนตาม">
          <ul className="space-y-2">
            {form.categories.map((name, index) => {
              const locked = name === OTHER_CATEGORY;
              return (
                <li key={`${index}-${locked}`} className="flex items-center gap-2">
                  <input
                    value={name}
                    disabled={locked}
                    maxLength={100}
                    onChange={(e) => set("categories", form.categories.map((c, i) => (i === index ? e.target.value : c)))}
                    aria-label={`ชื่อหมวดที่ ${index + 1}`}
                    className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-500`}
                  />
                  {locked ? (
                    <span className={`${iconButton} hover:bg-transparent hover:text-slate-400`} title="หมวดนี้ใช้กับการจับคู่อัตโนมัติ ลบไม่ได้">
                      <Lock size={15} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => set("categories", form.categories.filter((_, i) => i !== index))}
                      disabled={form.categories.length <= 2}
                      aria-label={`ลบหมวด ${name}`}
                      className={`${iconButton} disabled:opacity-30`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {form.categories.length < 20 && (
            <div className="flex gap-2">
              <input
                value={newCategory}
                maxLength={100}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                placeholder="ชื่อหมวดใหม่ เช่น ร่ม, ขวดน้ำ"
                aria-label="ชื่อหมวดใหม่"
                className={inputClass}
              />
              <button type="button" onClick={addCategory} className="flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <Plus size={15} /> เพิ่ม
              </button>
            </div>
          )}
        </Section>

        <Section icon={MapPin} title="จุดรับฝากของ" hint="แสดงเป็นตัวเลือกในฟอร์มแจ้งของ ช่องจุดรับฝาก (ไม่เกิน 20 จุด)">
          {form.deposit_points.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีจุดรับฝาก</p>}
          <ul className="space-y-2">
            {form.deposit_points.map((point, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  <input
                    value={point.name}
                    maxLength={255}
                    onChange={(e) => set("deposit_points", form.deposit_points.map((p, i) => (i === index ? { ...p, name: e.target.value } : p)))}
                    placeholder="ชื่อจุด เช่น กองกิจการนิสิต ชั้น 1"
                    aria-label={`ชื่อจุดรับฝากที่ ${index + 1}`}
                    className={inputClass}
                  />
                  <input
                    value={point.hours}
                    maxLength={100}
                    onChange={(e) => set("deposit_points", form.deposit_points.map((p, i) => (i === index ? { ...p, hours: e.target.value } : p)))}
                    placeholder="เวลาทำการ เช่น จ.–ศ. 08:30–16:30"
                    aria-label={`เวลาทำการจุดที่ ${index + 1}`}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => set("deposit_points", form.deposit_points.filter((_, i) => i !== index))}
                  aria-label={`ลบจุดรับฝาก ${point.name || index + 1}`}
                  className={iconButton}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
          {form.deposit_points.length < 20 && (
            <button
              type="button"
              onClick={() => set("deposit_points", [...form.deposit_points, { name: "", hours: "" }])}
              className="flex min-h-10 items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Plus size={15} /> เพิ่มจุดรับฝาก
            </button>
          )}
        </Section>
      </div>

      {/* แถบบันทึกติดล่างจอ */}
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-end">
        {message && (
          <p role={message.type === "error" ? "alert" : "status"} className={`flex items-center gap-1.5 text-sm sm:mr-auto ${message.type === "error" ? "text-red-600" : "text-brand"}`}>
            {message.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {message.text}
          </p>
        )}
        {!message && dirty && <p className="text-sm text-amber-600 sm:mr-auto">มีการเปลี่ยนแปลงที่ยังไม่บันทึก</p>}
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => {
              setForm(original);
              setMessage(null);
            }}
            disabled={!dirty || saving}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <RotateCcw size={15} /> ยกเลิก
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg gradient-primary px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={15} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsForm;
