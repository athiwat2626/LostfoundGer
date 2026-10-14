// CRT-xx : ยืนยันการส่งคืนของ + ออกเกียรติบัตร POST /api/returns/confirm-success
const request = require("supertest");
const { backendPath, loadApp, routeQueries } = require("./helpers");

jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/services/lineNotification", () => ({ sendLineNotification: jest.fn() }));
jest.mock("../../../FOUNDLOST/backend/certificateService", () => ({ issueCertificate: jest.fn() }));

const db = require(backendPath("db.js"));
const { issueCertificate } = require(backendPath("certificateService.js"));

let app;
beforeAll(async () => {
  db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  app = await loadApp();
});

beforeEach(() => {
  db.query.mockReset();
  routeQueries(db.query);
  issueCertificate.mockReset().mockResolvedValue();
});

const returnsAfterUpdate = (count) =>
  routeQueries(db.query, [
    [/UPDATE users SET successful_returns/, (_sql, [email]) => ({
      rows: [{ student_id: "1", first_name: "Somchai", last_name: "Jaidee", email, successful_returns: count }],
    })],
  ]);

describe("CRT POST /api/returns/confirm-success", () => {
  test("CRT-01 อีเมลผิดรูปแบบ → 400", async () => {
    const res = await request(app).post("/api/returns/confirm-success").send({ email: "bad" });
    expect(res.status).toBe(400);
  });

  test("CRT-02 ไม่พบผู้ใช้ → 404", async () => {
    const res = await request(app).post("/api/returns/confirm-success").send({ email: "nobody@ku.th" });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("ไม่พบผู้ใช้จากอีเมลนี้");
  });

  test("CRT-03 คืนของครั้งที่ 1 → บันทึกแต่ยังไม่ออกเกียรติบัตร", async () => {
    returnsAfterUpdate(1);
    const res = await request(app).post("/api/returns/confirm-success").send({ email: "Somchai@KU.th" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, successfulReturns: 1, certificateIssued: false });
    expect(issueCertificate).not.toHaveBeenCalled();
  });

  test.each([3, 6, 9])("CRT-04 คืนของครบ %i ครั้ง (ทวีคูณของ 3) → ออกเกียรติบัตร", async (count) => {
    returnsAfterUpdate(count);
    const res = await request(app).post("/api/returns/confirm-success").send({ email: "somchai@ku.th" });
    expect(res.body.certificateIssued).toBe(true);
    expect(issueCertificate).toHaveBeenCalledWith({ name: "Somchai Jaidee", email: "somchai@ku.th", returnCount: count });
  });

  test("CRT-05 ส่งเกียรติบัตรล้มเหลว ไม่กระทบ response → ยัง 200", async () => {
    returnsAfterUpdate(3);
    issueCertificate.mockRejectedValue(new Error("smtp down"));
    const res = await request(app).post("/api/returns/confirm-success").send({ email: "somchai@ku.th" });
    expect(res.status).toBe(200);
    expect(res.body.certificateIssued).toBe(true);
  });

  test("CRT-06 ฐานข้อมูลผิดพลาด → 500", async () => {
    routeQueries(db.query, [[/UPDATE users/, new Error("down")]]);
    const res = await request(app).post("/api/returns/confirm-success").send({ email: "somchai@ku.th" });
    expect(res.status).toBe(500);
  });
});
