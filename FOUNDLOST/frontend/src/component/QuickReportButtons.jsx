import { Link } from "react-router-dom";
import { CircleHelp, HandHelping, ChevronRight } from "lucide-react";

// ปุ่มลัดแจ้งของหาย / แจ้งพบของ (ใช้บนหน้าแรกของมือถือ)
const ACTIONS = [
  { to: "/lostItem", title: "แจ้งของหาย", subtitle: "ทำของหาย? แจ้งเลย", icon: CircleHelp, tone: "gradient-lost" },
  { to: "/foundItem", title: "แจ้งพบของ", subtitle: "เจอของ? ช่วยส่งคืน", icon: HandHelping, tone: "gradient-found" },
];

const QuickReportButtons = ({ className = "" }) => (
  <div className={`grid grid-cols-2 gap-3 ${className}`}>
    {ACTIONS.map(({ to, title, subtitle, icon: Icon, tone }) => (
      <Link
        key={to}
        to={to}
        className={`relative flex min-h-20 flex-col justify-between overflow-hidden rounded-2xl p-3.5 text-white shadow-md transition active:scale-[0.98] ${tone}`}
      >
        <Icon size={64} strokeWidth={1.4} className="absolute -bottom-3 -right-3 text-white/15" aria-hidden="true" />
        <span className="flex items-center justify-between">
          <Icon size={22} aria-hidden="true" />
          <ChevronRight size={16} className="text-white/80" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-sm font-bold">{title}</span>
          <span className="block text-[11px] text-white/85">{subtitle}</span>
        </span>
      </Link>
    ))}
  </div>
);

export default QuickReportButtons;
