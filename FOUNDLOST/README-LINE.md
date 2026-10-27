# ระบบ LINE Bot ของ KULost&Found

เอกสารนี้อธิบายระบบ LINE Bot ที่ต่อเข้ากับ API และฐานข้อมูลเดิมของ FOUND&LOST: การเพิ่มเพื่อนและเชื่อมบัญชี, การแจ้งเตือนเมื่อ Matching Algorithm พบคู่ที่อาจตรงกัน และ Rich Menu สำหรับเปิดหน้าเว็บแอป

---

## 1. ภาพรวมการทำงาน

```
ผู้ใช้เพิ่มเพื่อน OA ──► LINE ──(webhook follow)──► POST /api/line/webhook
                                                    │ ตรวจ X-Line-Signature → ตอบ 200 ทันที
                                                    ▼ (ประมวลผลเบื้องหลัง, กัน event ซ้ำ)
                                     บันทึก line_accounts + ออกรหัสเชื่อมบัญชีแบบใช้ครั้งเดียว
                                                    ▼
                    ข้อความต้อนรับ + ปุ่ม "เชื่อมบัญชี" → {APP_BASE_URL}/line/link?token=…
                                                    ▼
                เว็บแอป: เข้าสู่ระบบด้วย OTP เดิม → แสดงชื่อ LINE → ผู้ใช้กด "ยืนยัน"
                                                    ▼
                             POST /api/line/link (ใช้ student_id จาก JWT เท่านั้น)

ผู้ใช้แจ้งของหาย/พบของ ──► POST /lostItem หรือ /foundItem (เดิม)
                                ▼
                 notifyNewItemMatches → findMatches() เดิม (คะแนน ≥ 60)
                                ▼
                 match_notifications (UNIQUE คู่ของหาย-ของพบ → แจ้งคู่ละครั้งเดียว)
                                ▼
     กระดิ่ง + อีเมล (เดิม)  และ  LINE push (ถ้าเชื่อมบัญชี + เป็นเพื่อน + เปิดรับแจ้งเตือน)
                                ▼
          line_deliveries: sent / retry (ลองใหม่ด้วย X-Line-Retry-Key เดิม) / failed
```

**สำคัญ:** การเพิ่มเพื่อนอย่างเดียวระบุบัญชีเว็บแอปไม่ได้ ระบบรู้แค่ LINE user ID การเชื่อมบัญชีต้องผ่านการเข้าสู่ระบบเว็บแอปและกดยืนยันเองทุกครั้ง

### ข้อเท็จจริงจากระบบเดิมที่ใช้ในการออกแบบ

| เรื่อง | ระบบเดิม | สิ่งที่ทำ |
|---|---|---|
| ตัวตนผู้ใช้ | `users.student_id` (PK), เข้าสู่ระบบด้วย OTP อีเมล → JWT (`userAuth`) | เชื่อม LINE กับ `student_id` ใช้ `userAuth` เดิม |
| Migration | ไม่มีเครื่องมือ migration แยก, `server.js` รัน `sql/features.sql` ตอนเริ่ม | เพิ่ม `sql/line.sql` (รันซ้ำได้) ในลำดับเดียวกัน |
| จับคู่ | `services/matching.js` `findMatches()` + `services/matchNotifier.js` (คะแนน ≥ 60) | ใช้ของเดิม เพิ่มการกันแจ้งซ้ำและช่องทาง LINE |
| แจ้งเตือนเดิม | ตาราง `notifications` (กระดิ่ง) + อีเมล | ยังทำงานเหมือนเดิม ลิงก์ชี้ไปที่รายการนั้นโดยตรง |
| LINE เดิม | `sendLineNotification` ส่งข้อความหา `LINE_USER_ID` คนเดียว (ฟีดผู้ดูแล) | คงไว้ ย้ายไปใช้ client ร่วม |
| หน้าเว็บ | `/lostItem`, `/foundItem`, `/home` (ค้นหาทั้งสองแบบ), `/my-posts`, `/settings` | เพิ่ม `/notifications`, `/line/link` |
| ผู้รับแจ้งเตือนคู่ | ระบบเดิมแจ้งเฉพาะเจ้าของโพสต์ของหาย | LINE ใช้กติกาเดียวกัน (ผู้แจ้งพบไม่ได้รับ) |

