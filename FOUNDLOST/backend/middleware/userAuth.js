const jwt = require("jsonwebtoken");

// ตรวจสอบ Bearer token ของผู้ใช้ (ออกให้ตอนยืนยัน OTP) และแนบ req.user เมื่อถูกต้อง
const userAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบใหม่" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "user" || !payload.student_id) {
      return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบใหม่" });
    }
    req.user = { student_id: payload.student_id, email: payload.email };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบใหม่" });
  }
};

// สำหรับการแจ้งของ: รับได้ทั้ง token ผู้ใช้ และ token แอดมิน (แอดมินเพิ่มรายการแทนผู้อื่นได้)
// แนบ req.auth = { role: "user", student_id } หรือ { role: "admin", admin_id }
const userOrAdminAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบใหม่" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role === "user" && payload.student_id) {
      req.auth = { role: "user", student_id: payload.student_id };
    } else if (payload.admin_id) {
      req.auth = { role: "admin", admin_id: payload.admin_id };
    } else {
      return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบใหม่" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบใหม่" });
  }
};

// ออก token ให้ผู้ใช้หลังยืนยัน OTP สำเร็จ
const signUserToken = (user) =>
  jwt.sign({ role: "user", student_id: user.student_id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.USER_JWT_TTL || "7d",
  });

module.exports = { userAuth, userOrAdminAuth, signUserToken };
