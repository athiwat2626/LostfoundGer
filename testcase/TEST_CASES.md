# กรณีทดสอบ (Test Cases) — ระบบ KU Lost & Found (FOUND&LOST)

> สร้างจากผลการรันจริงเมื่อ 27 ตุลาคม 2569 · โค้ด 88da0f6 (branch feature/line-bot-mobile-ui) + งานที่ยังไม่ commit
> ไฟล์ Excel ที่มีรายละเอียดเดียวกัน: [FOUNDLOST_TestCases.xlsx](FOUNDLOST_TestCases.xlsx) · แผนการทดสอบ: [TEST_PLAN.md](TEST_PLAN.md)

## สรุปผล

| ชุดทดสอบ | เครื่องมือ | ไฟล์ | จำนวนเทส | ผ่าน | ไม่ผ่าน | อัตราผ่าน |
|---|---|---|---|---|---|---|
| Backend API และ Unit test | Jest + Supertest | 15 | 316 | 316 | 0 | 100.0% |
| Backend LINE Bot / จับคู่ / จัดการรายการ | node:test (+ PostgreSQL 16 จริง) | 7 | 77 | 77 | 0 | 100.0% |
| Frontend หน้าเว็บและคอมโพเนนต์ | Vitest + React Testing Library | 13 | 190 | 190 | 0 | 100.0% |
| รวมเทสอัตโนมัติ |  | 35 | 583 | 583 | 0 | 100.0% |

กรณีทดสอบด้วยมือ (Manual / E2E): 33 กรณี — ยังไม่ได้ทดสอบในรอบนี้ (ดูหัวข้อ 4)

## 1. Backend API และ Unit test (Jest + Supertest)

ที่อยู่ไฟล์: `testcase/backend/tests` · คำสั่ง: `npm --prefix testcase/backend test`

### 1.1 API แอดมิน: แดชบอร์ด รายงาน ผู้ใช้ รายการ — `api.admin.test.js` (52/52 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| ADM-01 | ADM การป้องกันสิทธิ์ | get /admin/dashboard/stats โดยไม่มี token | 401 | ✅ ผ่าน |
| ADM-01 | ADM การป้องกันสิทธิ์ | get /admin/activity โดยไม่มี token | 401 | ✅ ผ่าน |
| ADM-01 | ADM การป้องกันสิทธิ์ | get /admin/reports โดยไม่มี token | 401 | ✅ ผ่าน |
| ADM-01 | ADM การป้องกันสิทธิ์ | get /admin/reports/RPT-2026-000001 โดยไม่มี token | 401 | ✅ ผ่าน |
| ADM-01 | ADM การป้องกันสิทธิ์ | post /admin/reports/RPT-2026-000001/moderate โดยไม่มี token | 401 | ✅ ผ่าน |
| ADM-01 | ADM การป้องกันสิทธิ์ | get /admin/users โดยไม่มี token | 401 | ✅ ผ่าน |
| ADM-01 | ADM การป้องกันสิทธิ์ | post /admin/users/641/action โดยไม่มี token | 401 | ✅ ผ่าน |
| ADM-01 | ADM การป้องกันสิทธิ์ | get /admin/items?type=found โดยไม่มี token | 401 | ✅ ผ่าน |
| ADM-01 | ADM การป้องกันสิทธิ์ | patch /admin/items/found/1 โดยไม่มี token | 401 | ✅ ผ่าน |
| ADM-01 | ADM การป้องกันสิทธิ์ | delete /admin/items/found/1 โดยไม่มี token | 401 | ✅ ผ่าน |
| ADM-02 | ADM Dashboard / Activity | GET /admin/dashboard/stats | รวมตัวเลขทุกหมวด | ✅ ผ่าน |
| ADM-03 | ADM Dashboard / Activity | GET /admin/activity?limit=500 | จำกัดไม่เกิน 100 | ✅ ผ่าน |
| ADM-04 | ADM Dashboard / Activity | GET /admin/activity ค่า default limit = 20 | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| ADM-05 | ADM Dashboard / Activity | dashboard ฐานข้อมูลผิดพลาด | 500 | ✅ ผ่าน |
| ADM-06 | ADM Reports | GET /admin/reports?status=pending&q=กระเป๋า | กรองสถานะ + คำค้น พร้อม total/stats | ✅ ผ่าน |
| ADM-07 | ADM Reports | GET /admin/reports?status=all | ไม่กรองสถานะ | ✅ ผ่าน |
| ADM-08 | ADM Reports | GET /admin/reports/:id ไม่พบ | 404 | ✅ ผ่าน |
| ADM-09 | ADM Reports | เปิดดูรายงานสถานะ pending | เปลี่ยนเป็น under_review และมี timeline | ✅ ผ่าน |
| ADM-10 | ADM Reports | รายงานที่ดำเนินการแล้ว | timeline แสดงผู้ดำเนินการ ไม่เปลี่ยนสถานะ | ✅ ผ่าน |
| ADM-11 | ADM Moderate report (transaction) | action ไม่ถูกต้อง | 400 | ✅ ผ่าน |
| ADM-12 | ADM Moderate report (transaction) | suspend ด้วย duration_days=undefined | 400 | ✅ ผ่าน |
| ADM-12 | ADM Moderate report (transaction) | suspend ด้วย duration_days=1 | 400 | ✅ ผ่าน |
| ADM-12 | ADM Moderate report (transaction) | suspend ด้วย duration_days=14 | 400 | ✅ ผ่าน |
| ADM-12 | ADM Moderate report (transaction) | suspend ด้วย duration_days="abc" | 400 | ✅ ผ่าน |
| ADM-13 | ADM Moderate report (transaction) | ไม่พบรายงาน | 404 และ ROLLBACK | ✅ ผ่าน |
| ADM-14 | ADM Moderate report (transaction) | warn | เพิ่ม warning_count, สถานะ resolved, action_taken=warning, COMMIT | ✅ ผ่าน |
| ADM-15 | ADM Moderate report (transaction) | suspend 7 วัน | ตั้ง suspended_until | ✅ ผ่าน |
| ADM-16 | ADM Moderate report (transaction) | ban | ตั้ง is_banned = true | ✅ ผ่าน |
| ADM-17 | ADM Moderate report (transaction) | dismiss รายการที่ไม่มีเจ้าของ | ยกเลิกรายงานได้ (status dismissed) | ✅ ผ่าน |
| ADM-18 | ADM Moderate report (transaction) | ban รายการที่หาเจ้าของไม่ได้ | 404 และ ROLLBACK | ✅ ผ่าน |
| ADM-19 | ADM Moderate report (transaction) | ฐานข้อมูลผิดพลาดกลางทาง | 500, ROLLBACK และคืน connection | ✅ ผ่าน |
| ADM-20 | ADM Users | GET /admin/users?q=som | ค้นชื่อ/อีเมล/รหัสนิสิต | ✅ ผ่าน |
| ADM-21 | ADM Users | GET /admin/users?status=suspended | เงื่อนไขกรองถูกต้อง | ✅ ผ่าน |
| ADM-21 | ADM Users | GET /admin/users?status=banned | เงื่อนไขกรองถูกต้อง | ✅ ผ่าน |
| ADM-21 | ADM Users | GET /admin/users?status=active | เงื่อนไขกรองถูกต้อง | ✅ ผ่าน |
| ADM-22 | ADM Users | POST /admin/users/:id/action action=warn | อัปเดตถูกคอลัมน์ | ✅ ผ่าน |
| ADM-22 | ADM Users | POST /admin/users/:id/action action=suspend | อัปเดตถูกคอลัมน์ | ✅ ผ่าน |
| ADM-22 | ADM Users | POST /admin/users/:id/action action=ban | อัปเดตถูกคอลัมน์ | ✅ ผ่าน |
| ADM-22 | ADM Users | POST /admin/users/:id/action action=unsuspend | อัปเดตถูกคอลัมน์ | ✅ ผ่าน |
| ADM-22 | ADM Users | POST /admin/users/:id/action action=unban | อัปเดตถูกคอลัมน์ | ✅ ผ่าน |
| ADM-23 | ADM Users | action ไม่ถูกต้อง | 400 | ✅ ผ่าน |
| ADM-24 | ADM Users | suspend โดยไม่ระบุจำนวนวันที่อนุญาต (3/7/30) | 400 | ✅ ผ่าน |
| ADM-25 | ADM Users | ไม่พบผู้ใช้ | 404 | ✅ ผ่าน |
| ADM-26 | ADM Items | GET /admin/items ไม่ระบุ type | 400 | ✅ ผ่าน |
| ADM-27 | ADM Items | GET /admin/items?type=lost&q=กุญแจ | ค้นหาจาก lost_items | ✅ ผ่าน |
| ADM-28 | ADM Items | PATCH /admin/items/found/1 ข้อมูลถูกต้อง | 200 | ✅ ผ่าน |
| ADM-29 | ADM Items | PATCH ข้อมูลไม่ผ่าน validation | 400 | ✅ ผ่าน |
| ADM-30 | ADM Items | PATCH type ไม่ถูกต้อง | 400 | ✅ ผ่าน |
| ADM-31 | ADM Items | PATCH ไม่พบรายการ | 404 | ✅ ผ่าน |
| ADM-32 | ADM Items | DELETE /admin/items/lost/3 | 200 | ✅ ผ่าน |
| ADM-33 | ADM Items | DELETE ไม่พบรายการ | 404 | ✅ ผ่าน |
| ADM-34 | ADM Items | DELETE type ไม่ถูกต้อง | 400 | ✅ ผ่าน |

### 1.2 API เข้าสู่ระบบ/บัญชีแอดมิน — `api.adminAuth.test.js` (18/18 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| AAU-01 | AAU POST /admin/auth/login | อีเมล/รหัสผ่านถูกต้อง | 200 พร้อม JWT ที่มี admin_id | ✅ ผ่าน |
| AAU-02 | AAU POST /admin/auth/login | รหัสผ่านผิด | 401 | ✅ ผ่าน |
| AAU-03 | AAU POST /admin/auth/login | อีเมลไม่มีในระบบ | 401 (ข้อความเดียวกับรหัสผิด) | ✅ ผ่าน |
| AAU-04 | AAU POST /admin/auth/login | ไม่มีรหัสผ่าน | 400 | ✅ ผ่าน |
| AAU-05 | AAU POST /admin/auth/login | อีเมลผิดรูปแบบ | 400 | ✅ ผ่าน |
| AAU-06 | AAU POST /admin/auth/login | รหัสผ่านไม่ใช่ string | 400 | ✅ ผ่าน |
| AAU-07 | AAU POST /admin/auth/login | ฐานข้อมูลผิดพลาด | 500 | ✅ ผ่าน |
| AAU-08 | AAU GET /admin/auth/me | มี token | ข้อมูลแอดมิน | ✅ ผ่าน |
| AAU-09 | AAU GET /admin/auth/me | ไม่มี token | 401 | ✅ ผ่าน |
| AAU-10 | AAU GET /admin/auth/me | token ถูกต้องแต่แอดมินถูกลบไปแล้ว | 404 | ✅ ผ่าน |
| AAU-11 | AAU PATCH /admin/auth/profile | เปลี่ยนชื่อที่แสดง | 200 (trim แล้ว) | ✅ ผ่าน |
| AAU-12 | AAU PATCH /admin/auth/profile | ชื่อว่าง | 400 | ✅ ผ่าน |
| AAU-13 | AAU PATCH /admin/auth/profile | ชื่อยาวเกิน 100 ตัว | 400 | ✅ ผ่าน |
| AAU-14 | AAU PATCH /admin/auth/profile | ไม่ส่งชื่อ | 400 | ✅ ผ่าน |
| AAU-15 | AAU PATCH /admin/auth/profile | ไม่มี token | 401 | ✅ ผ่าน |
| AAU-16 | AAU POST /admin/auth/change-password | รหัสเดิมถูก + รหัสใหม่ ≥ 8 ตัว | 200 และบันทึก hash ใหม่ | ✅ ผ่าน |
| AAU-17 | AAU POST /admin/auth/change-password | รหัสเดิมผิด | 401 และไม่เปลี่ยนรหัส | ✅ ผ่าน |
| AAU-18 | AAU POST /admin/auth/change-password | รหัสใหม่สั้นกว่า 8 ตัว | 400 | ✅ ผ่าน |

### 1.3 API ยืนยันการคืนของ + เกียรติบัตร — `api.certificate.test.js` (10/10 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| CRT-01 | CRT POST /api/returns/confirm-success | อีเมลผิดรูปแบบ | 400 | ✅ ผ่าน |
| CRT-02 | CRT POST /api/returns/confirm-success | ไม่พบผู้ใช้ | 404 | ✅ ผ่าน |
| CRT-03 | CRT POST /api/returns/confirm-success | คืนของครั้งที่ 1 | บันทึกแต่ยังไม่ออกเกียรติบัตร | ✅ ผ่าน |
| CRT-04 | CRT POST /api/returns/confirm-success | คืนของครบ 3 ครั้ง (ทวีคูณของ 3) | ออกเกียรติบัตร | ✅ ผ่าน |
| CRT-04 | CRT POST /api/returns/confirm-success | คืนของครบ 6 ครั้ง (ทวีคูณของ 3) | ออกเกียรติบัตร | ✅ ผ่าน |
| CRT-04 | CRT POST /api/returns/confirm-success | คืนของครบ 9 ครั้ง (ทวีคูณของ 3) | ออกเกียรติบัตร | ✅ ผ่าน |
| CRT-05 | CRT POST /api/returns/confirm-success | ส่งเกียรติบัตรล้มเหลว ไม่กระทบ response | ยัง 200 | ✅ ผ่าน |
| CRT-06 | CRT POST /api/returns/confirm-success | ฐานข้อมูลผิดพลาด | 500 | ✅ ผ่าน |
| CRT-07 | CRT POST /api/returns/confirm-success | ไม่มี token แอดมิน | 401 และไม่แตะฐานข้อมูลผู้ใช้ | ✅ ผ่าน |
| CRT-08 | CRT POST /api/returns/confirm-success | จำนวนครั้งที่ได้เกียรติบัตรอ่านจากตั้งค่าระบบ (certificate_milestone = 5) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |

