import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Sparkles,
  Pencil,
  Trash2,
  PackageOpen,
  Handshake,
  MapPin,
  CalendarDays,
  CheckCircle2,
  X,
  Clock,
} from "lucide-react";
import UserLayout from "../component/UserLayout";
import userApi from "../component/userApi";
import ConfirmDialog from "../component/ConfirmDialog";
import TypeTabs from "../component/TypeTabs";
import { useSiteSettings } from "../component/siteSettings";
import { API_URL, formatThaiDate, reportState } from "../component/itemUtils";
import { ContactCard, ItemDetailModal } from "../component/itemUi";

const FIELDS = {
  found: { date: "found_date", location: "found_location", dateLabel: "วันที่พบ", locationLabel: "สถานที่พบ" },
  lost: { date: "lost_date", location: "lost_location", dateLabel: "วันที่หาย", locationLabel: "สถานที่หาย" },
};
const CLAIM_STATUS = {
  pending: { label: "รอการยืนยัน", tone: "bg-amber-50 text-amber-600" },
  accepted: { label: "คืนของสำเร็จ", tone: "bg-sky-50 text-sky-600" },
  closed: { label: "ปิดแล้ว", tone: "bg-slate-100 text-slate-500" },
};

const cardClass = "rounded-2xl border border-slate-100 bg-white shadow-sm";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20";

const toDateInput = (value) => (value ? new Date(value).toLocaleDateString("sv-SE") : "");

const StatusBadge = ({ item }) =>
  item.status === "returned" ? (
    <span className="flex items-center gap-1 rounded-md bg-sky-500 px-2 py-0.5 text-[11px] font-semibold text-white">
      <CheckCircle2 size={12} /> คืนของสำเร็จ
    </span>
  ) : (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold text-white ${
        item.type === "found" ? "bg-green-500" : "bg-orange-500"
      }`}
    >
      {item.type === "found" ? "ของที่พบ" : "ของหาย"}
    </span>
  );

// ─── แถบคืนของสำเร็จ (โพสต์ถูกปิดถาวร ทำอะไรต่อไม่ได้) ─────────────────────────
const SuccessBanner = ({ at }) => (
  <div className="mt-3 flex items-center gap-3 rounded-xl bg-sky-50 px-4 py-3">
    <CheckCircle2 size={22} className="shrink-0 text-sky-600" />
    <div>
      <p className="text-sm font-bold text-sky-700">คืนของสำเร็จ</p>
      <p className="text-xs text-sky-600/80">
        {at ? `ปิดโพสต์เมื่อ ${formatThaiDate(at, "long")}` : "ปิดโพสต์แล้ว"} · ไม่สามารถแก้ไขหรือดำเนินการเพิ่มได้
      </p>
    </div>
  </div>
);

// ─── ผู้ติดต่อของโพสต์ ───────────────────────────────────────────────────────────
const ClaimsPanel = ({ item, onReturned }) => {
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    userApi
      .get(`/api/my-items/${item.type}/${item.item_id}/claims`)
      .then((res) => setClaims(res.data.claims))
      .catch((err) => setError(err.response?.data?.message || "โหลดผู้ติดต่อไม่สำเร็จ"));
  }, [item.type, item.item_id]);

  const confirmReturn = async () => {
    setBusy(true);
    try {
      await userApi.post(`/api/my-items/${item.type}/${item.item_id}/return`, { claim_id: confirming.claim_id });
      setConfirming(null);
      onReturned();
    } catch (err) {
      setError(err.response?.data?.message || "ยืนยันไม่สำเร็จ");
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!claims) return <div className="h-20 animate-pulse rounded-xl bg-slate-100" />;
  if (claims.length === 0) {
    return <p className="text-sm text-slate-400">ยังไม่มีใครติดต่อเข้ามา</p>;
  }

  return (
    <div className="space-y-3">
      {item.type === "found" && item.status === "open" && (
        <p className="text-xs text-slate-500">
          ตรวจสอบว่าผู้ติดต่อเป็นเจ้าของจริง แล้วกด “ส่งคืนสำเร็จ” เมื่อส่งของให้แล้ว (หรือให้ผู้ติดต่อกดยืนยันฝั่งของเขา) คุณจะได้รับเครดิตการคืนของ
        </p>
      )}
      {claims.map((claim) => (
        <div key={claim.claim_id} className="space-y-2">
          <ContactCard person={claim.claimant} />
          {claim.message && <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600">“{claim.message}”</p>}
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={12} /> {formatThaiDate(claim.created_at)}
            </span>
            {item.status === "open" ? (
              <button
                type="button"
                onClick={() => setConfirming(claim)}
                className="flex items-center gap-1.5 rounded-lg gradient-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Handshake size={14} /> {item.type === "lost" ? "ได้รับของคืนจากคนนี้" : "ส่งคืนสำเร็จ"}
              </button>
            ) : (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CLAIM_STATUS[claim.status]?.tone}`}>
                {CLAIM_STATUS[claim.status]?.label}
              </span>
            )}
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={Boolean(confirming)}
        title={item.type === "lost" ? "ยืนยันว่าได้รับของคืนแล้ว?" : "ยืนยันว่าส่งคืนสำเร็จ?"}
        message={
          confirming
            ? item.type === "lost"
              ? `${confirming.claimant.name} จะได้รับเครดิตการคืนของ โพสต์นี้และโพสต์ของพบที่ตรงกันของเขาจะถูกปิด`
              : `ยืนยันว่าส่งคืนให้ ${confirming.claimant.name} แล้ว คุณจะได้รับเครดิตการคืนของ โพสต์นี้และโพสต์ของหายที่ตรงกันของเขาจะถูกปิด`
            : ""
        }
        confirmLabel="ยืนยัน"
        busy={busy}
        onConfirm={confirmReturn}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
};

