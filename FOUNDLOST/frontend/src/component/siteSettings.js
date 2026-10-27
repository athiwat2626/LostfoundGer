import { useEffect, useSyncExternalStore } from "react";
import axios from "axios";
import { API_URL } from "./itemUtils";
import { CATEGORIES, withCategoryIcons } from "../data/categories";

// ค่าสาธารณะของระบบ (GET /api/settings/public): หมวดหมู่, จุดรับฝาก, ประกาศ, โหมดปิดปรับปรุง
// โหลดครั้งเดียวต่อการเปิดเว็บ และโหลดใหม่ทุก 5 นาที — โหลดไม่ได้ใช้ค่าเริ่มต้นเดิม
const REFRESH_MS = 5 * 60_000;

let state = {
  loaded: false,
  categories: CATEGORIES,
  categoryNames: CATEGORIES.map((c) => c.value),
  depositPoints: [],
  announcement: null,
  maintenance: { enabled: false },
  googleClientId: null,
};
const listeners = new Set();
let inflight = null;
let timer = null;

const emit = () => listeners.forEach((listener) => listener());

export const refreshSiteSettings = () => {
  if (!inflight) {
    inflight = axios
      .get(`${API_URL}/api/settings/public`, { timeout: 10_000 })
      .then(({ data }) => {
        state = {
          loaded: true,
          categories: withCategoryIcons(data.categories),
          categoryNames: data.categories,
          depositPoints: data.deposit_points || [],
          announcement: data.announcement,
          maintenance: data.maintenance || { enabled: false },
          googleClientId: data.google_client_id || null,
        };
      })
      .catch(() => {
        state = { ...state, loaded: true };
      })
      .finally(() => {
        inflight = null;
        emit();
      });
  }
  return inflight;
};

const subscribe = (listener) => {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      if (document.visibilityState === "visible") refreshSiteSettings();
    }, REFRESH_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
};

export const useSiteSettings = () => {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    if (!snapshot.loaded) refreshSiteSettings();
  }, [snapshot.loaded]);
  return snapshot;
};
