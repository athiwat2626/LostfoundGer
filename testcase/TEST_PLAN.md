# แผนการทดสอบ (Test Plan) — ระบบ KU Lost & Found (FOUND&LOST)

> ฉบับวันที่ 27 ตุลาคม 2569 · โค้ด 88da0f6 (branch feature/line-bot-mobile-ui) + งานที่ยังไม่ commit

## 1. วัตถุประสงค์

- ยืนยันว่าฟังก์ชันหลักของระบบ KU Lost & Found (FOUND&LOST) ทำงานถูกต้องตามที่ออกแบบ ทั้งฝั่งผู้ใช้ ฝั่งแอดมิน และ LINE Bot
- ยืนยันว่าการตรวจสิทธิ์ (token ผู้ใช้ / token แอดมิน) ทำที่ฝั่งเซิร์ฟเวอร์ทุกเส้นทางที่ต้องป้องกัน
- ตรวจว่าข้อมูลที่ผิดรูปแบบถูกปฏิเสธก่อนถึงฐานข้อมูล และระบบตอบข้อผิดพลาดที่เข้าใจได้
- ตรวจว่าการกระทำของแอดมินถูกบันทึกในประวัติการดำเนินการ (audit log) แบบแก้ไข/ลบไม่ได้
- จัดชุดเทสอัตโนมัติให้ตรงกับพฤติกรรมปัจจุบันของระบบ เพื่อใช้ตรวจซ้ำ (regression) ได้ทุกครั้งที่แก้โค้ด

## 2. ขอบเขตการทดสอบ

### 2.1 สิ่งที่ทดสอบ

| ฟีเจอร์ | รหัสกรณีทดสอบ |
|---|---|
| สมัครสมาชิกและเข้าสู่ระบบด้วย OTP ทางอีเมล | REG, OTP, VOTP, FE-LG, FE-SU, FE-RT |
| สมัคร/เข้าสู่ระบบด้วย Google แบบ 2 ขั้น (ยืนยัน Google + OTP ทางอีเมล) | GGL, GSV, FE-GG |
| แจ้งของหาย / แจ้งพบของ (พร้อมรูป, ตรวจข้อมูล, ผู้แจ้งจาก token) | FND, LST, VAL, FE-FF |
| หน้าหลัก ค้นหา กรอง แบ่งหน้า และรายละเอียดรายการ | FE-HM, FE-IP |
| ติดต่อเจ้าของโพสต์ (claim) และโพสต์ของฉัน (แก้ไข/ลบ) | CLM, MYI, FE-HM-16 |
| โปรไฟล์ผู้ใช้ และกล่องแจ้งเตือน | ME, INB, FE-NT |
| รายงานโพสต์ไม่เหมาะสม | RPT, FE-RP |
| ยืนยันการคืนของและออกเกียรติบัตร PDF | CRT, CSV |
| จับคู่ของหาย-ของพบอัตโนมัติ และแจ้งเตือนทาง LINE | node:test lineMatchNotification |
| LINE Bot: webhook (ตรวจลายเซ็น), เชื่อมบัญชี, Rich Menu | node:test lineWebhook, lineAccountLinking, lineRichMenu, lineRepository.pg |
| แอดมิน: เข้าสู่ระบบ, แดชบอร์ด, รายงาน, ผู้ใช้, รายการของหาย/ของพบ | AAU, ADM, FE-AL, FE-AD, node:test adminItems |
| แอดมิน: ค่าระบบ, ประกาศ, โหมดปิดปรับปรุง, ประวัติการดำเนินการ | SET, MNT, AUD, FE-SS |
| คอมโพเนนต์ร่วม: แถบเมนูล่าง (มือถือ), ป้ายสถานะ, ประกาศ, ธีม/ขนาดตัวอักษร | FE-CP, FE-LO |

### 2.2 สิ่งที่ไม่อยู่ในขอบเขต

- การทดสอบโหลด/ประสิทธิภาพ (load / stress test)
- การทดสอบเจาะระบบ (penetration test) โดยผู้เชี่ยวชาญภายนอก
- การส่งอีเมลจริงและการส่งข้อความ LINE จริงในเทสอัตโนมัติ (ใช้ตัวจำลองแทน — ทดสอบของจริงในกรณีทดสอบด้วยมือ)
- ความถูกต้องของแผนที่ Leaflet และไทล์แผนที่จากผู้ให้บริการภายนอก

## 3. ระดับและวิธีการทดสอบ

| ระดับ | สิ่งที่ทดสอบ | เครื่องมือ |
|---|---|---|
| Unit test | ฟังก์ชันย่อยที่ไม่พึ่งระบบอื่น เช่น validation, middleware, การให้คะแนนจับคู่, ลายเซ็น LINE, สร้าง PDF เกียรติบัตร | Jest, node:test |
| API / Integration test | เรียก endpoint จริงของ Express ผ่าน Supertest โดยจำลองฐานข้อมูล (db.query / transaction client) อีเมล และ LINE | Jest + Supertest |
| Database integration | รัน SQL migration และ repository ของ LINE กับ PostgreSQL 16 จริงใน schema ชั่วคราว | node:test + Docker |
| Component / UI test | render หน้าเว็บและคอมโพเนนต์ React ใน jsdom จำลอง API ด้วย axios mock แล้วตรวจสิ่งที่ผู้ใช้เห็นและคำขอที่ส่งออก | Vitest + React Testing Library |
| Static check / Build | ตรวจโค้ดด้วย oxlint และ build production ของหน้าเว็บ | oxlint, Vite |
| Manual / End-to-End | ทดสอบบนเบราว์เซอร์และมือถือจริง กับอีเมลจริงและ LINE Official Account จริง | Chrome, มือถือ, LINE |