---

## 2. ไฟล์ที่เพิ่ม/แก้ไข

### Backend (`backend/`)
| ไฟล์ | |
|---|---|
| `sql/line.sql` | **ใหม่** migration: `line_accounts`, `line_link_tokens`, `line_webhook_events`, `line_deliveries`, `match_notifications` |
| `services/line/config.js` | **ใหม่** อ่านค่าจาก environment |
| `services/line/signature.js` | **ใหม่** ตรวจ X-Line-Signature (HMAC-SHA256 + timingSafeEqual) |
| `services/line/lineClient.js` | **ใหม่** เรียก LINE API (push/reply/profile/rich menu), timeout 10 วินาที, error ไม่มี token |
| `services/line/lineRepository.js` | **ใหม่** SQL ทั้งหมดของระบบ LINE |
| `services/line/accountLinking.js` | **ใหม่** ออกรหัส/ตรวจ/ยืนยันการเชื่อมบัญชี |
| `services/line/webhook.js` | **ใหม่** webhook handler (follow / unfollow / ข้อความ) |
| `services/line/messages.js` | **ใหม่** ข้อความต้อนรับ, ปุ่มเชื่อมบัญชี, Flex แจ้งเตือนคู่ |
| `services/line/matchDelivery.js` | **ใหม่** ส่งแจ้งเตือน + บันทึกสถานะ + retry worker |
| `services/line/richMenu.js` | **ใหม่** โครง Rich Menu + deploy แบบไม่สร้างซ้ำ |
| `services/line/index.js` | **ใหม่** ประกอบบริการที่ใช้งานจริง + งานเบื้องหลัง |
| `controller/lineController.js`, `routes/lineRoute.js` | **ใหม่** `/api/line/*` และ `/admin/line/*` |
| `scripts/line/richmenu.html` | **ใหม่** แม่แบบภาพเมนู |
| `scripts/line/renderRichMenuImage.js` | **ใหม่** สร้าง PNG ด้วย Chrome/Edge headless |
| `scripts/line/deployRichMenu.js` | **ใหม่** สร้าง/อัปเดต/ผูก Rich Menu |
| `assets/line/richmenu.png` | **ใหม่** ภาพเมนู 2500×1686 (~400 KB) |
| `test/**` | **ใหม่** automated tests (node:test ไม่ต้องติดตั้งเพิ่ม) |
| `server.js` | แก้: ลงทะเบียน webhook (raw body) ก่อน `express.json()`, mount routes, รัน `line.sql`, เริ่ม retry worker |
| `services/matchNotifier.js` | แก้: กันแจ้งคู่ซ้ำ + ส่ง LINE (กระดิ่ง/อีเมลยังเหมือนเดิม) |
| `services/matching.js` | แก้: SELECT เพิ่มคอลัมน์ `item_color` |
| `services/lineNotification.js` | แก้: ใช้ `lineClient` (พฤติกรรมเดิม) |
| `controller/lostItemController.js`, `foundItemController.js` | แก้: ส่ง `item_color` ให้ตัวจับคู่ |
| `package.json` | เพิ่ม scripts `test`, `line:richmenu`, `line:richmenu:image` |

