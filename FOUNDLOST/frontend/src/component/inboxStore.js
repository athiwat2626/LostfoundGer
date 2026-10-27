import { useEffect, useSyncExternalStore } from "react";
import userApi from "./userApi";

// กล่องแจ้งเตือนกลาง: กระดิ่ง, Bottom Navigation และหน้าการแจ้งเตือนใช้ข้อมูลชุดเดียวกัน
// ดึง GET /api/inbox ครั้งเดียวต่อรอบ (ทุก 1 นาทีขณะเปิดหน้าอยู่) แทนที่แต่ละคอมโพเนนต์จะดึงเอง
const POLL_MS = 60_000;

// token = ผู้ใช้เจ้าของข้อมูลชุดนี้ (เปลี่ยนบัญชีแล้วต้องโหลดใหม่ ไม่แสดงของคนก่อน)
let state = { notifications: [], unread: 0, loaded: false, error: false, token: null };
const listeners = new Set();
let timer = null;
let inflight = null;

const emit = () => listeners.forEach((listener) => listener());

export const refreshInbox = () => {
  const token = localStorage.getItem("userToken");
  if (!token) return Promise.resolve();
  if (!inflight) {
    inflight = userApi
      .get("/api/inbox")
      .then((res) => {
        state = { notifications: res.data.notifications, unread: res.data.unread, loaded: true, error: false, token };
      })
      .catch(() => {
        state = { ...state, loaded: true, error: true, token };
      })
      .finally(() => {
        inflight = null;
        emit();
      });
  }
  return inflight;
};

export const markInboxRead = (id) => userApi.post(`/api/inbox/${id}/read`).then(refreshInbox);
export const markAllInboxRead = () => userApi.post("/api/inbox/read-all").then(refreshInbox);

const subscribe = (listener) => {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      if (document.visibilityState === "visible") refreshInbox();
    }, POLL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
};

export const useInbox = () => {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  const stale = !snapshot.loaded || snapshot.token !== localStorage.getItem("userToken");
  useEffect(() => {
    if (stale) refreshInbox();
  }, [stale]);
  return stale && snapshot.token ? { ...snapshot, notifications: [], unread: 0, loaded: false } : snapshot;
};
