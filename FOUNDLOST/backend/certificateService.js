// certificateService.js
// สร้าง PDF เกียรติบัตร + ส่งอีเมลแนบไฟล์
// ติดตั้งก่อนใช้งาน: npm install pdfkit

const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const { PassThrough } = require('stream');

// ใช้ env variable ชุดเดียวกับที่ server.js ใช้อยู่แล้ว (MAIL_USER, MAIL_APP_PASSWORD)
// ไม่ต้องสร้างตัวแปรใหม่ใน .env เพิ่ม
const mailUser = process.env.MAIL_USER;
const mailPassword = process.env.MAIL_APP_PASSWORD;
const transporter = mailUser && mailPassword
  ? nodemailer.createTransport({
    service: 'gmail',
    auth: { user: mailUser, pass: mailPassword },
  })
  : null;

/**
 * สร้างไฟล์ PDF เกียรติบัตร คืนค่าเป็น Buffer
 * @param {{ name: string, returnCount: number, date?: Date }} user
 */
function generateCertificatePDF(user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 50 });
    const stream = new PassThrough();
    const chunks = [];

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);

    doc.pipe(stream);

    const issueDate = (user.date || new Date()).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    doc.lineWidth(3).strokeColor('#C9A24B')
      .rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();

    doc.fontSize(28).fillColor('#333333').text('เกียรติบัตร', { align: 'center' }).moveDown(0.3);
    doc.fontSize(14).fillColor('#666666').text('Certificate of Appreciation', { align: 'center' }).moveDown(2);
    doc.fontSize(16).fillColor('#333333').text('มอบให้เพื่อแสดงว่า', { align: 'center' }).moveDown(0.5);
    doc.fontSize(24).fillColor('#000000').text(user.name, { align: 'center', underline: true }).moveDown(1);
    doc.fontSize(14).fillColor('#333333')
      .text(`ได้ทำการส่งคืนของหายให้เจ้าของสำเร็จครบ ${user.returnCount} ครั้ง`, { align: 'center' })
      .moveDown(0.5)
      .text('แสดงถึงความมีน้ำใจและความซื่อสัตย์ต่อสังคม', { align: 'center' })
      .moveDown(2);
    doc.fontSize(12).fillColor('#666666').text(`ออกให้ ณ วันที่ ${issueDate}`, { align: 'center' });

    doc.end();
  });
}

/**
 * ส่งอีเมลพร้อมแนบไฟล์ PDF เกียรติบัตร
 * @param {{ name: string, email: string, returnCount: number }} user
 * @param {Buffer} pdfBuffer
 */
async function sendCertificateEmail(user, pdfBuffer) {
  if (!transporter) {
    throw new Error('Email service is not configured (MAIL_USER / MAIL_APP_PASSWORD missing)');
  }

  await transporter.sendMail({
    from: mailUser,
    to: user.email,
    subject: `🎉 ขอแสดงความยินดี! คุณได้รับเกียรติบัตรจากการส่งคืนของหายครบ ${user.returnCount} ครั้ง`,
    html: `
      <h2>FOUND&LOST</h2>
      <p>เรียนคุณ ${user.name}</p>
      <p>ขอบคุณที่ช่วยส่งคืนของหายให้เจ้าของสำเร็จครบ ${user.returnCount} ครั้ง
      ทางระบบขอมอบเกียรติบัตรฉบับนี้เพื่อเป็นการขอบคุณในความมีน้ำใจของคุณ</p>
      <p>ไฟล์เกียรติบัตรแนบมาพร้อมอีเมลนี้ครับ</p>
    `,
    attachments: [
      {
        filename: `certificate-${user.name}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

/** สร้าง PDF แล้วส่งอีเมลในขั้นตอนเดียว */
async function issueCertificate(user) {
  const pdfBuffer = await generateCertificatePDF(user);
  await sendCertificateEmail(user, pdfBuffer);
}

module.exports = { generateCertificatePDF, sendCertificateEmail, issueCertificate };
