// MW-xx : middleware/adminAuth.js
const jwt = require("jsonwebtoken");
const { backendPath, adminToken } = require("./helpers");
const adminAuth = require(backendPath("middleware/adminAuth.js"));

const run = (authorization) => {
  const req = { headers: authorization === undefined ? {} : { authorization } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  adminAuth(req, res, next);
  return { req, res, next };
};

describe("adminAuth middleware", () => {
  test("MW-01 token ถูกต้อง → แนบ req.admin และเรียก next()", () => {
    const { req, res, next } = run(`Bearer ${adminToken({ admin_id: 7, email: "a@ku.th" })}`);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.admin).toEqual({ admin_id: 7, email: "a@ku.th" });
  });

  test.each([
    ["MW-02 ไม่มี header", undefined],
    ["MW-03 scheme ไม่ใช่ Bearer", `Basic ${adminToken()}`],
    ["MW-04 Bearer แต่ไม่มี token", "Bearer "],
    ["MW-05 token ปลอม", "Bearer not-a-jwt"],
    ["MW-06 token เซ็นด้วย secret อื่น", `Bearer ${jwt.sign({ admin_id: 1 }, "other-secret")}`],
    ["MW-07 token หมดอายุ", `Bearer ${jwt.sign({ admin_id: 1, exp: Math.floor(Date.now() / 1000) - 10 }, "test-jwt-secret")}`],
  ])("%s → 401", (_name, header) => {
    const { res, next } = run(header);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Unauthorized" });
  });
});
