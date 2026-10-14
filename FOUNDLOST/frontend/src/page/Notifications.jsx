import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Handshake, Sparkles, MessageCircle, CheckCheck, BellOff, Check, Info, AlertCircle, ChevronRight } from "lucide-react";
import UserLayout from "../component/UserLayout";
import userApi from "../component/userApi";
import LineConnectionCard from "../component/LineConnectionCard";
import { useInbox, refreshInbox, markInboxRead, markAllInboxRead } from "../component/inboxStore";
import { timeAgo, formatThaiDate } from "../component/itemUtils";

// ประเภทการแจ้งเตือนในตาราง notifications: match / claim / returned (อื่น ๆ ถือเป็นข้อความจากระบบ)
const TYPE_META = {
  match: { icon: Sparkles, tone: "bg-brand-50 text-brand", group: "match", label: "รายการที่อาจตรงกัน" },
  claim: { icon: MessageCircle, tone: "bg-amber-50 text-amber-600", group: "status", label: "มีผู้ติดต่อ" },
  returned: { icon: Handshake, tone: "bg-sky-50 text-sky-600", group: "status", label: "คืนของสำเร็จ" },
};
const SYSTEM_META = { icon: Info, tone: "bg-slate-100 text-slate-500", group: "system", label: "ข้อความจากระบบ" };
const metaOf = (type) => TYPE_META[type] || SYSTEM_META;

const FILTERS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "unread", label: "ยังไม่อ่าน" },
  { id: "match", label: "อาจตรงกัน" },
  { id: "status", label: "สถานะรายการ" },
  { id: "system", label: "ระบบ" },
];

const DELIVERY_STATUS = {
  sent: { label: "ส่งแล้ว", tone: "bg-green-50 text-green-700" },
  sending: { label: "กำลังส่ง", tone: "bg-slate-100 text-slate-600" },
  retry: { label: "รอส่งใหม่", tone: "bg-amber-50 text-amber-700" },
  failed: { label: "ส่งไม่สำเร็จ", tone: "bg-red-50 text-red-600" },
};

const timeOf = (value) =>
  new Date(value).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

// ─── หน้าการแจ้งเตือน (เมนู “แจ้งเตือน” และเมนู LINE) ──────────────────────────────
const Notifications = () => {
  const navigate = useNavigate();
  const { notifications: items, unread, loaded, error } = useInbox();
  const [filter, setFilter] = useState("all");
  const [deliveries, setDeliveries] = useState([]);

  useEffect(() => {
    refreshInbox();
    userApi
      .get("/api/line/notifications")
      .then((res) => setDeliveries(res.data.deliveries))
      .catch(() => setDeliveries([]));
  }, []);

  const shown = useMemo(
    () =>
      items.filter((n) => {
        if (filter === "all") return true;
        if (filter === "unread") return !n.is_read;
        return metaOf(n.type).group === filter;
      }),
    [items, filter]
  );

  const open = (n) => {
    if (!n.is_read) markInboxRead(n.notification_id).catch(() => {});
    if (n.link) navigate(n.link);
  };

  return (
    <UserLayout>
      <div className="mt-6 flex items-end justify-between gap-3 sm:mt-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">การแจ้งเตือน</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            {unread > 0 ? `ยังไม่อ่าน ${unread} รายการ` : "อ่านครบทุกรายการแล้ว"}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAllInboxRead().catch(() => {})}
            className="tap flex items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand hover:bg-brand-50"
          >
            <CheckCheck size={16} /> อ่านทั้งหมด
          </button>
        )}
      </div>

      <div role="tablist" aria-label="ประเภทการแจ้งเตือน" className="scroll-x -mx-4 mt-4 flex gap-2 px-4 md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
              filter === f.id ? "bg-brand text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
            {f.id === "unread" && unread > 0 && <span className="ml-1">({unread})</span>}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <section aria-label="รายการแจ้งเตือน" className="space-y-2.5">
          {!loaded ? (
            [0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />)
          ) : error && items.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
              <AlertCircle size={28} className="text-red-400" aria-hidden="true" />
              <p className="text-sm text-slate-600">โหลดการแจ้งเตือนไม่สำเร็จ</p>
              <button type="button" onClick={refreshInbox} className="tap rounded-xl gradient-primary px-5 text-sm font-semibold text-white">
                ลองอีกครั้ง
              </button>
            </div>
          ) : shown.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                <BellOff size={26} aria-hidden="true" />
              </span>
              <p className="font-semibold text-slate-700">{filter === "all" ? "ยังไม่มีการแจ้งเตือน" : "ไม่มีการแจ้งเตือนในหมวดนี้"}</p>
              <p className="text-sm text-slate-500">เมื่อมีรายการที่อาจตรงกับของที่คุณแจ้ง ระบบจะแจ้งที่นี่</p>
            </div>
          ) : (
            shown.map((n) => {
              const meta = metaOf(n.type);
              const Icon = meta.icon;
              return (
                <article
                  key={n.notification_id}
                  className={`relative flex items-start gap-3 rounded-2xl border p-3.5 shadow-(--shadow-card) transition sm:p-4 ${
                    n.is_read ? "border-slate-100 bg-white" : "border-brand-soft/60 bg-brand-50/60"
                  }`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                      {meta.label}
                      {!n.is_read && (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                          <span className="sr-only">ยังไม่อ่าน</span>
                        </>
                      )}
                    </span>
                    <span className={`mt-0.5 block text-sm leading-snug ${n.is_read ? "text-slate-700" : "font-bold text-slate-900"}`}>{n.title}</span>
                    {n.body && <span className="mt-1 line-clamp-2 block text-xs text-slate-500">{n.body}</span>}
                    <span className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                      {timeAgo(n.created_at)} · {formatThaiDate(n.created_at)} {timeOf(n.created_at)} น.
                      {n.link && <ChevronRight size={12} className="ml-auto text-slate-300" aria-hidden="true" />}
                    </span>
                  </button>
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => markInboxRead(n.notification_id).catch(() => {})}
                      aria-label={`ทำเครื่องหมายว่าอ่านแล้ว: ${n.title}`}
                      title="ทำเครื่องหมายว่าอ่านแล้ว"
                      className="tap -mr-1 -mt-1 flex shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-brand"
                    >
                      <Check size={18} />
                    </button>
                  )}
                </article>
              );
            })
          )}
        </section>

        <aside className="space-y-5">
          <LineConnectionCard />

          {deliveries.length > 0 && (
            <section className="card p-5">
              <h2 className="text-base font-bold text-slate-900">ประวัติการส่งทาง LINE</h2>
              <ul className="mt-3 space-y-3">
                {deliveries.map((d) => {
                  const status = DELIVERY_STATUS[d.status] || DELIVERY_STATUS.sending;
                  return (
                    <li key={d.delivery_id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <span className="block text-slate-700">{d.title}</span>
                        <span className="text-[11px] text-slate-400">{formatThaiDate(d.created_at)}</span>
                      </span>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${status.tone}`}>{status.label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </UserLayout>
  );
};

export default Notifications;
