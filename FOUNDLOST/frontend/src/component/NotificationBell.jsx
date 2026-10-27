import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Handshake, Sparkles, MessageCircle, CheckCheck } from "lucide-react";
import { useInbox, markInboxRead, markAllInboxRead } from "./inboxStore";
import { timeAgo } from "./itemUtils";

const TYPE_ICON = {
  claim: { icon: MessageCircle, tone: "bg-amber-50 text-amber-600" },
  match: { icon: Sparkles, tone: "bg-brand-50 text-brand" },
  returned: { icon: Handshake, tone: "bg-sky-50 text-sky-600" },
};

// กระดิ่งแจ้งเตือนมุมขวาบน (ข้อมูลจาก inboxStore ซึ่งดึงใหม่ทุก 1 นาทีขณะเปิดหน้าอยู่)
const NotificationBell = () => {
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const [open, setOpen] = useState(false);
  const { notifications: items, unread } = useInbox();

  // ปิดเมื่อคลิกนอกกล่อง / กด Esc
  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const openNotification = (n) => {
    setOpen(false);
    if (!n.is_read) {
      markInboxRead(n.notification_id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const markAllRead = () => {
    markAllInboxRead().catch(() => {});
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `การแจ้งเตือน ${unread} รายการที่ยังไม่อ่าน` : "การแจ้งเตือน"}
        aria-expanded={open}
        className="relative rounded-full p-2 text-slate-500 transition hover:bg-white hover:shadow-sm"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">การแจ้งเตือน</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                <CheckCheck size={14} /> อ่านทั้งหมด
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">ยังไม่มีการแจ้งเตือน</li>}
            {items.map((n) => {
              const meta = TYPE_ICON[n.type] || TYPE_ICON.match;
              const Icon = meta.icon;
              return (
                <li key={n.notification_id}>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${n.is_read ? "" : "bg-brand-50/40"}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${n.is_read ? "text-slate-600" : "font-semibold text-slate-900"}`}>{n.title}</span>
                      {n.body && <span className="mt-0.5 block truncate text-xs text-slate-500">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                    </span>
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            className="block w-full border-t border-slate-100 py-2.5 text-center text-xs font-semibold text-brand hover:bg-slate-50"
          >
            ดูการแจ้งเตือนทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
