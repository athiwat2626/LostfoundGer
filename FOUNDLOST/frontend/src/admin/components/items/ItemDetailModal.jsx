import { useCallback, useEffect, useState } from "react";
import {
  X,
  PackageOpen,
  MapPin,
  CalendarDays,
  Tag,
  Palette,
  Building2,
  FileText,
  UserRound,
  Mail,
  Phone,
  Handshake,
  Sparkles,
  History,
  Pencil,
  Trash2,
  AlertCircle,
  Clock,
} from "lucide-react";
import adminApi from "../../api/adminApi";
import { API_URL } from "../../../component/itemUtils";
import ItemStatusBadge from "./ItemStatusBadge";
import { ITEM_TYPES, formatDate, ownerName } from "./itemMeta";

const CLAIM_STATUS = {
  pending: { label: "รอยืนยัน", className: "bg-amber-50 text-amber-700" },
  accepted: { label: "รับคืนแล้ว", className: "bg-sky-50 text-sky-700" },
  closed: { label: "ปิดแล้ว", className: "bg-slate-100 text-slate-500" },
};

const Row = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 text-sm">
    <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
    <span className="w-24 shrink-0 text-slate-500">{label}</span>
    <span className="min-w-0 flex-1 break-words font-medium text-slate-800">{children}</span>
  </div>
);

const Section = ({ icon: Icon, title, children }) => (
  <section className="border-t border-slate-100 pt-4">
    <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-slate-900">
      <Icon size={15} className="text-brand" aria-hidden="true" /> {title}
    </h3>
    {children}
  </section>
);

// ─── รายละเอียดรายการ (แอดมิน) — ข้อมูลจาก GET /admin/items/:type/:id ─────────────
const ItemDetailModal = ({ type, itemId, onClose, onEdit, onDelete }) => {
  const meta = ITEM_TYPES[type];
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const fetchDetail = useCallback(
    () =>
      adminApi
        .get(`/admin/items/${type}/${itemId}`)
        .then((res) => setData(res.data))
        .catch((err) => setError(err.response?.data?.message || "โหลดรายละเอียดไม่สำเร็จ")),
    [type, itemId]
  );

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const load = () => {
    setError("");
    fetchDetail();
  };

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const item = data?.item;
  const owner = item ? ownerName(item) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item ? `รายละเอียด ${item.item_name}` : "รายละเอียดรายการ"}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
          <p className="text-sm font-semibold text-slate-500">
            {type === "lost" ? "ของหาย" : "ของที่พบ"} #{itemId}
          </p>
          <button type="button" onClick={onClose} aria-label="ปิด" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <AlertCircle size={28} className="text-red-400" aria-hidden="true" />
            <p className="text-sm text-slate-600">{error}</p>
            <button type="button" onClick={load} className="min-h-10 rounded-lg gradient-primary px-5 text-sm font-semibold text-white">
              ลองอีกครั้ง
            </button>
          </div>
        ) : !item ? (
          <div className="space-y-3 p-5" aria-busy="true">
            <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {item.image_url ? (
                  <a href={`${API_URL}${item.image_url}`} target="_blank" rel="noreferrer" title="เปิดรูปขนาดเต็ม" className="h-full w-full">
                    <img src={`${API_URL}${item.image_url}`} alt={item.item_name} className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <PackageOpen size={48} className="text-slate-300" aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0 space-y-3">
                <div>
                  <ItemStatusBadge type={type} status={item.status} />
                  <h2 className="mt-2 break-words text-xl font-bold text-slate-900">{item.item_name}</h2>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={12} aria-hidden="true" /> แจ้งเมื่อ {formatDate(item.created_at, true)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Row icon={Tag} label="หมวดหมู่">{item.category || "-"}</Row>
                  <Row icon={Palette} label="สี/จุดสังเกต">{item.item_color || "-"}</Row>
                  <Row icon={MapPin} label={meta.locationLabel}>{item[meta.locationField] || "-"}</Row>
                  <Row icon={CalendarDays} label={meta.dateLabel}>{formatDate(item[meta.dateField])}</Row>
                  <Row icon={Building2} label="จุดรับฝาก">{item.deposit_location || "-"}</Row>
                </div>
              </div>
            </div>

            {item.description && (
              <Section icon={FileText} title="รายละเอียด">
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{item.description}</p>
              </Section>
            )}

            <Section icon={UserRound} title={meta.reporterLabel}>
              {item.student_id ? (
                <div className="space-y-1.5 text-sm">
                  <p className="font-semibold text-slate-800">
                    {owner || "ไม่พบข้อมูลผู้ใช้"} <span className="font-normal text-slate-500">({item.student_id})</span>
                  </p>
                  {(item.owner_contact_email || item.owner_email) && (
                    <a href={`mailto:${item.owner_contact_email || item.owner_email}`} className="flex items-center gap-1.5 text-slate-600 hover:text-brand hover:underline">
                      <Mail size={14} aria-hidden="true" /> {item.owner_contact_email || item.owner_email}
                    </a>
                  )}
                  {item.owner_phone && (
                    <a href={`tel:${item.owner_phone}`} className="flex items-center gap-1.5 text-slate-600 hover:text-brand hover:underline">
                      <Phone size={14} aria-hidden="true" /> {item.owner_phone}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">ไม่มีผู้แจ้ง (แอดมินเพิ่มรายการ)</p>
              )}
              {item.status === "returned" && (
                <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
                  ปิดรายการเมื่อ {formatDate(item.returned_at, true)}
                  {item.returner_first_name && ` · ผู้คืนของ ${item.returner_first_name} ${item.returner_last_name || ""}`}
                </p>
              )}
            </Section>

            <Section icon={Handshake} title={`ผู้ติดต่อขอรับ/ส่งคืน (${data.claims.length})`}>
              {data.claims.length === 0 ? (
                <p className="text-sm text-slate-500">ยังไม่มีผู้ติดต่อ</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.claims.map((claim) => {
                    const status = CLAIM_STATUS[claim.status] || CLAIM_STATUS.closed;
                    return (
                      <li key={claim.claim_id} className="flex items-start justify-between gap-3 py-2 text-sm">
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-800">
                            {claim.first_name ? `${claim.first_name} ${claim.last_name || ""}` : claim.claimant_student_id}
                          </span>
                          {claim.message && <span className="block break-words text-xs text-slate-500">“{claim.message}”</span>}
                          <span className="block text-[11px] text-slate-400">{formatDate(claim.created_at, true)}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <div className="grid gap-4 sm:grid-cols-2">
              <Section icon={Sparkles} title="การจับคู่อัตโนมัติ">
                <p className="text-sm text-slate-600">
                  {data.match_count > 0 ? `ระบบแจ้งเตือนคู่ที่อาจตรงกันแล้ว ${data.match_count} คู่` : "ยังไม่มีคู่ที่ระบบแจ้งเตือน"}
                </p>
              </Section>
              <Section icon={History} title="ประวัติการดำเนินการของแอดมิน">
                {data.history.length === 0 ? (
                  <p className="text-sm text-slate-500">ยังไม่มีการดำเนินการ</p>
                ) : (
                  <ul className="space-y-1.5">
                    {data.history.map((h) => (
                      <li key={h.log_id} className="text-xs">
                        <span className="block text-slate-700">{h.summary}</span>
                        <span className="text-slate-400">
                          {h.admin_name || "ไม่ทราบ"} · {formatDate(h.created_at, true)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} aria-hidden="true" /> ลบรายการ
              </button>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl gradient-primary text-sm font-semibold text-white"
              >
                <Pencil size={16} aria-hidden="true" /> แก้ไข
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetailModal;
