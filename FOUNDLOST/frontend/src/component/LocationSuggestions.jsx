import { MapPin } from "lucide-react";

// รายการสถานที่ที่ตรงกับคำที่พิมพ์ (วางใต้ช่องกรอกที่อยู่ในกล่อง relative)
export const LocationSuggestions = ({ items, onSelect }) =>
  items.length > 0 && (
    <ul className="absolute z-1000 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
      {items.map((location) => (
        <li key={location.name}>
          <button
            type="button"
            onClick={() => onSelect(location)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-50"
          >
            <MapPin size={14} className="shrink-0 text-brand" />
            {location.name}
          </button>
        </li>
      ))}
    </ul>
  );
