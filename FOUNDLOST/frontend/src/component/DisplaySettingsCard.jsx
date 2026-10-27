import { Monitor, Sun, Moon, Type } from "lucide-react";
import { useDisplayPrefs, setDisplayPrefs, FONT_SCALES } from "./displayPrefs";

const THEME_OPTIONS = [
  { id: "system", label: "ตามระบบ", icon: Monitor },
  { id: "light", label: "สว่าง", icon: Sun },
  { id: "dark", label: "มืด", icon: Moon },
];
// ตัวอย่างขนาด "ก" บนปุ่มเลือกขนาดตัวอักษร
const FONT_PREVIEW = { normal: "text-sm", large: "text-base", xlarge: "text-lg" };

const optionClass = (active) =>
  `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition ${
    active ? "border-brand bg-brand-50 text-brand ring-2 ring-brand/20" : "border-slate-200 text-slate-600 hover:bg-slate-50"
  }`;

// ─── การ์ดตั้งค่าการแสดงผล (ธีม + ขนาดตัวอักษร) — มีผลกับเครื่องนี้เท่านั้น ─────────────
const DisplaySettingsCard = ({ className = "" }) => {
  const prefs = useDisplayPrefs();

  return (
    <section className={`card p-5 sm:p-6 ${className}`} aria-labelledby="display-settings-title">
      <h2 id="display-settings-title" className="text-lg font-bold text-slate-900">การแสดงผล</h2>
      <p className="mt-0.5 text-xs text-slate-500">ตั้งค่าเฉพาะอุปกรณ์นี้</p>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-semibold text-slate-800">ธีม</legend>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDisplayPrefs({ theme: id })}
              aria-pressed={prefs.theme === id}
              className={optionClass(prefs.theme === id)}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        {prefs.theme === "system" && (
          <p className="mt-1.5 text-xs text-slate-400">ตอนนี้ใช้ธีม{prefs.resolvedTheme === "dark" ? "มืด" : "สว่าง"}ตามการตั้งค่าของเครื่อง</p>
        )}
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <Type size={15} aria-hidden="true" /> ขนาดตัวอักษร
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(FONT_SCALES).map(([id, { label }]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDisplayPrefs({ fontScale: id })}
              aria-pressed={prefs.fontScale === id}
              className={optionClass(prefs.fontScale === id)}
            >
              <span className={`font-bold leading-none ${FONT_PREVIEW[id]}`} aria-hidden="true">ก</span>
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          ตัวอย่าง: พบกระเป๋าสตางค์สีดำ ที่อาคารเรียนรวม 1 เมื่อ 14 ต.ค. 2569
        </p>
      </fieldset>
    </section>
  );
};

export default DisplaySettingsCard;
