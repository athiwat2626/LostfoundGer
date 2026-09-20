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
    req.admin = { admin_id: payload.admin_id, email: payload.email };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};

module.exports = adminAuth;
