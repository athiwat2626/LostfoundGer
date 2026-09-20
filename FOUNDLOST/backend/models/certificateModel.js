// models/certificateModel.js
// ใช้ ./db module ตัวเดียวกับที่ server.js และ userModels.js เรียก db.query(...) อยู่แล้ว
// ไม่ต้องสร้าง connection pool ใหม่

const db = require('../db');

/**
 * ดึงข้อมูลผู้ใช้จาก email
 * @param {string} email
 */
async function getUserByEmail(email) {
  const { rows } = await db.query(
    `SELECT student_id, first_name, last_name, email, successful_returns
     FROM users
     WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

/**
 * เพิ่มยอดส่งคืนสำเร็จของผู้ใช้ +1 จาก email แล้วคืนค่า user ที่อัปเดตแล้ว
 * @param {string} email
 */
async function incrementSuccessfulReturnsByEmail(email) {
  const { rows } = await db.query(
    `UPDATE users
     SET successful_returns = successful_returns + 1
     WHERE email = $1
     RETURNING student_id, first_name, last_name, email, successful_returns`,
    [email]
  );

  if (rows.length === 0) {
    throw new Error(`ไม่พบผู้ใช้ email ${email}`);
  }

  return rows[0];
}

module.exports = { getUserByEmail, incrementSuccessfulReturnsByEmail };
