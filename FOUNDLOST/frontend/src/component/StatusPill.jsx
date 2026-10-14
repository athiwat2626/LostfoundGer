import { itemStatus } from "./itemStatus";

// ป้ายสถานะโพสต์ (ไอคอน + ข้อความ)
const StatusPill = ({ item, className = "" }) => {
  const status = itemStatus(item);
  const Icon = status.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${status.tone} ${className}`}>
      <Icon size={11} aria-hidden="true" />
      {status.label}
    </span>
  );
};

export default StatusPill;
