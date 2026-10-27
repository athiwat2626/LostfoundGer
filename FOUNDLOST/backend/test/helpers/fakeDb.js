// แทนที่โมดูล db.js ด้วยของจำลอง (ต้อง require ไฟล์นี้ก่อนโมดูลที่ใช้ฐานข้อมูล)
// node --test รันแต่ละไฟล์ทดสอบใน process แยก จึงไม่กระทบไฟล์อื่น
const dbPath = require.resolve("../../db");

const fakeDb = {
  calls: [],
  // handler(sql, params) คืน { rows, rowCount } หรือ undefined (= ไม่มีแถว)
  handler: () => undefined,
  async query(sql, params = []) {
    fakeDb.calls.push({ sql, params });
    const result = await fakeDb.handler(sql, params);
    const rows = result?.rows || [];
    return { rows, rowCount: result?.rowCount ?? rows.length };
  },
  async connect() {
    return { query: fakeDb.query, release() {} };
  },
  reset() {
    fakeDb.calls = [];
    fakeDb.handler = () => undefined;
  },
};

require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };

module.exports = fakeDb;