## 4. สภาพแวดล้อมการทดสอบ

| รายการ | รายละเอียด |
|---|---|
| ระบบปฏิบัติการ | Windows 11 Home 10.0.26200 |
| Node.js | v26.8.1 |
| Backend | Express 5.2.1, PostgreSQL (pg Pool), JWT, Nodemailer, LINE Messaging API |
| Frontend | React 19.2.8, Vite 8.2.2, Tailwind CSS v4 |
| ฐานข้อมูลสำหรับเทส SQL จริง | PostgreSQL 16 (Docker container ชั่วคราว พอร์ต 55432 ลบทิ้งหลังรัน) |
| เครื่องมือทดสอบ Backend | Jest 29.7.0 + Supertest, node:test (มากับ Node.js) |
| เครื่องมือทดสอบ Frontend | Vitest 5.0.1 + React Testing Library + jsdom |
| ตรวจคุณภาพโค้ด | oxlint (npm run lint), vite build |

## 5. กติกาการทดสอบ

- ห้ามเทสแก้ไขข้อมูลในฐานข้อมูลจริง: เทส API จำลอง db ทั้งหมด ส่วนเทส SQL จริงใช้ container แยกที่ลบทิ้งหลังรัน
- ห้ามใส่รหัสลับ (token, App Password) ในไฟล์เทส: ใช้ค่าทดสอบใน setupEnv.js เท่านั้น
- ไฟล์รูปที่เทสอัปโหลดต้องถูกลบเมื่อจบเทส
- รหัสกรณีทดสอบในโค้ด (เช่น VOTP-06, FE-HM-03) ต้องตรงกับเอกสารและไฟล์ Excel

## 6. เกณฑ์เริ่มและสิ้นสุดการทดสอบ

**เกณฑ์เริ่ม (Entry criteria)**

- ติดตั้ง dependency ของ FOUNDLOST/backend, FOUNDLOST/frontend, testcase/backend, testcase/frontend ครบ
- โค้ด build ได้ (npm run build ผ่าน)
- สำหรับเทส SQL จริง: มี PostgreSQL สำหรับทดสอบ และตั้งค่า TEST_DATABASE_URL

**เกณฑ์สิ้นสุด (Exit criteria)**

- เทสอัตโนมัติทุกชุดผ่าน 100% (ไม่มีเทสที่ล้มเหลว)
- lint ไม่มี error
- ข้อบกพร่องระดับสูงได้รับการแก้ไข หรือบันทึกพร้อมเหตุผลที่ยอมรับได้
- กรณีทดสอบด้วยมือที่สำคัญ (ระดับความสำคัญ สูง) ได้รับการทดสอบก่อนนำขึ้นใช้งานจริง

## 7. ความเสี่ยงและแนวทางรับมือ

| ความเสี่ยง | แนวทางรับมือ |
|---|---|
| ตัวจำลองฐานข้อมูลไม่ตรงกับ SQL จริง | เพิ่มเทส SQL จริงกับ PostgreSQL (lineRepository.pg) และกรณีทดสอบด้วยมือกับฐานข้อมูลทดสอบ |
| เทสเก่าไม่ตรงกับพฤติกรรมใหม่ (เช่น ต้องมี token) | ทบทวนเทสทุกครั้งที่เปลี่ยนสิทธิ์ของ endpoint และรันชุดเทสก่อน commit |
| อีเมล OTP ส่งไม่ได้เพราะ App Password หมดอายุ | ทดสอบการส่งอีเมลจริงในกรณีทดสอบ M-04 และตรวจค่าใน .env ก่อนสาธิต |
| บริการภายนอก (LINE, Gmail) ล่มระหว่างสาธิต | ระบบหลักทำงานต่อได้ (แจ้งเตือนในเว็บยังมี) และมีคิวส่ง LINE ใหม่อัตโนมัติ |

## 8. ชุดทดสอบและคำสั่งรัน

| ชุดทดสอบ | ที่อยู่ | คำสั่ง |
|---|---|---|
| Backend API และ Unit test | testcase/backend/tests | npm --prefix testcase/backend test |
| Backend LINE Bot / จับคู่ / จัดการรายการ | FOUNDLOST/backend/test | npm --prefix FOUNDLOST/backend test |
| Frontend หน้าเว็บและคอมโพเนนต์ | testcase/frontend/tests | npm --prefix testcase/frontend test |

## 9. เอกสารที่ส่งมอบ

- [TEST_PLAN.md](TEST_PLAN.md) — แผนการทดสอบ (ไฟล์นี้)
- [TEST_CASES.md](TEST_CASES.md) — กรณีทดสอบทั้งหมดพร้อมผล
- [USER_MANUAL.md](USER_MANUAL.md) — คู่มือการใช้งาน
- [FOUNDLOST_TestCases.xlsx](FOUNDLOST_TestCases.xlsx) — กรณีทดสอบและผลในรูปแบบ Excel (มีชีตสำหรับบันทึกผลทดสอบด้วยมือ)
- [FOUNDLOST_Test_Report.docx](FOUNDLOST_Test_Report.docx) — รายงานสรุปการทดสอบ (Word)
- [FOUNDLOST_User_Manual.docx](FOUNDLOST_User_Manual.docx) — คู่มือการใช้งาน (Word)
- [results/](results/) — ผลการรันดิบ (JSON / TAP)
