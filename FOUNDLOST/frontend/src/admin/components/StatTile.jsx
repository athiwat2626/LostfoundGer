import { ChevronRight } from "lucide-react";

const COLOR_MAP = {
  amber: "bg-amber-50 text-amber-500",
  orange: "bg-orange-50 text-orange-500",
  blue: "bg-blue-50 text-blue-500",
  red: "bg-red-50 text-red-500",
  emerald: "bg-brand-50 text-brand",
  slate: "bg-slate-100 text-slate-500",
};

const StatTile = ({ icon: Icon, label, sublabel, value, color = "slate", onClick, active }) => {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={`relative flex w-full items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm sm:p-4 text-left transition-colors ${
        active ? "border-brand ring-2 ring-brand-50" : "border-slate-100"
      } ${onClick ? "hover:border-brand-soft cursor-pointer" : ""}`}
    >
      <div className={`flex h-10 w-10 shrink-0 sm:h-11 sm:w-11 items-center justify-center rounded-full ${COLOR_MAP[color]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-slate-800">{value}</p>
        <p className="text-xs font-medium text-slate-600 truncate">{label}</p>
        {sublabel && <p className="text-[11px] text-slate-400 truncate">{sublabel}</p>}
      </div>
      {onClick && <ChevronRight size={16} className="ml-auto shrink-0 text-brand/70" />}
    </Wrapper>
  );
};

export default StatTile;
