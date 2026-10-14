import { Briefcase, KeyRound, Smartphone, Gem, FileText, Shapes } from "lucide-react";

// หมวดหมู่สิ่งของที่บันทึกลงคอลัมน์ category (ใช้ร่วมกันระหว่างฟอร์มแจ้ง หน้าค้นหา และหน้าแก้ไขโพสต์)
export const CATEGORIES = [
  { value: "กระเป๋า", icon: Briefcase, tone: "text-emerald-600" },
  { value: "กุญแจ", icon: KeyRound, tone: "text-amber-500" },
  { value: "อุปกรณ์อิเล็กทรอนิกส์", label: "อิเล็กทรอนิกส์", icon: Smartphone, tone: "text-sky-600" },
  { value: "เครื่องประดับ", icon: Gem, tone: "text-fuchsia-500" },
  { value: "เอกสาร", label: "เอกสาร / บัตร", icon: FileText, tone: "text-indigo-500" },
  { value: "อื่น ๆ", icon: Shapes, tone: "text-rose-500" },
];
