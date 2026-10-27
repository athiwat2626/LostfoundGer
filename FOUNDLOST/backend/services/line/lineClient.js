// เรียก LINE Messaging API ผ่าน fetch (ไม่ต้องติดตั้ง SDK เพิ่ม)
// ข้อผิดพลาดทั้งหมดเป็น LineApiError ที่ไม่มี access token อยู่ในข้อความ จึง log ได้ปลอดภัย
const { getLineConfig } = require("./config");

const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";
const REQUEST_TIMEOUT_MS = 10_000;

class LineApiError extends Error {
  /**
   * @param {string} message สรุปข้อผิดพลาด (ไม่มีข้อมูลลับ)
   * @param {{ status?: number, code: string, retryable: boolean, requestId?: string, acceptedRequestId?: string }} info
   */
  constructor(message, { status = 0, code, retryable, requestId = null, acceptedRequestId = null }) {
    super(message);
    this.name = "LineApiError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.requestId = requestId;
    this.acceptedRequestId = acceptedRequestId;
  }
}

// 429 และ 5xx ลองใหม่ได้ / 4xx อื่น ๆ คือคำขอผิด ลองใหม่ก็ไม่สำเร็จ
const isRetryableStatus = (status) => status === 429 || status >= 500;

const readErrorDetail = async (response) => {
  try {
    const text = await response.text();
    const body = JSON.parse(text);
    const details = Array.isArray(body.details) ? body.details.map((d) => `${d.property}: ${d.message}`).join("; ") : "";
    return [body.message, details].filter(Boolean).join(" — ").slice(0, 300);
  } catch {
    return "";
  }
};

const request = async (url, { method = "GET", body, headers = {}, rawBody, contentType, allowNotFound = false } = {}) => {
  const { channelAccessToken } = getLineConfig();
  if (!channelAccessToken) {
    throw new LineApiError("LINE_CHANNEL_ACCESS_TOKEN is not configured", { code: "not_configured", retryable: false });
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(rawBody !== undefined ? { "Content-Type": contentType } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : rawBody,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // เครือข่ายล่ม/หมดเวลา: ไม่รู้ว่า LINE ได้รับคำขอหรือยัง (ผลไม่แน่ชัด)
    const timedOut = error.name === "TimeoutError" || error.name === "AbortError";
    throw new LineApiError(timedOut ? "LINE API request timed out" : `LINE API network error: ${error.message}`, {
      code: timedOut ? "timeout" : "network_error",
      retryable: true,
    });
  }

  const requestId = response.headers.get("x-line-request-id");
  if (allowNotFound && response.status === 404) return { status: 404, requestId, data: null };
  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new LineApiError(`LINE API ${response.status}${detail ? `: ${detail}` : ""}`, {
      status: response.status,
      code: `http_${response.status}`,
      retryable: isRetryableStatus(response.status),
      requestId,
      acceptedRequestId: response.headers.get("x-line-accepted-request-id"),
    });
  }

  const type = response.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await response.json() : null;
  return { status: response.status, requestId, data };
};

// ─── ข้อความ ──────────────────────────────────────────────────────────────────
// retryKey (UUID) ทำให้การส่งซ้ำด้วย key เดิมภายใน 24 ชม. ไม่เกิดข้อความซ้ำ — LINE ตอบ 409 แทน
const pushMessage = (to, messages, { retryKey } = {}) =>
  request(`${API}/message/push`, {
    method: "POST",
    body: { to, messages },
    headers: retryKey ? { "X-Line-Retry-Key": retryKey } : {},
  });

const replyMessage = (replyToken, messages) =>
  request(`${API}/message/reply`, { method: "POST", body: { replyToken, messages } });

// ชื่อและรูปโปรไฟล์ของ Official Account
const getBotInfo = async () => (await request(`${API}/info`)).data;

const getProfile = async (userId) => (await request(`${API}/profile/${encodeURIComponent(userId)}`)).data;

// ─── Rich Menu ───────────────────────────────────────────────────────────────
const validateRichMenu = (richMenu) => request(`${API}/richmenu/validate`, { method: "POST", body: richMenu });
const createRichMenu = async (richMenu) =>
  (await request(`${API}/richmenu`, { method: "POST", body: richMenu })).data.richMenuId;
const listRichMenus = async () => (await request(`${API}/richmenu/list`)).data.richmenus || [];
const deleteRichMenu = (richMenuId) => request(`${API}/richmenu/${encodeURIComponent(richMenuId)}`, { method: "DELETE" });
const uploadRichMenuImage = (richMenuId, image, contentType) =>
  request(`${DATA_API}/richmenu/${encodeURIComponent(richMenuId)}/content`, {
    method: "POST",
    rawBody: image,
    contentType,
  });
const hasRichMenuImage = async (richMenuId) =>
  (await request(`${DATA_API}/richmenu/${encodeURIComponent(richMenuId)}/content`, { allowNotFound: true })).status !== 404;
const getDefaultRichMenuId = async () => {
  const result = await request(`${API}/user/all/richmenu`, { allowNotFound: true });
  return result.data?.richMenuId || null;
};
const setDefaultRichMenu = (richMenuId) =>
  request(`${API}/user/all/richmenu/${encodeURIComponent(richMenuId)}`, { method: "POST" });
// เมนูรายคน (ทับเมนูเริ่มต้น) — ยกเลิกแล้วผู้ใช้กลับไปเห็นเมนูเริ่มต้น
const linkRichMenuToUser = (userId, richMenuId) =>
  request(`${API}/user/${encodeURIComponent(userId)}/richmenu/${encodeURIComponent(richMenuId)}`, { method: "POST" });
const unlinkRichMenuFromUser = (userId) =>
  request(`${API}/user/${encodeURIComponent(userId)}/richmenu`, { method: "DELETE" });
// ผูกเมนูให้หลายคนพร้อมกัน (สูงสุด 500 คนต่อครั้ง)
const bulkLinkRichMenu = (richMenuId, userIds) =>
  request(`${API}/richmenu/bulk/link`, { method: "POST", body: { richMenuId, userIds } });

module.exports = {
  LineApiError,
  pushMessage,
  replyMessage,
  getProfile,
  getBotInfo,
  validateRichMenu,
  createRichMenu,
  listRichMenus,
  deleteRichMenu,
  uploadRichMenuImage,
  hasRichMenuImage,
  getDefaultRichMenuId,
  setDefaultRichMenu,
  linkRichMenuToUser,
  unlinkRichMenuFromUser,
  bulkLinkRichMenu,
};
