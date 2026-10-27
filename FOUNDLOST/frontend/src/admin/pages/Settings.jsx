import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, UserCog, SlidersHorizontal, Megaphone } from "lucide-react";
import { ACTION_LABEL } from "../labels";
import adminApi from "../api/adminApi";
import SystemSettingsForm from "../components/SystemSettingsForm";
import AnnouncementSettingsForm from "../components/AnnouncementSettingsForm";
import { refreshSiteSettings } from "../../component/siteSettings";

const ProfileCard = () => {
  const [email, setEmail] = useState(localStorage.getItem("adminEmail") || "");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminApi
      .get("/admin/auth/me")
      .then((res) => {
        setEmail(res.data.admin.email);
        setDisplayName(res.data.admin.display_name || "");
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const res = await adminApi.patch("/admin/auth/profile", { display_name: displayName });
      setDisplayName(res.data.admin.display_name);
      setMessage("บันทึกชื่อที่แสดงสำเร็จ");
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-800">ข้อมูลบัญชีแอดมิน</p>
      <p className="mb-3 text-xs text-slate-400">
        อีเมล: <span className="font-medium text-slate-600">{email}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">ชื่อที่แสดง</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={100}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>

        {message && (
          <p className="rounded-lg bg-brand-50 border border-brand-soft px-3 py-2 text-sm text-brand">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg gradient-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึกชื่อที่แสดง"}
        </button>
      </form>
    </div>
  );
};

const PasswordCard = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await adminApi.post("/admin/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage("เปลี่ยนรหัสผ่านสำเร็จ");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-800">เปลี่ยนรหัสผ่าน</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          placeholder="รหัสผ่านปัจจุบัน"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
        <input
          type="password"
          placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />

        {message && (
          <p className="rounded-lg bg-brand-50 border border-brand-soft px-3 py-2 text-sm text-brand">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg gradient-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
        </button>
      </form>
    </div>
  );
};

const ActivityCard = () => {
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .get("/admin/activity", { params: { limit: 15 } })
      .then((res) => {
        setActivity(res.data.activity);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "โหลดกิจกรรมไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-800">กิจกรรมล่าสุด</p>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {!loading && activity.length === 0 && !error && (
        <p className="py-6 text-center text-sm text-slate-400">ยังไม่มีกิจกรรม</p>
      )}

      <div className="space-y-3">
        {activity.map((a) => (
          <div key={a.report_id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
              <Clock size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700">
                <span className="font-medium">{ACTION_LABEL[a.action_taken] || a.action_taken}</span>
                {a.item_name && <> · {a.item_name}</>}
              </p>
              <p className="text-xs text-slate-400">
                #{a.report_id.replace("RPT-", "")} · โดย {a.resolved_by_name || a.resolved_by_email || "-"} ·{" "}
                {new Date(a.resolved_at).toLocaleString("th-TH")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TABS = [
  { id: "account", label: "บัญชีของฉัน", icon: UserCog },
  { id: "system", label: "ค่าระบบ", icon: SlidersHorizontal },
  { id: "announce", label: "ประกาศและปิดปรับปรุง", icon: Megaphone },
];

// ─── หน้าตั้งค่าแอดมิน (แท็บ: บัญชีของฉัน / ค่าระบบ / ประกาศและปิดปรับปรุง) ─────────
const Settings = () => {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "account";
  const [data, setData] = useState(null); // { settings, defaults }
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    adminApi
      .get("/admin/settings")
      .then((res) => setData({ settings: res.data.settings, defaults: res.data.defaults }))
      .catch((err) => setLoadError(err.response?.data?.message || "โหลดค่าระบบไม่สำเร็จ"));
  }, []);

  const onSaved = (settings) => {
    setData((prev) => ({ ...prev, settings }));
    // ให้หน้าเว็บในแท็บนี้ใช้ค่าใหม่ทันที (หมวดหมู่, ประกาศ)
    refreshSiteSettings();
  };

  return (
    <div className="max-w-5xl">
      <h1 className="mb-1 text-xl font-bold text-slate-900 sm:text-2xl">ตั้งค่า</h1>
      <p className="mb-4 text-sm text-slate-500">บัญชีแอดมิน ค่าการทำงานของระบบ และประกาศถึงผู้ใช้ · ทุกการแก้ไขถูกบันทึกในประวัติการดำเนินการ</p>

      <div role="tablist" aria-label="หมวดการตั้งค่า" className="scroll-x -mx-4 mb-5 flex gap-1 px-4 sm:mx-0 sm:inline-flex sm:rounded-xl sm:border sm:border-slate-100 sm:bg-white sm:p-1 sm:shadow-sm">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setParams(id === "account" ? {} : { tab: id }, { replace: true })}
            className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition ${
              tab === id ? "bg-brand text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <ProfileCard />
            <PasswordCard />
          </div>
          <ActivityCard />
        </div>
      )}

      {tab !== "account" &&
        (loadError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{loadError}</p>
        ) : !data ? (
          <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />
        ) : tab === "system" ? (
          <SystemSettingsForm key="system" settings={data.settings} defaults={data.defaults} onSaved={onSaved} />
        ) : (
          <AnnouncementSettingsForm key="announce" settings={data.settings} onSaved={onSaved} />
        ))}
    </div>
  );
};

export default Settings;
