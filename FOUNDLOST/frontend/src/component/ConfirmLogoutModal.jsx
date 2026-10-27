import { useEffect } from "react";
import { LogOut } from "lucide-react";

// ป๊อปอัพยืนยันก่อนออกจากระบบ — ใช้ร่วมกันทั้งฝั่งผู้ใช้และแอดมิน
const ConfirmLogoutModal = ({ open, onConfirm, onCancel }) => {
  // กด Esc เพื่อยกเลิก
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-logout-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <LogOut size={22} />
        </div>
        <h2 id="confirm-logout-title" className="text-lg font-bold text-slate-800">
          ออกจากระบบ?
        </h2>
        <p className="mt-1 text-sm text-slate-500">คุณต้องการออกจากระบบจริง ๆ ใช่ไหม</p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmLogoutModal;