### 1.4 API เข้าสู่ระบบ/สมัครด้วย Google 2 ขั้น + ตรวจ ID token — `api.googleAuth.test.js` (24/24 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| GGL-01 | GGL POST /api/auth/google | ผู้ใช้เดิม | ยืนยัน Google แล้วส่ง OTP ไปที่อีเมล Google (ยังไม่ออก token) | ✅ ผ่าน |
| GGL-02 | GGL POST /api/auth/google | ยังไม่มีบัญชี | สร้างบัญชีจากชื่อ Google (201) แล้วส่ง OTP | ✅ ผ่าน |
| GGL-03 | GGL POST /api/auth/google | สมัครพร้อมกัน (อีเมลซ้ำ 23505) | ใช้บัญชีที่มีอยู่ และยังส่ง OTP | ✅ ผ่าน |
| GGL-04 | GGL POST /api/auth/google | บัญชีถูกแบน | 403 และไม่ส่ง OTP | ✅ ผ่าน |
| GGL-05 | GGL POST /api/auth/google | บัญชีถูกระงับชั่วคราว | 403 พร้อม suspended_until | ✅ ผ่าน |
| GGL-06 | GGL POST /api/auth/google | ขอซ้ำภายใน 60 วินาที | ไม่ส่งรหัสใหม่ แจ้ง retry_after ให้ใช้รหัสเดิม | ✅ ผ่าน |
| GGL-07 | GGL POST /api/auth/google | ลายเซ็นปลอม (กุญแจอื่น) | 401 ไม่แตะบัญชีผู้ใช้ | ✅ ผ่าน |
| GGL-08 | GGL POST /api/auth/google | Client ID ไม่ตรง (aud) | 401 ไม่แตะบัญชีผู้ใช้ | ✅ ผ่าน |
| GGL-09 | GGL POST /api/auth/google | token หมดอายุ | 401 ไม่แตะบัญชีผู้ใช้ | ✅ ผ่าน |
| GGL-10 | GGL POST /api/auth/google | ผู้ออก token ไม่ใช่ Google | 401 ไม่แตะบัญชีผู้ใช้ | ✅ ผ่าน |
| GGL-11 | GGL POST /api/auth/google | อีเมลยังไม่ยืนยันกับ Google | 401 ไม่แตะบัญชีผู้ใช้ | ✅ ผ่าน |
| GGL-12 | GGL POST /api/auth/google | kid ไม่มีในกุญแจของ Google | 401 ไม่แตะบัญชีผู้ใช้ | ✅ ผ่าน |
| GGL-13 | GGL POST /api/auth/google | credential ไม่ใช่ JWT | 401 ไม่แตะบัญชีผู้ใช้ | ✅ ผ่าน |
| GGL-14 | GGL POST /api/auth/google | จำกัดโดเมน (GOOGLE_ALLOWED_DOMAINS=ku.th) | อีเมลโดเมนอื่น 401 | ✅ ผ่าน |
| GGL-15 | GGL POST /api/auth/google | ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID | 503 | ✅ ผ่าน |
| GGL-16 | GGL POST /api/auth/google | ดึงกุญแจของ Google ไม่ได้ | 502 | ✅ ผ่าน |
| GGL-17 | GGL POST /api/auth/google | ส่งอีเมล OTP ไม่สำเร็จ | 500 | ✅ ผ่าน |
| GGL-18 | GGL POST /api/auth/google | ขั้นที่ 2: OTP ที่ส่งไปใช้กับ /api/verify-otp ได้ และได้ token ผู้ใช้ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| GGL-19 | GGL POST /api/auth/google | กุญแจของ Google ถูก cache — เข้าสู่ระบบ 2 ครั้งดึงกุญแจครั้งเดียว | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| GGL-20 | GGL POST /api/auth/google | /api/settings/public ส่ง google_client_id ให้หน้าเว็บ (ไม่ตั้ง = null) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| GSV-01 | GSV services/googleAuth.js (unit) | token ถูกต้อง | คืนอีเมลตัวพิมพ์เล็ก ชื่อ และนามสกุล | ✅ ผ่าน |
| GSV-02 | GSV services/googleAuth.js (unit) | ไม่มี given_name/family_name | แยกชื่อจาก name, ไม่มีนามสกุลใช้ '-' | ✅ ผ่าน |
| GSV-03 | GSV services/googleAuth.js (unit) | ชื่อยาวเกิน 100 ตัว | ตัดให้พอดีคอลัมน์ | ✅ ผ่าน |
| GSV-04 | GSV services/googleAuth.js (unit) | Google หมุนกุญแจ (kid ใหม่) | โหลดกุญแจใหม่ 1 ครั้งแล้วตรวจผ่าน | ✅ ผ่าน |

### 1.5 API แจ้งพบของ / แจ้งของหาย — `api.items.test.js` (38/38 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FND-01 | FND แจ้งพบของ | ข้อมูลครบ (ไม่มีรูป) | 201 คืน item_id และแจ้งเตือน LINE | ✅ ผ่าน |
| FND-02 | FND แจ้งพบของ | ส่งแบบ multipart พร้อมรูปภาพ | บันทึก image_url ใน /assets/foundUploads/ | ✅ ผ่าน |
| FND-03 | FND แจ้งพบของ | อัปโหลดไฟล์ที่ไม่ใช่รูปภาพ | 400 | ✅ ผ่าน |
| FND-04 | FND แจ้งพบของ | รูปภาพใหญ่เกิน 5 MB | 400 | ✅ ผ่าน |
| FND-05 | FND แจ้งพบของ | ไม่มีชื่อสิ่งของ | 400 | ✅ ผ่าน |
| FND-06 | FND แจ้งพบของ | วันที่ผิดรูปแบบ | 400 | ✅ ผ่าน |
| FND-07 | FND แจ้งพบของ | วันที่ไม่มีจริง | 400 | ✅ ผ่าน |
| FND-08 | FND แจ้งพบของ | ไม่มีสถานที่ | 400 | ✅ ผ่าน |
| FND-09 | FND แจ้งพบของ | ชื่อยาวเกิน 255 ตัว | 400 | ✅ ผ่าน |
| FND-10 | FND แจ้งพบของ | token ผู้ใช้ | student_id มาจาก token แม้ body จะส่งค่าอื่นมา | ✅ ผ่าน |
| FND-11 | FND แจ้งพบของ | แจ้งเตือน LINE ล้มเหลว ไม่กระทบการบันทึก | ยัง 201 | ✅ ผ่าน |
| FND-12 | FND แจ้งพบของ | ฐานข้อมูลผิดพลาดตอนบันทึก | 500 | ✅ ผ่าน |
| FND-13 | FND แจ้งพบของ | GET /foundItem | รายการทั้งหมดเรียงจากใหม่ไปเก่า | ✅ ผ่าน |
| FND-14 | FND แจ้งพบของ | GET /datafound (path สำรอง) ใช้งานได้เหมือนกัน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FND-15 | FND แจ้งพบของ | GET /foundItem ฐานข้อมูลผิดพลาด | 500 | ✅ ผ่าน |
| FND-16 | FND แจ้งพบของ | ไม่มี token | 401 และไม่บันทึก | ✅ ผ่าน |
| FND-17 | FND แจ้งพบของ | แอดมินเพิ่มรายการโดยไม่ระบุเจ้าของ | student_id = null และบันทึก audit log | ✅ ผ่าน |
| FND-18 | FND แจ้งพบของ | ผู้ใช้ทั่วไปแจ้ง | ไม่บันทึก audit log ของแอดมิน | ✅ ผ่าน |
| FND-19 | FND แจ้งพบของ | แอดมินระบุรหัสนิสิตที่ไม่มีในระบบ (FK violation) | 400 | ✅ ผ่าน |
| LST-01 | LST แจ้งของหาย | ข้อมูลครบ (ไม่มีรูป) | 201 คืน item_id และแจ้งเตือน LINE | ✅ ผ่าน |
| LST-02 | LST แจ้งของหาย | ส่งแบบ multipart พร้อมรูปภาพ | บันทึก image_url ใน /assets/lostUploads/ | ✅ ผ่าน |
| LST-03 | LST แจ้งของหาย | อัปโหลดไฟล์ที่ไม่ใช่รูปภาพ | 400 | ✅ ผ่าน |
| LST-04 | LST แจ้งของหาย | รูปภาพใหญ่เกิน 5 MB | 400 | ✅ ผ่าน |
| LST-05 | LST แจ้งของหาย | ไม่มีชื่อสิ่งของ | 400 | ✅ ผ่าน |
| LST-06 | LST แจ้งของหาย | วันที่ผิดรูปแบบ | 400 | ✅ ผ่าน |
| LST-07 | LST แจ้งของหาย | วันที่ไม่มีจริง | 400 | ✅ ผ่าน |
| LST-08 | LST แจ้งของหาย | ไม่มีสถานที่ | 400 | ✅ ผ่าน |
| LST-09 | LST แจ้งของหาย | ชื่อยาวเกิน 255 ตัว | 400 | ✅ ผ่าน |
| LST-10 | LST แจ้งของหาย | token ผู้ใช้ | student_id มาจาก token แม้ body จะส่งค่าอื่นมา | ✅ ผ่าน |
| LST-11 | LST แจ้งของหาย | แจ้งเตือน LINE ล้มเหลว ไม่กระทบการบันทึก | ยัง 201 | ✅ ผ่าน |
| LST-12 | LST แจ้งของหาย | ฐานข้อมูลผิดพลาดตอนบันทึก | 500 | ✅ ผ่าน |
| LST-13 | LST แจ้งของหาย | GET /lostItem | รายการทั้งหมดเรียงจากใหม่ไปเก่า | ✅ ผ่าน |
| LST-14 | LST แจ้งของหาย | GET /datalost (path สำรอง) ใช้งานได้เหมือนกัน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| LST-15 | LST แจ้งของหาย | GET /lostItem ฐานข้อมูลผิดพลาด | 500 | ✅ ผ่าน |
| LST-16 | LST แจ้งของหาย | ไม่มี token | 401 และไม่บันทึก | ✅ ผ่าน |
| LST-17 | LST แจ้งของหาย | แอดมินเพิ่มรายการโดยไม่ระบุเจ้าของ | student_id = null และบันทึก audit log | ✅ ผ่าน |
| LST-18 | LST แจ้งของหาย | ผู้ใช้ทั่วไปแจ้ง | ไม่บันทึก audit log ของแอดมิน | ✅ ผ่าน |
| LST-19 | LST แจ้งของหาย | แอดมินระบุรหัสนิสิตที่ไม่มีในระบบ (FK violation) | 400 | ✅ ผ่าน |

### 1.6 API สาธารณะ: สมัคร, OTP, ผู้ใช้, จัดอันดับ, LINE notify — `api.public.test.js` (48/48 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| HC-01 | HC Health check | GET / | 200 Hello World! | ✅ ผ่าน |
| HC-02 | HC Health check | GET /api-docs | เปิดหน้า Swagger UI ได้ | ✅ ผ่าน |
| REG-01 | REG POST /api/register | ข้อมูลถูกต้อง | 201 และ normalize ชื่อ/อีเมล | ✅ ผ่าน |
| REG-02 | REG POST /api/register | ไม่ส่ง student_id | ระบบสร้างรหัส USERxxxx ให้ (ไม่เกิน 20 ตัวอักษร) | ✅ ผ่าน |
| REG-03 | REG POST /api/register | ไม่มีชื่อ | 400 | ✅ ผ่าน |
| REG-04 | REG POST /api/register | ไม่มีนามสกุล | 400 | ✅ ผ่าน |
| REG-05 | REG POST /api/register | อีเมลผิดรูปแบบ | 400 | ✅ ผ่าน |
| REG-06 | REG POST /api/register | รหัสนิสิตยาวเกิน 20 ตัว | 400 | ✅ ผ่าน |
| REG-07 | REG POST /api/register | ชื่อยาวเกิน 100 ตัว | 400 | ✅ ผ่าน |
| REG-08 | REG POST /api/register | รหัสนิสิต/อีเมลซ้ำ (unique violation) | 409 | ✅ ผ่าน |
| REG-09 | REG POST /api/register | ฐานข้อมูลผิดพลาดอื่น ๆ | 500 | ✅ ผ่าน |
| OTP-01 | OTP POST /api/send-otp | อีเมลผิดรูปแบบ | 400 | ✅ ผ่าน |
| OTP-02 | OTP POST /api/send-otp | อีเมลไม่มีในระบบ | 404 และไม่ส่งเมล | ✅ ผ่าน |
| OTP-03 | OTP POST /api/send-otp | บัญชีถูกแบนถาวร | 403 | ✅ ผ่าน |
| OTP-04 | OTP POST /api/send-otp | บัญชีถูกระงับชั่วคราว (ยังไม่หมดเวลา) | 403 พร้อม suspended_until | ✅ ผ่าน |
| OTP-05 | OTP POST /api/send-otp | ระงับชั่วคราวแต่หมดเวลาแล้ว | ส่ง OTP ได้ตามปกติ | ✅ ผ่าน |
| OTP-06 | OTP POST /api/send-otp | ส่งสำเร็จ | ลบ OTP เก่า, บันทึก OTP 6 หลัก, ส่งอีเมลรหัสเดียวกัน | ✅ ผ่าน |
| OTP-08 | OTP POST /api/send-otp | ขอ OTP ซ้ำภายใน 60 วินาที | 429 พร้อม retry_after และไม่ส่งรหัสใหม่ | ✅ ผ่าน |
| OTP-07 | OTP POST /api/send-otp | ส่งอีเมลล้มเหลว | 500 | ✅ ผ่าน |
| VOTP-01 | VOTP POST /api/verify-otp | OTP 5 หลัก | 400 | ✅ ผ่าน |
| VOTP-02 | VOTP POST /api/verify-otp | OTP มีตัวอักษร | 400 | ✅ ผ่าน |
| VOTP-03 | VOTP POST /api/verify-otp | OTP เป็นตัวเลข (ไม่ใช่ string) | 400 | ✅ ผ่าน |
| VOTP-04 | VOTP POST /api/verify-otp | อีเมลผิดรูปแบบ | 400 | ✅ ผ่าน |
| VOTP-05 | VOTP POST /api/verify-otp | ไม่มี OTP ที่ยังไม่หมดอายุ | 400 และล้าง OTP ที่หมดอายุ | ✅ ผ่าน |
| VOTP-06 | VOTP POST /api/verify-otp | OTP ถูกต้อง | 200 พร้อม student_id และ token ผู้ใช้ | ✅ ผ่าน |
| VOTP-07 | VOTP POST /api/verify-otp | OTP ถูกต้องแต่บัญชีถูกแบน | 403 | ✅ ผ่าน |
| VOTP-08 | VOTP POST /api/verify-otp | OTP ถูกต้องแต่ไม่พบผู้ใช้ | student_id = 'unknown' และไม่มี token | ✅ ผ่าน |
| VOTP-09 | VOTP POST /api/verify-otp | ฐานข้อมูลผิดพลาด | 500 | ✅ ผ่าน |
| VOTP-10 | VOTP POST /api/verify-otp | OTP ผิด | นับจำนวนครั้ง และยังไม่ลบ OTP | ✅ ผ่าน |
| VOTP-11 | VOTP POST /api/verify-otp | OTP ผิดครบ 5 ครั้ง | 429 และลบ OTP ทิ้ง | ✅ ผ่าน |
| VOTP-12 | VOTP POST /api/verify-otp | OTP ถูกต้องแต่บัญชีถูกระงับชั่วคราว | 403 พร้อม suspended_until | ✅ ผ่าน |
| USR-01 | USR ข้อมูลผู้ใช้ | GET /api/users/:email ของตัวเอง | 200 (ค้นด้วยอีเมลตัวพิมพ์เล็ก) | ✅ ผ่าน |
| USR-02 | USR ข้อมูลผู้ใช้ | GET /api/users/:email ไม่พบ | 404 | ✅ ผ่าน |
| USR-03 | USR ข้อมูลผู้ใช้ | GET /api/users/:email อีเมลผิดรูปแบบ | 400 | ✅ ผ่าน |
| USR-04 | USR ข้อมูลผู้ใช้ | GET /api/users/:email ไม่มี token | 401 | ✅ ผ่าน |
| USR-05 | USR ข้อมูลผู้ใช้ | GET /api/users/:email ของคนอื่น | 403 | ✅ ผ่าน |
| USR-06 | USR ข้อมูลผู้ใช้ | GET /user ด้วย token แอดมิน | รายชื่อผู้ใช้ทั้งหมด | ✅ ผ่าน |
| USR-07 | USR ข้อมูลผู้ใช้ | GET /user ฐานข้อมูลผิดพลาด | 500 | ✅ ผ่าน |
| USR-08 | USR ข้อมูลผู้ใช้ | GET /user ด้วย token ผู้ใช้ทั่วไป | 401 | ✅ ผ่าน |
| RNK-01 | RNK จัดอันดับ | GET /api/rankings/returners | top 10 ผู้คืนของ | ✅ ผ่าน |
| RNK-02 | RNK จัดอันดับ | GET /api/rankings/lost-locations | จุดที่ของหายบ่อย | ✅ ผ่าน |
| RNK-03 | RNK จัดอันดับ | /api/rankings/returners ฐานข้อมูลผิดพลาด | 500 | ✅ ผ่าน |
| RNK-03 | RNK จัดอันดับ | /api/rankings/lost-locations ฐานข้อมูลผิดพลาด | 500 | ✅ ผ่าน |
| LN-01 | LN POST /api/notifications/line | key ถูกต้องแต่ไม่มี message | 400 | ✅ ผ่าน |
| LN-02 | LN POST /api/notifications/line | ตั้ง NOTIFY_API_KEY แล้วส่ง key ผิด | 401 | ✅ ผ่าน |
| LN-03 | LN POST /api/notifications/line | key ถูกต้อง | ส่งข้อความที่ trim แล้ว | ✅ ผ่าน |
| LN-04 | LN POST /api/notifications/line | LINE API ล้มเหลว | 502 | ✅ ผ่าน |
| LN-05 | LN POST /api/notifications/line | ไม่ได้ตั้ง NOTIFY_API_KEY | endpoint ปิดใช้งาน (401) | ✅ ผ่าน |

