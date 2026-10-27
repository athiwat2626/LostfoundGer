// certificateService.js
// สร้าง PDF เกียรติบัตร + ส่งอีเมลแนบไฟล์
// ติดตั้งก่อนใช้งาน: npm install pdfkit

const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const { PassThrough } = require('stream');
const path = require('path');
const { getSettings } = require('./services/settings');

const db = require('./db');

// ฟอนต์ภาษาไทย (SIL Open Font License) — ฟอนต์มาตรฐานของ PDFKit ไม่มีอักษรไทย
// Sarabun = เนื้อความ, Taviraj = หัวเรื่อง "เกียรติบัตร", Charm = ชื่อผู้รับ (ลายมือ)
const FONT_REGULAR = path.join(__dirname, 'assets', 'fonts', 'Sarabun-Regular.ttf');
const FONT_BOLD = path.join(__dirname, 'assets', 'fonts', 'Sarabun-Bold.ttf');
const FONT_TITLE = path.join(__dirname, 'assets', 'fonts', 'Taviraj-Bold.ttf');
const FONT_NAME = path.join(__dirname, 'assets', 'fonts', 'Charm-Bold.ttf');
const KU_SEAL = path.join(__dirname, 'assets', 'certificate', 'ku-seal.png');

const COLOR = {
  paper: '#FBF8EF',
  teal: '#00665F',
  gold: '#B08D3C',
  goldLight: '#D6C59A',
  text: '#2B2B2B',
  muted: '#5F6B68',
  rule: '#9AA5A3',
};

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const toBuddhistYear = (date) => date.getFullYear() + 543;

// เลขที่เกียรติบัตรรันต่อเนื่องจาก sequence ในฐานข้อมูล — ถ้าดึงไม่ได้จะไม่แสดงเลขที่
async function nextCertificateNo() {
  try {
    await db.query('CREATE SEQUENCE IF NOT EXISTS certificate_no_seq');
    const { rows } = await db.query("SELECT nextval('certificate_no_seq') AS no");
    return Number(rows[0]?.no) || null;
  } catch {
    return null;
  }
}

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
 * @param {{ name: string, returnCount: number, date?: Date, certificateNo?: number,
 *   signerName?: string, signerTitle?: string, adminName?: string }} user
 */
