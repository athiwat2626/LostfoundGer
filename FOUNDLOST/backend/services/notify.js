// การแจ้งเตือนผู้ใช้: บันทึกลงกล่องแจ้งเตือน (กระดิ่ง) และส่งอีเมลเมื่อระบุ
const nodemailer = require("nodemailer");
const db = require("../db");

const mailUser = process.env.MAIL_USER;
const mailPassword = process.env.MAIL_APP_PASSWORD;
const transporter =
  mailUser && mailPassword
    ? nodemailer.createTransport({ service: "gmail", auth: { user: mailUser, pass: mailPassword } })
    : null;

const APP_URL = process.env.APP_URL || "http://localhost:5173";

const escapeHtml = (value) =>
  String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const sendEmail = async (studentId, title, body, link) => {
  if (!transporter) return;
  const result = await db.query("SELECT email, contact_email, first_name FROM users WHERE student_id = $1", [studentId]);
  const user = result.rows[0];
  if (!user) return;

  await transporter.sendMail({
    from: { name: 'FOUND&LOST มหาวิทยาลัยเกษตรศาสตร์', address: mailUser },
    to: user.contact_email || user.email,
    subject: `FOUND&LOST: ${title}`,
    html: `
      <h2>FOUND&amp;LOST</h2>
      <p>สวัสดีคุณ ${escapeHtml(user.first_name)}</p>
      <p><strong>${escapeHtml(title)}</strong></p>
      ${body ? `<p>${escapeHtml(body)}</p>` : ""}
      ${link ? `<p><a href="${APP_URL}${link}">เปิดดูในระบบ</a></p>` : ""}
    `,
  });
};

/**
 * สร้างการแจ้งเตือนให้ผู้ใช้ (ไม่ throw — การแจ้งเตือนล้มเหลวต้องไม่ทำให้งานหลักพัง)
 * @param {string} studentId ผู้รับ
 * @param {{ type: string, title: string, body?: string, link?: string }} notification
 * @param {{ email?: boolean }} options ส่งอีเมลด้วยหรือไม่
 */
const notify = async (studentId, { type, title, body = null, link = null }, { email = false } = {}) => {
  if (!studentId) return;
  try {
    await db.query(
      "INSERT INTO notifications (student_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)",
      [studentId, type, title.slice(0, 200), body, link]
    );
    if (email) {
      sendEmail(studentId, title, body, link).catch((error) =>
        console.error("Notification email failed:", error.message)
      );
    }
  } catch (error) {
    console.error("Error creating notification:", error.message);
  }
};

module.exports = { notify };
