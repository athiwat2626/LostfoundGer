import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import adminApi from "../api/adminApi";

const ACTION_LABEL = {
  dismissed: "ยกเลิกรายงาน",
  warning: "ออกคำเตือน",
  suspend: "ระงับบัญชี",
  ban: "แบนถาวร",
};

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
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
          />
        </div>

        {message && (
          <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-600">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
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
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
        />
        <input
          type="password"
          placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
        />

        {message && (
          <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-600">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
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
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
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

const Settings = () => {
  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-6">ข้อมูลบัญชีแอดมินและกิจกรรมล่าสุด</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <ProfileCard />
          <PasswordCard />
        </div>
        <ActivityCard />
      </div>
    </div>
  );
};

export default Settings;
