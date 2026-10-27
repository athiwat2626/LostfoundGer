import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_URL } from "./itemUtils";
import { useSiteSettings } from "./siteSettings";

// ปุ่ม "Sign in with Google" (Google Identity Services) — ได้ ID token แล้วส่งให้ backend ตรวจที่ /api/auth/google
// Client ID มาจากค่าระบบสาธารณะ (GOOGLE_CLIENT_ID ใน backend/.env) ไม่ตั้งค่า = ไม่แสดงปุ่ม
const GSI_SRC = "https://accounts.google.com/gsi/client";
let gsiLoading = null;

const loadGsi = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiLoading) {
    gsiLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GSI_SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        gsiLoading = null;
        reject(new Error("โหลด Google Sign-In ไม่สำเร็จ"));
      };
      document.head.appendChild(script);
    });
  }
  return gsiLoading;
};

/**
 * @param {{ text?: "signin_with" | "signup_with" | "continue_with", onSuccess: (data) => void, onError: (message: string) => void }} props
 * onSuccess ได้ { token, email, student_id, created } จาก backend
 */
const GoogleSignInButton = ({ text = "signin_with", onSuccess, onError }) => {
  const { googleClientId } = useSiteSettings();
  const containerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  // เก็บ callback ล่าสุดไว้ใน ref เพื่อไม่ต้อง render ปุ่มของ Google ใหม่ทุกครั้งที่หน้าเปลี่ยน state
  const handlers = useRef({ onSuccess, onError });
  useEffect(() => {
    handlers.current = { onSuccess, onError };
  });

  useEffect(() => {
    if (!googleClientId) return undefined;
    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          ux_mode: "popup",
          callback: async ({ credential }) => {
            setBusy(true);
            try {
              const { data } = await axios.post(`${API_URL}/api/auth/google`, { credential });
              handlers.current.onSuccess(data);
            } catch (err) {
              handlers.current.onError(err.response?.data?.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text,
          locale: "th",
          width: Math.min(400, Math.max(200, containerRef.current.offsetWidth || 320)),
        });
      })
      .catch((err) => !cancelled && handlers.current.onError(err.message));

    return () => {
      cancelled = true;
    };
  }, [googleClientId, text]);

  if (!googleClientId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-300/70" />
        หรือ
        <span className="h-px flex-1 bg-slate-300/70" />
      </div>
      <div ref={containerRef} className={`flex min-h-11 justify-center ${busy ? "pointer-events-none opacity-60" : ""}`} aria-busy={busy} />
    </div>
  );
};

export default GoogleSignInButton;
