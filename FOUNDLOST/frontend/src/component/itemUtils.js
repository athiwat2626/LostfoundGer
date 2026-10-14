import axios from "axios";
import { Briefcase, KeyRound, Smartphone, FileText, Shapes } from "lucide-react";

// ข้อมูลและฟังก์ชันช่วยของรายการของพบ/ของหาย (ใช้ร่วมกับ itemUi.jsx)
// ตั้ง VITE_API_URL ใน frontend/.env เมื่อเปิดเว็บจากเครื่องอื่น (เช่น มือถือผ่านเมนู LINE) — ค่าเริ่มต้นคือ backend ในเครื่อง
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
export const PAGE_SIZE = 8;

// ─── ข้อมูลรายการ ────────────────────────────────────────────────────────────────
const TYPE_FIELDS = {
  found: { endpoint: "foundItem", date: "found_date", location: "found_location" },
  lost: { endpoint: "lostItem", date: "lost_date", location: "lost_location" },
};

// เพิ่มฟิลด์กลาง type/date/location ให้ของพบและของหายใช้ร่วมกันได้
export const normalizeItem = (item, type) => ({
  ...item,
  type,
  date: item[TYPE_FIELDS[type].date],
  location: item[TYPE_FIELDS[type].location],
});

// โหลดรายการตามประเภท เรียงจากใหม่ไปเก่า (โหลดไม่ได้คืน [])
export const fetchItems = async (type) => {
  try {
    const res = await axios.get(`${API_URL}/${TYPE_FIELDS[type].endpoint}`);
    if (!Array.isArray(res.data)) return [];
    return res.data
      .map((item) => normalizeItem(item, type))
      .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
  } catch {
    return [];
  }
};

export const timeAgo = (value) => {
  if (!value) return "";
  const diff = Math.max(0, Math.floor((Date.now() - new Date(value)) / 1000));
  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม. ที่แล้ว`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  return "เมื่อนานมาแล้ว";
};

export const formatThaiDate = (value, month = "short") => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", { day: "numeric", month, year: "numeric" });
};

// ─── ค้นหาด่วน ─────────────────────────────────────────────────────────────────
// "อื่นๆ" คือรายการที่ไม่เข้าหมวดใดด้านบน
export const QUICK_FILTERS = [
  { id: "all", label: "ทั้งหมด", icon: null, tone: "bg-slate-600 hover:bg-slate-700", keywords: [] },
  { id: "bag", label: "กระเป๋า", icon: Briefcase, tone: "bg-green-500 hover:bg-green-600", keywords: ["กระเป๋า", "bag", "wallet"] },
  { id: "key", label: "Key", icon: KeyRound, tone: "bg-orange-400 hover:bg-orange-500", keywords: ["กุญแจ", "key"] },
  { id: "electronic", label: "อิเล็กทรอนิกส์", icon: Smartphone, tone: "bg-indigo-500 hover:bg-indigo-600", keywords: ["อิเล็กทรอนิกส์", "โทรศัพท์", "phone", "laptop", "tablet"] },
  { id: "document", label: "เอกสาร", icon: FileText, tone: "bg-purple-600 hover:bg-purple-700", keywords: ["เอกสาร", "บัตร", "document"] },
  { id: "other", label: "อื่นๆ", icon: Shapes, tone: "bg-rose-800 hover:bg-rose-900", keywords: [] },
];

const itemText = (item) => `${item.category || ""} ${item.item_name || ""}`.toLowerCase();

export const matchesFilter = (item, filterId) => {
  if (filterId === "all") return true;
  const text = itemText(item);
  const hits = (f) => f.keywords.some((k) => text.includes(k.toLowerCase()));
  if (filterId === "other") return !QUICK_FILTERS.some((f) => f.keywords.length && hits(f));
  return hits(QUICK_FILTERS.find((f) => f.id === filterId));
};

export const matchesQuery = (item, query) => {
  const q = query.trim().toLowerCase();
  return !q || `${item.item_name || ""} ${item.location || ""} ${item.category || ""}`.toLowerCase().includes(q);
};

// แบ่งหน้าให้รายการที่กรองแล้ว
export const paginate = (items, page) => {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  return {
    totalPages,
    currentPage,
    pageItems: items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
  };
};

// ส่งข้อมูลรายการไปหน้ารายงาน
export const reportState = (item) => ({
  itemId: item.item_id,
  itemType: item.type,
  itemName: item.item_name,
  reportedUser: item.student_id,
});