### Frontend (`frontend/src/`)
| ไฟล์ | |
|---|---|
| `page/LineLink.jsx` | **ใหม่** `/line/link` หน้ายืนยันการเชื่อมบัญชี |
| `page/Notifications.jsx` | **ใหม่** `/notifications` ประวัติการแจ้งเตือน + ประวัติการส่ง LINE |
| `component/LineConnectionCard.jsx` | **ใหม่** สถานะ LINE / เปิด-ปิดแจ้งเตือน / ยกเลิกการเชื่อม |
| `App.jsx` | เพิ่ม 2 routes |
| `page/ProtectedRoute.jsx`, `page/Login.jsx` | หลังเข้าสู่ระบบ พากลับหน้าที่ตั้งใจเปิด (รับเฉพาะ path ภายในเว็บ) |
| `page/MyPosts.jsx` | รองรับ `?type=lost&item=ID&panel=matches` เลื่อนไปที่การ์ดและเปิดแผงคู่ที่อาจตรงกัน |
| `page/UserSettings.jsx` | เพิ่มการ์ด LINE |
| `component/UserLayout.jsx`, `component/NotificationBell.jsx` | เมนู/ลิงก์ไปหน้าการแจ้งเตือน |
| `component/itemUtils.js` และไฟล์ที่เคย hardcode `http://localhost:3000` | ใช้ `VITE_API_URL` (ค่าเริ่มต้นยังเป็น `http://localhost:3000`) |

### อื่น ๆ
`.env.example` (ตัวแปร LINE ใหม่), `frontend/.env.example`, เอกสารนี้

---

## 3. API endpoints

| Method | Path | สิทธิ์ | คำอธิบาย |
|---|---|---|---|
| POST | `/api/line/webhook` | ลายเซ็น LINE | รับ event จาก LINE (ตอบ 200 ทันที) / ลายเซ็นผิด 401 / ไม่ได้ตั้ง secret 503 |
| GET | `/api/line/status` | ผู้ใช้ | สถานะการเชื่อม, ลิงก์เพิ่มเพื่อน |
| POST | `/api/line/link/preview` | ผู้ใช้ | `{ token }` → ชื่อ LINE ที่จะเชื่อม (ยังไม่ใช้รหัส) |
| POST | `/api/line/link` | ผู้ใช้ | `{ token }` → เชื่อมบัญชี (400 invalid / 410 expired, used / 409 ชนกับบัญชีอื่น) |
| DELETE | `/api/line/link` | ผู้ใช้ | ยกเลิกการเชื่อม |
| PATCH | `/api/line/preferences` | ผู้ใช้ | `{ notify_enabled: boolean }` |
| GET | `/api/line/notifications` | ผู้ใช้ | ประวัติการส่ง LINE ของตัวเอง 30 รายการล่าสุด |
| GET | `/admin/line/deliveries?status=failed` | แอดมิน | ตรวจสอบการส่ง/ข้อผิดพลาด (`sending`, `sent`, `retry`, `failed`) |

Endpoint เดิมทุกตัวคงเดิม ลิงก์ในข้อความ LINE เปิด `/my-posts` ซึ่งเรียก `GET /api/my-items/:type/:id/matches` เดิม API นี้กรองด้วย `student_id` จาก token จึงเปิดรายการของคนอื่นผ่าน URL ไม่ได้ (ได้ 404)

### คำสั่งในแชต LINE
| พิมพ์ | ผล |
|---|---|
| `เชื่อมบัญชี` / `link` | ส่งลิงก์เชื่อมบัญชีใหม่ (ลิงก์เก่าใช้ไม่ได้ทันที) |
| `สถานะ` / `status` | สถานะการเชื่อมและการแจ้งเตือน |
| `ยกเลิกการเชื่อม` / `unlink` | ยกเลิกการเชื่อมจากฝั่ง LINE |
| อื่น ๆ | คำแนะนำการใช้งาน |

---

## 4. ฐานข้อมูล (`backend/sql/line.sql`)

`server.js` รันไฟล์นี้อัตโนมัติทุกครั้งที่เริ่ม (ใช้ `IF NOT EXISTS` จึงรันซ้ำได้ ไม่แก้หรือลบข้อมูลเดิม)

| ตาราง | จุดสำคัญ |
|---|---|
| `line_accounts` | PK `line_user_id`, `student_id` **UNIQUE** → users (ON DELETE SET NULL), `is_following`, `notify_enabled`, `linked_at` |
| `line_link_tokens` | เก็บ **SHA-256** ของรหัส (ไม่เก็บรหัสจริง), `expires_at`, `used_at` |
| `line_webhook_events` | PK `webhook_event_id` กันประมวลผลซ้ำ (ลบหลัง 7 วัน) |
| `line_deliveries` | ผู้รับ, รายการ, ประเภท, `status`, `attempts`, `next_attempt_at`, `last_error_code/message`, `retry_key` UNIQUE, `line_request_id` |
| `match_notifications` | **UNIQUE (lost_item_id, found_item_id)** กันแจ้งคู่ซ้ำ, FK ไป lost/found_items (CASCADE), `line_delivery_id` |

