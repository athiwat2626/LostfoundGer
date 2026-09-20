import { useRef, useState } from "react";
import { campusLocations } from "../data/campusLocations";
import { colorOptions } from "../data/colorOptions";

const categories = ["กระเป๋า", "เครื่องประดับ", "อุปกรณ์อิเล็กทรอนิกส์", "เอกสาร", "อื่น ๆ"];

const FormFoundItem = () => {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({ image: null, found_date: "", item_name: "", category: "", item_color: "", found_location: "", description: "", deposit_location: "" });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [status, setStatus] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (name === "found_location") {
      const query = value.trim().toLowerCase();
      setLocationSuggestions(query ? campusLocations.filter((location) => location.name.toLowerCase().includes(query)) : []);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("กำลังส่งข้อมูล...");
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value || ""));
    data.append("student_id", localStorage.getItem("student_id") || "unknown");

    try {
      const response = await fetch("http://localhost:3000/foundItem", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ไม่สามารถบันทึกข้อมูลได้");
      setStatus(`บันทึกสำเร็จ หมายเลขรายการ ${result.item_id}`);
      setFormData({ image: null, found_date: "", item_name: "", category: "", item_color: "", found_location: "", description: "", deposit_location: "" });
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setStatus(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-5">
      <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-32 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-500 bg-white text-center text-sm text-slate-600 overflow-hidden relative">
        {previewUrl ? (
          <img src={previewUrl} alt="preview" className="absolute inset-0 w-full h-full object-contain rounded-2xl" />
        ) : (
          <>
            <span className="mb-2 text-2xl text-emerald-700">☁</span>
            <strong>แตะเพื่ออัปโหลดรูปสิ่งของ</strong>
            <span className="mt-1 text-xs text-slate-400">รองรับไฟล์รูปภาพเท่านั้น</span>
          </>
        )}
      </button>
      <input ref={fileInputRef} className="hidden" type="file" name="image" accept="image/*" onChange={(event) => {
        const file = event.target.files?.[0] || null;
        setFormData((previous) => ({ ...previous, image: file }));
        setPreviewUrl(file ? URL.createObjectURL(file) : null);
      }} required />
      {formData.image && <p className="-mt-3 text-xs text-emerald-700">เลือกไฟล์: {formData.image.name}</p>}

      <fieldset><legend className="mb-3 text-sm font-semibold">สี</legend><div className="flex flex-wrap gap-3">{colorOptions.map((color) => <button key={color.name} type="button" title={color.name} aria-label={color.name} onClick={() => setFormData((previous) => ({ ...previous, item_color: color.name }))} className={`h-8 w-8 rounded-full border-2 ${formData.item_color === color.name ? "scale-110 ring-2 ring-emerald-500 ring-offset-2" : "border-white shadow"}`} style={{ backgroundColor: color.value }} />)}</div></fieldset>

      <div><label className="mb-2 block text-sm font-semibold" htmlFor="item_name">ชื่อสิ่งของ</label><input id="item_name" name="item_name" value={formData.item_name} onChange={handleChange} placeholder="เช่น กระเป๋าสตางค์" className="w-full rounded-xl border border-slate-400 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-700" required /></div>
      <div><label className="mb-2 block text-sm font-semibold" htmlFor="category">หมวดหมู่สิ่งของ</label><select id="category" name="category" value={formData.category} onChange={handleChange} className="w-full rounded-xl border border-slate-400 bg-white px-3 py-3 text-sm outline-none" required><option value="">เลือกประเภทสิ่งของ</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
      <div><label className="mb-2 block text-sm font-semibold" htmlFor="found_date">วันที่พบ</label><input id="found_date" type="date" name="found_date" value={formData.found_date} onChange={handleChange} className="w-full rounded-xl border border-slate-400 bg-white px-3 py-3 text-sm" required /></div>

      <div className="relative"><label className="mb-2 block text-sm font-semibold" htmlFor="found_location">ตำแหน่งที่พบ</label><div className="flex items-center rounded-xl border border-slate-400 bg-white px-3"><span className="text-emerald-700">📍</span><input id="found_location" name="found_location" value={formData.found_location} onChange={handleChange} placeholder="เลือกจุดบนแผนที่ หรือพิมพ์เอง" className="w-full bg-transparent px-2 py-3 text-sm outline-none" required /><span>▣</span></div>{locationSuggestions.length > 0 && <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-xl border bg-white shadow-lg">{locationSuggestions.map((location) => <li key={location.name} onClick={() => { setFormData((previous) => ({ ...previous, found_location: location.name })); setLocationSuggestions([]); }} className="cursor-pointer px-3 py-2 text-sm hover:bg-emerald-50">{location.name}</li>)}</ul>}</div>

      <div className="rounded-2xl border border-slate-300 bg-white p-4"><div className="flex justify-between text-sm font-semibold"><span>ลักษณะเฉพาะ / หมายเลขซีเรียล</span><span className="text-emerald-700">◉</span></div><textarea name="description" value={formData.description} onChange={handleChange} className="mt-3 h-20 w-full resize-none text-sm outline-none" placeholder="ระบุลักษณะเฉพาะที่มีเพียงคุณหรือเจ้าของเท่านั้นที่ทราบ..." /></div>
      <div><label className="mb-2 block text-sm font-semibold" htmlFor="deposit_location">จุดรับของ (จุดรับฝาก)</label><input id="deposit_location" name="deposit_location" value={formData.deposit_location} onChange={handleChange} placeholder="เลือกจุดรับสินค้า (จุด Drop-off)" className="w-full rounded-xl border border-slate-400 bg-white px-3 py-3 text-sm" required /></div>
      <button type="submit" className="w-full rounded-xl bg-emerald-700 py-3 font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800">แจ้งพบ <span className="ml-2">→</span></button>
      {status && <p className="text-center text-sm text-slate-600">{status}</p>}
    </form>
  );
};

export default FormFoundItem;