### 1.7 API รายงานโพสต์ — `api.report.test.js` (14/14 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| RPT-01 | RPT POST /report | ข้อมูลครบ | 201 พร้อม report_id รูปแบบ RPT-ปี-เลข 6 หลัก | ✅ ผ่าน |
| RPT-02 | RPT POST /report | รายงานรายการ lost | ตรวจเจ้าของจากตาราง lost_items | ✅ ผ่าน |
| RPT-03 | RPT POST /report | ไม่มี reported_item_id | 400 | ✅ ผ่าน |
| RPT-04 | RPT POST /report | ไม่มี item_type | 400 | ✅ ผ่าน |
| RPT-05 | RPT POST /report | ไม่มี reason | 400 | ✅ ผ่าน |
| RPT-12 | RPT POST /report | reported_item_id ไม่ใช่ตัวเลข | 400 | ✅ ผ่าน |
| RPT-06 | RPT POST /report | item_type ไม่ใช่ found/lost | 400 | ✅ ผ่าน |
| RPT-07 | RPT POST /report | รายงานโพสต์ของตัวเอง | 400 | ✅ ผ่าน |
| RPT-08 | RPT POST /report | ไม่เข้าสู่ระบบ | 401 และไม่บันทึกรายงาน | ✅ ผ่าน |
| RPT-09 | RPT POST /report | แนบรูปหลักฐาน | evidence_url อยู่ใน /assets/reportUploads/ | ✅ ผ่าน |
| RPT-10 | RPT POST /report | แนบไฟล์หลักฐานที่ไม่ใช่รูป | 400 | ✅ ผ่าน |
| RPT-11 | RPT POST /report | ฐานข้อมูลผิดพลาด | 500 | ✅ ผ่าน |
| RPT-13 | RPT POST /report | ไม่พบรายการที่รายงาน | 404 | ✅ ผ่าน |
| RPT-14 | RPT POST /report | ผู้รายงานมาจาก token ไม่ใช่ body (ปลอม reporter_student_id ไม่ได้) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |

### 1.8 API ค่าระบบ, โหมดปิดปรับปรุง, audit log — `api.settings.test.js` (34/34 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| SET-01 | SET ค่าระบบ | GET /admin/settings ยังไม่เคยตั้งค่า | คืนค่าเริ่มต้นทั้งหมด | ✅ ผ่าน |
| SET-02 | SET ค่าระบบ | GET /admin/settings ไม่มี token แอดมิน | 401 | ✅ ผ่าน |
| SET-03 | SET ค่าระบบ | PUT /admin/settings แก้เกณฑ์จับคู่ | บันทึก + audit log ใน transaction | ✅ ผ่าน |
| SET-04 | SET ค่าระบบ | PUT ค่าเดิม (ไม่เปลี่ยนแปลง) | ไม่บันทึกและไม่สร้าง audit log | ✅ ผ่าน |
| SET-05 | SET ค่าระบบ | เกณฑ์จับคู่ต่ำกว่า 30 | 400 ไม่บันทึก | ✅ ผ่าน |
| SET-06 | SET ค่าระบบ | เกียรติบัตรทุก 0 ครั้ง | 400 ไม่บันทึก | ✅ ผ่าน |
| SET-07 | SET ค่าระบบ | หมวดหมู่น้อยกว่า 2 รายการ | 400 ไม่บันทึก | ✅ ผ่าน |
| SET-08 | SET ค่าระบบ | ตัวเลือกวันระงับเกิน 365 วัน | 400 ไม่บันทึก | ✅ ผ่าน |
| SET-09 | SET ค่าระบบ | ประกาศวันเริ่มอยู่หลังวันสิ้นสุด | 400 ไม่บันทึก | ✅ ผ่าน |
| SET-16 | SET ค่าระบบ | เปิดประกาศแต่ไม่มีข้อความ | 400 ไม่บันทึก | ✅ ผ่าน |
| SET-10 | SET ค่าระบบ | คีย์ที่ไม่รู้จัก | 400 ไม่บันทึก | ✅ ผ่าน |
| SET-17 | SET ค่าระบบ | ประกาศ tone ที่ไม่รู้จัก | ปรับเป็น info | ✅ ผ่าน |
| SET-11 | SET ค่าระบบ | PUT body ไม่มี settings | 400 | ✅ ผ่าน |
| SET-12 | SET ค่าระบบ | บันทึก audit log ไม่ได้ | ROLLBACK และตอบ 500 | ✅ ผ่าน |
| SET-13 | SET ค่าระบบ | GET /api/settings/public | ส่งเฉพาะค่าสาธารณะ ไม่มีค่าภายใน | ✅ ผ่าน |
| SET-14 | SET ค่าระบบ | ประกาศที่อยู่ในช่วงวันที่ | แสดงใน /api/settings/public | ✅ ผ่าน |
| SET-15 | SET ค่าระบบ | ประกาศที่หมดอายุแล้ว | ไม่แสดง | ✅ ผ่าน |
| MNT-01 | MNT โหมดปิดปรับปรุง | เปิดโหมดปิดปรับปรุง | ผู้ใช้ทั่วไปได้ 503 พร้อมข้อความและ Retry-After | ✅ ผ่าน |
| MNT-02 | MNT โหมดปิดปรับปรุง | ผู้ใช้ที่ล็อกอิน (token ผู้ใช้) ก็ถูกปิดกั้น | 503 | ✅ ผ่าน |
| MNT-03 | MNT โหมดปิดปรับปรุง | แอดมินยังเรียก API ได้ตามปกติ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| MNT-04 | MNT โหมดปิดปรับปรุง | เส้นทาง /api/settings/public ยังเปิดอยู่ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| MNT-04 | MNT โหมดปิดปรับปรุง | เส้นทาง /admin/auth/login ยังเปิดอยู่ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| MNT-04 | MNT โหมดปิดปรับปรุง | เส้นทาง / ยังเปิดอยู่ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| MNT-05 | MNT โหมดปิดปรับปรุง | ปิดโหมดปิดปรับปรุง | ผู้ใช้ใช้งานได้ปกติ | ✅ ผ่าน |
| MNT-06 | MNT โหมดปิดปรับปรุง | อ่านค่าระบบไม่ได้ (ฐานข้อมูลล่ม) | ใช้ค่าเริ่มต้น (ไม่ปิดระบบ) | ✅ ผ่าน |
| AUD-01 | AUD ประวัติการดำเนินการของแอดมิน | GET /admin/audit-logs | รายการ + จำนวนทั้งหมด + รายชื่อแอดมิน | ✅ ผ่าน |
| AUD-02 | AUD ประวัติการดำเนินการของแอดมิน | กรองตามกลุ่ม + คำค้น + ช่วงวันที่ | เงื่อนไขและพารามิเตอร์ถูกต้อง | ✅ ผ่าน |
| AUD-03 | AUD ประวัติการดำเนินการของแอดมิน | group ไม่ถูกต้อง | 400 | ✅ ผ่าน |
| AUD-04 | AUD ประวัติการดำเนินการของแอดมิน | admin_id ไม่ใช่ตัวเลข | 400 | ✅ ผ่าน |
| AUD-05 | AUD ประวัติการดำเนินการของแอดมิน | target_type ไม่ถูกต้อง | 400 | ✅ ผ่าน |
| AUD-06 | AUD ประวัติการดำเนินการของแอดมิน | วันที่ผิดรูปแบบ | 400 | ✅ ผ่าน |
| AUD-07 | AUD ประวัติการดำเนินการของแอดมิน | ไม่มี endpoint แก้ไข/ลบประวัติ (append-only) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| AUD-08 | AUD ประวัติการดำเนินการของแอดมิน | ไม่มี token แอดมิน | 401 | ✅ ผ่าน |
| AUD-09 | AUD ประวัติการดำเนินการของแอดมิน | ข้อมูลลับไม่ถูกเก็บลง details (strip password/token/otp) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |

### 1.9 เริ่มระบบ: migration และสร้างแอดมินเริ่มต้น — `api.startup.test.js` (3/3 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| SRV-01 |  | startServer สร้างตาราง otp_codes / admins / reports และเพิ่มคอลัมน์ที่จำเป็น | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| SRV-02 |  | สร้างบัญชีแอดมินเริ่มต้นจาก ADMIN_SEED_* (อีเมลตัวพิมพ์เล็ก, รหัสผ่านถูก hash) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| SRV-03 |  | ไม่ได้ตั้งค่า MAIL_USER/MAIL_APP_PASSWORD | /api/send-otp ตอบ 503 | ✅ ผ่าน |

### 1.10 API ผู้ใช้: โปรไฟล์, กล่องแจ้งเตือน, ติดต่อเจ้าของ, โพสต์ของฉัน — `api.user.test.js` (31/31 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| ME-01 | ME โปรไฟล์ /api/me | GET /api/me | ข้อมูลของผู้ใช้จาก token | ✅ ผ่าน |
| ME-02 | ME โปรไฟล์ /api/me | GET /api/me ไม่มี token | 401 | ✅ ผ่าน |
| ME-03 | ME โปรไฟล์ /api/me | GET /api/me ด้วย token แอดมิน | 401 (ต้องเป็น token ผู้ใช้) | ✅ ผ่าน |
| ME-04 | ME โปรไฟล์ /api/me | GET /api/me token หมดอายุ | 401 | ✅ ผ่าน |
| ME-05 | ME โปรไฟล์ /api/me | PATCH /api/me แก้ชื่อ + เบอร์โทร | 200 (trim และบันทึกเฉพาะของตัวเอง) | ✅ ผ่าน |
| ME-06 | ME โปรไฟล์ /api/me | ไม่มีชื่อ | 400 | ✅ ผ่าน |
| ME-07 | ME โปรไฟล์ /api/me | เบอร์โทรผิดรูปแบบ | 400 | ✅ ผ่าน |
| ME-08 | ME โปรไฟล์ /api/me | อีเมลสำรองผิดรูปแบบ | 400 | ✅ ผ่าน |
| ME-09 | ME โปรไฟล์ /api/me | เลือกติดต่อทางโทรศัพท์แต่ไม่มีเบอร์ | 400 | ✅ ผ่าน |
| ME-10 | ME โปรไฟล์ /api/me | ช่องทางติดต่อไม่รู้จัก | 400 | ✅ ผ่าน |
| ME-11 | ME โปรไฟล์ /api/me | POST /api/me/avatar ไม่แนบรูป | 400 | ✅ ผ่าน |
| INB-01 | INB กล่องแจ้งเตือน /api/inbox | GET /api/inbox | รายการล่าสุด 30 รายการ + จำนวนที่ยังไม่อ่าน | ✅ ผ่าน |
| INB-02 | INB กล่องแจ้งเตือน /api/inbox | อ่านแล้วทีละรายการ | อัปเดตเฉพาะของตัวเอง | ✅ ผ่าน |
| INB-03 | INB กล่องแจ้งเตือน /api/inbox | id ไม่ใช่ตัวเลข | 400 | ✅ ผ่าน |
| INB-04 | INB กล่องแจ้งเตือน /api/inbox | อ่านทั้งหมด | อัปเดตทุกรายการที่ยังไม่อ่านของตัวเอง | ✅ ผ่าน |
| INB-05 | INB กล่องแจ้งเตือน /api/inbox | ไม่มี token | 401 | ✅ ผ่าน |
| CLM-01 | CLM ติดต่อเจ้าของโพสต์ /api/claims | ส่งคำขอครั้งแรก | 201 แจ้งเตือนเจ้าของ และคืนช่องทางติดต่อ | ✅ ผ่าน |
| CLM-02 | CLM ติดต่อเจ้าของโพสต์ /api/claims | ส่งซ้ำรายการเดิม | 200 และไม่แจ้งเตือนซ้ำ | ✅ ผ่าน |
| CLM-03 | CLM ติดต่อเจ้าของโพสต์ /api/claims | ติดต่อโพสต์ของตัวเอง | 400 | ✅ ผ่าน |
| CLM-04 | CLM ติดต่อเจ้าของโพสต์ /api/claims | รายการที่คืนแล้ว | 400 | ✅ ผ่าน |
| CLM-05 | CLM ติดต่อเจ้าของโพสต์ /api/claims | ไม่พบรายการ | 404 | ✅ ผ่าน |
| CLM-06 | CLM ติดต่อเจ้าของโพสต์ /api/claims | item_type ไม่ถูกต้อง | 400 | ✅ ผ่าน |
| CLM-07 | CLM ติดต่อเจ้าของโพสต์ /api/claims | item_id ไม่ใช่ตัวเลข | 400 | ✅ ผ่าน |
| MYI-01 | MYI โพสต์ของฉัน /api/my-items | GET /api/my-items | เฉพาะโพสต์ของตัวเอง | ✅ ผ่าน |
| MYI-02 | MYI โพสต์ของฉัน /api/my-items | แก้ไขโพสต์ของคนอื่น (ไม่พบในโพสต์ของฉัน) | 404 ไม่อัปเดต | ✅ ผ่าน |
| MYI-03 | MYI โพสต์ของฉัน /api/my-items | แก้ไขโพสต์ของตัวเอง | 200 (WHERE มี student_id) | ✅ ผ่าน |
| MYI-04 | MYI โพสต์ของฉัน /api/my-items | แก้ไขโพสต์ที่คืนแล้ว | 400 | ✅ ผ่าน |
| MYI-05 | MYI โพสต์ของฉัน /api/my-items | ลบโพสต์ของตัวเอง | ลบรายการและคำขอที่เกี่ยวข้องใน transaction | ✅ ผ่าน |
| MYI-06 | MYI โพสต์ของฉัน /api/my-items | ลบโพสต์ที่คืนของสำเร็จแล้ว | 400 และ ROLLBACK | ✅ ผ่าน |
| MYI-07 | MYI โพสต์ของฉัน /api/my-items | type ไม่ถูกต้อง | 400 | ✅ ผ่าน |
| MYI-08 | MYI โพสต์ของฉัน /api/my-items | ไม่มี token | 401 | ✅ ผ่าน |