Channel Access Token และ Channel Secret ไม่ถูกเก็บในฐานข้อมูล อยู่ใน environment variables เท่านั้น

ถ้าต้องการรัน migration เองโดยไม่เริ่ม backend:

```powershell
Get-Content backend/sql/line.sql | docker exec -i postgres psql -U postgres -d foundlost_db
```

---

## 5. ติดตั้งและตั้งค่า

### 5.1 สิ่งที่ต้องมี
- Node.js 20 ขึ้นไป (ทดสอบกับ v26) และ Docker (PostgreSQL ตาม `docker-compose.yml` เดิม)
- บัญชี LINE และ LINE Official Account
- **URL สาธารณะแบบ https** สำหรับ backend (webhook) และ frontend (หน้าที่เปิดจาก LINE)

### 5.2 Environment
คัดลอก `.env.example` → `backend/.env` แล้วกรอก:

| ตัวแปร | ได้มาจาก |
|---|---|
| `APP_BASE_URL` | URL ของ frontend เช่น `https://lostfound.example.ac.th` (ไม่มี `/` ท้าย) |
| `LINE_CHANNEL_SECRET` | LINE Developers → Channel → **Basic settings → Channel secret** |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers → Channel → **Messaging API → Channel access token (long-lived) → Issue** |
| `LINE_BOT_BASIC_ID` | LINE Official Account Manager → Basic ID (เช่น `@123abcde`) |
| `LINE_LINK_TOKEN_TTL_MINUTES` | อายุลิงก์เชื่อมบัญชี (ค่าเริ่มต้น 15) |

ถ้าเปิดเว็บจากมือถือ ให้สร้าง `frontend/.env` จาก `frontend/.env.example` แล้วตั้ง `VITE_API_URL` เป็น URL ของ backend ที่มือถือเข้าถึงได้ (ไม่ตั้ง = `http://localhost:3000` เหมือนเดิม)

ถ้ายังไม่ได้ตั้งค่า LINE ระบบเดิมยังทำงานได้ทั้งหมด: webhook ตอบ 503, การแจ้งเตือน LINE จะถูกข้าม (มี log เตือน และไม่บันทึกว่าส่งสำเร็จ) ส่วนกระดิ่งและอีเมลทำงานตามปกติ

### 5.3 ตั้งค่า LINE Developers / LINE Official Account (เจ้าของระบบต้องทำเอง)
1. สร้าง LINE Official Account ที่ <https://manager.line.biz> (เช่น ชื่อ "KULost&Found")
2. ใน OA Manager → **Settings → Messaging API → Enable Messaging API** แล้วเลือกหรือสร้าง Provider
3. เปิด <https://developers.line.biz/console/> → Provider → Channel ที่ได้
   - **Basic settings**: คัดลอก *Channel secret* → `LINE_CHANNEL_SECRET`
   - **Messaging API**: กด *Issue* ที่ *Channel access token (long-lived)* → `LINE_CHANNEL_ACCESS_TOKEN`
4. **Messaging API → Webhook settings**
   - Webhook URL: `https://<โดเมน-backend>/api/line/webhook`
   - เปิด **Use webhook**
   - กด **Verify** ต้องได้ *Success* (backend ต้องรันอยู่และตั้ง `LINE_CHANNEL_SECRET` แล้ว)
   - (แนะนำ) เปิด **Webhook redelivery** ระบบกัน event ซ้ำด้วย `webhookEventId` แล้ว
5. OA Manager → **Settings → Response settings**: **ปิด** *Greeting message* และ *Auto-response* เพราะบอทส่งข้อความต้อนรับ/ตอบเอง (ถ้าเปิดไว้ ผู้ใช้จะได้ข้อความซ้อน) และเปิด *Webhooks*
6. คัดลอก Basic ID → `LINE_BOT_BASIC_ID`
7. รีสตาร์ต backend

