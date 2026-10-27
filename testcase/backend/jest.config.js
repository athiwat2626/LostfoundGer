const path = require("path");

const BACKEND_DIR = path.resolve(__dirname, "../../FOUNDLOST/backend");

module.exports = {
  // rootDir = โฟลเดอร์ ปัญหาพิเศษ เพื่อให้วัด coverage ของโค้ด backend จริงได้
  rootDir: path.resolve(__dirname, "../.."),
  roots: ["<rootDir>/testcase/backend/tests"],
  testEnvironment: "node",
  // ให้ test ใช้ dependency ชุดเดียวกับ backend (express, jsonwebtoken, bcryptjs, nodemailer ...)
  modulePaths: [path.join(BACKEND_DIR, "node_modules")],
  setupFiles: ["<rootDir>/testcase/backend/tests/setupEnv.js"],
  collectCoverageFrom: [
    "FOUNDLOST/backend/**/*.js",
    "!FOUNDLOST/backend/node_modules/**",
    "!FOUNDLOST/backend/swagger.js",
  ],
  // babel coverage ไม่ทำงานกับ path ภาษาไทย จึงใช้ v8
  coverageProvider: "v8",
  coverageDirectory: "<rootDir>/testcase/backend/coverage",
  coverageReporters: ["text", "html"],
};