// ─── ของที่อาจตรงกัน ─────────────────────────────────────────────────────────
const MatchesPanel = ({ item, onOpen }) => {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    userApi
      .get(`/api/my-items/${item.type}/${item.item_id}/matches`)
      .then((res) => setMatches(res.data.matches))
      .catch((err) => setError(err.response?.data?.message || "โหลดรายการที่ตรงกันไม่สำเร็จ"));
  }, [item.type, item.item_id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!matches) return <div className="h-20 animate-pulse rounded-xl bg-slate-100" />;
  if (matches.length === 0) {
    return <p className="text-sm text-slate-400">ยังไม่พบ{item.type === "lost" ? "ของที่พบ" : "โพสต์ของหาย"}ที่ใกล้เคียง</p>;
  }

  return (
    <ul className="space-y-2">
      {matches.map((m) => (
        <li key={`${m.type}-${m.item_id}`}>
          <button
            type="button"
            onClick={() => onOpen(m)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white p-2.5 text-left transition hover:border-brand-soft"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {m.image_url ? (
                <img src={`${API_URL}${m.image_url}`} alt="" className="h-full w-full object-cover" />
              ) : (
                <PackageOpen size={20} className="m-auto mt-3 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{m.item_name}</p>
              <p className="truncate text-xs text-slate-500">
                {m.location || "-"} · {formatThaiDate(m.date)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {m.reasons.map((r) => (
                  <span key={r} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <span className="shrink-0 text-right">
              <span className="block text-lg font-bold text-brand">{m.score}%</span>
              <span className="text-[10px] text-slate-400">ความใกล้เคียง</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

// ─── แก้ไขโพสต์ ────────────────────────────────────────────────────────────────
const EditModal = ({ item, onClose, onSaved }) => {
  const f = FIELDS[item.type];
  const { categoryNames } = useSiteSettings();
  // หมวดเดิมของโพสต์ที่แอดมินลบออกจากรายการแล้ว ยังเลือกค้างไว้ได้
  const categoryOptions = !item.category || categoryNames.includes(item.category) ? categoryNames : [...categoryNames, item.category];
  const [form, setForm] = useState({
    item_name: item.item_name || "",
    category: item.category || "",
    date: toDateInput(item.date),
    location: item.location || "",
    deposit_location: item.deposit_location || "",
    description: item.description || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await userApi.patch(`/api/my-items/${item.type}/${item.item_id}`, {
        item_name: form.item_name,
        category: form.category,
        [f.date]: form.date,
        [f.location]: form.location,
        deposit_location: form.deposit_location,
        description: form.description,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-label="แก้ไขโพสต์"
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">แก้ไขโพสต์</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <label className="block text-sm font-semibold text-slate-800">
          ชื่อสิ่งของ
          <input value={form.item_name} onChange={(e) => setField("item_name", e.target.value)} required maxLength={255} className={`${inputClass} mt-1.5`} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-800">
            หมวดหมู่
            <select value={form.category} onChange={(e) => setField("category", e.target.value)} className={`${inputClass} mt-1.5`}>
              <option value="">ไม่ระบุ</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            {f.dateLabel}
            <input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required className={`${inputClass} mt-1.5`} />
          </label>
        </div>
        <label className="block text-sm font-semibold text-slate-800">
          {f.locationLabel}
          <input value={form.location} onChange={(e) => setField("location", e.target.value)} required maxLength={255} className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          สถานที่ที่รับฝากของ
          <input value={form.deposit_location} onChange={(e) => setField("deposit_location", e.target.value)} maxLength={255} className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          รายละเอียดเพิ่มเติม
          <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={3} maxLength={5000} className={`${inputClass} mt-1.5 resize-none`} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            ยกเลิก
          </button>
          <button type="submit" disabled={busy} className="rounded-xl gradient-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── การ์ดโพสต์ของฉัน ────────────────────────────────────────────────────────────
// focusPanel: เปิดจากลิงก์แจ้งเตือน (เช่น ปุ่มในข้อความ LINE) → เลื่อนมาที่การ์ดนี้และเปิดแผงที่ระบุ
const MyPostCard = ({ item, onChanged, onOpen, focusPanel }) => {
  const cardRef = useRef(null);
  const [panel, setPanel] = useState(focusPanel || (item.pending_claims > 0 && item.status === "open" ? "claims" : null));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (focusPanel) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusPanel]);
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = item.status === "open";

  const remove = async () => {
    setBusy(true);
    try {
      await userApi.delete(`/api/my-items/${item.type}/${item.item_id}`);
      setDeleting(false);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "ลบไม่สำเร็จ");
      setDeleting(false);
    } finally {
      setBusy(false);
    }
  };

  // ปิดโพสต์เองโดยไม่ให้เครดิตผู้ใด (ได้ของคืน/ส่งคืนนอกระบบ)
  const close = async () => {
    setBusy(true);
    try {
      await userApi.post(`/api/my-items/${item.type}/${item.item_id}/close`);
      setClosing(false);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "ปิดโพสต์ไม่สำเร็จ");
      setClosing(false);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (name) => setPanel((current) => (current === name ? null : name));
  const tabClass = (name) =>
    `flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition md:min-h-0 ${
      panel === name ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`;

  return (
    <article ref={cardRef} className={`${cardClass} p-4 ${focusPanel ? "ring-2 ring-brand/40" : ""}`}>
      <div className="flex gap-4">
        <button type="button" onClick={() => onOpen(item)} aria-label={`ดูรายละเอียด ${item.item_name}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {item.image_url ? (
            <img src={`${API_URL}${item.image_url}`} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <PackageOpen size={28} className="m-auto mt-6 text-slate-300" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge item={item} />
            {item.pending_claims > 0 && open && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                มีผู้ติดต่อ {item.pending_claims} คน
              </span>
            )}
            {item.match_count > 0 && open && (
              <button
                type="button"
                onClick={() => setPanel("matches")}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand ring-1 ring-inset ring-brand-soft/60"
              >
                <Sparkles size={11} aria-hidden="true" /> อาจตรงกัน {item.match_count} รายการ
              </button>
            )}
          </div>
          <p className="mt-1 truncate font-bold text-slate-900">{item.item_name}</p>
          <p className="flex items-center gap-1 truncate text-xs text-slate-500">
            <MapPin size={12} className="shrink-0" /> {item.location || "-"}
          </p>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <CalendarDays size={12} className="shrink-0" /> {formatThaiDate(item.date)}
          </p>
        </div>
      </div>

      {open ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => toggle("claims")} className={tabClass("claims")}>
            <Users size={14} /> ผู้ติดต่อ
          </button>
          <button type="button" onClick={() => toggle("matches")} className={tabClass("matches")}>
            <Sparkles size={14} /> ของที่อาจตรงกัน
          </button>
          <button type="button" onClick={() => setEditing(true)} className="flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 md:min-h-0">
            <Pencil size={14} /> แก้ไข
          </button>
          <button type="button" onClick={() => setClosing(true)} className="flex min-h-10 items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 md:min-h-0">
            <CheckCircle2 size={14} /> ปิดโพสต์ (ได้ของคืนแล้ว)
          </button>
          <button type="button" onClick={() => setDeleting(true)} className="ml-auto flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 md:min-h-0">
            <Trash2 size={14} /> ลบ
          </button>
        </div>
      ) : (
        <SuccessBanner at={item.returned_at} />
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {open && panel && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          {panel === "claims" ? (
            <ClaimsPanel item={item} onReturned={onChanged} />
          ) : (
            <MatchesPanel item={item} onOpen={onOpen} />
          )}
        </div>
      )}

      {editing && (
        <EditModal
          item={item}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
      <ConfirmDialog
        open={closing}
        title="ปิดโพสต์นี้?"
        message={
          item.type === "lost"
            ? "ใช้เมื่อได้ของคืนแล้วนอกระบบ โพสต์จะขึ้นว่าคืนของสำเร็จ และจะไม่ให้เครดิตผู้ใด (ถ้าได้คืนจากผู้ติดต่อ ให้กดที่รายชื่อผู้ติดต่อแทน)"
            : "ใช้เมื่อส่งคืนแล้วนอกระบบ โพสต์จะขึ้นว่าคืนของสำเร็จ และจะไม่ได้รับเครดิต (ถ้าคืนให้ผู้ติดต่อ ให้กดที่รายชื่อผู้ติดต่อแทน)"
        }
        confirmLabel="ปิดโพสต์"
        busy={busy}
        onConfirm={close}
        onCancel={() => setClosing(false)}
      />
      <ConfirmDialog
        open={deleting}
        title="ลบโพสต์นี้?"
        message="การลบไม่สามารถย้อนกลับได้"
        confirmLabel="ลบโพสต์"
        tone="danger"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </article>
  );
};

// ─── ของที่ฉันติดต่อไป ───────────────────────────────────────────────────────────
const MyClaimCard = ({ claim, onChanged }) => {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canConfirm = claim.item_type === "found" && claim.status === "pending" && claim.item.status === "open";

  const confirm = async () => {
    setBusy(true);
    try {
      await userApi.post(`/api/claims/${claim.claim_id}/confirm`);
      setConfirming(false);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "ยืนยันไม่สำเร็จ");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`${cardClass} space-y-3 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge item={{ type: claim.item_type, status: claim.item.status }} />
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CLAIM_STATUS[claim.status]?.tone}`}>
              {CLAIM_STATUS[claim.status]?.label}
            </span>
          </div>
          <p className="mt-1 truncate font-bold text-slate-900">{claim.item.item_name}</p>
          <p className="truncate text-xs text-slate-500">
            {claim.item_type === "lost" ? "คุณแจ้งว่าเจอของชิ้นนี้" : "คุณแจ้งว่าเป็นของคุณ"} · {formatThaiDate(claim.created_at)}
          </p>
        </div>
      </div>

      {claim.item.status === "returned" ? (
        <>
          <SuccessBanner />
          {claim.item_type === "found" && claim.status === "accepted" && (
            <button
              type="button"
              onClick={() =>
                navigate("/report", {
                  state: {
                    itemId: claim.item_id,
                    itemType: "found",
                    itemName: claim.item.item_name,
                    reportedUser: claim.owner?.student_id,
                  },
                })
              }
              className="text-xs font-semibold text-red-500 hover:underline"
            >
              ยังไม่ได้รับของ? แจ้งแอดมิน
            </button>
          )}
        </>
      ) : claim.owner ? (
        <ContactCard person={claim.owner} title="ติดต่อเจ้าของโพสต์" />
      ) : (
        <p className="text-sm text-slate-600">
          ติดต่อรับของได้ที่ <span className="font-semibold">{claim.item.deposit_location || "จุดรับฝากของ"}</span>
        </p>
      )}

      {canConfirm && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-semibold text-white"
        >
          <CheckCircle2 size={16} /> ได้รับของคืนแล้ว
        </button>
      )}
      {claim.item_type === "lost" && claim.status === "pending" && claim.item.status === "open" && (
        <p className="text-xs text-slate-500">เมื่อส่งของคืนแล้ว เจ้าของโพสต์จะเป็นผู้กดยืนยัน และคุณจะได้รับเครดิต</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ConfirmDialog
        open={confirming}
        title="ได้รับของคืนแล้วใช่ไหม?"
        message="ผู้พบจะได้รับเครดิตการคืนของ โพสต์นี้และโพสต์ของหายที่ตรงกันของคุณจะขึ้นว่าคืนของสำเร็จ"
        busy={busy}
        onConfirm={confirm}
        onCancel={() => setConfirming(false)}
      />
    </article>
  );
};

// ─── หน้าโพสต์ของฉัน ────────────────────────────────────────────────────────────
const PANELS = ["claims", "matches"];

const MyPosts = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const focus = { type: params.get("type"), id: params.get("item"), panel: PANELS.includes(params.get("panel")) ? params.get("panel") : "matches" };
  const [tab, setTab] = useState(params.get("tab") === "claims" ? "claims" : "posts");
  const [typeTab, setTypeTab] = useState(focus.type === "found" || focus.type === "lost" ? focus.type : "all");
  const [items, setItems] = useState(null);
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    Promise.all([userApi.get("/api/my-items"), userApi.get("/api/claims/mine")])
      .then(([itemsRes, claimsRes]) => {
        setItems(itemsRes.data.items);
        setClaims(claimsRes.data.claims);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "โหลดข้อมูลไม่สำเร็จ"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tabs = [
    { id: "posts", label: "โพสต์ของฉัน", count: items?.length },
    { id: "claims", label: "ของที่ฉันติดต่อไป", count: claims?.length },
  ];

  return (
    <UserLayout>
      <ItemDetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onReport={(item) => navigate("/report", { state: reportState(item) })}
      />

      <div className="mt-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">โพสต์ของฉัน</h1>
        <p className="mt-1 text-sm text-slate-500">ดูผู้ติดต่อ ยืนยันการรับคืน และจัดการโพสต์ของคุณ</p>
      </div>

      <div className="mt-5 grid grid-cols-2 rounded-xl border border-slate-100 bg-white p-1 shadow-sm sm:inline-grid">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold transition sm:min-h-0 sm:px-4 ${
              tab === t.id ? "bg-brand-soft text-slate-900" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label} {typeof t.count === "number" && <span className="text-slate-500">({t.count})</span>}
          </button>
        ))}
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <section className="mt-6">
        {tab === "posts" &&
          (items === null ? (
            <div className="h-40 animate-pulse rounded-2xl bg-white shadow-sm" />
          ) : items.length === 0 ? (
            <div className={`${cardClass} py-12 text-center text-sm text-slate-400`}>
              ยังไม่มีโพสต์ ·{" "}
              <Link to="/lostItem" className="font-semibold text-brand hover:underline">แจ้งของหาย</Link> หรือ{" "}
              <Link to="/foundItem" className="font-semibold text-brand hover:underline">แจ้งพบของ</Link>
            </div>
          ) : (
            <>
            <TypeTabs value={typeTab} onChange={setTypeTab} items={items} className="mb-4" />
            {items.filter((item) => typeTab === "all" || item.type === typeTab).length === 0 && (
              <div className={`${cardClass} py-10 text-center text-sm text-slate-400`}>ไม่มีโพสต์ประเภทนี้</div>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:gap-4 lg:grid-cols-2">
              {items.filter((item) => typeTab === "all" || item.type === typeTab).map((item) => (
                <MyPostCard
                  key={`${item.type}-${item.item_id}`}
                  item={item}
                  onChanged={load}
                  onOpen={setSelected}
                  focusPanel={item.type === focus.type && String(item.item_id) === focus.id ? focus.panel : null}
                />
              ))}
            </div>
            </>
          ))}

        {tab === "claims" &&
          (claims === null ? (
            <div className="h-40 animate-pulse rounded-2xl bg-white shadow-sm" />
          ) : claims.length === 0 ? (
            <div className={`${cardClass} py-12 text-center text-sm text-slate-400`}>
              ยังไม่ได้ติดต่อเรื่องสิ่งของใด ·{" "}
              <Link to="/home" className="font-semibold text-brand hover:underline">ดูรายการทั้งหมด</Link>
            </div>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
              {claims.map((claim) => (
                <MyClaimCard key={claim.claim_id} claim={claim} onChanged={load} />
              ))}
            </div>
          ))}
      </section>
    </UserLayout>
  );
};

export default MyPosts;
