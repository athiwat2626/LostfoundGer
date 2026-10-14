import { useState } from "react";
import { UserX } from "lucide-react";

const DURATIONS = [
  { label: "3 วัน", value: 3 },
  { label: "7 วัน", value: 7 },
  { label: "30 วัน", value: 30 },
  { label: "ถาวร (แบน)", value: "permanent" },
];

// รับ onConfirm({ action, duration_days }) — Permanent จะแปลงเป็น action "ban" ให้เอง
const SuspendModal = ({ userLabel, onConfirm, onCancel, submitting }) => {
  const [selected, setSelected] = useState(3);

  const handleConfirm = () => {
    if (selected === "permanent") {
      onConfirm({ action: "ban" });
    } else {
      onConfirm({ action: "suspend", duration_days: selected });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <UserX size={22} />
        </div>
        <h2 className="text-center text-lg font-bold text-slate-800">ระงับบัญชีผู้ใช้?</h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          เลือกระยะเวลาระงับบัญชีของ{" "}
          <span className="font-semibold text-slate-700">{userLabel}</span> การดำเนินการนี้จะถูกบันทึกไว้
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => setSelected(d.value)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                selected === d.value
                  ? "border-brand bg-brand-50 text-brand"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-xl gradient-primary py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "..." : "ยืนยัน"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuspendModal;
