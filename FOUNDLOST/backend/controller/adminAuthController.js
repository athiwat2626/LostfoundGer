const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { validateEmail } = require("../validation");

// ─── POST /admin/auth/login ────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!validateEmail(email) || typeof password !== "string" || !password) {
    return res.status(400).json({ success: false, message: "A valid email and password are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const result = await db.query(
      "SELECT admin_id, email, password_hash, display_name FROM admins WHERE email = $1",
      [normalizedEmail]
    );

    const admin = result.rows[0];
    const passwordMatches = admin ? await bcrypt.compare(password, admin.password_hash) : false;

    if (!admin || !passwordMatches) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { admin_id: admin.admin_id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_TTL || "8h" }
    );

    res.status(200).json({
      success: true,
      token,
      admin: { admin_id: admin.admin_id, email: admin.email, display_name: admin.display_name },
    });
  } catch (error) {
    console.error("Error logging in admin:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── GET /admin/auth/me ────────────────────────────────────────────────────
const me = async (req, res) => {
  try {
    const result = await db.query("SELECT admin_id, email, display_name FROM admins WHERE admin_id = $1", [
      req.admin.admin_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({ success: true, admin: result.rows[0] });
  } catch (error) {
    console.error("Error fetching current admin:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── PATCH /admin/auth/profile ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
  const { display_name } = req.body;

  if (typeof display_name !== "string" || !display_name.trim() || display_name.trim().length > 100) {
    return res.status(400).json({ success: false, message: "display_name is required (max 100 characters)" });
  }

  try {
    const result = await db.query(
      "UPDATE admins SET display_name = $1 WHERE admin_id = $2 RETURNING admin_id, email, display_name",
      [display_name.trim(), req.admin.admin_id]
    );

    res.status(200).json({ success: true, admin: result.rows[0] });
  } catch (error) {
    console.error("Error updating admin profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── POST /admin/auth/change-password ──────────────────────────────────────
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (
    typeof current_password !== "string" ||
    typeof new_password !== "string" ||
    new_password.length < 8
  ) {
    return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
  }

  try {
    const result = await db.query("SELECT password_hash FROM admins WHERE admin_id = $1", [
      req.admin.admin_id,
    ]);
    const admin = result.rows[0];

    if (!admin || !(await bcrypt.compare(current_password, admin.password_hash))) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await db.query("UPDATE admins SET password_hash = $1 WHERE admin_id = $2", [
      newHash,
      req.admin.admin_id,
    ]);

    res.status(200).json({ success: true, message: "Password updated" });
  } catch (error) {
    console.error("Error changing admin password:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { login, me, updateProfile, changePassword };
