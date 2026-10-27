import { useState } from "react";
import { Megaphone, Wrench, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { ANNOUNCEMENT_TYPES } from "../../component/announcementTypes";
import { AnnouncementCard as AnnouncementPreview } from "../../component/AnnouncementBanner";
import adminApi from "../api/adminApi";
import ConfirmDialog from "../../component/ConfirmDialog";

const cardClass = "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5";
const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 sm:py-2 sm:text-sm";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

// ประเภทประกาศเดียวกับป้ายจริงในหน้าเว็บผู้ใช้
const TONES = Object.entries(ANNOUNCEMENT_TYPES).map(([id, t]) => ({ id, ...t }));

const Toggle = ({ checked, onChange, label, id }) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-brand" : "bg-slate-300"}`}
  >
    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`} />
  </button>
);

const Feedback = ({ message }) =>
  message ? (
    <p role={message.type === "error" ? "alert" : "status"} className={`flex items-center gap-1.5 text-sm ${message.type === "error" ? "text-red-600" : "text-brand"}`}>
      {message.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      {message.text}
    </p>
  ) : null;

const useSave = (key, onSaved) => {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const save = async (value, successText) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await adminApi.put("/admin/settings", { settings: { [key]: value } });
      onSaved(res.data.settings);
      setMessage({ type: "success", text: successText });
      return true;
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "บันทึกไม่สำเร็จ" });
      return false;
    } finally {
      setSaving(false);
    }
  };
  return { saving, message, setMessage, save };
};

// ─── ประกาศบนหน้าเว็บผู้ใช้ ───────────────────────────────────────────────────
const AnnouncementCard = ({ value, onSaved }) => {
  const [form, setForm] = useState(value);
  const { saving, message, setMessage, save } = useSave("announcement", onSaved);
  const dirty = JSON.stringify(form) !== JSON.stringify(value);
  const set = (key, v) => {
    setForm((prev) => ({ ...prev, [key]: v }));
    setMessage(null);
  };

  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Megaphone size={18} className="text-brand" aria-hidden="true" /> ประกาศถึงผู้ใช้
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">แถบประกาศด้านบนของทุกหน้าในเว็บผู้ใช้ ผู้ใช้กดปิดได้</p>
        </div>
        <Toggle id="announcement-enabled" checked={form.enabled} onChange={(v) => set("enabled", v)} label="เปิดใช้ประกาศ" />
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="announcement-message" className={labelClass}>ข้อความ ({form.message.length}/300)</label>
          <textarea
            id="announcement-message"
            value={form.message}
            maxLength={300}
            rows={3}
            onChange={(e) => set("message", e.target.value)}
            placeholder="เช่น จุดรับฝากของกองกิจการนิสิตปิดทำการ 13–15 เม.ย. เปิดอีกครั้ง 16 เม.ย."
            className={`${inputClass} resize-none`}
          />
        </div>
        <fieldset>
          <legend className={labelClass}>รูปแบบ</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TONES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set("tone", t.id)}
                  aria-pressed={form.tone === t.id}
                  className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold ${
                    form.tone === t.id ? `${t.box} ${t.titleClass} ring-2 ring-brand/20` : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="announcement-start" className={labelClass}>เริ่มแสดง (ไม่บังคับ)</label>
            <input id="announcement-start" type="date" value={form.starts_on || ""} max={form.ends_on || undefined} onChange={(e) => set("starts_on", e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="announcement-end" className={labelClass}>สิ้นสุด (ไม่บังคับ)</label>
            <input id="announcement-end" type="date" value={form.ends_on || ""} min={form.starts_on || undefined} onChange={(e) => set("ends_on", e.target.value || null)} className={inputClass} />
          </div>
        </div>

        {form.message.trim() && (
          <div>
            <p className={labelClass}>ตัวอย่าง</p>
            <AnnouncementPreview announcement={form} className={form.enabled ? "" : "opacity-50"} />
            {!form.enabled && <p className="mt-1 text-xs text-slate-400">ปิดอยู่ — ผู้ใช้ยังไม่เห็นประกาศนี้</p>}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <Feedback message={message} />
          <button
            type="button"
            onClick={() => save(form, form.enabled ? "บันทึกแล้ว — ผู้ใช้จะเห็นประกาศภายในไม่กี่นาที" : "บันทึกแล้ว — ประกาศปิดอยู่")}
            disabled={!dirty || saving}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg gradient-primary px-5 text-sm font-semibold text-white disabled:opacity-50 sm:ml-auto"
          >
            <Save size={15} /> {saving ? "กำลังบันทึก..." : "บันทึกประกาศ"}
          </button>
        </div>
      </div>
    </section>
  );
};

// ─── โหมดปิดปรับปรุง ─────────────────────────────────────────────────────────
const MaintenanceCard = ({ value, onSaved }) => {
  const [message, setMessageText] = useState(value.message || "");
  const [confirming, setConfirming] = useState(null); // true = เปิด, false = ปิด
  const { saving, message: feedback, save } = useSave("maintenance", onSaved);

  const apply = async (enabled) => {
    const ok = await save({ enabled, message }, enabled ? "เปิดโหมดปิดปรับปรุงแล้ว — ผู้ใช้ทั่วไปใช้งานไม่ได้" : "ปิดโหมดปิดปรับปรุงแล้ว — ผู้ใช้กลับมาใช้งานได้");
    if (ok) setConfirming(null);
  };

  return (
    <section className={`${cardClass} ${value.enabled ? "border-amber-300 ring-1 ring-amber-200" : ""}`}>
      <ConfirmDialog
        open={confirming !== null}
        title={confirming ? "เปิดโหมดปิดปรับปรุง?" : "เปิดระบบให้ผู้ใช้ใช้งาน?"}
        message={
          confirming
            ? "ผู้ใช้ทั่วไปจะเข้าเว็บและแจ้งของไม่ได้จนกว่าจะปิดโหมดนี้ (แอดมินยังใช้งานได้ตามปกติ, LINE ยังรับข้อความได้)"
            : "ผู้ใช้จะกลับมาใช้งานเว็บได้ทันที"
        }
        confirmLabel={confirming ? "เปิดโหมดปิดปรับปรุง" : "เปิดระบบ"}
        tone={confirming ? "danger" : "primary"}
        busy={saving}
        onConfirm={() => apply(confirming)}
        onCancel={() => setConfirming(null)}
      />

      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <Wrench size={18} className="text-amber-600" aria-hidden="true" /> โหมดปิดปรับปรุง
      </h2>
      <p className="mt-0.5 text-xs text-slate-500">ปิดเว็บฝั่งผู้ใช้ชั่วคราว เช่น ระหว่างย้ายเซิร์ฟเวอร์หรือแก้ไขข้อมูลจำนวนมาก</p>

      <p
        className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
          value.enabled ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
        }`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${value.enabled ? "bg-amber-500" : "bg-emerald-500"}`} aria-hidden="true" />
        {value.enabled ? "ปิดปรับปรุงอยู่ — ผู้ใช้ทั่วไปใช้งานไม่ได้" : "ระบบเปิดใช้งานตามปกติ"}
      </p>

      <div className="mt-3">
        <label htmlFor="maintenance-message" className={labelClass}>ข้อความที่ผู้ใช้จะเห็น ({message.length}/300)</label>
        <textarea
          id="maintenance-message"
          value={message}
          maxLength={300}
          rows={3}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="เช่น ปิดปรับปรุงระบบ 20:00–22:00 น. ขออภัยในความไม่สะดวก"
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <Feedback message={feedback} />
        <div className="grid gap-2 sm:ml-auto sm:flex">
          {value.enabled && message !== (value.message || "") && (
            <button
              type="button"
              onClick={() => apply(true)}
              disabled={saving}
              className="flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              บันทึกข้อความ
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirming(!value.enabled)}
            disabled={saving}
            className={`flex min-h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-50 ${
              value.enabled ? "gradient-primary" : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {value.enabled ? "เปิดระบบให้ผู้ใช้" : "เปิดโหมดปิดปรับปรุง"}
          </button>
        </div>
      </div>
    </section>
  );
};

const AnnouncementSettingsForm = ({ settings, onSaved }) => (
  <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
    <AnnouncementCard value={settings.announcement} onSaved={onSaved} />
    <MaintenanceCard value={settings.maintenance} onSaved={onSaved} />
  </div>
);

export default AnnouncementSettingsForm;
