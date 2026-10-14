# testcase — ชุดทดสอบระบบ FOUND&LOST

| ไฟล์/โฟลเดอร์ | เนื้อหา |
|---|---|
| [TEST_CASES.md](TEST_CASES.md) | เอกสารกรณีทดสอบทั้งหมด (อัตโนมัติ + ทดสอบด้วยมือ) ผลการทดสอบ และบั๊กที่พบ |
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
```

ผลที่ควรได้ (ณ commit `18b65f8`):

- Backend: `208 passed`
- Frontend: `123 passed`

## โครงสร้างไฟล์เทส

```
backend/tests/
  helpers.js                     โหลด server.js โดยไม่เปิดพอร์ต + ตัวช่วยจำลอง db.query
  setupEnv.js                    ค่า environment สำหรับเทส
  unit.*.test.js                 validation, middleware, LINE, เกียรติบัตร, models
  api.*.test.js                  ทุก endpoint (สาธารณะ, ของหาย/พบของ, รายงาน, เกียรติบัตร, แอดมิน)
frontend/tests/
  setup.js, utils.jsx            ตั้งค่า jsdom และตัวช่วย render พร้อม router
  *.test.jsx / *.test.js         หน้า Login/SignUp/Admin, ฟอร์ม, หน้ารายการ, หน้ารายงาน, แอดมิน, คอมโพเนนต์
```

รหัสเทสในโค้ด (เช่น `REG-01`, `FE-LG-04`) ตรงกับรหัสใน [TEST_CASES.md](TEST_CASES.md)

## หมายเหตุ

- `testcase/.gitignore` ยกเว้น `package.json` ให้ commit ได้ เพราะ `.gitignore` ที่ root ของ repo ละเว้น `package.json` ทุกระดับ
- `testcase/frontend/.npmrc` ตั้ง `legacy-peer-deps=true` เพื่อไม่ให้ npm ติดตั้ง React ชุดที่สอง
  (เทสใช้ React จาก `FOUNDLOST/frontend/node_modules` ตัวเดียวกับแอป)
- เทสที่อัปโหลดรูปจะสร้างไฟล์ใน `FOUNDLOST/backend/assets/...` ชั่วคราวและลบทิ้งเมื่อจบเทส
