const path = require("path");
const jwt = require("jsonwebtoken");

const BACKEND_DIR = path.resolve(__dirname, "../../../FOUNDLOST/backend");
const backendPath = (...parts) => path.join(BACKEND_DIR, ...parts);

/**
 * โหลด server.js โดยไม่เปิดพอร์ตจริง: ดัก app.listen() แล้วคืน express app ออกมาให้ supertest ใช้
 * (server.js ไม่ได้ export app และเรียก startServer() ทันทีตอน require)
 */
async function loadApp() {
  const express = require("express");
  let app = null;
  const spy = jest.spyOn(express.application, "listen").mockImplementation(function listen() {
    app = this;
    return { close: () => {} };
  });

  require(backendPath("server.js"));

  for (let i = 0; i < 200 && !app; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  spy.mockRestore();

  if (!app) throw new Error("server.js did not call app.listen() — startServer() failed");
  return app;
}

/**
 * ตั้งผลลัพธ์ของ db.query ตามข้อความ SQL แทนการพึ่งลำดับการเรียก
 * rules: [[/regex/, result | (sql, params) => result], ...]  ไม่ตรงกฎไหน → { rows: [], rowCount: 0 }
 * result ที่เป็น Error จะถูก reject
 */
function routeQueries(queryMock, rules = []) {
  queryMock.mockImplementation(async (sql, params) => {
    const text = String(sql).replace(/\s+/g, " ");
    for (const [pattern, result] of rules) {
      if (pattern.test(text)) {
        const value = typeof result === "function" ? result(text, params) : result;
        if (value instanceof Error) throw value;
        return { rowCount: value.rows ? value.rows.length : 0, ...value };
      }
    }
    return { rows: [], rowCount: 0 };
  });
}

/**
 * ให้ db.connect() คืน client ของ transaction ที่ส่งคำสั่ง SQL ต่อไปยัง db.query
 * (handler ที่บันทึก audit log ใช้ BEGIN … COMMIT ผ่าน client) — ใช้ routeQueries กับ db.query ได้เหมือนเดิม
 */
function useTransactionClient(db) {
  const client = { query: (...args) => db.query(...args), release: jest.fn() };
  db.connect.mockResolvedValue(client);
  return client;
}

/** หาการเรียก db.query ที่ SQL ตรงกับ pattern */
function findQuery(queryMock, pattern) {
  return queryMock.mock.calls.find(([sql]) => pattern.test(String(sql).replace(/\s+/g, " ")));
}

const adminToken = (payload = { admin_id: 1, email: "admin@test.local" }, options = { expiresIn: "1h" }) =>
  jwt.sign(payload, process.env.JWT_SECRET, options);

// token ผู้ใช้แบบเดียวกับที่ /api/verify-otp ออกให้ (signUserToken)
const userToken = (payload = {}, options = { expiresIn: "1h" }) =>
  jwt.sign({ role: "user", student_id: "6410500001", email: "somchai@ku.th", ...payload }, process.env.JWT_SECRET, options);

const pgError = (code, message = "db error") => Object.assign(new Error(message), { code });

module.exports = { BACKEND_DIR, backendPath, loadApp, routeQueries, useTransactionClient, findQuery, adminToken, userToken, pgError };
