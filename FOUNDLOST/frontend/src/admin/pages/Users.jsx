import { useCallback, useEffect, useState } from "react";
import { Search as SearchIcon, ShieldAlert, UserX, Ban, RotateCcw } from "lucide-react";
import adminApi from "../api/adminApi";
import SuspendModal from "../components/SuspendModal";

const statusOf = (user) => {
  if (user.is_banned) return { label: "Banned", tone: "bg-red-50 text-red-600" };
  if (user.suspended_until && new Date(user.suspended_until) > new Date())
    return { label: "Suspended", tone: "bg-amber-50 text-amber-600" };
  return { label: "Active", tone: "bg-emerald-50 text-emerald-600" };
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    adminApi
      .get("/admin/users", { params: { q: q || undefined } })
      .then((res) => {
        setUsers(res.data.users);
        setTotal(res.data.total);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "โหลดข้อมูลไม่สำเร็จ"));
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (student_id, body) => {
    setBusyId(student_id);
    try {
      await adminApi.post(`/admin/users/${student_id}/action`, body);
      setSuspendTarget(null);
      load();
    } catch (err) {
      window.alert(err.response?.data?.message || "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-1">Users</h1>
      <p className="text-sm text-slate-500 mb-4">ทั้งหมด {total} คน</p>

      <div className="mb-4 relative max-w-xs">
        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อ, อีเมล, รหัสนิสิต..."
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
              <th className="px-4 py-3">ชื่อ</th>
              <th className="px-4 py-3">อีเมล</th>
              <th className="px-4 py-3">คำเตือน</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  ไม่พบผู้ใช้
                </td>
              </tr>
            )}
            {users.map((u) => {
              const status = statusOf(u);
              const disabled = busyId === u.student_id;
              return (
                <tr key={u.student_id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500">{u.warning_count}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.tone}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        disabled={disabled}
                        onClick={() => act(u.student_id, { action: "warn" })}
                        title="Issue Warning"
                        className="rounded-lg p-2 text-orange-500 hover:bg-orange-50 disabled:opacity-60"
                      >
                        <ShieldAlert size={16} />
                      </button>
                      {u.is_banned ? (
                        <button
                          disabled={disabled}
                          onClick={() => act(u.student_id, { action: "unban" })}
                          title="Unban"
                          className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          <RotateCcw size={16} />
                        </button>
                      ) : (
                        <button
                          disabled={disabled}
                          onClick={() => act(u.student_id, { action: "ban" })}
                          title="Ban Permanently"
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          <Ban size={16} />
                        </button>
                      )}
                      {u.suspended_until && new Date(u.suspended_until) > new Date() ? (
                        <button
                          disabled={disabled}
                          onClick={() => act(u.student_id, { action: "unsuspend" })}
                          title="Unsuspend"
                          className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          <RotateCcw size={16} />
                        </button>
                      ) : (
                        <button
                          disabled={disabled}
                          onClick={() => setSuspendTarget(u)}
                          title="Suspend"
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-60"
                        >
                          <UserX size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {suspendTarget && (
        <SuspendModal
          userLabel={`${suspendTarget.first_name} ${suspendTarget.last_name}`}
          submitting={busyId === suspendTarget.student_id}
          onCancel={() => setSuspendTarget(null)}
          onConfirm={(body) => act(suspendTarget.student_id, body)}
        />
      )}
    </div>
  );
};

export default Users;
