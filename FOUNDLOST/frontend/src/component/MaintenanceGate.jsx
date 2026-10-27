import { Link, useLocation } from "react-router-dom";
import { Wrench } from "lucide-react";
import { useSiteSettings } from "./siteSettings";

// โหมดปิดปรับปรุง (ตั้งค่าในหน้าแอดมิน): หน้าเว็บผู้ใช้แสดงหน้าแจ้งปิด ส่วนหน้าแอดมินใช้งานได้ตามปกติ
// backend ปฏิเสธคำขอของผู้ใช้ด้วย 503 อยู่แล้ว หน้านี้ช่วยให้ผู้ใช้เห็นข้อความที่เข้าใจได้
const MaintenanceGate = ({ children }) => {
  const { pathname } = useLocation();
  const { maintenance } = useSiteSettings();

  if (!maintenance?.enabled || pathname.startsWith("/admin")) return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Wrench size={30} aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-semibold text-brand">KU Lost &amp; Found</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">ระบบปิดปรับปรุงชั่วคราว</h1>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
          {maintenance.message || "ขออภัยในความไม่สะดวก กรุณากลับมาใหม่ภายหลัง"}
        </p>
        <Link to="/admin/login" className="mt-8 inline-block text-xs text-slate-400 hover:text-brand hover:underline">
          สำหรับผู้ดูแลระบบ
        </Link>
      </div>
    </main>
  );
};

export default MaintenanceGate;
