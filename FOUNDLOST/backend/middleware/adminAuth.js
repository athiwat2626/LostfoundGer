const jwt = require("jsonwebtoken");

// ตรวจสอบ Bearer token ของแอดมิน และแนบ req.admin เมื่อถูกต้อง
const adminAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // token ของผู้ใช้ทั่วไปเซ็นด้วย secret เดียวกัน จึงต้องตรวจว่าเป็น token แอดมินจริง
    if (!payload.admin_id || payload.role === "user") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    req.admin = { admin_id: payload.admin_id, email: payload.email };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};

module.exports = adminAuth;