### 1.11 Unit: middleware ตรวจ token แอดมิน — `unit.adminAuthMiddleware.test.js` (7/7 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| MW-01 | adminAuth middleware | token ถูกต้อง | แนบ req.admin และเรียก next() | ✅ ผ่าน |
| MW-02 | adminAuth middleware | ไม่มี header | 401 | ✅ ผ่าน |
| MW-03 | adminAuth middleware | scheme ไม่ใช่ Bearer | 401 | ✅ ผ่าน |
| MW-04 | adminAuth middleware | Bearer แต่ไม่มี token | 401 | ✅ ผ่าน |
| MW-05 | adminAuth middleware | token ปลอม | 401 | ✅ ผ่าน |
| MW-06 | adminAuth middleware | token เซ็นด้วย secret อื่น | 401 | ✅ ผ่าน |
| MW-07 | adminAuth middleware | token หมดอายุ | 401 | ✅ ผ่าน |

### 1.12 Unit: สร้าง PDF และส่งเกียรติบัตร — `unit.certificateService.test.js` (4/4 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| CSV-01 | certificateService | generateCertificatePDF คืน Buffer ที่เป็นไฟล์ PDF | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| CSV-02 | certificateService | sendCertificateEmail แนบ PDF และส่งถึงอีเมลผู้ใช้ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| CSV-03 | certificateService | ไม่ได้ตั้งค่า MAIL_USER/MAIL_APP_PASSWORD | throw | ✅ ผ่าน |
| CSV-04 | certificateService | issueCertificate สร้าง PDF แล้วส่งอีเมลในขั้นตอนเดียว | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |

### 1.13 Unit: ส่งข้อความ LINE (แบบเดิม) — `unit.lineNotification.test.js` (5/5 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| LINE-01 | sendLineNotification | ไม่ได้ตั้งค่า token | ข้าม ไม่เรียก API | ✅ ผ่าน |
| LINE-02 | sendLineNotification | ส่งสำเร็จไปยังผู้รับ default พร้อม Bearer token | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| LINE-03 | sendLineNotification | ระบุผู้รับเองจะใช้แทน default | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| LINE-04 | sendLineNotification | ข้อความยาวเกิน 5000 ตัวอักษรถูกตัด | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| LINE-05 | sendLineNotification | LINE API ตอบ error | throw พร้อมรหัสสถานะ | ✅ ผ่าน |

### 1.14 Unit: model ผู้ใช้/เกียรติบัตร — `unit.models.test.js` (6/6 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| MDL-01 | certificateModel | getUserByEmail พบผู้ใช้ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| MDL-02 | certificateModel | getUserByEmail ไม่พบ | null | ✅ ผ่าน |
| MDL-03 | certificateModel | incrementSuccessfulReturnsByEmail คืนค่าที่อัปเดตแล้ว | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| MDL-04 | certificateModel | incrementSuccessfulReturnsByEmail ไม่พบผู้ใช้ | throw | ✅ ผ่าน |
| MDL-05 | userModels | getUserData คืน rows ทั้งหมด | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| MDL-06 | userModels | getUserData ฐานข้อมูลผิดพลาด | reject ด้วยข้อความ | ✅ ผ่าน |

### 1.15 Unit: ตรวจข้อมูลแบบฟอร์ม — `unit.validation.test.js` (22/22 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| VAL-01 | validateEmail | validateEmail("user@ku.th") === true | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| VAL-02 | validateEmail | validateEmail("  user@ku.th  ") === true | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| VAL-03 | validateEmail | validateEmail("user@ku") === false | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| VAL-04 | validateEmail | validateEmail("userku.th") === false | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| VAL-05 | validateEmail | validateEmail("us er@ku.th") === false | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| VAL-06 | validateEmail | validateEmail("") === false | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| VAL-07 | validateEmail | validateEmail(undefined) === false | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| VAL-08 | validateEmail | validateEmail(12345) === false | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| VAL-09 | validateEmail | อีเมลยาวเกิน 255 ตัวอักษรไม่ผ่าน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| VAL-10 | validateItem | ข้อมูลครบถ้วน | คืนค่าที่ trim แล้ว | ✅ ผ่าน |
| VAL-11 | validateItem | ฟิลด์ที่ไม่บังคับว่าง | null | ✅ ผ่าน |
| VAL-12 | validateItem | ข้อมูลไม่ถูกต้อง {"found_date": "01/09/2026"} | error | ✅ ผ่าน |
| VAL-13 | validateItem | ข้อมูลไม่ถูกต้อง {"found_date": "2026-02-30"} | error | ✅ ผ่าน |
| VAL-14 | validateItem | ข้อมูลไม่ถูกต้อง {"found_date": undefined} | error | ✅ ผ่าน |
| VAL-15 | validateItem | ข้อมูลไม่ถูกต้อง {"item_name": ""} | error | ✅ ผ่าน |
| VAL-16 | validateItem | ข้อมูลไม่ถูกต้อง {"item_name": "   "} | error | ✅ ผ่าน |
| VAL-17 | validateItem | ข้อมูลไม่ถูกต้อง {"item_name": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} | error | ✅ ผ่าน |
| VAL-18 | validateItem | ข้อมูลไม่ถูกต้อง {"item_name": 123} | error | ✅ ผ่าน |
| VAL-19 | validateItem | ข้อมูลไม่ถูกต้อง {"found_location": ""} | error | ✅ ผ่าน |
| VAL-20 | validateItem | ข้อมูลไม่ถูกต้อง {"category": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} | error | ✅ ผ่าน |
| VAL-21 | validateItem | ข้อมูลไม่ถูกต้อง {"description": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} | error | ✅ ผ่าน |
| VAL-22 | validateItem | ใช้กับ lost item (lost_date / lost_location) ได้ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |

## 2. Backend LINE Bot / จับคู่ / จัดการรายการ (node:test (+ PostgreSQL 16 จริง))

ที่อยู่ไฟล์: `FOUNDLOST/backend/test` · คำสั่ง: `npm --prefix FOUNDLOST/backend test`

### 2.1 หน้าจัดการรายการของแอดมิน (สรุป ค้นหา รายละเอียด) — `adminItems.test.js` (10/10 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| NT-01 | สิทธิ์แอดมิน (ตรวจที่ backend) | /admin/items/summary?type=lost ไม่มี token / token ผู้ใช้ทั่วไป | 401 | ✅ ผ่าน |
| NT-02 | สิทธิ์แอดมิน (ตรวจที่ backend) | /admin/items/search?type=lost ไม่มี token / token ผู้ใช้ทั่วไป | 401 | ✅ ผ่าน |
| NT-03 | สิทธิ์แอดมิน (ตรวจที่ backend) | /admin/items/lost/1 ไม่มี token / token ผู้ใช้ทั่วไป | 401 | ✅ ผ่าน |
| NT-04 | GET /admin/items/summary | type ผิด | 400 | ✅ ผ่าน |
| NT-05 | GET /admin/items/summary | นับจากสถานะจริง (open/returned) + 7 วันล่าสุด และคืนหมวดที่มีในรายการ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-06 | GET /admin/items/search | ค้นหา + ตัวกรองทั้งหมด | SQL ใช้พารามิเตอร์ (ไม่ต่อสตริง) และแบ่งหน้าได้ | ✅ ผ่าน |
| NT-07 | GET /admin/items/search | ไม่มีตัวกรอง | ไม่มี WHERE และ limit ถูกจำกัดไม่เกิน 100 | ✅ ผ่าน |
| NT-08 | GET /admin/items/search | สถานะ/วันที่ไม่ถูกต้อง | 400 โดยไม่แตะฐานข้อมูล | ✅ ผ่าน |
| NT-09 | GET /admin/items/:type/:item_id | พบรายการ | ข้อมูล + ผู้ติดต่อ + จำนวนคู่ + ประวัติ (target ของ audit log ตรงกับรายการ) | ✅ ผ่าน |
| NT-10 | GET /admin/items/:type/:item_id | ไม่พบ → 404 / id หรือ type ผิด | 400 | ✅ ผ่าน |

### 2.2 ฟีเจอร์เดิมหลังเพิ่ม LINE (สิทธิ์, การจับคู่) — `existingFeatures.test.js` (9/9 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| NT-11 | POST /lostItem (ระบบเดิม) | ยังต้องเข้าสู่ระบบ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-12 | POST /lostItem (ระบบเดิม) | ข้อมูลไม่ครบ | 400 เหมือนเดิม | ✅ ผ่าน |
| NT-13 | POST /lostItem (ระบบเดิม) | แจ้งของหายสำเร็จ | 201 พร้อม item_id และเรียกจับคู่เบื้องหลังโดยไม่บล็อกการตอบกลับ | ✅ ผ่าน |
| NT-14 | GET /api/my-items/:type/:id/matches (ลิงก์จากข้อความ LINE) | ไม่มี token | 401 | ✅ ผ่าน |
| NT-15 | GET /api/my-items/:type/:id/matches (ลิงก์จากข้อความ LINE) | รายการของผู้อื่น | 404 (query กรองด้วย student_id จาก token เสมอ) | ✅ ผ่าน |
| NT-16 | GET /api/my-items/:type/:id/matches (ลิงก์จากข้อความ LINE) | เจ้าของรายการ | 200 | ✅ ผ่าน |
| NT-17 | GET /api/my-items/:type/:id/matches (ลิงก์จากข้อความ LINE) | พารามิเตอร์แปลกปลอม | 400 | ✅ ผ่าน |
| NT-18 | sendLineNotification (ฟีดแจ้งผู้ดูแลเดิม) | ไม่ได้ตั้งค่า | skipped ไม่เรียก LINE | ✅ ผ่าน |
| NT-19 | sendLineNotification (ฟีดแจ้งผู้ดูแลเดิม) | ตั้งค่าแล้ว | push ข้อความไปยัง LINE_USER_ID | ✅ ผ่าน |

### 2.3 เชื่อมบัญชี LINE ด้วยรหัสใช้ครั้งเดียว — `lineAccountLinking.test.js` (16/16 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| NT-20 | accountLinking | ยืนยันด้วยรหัสที่ถูกต้อง | เชื่อมบัญชีและเปิดรับแจ้งเตือน | ✅ ผ่าน |
| NT-21 | accountLinking | ดูตัวอย่าง (preview) ไม่ใช้รหัส | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-22 | accountLinking | รหัสใช้ได้ครั้งเดียว | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-23 | accountLinking | รหัสหมดอายุหลังครบเวลา | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-24 | accountLinking | รหัสผิดรูปแบบหรือไม่มีในระบบ | invalid | ✅ ผ่าน |
| NT-25 | accountLinking | ขอรหัสใหม่ | รหัสเก่าใช้ไม่ได้ | ✅ ผ่าน |
| NT-26 | accountLinking | LINE ที่เชื่อมกับบัญชีอื่นแล้ว ไม่ถูกย้ายไปบัญชีใหม่โดยอัตโนมัติ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-27 | accountLinking | บัญชีที่เชื่อม LINE หนึ่งแล้ว เชื่อม LINE อื่นซ้ำไม่ได้ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-28 | accountLinking | ยกเลิกการเชื่อมแล้วเชื่อมใหม่ได้ / เชื่อมซ้ำกับบัญชีเดิมได้ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-29 | accountLinking | ผู้ใช้ที่ยกเลิกการเป็นเพื่อนแล้วใช้ลิงก์ไม่ได้ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-30 | /api/line API (ต้องเข้าสู่ระบบ) | ไม่มี token / token ปลอม | 401 | ✅ ผ่าน |
| NT-31 | /api/line API (ต้องเข้าสู่ระบบ) | เชื่อมบัญชีใช้ student_id จาก JWT เท่านั้น (ไม่รับจาก body) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-32 | /api/line API (ต้องเข้าสู่ระบบ) | รหัสหมดอายุ/ใช้แล้ว ได้ข้อความภาษาไทยและ code ที่ชัดเจน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-33 | /api/line API (ต้องเข้าสู่ระบบ) | ปิดการแจ้งเตือน / ยกเลิกการเชื่อม ทำได้เฉพาะบัญชีตัวเอง | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-34 | /api/line API (ต้องเข้าสู่ระบบ) | GET /api/line/info เปิดได้โดยไม่ต้องเข้าสู่ระบบ และไม่มีข้อมูลลับ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-35 | /api/line API (ต้องเข้าสู่ระบบ) | ประวัติการแจ้งเตือน LINE แสดงเฉพาะของผู้ใช้คนนั้น | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |

### 2.4 แจ้งเตือนจับคู่ทาง LINE (กันซ้ำ, ส่งใหม่) — `lineMatchNotification.test.js` (14/14 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| NT-36 | Matching Algorithm เดิม (services/matching.js) | ของหายกับของพบที่ชื่อ/หมวด/สถานที่/วันใกล้กัน ได้คะแนนสูงพร้อมเหตุผล | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-37 | Matching Algorithm เดิม (services/matching.js) | findMatches ค้นเฉพาะโพสต์ฝั่งตรงข้ามที่ยังเปิด ไม่รวมโพสต์ของตัวเอง และกรองตามคะแนน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-38 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | ของหายใหม่ที่มีของพบตรงกัน | push LINE ถึงเจ้าของ พร้อมรายละเอียดและปุ่มเปิดเว็บ | ✅ ผ่าน |
| NT-39 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | ของพบใหม่ | แจ้งเจ้าของโพสต์ของหายที่อาจตรงกัน | ✅ ผ่าน |
| NT-40 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | ไม่พบคู่ที่ผ่านเกณฑ์ | ไม่ส่งแจ้งเตือนใด ๆ | ✅ ผ่าน |
| NT-41 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | คู่รายการเดิมแจ้งเพียงครั้งเดียว แม้จับคู่ซ้ำ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-42 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | ผู้ใช้ที่ยังไม่เชื่อม LINE / ปิดแจ้งเตือน / ยกเลิกเพื่อน | ได้เฉพาะแจ้งเตือนในเว็บ | ✅ ผ่าน |
| NT-43 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | ยังไม่ได้ตั้งค่า LINE | ข้ามการส่ง (ไม่แสร้งว่าส่งสำเร็จ) แต่แจ้งเตือนในเว็บยังทำงาน | ✅ ผ่าน |
| NT-44 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | LINE ตอบ 500 → บันทึกข้อผิดพลาดและนัดลองใหม่ด้วย retry key เดิม | สำเร็จ | ✅ ผ่าน |
| NT-45 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | ผลไม่แน่ชัด (timeout) | ลองใหม่ได้ และถ้า LINE รับไปแล้ว (409 + accepted id) ถือว่าส่งสำเร็จโดยไม่ส่งซ้ำ | ✅ ผ่าน |
| NT-46 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | LINE ตอบ 400 (คำขอผิด) | failed ไม่ลองใหม่ | ✅ ผ่าน |
| NT-47 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | ลองใหม่ครบจำนวนครั้ง | failed | ✅ ผ่าน |
| NT-48 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | ระหว่างรอลองใหม่ ผู้ใช้ยกเลิกการเชื่อม | ไม่ส่ง | ✅ ผ่าน |
| NT-49 | แจ้งเตือนเมื่อมีคู่รายการใหม่ | LINE ล่มไม่ทำให้การแจ้งเตือนในเว็บหรือการสร้างโพสต์ล้มเหลว | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |

