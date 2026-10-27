import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { useSiteSettings } from "./siteSettings";
import { announcementType, announcementPeriod } from "./announcementTypes";

const DISMISS_KEY = "dismissedAnnouncement";

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

// ป้ายประกาศ (ใช้ทั้งหน้าเว็บผู้ใช้ และตัวอย่างในหน้าตั้งค่าแอดมิน)
// หัวข้อ = ชื่อประเภทประกาศ, รายละเอียด = ข้อความจากแอดมิน, วันที่ = ช่วงที่แอดมินกำหนด (ถ้ามี)
export const AnnouncementCard = ({ announcement, onDismiss, className = "" }) => {
  const type = announcementType(announcement.tone);
  const Icon = type.icon;
  const period = announcementPeriod(announcement);

  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-[18px] border px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4 ${type.box} ${className}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset sm:h-11 sm:w-11 ${type.iconBox}`}>
        <Icon size={20} strokeWidth={2.1} aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className={`text-sm font-bold leading-6 ${type.titleClass}`}>{type.title}</p>
          {period && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <CalendarDays size={12} aria-hidden="true" />
              {period}
            </span>
          )}
        </div>
        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{announcement.message}</p>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="ปิดประกาศ"
          title="ปิดประกาศ"
          className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:-mr-2"
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

// ป้ายประกาศจากแอดมิน (ตั้งค่า → ประกาศ) — ปิดได้ และจะแสดงอีกครั้งเมื่อข้อความประกาศเปลี่ยน
const AnnouncementBanner = () => {
  const { announcement } = useSiteSettings();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!announcement || dismissed === announcement.message) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, announcement.message);
    } catch {
      // บันทึกไม่ได้ก็ซ่อนเฉพาะรอบนี้
    }
    setDismissed(announcement.message);
  };

  return <AnnouncementCard announcement={announcement} onDismiss={dismiss} className="mt-4" />;
};

export default AnnouncementBanner;
