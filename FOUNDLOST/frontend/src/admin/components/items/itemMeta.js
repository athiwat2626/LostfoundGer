import { Search, PackageCheck, CheckCircle2 } from "lucide-react";

// ข้อความและฟิลด์ที่ต่างกันระหว่างหน้าของหาย / ของพบ (หน้าอื่นใช้ร่วมกันทั้งหมด)
export const ITEM_TYPES = {
  lost: {
    title: "รายการแจ้งของหาย",
    subtitle: "ตรวจสอบ แก้ไข และจัดการโพสต์แจ้งของหายของผู้ใช้",
    dateField: "lost_date",
    locationField: "lost_location",
    dateLabel: "วันที่หาย",
    locationLabel: "สถานที่หาย",
    reporterLabel: "ผู้แจ้งของหาย",
    endpoint: "lostItem",
  },
  found: {
    title: "รายการแจ้งพบของ",
    subtitle: "ตรวจสอบ แก้ไข และจัดการของที่มีผู้พบและนำมาฝาก",
    dateField: "found_date",
    locationField: "found_location",
    dateLabel: "วันที่พบ",
    locationLabel: "สถานที่พบ",
    reporterLabel: "ผู้แจ้งพบของ",
    endpoint: "foundItem",
  },
};

// สถานะที่มีจริงในฐานข้อมูล: open / returned
export const statusMeta = (type, status) =>
  status === "returned"
    ? { label: type === "lost" ? "ได้รับคืนแล้ว" : "ส่งคืนแล้ว", icon: CheckCircle2, className: "bg-sky-50 text-sky-700 ring-sky-200" }
    : type === "lost"
      ? { label: "กำลังตามหา", icon: Search, className: "bg-orange-50 text-orange-700 ring-orange-200" }
      : { label: "รอเจ้าของมารับ", icon: PackageCheck, className: "bg-emerald-50 text-emerald-700 ring-emerald-200" };

export const STATUS_FILTERS = (type) => [
  { value: "", label: "ทุกสถานะ" },
  { value: "open", label: statusMeta(type, "open").label },
  { value: "returned", label: statusMeta(type, "returned").label },
];

export const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

export const ownerName = (item) =>
  item.owner_first_name ? `${item.owner_first_name} ${item.owner_last_name || ""}`.trim() : null;

// DATE จาก API → ค่าสำหรับ <input type="date"> ตามเวลาเครื่อง (ไม่ใช้ toISOString ซึ่งเลื่อนวันตาม UTC)
export const toDateInput = (value) => (value ? new Date(value).toLocaleDateString("sv-SE") : "");