### 5.4 ทดสอบในเครื่องด้วย tunnel (ไม่มีโดเมนจริง)
LINE เรียก `localhost` ไม่ได้ ใช้ tunnel แบบ https เช่น Cloudflare Tunnel หรือ ngrok:

```powershell
cloudflared tunnel --url http://localhost:3000   # → https://xxxx.trycloudflare.com  (backend / webhook)
cloudflared tunnel --url http://localhost:5173   # → https://yyyy.trycloudflare.com  (frontend)
```

- `backend/.env`: `APP_BASE_URL=https://yyyy.trycloudflare.com`
- `frontend/.env`: `VITE_API_URL=https://xxxx.trycloudflare.com`
- Webhook URL ใน LINE Developers: `https://xxxx.trycloudflare.com/api/line/webhook`
- Vite dev server บล็อก host แปลกหน้า ให้เพิ่ม `server: { allowedHosts: [".trycloudflare.com"] }` ใน `frontend/vite.config.js` ชั่วคราว หรือใช้ `npm run build` + `npx vite preview --host` พร้อม `preview.allowedHosts`
- URL ของ tunnel ชั่วคราวเปลี่ยนทุกครั้งที่รันใหม่ ต้องอัปเดตค่าข้างต้นและ deploy Rich Menu ใหม่ทุกครั้ง

---

## 6. Rich Menu

เมนู 6 ช่อง (2 แถว × 3 คอลัมน์ ภาพ 2500×1686 px) ทุกช่องเป็น action ประเภท **URI** ที่สร้างจาก `APP_BASE_URL`

| | คอลัมน์ 1 | คอลัมน์ 2 | คอลัมน์ 3 |
|---|---|---|---|
| แถว 1 | 📢 แจ้งของหาย → `/lostItem` | 🔎 ค้นหาของ → `/home` | 📦 รายการของฉัน → `/my-posts` |
| แถว 2 | 📍 แจ้งพบของ → `/foundItem` | 🔔 การแจ้งเตือน → `/notifications` | 👤 บัญชีของฉัน → `/settings` (มีการ์ดเชื่อม LINE) |

ไม่ได้ใช้ LIFF เพราะทุกหน้าเปิดผ่าน URI ใน in-app browser ของ LINE ได้ และยืนยันตัวตนด้วย OTP/JWT เดิม จึงไม่ต้องขอข้อมูลโปรไฟล์ LINE เพิ่ม หน้าเว็บผู้ใช้เป็น responsive อยู่แล้ว (เมนูซ้ายกลายเป็น drawer บนมือถือ)

```powershell
cd backend
npm run line:richmenu:image          # (ไม่บังคับ) สร้างภาพใหม่จาก scripts/line/richmenu.html
npm run line:richmenu -- --dry-run   # ดู JSON ของเมนูกับ URL จริง โดยไม่เรียก LINE
npm run line:richmenu                # สร้าง + อัปโหลดภาพ + ตั้งเป็นเมนูเริ่มต้นของทุกคน
```

`line:richmenu` รันซ้ำได้อย่างปลอดภัย:
- ชื่อเมนูมี hash ของ (โครงเมนู + ภาพ) ถ้าไม่มีอะไรเปลี่ยน ระบบจะใช้เมนูเดิม ไม่สร้างซ้ำและไม่อัปโหลดซ้ำ
- ถ้าเปลี่ยน URL หรือภาพ ระบบจะสร้างเวอร์ชันใหม่ ตั้งเป็นค่าเริ่มต้น แล้วลบเวอร์ชันเก่า (เฉพาะเมนูที่ชื่อขึ้นต้น `kulostfound-main-` ไม่แตะเมนูที่สร้างจาก OA Manager) ใช้ `--no-prune` ถ้าไม่ต้องการลบ
- ถ้ารอบก่อนสร้างเมนูได้แต่อัปโหลดภาพไม่สำเร็จ รอบถัดไปจะอัปโหลดภาพให้ ถ้าอัปโหลดล้มเหลวตอนสร้างใหม่ ระบบจะลบเมนูที่ไม่มีภาพทิ้ง
- ถ้าตั้ง Rich Menu ใน OA Manager ไว้ด้วย เมนูที่ตั้งผ่าน API จะแสดงแทน (ตามลำดับความสำคัญของ LINE)
- แก้ภาพ: แก้ `scripts/line/richmenu.html` แล้วรัน `line:richmenu:image` (ต้องมี Chrome หรือ Edge หรือตั้ง `CHROME_PATH`) หรือใช้ภาพของตัวเองขนาด 2500×1686 ไม่เกิน 1 MB ผ่าน `--image path.png` โดยตำแหน่งช่องต้องตรงกับตารางด้านบน

