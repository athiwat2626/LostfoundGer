// MDL-xx : models/certificateModel.js, models/userModels.js
const { backendPath } = require("./helpers");

jest.mock("../../../FOUNDLOST/backend/db", () => ({ query: jest.fn() }));
const db = require(backendPath("db.js"));
const certificateModel = require(backendPath("models/certificateModel.js"));
const userModel = require(backendPath("models/userModels.js"));

const user = { student_id: "6400001", first_name: "A", last_name: "B", email: "a@ku.th", successful_returns: 2 };

describe("certificateModel", () => {
  beforeEach(() => db.query.mockReset());

  test("MDL-01 getUserByEmail พบผู้ใช้", async () => {
    db.query.mockResolvedValue({ rows: [user] });
    await expect(certificateModel.getUserByEmail("a@ku.th")).resolves.toEqual(user);
    expect(db.query.mock.calls[0][1]).toEqual(["a@ku.th"]);
  });

  test("MDL-02 getUserByEmail ไม่พบ → null", async () => {
    db.query.mockResolvedValue({ rows: [] });
    await expect(certificateModel.getUserByEmail("x@ku.th")).resolves.toBeNull();
  });

  test("MDL-03 incrementSuccessfulReturnsByEmail คืนค่าที่อัปเดตแล้ว", async () => {
    db.query.mockResolvedValue({ rows: [{ ...user, successful_returns: 3 }] });
    const updated = await certificateModel.incrementSuccessfulReturnsByEmail("a@ku.th");
    expect(updated.successful_returns).toBe(3);
    expect(db.query.mock.calls[0][0]).toMatch(/successful_returns = successful_returns \+ 1/);
  });

  test("MDL-04 incrementSuccessfulReturnsByEmail ไม่พบผู้ใช้ → throw", async () => {
    db.query.mockResolvedValue({ rows: [] });
    await expect(certificateModel.incrementSuccessfulReturnsByEmail("x@ku.th")).rejects.toThrow("ไม่พบผู้ใช้");
  });
});

describe("userModels", () => {
  beforeEach(() => db.query.mockReset());

  test("MDL-05 getUserData คืน rows ทั้งหมด", async () => {
    db.query.mockImplementation((_sql, cb) => cb(null, { rows: [user] }));
    await expect(userModel.getUserData()).resolves.toEqual([user]);
  });

  test("MDL-06 getUserData ฐานข้อมูลผิดพลาด → reject ด้วยข้อความ", async () => {
    db.query.mockImplementation((_sql, cb) => cb(new Error("connection refused")));
    await expect(userModel.getUserData()).rejects.toBe("connection refused");
  });
});
