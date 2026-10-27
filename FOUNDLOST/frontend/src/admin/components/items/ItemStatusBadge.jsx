import { statusMeta } from "./itemMeta";

// ป้ายสถานะรายการ (ไอคอน + ข้อความ ไม่ใช้สีอย่างเดียว)
const ItemStatusBadge = ({ type, status, className = "" }) => {
  const meta = statusMeta(type, status);
  const Icon = meta.icon;
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-left text-xs font-semibold leading-tight ring-1 ring-inset ${meta.className} ${className}`}>
      <Icon size={12} className="shrink-0" aria-hidden="true" />
      {meta.label}
    </span>
  );
};

export default ItemStatusBadge;