### 2.5 SQL ของ LINE กับ PostgreSQL 16 จริง — `lineRepository.pg.test.js` (6/6 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| NT-50 | lineRepository (PostgreSQL) | follow → link → unfollow | unlink ด้วย SQL จริง | ✅ ผ่าน |
| NT-51 | lineRepository (PostgreSQL) | รหัสที่หมดอายุแล้วใช้ไม่ได้ (ข้อมูลจริงในฐานข้อมูล) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-52 | lineRepository (PostgreSQL) | webhook event ซ้ำถูกตรวจพบ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-53 | lineRepository (PostgreSQL) | คู่รายการเดิมบันทึกได้ครั้งเดียว และผูกกับการส่ง LINE ได้ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-54 | lineRepository (PostgreSQL) | retry: จองงานที่ถึงเวลา (SKIP LOCKED) | sent | ✅ ผ่าน |
| NT-55 | lineRepository (PostgreSQL) | ลบผู้ใช้/รายการ ไม่ทำให้ข้อมูลค้างผิดรูป (foreign keys) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |

### 2.6 Rich Menu 2×3 — `lineRichMenu.test.js` (9/9 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| NT-56 | โครง Rich Menu | 6 ช่อง 2 แถว × 3 คอลัมน์ ครอบเต็มภาพ 2500×1686 ไม่ซ้อนกัน และเปิด URL จาก APP_BASE_URL | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-57 | โครง Rich Menu | ไม่มี APP_BASE_URL หรือ URL ไม่ถูกต้อง | แจ้งข้อผิดพลาด ไม่เดา URL | ✅ ผ่าน |
| NT-58 | โครง Rich Menu | path ในเมนูมีอยู่จริงใน frontend/src/App.jsx | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-59 | โครง Rich Menu | ภาพเมนูที่เตรียมไว้ถูกขนาดและไม่เกิน 1 MB / ภาพผิดขนาดถูกปฏิเสธ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-60 | deployRichMenu | ครั้งแรก: สร้างเมนู อัปโหลดภาพ และตั้งเป็นเมนูเริ่มต้น | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-61 | deployRichMenu | รันซ้ำโดยไม่มีการเปลี่ยนแปลง: ไม่สร้างเมนูซ้ำ ไม่อัปโหลดซ้ำ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-62 | deployRichMenu | เมนูเดิมที่ภาพยังไม่ถูกอัปโหลด (รอบก่อนล้มเหลว) | อัปโหลดภาพให้ | ✅ ผ่าน |
| NT-63 | deployRichMenu | อัปเดต URL: สร้างเวอร์ชันใหม่ ตั้งเป็นค่าเริ่มต้น และลบเฉพาะเวอร์ชันเก่าของระบบนี้ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-64 | deployRichMenu | อัปโหลดภาพไม่สำเร็จ | ลบเมนูที่เพิ่งสร้าง ไม่ทิ้ง resource ค้าง | ✅ ผ่าน |

### 2.7 LINE webhook: ตรวจลายเซ็น, follow/unfollow, คำสั่ง — `lineWebhook.test.js` (13/13 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| NT-65 | X-Line-Signature | ลายเซ็นที่ถูกต้องผ่านการตรวจ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-66 | X-Line-Signature | ลายเซ็นผิด / secret ผิด / body ถูกแก้ / ไม่มีลายเซ็น ไม่ผ่าน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-67 | POST /api/line/webhook | ลายเซ็นไม่ถูกต้อง | 401 และไม่ประมวลผล event | ✅ ผ่าน |
| NT-68 | POST /api/line/webhook | ไม่มี header ลายเซ็น | 401 | ✅ ผ่าน |
| NT-69 | POST /api/line/webhook | ยังไม่ได้ตั้ง LINE_CHANNEL_SECRET | 503 (ไม่รับ webhook ที่ตรวจสอบไม่ได้) | ✅ ผ่าน |
| NT-70 | POST /api/line/webhook | ปุ่ม Verify ของ LINE (events ว่าง) | 200 | ✅ ผ่าน |
| NT-71 | POST /api/line/webhook | follow: ตอบ 200 ก่อน แล้วบันทึกบัญชีและส่งข้อความต้อนรับพร้อมปุ่มเชื่อมบัญชี | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-72 | POST /api/line/webhook | follow ของผู้ที่เชื่อมบัญชีแล้ว | ข้อความต้อนรับกลับ ไม่ออกรหัสใหม่ | ✅ ผ่าน |
| NT-73 | POST /api/line/webhook | unfollow: ปิดสถานะการเป็นเพื่อน คงการเชื่อมบัญชีไว้ และยกเลิกรหัสที่ยังไม่ได้ใช้ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-74 | POST /api/line/webhook | event ที่ LINE ส่งซ้ำ (webhookEventId เดิม) ประมวลผลครั้งเดียว | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-75 | POST /api/line/webhook | พิมพ์ "เชื่อมบัญชี" → ได้ลิงก์ใหม่ / "ยกเลิกการเชื่อม" | ยกเลิกการเชื่อม | ✅ ผ่าน |
| NT-76 | POST /api/line/webhook | ข้อความอื่นได้คำแนะนำการใช้งาน และ event จากกลุ่มถูกข้าม | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| NT-77 | POST /api/line/webhook | ตอบกลับไม่สำเร็จ (reply token หมดอายุ) ไม่ทำให้การบันทึกล้มเหลว | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |

## 3. Frontend หน้าเว็บและคอมโพเนนต์ (Vitest + React Testing Library)

ที่อยู่ไฟล์: `testcase/frontend/tests` · คำสั่ง: `npm --prefix testcase/frontend test`

### 3.1 axios ของแอดมิน (แนบ token, 401) — `adminApi.test.js` (6/6 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-API-01 | adminApi | baseURL ชี้ไปที่ backend http://localhost:3000 | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-API-02 | adminApi | มี adminToken | แนบ Authorization: Bearer <token> | ✅ ผ่าน |
| FE-API-03 | adminApi | ไม่มี token | ไม่แนบ Authorization | ✅ ผ่าน |
| FE-API-04 | adminApi | ได้ 401 | ลบ token/email และพาไป /admin/login | ✅ ผ่าน |
| FE-API-05 | adminApi | ได้ 401 ขณะอยู่หน้า login อยู่แล้ว | ไม่ redirect ซ้ำ | ✅ ผ่าน |
| FE-API-06 | adminApi | error อื่น (500) | ไม่ลบ token | ✅ ผ่าน |

### 3.2 หน้าแอดมิน: แดชบอร์ด, ผู้ใช้ — `adminPages.test.jsx` (18/18 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-AD-01 | Dashboard | แสดงสถิติภาพรวม 8 ช่องจาก /admin/dashboard/stats | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-AD-10 | Dashboard | การ์ดตัวเลขหลัก: โพสต์ทั้งหมด, ผู้ใช้ใหม่เทียบวันก่อน, รายงานค้าง | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-AD-11 | Dashboard | เปลี่ยนช่วงกราฟเป็น 7 วัน | เรียก trend ด้วย range=7d | ✅ ผ่าน |
| FE-AD-02 | Dashboard | กดช่อง 'จำนวนผู้ใช้งานทั้งหมด' | ไป /admin/users | ✅ ผ่าน |
| FE-AD-02 | Dashboard | กดช่อง 'แจ้งของหาย' | ไป /admin/lost-items | ✅ ผ่าน |
| FE-AD-02 | Dashboard | กดช่อง 'พบของแล้ว' | ไป /admin/found-items | ✅ ผ่าน |
| FE-AD-02 | Dashboard | กดช่อง 'รายงานที่รอดำเนินการ' | ไป /admin/reports | ✅ ผ่าน |
| FE-AD-03 | Dashboard | โหลดไม่สำเร็จ | แสดงข้อความ error | ✅ ผ่าน |
| FE-AD-04 | Users | แสดงรายชื่อ, จำนวนทั้งหมด และสถานะ ใช้งานปกติ / ถูกแบน / ถูกระงับ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-AD-05 | Users | พิมพ์ค้นหา | เรียก API พร้อมพารามิเตอร์ q | ✅ ผ่าน |
| FE-AD-06 | Users | แถว สมชาย กดปุ่ม ออกคำเตือน | POST action ที่ถูกต้อง | ✅ ผ่าน |
| FE-AD-06 | Users | แถว สมชาย กดปุ่ม แบนถาวร | POST action ที่ถูกต้อง | ✅ ผ่าน |
| FE-AD-06 | Users | แถว สมหญิง กดปุ่ม ยกเลิกการแบน | POST action ที่ถูกต้อง | ✅ ผ่าน |
| FE-AD-06 | Users | แถว มานะ กดปุ่ม ยกเลิกการระงับ | POST action ที่ถูกต้อง | ✅ ผ่าน |
| FE-AD-07 | Users | ระงับบัญชี 7 วันผ่านหน้าต่างยืนยัน (ตัวเลือกวันมาจากค่าระบบ) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-AD-12 | Users | ตัวเลือกวันระงับตามค่าระบบที่แอดมินตั้ง (เช่น 1/14 วัน) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-AD-08 | Users | ดำเนินการไม่สำเร็จ | alert ข้อความจาก server | ✅ ผ่าน |
| FE-AD-09 | Users | ไม่มีผู้ใช้ | แสดง 'ไม่พบผู้ใช้' | ✅ ผ่าน |

### 3.3 เข้าสู่ระบบ OTP, สมัคร, แอดมินล็อกอิน, หน้าโหลด — `auth.test.jsx` (25/25 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-LG-01 | Login (OTP) | หน้าแรกแสดงโลโก้ ช่องอีเมล และปุ่มลงชื่อเข้าใช้ ตามดีไซน์ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-LG-02 | Login (OTP) | ส่ง OTP สำเร็จ | เรียก /api/send-otp แล้วเปลี่ยนเป็นขั้นตอนกรอก OTP | ✅ ผ่าน |
| FE-LG-03 | Login (OTP) | ส่ง OTP ไม่สำเร็จ (เช่น บัญชีถูกระงับ) | แสดงข้อความจาก server และอยู่ขั้นตอนอีเมล | ✅ ผ่าน |
| FE-LG-04 | Login (OTP) | เชื่อมต่อ server ไม่ได้ | 'ไม่สามารถส่ง OTP ได้' | ✅ ผ่าน |
| FE-LG-05 | Login (OTP) | ช่อง OTP รับเฉพาะตัวเลข และปุ่มยืนยันกดได้เมื่อครบ 6 หลัก | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-LG-06 | Login (OTP) | OTP ถูกต้อง | เก็บสถานะ login และไป /home หลัง 2 วินาที | ✅ ผ่าน |
| FE-LG-07 | Login (OTP) | OTP ผิดหรือหมดอายุ | 'OTP ไม่ถูกต้องหรือหมดอายุ' และไม่ login | ✅ ผ่าน |
| FE-LG-08 | Login (OTP) | OTP ถูกแต่บัญชีถูกแบน | แสดงข้อความจาก server | ✅ ผ่าน |
| FE-LG-09 | Login (OTP) | ปุ่มย้อนกลับในขั้นตอน OTP | กลับไปแก้อีเมล (อีเมลเดิมยังอยู่) | ✅ ผ่าน |
| FE-LG-10 | Login (OTP) | 'ส่งรหัสอีกครั้ง' | เรียก /api/send-otp ซ้ำ | ✅ ผ่าน |
| FE-LG-11 | Login (OTP) | ยังไม่ได้ตั้งค่า Google Sign-In | ไม่มีปุ่ม Google | ✅ ผ่าน |
| FE-LG-12 | Login (OTP) | มีข้อความส่งมาจากหน้าก่อน (location.state.message) | แสดงบนหน้า | ✅ ผ่าน |
| FE-LG-13 | Login (OTP) | ลิงก์ 'สมัครสมาชิก' | ไป /signup | ✅ ผ่าน |
| FE-LG-14 | Login (OTP) | ลิงก์ 'เข้าสู่ระบบแอดมิน' | ไป /admin/login | ✅ ผ่าน |
| FE-SU-01 | SignUp | สมัครสำเร็จ | ไป /login พร้อมข้อความสำเร็จ | ✅ ผ่าน |
| FE-SU-02 | SignUp | อีเมลซ้ำ | แสดงข้อความจาก server และอยู่หน้าเดิม | ✅ ผ่าน |
| FE-SU-03 | SignUp | ช่องที่ต้องกรอกว่าง | form ไม่ถูกส่ง (HTML required) | ✅ ผ่าน |
| FE-SU-04 | SignUp | ลิงก์ 'เข้าสู่ระบบ' | ไป /login | ✅ ผ่าน |
| FE-AL-01 | AdminLogin | login สำเร็จ | เก็บ adminToken/adminEmail และไป /admin/dashboard | ✅ ผ่าน |
| FE-AL-02 | AdminLogin | รหัสผ่านผิด | แสดงข้อความ error | ✅ ผ่าน |
| FE-AL-03 | AdminLogin | ลิงก์ 'กลับสู่หน้าหลัก' | ไป /login | ✅ ผ่าน |
| FE-AL-04 | AdminLogin | แสดงโลโก้ หัวข้อ 'KU Lost & Found' และช่อง Username/Password ที่จำเป็นต้องกรอก | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-AL-05 | AdminLogin | ปุ่มรูปตา | สลับแสดง/ซ่อนรหัสผ่าน | ✅ ผ่าน |
| FE-AL-06 | AdminLogin | ระหว่างส่ง | ปุ่มแสดง 'กำลังเข้าสู่ระบบ...' และกดซ้ำไม่ได้ | ✅ ผ่าน |
| FE-LD-01 | Loading | แสดงโลโก้ และพาไป /login อัตโนมัติหลัง 5 วินาที | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |

### 3.4 คอมโพเนนต์ร่วมและข้อมูลคงที่ — `components.test.jsx` (34/34 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-CP-01 | SuspendModal | แสดงชื่อผู้ใช้ และค่าเริ่มต้นคือระงับ 3 วัน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-CP-02 | SuspendModal | เลือก 7 วัน | onConfirm({"action":"suspend","duration_days":7}) | ✅ ผ่าน |
| FE-CP-02 | SuspendModal | เลือก 30 วัน | onConfirm({"action":"suspend","duration_days":30}) | ✅ ผ่าน |
| FE-CP-02 | SuspendModal | เลือก ถาวร (แบน) | onConfirm({"action":"ban"}) | ✅ ผ่าน |
| FE-CP-03 | SuspendModal | กดยกเลิก | onCancel และไม่ยืนยัน | ✅ ผ่าน |
| FE-CP-04 | SuspendModal | ระหว่างส่ง (submitting) | ปุ่มยืนยันถูกปิด | ✅ ผ่าน |
| FE-CP-12 | SuspendModal | โหลดค่าระบบไม่ได้ | ใช้ตัวเลือกเริ่มต้น 3/7/30 วัน | ✅ ผ่าน |
| FE-CP-05 | StatTile | มี onClick | เป็นปุ่มที่กดได้ | ✅ ผ่าน |
| FE-CP-06 | StatTile | ไม่มี onClick | ไม่ใช่ปุ่ม | ✅ ผ่าน |
| FE-CP-13 | StatTile | wrapLabel | ป้ายขึ้นได้ 2 บรรทัด (การ์ดแคบบนมือถือ) | ✅ ผ่าน |
| FE-CP-07 | BottomNav (มือถือ) | แท็บ หน้าหลัก / ค้นหา / แจ้งเตือน / ตั้งค่า ลิงก์ถูกต้อง และไฮไลต์หน้าปัจจุบัน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-CP-14 | BottomNav (มือถือ) | หน้าโปรไฟล์/โพสต์ของฉันอยู่ใต้แท็บ 'ตั้งค่า' | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-CP-15 | BottomNav (มือถือ) | แสดงจำนวนแจ้งเตือนที่ยังไม่อ่านจาก /api/inbox | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-CP-16 | BottomNav (มือถือ) | ปุ่ม + กลาง | เรียก onReport | ✅ ผ่าน |
| FE-CP-17 | สถานะโพสต์ (itemStatus) | {"status":"returned","type":"lost"} | returned | ✅ ผ่าน |
| FE-CP-17 | สถานะโพสต์ (itemStatus) | {"status":"open","type":"lost","pending_claims":2} | contacted | ✅ ผ่าน |
| FE-CP-17 | สถานะโพสต์ (itemStatus) | {"status":"open","type":"found"} | waiting | ✅ ผ่าน |
| FE-CP-17 | สถานะโพสต์ (itemStatus) | {"status":"open","type":"lost"} | searching | ✅ ผ่าน |
| FE-CP-18 | ประกาศ (AnnouncementCard / announcementTypes) | ประเภท info | หัวข้อ 'ประกาศ' | ✅ ผ่าน |
| FE-CP-18 | ประกาศ (AnnouncementCard / announcementTypes) | ประเภท important | หัวข้อ 'ประกาศสำคัญ' | ✅ ผ่าน |
| FE-CP-18 | ประกาศ (AnnouncementCard / announcementTypes) | ประเภท maintenance | หัวข้อ 'แจ้งปิดปรับปรุงระบบ' | ✅ ผ่าน |
| FE-CP-18 | ประกาศ (AnnouncementCard / announcementTypes) | ประเภท warning | หัวข้อ 'โปรดทราบ' | ✅ ผ่าน |
| FE-CP-18 | ประกาศ (AnnouncementCard / announcementTypes) | ประเภท success | หัวข้อ 'ข่าวดี' | ✅ ผ่าน |
| FE-CP-18 | ประกาศ (AnnouncementCard / announcementTypes) | ประเภท unknown-tone | หัวข้อ 'ประกาศ' | ✅ ผ่าน |
| FE-CP-19 | ประกาศ (AnnouncementCard / announcementTypes) | ช่วงวันที่ {"starts_on":"2026-10-14","ends_on":"2026-10-14"} | เฉพาะวันที่ 14 ต.ค. 2569 (ปี พ.ศ.) | ✅ ผ่าน |
| FE-CP-19 | ประกาศ (AnnouncementCard / announcementTypes) | ช่วงวันที่ {"starts_on":"2026-10-01","ends_on":"2026-10-31"} | 1 ต.ค. 2569 – 31 ต.ค. 2569 (ปี พ.ศ.) | ✅ ผ่าน |
| FE-CP-19 | ประกาศ (AnnouncementCard / announcementTypes) | ช่วงวันที่ {"ends_on":"2026-12-31"} | ถึง 31 ธ.ค. 2569 (ปี พ.ศ.) | ✅ ผ่าน |
| FE-CP-19 | ประกาศ (AnnouncementCard / announcementTypes) | ช่วงวันที่ {"starts_on":"2026-01-05"} | ตั้งแต่ 5 ม.ค. 2569 (ปี พ.ศ.) | ✅ ผ่าน |
| FE-CP-19 | ประกาศ (AnnouncementCard / announcementTypes) | ช่วงวันที่ {} | null (ปี พ.ศ.) | ✅ ผ่าน |
| FE-CP-20 | ประกาศ (AnnouncementCard / announcementTypes) | การ์ดประกาศแสดงหัวข้อ ข้อความ ช่วงวันที่ และปุ่มปิด | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-CP-21 | การแสดงผล (displayPrefs) | เลือกโหมดมืด + ตัวอักษรใหญ่ | ตั้ง data-theme/font-size ที่ <html> และจำไว้ในเครื่อง | ✅ ผ่าน |
| FE-CP-09 | ข้อมูลคงที่ | campusLocations: มีชื่อ และพิกัดอยู่ในพื้นที่ ม.เกษตร กำแพงแสน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-CP-10 | ข้อมูลคงที่ | campusLocations: ชื่อสถานที่ไม่ซ้ำกัน (ใช้เป็น React key) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-CP-11 | ข้อมูลคงที่ | หมวดหมู่เริ่มต้นมี 'อื่น ๆ' และหมวดใหม่จากแอดมินได้ไอคอนทั่วไป | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |

### 3.5 ปุ่ม Google ในหน้าเข้าสู่ระบบ/สมัคร (2 ขั้น) — `googleSignIn.test.jsx` (9/9 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-GG-01 | GoogleSignInButton ในหน้าเข้าสู่ระบบ | ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID | ไม่แสดงปุ่ม Google และคำว่า 'หรือ' | ✅ ผ่าน |
| FE-GG-02 | GoogleSignInButton ในหน้าเข้าสู่ระบบ | ตั้งค่าแล้ว | สร้างปุ่มด้วย Client ID จากค่าระบบ แบบ popup ภาษาไทย | ✅ ผ่าน |
| FE-GG-03 | GoogleSignInButton ในหน้าเข้าสู่ระบบ | ยืนยัน Google สำเร็จ | ส่ง credential ไป backend แล้วเปลี่ยนเป็นขั้นตอนกรอก OTP (ยังไม่เข้าสู่ระบบ) | ✅ ผ่าน |
| FE-GG-04 | GoogleSignInButton ในหน้าเข้าสู่ระบบ | ขั้นที่ 2 กรอก OTP ถูก | verify-otp ด้วยอีเมล Google, บันทึก session และไปหน้าหลัก | ✅ ผ่าน |
| FE-GG-05 | GoogleSignInButton ในหน้าเข้าสู่ระบบ | ขอรหัสซ้ำเร็วเกินไป (retry_after) | แจ้งให้ใช้รหัสล่าสุดในอีเมล | ✅ ผ่าน |
| FE-GG-06 | GoogleSignInButton ในหน้าเข้าสู่ระบบ | backend ปฏิเสธ (เช่น บัญชีถูกแบน) | แสดงข้อความ และอยู่ขั้นตอนอีเมล | ✅ ผ่าน |
| FE-GG-07 | GoogleSignInButton ในหน้าเข้าสู่ระบบ | เปิดหน้าเข้าสู่ระบบพร้อม otpEmail (มาจากหน้าสมัคร) | เริ่มที่ขั้นตอนกรอก OTP | ✅ ผ่าน |
| FE-GG-08 | GoogleSignInButton ในหน้าสมัครสมาชิก | สมัครด้วย Google (created=true) | ไปหน้าเข้าสู่ระบบขั้นตอน OTP พร้อมข้อความ | ✅ ผ่าน |
| FE-GG-08 | GoogleSignInButton ในหน้าสมัครสมาชิก | สมัครด้วย Google (created=false) | ไปหน้าเข้าสู่ระบบขั้นตอน OTP พร้อมข้อความ | ✅ ผ่าน |

### 3.6 หน้าหลัก — `home.test.jsx` (22/22 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-HM-01 | Home | แสดงหัวข้อ ช่องค้นหา คำทักทายจากโปรไฟล์ และเมนูหลัก | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-HM-02 | Home | โหลดโปรไฟล์ไม่ได้ | ทักทายด้วยชื่อจากอีเมล | ✅ ผ่าน |
| FE-HM-03 | Home | รวมของพบและของหาย เรียงจากใหม่ไปเก่า การ์ดมีป้าย เวลา หมวด สถานที่ และรูป | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-HM-04 | Home | แท็บประเภท: ของหาย / ของที่พบ พร้อมจำนวน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-HM-05 | Home | ค้นหาด่วน 'กระเป๋า' | กรองตามหมวด/ชื่อ | ✅ ผ่าน |
| FE-HM-05 | Home | ค้นหาด่วน 'Key' | กรองตามหมวด/ชื่อ | ✅ ผ่าน |
| FE-HM-05 | Home | ค้นหาด่วน 'อิเล็กทรอนิกส์' | กรองตามหมวด/ชื่อ | ✅ ผ่าน |
| FE-HM-05 | Home | ค้นหาด่วน 'เอกสาร' | กรองตามหมวด/ชื่อ | ✅ ผ่าน |
| FE-HM-05 | Home | ค้นหาด่วน 'อื่นๆ' | กรองตามหมวด/ชื่อ | ✅ ผ่าน |
| FE-HM-06 | Home | พิมพ์ค้นหา | กรองตามชื่อ/สถานที่ ไม่พบแสดงข้อความ | ✅ ผ่าน |
| FE-HM-07 | Home | เกิน 8 รายการ | แบ่งหน้า กดถัดไป/เลขหน้าได้ และปุ่มก่อนหน้าปิดในหน้าแรก | ✅ ผ่าน |
| FE-HM-08 | Home | เปลี่ยนตัวกรองขณะอยู่หน้า 2 | กลับไปหน้า 1 | ✅ ผ่าน |
| FE-HM-09 | Home | ไม่เกิน 8 รายการ | ไม่แสดงเลขหน้า | ✅ ผ่าน |
| FE-HM-10 | Home | กดการ์ดของคนอื่น | ป๊อปอัพรายละเอียด มีปุ่ม 'นี่ของฉัน' และ 'รายงานโพสต์นี้' | ✅ ผ่าน |
| FE-HM-15 | Home | กดการ์ดโพสต์ของตัวเอง | แสดงลิงก์จัดการโพสต์ ไม่มีปุ่มรายงาน | ✅ ผ่าน |
| FE-HM-16 | Home | ติดต่อเจ้าของ ('นี่ของฉัน') | POST /api/claims แล้วแสดงช่องทางติดต่อ | ✅ ผ่าน |
| FE-HM-11 | Home | ปุ่มแจ้งสิ่งของ | ป๊อปอัพ มีการ์ดของหาย / ของที่พบ ไปหน้าฟอร์มที่ถูกต้อง | ✅ ผ่าน |
| FE-HM-14 | Home | ปิดป๊อปอัพแจ้งสิ่งของด้วยปุ่ม X | อยู่หน้าหลักเหมือนเดิม | ✅ ผ่าน |
| FE-HM-14 | Home | ปิดป๊อปอัพแจ้งสิ่งของด้วยกด Esc | อยู่หน้าหลักเหมือนเดิม | ✅ ผ่าน |
| FE-HM-14 | Home | ปิดป๊อปอัพแจ้งสิ่งของด้วยคลิกพื้นหลัง | อยู่หน้าหลักเหมือนเดิม | ✅ ผ่าน |
| FE-HM-12 | Home | API ล้มเหลว | แสดง 'ยังไม่มีรายการ' หน้าไม่พัง | ✅ ผ่าน |
| FE-HM-13 | Home | ออกจากระบบ | ถามยืนยันก่อน, ยืนยันแล้วล้าง session และไป /login | ✅ ผ่าน |

### 3.7 หน้ารายการของที่พบ/ของหาย — `itemPages.test.jsx` (14/14 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-IP-01 | FoundPage | โหลดรายการจาก API และแสดงจำนวน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-IP-02 | FoundPage | ค้นหาด้วยชื่อสิ่งของ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-IP-03 | FoundPage | กรองหมวดหมู่ 'อื่นๆ' | รวมหมวดที่ไม่อยู่ในรายการหลัก | ✅ ผ่าน |
| FE-IP-04 | FoundPage | โพสต์ของตัวเอง | ป๊อปอัพไม่มีปุ่ม 'รายงานโพสต์นี้' | ✅ ผ่าน |
| FE-IP-05 | FoundPage | กด 'รายงานโพสต์นี้' | ไปหน้า /report พร้อมข้อมูลรายการ | ✅ ผ่าน |
| FE-IP-06 | FoundPage | รายการที่คืนของแล้ว | การ์ดมีป้าย 'คืนของสำเร็จ' และป๊อปอัพแจ้งว่าปิดโพสต์แล้ว | ✅ ผ่าน |
| FE-IP-07 | FoundPage | API ล้มเหลว | 0 รายการ และหน้าไม่พัง | ✅ ผ่าน |
| FE-IP-01 | LostPage | โหลดรายการจาก API และแสดงจำนวน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-IP-02 | LostPage | ค้นหาด้วยชื่อสิ่งของ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-IP-03 | LostPage | กรองหมวดหมู่ 'อื่นๆ' | รวมหมวดที่ไม่อยู่ในรายการหลัก | ✅ ผ่าน |
| FE-IP-04 | LostPage | โพสต์ของตัวเอง | ป๊อปอัพไม่มีปุ่ม 'รายงานโพสต์นี้' | ✅ ผ่าน |
| FE-IP-05 | LostPage | กด 'รายงานโพสต์นี้' | ไปหน้า /report พร้อมข้อมูลรายการ | ✅ ผ่าน |
| FE-IP-06 | LostPage | รายการที่คืนของแล้ว | การ์ดมีป้าย 'คืนของสำเร็จ' และป๊อปอัพแจ้งว่าปิดโพสต์แล้ว | ✅ ผ่าน |
| FE-IP-07 | LostPage | API ล้มเหลว | 0 รายการ และหน้าไม่พัง | ✅ ผ่าน |

### 3.8 ออกจากระบบ (ผู้ใช้/แอดมิน) — `logout.test.jsx` (11/11 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-LO-01 | ConfirmLogoutModal | ปิดอยู่ (open=false) | ไม่แสดงอะไร | ✅ ผ่าน |
| FE-LO-02 | ConfirmLogoutModal | แสดงคำถามยืนยัน และโฟกัสปุ่ม 'ยกเลิก' ไว้ก่อน (กัน Enter ออกโดยไม่ตั้งใจ) | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-LO-03 | ConfirmLogoutModal | กด 'ออกจากระบบ' | onConfirm | ✅ ผ่าน |
| FE-LO-04 | ConfirmLogoutModal | กด 'ยกเลิก' | onCancel และไม่ออกจากระบบ | ✅ ผ่าน |
| FE-LO-04 | ConfirmLogoutModal | กด Esc | onCancel และไม่ออกจากระบบ | ✅ ผ่าน |
| FE-LO-04 | ConfirmLogoutModal | คลิกพื้นหลังนอกกล่อง | onCancel และไม่ออกจากระบบ | ✅ ผ่าน |
| FE-LO-05 | ConfirmLogoutModal | คลิกภายในกล่อง | ไม่ปิด | ✅ ผ่าน |
| FE-LO-06 | UserLayout (ฝั่งผู้ใช้) | กดออกจากระบบแล้วยกเลิก | session ยังอยู่ และอยู่หน้าเดิม | ✅ ผ่าน |
| FE-LO-07 | UserLayout (ฝั่งผู้ใช้) | ยืนยันออกจากระบบ | ล้าง token/อีเมล/รหัสนิสิต และไป /login | ✅ ผ่าน |
| FE-LO-09 | AdminLayout | แอดมินกดออกจากระบบแล้วยกเลิก | token ยังอยู่ | ✅ ผ่าน |
| FE-LO-10 | AdminLayout | แอดมินยืนยันออกจากระบบ | ลบ token และไป /admin/login | ✅ ผ่าน |

