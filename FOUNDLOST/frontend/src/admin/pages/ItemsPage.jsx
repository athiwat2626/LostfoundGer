import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Trash2, Pencil, Plus, X, ImagePlus, Search as SearchIcon } from "lucide-react";
import adminApi from "../api/adminApi";
import { colorOptions } from "../../data/colorOptions";

const CATEGORIES = ["กระเป๋า", "เครื่องประดับ", "อุปกรณ์อิเล็กทรอนิกส์", "เอกสาร", "อื่น ๆ"];

const toDateInputValue = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

// ฟอร์มแก้ไขรายการ Lost/Found ของแอดมิน
const EditItemModal = ({ item, type, dateField, locationField, dateLabel, locationLabel, onClose, onSaved }) => {
  const [form, setForm] = useState({
    item_name: item.item_name || "",
    category: item.category || "",
    item_color: item.item_color || "",
    [locationField]: item[locationField] || "",
    [dateField]: toDateInputValue(item[dateField]),
    description: item.description || "",
    deposit_location: item.deposit_location || "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await adminApi.patch(`/admin/items/${type}/${item.item_id}`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">แก้ไขรายการ</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">ชื่อสิ่งของ</label>
            <input
              value={form.item_name}
              onChange={(e) => setField("item_name", e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">หมวดหมู่</label>
              <input
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">สี</label>
              <input
                value={form.item_color}
                onChange={(e) => setField("item_color", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{locationLabel}</label>
              <input
                value={form[locationField]}
                onChange={(e) => setField(locationField, e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{dateLabel}</label>
              <input
                type="date"
                value={form[dateField]}
                onChange={(e) => setField(dateField, e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">จุดฝากของ</label>
            <input
              value={form.deposit_location}
              onChange={(e) => setField("deposit_location", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">รายละเอียด</label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ฟอร์มเพิ่มรายการ Lost/Found ใหม่โดยแอดมิน (เช่น กรณีมีคนนำของมาส่งที่จุดรับฝากโดยตรง)
const AddItemModal = ({ type, dateField, locationField, dateLabel, locationLabel, onClose, onCreated }) => {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    item_name: "",
    category: "",
    item_color: "",
    [locationField]: "",
    [dateField]: "",
    description: "",
    deposit_location: "",
    student_id: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleFile = (file) => {
    setImageFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value || ""));
      if (imageFile) data.append("image", imageFile);

      await axios.post(`http://localhost:3000/${type === "found" ? "foundItem" : "lostItem"}`, data);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || "เพิ่มรายการไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">เพิ่มรายการใหม่</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-teal-400 hover:text-teal-500"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs">
                <ImagePlus size={22} />
                แตะเพื่ออัปโหลดรูป (ไม่บังคับ)
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">ชื่อสิ่งของ</label>
            <input
              value={form.item_name}
              onChange={(e) => setField("item_name", e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">หมวดหมู่</label>
              <select
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              >
                <option value="">เลือกหมวดหมู่</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">สี</label>
              <select
                value={form.item_color}
                onChange={(e) => setField("item_color", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              >
                <option value="">เลือกสี</option>
                {colorOptions.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{locationLabel}</label>
              <input
                value={form[locationField]}
                onChange={(e) => setField(locationField, e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{dateLabel}</label>
              <input
                type="date"
                value={form[dateField]}
                onChange={(e) => setField(dateField, e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">รหัสนิสิตเจ้าของ (ไม่บังคับ)</label>
            <input
              value={form.student_id}
              onChange={(e) => setField("student_id", e.target.value)}
              placeholder="เว้นว่างได้หากไม่ทราบ"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">จุดฝากของ</label>
            <input
              value={form.deposit_location}
              onChange={(e) => setField("deposit_location", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">รายละเอียด</label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "กำลังเพิ่ม..." : "เพิ่มรายการ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// หน้าตารางจัดการ Lost/Found Items ของแอดมิน ใช้ร่วมกันทั้งสองประเภทผ่าน prop `type`
const ItemsPage = ({ type, title }) => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const locationField = type === "found" ? "found_location" : "lost_location";
  const dateField = type === "found" ? "found_date" : "lost_date";
  const locationLabel = type === "found" ? "สถานที่พบ" : "สถานที่หาย";
  const dateLabel = type === "found" ? "วันที่พบ" : "วันที่หาย";

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .get("/admin/items", { params: { type, q: q || undefined } })
      .then((res) => {
        setItems(res.data.items);
        setTotal(res.data.total);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [type, q]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (item_id) => {
    if (!window.confirm("ยืนยันการลบรายการนี้?")) return;
    try {
      await adminApi.delete(`/admin/items/${type}/${item_id}`);
      load();
    } catch (err) {
      window.alert(err.response?.data?.message || "ลบไม่สำเร็จ");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 mb-1">{title}</h1>
          <p className="text-sm text-slate-500">ทั้งหมด {total} รายการ</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <Plus size={16} />
          เพิ่มรายการ
        </button>
      </div>

      <div className="mb-4 relative max-w-xs">
        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อสิ่งของ..."
          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
              <th className="px-4 py-3">รูป</th>
              <th className="px-4 py-3">ชื่อสิ่งของ</th>
              <th className="px-4 py-3">สถานที่</th>
              <th className="px-4 py-3">เจ้าของ</th>
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  ไม่พบรายการ
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.item_id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3">
                  {item.image_url ? (
                    <img
                      src={`http://localhost:3000${item.image_url}`}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-slate-100" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{item.item_name}</td>
                <td className="px-4 py-3 text-slate-500">{item[locationField] || "-"}</td>
                <td className="px-4 py-3 text-slate-500">{item.student_id || "ไม่ทราบเจ้าของ"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {item[dateField] ? new Date(item[dateField]).toLocaleDateString("th-TH") : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="rounded-lg p-2 text-teal-600 hover:bg-teal-50"
                      title="แก้ไขรายการ"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.item_id)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      title="ลบรายการ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <EditItemModal
          item={editingItem}
          type={type}
          dateField={dateField}
          locationField={locationField}
          dateLabel={dateLabel}
          locationLabel={locationLabel}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            load();
          }}
        />
      )}

      {showAddModal && (
        <AddItemModal
          type={type}
          dateField={dateField}
          locationField={locationField}
          dateLabel={dateLabel}
          locationLabel={locationLabel}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            load();
          }}
        />
      )}
    </div>
  );
};

export default ItemsPage;