---

## 7. การแจ้งเตือนและความปลอดภัย

**ข้อความแจ้งเตือน** ประกอบด้วยข้อความหัวเรื่อง ("🔔 KULost&Found พบรายการที่อาจตรงกับของที่คุณแจ้งหาย") และคำเตือนให้ตรวจสอบเอง ตามด้วย Flex card ต่อคู่ (สูงสุด 5 คู่) แสดงชื่อสิ่งของ, หมวด/สี, สถานที่พบ, วันที่พบ (จากข้อมูลจริง แสดงเป็น พ.ศ.), ระดับความใกล้เคียง ("ใกล้เคียง" / "ใกล้เคียงมาก" พร้อมเหตุผลจาก Matching Algorithm ไม่ใช้คำว่า "ตรงกันแน่นอน") และปุ่ม **🔎 ดูรายละเอียดรายการ**
ข้อความ**ไม่ใส่** ชื่อ, รหัสนิสิต, ช่องทางติดต่อ หรือคำอธิบายอิสระของผู้แจ้งพบ (อาจมีข้อมูลส่วนบุคคล) ดูต่อได้ในเว็บแอปที่ตรวจสิทธิ์แล้ว

**กันส่งซ้ำ / retry**
- คู่ของหาย–ของพบเดิมถูกแจ้งเพียงครั้งเดียว (`match_notifications` UNIQUE)
- การส่งแต่ละครั้งมี `retry_key` (UUID) ส่งเป็น header `X-Line-Retry-Key` ถ้าเกิด timeout หรือเครือข่ายหลุด (ผลไม่แน่ชัด) ระบบจะลองใหม่ด้วย key เดิม ถ้า LINE รับครั้งก่อนไปแล้ว LINE จะตอบ 409 แทนการส่งซ้ำ แล้วระบบบันทึกว่า sent
- ลองใหม่เมื่อเจอ 429/5xx/timeout/เครือข่าย สูงสุด 6 ครั้ง (1, 5, 15, 60, 180 นาที) และไม่เกิน 23 ชั่วโมง (retry key ของ LINE มีอายุ 24 ชั่วโมง) ถ้าเจอ 4xx อื่นจะเป็น failed ทันที
- ก่อนลองใหม่จะตรวจว่าผู้รับยังเชื่อมบัญชี ยังเป็นเพื่อน และยังเปิดรับแจ้งเตือนอยู่
- worker ทำงานทุก 60 วินาทีใน process ของ backend และใช้ `FOR UPDATE SKIP LOCKED` จึงรันหลาย instance ได้

**Webhook**: ตรวจลายเซ็นด้วย raw body ก่อน parse แล้วตอบ 200 ทันที จากนั้นประมวลผลเบื้องหลัง event ที่มี `webhookEventId` ซ้ำจะถูกข้าม event จากกลุ่ม/ห้องจะถูกละเว้น

**Log**: ไม่บันทึก access token, secret หรือรหัสเชื่อมบัญชี และ LINE user ID ถูกตัดเหลือ 6 ตัวอักษร

