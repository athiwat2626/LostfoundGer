const jwt = require("jsonwebtoken");
const { getSettingSafe } = require("../services/settings");

// เส้นทางที่ยังใช้ได้ตอนปิดปรับปรุง: หน้าแอดมิน, ค่าสาธารณะ (ให้หน้าเว็บรู้ว่าปิดอยู่), LINE webhook, ไฟล์รูป, เอกสาร API
const ALWAYS_OPEN = ["/admin", "/api/settings/public", "/api/line/webhook", "/assets", "/api-docs"];

const isAdminRequest = (req) => {
  const [scheme, token] = String(req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return false;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return Boolean(payload.admin_id) && payload.role !== "user";
  } catch {
    return false;
  }
};

// โหมดปิดปรับปรุง: ปฏิเสธคำขอของผู้ใช้ทั่วไปด้วย 503 (แอดมินยังทำงานได้ตามปกติ)
const maintenanceGuard = async (req, res, next) => {
  if (req.path === "/" || ALWAYS_OPEN.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) {
    return next();
  }
  const maintenance = await getSettingSafe("maintenance");
  if (!maintenance?.enabled || isAdminRequest(req)) return next();
  res.set("Retry-After", "600");
  return res.status(503).json({
    success: false,
    maintenance: true,
    message: maintenance.message || "ระบบปิดปรับปรุงชั่วคราว กรุณากลับมาใหม่ภายหลัง",
  });
};

module.exports = maintenanceGuard;
