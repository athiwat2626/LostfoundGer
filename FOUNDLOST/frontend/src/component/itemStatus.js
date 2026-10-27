import { CheckCircle2, Search, PackageCheck, Users } from "lucide-react";

// สถานะของโพสต์ (ใช้ร่วมกันทุกหน้า) — มีทั้งไอคอนและข้อความ ไม่ใช้สีอย่างเดียวในการบอกสถานะ
// ข้อมูลจริงในระบบ: status = "open" | "returned", pending_claims = จำนวนผู้ติดต่อที่รอยืนยัน (เฉพาะโพสต์ของฉัน)
export const itemStatus = (item) => {
  if (item.status === "returned") {
    return { key: "returned", label: "คืนของสำเร็จ", icon: CheckCircle2, tone: "bg-sky-50 text-sky-700 ring-sky-200" };
  }
  if (item.pending_claims > 0) {
    return { key: "contacted", label: "มีผู้ติดต่อ รอรับคืน", icon: Users, tone: "bg-amber-50 text-amber-700 ring-amber-200" };
  }
  if (item.type === "found") {
    return { key: "waiting", label: "รอเจ้าของมารับ", icon: PackageCheck, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  }
  return { key: "searching", label: "กำลังตามหา", icon: Search, tone: "bg-orange-50 text-orange-700 ring-orange-200" };
};