**การเชื่อมบัญชี**
- รหัส 256 บิต ใช้ได้ครั้งเดียว หมดอายุใน 15 นาที และขอใหม่แล้วรหัสเก่าใช้ไม่ได้
- ยืนยันใน transaction ที่ล็อกแถว (`FOR UPDATE`) จึงใช้ซ้ำพร้อมกันไม่ได้
- LINE 1 บัญชี ↔ ผู้ใช้ 1 คน: ถ้า LINE เชื่อมกับบัญชีอื่นอยู่ หรือบัญชีเชื่อม LINE อื่นอยู่ ระบบจะปฏิเสธ (409) ต้องยกเลิกการเชื่อมเดิมก่อน ไม่ย้ายให้อัตโนมัติ
- หน้ายืนยันแสดงชื่อ LINE และต้องกดยืนยันเอง เพื่อป้องกันการถูกหลอกให้เปิดลิงก์ของคนอื่น
- unfollow: หยุดส่งข้อความและยกเลิกรหัสที่ยังไม่ได้ใช้ แต่คงการเชื่อมไว้ (เพิ่มเพื่อนกลับมาแล้วใช้ต่อได้) ยกเลิกการเชื่อมได้จากเว็บหรือพิมพ์ในแชต

---

## 8. การทดสอบ

### 8.1 Automated tests (ใช้ LINE API จำลอง ไม่ต่อ LINE จริง)
```powershell
cd backend
npm test
```
| ไฟล์ | ครอบคลุม |
|---|---|
| `test/lineWebhook.test.js` | ลายเซ็นถูก/ผิด/ไม่มี, ไม่ได้ตั้ง secret, Verify, follow, follow ซ้ำของผู้ที่เชื่อมแล้ว, unfollow, event ซ้ำ, คำสั่งแชต, reply ล้มเหลว |
| `test/lineAccountLinking.test.js` | เชื่อมสำเร็จ, ใช้ครั้งเดียว, หมดอายุ, รหัสผิด, ขอใหม่แล้วรหัสเก่าใช้ไม่ได้, ชนกับบัญชีอื่น, ยกเลิกแล้วเชื่อมใหม่, ตรวจสิทธิ์ `/api/line/*` |
| `test/lineMatchNotification.test.js` | Matching Algorithm เดิม, ส่งเมื่อมีคู่ใหม่ (ทั้งของหายและของพบ), ไม่มีคู่ไม่ส่ง, กันซ้ำ, ไม่ได้เชื่อม/ปิดแจ้งเตือน/ไม่ได้ตั้งค่า, LINE 500/timeout/409/400, ครบจำนวนครั้ง, ผู้รับยกเลิกระหว่างรอ |
| `test/lineRichMenu.test.js` | โครงเมนู/URL, path มีจริงใน App.jsx, ตรวจภาพ, สร้าง, รันซ้ำไม่สร้างซ้ำ, อัปเดตแล้วลบเวอร์ชันเก่า, อัปโหลดล้มเหลว |
| `test/existingFeatures.test.js` | `POST /lostItem` เดิม, การตรวจสิทธิ์ `GET /api/my-items/:type/:id/matches`, ฟีดผู้ดูแลเดิม |
| `test/lineRepository.pg.test.js` | SQL จริงกับ PostgreSQL (ข้ามถ้าไม่ตั้ง `TEST_DATABASE_URL`) |

ทดสอบ SQL จริงด้วยฐานข้อมูลชั่วคราว (ไม่แตะฐานข้อมูลหลัก):
```powershell
docker run -d --rm --name line-test-pg -e POSTGRES_PASSWORD=testpass -p 55432:5432 postgres:16
$env:TEST_DATABASE_URL="postgres://postgres:testpass@localhost:55432/postgres"; npm test
docker stop line-test-pg
```

### 8.2 ทดสอบกับ LINE Official Account จริง (ตั้งแต่ต้นจนจบ)
1. เริ่ม PostgreSQL (`docker compose up -d`), backend (`npm --prefix backend run dev`), frontend และ tunnel (ข้อ 5.4)
2. LINE Developers → Webhook → **Verify** → Success
3. `npm run line:richmenu` → ดูผลลัพธ์ว่า default changed / created
4. สแกน QR ของ OA ด้วยมือถือ → เพิ่มเพื่อน → ต้องได้ข้อความต้อนรับพร้อมปุ่ม **เชื่อมบัญชี** และเห็น Rich Menu ด้านล่าง (ถ้าไม่เห็นเมนู ให้ลบห้องแชตแล้วเปิดใหม่)
   - backend log: `[line] follow U1234…  linked=false`
