import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  Mail,
  IdCard,
  Phone,
  AtSign,
  ShieldCheck,
  Handshake,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  PackageOpen,
} from "lucide-react";
import UserLayout from "../component/UserLayout";
import userApi from "../component/userApi";
import { API_URL, fetchItems, formatThaiDate, reportState } from "../component/itemUtils";
import { ItemDetailModal } from "../component/itemUi";
import LineConnectionCard from "../component/LineConnectionCard";
import DisplaySettingsCard from "../component/DisplaySettingsCard";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20";
const readOnlyClass = "w-full rounded-xl border border-slate-100 bg-slate-100/70 px-3 py-2.5 text-sm text-slate-500";
const labelClass = "mb-1.5 block text-sm font-semibold text-slate-800";
const cardClass = "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm";

const toForm = (user) => ({
  first_name: user.first_name || "",
  last_name: user.last_name || "",
  phone: user.phone || "",
  contact_email: user.contact_email || "",
  preferred_contact: user.preferred_contact || "email",
});

const IconInput = ({ icon: Icon, ...props }) => (
  <div className="relative">
    <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input {...props} className={`${props.readOnly ? readOnlyClass : inputClass} pl-9`} />
  </div>
);

const UserSettings = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState(null); // { file, url } รูปที่เลือกแต่ยังไม่บันทึก
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }
  const [myItems, setMyItems] = useState([]);
  const [selected, setSelected] = useState(null);

  const handleApiError = (err, fallback) => {
    if (err.response?.status === 401) {
      setNeedLogin(true);
      return;
    }
    setMessage({ type: "error", text: err.response?.data?.message || err.response?.data?.error || fallback });
  };

  useEffect(() => {
    userApi
      .get("/api/me")
      .then((res) => {
        setUser(res.data.user);
        setForm(toForm(res.data.user));
      })
      .catch((err) => {
        if (err.response?.status === 401) setNeedLogin(true);
        else setLoadError(err.response?.data?.message || "โหลดข้อมูลบัญชีไม่สำเร็จ");
      });
  }, []);

  // โพสต์ของฉัน: ของพบและของหายที่ผู้ใช้คนนี้แจ้งไว้
  useEffect(() => {
    if (!user) return;
    Promise.all([fetchItems("found"), fetchItems("lost")]).then(([found, lost]) =>
      setMyItems(
        [...found, ...lost]
          .filter((item) => item.student_id === user.student_id)
          .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
      )
    );
  }, [user]);

  const formChanged = useMemo(
    () => Boolean(user && form && JSON.stringify(form) !== JSON.stringify(toForm(user))),
    [user, form]
  );
  const dirty = formChanged || Boolean(pendingAvatar);

  const clearPendingAvatar = () => {
    if (pendingAvatar) URL.revokeObjectURL(pendingAvatar.url);
    setPendingAvatar(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      let latest = user;
      if (pendingAvatar) {
        const data = new FormData();
        data.append("image", pendingAvatar.file);
        latest = (await userApi.post("/api/me/avatar", data)).data.user;
        clearPendingAvatar();
        setUser(latest); // รูปบันทึกแล้ว แม้ขั้นตอนถัดไปจะผิดพลาด
      }
      if (formChanged) {
        latest = (await userApi.patch("/api/me", form)).data.user;
      }
      setUser(latest);
      setForm(toForm(latest));
      // ให้แถบด้านบน (UserLayout) โหลดชื่อ/รูปโปรไฟล์ใหม่
      window.dispatchEvent(new Event("profile-updated"));
      setMessage({ type: "success", text: "บันทึกการเปลี่ยนแปลงแล้ว" });
    } catch (err) {
      handleApiError(err, "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "รองรับเฉพาะไฟล์รูปภาพ" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "รูปภาพต้องไม่เกิน 5 MB" });
      return;
    }
    if (pendingAvatar) URL.revokeObjectURL(pendingAvatar.url);
    setPendingAvatar({ file, url: URL.createObjectURL(file) });
    setMessage(null);
  };

  if (needLogin) {
    return (
      <UserLayout>
        <div className={`${cardClass} mx-auto mt-10 max-w-md text-center`}>
          <ShieldCheck size={40} className="mx-auto text-brand" />
          <h1 className="mt-3 text-lg font-bold text-slate-900">กรุณาเข้าสู่ระบบอีกครั้ง</h1>
          <p className="mt-1 text-sm text-slate-500">เพื่อความปลอดภัย การแก้ไขข้อมูลบัญชีต้องยืนยันตัวตนด้วย OTP ใหม่</p>
          <Link to="/login" className="mt-5 inline-block rounded-xl gradient-primary px-6 py-2.5 text-sm font-semibold text-white">
            ไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </UserLayout>
    );
  }

  const initial = (user?.first_name || user?.email || "?")[0];

  return (
    <UserLayout>
      <ItemDetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onReport={(item) => navigate("/report", { state: reportState(item) })}
      />

      <div className="mt-8">
        <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าบัญชี</h1>
        <p className="mt-1 text-sm text-slate-500">จัดการข้อมูลส่วนตัวและช่องทางติดต่อของคุณ</p>
      </div>

      {loadError && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{loadError}</p>}
      {!user && !loadError && <div className="mt-6 h-96 animate-pulse rounded-2xl bg-white shadow-sm" />}

      {user && form && (
        <form onSubmit={handleSave} className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* ── ซ้าย: ข้อมูลโปรไฟล์ + ข้อมูลติดต่อ ── */}
          <section className={cardClass}>
            <h2 className="text-lg font-bold text-slate-900">ข้อมูลโปรไฟล์</h2>

            <div className="mt-4 flex items-center gap-4">
              {pendingAvatar || user.profile_image ? (
                <img
                  src={pendingAvatar ? pendingAvatar.url : `${API_URL}${user.profile_image}`}
                  alt="รูปโปรไฟล์"
                  className={`h-20 w-20 rounded-full object-cover shadow ${pendingAvatar ? "ring-2 ring-amber-400 ring-offset-2" : ""}`}
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary text-3xl font-bold uppercase text-white">
                  {initial}
                </span>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-full gradient-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Camera size={16} />
                  {pendingAvatar ? "เลือกรูปอื่น" : "อัปโหลดรูปใหม่"}
                </button>
                <p className={`mt-1 text-xs ${pendingAvatar ? "font-medium text-amber-600" : "text-slate-400"}`}>
                  {pendingAvatar ? "กด “บันทึกการเปลี่ยนแปลง” เพื่อใช้รูปนี้" : "JPG หรือ PNG ไม่เกิน 5 MB"}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatar(e.target.files?.[0])}
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="settings-first-name" className={labelClass}>ชื่อ</label>
                <input
                  id="settings-first-name"
                  value={form.first_name}
                  onChange={(e) => setField("first_name", e.target.value)}
                  maxLength={100}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="settings-last-name" className={labelClass}>นามสกุล</label>
                <input
                  id="settings-last-name"
                  value={form.last_name}
                  onChange={(e) => setField("last_name", e.target.value)}
                  maxLength={100}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="settings-email" className={labelClass}>อีเมล</label>
              <IconInput id="settings-email" icon={Mail} value={user.email} readOnly />
              <p className="mt-1 text-xs text-slate-400">อีเมลที่ใช้เข้าสู่ระบบ ไม่สามารถแก้ไขได้</p>
            </div>

            <div className="mt-4">
              <label htmlFor="settings-student-id" className={labelClass}>รหัสผู้ใช้</label>
              <IconInput id="settings-student-id" icon={IdCard} value={user.student_id} readOnly />
            </div>

            <h3 className="mt-6 border-t border-slate-100 pt-5 text-base font-bold text-slate-900">ข้อมูลติดต่อ</h3>
            <div className="mt-3">
              <label htmlFor="settings-phone" className={labelClass}>เบอร์โทรศัพท์</label>
              <IconInput
                id="settings-phone"
                icon={Phone}
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="เช่น 081-234-5678"
                maxLength={20}
              />
            </div>
            <div className="mt-4">
              <label htmlFor="settings-contact-email" className={labelClass}>
                อีเมลสำรอง <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
              </label>
              <IconInput
                id="settings-contact-email"
                icon={AtSign}
                type="email"
                value={form.contact_email}
                onChange={(e) => setField("contact_email", e.target.value)}
                placeholder="อีเมลอื่นที่ติดต่อได้"
                maxLength={255}
              />
            </div>
          </section>

          {/* ── ขวา: ช่องทางติดต่อ + ความปลอดภัย + โพสต์ของฉัน ── */}
          <div className="space-y-6">
            <section className={cardClass}>
              <h2 className="text-lg font-bold text-slate-900">การติดต่อเรื่องสิ่งของ</h2>
              <label htmlFor="settings-preferred" className={`${labelClass} mt-4`}>ช่องทางที่สะดวกให้ติดต่อ</label>
              <select
                id="settings-preferred"
                value={form.preferred_contact}
                onChange={(e) => setField("preferred_contact", e.target.value)}
                className={inputClass}
              >
                <option value="email">อีเมล</option>
                <option value="phone">โทรศัพท์</option>
              </select>
              <p className="mt-1 text-xs text-slate-400">ใช้เมื่อมีผู้ต้องการติดต่อเรื่องของที่คุณแจ้งไว้</p>
            </section>

            <LineConnectionCard />

            <DisplaySettingsCard />

            <section className={cardClass}>
              <h2 className="text-lg font-bold text-slate-900">ความปลอดภัยและบัญชี</h2>
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-brand-50 px-4 py-3">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand" />
                <p className="text-sm text-slate-700">
                  เข้าสู่ระบบด้วยรหัส OTP ที่ส่งไปยังอีเมลทุกครั้ง จึงไม่ต้องตั้งหรือจำรหัสผ่าน
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500"><Handshake size={14} /> คืนของสำเร็จ</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{user.successful_returns} ครั้ง</p>
                </div>
                <div className="rounded-xl border border-slate-100 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={14} /> สมาชิกตั้งแต่</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatThaiDate(user.created_at, "long")}</p>
                </div>
              </div>
            </section>

            <section className={cardClass}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">โพสต์ของฉัน</h2>
                <Link to="/my-posts" className="text-xs font-semibold text-brand hover:underline">
                  จัดการ ({myItems.length}) →
                </Link>
              </div>
              {myItems.length === 0 ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                  <PackageOpen size={18} /> ยังไม่มีโพสต์
                </p>
              ) : (
                <ul className="mt-3 max-h-64 divide-y divide-slate-50 overflow-auto">
                  {myItems.map((item) => (
                    <li key={`${item.type}-${item.item_id}`}>
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="flex w-full items-center gap-3 py-2.5 text-left transition hover:bg-slate-50"
                      >
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold text-white ${
                            item.type === "found" ? "bg-green-500" : "bg-orange-500"
                          }`}
                        >
                          {item.type === "found" ? "ของที่พบ" : "ของหาย"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{item.item_name}</span>
                        <span className="shrink-0 text-xs text-slate-400">{formatThaiDate(item.date)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ── ปุ่มบันทึก ── */}
          <div className="flex flex-col-reverse items-stretch gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-end">
            {message && (
              <p
                role={message.type === "error" ? "alert" : "status"}
                className={`flex items-center gap-2 text-sm sm:mr-auto ${message.type === "error" ? "text-red-600" : "text-brand"}`}
              >
                {message.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                {message.text}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setForm(toForm(user));
                clearPendingAvatar();
                setMessage(null);
              }}
              disabled={!dirty || saving}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!dirty || saving}
              className="rounded-xl gradient-primary px-6 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
            </button>
          </div>
        </form>
      )}
    </UserLayout>
  );
};

export default UserSettings;
