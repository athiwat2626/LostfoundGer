import { useCallback, useEffect, useState } from "react";
import { Search as SearchIcon, ShieldAlert, UserX, Ban, RotateCcw, Eye } from "lucide-react";
import adminApi from "../api/adminApi";
import SuspendModal from "../components/SuspendModal";
import UserDetailModal from "../components/UserDetailModal";

const statusOf = (user) => {
  if (user.is_banned) return { label: "ถูกแบน", tone: "bg-red-50 text-red-600" };
  if (user.suspended_until && new Date(user.suspended_until) > new Date())
    return { label: "ถูกระงับ", tone: "bg-amber-50 text-amber-600" };
  return { label: "ใช้งานปกติ", tone: "bg-brand-50 text-brand" };
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [viewId, setViewId] = useState(null);

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

  const renderActions = (u) => {
    const disabled = busyId === u.student_id;
    return (
      <div className="flex justify-end gap-1.5">
        <button
          onClick={() => setViewId(u.student_id)}
          title="ดูข้อมูลผู้ใช้"
          aria-label="ดูข้อมูลผู้ใช้"
          className="rounded-lg p-2 text-brand hover:bg-brand-50"
        >
          <Eye size={16} />
        </button>
        <button
          disabled={disabled}
          onClick={() => act(u.student_id, { action: "warn" })}
          title="ออกคำเตือน"
          className="rounded-lg p-2 text-orange-500 hover:bg-orange-50 disabled:opacity-60"
        >
          <ShieldAlert size={16} />
        </button>
        {u.is_banned ? (
          <button
            disabled={disabled}
            onClick={() => act(u.student_id, { action: "unban" })}
            title="ยกเลิกการแบน"
            className="rounded-lg p-2 text-brand hover:bg-brand-50 disabled:opacity-60"
          >
            <RotateCcw size={16} />
          </button>
        ) : (
          <button
            disabled={disabled}
            onClick={() => act(u.student_id, { action: "ban" })}
            title="แบนถาวร"
            className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <Ban size={16} />
          </button>
        )}
        {u.suspended_until && new Date(u.suspended_until) > new Date() ? (
          <button
            disabled={disabled}
            onClick={() => act(u.student_id, { action: "unsuspend" })}
            title="ยกเลิกการระงับ"
            className="rounded-lg p-2 text-brand hover:bg-brand-50 disabled:opacity-60"
          >
            <RotateCcw size={16} />
          </button>
        ) : (
          <button
            disabled={disabled}
            onClick={() => setSuspendTarget(u)}
            title="ระงับบัญชี"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-60"
          >
            <UserX size={16} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1 sm:text-2xl">ผู้ใช้งาน</h1>
      <p className="text-sm text-slate-500 mb-4">ทั้งหมด {total} คน</p>

      <div className="mb-4 relative sm:max-w-xs">
        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อ, อีเมล, รหัสนิสิต..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-base outline-none focus:border-brand sm:rounded-lg sm:py-2 sm:text-sm"
        />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* มือถือ: แสดงเป็นการ์ด */}
      <ul className="space-y-2.5 md:hidden">
        {users.length === 0 && (
          <li className="rounded-2xl border border-slate-100 bg-white py-8 text-center text-sm text-slate-400">ไม่พบผู้ใช้</li>
        )}
        {users.map((u) => {
          const status = statusOf(u);
          return (
            <li key={u.student_id} className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{u.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>{status.label}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-50 pt-2">
                <span className="text-xs text-slate-500">คำเตือน {u.warning_count} ครั้ง</span>
                {renderActions(u)}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm md:block">
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
                    {renderActions(u)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewId && <UserDetailModal studentId={viewId} onClose={() => setViewId(null)} />}

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