### 3.9 หน้าการแจ้งเตือน — `notifications.test.jsx` (8/8 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-NT-01 | Notifications | แสดงรายการแจ้งเตือนและจำนวนที่ยังไม่อ่าน | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-NT-02 | Notifications | แท็บ 'ยังไม่อ่าน' | กรองตามประเภท | ✅ ผ่าน |
| FE-NT-02 | Notifications | แท็บ 'อาจตรงกัน' | กรองตามประเภท | ✅ ผ่าน |
| FE-NT-02 | Notifications | แท็บ 'สถานะรายการ' | กรองตามประเภท | ✅ ผ่าน |
| FE-NT-02 | Notifications | แท็บ 'ระบบ' | กรองตามประเภท | ✅ ผ่าน |
| FE-NT-03 | Notifications | กดรายการที่ยังไม่อ่าน | ทำเครื่องหมายอ่านแล้ว และเปิดลิงก์ | ✅ ผ่าน |
| FE-NT-04 | Notifications | กด 'อ่านทั้งหมด' | POST /api/inbox/read-all | ✅ ผ่าน |
| FE-NT-05 | Notifications | ไม่มีการแจ้งเตือน | แสดงข้อความว่าง | ✅ ผ่าน |

### 3.10 ฟอร์มแจ้งของหาย/แจ้งพบของ — `reportItemForm.test.jsx` (22/22 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-FF-01 | ReportItemForm type=found | แสดงหัวข้อ และช่องที่จำเป็นต้องกรอก | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-FF-02 | ReportItemForm type=found | พิมพ์สถานที่ | แสดงสถานที่ในมหาวิทยาลัยที่ตรงกัน และเลือกได้ | ✅ ผ่าน |
| FE-FF-03 | ReportItemForm type=found | ข้อมูลครบ | POST แบบ multipart พร้อมรูป แล้วแสดงหมายเลขรายการ | ✅ ผ่าน |
| FE-FF-04 | ReportItemForm type=found | ไม่มีชื่อสิ่งของ | แจ้งเตือนและไม่ส่งข้อมูล | ✅ ผ่าน |
| FE-FF-04 | ReportItemForm type=found | วันที่ในอนาคต | แจ้งเตือนและไม่ส่งข้อมูล | ✅ ผ่าน |
| FE-FF-04 | ReportItemForm type=found | ไม่มีสถานที่ | แจ้งเตือนและไม่ส่งข้อมูล | ✅ ผ่าน |
| FE-FF-05 | ReportItemForm type=found | ไม่แนบรูป | แจ้งให้เลือกรูป | ✅ ผ่าน |
| FE-FF-06 | ReportItemForm type=found | ไฟล์ไม่ใช่รูป | แจ้งเตือน | ✅ ผ่าน |
| FE-FF-06 | ReportItemForm type=found | รูปใหญ่เกิน 5 MB | แจ้งเตือน | ✅ ผ่าน |
| FE-FF-07 | ReportItemForm type=found | server ตอบ error | แสดงข้อความจาก server | ✅ ผ่าน |
| FE-FF-08 | ReportItemForm type=found | เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ / หมดเวลา | ข้อความที่ผู้ใช้เข้าใจ | ✅ ผ่าน |
| FE-FF-01 | ReportItemForm type=lost | แสดงหัวข้อ และช่องที่จำเป็นต้องกรอก | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-FF-02 | ReportItemForm type=lost | พิมพ์สถานที่ | แสดงสถานที่ในมหาวิทยาลัยที่ตรงกัน และเลือกได้ | ✅ ผ่าน |
| FE-FF-03 | ReportItemForm type=lost | ข้อมูลครบ | POST แบบ multipart พร้อมรูป แล้วแสดงหมายเลขรายการ | ✅ ผ่าน |
| FE-FF-04 | ReportItemForm type=lost | ไม่มีชื่อสิ่งของ | แจ้งเตือนและไม่ส่งข้อมูล | ✅ ผ่าน |
| FE-FF-04 | ReportItemForm type=lost | วันที่ในอนาคต | แจ้งเตือนและไม่ส่งข้อมูล | ✅ ผ่าน |
| FE-FF-04 | ReportItemForm type=lost | ไม่มีสถานที่ | แจ้งเตือนและไม่ส่งข้อมูล | ✅ ผ่าน |
| FE-FF-05 | ReportItemForm type=lost | ไม่แนบรูป | แจ้งให้เลือกรูป | ✅ ผ่าน |
| FE-FF-06 | ReportItemForm type=lost | ไฟล์ไม่ใช่รูป | แจ้งเตือน | ✅ ผ่าน |
| FE-FF-06 | ReportItemForm type=lost | รูปใหญ่เกิน 5 MB | แจ้งเตือน | ✅ ผ่าน |
| FE-FF-07 | ReportItemForm type=lost | server ตอบ error | แสดงข้อความจาก server | ✅ ผ่าน |
| FE-FF-08 | ReportItemForm type=lost | เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ / หมดเวลา | ข้อความที่ผู้ใช้เข้าใจ | ✅ ผ่าน |

### 3.11 หน้ารายงานโพสต์ — `reportPage.test.jsx` (6/6 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-RP-01 | ReportPage | แสดงข้อมูลรายการที่ถูกรายงาน และเหตุผลให้เลือก 7 ข้อ | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-RP-02 | ReportPage | ไม่เลือกเหตุผล | แจ้งเตือนและไม่ส่งข้อมูล | ✅ ผ่าน |
| FE-RP-03 | ReportPage | ส่งรายงานสำเร็จ | POST /report (multipart) แล้วไปหน้า /report/success พร้อมเลขรายงาน | ✅ ผ่าน |
| FE-RP-04 | ReportPage | server ปฏิเสธ (รายงานโพสต์ตัวเอง) | แสดงข้อความ error | ✅ ผ่าน |
| FE-RP-05 | ReportPage | แนบรูปได้สูงสุด 3 รูป | เป็นไปตามที่ระบุในกรณีทดสอบ | ✅ ผ่าน |
| FE-RP-06 | ReportPage | แนบ 3 รูป | ส่งไปเพียงรูปแรก (พฤติกรรมปัจจุบัน) | ✅ ผ่าน |

### 3.12 การป้องกันหน้า (ต้องเข้าสู่ระบบ) — `routes.test.jsx` (7/7 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-RT-01 | ProtectedRoute | ยังไม่ login | พาไป /login พร้อมข้อความ และจำหน้าที่จะเปิด | ✅ ผ่าน |
| FE-RT-02 | ProtectedRoute | มี token ผู้ใช้ที่ยังไม่หมดอายุ | แสดงเนื้อหา | ✅ ผ่าน |
| FE-RT-03 | ProtectedRoute | มีแค่ isLoggedIn=true แต่ไม่มี token | ถือว่ายังไม่ login | ✅ ผ่าน |
| FE-RT-06 | ProtectedRoute | token หมดอายุ | ล้าง session แล้วพาไป /login | ✅ ผ่าน |
| FE-RT-07 | ProtectedRoute | token รูปแบบเสีย | hasValidUserSession = false | ✅ ผ่าน |
| FE-RT-04 | AdminProtectedRoute | ไม่มี adminToken | ไปหน้า /admin/login | ✅ ผ่าน |
| FE-RT-05 | AdminProtectedRoute | มี adminToken | แสดงเนื้อหา | ✅ ผ่าน |

### 3.13 โหมดปิดปรับปรุง และป้ายประกาศ — `siteSettings.test.jsx` (8/8 ผ่าน)

| รหัส | กลุ่ม | กรณีทดสอบ | ผลที่คาดหวัง | ผล |
|---|---|---|---|---|
| FE-SS-01 | MaintenanceGate | ปิดปรับปรุง | หน้าผู้ใช้แสดงข้อความจากแอดมินแทนเนื้อหา | ✅ ผ่าน |
| FE-SS-02 | MaintenanceGate | ปิดปรับปรุง | หน้าแอดมินยังใช้งานได้ | ✅ ผ่าน |
| FE-SS-03 | MaintenanceGate | แอดมินเปิดระบบแล้ว (โหลดค่าใหม่) | แสดงเนื้อหาตามปกติ | ✅ ผ่าน |
| FE-SS-04 | MaintenanceGate | โหลดค่าระบบไม่ได้ | ใช้ค่าล่าสุดที่โหลดได้ (ไม่ปิดเว็บเอง) | ✅ ผ่าน |
| FE-SS-05 | AnnouncementBanner | มีประกาศ | แสดงหัวข้อตามประเภทและข้อความ | ✅ ผ่าน |
| FE-SS-06 | AnnouncementBanner | กดปิดประกาศ | ซ่อน และจำไว้ (ข้อความเดิมไม่แสดงซ้ำ) | ✅ ผ่าน |
| FE-SS-07 | AnnouncementBanner | ข้อความประกาศเปลี่ยน | แสดงอีกครั้งแม้เคยปิดประกาศเก่า | ✅ ผ่าน |
| FE-SS-08 | AnnouncementBanner | ไม่มีประกาศ | ไม่แสดงอะไร | ✅ ผ่าน |

## 4. กรณีทดสอบด้วยมือ (Manual / End-to-End)

ทดสอบบนเบราว์เซอร์/มือถือจริง กับอีเมลจริงและ LINE Official Account จริง — บันทึกผลในชีต "Manual E2E" ของไฟล์ Excel

