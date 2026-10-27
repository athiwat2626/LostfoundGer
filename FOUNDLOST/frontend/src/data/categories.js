import { Briefcase, KeyRound, Smartphone, Gem, FileText, Shapes, Tag } from "lucide-react";

// หมวดหมู่เริ่มต้น (ใช้เมื่อโหลดค่าจากระบบไม่ได้) — แอดมินแก้รายชื่อหมวดได้ที่ ตั้งค่า → ค่าระบบ
// ค่า value คือข้อความที่บันทึกลงคอลัมน์ category
export const CATEGORIES = [
  { value: "กระเป๋า", icon: Briefcase, tone: "text-emerald-600" },
  { value: "กุญแจ", icon: KeyRound, tone: "text-amber-500" },
  { value: "อุปกรณ์อิเล็กทรอนิกส์", label: "อิเล็กทรอนิกส์", icon: Smartphone, tone: "text-sky-600" },
  { value: "เครื่องประดับ", icon: Gem, tone: "text-fuchsia-500" },
  { value: "เอกสาร", label: "เอกสาร / บัตร", icon: FileText, tone: "text-indigo-500" },
  { value: "อื่น ๆ", icon: Shapes, tone: "text-rose-500" },
];

const KNOWN = new Map(CATEGORIES.map((c) => [c.value, c]));

// รายชื่อหมวดจากระบบ → มีไอคอน (หมวดที่แอดมินเพิ่มใหม่ใช้ไอคอนป้ายทั่วไป)
export const withCategoryIcons = (names = []) =>
  names.map((name) => KNOWN.get(name) || { value: name, icon: Tag, tone: "text-teal-600" });
