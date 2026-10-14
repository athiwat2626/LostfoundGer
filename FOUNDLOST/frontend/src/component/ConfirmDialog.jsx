import { useEffect } from "react";

// กล่องยืนยันทั่วไป (ยืนยันการรับคืน, ลบโพสต์ ฯลฯ)
const ConfirmDialog = ({ open, title, message, confirmLabel = "ยืนยัน", tone = "primary", busy, onConfirm, onCancel }) => {
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
    <div className="fixed inset-0 z-1100 flex items-center justify-center bg-slate-900/40 p-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
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
            disabled={busy}
            className={`rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
              tone === "danger" ? "bg-red-600 hover:bg-red-700" : "gradient-primary"
            }`}
          >
            {busy ? "กำลังดำเนินการ..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