function generateCertificatePDF(user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
    const stream = new PassThrough();
    const chunks = [];

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);

    doc.pipe(stream);
    doc.registerFont('Thai', FONT_REGULAR);
    doc.registerFont('Thai-Bold', FONT_BOLD);
    doc.registerFont('Title', FONT_TITLE);
    doc.registerFont('Script', FONT_NAME);

    const W = doc.page.width;
    const H = doc.page.height;
    const date = user.date || new Date();
    const year = toBuddhistYear(date);
    // วางข้อความกึ่งกลางหน้า โดย y คือขอบบนของบรรทัด
    const center = (text, y, font, size, color) => {
      doc.font(font).fontSize(size).fillColor(color).text(text, 0, y, { width: W, align: 'center', lineBreak: false });
    };

    // พื้นหลังและกรอบ: เส้นเขียวหนาด้านนอก + เส้นทองบางด้านใน
    doc.rect(0, 0, W, H).fill(COLOR.paper);
    doc.lineWidth(5).strokeColor(COLOR.teal).rect(23.5, 23.5, W - 47, H - 47).stroke();
    doc.lineWidth(0.8).strokeColor(COLOR.goldLight).rect(31, 31, W - 62, H - 62).stroke();

    if (user.certificateNo) {
      const no = `เลขที่ FL-${String(user.certificateNo).padStart(4, '0')}/${year}`;
      doc.font('Thai').fontSize(9.5).fillColor(COLOR.muted).text(no, 0, 42, { width: W - 46, align: 'right', lineBreak: false });
    }

    const sealSize = 76;
    doc.rect((W - sealSize) / 2, 58, sealSize, sealSize).fill('#FFFFFF');
    doc.image(KU_SEAL, (W - sealSize) / 2 + 3, 61, { width: sealSize - 6 });

    center('มหาวิทยาลัยเกษตรศาสตร์', 143, 'Thai-Bold', 14, COLOR.teal);
    center('ร่วมกับ โครงการ FOUND&LOST', 167, 'Thai', 10.5, COLOR.muted);
    center('เกียรติบัตร', 185, 'Title', 38, COLOR.teal);

    // เส้นคั่นสีทองมีข้าวหลามตัดตรงกลาง
    const mid = W / 2;
    const lineY = 260;
    doc.lineWidth(1).strokeColor(COLOR.gold)
      .moveTo(mid - 75, lineY).lineTo(mid - 15, lineY).stroke()
      .moveTo(mid + 15, lineY).lineTo(mid + 75, lineY).stroke();
    doc.polygon([mid, lineY - 4.5], [mid + 4.5, lineY], [mid, lineY + 4.5], [mid - 4.5, lineY]).fill(COLOR.gold);

    center('เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า', 278, 'Thai', 13, COLOR.text);

    // ชื่อผู้รับ — ย่อขนาดฟอนต์ถ้าชื่อยาวเกินเส้น
    const nameWidth = 440;
    let nameSize = 34;
    doc.font('Script');
    while (nameSize > 18 && doc.fontSize(nameSize).widthOfString(user.name) > nameWidth) nameSize -= 1;
    center(user.name, 334 - nameSize * 0.95, 'Script', nameSize, COLOR.text);
    doc.lineWidth(0.6).strokeColor(COLOR.goldLight).moveTo(193, 354).lineTo(W - 193, 354).stroke();

    center('ได้ส่งคืนทรัพย์สินที่พบให้แก่เจ้าของด้วยความซื่อสัตย์สุจริตและมีน้ำใจ', 368, 'Thai', 14, COLOR.text);
    center('นับเป็นผู้มีคุณธรรมและเป็นแบบอย่างที่ดีแก่ประชาคมมหาวิทยาลัยเกษตรศาสตร์', 393, 'Thai', 14, COLOR.text);
    center('ขอให้มีความสุขความเจริญตลอดไป', 420, 'Thai', 11.5, COLOR.muted);
    center(`ให้ไว้ ณ วันที่ ${date.getDate()} เดือน ${THAI_MONTHS[date.getMonth()]} พ.ศ. ${year}`, 444, 'Thai', 11.5, COLOR.muted);

    // ผู้ลงนาม 2 ฝั่ง (ชื่อ/ตำแหน่งตั้งค่าได้ในหน้าแอดมิน)
    const signature = (x, name, title) => {
      const width = 225;
      doc.lineWidth(1).strokeColor(COLOR.rule).moveTo(x, 503).lineTo(x + width, 503).stroke();
      if (name) doc.font('Thai-Bold').fontSize(11.5).fillColor(COLOR.text).text(`(${name})`, x, 508, { width, align: 'center', lineBreak: false });
      if (title) doc.font('Thai').fontSize(10).fillColor(COLOR.muted).text(title, x, 524, { width, align: 'center', lineBreak: false });
    };
    signature(86, user.signerName, user.signerTitle);
    signature(W - 86 - 225, user.adminName, 'ผู้ดูแลโครงการ FOUND&LOST');

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
    from: { name: 'FOUND&LOST มหาวิทยาลัยเกษตรศาสตร์', address: mailUser },
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
  const settings = await getSettings().catch(() => ({}));
  const pdfBuffer = await generateCertificatePDF({
    ...user,
    certificateNo: await nextCertificateNo(),
    signerName: settings.certificate_signer_name || '',
    signerTitle: settings.certificate_signer_title || '',
  });
  await sendCertificateEmail(user, pdfBuffer);
}

module.exports = { generateCertificatePDF, sendCertificateEmail, issueCertificate };
