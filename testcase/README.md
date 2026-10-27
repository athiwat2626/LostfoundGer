# testcase — ชุดทดสอบระบบ FOUND&LOST

| ไฟล์/โฟลเดอร์ | เนื้อหา |
|---|---|
| [TEST_PLAN.md](TEST_PLAN.md) | แผนการทดสอบ: วัตถุประสงค์ ขอบเขต วิธีทดสอบ สภาพแวดล้อม เกณฑ์ ความเสี่ยง |
| [TEST_CASES.md](TEST_CASES.md) | กรณีทดสอบทั้งหมด (อัตโนมัติ + ทดสอบด้วยมือ) พร้อมผล ข้อบกพร่อง และเทสที่ปรับปรุง |
| [USER_MANUAL.md](USER_MANUAL.md) | คู่มือการใช้งาน (ผู้ใช้, LINE Bot, แอดมิน, ผู้พัฒนา) |
| [FOUNDLOST_TestCases.xlsx](FOUNDLOST_TestCases.xlsx) | กรณีทดสอบและผลแบบ Excel (มีชีต Manual E2E สำหรับกรอกผลทดสอบด้วยมือ) |
| [FOUNDLOST_Test_Report.docx](FOUNDLOST_Test_Report.docx) | รายงานสรุปการทดสอบ (Word) |
| [FOUNDLOST_User_Manual.docx](FOUNDLOST_User_Manual.docx) | คู่มือการใช้งาน (Word) |
| [results/](results/) | ผลการรันดิบ: Jest/Vitest (JSON) และ node:test (TAP) |
| [backend/](backend/) | เทส API และ unit test ของ backend — Jest + Supertest |
| [frontend/](frontend/) | เทสหน้าเว็บและคอมโพเนนต์ React — Vitest + React Testing Library |

เทสทั้งหมดอยู่นอกโฟลเดอร์ `FOUNDLOST` และไม่แก้ไขโค้ดของระบบ
เทส backend จำลองฐานข้อมูล อีเมล และ LINE จึง **ไม่ต้องเปิด PostgreSQL**

## ติดตั้ง (ครั้งแรก)

ต้องติดตั้ง dependency ของ `FOUNDLOST/backend` และ `FOUNDLOST/frontend` ก่อน เพราะเทสใช้ไลบรารีชุดเดียวกับระบบจริง

```powershell
npm --prefix FOUNDLOST/backend install
npm --prefix FOUNDLOST/frontend install
npm --prefix testcase/backend install
npm --prefix testcase/frontend install
```

## รันเทส

```powershell
# Backend
npm --prefix testcase/backend test
npm --prefix testcase/backend run coverage    # พร้อมรายงาน coverage (testcase/backend/coverage/index.html)

# Frontend
npm --prefix testcase/frontend test
npm --prefix testcase/frontend run coverage

# LINE Bot / จับคู่ / หน้าจัดการรายการของแอดมิน (node:test อยู่ใน FOUNDLOST/backend/test)
npm --prefix FOUNDLOST/backend test
```

ผลที่ควรได้ (รันเมื่อ 27 ต.ค. 2569 บน commit `88da0f6` + งานที่ยังไม่ commit):

- Backend (Jest): `316 passed` (15 ไฟล์)
- Backend (node:test): `71 passed` + เทส SQL จริง 6 กรณีเมื่อตั้ง `TEST_DATABASE_URL` (รวม 77)
- Frontend (Vitest): `190 passed` (13 ไฟล์)

## โครงสร้างไฟล์เทส

```
backend/tests/
  helpers.js                     โหลด server.js โดยไม่เปิดพอร์ต + จำลอง db.query / transaction (db.connect) + token ผู้ใช้/แอดมิน
  setupEnv.js                    ค่า environment สำหรับเทส
  unit.*.test.js                 validation, middleware, LINE, เกียรติบัตร, models
  api.*.test.js                  ทุก endpoint (สาธารณะ, ของหาย/พบของ, รายงาน, เกียรติบัตร, แอดมิน)
frontend/tests/
  setup.js, utils.jsx            ตั้งค่า jsdom, ตัวช่วย render พร้อม router, JWT ปลอม (loginAsUser)
  axiosMock.js                   axios จำลองที่รองรับ axios.create() (userApi) + mockRoutes ตาม URL
  *.test.jsx / *.test.js         หน้า Login/SignUp/Admin, ฟอร์ม, หน้ารายการ, หน้ารายงาน, แอดมิน, คอมโพเนนต์
```

รหัสเทสในโค้ด (เช่น `REG-01`, `FE-LG-04`) ตรงกับรหัสใน [TEST_CASES.md](TEST_CASES.md)

## หมายเหตุ

- `testcase/.gitignore` ยกเว้น `package.json` ให้ commit ได้ เพราะ `.gitignore` ที่ root ของ repo ละเว้น `package.json` ทุกระดับ
- `testcase/frontend/.npmrc` ตั้ง `legacy-peer-deps=true` เพื่อไม่ให้ npm ติดตั้ง React ชุดที่สอง
  (เทสใช้ React จาก `FOUNDLOST/frontend/node_modules` ตัวเดียวกับแอป)
- เทสที่อัปโหลดรูปจะสร้างไฟล์ใน `FOUNDLOST/backend/assets/...` ชั่วคราวและลบทิ้งเมื่อจบเทส
