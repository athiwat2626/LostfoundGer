// CSV-xx : certificateService.js (สร้าง PDF + ส่งอีเมลเกียรติบัตร)
const { backendPath } = require("./helpers");

const mockSendMail = jest.fn();
// certificateService อ่านชื่อผู้ลงนามจากค่าระบบ → mock db ไม่ให้ต่อฐานข้อมูลจริง (ได้ค่าเริ่มต้น)
jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn(async () => ({ rows: [] })), connect: jest.fn() }));
jest.mock("nodemailer", () => ({ createTransport: jest.fn(() => ({ sendMail: mockSendMail })) }));

// certificateService อ่าน env ตอนโหลดโมดูล จึงโหลดใหม่แยกในแต่ละเทส
const loadService = () => {
  let service;
  jest.isolateModules(() => {
    service = require(backendPath("certificateService.js"));
  });
  return service;
};

describe("certificateService", () => {
  beforeEach(() => mockSendMail.mockReset().mockResolvedValue({}));

  test("CSV-01 generateCertificatePDF คืน Buffer ที่เป็นไฟล์ PDF", async () => {
    const { generateCertificatePDF } = loadService();
    const pdf = await generateCertificatePDF({ name: "Somchai Jaidee", returnCount: 3, date: new Date("2026-09-01") });
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
  });

  test("CSV-02 sendCertificateEmail แนบ PDF และส่งถึงอีเมลผู้ใช้", async () => {
    const { sendCertificateEmail } = loadService();
    const pdf = Buffer.from("%PDF-test");
    await sendCertificateEmail({ name: "Somchai", email: "s@ku.th", returnCount: 3 }, pdf);

    const mail = mockSendMail.mock.calls[0][0];
    expect(mail.to).toBe("s@ku.th");
    expect(mail.subject).toContain("3 ครั้ง");
    expect(mail.attachments[0]).toMatchObject({ content: pdf, contentType: "application/pdf" });
  });

  test("CSV-03 ไม่ได้ตั้งค่า MAIL_USER/MAIL_APP_PASSWORD → throw", async () => {
    const saved = process.env.MAIL_USER;
    delete process.env.MAIL_USER;
    const { sendCertificateEmail } = loadService();
    process.env.MAIL_USER = saved;

    await expect(sendCertificateEmail({ name: "a", email: "a@ku.th", returnCount: 3 }, Buffer.from(""))).rejects.toThrow(
      "Email service is not configured"
    );
  });

  test("CSV-04 issueCertificate สร้าง PDF แล้วส่งอีเมลในขั้นตอนเดียว", async () => {
    const { issueCertificate } = loadService();
    await issueCertificate({ name: "Somchai", email: "s@ku.th", returnCount: 6 });
    const attachment = mockSendMail.mock.calls[0][0].attachments[0].content;
    expect(attachment.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
