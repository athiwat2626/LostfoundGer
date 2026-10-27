import { Megaphone, Info, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";

// ประเภทประกาศ (ค่า tone ที่บันทึกใน system_settings.announcement)
// สีใช้ตัวแปรของ Tailwind ที่โหมดมืดสลับให้อัตโนมัติ (App.css)
export const ANNOUNCEMENT_TYPES = {
  info: {
    label: "ทั่วไป",
    title: "ประกาศ",
    icon: Megaphone,
    box: "border-brand-soft/50 bg-brand-50",
    iconBox: "bg-white/80 text-brand ring-brand-soft/40",
    titleClass: "text-brand",
  },
  important: {
    label: "สำคัญ",
    title: "ประกาศสำคัญ",
    icon: Info,
    box: "border-sky-200 bg-sky-50",
    iconBox: "bg-white/80 text-sky-600 ring-sky-200",
    titleClass: "text-sky-700",
  },
  maintenance: {
    label: "ปิดปรับปรุง",
    title: "แจ้งปิดปรับปรุงระบบ",
    icon: Wrench,
    box: "border-slate-200 bg-slate-50",
    iconBox: "bg-white/80 text-slate-600 ring-slate-200",
    titleClass: "text-slate-700",
  },
  warning: {
    label: "เตือน",
    title: "โปรดทราบ",
    icon: AlertTriangle,
    box: "border-amber-200 bg-amber-50",
    iconBox: "bg-white/80 text-amber-600 ring-amber-200",
    titleClass: "text-amber-700",
  },
  success: {
    label: "ข่าวดี",
    title: "ข่าวดี",
    icon: CheckCircle2,
    box: "border-emerald-200 bg-emerald-50",
    iconBox: "bg-white/80 text-emerald-700 ring-emerald-200",
    titleClass: "text-emerald-700",
  },
};

export const announcementType = (tone) => ANNOUNCEMENT_TYPES[tone] || ANNOUNCEMENT_TYPES.info;

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// "2026-10-14" → "14 ต.ค. 2569" (วันที่จากระบบเป็น YYYY-MM-DD ไม่มีเวลา จึงแปลงตรง ๆ ไม่ผ่าน timezone)
const thaiDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return match ? `${Number(match[3])} ${THAI_MONTHS[Number(match[2]) - 1]} ${Number(match[1]) + 543}` : null;
};

// ช่วงวันที่ของประกาศตามข้อมูลจริง (ไม่มีวันที่ → null)
export const announcementPeriod = ({ starts_on, ends_on } = {}) => {
  const start = thaiDate(starts_on);
  const end = thaiDate(ends_on);
  if (start && end) return start === end ? `เฉพาะวันที่ ${start}` : `${start} – ${end}`;
  if (end) return `ถึง ${end}`;
  if (start) return `ตั้งแต่ ${start}`;
  return null;
};
