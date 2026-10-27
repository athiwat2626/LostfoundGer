import { useSyncExternalStore } from "react";

// ค่าการแสดงผลต่ออุปกรณ์ (ธีม + ขนาดตัวอักษร) เก็บใน localStorage ของเครื่องนี้
// - ขนาดตัวอักษร: ตั้ง font-size ของ <html> → ทุกอย่างที่ใช้หน่วย rem ขยายตาม
// - ธีม: ตั้ง data-theme บน <html>; สีโหมดมืดอยู่ใน App.css (ใช้กับหน้าที่ครอบด้วย .user-app)
const KEY = "displayPrefs";
const DEFAULTS = { theme: "system", fontScale: "normal" };

export const THEMES = ["system", "light", "dark"];
export const FONT_SCALES = {
  normal: { label: "ปกติ", size: "100%" },
  large: { label: "ใหญ่", size: "112.5%" },
  xlarge: { label: "ใหญ่มาก", size: "125%" },
};

const darkQuery = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      theme: THEMES.includes(saved.theme) ? saved.theme : DEFAULTS.theme,
      fontScale: FONT_SCALES[saved.fontScale] ? saved.fontScale : DEFAULTS.fontScale,
    };
  } catch {
    return { ...DEFAULTS };
  }
};

const resolveTheme = (theme) => (theme === "system" ? (darkQuery?.matches ? "dark" : "light") : theme);

let state = null;
const listeners = new Set();

const build = (prefs) => ({ ...prefs, resolvedTheme: resolveTheme(prefs.theme) });

const apply = () => {
  const root = document.documentElement;
  root.style.fontSize = FONT_SCALES[state.fontScale].size;
  root.dataset.theme = state.resolvedTheme;
};

const emit = () => listeners.forEach((listener) => listener());

export const initDisplayPrefs = () => {
  state = build(read());
  apply();
  // ผู้ใช้เลือก "ตามระบบ" แล้วเปลี่ยนธีมของเครื่อง → เปลี่ยนตามทันที
  darkQuery?.addEventListener?.("change", () => {
    state = build(state);
    apply();
    emit();
  });
};

export const setDisplayPrefs = (patch) => {
  const next = { theme: state.theme, fontScale: state.fontScale, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // บันทึกไม่ได้ (เช่น โหมดส่วนตัว) ก็ยังใช้ค่าใหม่ได้จนกว่าจะปิดหน้า
  }
  state = build(next);
  apply();
  emit();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useDisplayPrefs = () => {
  if (!state) initDisplayPrefs();
  return useSyncExternalStore(subscribe, () => state);
};
