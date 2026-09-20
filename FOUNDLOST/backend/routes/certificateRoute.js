// routes/certificateRoute.js
// mount ที่ server.js ด้วย: app.use("/api/returns", certificateRoute);

const express = require('express');
const router = express.Router();
const { issueCertificate } = require('../certificateService');
const { incrementSuccessfulReturnsByEmail } = require('../models/certificateModel');
const { validateEmail } = require('../validation');

const CERTIFICATE_MILESTONE = 3;

/**
 * POST /api/returns/confirm-success
 * Body: { "email": "somebody@example.com" }
 * เรียกเมื่อเจ้าของของหายยืนยันว่าได้รับของคืนจากผู้ใช้ที่มี email นี้เรียบร้อยแล้ว
 */
router.post('/confirm-success', async (req, res) => {
  try {
    const { email } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1) เพิ่มยอดส่งคืนสำเร็จของผู้ใช้คนนี้ +1
    const user = await incrementSuccessfulReturnsByEmail(normalizedEmail);

    // 2) ถ้ายอดสะสมครบ 3 (หรือทวีคูณของ 3) -> ออกเกียรติบัตร
    const reachedMilestone =
      user.successful_returns > 0 &&
      user.successful_returns % CERTIFICATE_MILESTONE === 0;

    if (reachedMilestone) {
      const fullName = `${user.first_name} ${user.last_name}`;

      // ทำแบบ async ไม่ block response หลัก
      issueCertificate({
        name: fullName,
        email: user.email,
        returnCount: user.successful_returns,
      }).catch((err) => {
        console.error(`ส่งเกียรติบัตรไม่สำเร็จสำหรับ email ${user.email}:`, err);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'บันทึกการส่งคืนของสำเร็จแล้ว',
      successfulReturns: user.successful_returns,
      certificateIssued: reachedMilestone,
    });
  } catch (err) {
    console.error(err);

    if (err.message && err.message.startsWith('ไม่พบผู้ใช้')) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้จากอีเมลนี้' });
    }

    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

module.exports = router;
