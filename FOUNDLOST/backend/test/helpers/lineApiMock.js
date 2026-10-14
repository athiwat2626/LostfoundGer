// จำลอง LINE API โดยแทน globalThis.fetch — ไม่มีการเรียก LINE จริงในการทดสอบอัตโนมัติ
const json = (status, body, headers = {}) =>
  new Response(body === undefined ? "" : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-line-request-id": `req-${Math.random().toString(36).slice(2, 8)}`, ...headers },
  });

/**
 * @param {(req: { url, method, headers, body }) => Response | Promise<Response>} respond
 */
const mockLineApi = (respond = () => json(200, {})) => {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    // คำขอไปยัง server ทดสอบในเครื่องใช้ fetch จริง
    if (String(url).startsWith("http://127.0.0.1")) return original(url, init);
    const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    const req = { url: String(url), method: init.method || "GET", headers, body };
    requests.push(req);
    return respond(req);
  };
  return {
    requests,
    restore: () => {
      globalThis.fetch = original;
    },
  };
};

module.exports = { mockLineApi, json };
