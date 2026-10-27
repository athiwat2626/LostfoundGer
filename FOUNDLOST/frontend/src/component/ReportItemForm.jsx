import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, ZoomControl, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  MapPin,
  KeyRound,
  ImagePlus,
  CalendarDays,
  Building2,
  X,
  CheckCircle2,
  Send,
  Camera,
  Palette,
  Loader2,
  ListChecks,
  RotateCcw,
} from "lucide-react";
import { campusLocations, searchLocations } from "../data/campusLocations";
import { oldestItemDate, todayInput } from "./itemUtils";
import { LocationSuggestions } from "./LocationSuggestions";
import { useSiteSettings } from "./siteSettings";
import userApi from "./userApi";

const CAMPUS_CENTER = [14.022788, 99.978337];
const NEARBY_COUNT = 4;

// หมุดตำแหน่งที่เลือก (วาดด้วย HTML ไม่ต้องโหลดรูปจากภายนอก)
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:34px;height:44px">
    <div style="position:absolute;left:-9px;top:-6px;width:52px;height:52px;border-radius:9999px;background:rgba(0,102,100,.18)"></div>
    <div style="position:absolute;inset:0 0 10px 0;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#006664;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>
  </div>`,
  iconSize: [34, 44],
  iconAnchor: [17, 42],
});

const TEXT = {
  lost: {
    title: "แจ้งของหาย",
    subtitle: "ค้นหาและระบุตำแหน่งของหาย",
    mapTitle: "ระบุตำแหน่งที่คาดว่าหาย",
    dateField: "lost_date",
    dateLabel: "วันที่หาย",
    locationField: "lost_location",
    locationLabel: "สถานที่ที่หาย",
    depositLabel: "สถานที่ที่รับฝากของ",
    depositPlaceholder: "เช่น กองกิจการนิสิต, ห้องสมุด",
    endpoint: "lostItem",
    listPath: "/lostPage",
    submit: "ส่งข้อมูลแจ้งของหาย",
  },
  found: {
    title: "แจ้งพบของ",
    subtitle: "ระบุตำแหน่งที่พบ เพื่อช่วยให้ของกลับถึงเจ้าของ",
    mapTitle: "ระบุตำแหน่งที่พบ",
    dateField: "found_date",
    dateLabel: "วันที่พบ",
    locationField: "found_location",
    locationLabel: "สถานที่ที่พบ",
    depositLabel: "จุดรับของ (จุดรับฝาก)",
    depositPlaceholder: "เช่น กองกิจการนิสิต, ห้องสมุด",
    endpoint: "foundItem",
    listPath: "/foundPage",
    submit: "ส่งข้อมูลแจ้งพบของ",
  },
};

const EMPTY_FORM = {
  item_name: "",
  item_color: "",
  location: "",
  deposit_location: "",
  date: "",
  category: "",
  description: "",
};

const distance = ([lat1, lng1], [lat2, lng2]) => Math.hypot(lat1 - lat2, lng1 - lng2);

const labelClass = "mb-1.5 block text-sm font-semibold text-slate-800";
// text-base บนมือถือ: iOS ไม่ซูมหน้าเมื่อแตะช่องกรอก
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 md:py-2.5 md:text-sm";

// หัวข้อแต่ละขั้นของฟอร์ม
const Step = ({ no, title, children }) => (
  <fieldset className="space-y-4 border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
    <legend className="mb-1 flex items-center gap-2 text-base font-bold text-slate-900">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand">{no}</span>
      {title}
    </legend>
    {children}
  </fieldset>
);

// คลิกบนแผนที่เพื่อปักหมุด
const MapClickHandler = ({ onPick }) => {
  useMapEvents({ click: (event) => onPick([event.latlng.lat, event.latlng.lng]) });
  return null;
};

// ฟอร์มแจ้งของหาย / แจ้งพบของ (type = "lost" | "found")
const ReportItemForm = ({ type }) => {
  const text = TEXT[type];
  const { categories, depositPoints } = useSiteSettings();
  const mapRef = useRef(null);
  const mapSearchRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const errorRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [pin, setPin] = useState(null);
  const [mapQuery, setMapQuery] = useState("");
  const [mapSuggestions, setMapSuggestions] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [depositSuggestions, setDepositSuggestions] = useState([]);
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  // สถานที่ในมหาวิทยาลัยที่ใกล้หมุดที่สุด (ยังไม่ปักหมุดใช้กลางวิทยาเขต)
  const nearby = useMemo(() => {
    const origin = pin || CAMPUS_CENTER;
    return [...campusLocations]
      .sort((a, b) => distance(a.position, origin) - distance(b.position, origin))
      .slice(0, NEARBY_COUNT);
  }, [pin]);

  const selectLocation = (location) => {
    setField("location", location.name);
    setPin(location.position);
    setMapQuery("");
    setMapSuggestions([]);
    setLocationSuggestions([]);
    mapRef.current?.flyTo(location.position, 18, { duration: 1 });
  };

  // คลิกบนแผนที่: ปักหมุดตรงจุดนั้น และใช้ชื่อสถานที่ที่ใกล้ที่สุดเป็นชื่อตำแหน่ง
  const pickOnMap = (position) => {
    const closest = [...campusLocations].sort((a, b) => distance(a.position, position) - distance(b.position, position))[0];
    setPin(position);
    setField("location", closest.name);
  };

  const chooseImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("รูปภาพต้องมีขนาดไม่เกิน 5 MB");
      return;
    }
    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPin(null);
    clearImage();
  };

  const fail = (message) => {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSuccess(null);

    if (!form.item_name.trim()) return fail("กรุณากรอกชื่อสิ่งของ");
    if (!form.category) return fail("กรุณาเลือกหมวดหมู่");
    if (!form.date) return fail(`กรุณาเลือก${text.dateLabel}`);
    if (form.date > todayInput()) return fail(`${text.dateLabel}ต้องไม่เป็นวันในอนาคต`);
    if (form.date < oldestItemDate()) return fail(`${text.dateLabel}ย้อนหลังได้ไม่เกิน 1 ปี`);
    if (!form.location.trim()) return fail(`กรุณาระบุ${text.locationLabel}`);
    if (!form.deposit_location.trim()) return fail(`กรุณาระบุ${text.depositLabel}`);
    if (!image) return fail("กรุณาเลือกหรือถ่ายรูปภาพสิ่งของ");

    const data = new FormData();
    data.append("image", image);
    data.append("item_name", form.item_name);
    data.append(text.dateField, form.date);
    data.append(text.locationField, form.location);
    data.append("deposit_location", form.deposit_location);
    data.append("category", form.category);
    data.append("item_color", form.item_color);
    data.append("description", form.description);

    setSubmitting(true);
    try {
      const response = await userApi.post(`/${text.endpoint}`, data, { timeout: 30_000 });
      setSuccess(response.data.item_id);
      resetForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      fail(
        err.code === "ECONNABORTED"
          ? "หมดเวลาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง"
          : !err.response
            ? "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต"
            : err.response.data?.error || err.response.data?.message || "ไม่สามารถบันทึกข้อมูลได้"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <header className="relative overflow-hidden rounded-3xl gradient-hero px-5 py-5 text-white shadow-md sm:rounded-2xl sm:px-6 sm:py-6 lg:col-start-1 lg:row-start-1">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <h1 className="relative text-2xl font-bold sm:text-3xl">{text.title}</h1>
        <p className="relative mt-1 text-sm text-white/85">{text.subtitle}</p>
      </header>

      {success && (
        <div role="status" className="card flex flex-col items-center gap-3 p-6 text-center lg:col-span-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand">
            <CheckCircle2 size={30} aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-bold text-slate-900">บันทึกสำเร็จ</p>
            <p className="mt-1 text-sm text-slate-500">
              หมายเลขรายการ {success} · ระบบจะแจ้งเตือนเมื่อพบรายการที่อาจตรงกัน
            </p>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-2">
            <Link to="/my-posts" className="tap flex items-center justify-center gap-1.5 rounded-xl gradient-primary px-3 text-sm font-semibold text-white">
              <ListChecks size={16} /> โพสต์ของฉัน
            </Link>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="tap flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw size={16} /> แจ้งรายการใหม่
            </button>
          </div>
          <Link to={text.listPath} className="text-xs font-semibold text-brand hover:underline">ดูรายการทั้งหมด</Link>
        </div>
      )}

      <div className={`order-last lg:order-none lg:col-start-1 lg:row-start-2 ${success ? "hidden" : ""}`}>
        <section className="card p-4 sm:p-5">
          <h2 className="text-lg font-bold text-slate-900">{text.mapTitle}</h2>
          <p className="mt-0.5 text-xs text-slate-500">ค้นหาสถานที่ หรือคลิกบนแผนที่เพื่อปักหมุด</p>

          {/* isolate: เก็บ z-index ของแผนที่ไว้ภายใน ไม่ให้ลอยทับ Bottom Navigation/ป๊อปอัพ */}
          <div className="relative isolate mt-4 overflow-hidden rounded-xl border border-slate-200">
            {/* ค้นหาบนแผนที่ */}
            <div className="absolute inset-x-3 top-3 z-1000">
              <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-md">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  ref={mapSearchRef}
                  value={mapQuery}
                  onChange={(e) => {
                    setMapQuery(e.target.value);
                    setMapSuggestions(searchLocations(e.target.value));
                  }}
                  placeholder="ค้นหาสถานที่บนแผนที่"
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="relative">
                <LocationSuggestions items={mapSuggestions} onSelect={selectLocation} />
              </div>
            </div>

            <MapContainer ref={mapRef} center={CAMPUS_CENTER} zoom={16} minZoom={14} maxZoom={19} className="z-0 h-64 w-full sm:h-80 lg:h-105" zoomControl={false}>
              {/* ปุ่มซูมไว้มุมขวาล่าง — มุมบนซ้ายเดิมถูกช่องค้นหาบังอยู่ */}
              <ZoomControl position="bottomright" />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onPick={pickOnMap} />
              {campusLocations.map((location) => (
                <CircleMarker
                  key={location.name}
                  center={location.position}
                  radius={4}
                  pathOptions={{ color: "#ffffff", weight: 1, fillColor: "#0d9488", fillOpacity: 0.8 }}
                  eventHandlers={{ click: () => selectLocation(location) }}
                >
                  <Tooltip direction="top" offset={[0, -4]}>{location.name}</Tooltip>
                </CircleMarker>
              ))}
              {pin && <Marker position={pin} icon={pinIcon} />}
            </MapContainer>

            {/* คำอธิบายสัญลักษณ์ */}
            <div className="absolute bottom-3 right-3 z-1000 hidden rounded-xl bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-md sm:block">
              <p className="mb-1 font-semibold">สัญลักษณ์</p>
              <p className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> จุดในมหาวิทยาลัย
              </p>
              <p className="mt-1 flex items-center gap-2">
                <MapPin size={12} className="text-brand" /> ตำแหน่งที่เลือก
              </p>
            </div>
          </div>

          <h3 className="mt-5 text-sm font-bold text-slate-800">สถานที่ใกล้เคียง</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {nearby.map((location) => (
              <button
                key={location.name}
                type="button"
                onClick={() => selectLocation(location)}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  form.location === location.name ? "bg-brand-50 font-semibold text-brand" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Building2 size={15} className="shrink-0 text-brand" />
                <span className="truncate">{location.name}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ── ฟอร์ม (จอใหญ่: คอลัมน์ขวา) ── */}
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-busy={submitting}
        className={`card space-y-5 self-start p-4 sm:p-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 ${success ? "hidden" : ""}`}
      >
        <h2 className="hidden border-b border-slate-100 pb-4 text-xl font-bold text-slate-900 sm:block">ขั้นตอนการแจ้ง</h2>

        <Step no="1" title="ข้อมูลสิ่งของ">
        <div>
          <label htmlFor="report-item-name" className={labelClass}>ชื่อสิ่งของ</label>
          <div className="relative">
            <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="report-item-name"
              value={form.item_name}
              onChange={(e) => setField("item_name", e.target.value)}
              placeholder="เช่น แว่นตา, กระเป๋าสตางค์"
              maxLength={255}
              required
              className={`${inputClass} pl-9`}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">กรุณาใส่ชื่อสิ่งของ</p>
        </div>

        <fieldset>
          <legend className={labelClass}>หมวดหมู่</legend>
          <div className="grid grid-cols-3 gap-2">
            {categories.map(({ value, label, icon: Icon, tone }) => {
              const active = form.category === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setField("category", value)}
                  aria-pressed={active}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2.5 text-xs font-medium transition ${
                    active ? "border-brand bg-brand-50 text-brand ring-2 ring-brand/20" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={22} className={active ? "text-brand" : tone} aria-hidden="true" />
                  {label || value}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="report-color" className={labelClass}>
            สีและจุดสังเกต <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
          </label>
          <div className="relative">
            <Palette size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="report-color"
              value={form.item_color}
              onChange={(e) => setField("item_color", e.target.value)}
              placeholder="เช่น ดำ มีสติกเกอร์แมว"
              maxLength={100}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="report-description" className={labelClass}>
            รายละเอียดเพิ่มเติม <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
          </label>
          <textarea
            id="report-description"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="เช่น ยี่ห้อ รุ่น รอยขีดข่วน ของที่อยู่ข้างใน (ไม่ต้องใส่ข้อมูลส่วนตัว)"
            rows={3}
            maxLength={5000}
            className={`${inputClass} resize-none`}
          />
        </div>
        </Step>

        <Step no="2" title={`${text.dateLabel}และสถานที่`}>
        <div>
          <label htmlFor="report-date" className={labelClass}>{text.dateLabel}</label>
          <div className="relative">
            <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="report-date"
              type="date"
              value={form.date}
              min={oldestItemDate()}
              max={todayInput()}
              onChange={(e) => setField("date", e.target.value)}
              required
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div className="relative">
          <label htmlFor="report-location" className={labelClass}>{text.locationLabel}</label>
          <input
            id="report-location"
            value={form.location}
            onChange={(e) => {
              setField("location", e.target.value);
              setLocationSuggestions(searchLocations(e.target.value));
            }}
            placeholder="พิมพ์ชื่อสถานที่ หรือเลือกจากแผนที่"
            autoComplete="off"
            maxLength={255}
            required
            className={inputClass}
          />
          <LocationSuggestions items={locationSuggestions} onSelect={selectLocation} />
          <button
            type="button"
            onClick={() => {
              mapSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              mapSearchRef.current?.focus();
            }}
            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand underline-offset-2 hover:underline"
          >
            <MapPin size={13} /> ค้นหาสถานที่บนแผนที่
          </button>
        </div>

        <div className="relative">
          <label htmlFor="report-deposit" className={labelClass}>{text.depositLabel}</label>
          <div className="relative">
            <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="report-deposit"
              value={form.deposit_location}
              onChange={(e) => {
                setField("deposit_location", e.target.value);
                setDepositSuggestions(searchLocations(e.target.value));
              }}
              placeholder={text.depositPlaceholder}
              autoComplete="off"
              maxLength={255}
              required
              className={`${inputClass} pl-9`}
            />
          </div>
          <LocationSuggestions
            items={depositSuggestions}
            onSelect={(location) => {
              setField("deposit_location", location.name);
              setDepositSuggestions([]);
            }}
          />
          {/* จุดรับฝากที่แอดมินกำหนด (ตั้งค่า → ค่าระบบ) */}
          {depositPoints.length > 0 && (
            <div className="mt-2">
              <p className="mb-1.5 text-xs text-slate-500">จุดรับฝากของที่แนะนำ</p>
              <div className="flex flex-wrap gap-2">
                {depositPoints.map((point) => {
                  const active = form.deposit_location === point.name;
                  return (
                    <button
                      key={point.name}
                      type="button"
                      onClick={() => setField("deposit_location", point.name)}
                      aria-pressed={active}
                      className={`flex min-h-10 flex-col items-start rounded-xl border px-3 py-1.5 text-left text-xs transition ${
                        active ? "border-brand bg-brand-50 text-brand" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-semibold">{point.name}</span>
                      {point.hours && <span className="text-[11px] text-slate-400">{point.hours}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        </Step>

        <Step no="3" title="รูปภาพสิ่งของ">
        <div>
          <p className="mb-2 text-xs text-slate-500">ถ่ายหรือเลือกรูปที่เห็นสิ่งของชัดเจน (JPG/PNG ไม่เกิน 5 MB)</p>
          {previewUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-slate-200">
              <img src={previewUrl} alt="ตัวอย่างรูปสิ่งของ" className="h-56 w-full bg-slate-50 object-contain" />
              <button
                type="button"
                onClick={clearImage}
                aria-label="ลบรูป"
                className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow hover:bg-white"
              >
                <X size={16} />
              </button>
              <p className="truncate border-t border-slate-100 px-3 py-2 text-xs text-slate-500">{image?.name}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                chooseImage(e.dataTransfer.files?.[0]);
              }}
              className={`hidden w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition sm:flex ${
                dragging ? "border-brand bg-brand-50 text-brand" : "border-slate-300 text-slate-500 hover:border-brand hover:bg-slate-50"
              }`}
            >
              <ImagePlus size={36} className="text-slate-400" />
              ลากและวางรูปภาพที่นี่ หรือเลือกไฟล์ (JPG, PNG)
            </button>
          )}
          {/* มือถือ: ถ่ายรูปด้วยกล้อง หรือเลือกจากคลังภาพ */}
          {!previewUrl && (
            <div className="grid grid-cols-2 gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-soft bg-brand-50/50 text-sm font-semibold text-brand active:bg-brand-50"
              >
                <Camera size={26} aria-hidden="true" /> ถ่ายรูป
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-600 active:bg-slate-50"
              >
                <ImagePlus size={26} aria-hidden="true" /> เลือกจากคลังภาพ
              </button>
            </div>
          )}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => chooseImage(e.target.files?.[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => chooseImage(e.target.files?.[0])}
          />
        </div>
        </Step>

        {error && (
          <p ref={errorRef} role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
          {submitting ? "กำลังส่งข้อมูล..." : text.submit}
          {!submitting && <Send size={16} aria-hidden="true" />}
        </button>
      </form>
    </div>
  );
};

export default ReportItemForm;