| รหัส | หมวด | ความสำคัญ | เงื่อนไขก่อนทดสอบ | ขั้นตอน | ผลที่คาดหวัง | สถานะ |
|---|---|---|---|---|---|---|
| M-01 | ผู้ใช้: บัญชี | สูง | ยังไม่มีบัญชี | เปิด /signup กรอกชื่อ นามสกุล อีเมล แล้วกดสมัคร | กลับหน้าเข้าสู่ระบบพร้อมข้อความสมัครสำเร็จ | ⬜ ยังไม่ทดสอบ |
| M-02 | ผู้ใช้: บัญชี | กลาง | มีบัญชีอีเมลนี้แล้ว | สมัครด้วยอีเมลเดิมอีกครั้ง | แจ้ง "รหัสนิสิตหรืออีเมลนี้มีอยู่ในระบบแล้ว" | ⬜ ยังไม่ทดสอบ |
| M-31 | ผู้ใช้: Google | สูง | ตั้ง GOOGLE_CLIENT_ID และเพิ่มที่อยู่เว็บใน Authorized JavaScript origins แล้ว | หน้าเข้าสู่ระบบ → ลงชื่อเข้าใช้ด้วย Google → เลือกบัญชี → กรอก OTP จากอีเมล | หลังเลือกบัญชีจะยังไม่เข้าระบบ ต้องกรอก OTP ที่ส่งไปอีเมล Google ก่อน จึงเข้าหน้าหลักได้ | ⬜ ยังไม่ทดสอบ |
| M-32 | ผู้ใช้: Google | กลาง | อีเมล Google ที่ยังไม่มีบัญชีในระบบ | หน้าสมัคร → สมัครด้วย Google → กรอก OTP | สร้างบัญชีจากชื่อ Google, ขึ้นข้อความสมัครสำเร็จ และเข้าระบบได้หลังกรอก OTP | ⬜ ยังไม่ทดสอบ |
| M-33 | ผู้ใช้: Google | กลาง | เปิดเว็บจากที่อยู่ที่ไม่ได้เพิ่มใน Google Cloud | กดปุ่ม Google | Google แจ้ง origin_mismatch (ต้องเพิ่มที่อยู่ใน Authorized JavaScript origins) | ⬜ ยังไม่ทดสอบ |
| M-03 | ผู้ใช้: เข้าสู่ระบบ | สูง | ตั้ง MAIL_USER / MAIL_APP_PASSWORD ที่ใช้ได้ | หน้าเข้าสู่ระบบ ใส่อีเมล กดลงชื่อเข้าใช้ | ได้อีเมลรหัส OTP 6 หลักภายใน 1 นาที | ⬜ ยังไม่ทดสอบ |
| M-04 | ผู้ใช้: เข้าสู่ระบบ | สูง | ได้รับ OTP แล้ว | กรอก OTP แล้วกดยืนยัน | เข้าสู่หน้าหลัก แสดงชื่อผู้ใช้มุมขวาบน | ⬜ ยังไม่ทดสอบ |
| M-05 | ผู้ใช้: เข้าสู่ระบบ | สูง | ได้รับ OTP แล้ว | กรอก OTP ผิด 5 ครั้ง | ครั้งที่ 5 แจ้งให้ขอรหัสใหม่ รหัสเดิมใช้ไม่ได้อีก | ⬜ ยังไม่ทดสอบ |
| M-06 | ผู้ใช้: เข้าสู่ระบบ | กลาง | ได้รับ OTP แล้ว | รอเกิน 5 นาทีแล้วกรอก OTP | แจ้งว่า OTP ไม่ถูกต้องหรือหมดอายุ | ⬜ ยังไม่ทดสอบ |
| M-07 | ผู้ใช้: เข้าสู่ระบบ | สูง | ยังไม่ได้เข้าสู่ระบบ | เปิด /my-posts โดยตรง แล้วเข้าสู่ระบบ | ถูกพาไปหน้าเข้าสู่ระบบ และกลับมาที่ /my-posts หลังเข้าสู่ระบบ | ⬜ ยังไม่ทดสอบ |
| M-08 | ผู้ใช้: แจ้งของ | สูง | เข้าสู่ระบบบนมือถือ | กดปุ่ม + แถบล่าง → ของหาย กรอกครบ ถ่ายรูปด้วยกล้อง แล้วส่ง | แสดง "บันทึกสำเร็จ" พร้อมหมายเลขรายการ รายการขึ้นในหน้าหลักพร้อมรูป | ⬜ ยังไม่ทดสอบ |
| M-09 | ผู้ใช้: แจ้งของ | สูง | เข้าสู่ระบบ | แจ้งพบของ โดยปักหมุดบนแผนที่และเลือกจุดรับฝาก | ช่องสถานที่เติมชื่อสถานที่ใกล้หมุด บันทึกสำเร็จ | ⬜ ยังไม่ทดสอบ |
| M-10 | ผู้ใช้: แจ้งของ | กลาง | เข้าสู่ระบบ | เลือกวันที่ในอนาคต / แนบไฟล์ PDF / รูปเกิน 5 MB | ฟอร์มแจ้งข้อผิดพลาดและไม่ส่งข้อมูล | ⬜ ยังไม่ทดสอบ |
| M-11 | ผู้ใช้: จับคู่อัตโนมัติ | สูง | บัญชี A แจ้งของหาย และเชื่อม LINE แล้ว | บัญชี B แจ้งพบของที่ชื่อ/หมวด/สถานที่ใกล้เคียงกัน | บัญชี A ได้แจ้งเตือนในเว็บ (กระดิ่ง) และข้อความ LINE ภายใน 1 นาที โดยไม่มีข้อมูลติดต่อของ B ในข้อความ | ⬜ ยังไม่ทดสอบ |
| M-12 | ผู้ใช้: ติดต่อเจ้าของ | สูง | มีโพสต์ของคนอื่นที่ยังไม่คืน | เปิดรายละเอียด → "นี่ของฉัน"/"ฉันเจอของชิ้นนี้" → ส่ง | เห็นช่องทางติดต่อเจ้าของโพสต์ เจ้าของโพสต์ได้รับแจ้งเตือน | ⬜ ยังไม่ทดสอบ |
| M-13 | ผู้ใช้: คืนของ | สูง | มีผู้ติดต่อโพสต์ของฉัน | หน้าโพสต์ของฉัน → ยืนยันว่าได้รับของคืนแล้ว | โพสต์เปลี่ยนเป็น "คืนของสำเร็จ" ผู้คืนได้เครดิต ครบ 3 ครั้งได้อีเมลเกียรติบัตร PDF | ⬜ ยังไม่ทดสอบ |
| M-14 | ผู้ใช้: โพสต์ของฉัน | กลาง | มีโพสต์ที่ยังไม่คืน | แก้ไขชื่อ/สถานที่ แล้วลบโพสต์ | แก้ไขสำเร็จ ลบแล้วรายการหายจากหน้าหลัก โพสต์ที่คืนแล้วลบไม่ได้ | ⬜ ยังไม่ทดสอบ |
| M-15 | ผู้ใช้: ค้นหา | กลาง | มีรายการหลายประเภท | หน้าค้นหา: พิมพ์คำค้น กรองหมวด สถานะ สถานที่ ช่วงวันที่ | ผลลัพธ์ตรงตามตัวกรอง ไม่พบแสดงข้อความแนะนำ | ⬜ ยังไม่ทดสอบ |
| M-16 | ผู้ใช้: รายงาน | กลาง | มีโพสต์ของคนอื่น | รายละเอียดโพสต์ → รายงานโพสต์นี้ → เลือกเหตุผล แนบรูป → ส่ง | ได้เลขรายงาน RPT-ปี-xxxxxx และรายงานขึ้นในหน้าแอดมิน | ⬜ ยังไม่ทดสอบ |
| M-17 | ผู้ใช้: ตั้งค่า | ต่ำ | เข้าสู่ระบบ | ตั้งค่า → โหมดมืด และตัวอักษร "ใหญ่มาก" แล้วรีเฟรชหน้า | ทุกหน้าผู้ใช้เป็นโหมดมืด ตัวอักษรใหญ่ขึ้น และคงค่าหลังรีเฟรช | ⬜ ยังไม่ทดสอบ |
| M-18 | ผู้ใช้: โปรไฟล์ | กลาง | เข้าสู่ระบบ | แก้ชื่อ เบอร์โทร ช่องทางติดต่อ และอัปโหลดรูปโปรไฟล์ | บันทึกสำเร็จ รูปและชื่อมุมขวาบนเปลี่ยนทันที | ⬜ ยังไม่ทดสอบ |
| M-19 | LINE Bot | สูง | มี LINE Official Account และ webhook ใช้งานได้ | เพิ่มเพื่อน @KULostFound → พิมพ์ "เชื่อมบัญชี" → กดลิงก์ → ยืนยันในเว็บ | บอทตอบว่าเชื่อมบัญชีแล้ว หน้าตั้งค่าแสดงสถานะ "เชื่อมแล้ว" | ⬜ ยังไม่ทดสอบ |
| M-20 | LINE Bot | กลาง | เชื่อมบัญชีแล้ว | พิมพ์ "สถานะ" และ "ยกเลิกการเชื่อม" | บอทแสดงสถานะการเชื่อม และยกเลิกได้ ไม่ได้รับแจ้งเตือนอีก | ⬜ ยังไม่ทดสอบ |
| M-21 | LINE Bot | กลาง | deploy Rich Menu แล้ว | กดเมนูทั้ง 6 ปุ่มใน LINE | เปิดหน้าเว็บที่ถูกต้อง (แจ้งของหาย, ค้นหา, รายการของฉัน, แจ้งพบของ, แจ้งเตือน, บัญชี) | ⬜ ยังไม่ทดสอบ |
| M-22 | แอดมิน | สูง | มีบัญชีแอดมิน | เข้า /admin/login ด้วยอีเมลและรหัสผ่าน | เข้าแดชบอร์ด เห็นตัวเลขสรุปและกราฟแนวโน้ม | ⬜ ยังไม่ทดสอบ |
| M-23 | แอดมิน: รายการ | สูง | มีของหาย/ของพบในระบบ | หน้าแจ้งของหาย: ค้นหา กรองสถานะ/หมวด/วันที่ เปิดดู แก้ไข ลบ เปลี่ยนหน้า | ผลตรงตามตัวกรอง แก้ไข/ลบแล้วข้อมูลเปลี่ยนจริง และบันทึกในประวัติการดำเนินการ | ⬜ ยังไม่ทดสอบ |
| M-24 | แอดมิน: รายงาน | สูง | มีรายงานรอดำเนินการ | ตรวจสอบรายการ → เปิดรายงาน → ออกคำเตือน/ระงับ/แบน/ยกเลิก | สถานะรายงานและบัญชีผู้ใช้เปลี่ยนตามที่เลือก มี timeline ผู้ดำเนินการ | ⬜ ยังไม่ทดสอบ |
| M-25 | แอดมิน: ผู้ใช้ | สูง | มีผู้ใช้ทั่วไป | ระงับบัญชี 7 วัน แล้วให้ผู้ใช้นั้นขอ OTP | ผู้ใช้ขอ OTP ไม่ได้ เห็นวันสิ้นสุดการระงับ ยกเลิกการระงับแล้วเข้าได้ปกติ | ⬜ ยังไม่ทดสอบ |
| M-26 | แอดมิน: ประวัติ | กลาง | แอดมินเคยดำเนินการ | หน้าประวัติการดำเนินการ: กรองตามประเภท แอดมิน ช่วงวันที่ และเปิดดูรายละเอียด | เห็นค่าก่อน/หลังการแก้ไข และไม่มีปุ่มแก้ไข/ลบประวัติ | ⬜ ยังไม่ทดสอบ |
| M-27 | แอดมิน: ค่าระบบ | กลาง | เข้าสู่ระบบแอดมิน | ตั้งค่า → ค่าระบบ: เปลี่ยนเกณฑ์จับคู่ หมวดหมู่ จุดรับฝาก แล้วบันทึก | หน้าแจ้งของฝั่งผู้ใช้เห็นหมวด/จุดรับฝากใหม่ภายใน 5 นาทีหรือเมื่อรีเฟรช | ⬜ ยังไม่ทดสอบ |
| M-28 | แอดมิน: ประกาศ | กลาง | เข้าสู่ระบบแอดมิน | ตั้งค่า → ประกาศ: เลือกประเภท ข้อความ ช่วงวันที่ แล้วบันทึก | ผู้ใช้เห็นป้ายประกาศบนทุกหน้า ปิดได้ และแสดงใหม่เมื่อข้อความเปลี่ยน | ⬜ ยังไม่ทดสอบ |
| M-29 | แอดมิน: ปิดปรับปรุง | สูง | เข้าสู่ระบบแอดมิน | เปิดโหมดปิดปรับปรุงพร้อมข้อความ แล้วเปิดเว็บฝั่งผู้ใช้ | ผู้ใช้เห็นหน้าแจ้งปิดปรับปรุง API ตอบ 503 แอดมินยังใช้งานได้ ปิดโหมดแล้วกลับมาปกติ | ⬜ ยังไม่ทดสอบ |
| M-30 | Responsive | กลาง | - | เปิดหน้าหลัก แจ้งของ โพสต์ของฉัน และหน้าแอดมิน ที่ความกว้าง 375, 768, 1440 px | ไม่มีส่วนใดล้นจอแนวนอน ปุ่มกดได้ แถบเมนูล่างแสดงเฉพาะมือถือ | ⬜ ยังไม่ทดสอบ |

## 5. ข้อบกพร่องและข้อสังเกตที่พบ

| รหัส | ประเภท | ระดับ | รายละเอียด | ผลกระทบ | ข้อเสนอแนะ | สถานะ |
|---|---|---|---|---|---|---|
| D-01 | ข้อบกพร่อง | ต่ำ | หน้ารายงานโพสต์ให้แนบรูปได้ 3 รูป แต่ส่งไปเซิร์ฟเวอร์เฉพาะรูปแรก (backend รับ upload.single("evidence")) | ผู้ใช้เข้าใจว่าส่งหลักฐานครบ 3 รูป แต่แอดมินเห็นเพียงรูปเดียว | เปลี่ยน backend เป็น upload.array("evidence", 3) หรือจำกัดหน้าเว็บให้แนบได้ 1 รูป (เทส FE-RP-06 บันทึกพฤติกรรมนี้ไว้) | ยังไม่แก้ |
| D-02 | สภาพแวดล้อม | สูง | ส่งอีเมล OTP ไม่ได้ในเครื่องพัฒนา: Gmail ปฏิเสธ App Password (EAUTH 535) | ผู้ใช้เข้าสู่ระบบไม่ได้ (ทั้ง OTP และ Google ที่ต้องใช้ OTP ขั้นที่ 2) | ตั้ง App Password ใหม่แล้ว — ตรวจการเชื่อมต่อ Gmail SMTP สำเร็จเมื่อ 27 ต.ค. 2569 ควรทดสอบ M-03 ซ้ำ | แก้แล้ว |
| D-03 | ข้อสังเกต | ต่ำ | oxlint เตือน 2 จุด: เรียก setState ใน useEffect (AdminLayout.jsx:125, ReportDetailPanel.jsx:37) | ไม่กระทบการทำงาน อาจ render ซ้ำ 1 รอบ | ปรับเป็นการคำนวณค่าตอน render หรืออัปเดตจาก event | ยังไม่แก้ |
| D-04 | ข้อสังเกต | ต่ำ | ไฟล์ JavaScript หลังสร้าง (build) ใหญ่กว่า 500 kB | หน้าแรกโหลดช้าลงบนเครือข่ายมือถือ | แยกโค้ดหน้าแอดมินและแผนที่ด้วย dynamic import() | ยังไม่แก้ |
| D-05 | ข้อสังเกต | ต่ำ | ประกาศที่ส่ง tone ไม่รู้จัก ถูกปรับเป็น "info" โดยไม่แจ้ง (SET-17) | ไม่มีผลกับผู้ใช้ (หน้าแอดมินเลือกได้เฉพาะประเภทที่รองรับ) | คงไว้ตามเดิม หรือตอบ 400 ถ้าต้องการให้เข้มงวด | ยอมรับได้ |
| D-06 | ช่องว่างการทดสอบ | กลาง | ยังไม่มีเทสอัตโนมัติฝั่งหน้าเว็บสำหรับ โพสต์ของฉัน, โปรไฟล์/ตั้งค่า, หน้าค้นหา, หน้าเชื่อม LINE และหน้าแอดมิน รายการ/ประวัติ/ตั้งค่า | การเปลี่ยนแปลงหน้าเหล่านี้อาจทำให้เกิด regression โดยไม่รู้ตัว | API ของหน้าเหล่านี้มีเทสแล้ว (MYI, ME, AUD, SET, node:test adminItems) ควรเพิ่มเทส UI และทดสอบด้วยมือ M-14, M-15, M-23, M-26 | เปิด |

## 6. เทสเดิมที่ปรับให้ตรงกับระบบปัจจุบัน

| ส่วนของระบบ | พฤติกรรมที่เปลี่ยน | สิ่งที่ปรับในเทส |
|---|---|---|
| แจ้งของ /foundItem, /lostItem และรายงานโพสต์ /report | ต้องมี token ผู้ใช้ และรหัสผู้แจ้ง/ผู้รายงานมาจาก token (ปลอมผ่าน body ไม่ได้) | เพิ่ม token ในเทส + เพิ่มเทสกันการปลอมรหัส (FND/LST-10, RPT-14) |
| ยืนยันการคืนของ /api/returns | เปลี่ยนเป็นเฉพาะแอดมิน และจำนวนครั้งที่ได้เกียรติบัตรอ่านจากค่าระบบ | เพิ่ม token แอดมิน + CRT-07, CRT-08 |
| ตรวจ OTP /api/verify-otp | เทียบรหัสแบบ timing-safe นับจำนวนครั้งที่ผิด (สูงสุด 5) และออก token ผู้ใช้ | ปรับตัวจำลอง SQL + เพิ่ม VOTP-10..12 |
| ข้อมูลผู้ใช้ /api/users/:email, /user | ต้องเป็นเจ้าของอีเมล / /user เฉพาะแอดมิน | เพิ่ม USR-04..08 |
| แจ้งเตือน LINE /api/notifications/line | ปิดใช้งานถ้าไม่ได้ตั้ง NOTIFY_API_KEY | ส่ง key ในทุกเทส + LN-05 |
| สถิติ /api/stats/summary | ถูกนำออกจากระบบ (หน้าเว็บไม่ได้ใช้) | ลบเทส STAT-01, STAT-02 |
| แอดมินจัดการผู้ใช้/รายการ/ค่าระบบ | ทำใน transaction พร้อมบันทึก audit log | จำลอง db.connect() + ตรวจ INSERT audit และ COMMIT |
| แดชบอร์ดแอดมิน และ timeline รายงาน | เพิ่มตัวเลข 5 ค่าใหม่ และข้อความ timeline เป็นภาษาไทย | ปรับค่าที่คาดหวัง (ADM-02, ADM-09, ADM-10) |
| หน้าเว็บผู้ใช้ | ลบ Navbar / FormFoundItem / BottomNav เดิม ใช้ UserLayout, ReportItemForm, BottomNav ใหม่ และ userApi (axios.create) | เขียนเทสใหม่ + axios mock ที่รองรับ create() |
| ส่ง OTP /api/send-otp | แยกโค้ดส่ง OTP เป็นฟังก์ชัน issueOtp() ใช้ร่วมกับการเข้าด้วย Google (พฤติกรรมเดิม) | เพิ่ม OTP-08 (ขอซ้ำภายใน 60 วินาที → 429) เพื่อยืนยันว่าแยกโค้ดแล้วไม่เปลี่ยนพฤติกรรม |
| หน้าเข้าสู่ระบบ/สมัคร | โหลดค่าระบบสาธารณะเพื่อแสดงปุ่ม Google (มีเมื่อตั้ง GOOGLE_CLIENT_ID) | auth.test.jsx: จำลอง axios.get ของค่าระบบ + ปรับ FE-LG-11 เป็นกรณียังไม่ตั้งค่า Google |
| การป้องกันหน้า (ProtectedRoute) | ตรวจจาก JWT ที่ยังไม่หมดอายุ แทน isLoggedIn และจำหน้าที่จะเปิด | เขียนเทส FE-RT ใหม่ + FE-RT-06, FE-RT-07 |
