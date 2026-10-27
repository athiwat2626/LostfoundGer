import { useEffect, useRef, useState } from "react";
import { X, ImagePlus, Loader2 } from "lucide-react";
import adminApi from "../../api/adminApi";
import { useSiteSettings } from "../../../component/siteSettings";
import { LocationSuggestions } from "../../../component/LocationSuggestions";
import { searchLocations } from "../../../data/campusLocations";
import { ITEM_TYPES, toDateInput } from "./itemMeta";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 sm:py-2 sm:text-sm";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

// ฟอร์มเพิ่ม/แก้ไขรายการของแอดมิน (item = null → เพิ่มใหม่)
// เพิ่ม: POST /lostItem | /foundItem (multipart, แนบรูปได้) — แก้ไข: PATCH /admin/items/:type/:id
// รายการที่แอดมินเพิ่มไม่มีเจ้าของโพสต์ (ไม่ส่ง student_id)
const ItemFormModal = ({ type, item = null, onClose, onSaved }) => {
  const meta = ITEM_TYPES[type];
  const isEdit = Boolean(item);
  const fileInputRef = useRef(null);
  const firstFieldRef = useRef(null);
  const { categoryNames, depositPoints } = useSiteSettings();
  const [form, setForm] = useState(() => ({
    item_name: item?.item_name || "",
    category: item?.category || "",
    item_color: item?.item_color || "",
    [meta.locationField]: item?.[meta.locationField] || "",
    [meta.dateField]: toDateInput(item?.[meta.dateField]),
    deposit_location: item?.deposit_location || "",
    description: item?.description || "",
  }));
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [depositSuggestions, setDepositSuggestions] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // หมวดเดิมของรายการที่ถูกลบออกจากค่าระบบแล้ว ยังเลือกค้างไว้ได้
  const categoryOptions = form.category && !categoryNames.includes(form.category) ? [...categoryNames, form.category] : categoryNames;

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (event) => event.key === "Escape" && !submitting && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      if (isEdit) {
        await adminApi.patch(`/admin/items/${type}/${item.item_id}`, form);
      } else {
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value || ""));
        if (imageFile) data.append("image", imageFile);
        await adminApi.post(`/${meta.endpoint}`, data);
      }
      onSaved(isEdit ? "บันทึกการแก้ไขแล้ว" : "เพิ่มรายการแล้ว");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || (isEdit ? "บันทึกไม่สำเร็จ" : "เพิ่มรายการไม่สำเร็จ"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={() => !submitting && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-form-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="item-form-title" className="text-lg font-bold text-slate-900">
            {isEdit ? "แก้ไขรายการ" : `เพิ่ม${type === "lost" ? "รายการของหาย" : "รายการของพบ"}`}
          </h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isEdit && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-soft hover:text-brand"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="ตัวอย่างรูป" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-xs">
                    <ImagePlus size={22} aria-hidden="true" />
                    แตะเพื่ออัปโหลดรูป (ไม่บังคับ)
                  </span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  setPreviewUrl(file ? URL.createObjectURL(file) : null);
                }}
              />
            </>
          )}

          <div>
            <label htmlFor="item-name" className={labelClass}>ชื่อสิ่งของ *</label>
            <input ref={firstFieldRef} id="item-name" value={form.item_name} maxLength={255} required onChange={(e) => setField("item_name", e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="item-category" className={labelClass}>หมวดหมู่</label>
              <select id="item-category" value={form.category} onChange={(e) => setField("category", e.target.value)} className={inputClass}>
                <option value="">ไม่ระบุ</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="item-color" className={labelClass}>สี / จุดสังเกต</label>
              <input id="item-color" value={form.item_color} maxLength={100} onChange={(e) => setField("item_color", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative">
              <label htmlFor="item-location" className={labelClass}>{meta.locationLabel} *</label>
              <input
                id="item-location"
                value={form[meta.locationField]}
                maxLength={255}
                required
                autoComplete="off"
                placeholder="พิมพ์ชื่อสถานที่"
                onChange={(e) => {
                  setField(meta.locationField, e.target.value);
                  setLocationSuggestions(searchLocations(e.target.value));
                }}
                className={inputClass}
              />
              <LocationSuggestions
                items={locationSuggestions}
                onSelect={(location) => {
                  setField(meta.locationField, location.name);
                  setLocationSuggestions([]);
                }}
              />
            </div>
            <div>
              <label htmlFor="item-date" className={labelClass}>{meta.dateLabel} *</label>
              <input id="item-date" type="date" value={form[meta.dateField]} required onChange={(e) => setField(meta.dateField, e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="relative">
            <label htmlFor="item-deposit" className={labelClass}>จุดรับฝากของ</label>
            <input
              id="item-deposit"
              value={form.deposit_location}
              maxLength={255}
              autoComplete="off"
              placeholder="เช่น กองกิจการนิสิต, ห้องสมุด"
              onChange={(e) => {
                setField("deposit_location", e.target.value);
                setDepositSuggestions(searchLocations(e.target.value));
              }}
              className={inputClass}
            />
            <LocationSuggestions
              items={depositSuggestions}
              onSelect={(location) => {
                setField("deposit_location", location.name);
                setDepositSuggestions([]);
              }}
            />
            {/* จุดรับฝากที่ตั้งไว้ในค่าระบบ — ชุดเดียวกับฟอร์มของผู้ใช้ */}
            {depositPoints.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {depositPoints.map((point) => {
                  const active = form.deposit_location === point.name;
                  return (
                    <button
                      key={point.name}
                      type="button"
                      onClick={() => setField("deposit_location", point.name)}
                      aria-pressed={active}
                      className={`flex min-h-9 flex-col items-start rounded-lg border px-2.5 py-1 text-left text-xs transition ${
                        active ? "border-brand bg-brand-50 text-brand" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-semibold">{point.name}</span>
                      {point.hours && <span className="text-[11px] text-slate-400">{point.hours}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="item-description" className={labelClass}>รายละเอียด</label>
            <textarea id="item-description" value={form.description} maxLength={5000} rows={3} onChange={(e) => setField("description", e.target.value)} className={`${inputClass} resize-none`} />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="min-h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              ยกเลิก
            </button>
            <button type="submit" disabled={submitting} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl gradient-primary text-sm font-semibold text-white disabled:opacity-60">
              {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {submitting ? "กำลังบันทึก..." : isEdit ? "บันทึก" : "เพิ่มรายการ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemFormModal;
