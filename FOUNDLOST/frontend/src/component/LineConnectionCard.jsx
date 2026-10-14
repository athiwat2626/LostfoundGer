import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, CheckCircle2, BellOff, BellRing, Unlink } from "lucide-react";
import LineLogo from "./LineLogo";
import userApi from "./userApi";
import ConfirmDialog from "./ConfirmDialog";
import { formatThaiDate } from "./itemUtils";

// ─── การ์ดสถานะการเชื่อม LINE (หน้าบัญชีของฉัน / หน้าการแจ้งเตือน) ─────────────────
const LineConnectionCard = ({ className = "" }) => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  const load = useCallback(() => {
    userApi
      .get("/api/line/status")
      .then((res) => {
        setStatus(res.data);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "โหลดสถานะ LINE ไม่สำเร็จ"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleNotify = async () => {
    setBusy(true);
    try {
      await userApi.patch("/api/line/preferences", { notify_enabled: !status.line.notify_enabled });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    try {
      await userApi.delete("/api/line/link");
      setConfirmUnlink(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "ยกเลิกการเชื่อมไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const line = status?.line;

  return (
    <section className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ${className}`}>
      <ConfirmDialog
        open={confirmUnlink}
        title="ยกเลิกการเชื่อม LINE?"
        message="คุณจะไม่ได้รับแจ้งเตือนทาง LINE อีก จนกว่าจะเชื่อมบัญชีใหม่"
        confirmLabel="ยกเลิกการเชื่อม"
        tone="danger"
        busy={busy}
        onConfirm={unlink}
        onCancel={() => setConfirmUnlink(false)}
      />

      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <MessageCircle size={20} className="text-[#06C755]" /> การแจ้งเตือนทาง LINE
      </h2>

      {!status && !error && <div className="mt-4 h-16 animate-pulse rounded-xl bg-slate-100" />}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {status && !status.linked && (
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          <p>รับแจ้งเตือนทาง LINE ทันทีเมื่อมีคนแจ้งพบของที่อาจเป็นของคุณ</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>เพิ่มเพื่อน LINE Official Account ของ KULost&amp;Found</li>
            <li>กดปุ่ม “เชื่อมบัญชี” ในข้อความต้อนรับ (หรือพิมพ์ “เชื่อมบัญชี” ในแชต)</li>
            <li>เข้าสู่ระบบเว็บแอปแล้วกดยืนยัน</li>
          </ol>
          {status.add_friend_url ? (
            <Link
              to="/line/add"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[#06C755] px-4 py-2 font-semibold text-[#06C755] transition hover:bg-[#06C755]/5"
            >
              <LineLogo size={20} /> เพิ่มเพื่อน LINE / สแกน QR
            </Link>
          ) : (
            !status.configured && <p className="text-xs text-slate-400">ผู้ดูแลระบบยังไม่ได้เปิดใช้งาน LINE</p>
          )}
        </div>
      )}

      {line && (
        <div className="mt-3 space-y-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-brand">
            <CheckCircle2 size={16} /> เชื่อมกับ LINE {line.display_name ? `“${line.display_name}”` : ""} แล้ว
          </p>
          <p className="text-xs text-slate-500">เชื่อมเมื่อ {formatThaiDate(line.linked_at, "long")}</p>
          {!line.is_following && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              คุณยกเลิกการเป็นเพื่อนหรือบล็อก LINE OA อยู่ ระบบจึงส่งข้อความไม่ได้ — เพิ่มเพื่อนอีกครั้งเพื่อรับแจ้งเตือน
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleNotify}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {line.notify_enabled ? <BellOff size={16} /> : <BellRing size={16} />}
              {line.notify_enabled ? "ปิดการแจ้งเตือน LINE" : "เปิดการแจ้งเตือน LINE"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmUnlink(true)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <Unlink size={16} /> ยกเลิกการเชื่อม
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default LineConnectionCard;