5. กดปุ่ม → เข้าสู่ระบบด้วย OTP → หน้า “เชื่อมบัญชี LINE” แสดงชื่อ LINE → **ยืนยัน** → สำเร็จ
6. พิมพ์ `สถานะ` ในแชต → “เชื่อมบัญชีแล้ว ✅” และหน้า บัญชีของฉัน แสดงการ์ด LINE
7. ทดสอบลิงก์: กดปุ่มเดิมในแชตซ้ำ → “ลิงก์นี้ถูกใช้ไปแล้ว” / รอเกิน 15 นาทีกับลิงก์ใหม่ → “หมดอายุ”
8. ใช้บัญชี A แจ้งของหาย (เช่น “กระเป๋าสตางค์”, หมวดกระเป๋า, อาคาร X, วันนี้) แล้วใช้บัญชี B แจ้งพบของคล้ายกัน (ชื่อ/หมวด/สถานที่/วันใกล้กัน) → มือถือของ A ต้องได้ข้อความแจ้งเตือน
   - ตรวจสถานะ: `GET /admin/line/deliveries` (token แอดมิน) หรือ
     `docker exec -it postgres psql -U postgres -d foundlost_db -c "SELECT delivery_id,status,attempts,last_error_code FROM line_deliveries ORDER BY delivery_id DESC LIMIT 5"`
9. กด **ดูรายละเอียดรายการ** → หน้าโพสต์ของฉันเลื่อนไปที่รายการและเปิดแผงรายการที่อาจตรงกัน
   - ทดสอบสิทธิ์: เปิดลิงก์เดียวกันขณะล็อกอินด้วยบัญชี B → ไม่เห็นข้อมูลของ A
10. กดแต่ละช่องของ Rich Menu → เปิดหน้าตามตาราง ข้อ 6
11. ปิดการแจ้งเตือนในหน้าบัญชีของฉัน → แจ้งพบของคล้ายกันอีกครั้ง → ต้องไม่ได้ LINE (กระดิ่งในเว็บยังได้)
12. บล็อก OA → log ต้องมี `unfollow` และ `is_following = false` / ปลดบล็อก → follow กลับมา บัญชียังเชื่อมอยู่
13. พิมพ์ `ยกเลิกการเชื่อม` → การ์ดในเว็บกลับเป็น “ยังไม่ได้เชื่อม”

---

## 9. ข้อจำกัดที่ทราบ
- งานเบื้องหลังของ webhook (`setImmediate`) และ retry worker ทำงานใน process ของ backend ถ้า process ตายหลังตอบ 200 แต่ก่อนประมวลผล event นั้นจะหายไป (LINE ไม่ส่งซ้ำเพราะได้ 200 แล้ว) ผู้ใช้พิมพ์ `เชื่อมบัญชี` เพื่อขอลิงก์ใหม่ได้ ถ้าต้องการความทนทานสูงขึ้น ให้ย้ายไปใช้ job queue
- แจ้งเตือนเฉพาะ**เจ้าของโพสต์ของหาย** ตามกติกาเดิมของ `matchNotifier` และจับคู่เฉพาะตอนสร้างโพสต์ใหม่ (การแก้ไขโพสต์ไม่ได้จับคู่ใหม่ เหมือนระบบเดิม)
- frontend เก็บ token ใน localStorage และ in-app browser ของ LINE มี storage แยกจากเบราว์เซอร์ปกติ ผู้ใช้จึงอาจต้องเข้าสู่ระบบด้วย OTP อีกครั้งเมื่อเปิดจาก LINE ครั้งแรก
- Push message นับรวมในโควตาข้อความรายเดือนของแพ็กเกจ LINE OA (ข้อความ reply ไม่นับ)
