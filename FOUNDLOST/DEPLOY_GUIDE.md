# DEPLOY_GUIDE — Docker + CI/CD สำหรับ FOUNDLOST

> ปรับจาก guideline กลางให้ตรงกับโค้ดจริงของ FOUNDLOST — อัปเดต 27 ตุลาคม 2569 (2026)
> **สถานะ:** ไฟล์ Docker / Caddy / Nginx / compose / สคริปต์ / GitHub Actions พร้อมแล้ว และทดสอบ stack production ในเครื่องผ่าน
> ยังไม่ได้ push, ยังไม่ได้แตะ GitHub settings / VPS / DNS — ขั้นตอนที่เหลือเป็นของผู้ดูแลระบบ (ข้อ 7)
> ปลายทาง: **Oracle Cloud Always Free** (Ampere ARM, Ubuntu 24.04) ที่ **https://app.foundlost.tech** — image build ทั้ง amd64/arm64 จึงย้ายไป VPS อื่น (เช่น Hostinger) ได้โดยไม่ต้องแก้
> `foundlost.tech` / `www` เป็นโปรเจกต์อื่นที่ deploy ไว้แล้ว — **ห้ามแก้ DNS ของ `@`, `www` และ AAAA ของโดเมนหลัก** แอปนี้เพิ่มแค่ A record `app`
> **อยู่ร่วม VPS กับแอปอื่นได้:** container ไม่ใช้พอร์ต 80/443 ของเครื่อง — web bind `127.0.0.1:3310` (Lab ใช้ 3300), โฟลเดอร์ `/opt/foundlost`, compose project `foundlost`, Nginx ของเครื่องเพิ่มเฉพาะไฟล์ `foundlost.conf` และ `deploy/check-vps.sh` ตรวจการชนก่อนทุก deploy
> **VPS จริง (`179.197.241.31`, Hostinger KVM 1):** 80/443 ถูก Caddy ของ `foundlost_production` (foundlost.tech เวอร์ชันเดิม, `/opt/it-project/FOUNDLOST`) ถืออยู่ → ใช้ **โหมด shared Caddy**: ต่อท้าย `Caddyfile.production` ของตัวเดิมด้วย block `app.foundlost.tech → foundlost-app-web:80` และ web ของแอปนี้เข้า network `foundlost_production_edge` (`deploy/compose.shared-caddy.yml`, เปิดด้วย `SHARED_CADDY_NETWORK` ใน `.env`) — `deploy/install.sh` เลือกโหมดและทำให้เอง
> ⚠️ ถ้าตัวเดิม deploy ใหม่แล้ว `Caddyfile.production` ถูกเขียนทับ ต้องเพิ่ม block กลับ (ไม่งั้น app.foundlost.tech ขึ้น 502) · ห้ามใช้ LINE channel เดียวกับตัวเดิม (webhook ได้ที่เดียว)

## 1. ภาพรวมโปรเจกต์

- Repository: `github.com/athiwat2626/LostfoundGer` (git root คือโฟลเดอร์แม่ของ `FOUNDLOST/`)
- frontend, backend และชุดทดสอบอยู่ใน repo เดียว แต่แยก `package.json` 4 ชุด (ไม่มี npm workspace)

| ส่วน | โฟลเดอร์ | เทคโนโลยี |
| --- | --- | --- |
| Frontend | `FOUNDLOST/frontend` | React 19 + Vite 8 + Tailwind 4 → static files |
| Backend | `FOUNDLOST/backend` | Node.js 24 + Express 5 (CommonJS) พอร์ต `3000` |
| Database | — | PostgreSQL 16 ผ่าน `pg` |
| ทดสอบ backend | `FOUNDLOST/backend/test` | `node:test` — `*.pg.test.js` ใช้ `TEST_DATABASE_URL` (ไม่ตั้ง = ข้าม) |
| ทดสอบ API | `testcase/backend` | Jest + Supertest (mock DB ทั้งหมด) |
| ทดสอบหน้าเว็บ | `testcase/frontend` | Vitest + React Testing Library |

- Build-time variable ของ frontend มีตัวเดียว: `VITE_API_URL` — production ใช้ `/backend` (ฝังลง JS ห้ามเป็น secret)
- **ตาราง:** backend สร้าง/อัปเดตตารางเองทุกครั้งที่เริ่ม (`database.sql` + `sql/*.sql` ทั้งหมดเป็น `IF NOT EXISTS`) จึงไม่มี container `migrate` แยก และฐานใหม่บน VPS ไม่ต้องรัน SQL เอง
- **ไฟล์อัปโหลด:** `backend/assets/{found,lost,profile,report}Uploads` เป็น volume แยก 4 ก้อน; `assets/fonts` (ฟอนต์เกียรติบัตร) และ `assets/line` (Rich Menu) อยู่ใน image

## 2. สถาปัตยกรรม

```text
git push main
  → CI: lint + build + node:test (+PostgreSQL ชั่วคราว) + Jest + Vitest + docker build + compose config
  → Deploy (หลัง CI ผ่านบน main):
      → GHCR: ghcr.io/athiwat2626/foundlost-backend, foundlost-web (latest + sha-xxxxxxx)
      → (เมื่อ DEPLOY_ENABLED=true) scp compose + สคริปต์ → VPS → deploy.sh sha-xxxxxxx
          → backup → pull → up -d → รอ backend healthy
      → ตรวจ https://app.foundlost.tech/backend/health = 200

Internet → Nginx ของ VPS :80/:443 (certbot, server_name app.foundlost.tech — แชร์กับเว็บอื่นได้)
         → 127.0.0.1:3310 → container web (Caddy :80 ภายใน)
             ├─ /backend/*  → ตัด /backend → Express :3000   (network edge)
             └─ อื่น ๆ      → React (SPA fallback → index.html)
Express → PostgreSQL :5432                               (network data, internal)
```

- ใช้ prefix `/backend` บนโดเมนเดียว เพราะ path ของ backend (`/admin/*`, `/user`, `/report` …) ชนกับหน้า React — Caddy ใน container ตัด prefix ให้ จึงไม่ต้องแก้ route และไม่ติด CORS
- ไม่มี container ใดเปิดพอร์ตออกนอกเครื่อง: web bind `127.0.0.1:${APP_PORT}` เท่านั้น; `db` อยู่ใน network `internal` ออกอินเทอร์เน็ตไม่ได้; `backend` ไม่มี published port

## 3. ไฟล์ที่เพิ่ม/แก้

| ไฟล์ | หน้าที่ |
| --- | --- |
| `FOUNDLOST/backend/Dockerfile` | Node 24 slim, `npm ci --omit=dev`, รันด้วย user `node`, `HEALTHCHECK` → `/health` |
| `FOUNDLOST/backend/.dockerignore` | กัน `.env*`, `node_modules`, `test`, รูปอัปโหลด, dump |
| `FOUNDLOST/deploy/Dockerfile.web` | build Vite (`VITE_API_URL=/backend`) → `caddy:2-alpine` |
| `FOUNDLOST/deploy/Caddyfile` | HTTP `:80` ใน container, `/backend/*` → backend, SPA fallback, cache ไฟล์ hash, security headers, body ≤ 6 MB |
| `FOUNDLOST/deploy/nginx.conf` | server block ของ `app.foundlost.tech` → `127.0.0.1:3310` (certbot เพิ่ม HTTPS) |
| `FOUNDLOST/deploy/check-vps.sh` | ตรวจพอร์ต / compose project / โดเมนใน Nginx / DNS ไม่ชนแอปอื่น (อ่านอย่างเดียว) |
| `FOUNDLOST/deploy/make-env.sh` | สร้าง `.env` + `backend.env` พร้อมสุ่มรหัส DB, `JWT_SECRET`, รหัสแอดมินแรก (ไม่เขียนทับ) |
| `FOUNDLOST/.dockerignore` | context ของ web image (ไม่รวม backend, `.env`) |
| `FOUNDLOST/compose.deploy.yml` | stack production: db → backend (healthy) → web, volumes, networks |
| `FOUNDLOST/deploy/.env.deploy.example` | ตัวอย่าง `.env` บน VPS (โดเมน, image, รหัส DB) |
| `FOUNDLOST/deploy/backend.env.example` | ตัวอย่าง `backend.env` (JWT, Gmail, LINE, Google) |
| `FOUNDLOST/deploy/setup-vps.sh` | เตรียม VPS ครั้งแรก: ติดตั้ง Docker / Nginx / certbot เฉพาะที่ยังไม่มี, เพิ่มกฎ allow 80/443 (ไม่ enable ufw ให้เอง), ผู้ใช้ deploy |
| `FOUNDLOST/deploy/deploy.sh` | deploy/rollback ตาม tag: backup → pull → up → รอ healthy |
| `FOUNDLOST/deploy/backup.sh` | `pg_dump -Fc` + tar รูปอัปโหลด, เก็บ 14 วัน |
| `FOUNDLOST/deploy/restore.sh` | ซ้อมกู้คืนลงฐานทดสอบ (ค่าเริ่มต้น) หรือ `--production` (ต้องพิมพ์ยืนยัน) |
| `FOUNDLOST/.gitattributes` | บังคับ LF ให้ `*.sh`, `*.yml`, Caddyfile, nginx.conf |
| `.github/workflows/ci.yml` | CI 5 jobs |
| `.github/workflows/deploy.yml` | publish GHCR + deploy (ปิดไว้จนตั้ง `DEPLOY_ENABLED=true`) |
| `FOUNDLOST/backend/server.js` | เพิ่ม `GET /health` (ก่อนโหมดปิดปรับปรุง), รัน `database.sql` ตอนเริ่ม |
| `FOUNDLOST/backend/services/notify.js` | ลิงก์ในอีเมลใช้ `APP_BASE_URL` ก่อน `APP_URL` (เดิมจะเป็น `localhost:5173`) |
| `FOUNDLOST/frontend/package.json` | ลบ dependency ฝั่ง server ที่ไม่ได้ใช้ (`bcrypt`, `express`, `pg`, `multer`, `nodemailer`, `pdfkit`) |
| `FOUNDLOST/backend/package.json` | ลบ `lucide-react` ที่ไม่ใช้, ย้าย `nodemon` เป็น devDependency |
| `FOUNDLOST/.gitignore` | ignore `backend.env` |

`FOUNDLOST/docker-compose.yml` (PostgreSQL + pgAdmin สำหรับพัฒนา) **ไม่ได้แก้**

## 4. ผลทดสอบในเครื่อง (27 ต.ค. 2569)

ทดสอบด้วย image ที่ build จริง + `compose.deploy.yml` (project แยก `foundlost-localtest`, ค่า dummy, `APP_DOMAIN=http://localhost`) แล้วลบ stack ทดสอบทิ้ง — ฐานข้อมูล dev เดิมไม่ถูกแตะ

- [x] backend / web image build ผ่าน; backend รันด้วย user `node`; ไม่มี `.env` ใน image; ฟอนต์และภาพ Rich Menu อยู่ครบ; JS ของหน้าเว็บเรียก `/backend`
- [x] `docker compose config --quiet` ผ่าน; `db`, `backend` ไม่มี published port; web bind เฉพาะ `127.0.0.1:3310` (ทดสอบซ้ำหลังเปลี่ยนเป็น Nginx ของเครื่อง: health 200 → หยุด DB 503 → เปิด DB 200, `/home` และ `/backend/api/settings/public` = 200)
- [x] `make-env.sh` สุ่มรหัสครบ ไม่เหลือ `change-me` ใน `.env` และไม่เขียนทับไฟล์เดิม; `bash -n` สคริปต์ทุกตัวผ่าน
- [x] ฐานว่าง → backend สร้างตารางเอง + seed แอดมิน → `healthy` → web เริ่ม
- [x] `/backend/health` = 200; หยุด DB → 503 และ backend ไม่ crash; DB กลับมา → 200
- [x] เปิดโหมดปิดปรับปรุง → API สาธารณะ 503 แต่ `/backend/health` ยัง 200
- [x] รีเฟรช `/home`, `/admin/dashboard` ได้ (SPA fallback); `/backend/api/settings/public` ถึง API; แอดมิน login ผ่าน proxy ได้
- [x] ไฟล์ใน `foundUploads` ยังอยู่หลัง recreate container backend
- [x] header: HSTS, `nosniff`, `Referrer-Policy`, ไม่มี `Server`; `index.html` เป็น `no-cache`
- [x] `backup.sh` ได้ `db.dump` + `uploads.tgz`; `restore.sh` ซ้อมกู้คืนลง `foundlost_restore_test` สำเร็จ
- [x] Jest 316/316, node:test 71/71 (ไม่รวม PG — CI รันพร้อม PostgreSQL), Vitest 190/190, lint 0 error, build ผ่าน

ยังทดสอบไม่ได้จนมีโดเมนจริง: ใบรับรอง HTTPS, LINE webhook verify, Rich Menu, ปุ่ม Google, อีเมล OTP จาก production (ข้อ 8)

## 5. กฎ

1. ห้าม commit `.env`, `backend.env`, token, รหัสผ่าน, รูปอัปโหลด และไฟล์ backup
2. ห้าม `docker compose -f compose.deploy.yml down -v`, `docker volume rm` หรือ `DROP DATABASE` บน VPS
3. ห้ามรันเทสกับฐานจริง (Jest/Vitest mock DB; PG test ใช้ฐานชั่วคราวของ CI เท่านั้น)
4. ทุก deploy ผ่าน `deploy.sh` ซึ่ง backup ก่อนเสมอ
5. เปลี่ยนสถาปัตยกรรม / reverse proxy / วิธีสร้างตาราง ต้องขออนุมัติก่อน

## 6. ค่า GitHub (Settings → Secrets and variables → Actions)

| ชนิด | ชื่อ | ค่า |
| --- | --- | --- |
| Variable | `DEPLOY_ENABLED` | `true` เมื่อพร้อม deploy (ไม่ตั้ง = publish image อย่างเดียว) |
| Secret (environment `production`) | `VPS_HOST` | IP ของ VPS |
| 〃 | `VPS_USER` | ผู้ใช้ deploy เช่น `deploy` |
| 〃 | `VPS_SSH_KEY` | private key (คู่กับ public key ใน `authorized_keys` ของ VPS) |
| 〃 | `VPS_APP_DIR` | เช่น `/opt/foundlost` |
| 〃 | `APP_HEALTH_URL` | `https://app.foundlost.tech/backend/health` |

ค่าระบบจริงอยู่ใน `.env` และ `backend.env` บน VPS เท่านั้น (ไม่อยู่ใน GitHub, ไม่เป็น build args)

## 7. ขั้นตอน deploy ครั้งแรก

**บนเครื่องพัฒนา**
1. commit ไฟล์ข้อ 3 แล้ว push / merge เข้า `main` → CI ต้องเขียวทุก job
2. workflow `Deploy` จะ publish image ขึ้น GHCR (job deploy ถูกข้ามเพราะยังไม่ตั้ง `DEPLOY_ENABLED`)

**ทางลัด: ข้อ 5–8 ด้วยคำสั่งเดียว** (root บน VPS, เช่น hPanel → VPS → จัดการ → Web console)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/athiwat2626/LostfoundGer/main/FOUNDLOST/deploy/install.sh)
```

ตรวจของเดิม → เลือกโหมด (Nginx หรือ shared Caddy) → ถาม `yes` + อีเมลแอดมิน → ติดตั้ง → แสดงค่าที่ต้องใส่ใน GitHub (ข้อ 9) — หยุดก่อนแตะอะไรถ้าเจอสิ่งที่ไม่รู้จัก

**VPS (ใช้เครื่องที่มีแอปอื่นอยู่แล้วได้ หรือ Oracle Cloud Always Free)**
3. ถ้าสร้าง Oracle Cloud ใหม่: Image = Ubuntu 24.04, Shape = VM.Standard.A1.Flex, เปิด Public IPv4
   - Networking → VCN → Security List → Add Ingress Rules: `0.0.0.0/0` TCP 80, TCP 443
   - ผู้ใช้เริ่มต้นคือ `ubuntu`: `ssh -i ~/.ssh/foundlost_oracle ubuntu@<IP>`
   - ใช้ VPS เดียวกับแอป Lab / เว็บอื่นก็ได้ — แอปนี้ไม่แย่ง 80/443 (ใช้ Nginx ตัวเดิมของเครื่อง)
4. DNS ของ `foundlost.tech`: **เพิ่ม** A record ชื่อ `app` → IP ของ VPS (ห้ามแก้ระเบียน `@`/`www` เดิม)
   - โดเมนหลักตั้ง HSTS `includeSubDomains` → โดเมนย่อยต้องมี HTTPS (ข้อ 8) ตรวจ DNS: `nslookup app.foundlost.tech`

**บน VPS**
5. คัดลอก `FOUNDLOST/deploy/setup-vps.sh` ขึ้นไปแล้วรัน `sudo bash setup-vps.sh deploy /opt/foundlost`
   (ติดตั้ง Docker / Nginx / certbot เฉพาะที่ยังไม่มี, ไม่แตะเว็บและไฟร์วอลล์เดิม; ถ้า `/opt/foundlost` มีไฟล์ของโปรแกรมอื่นจะหยุด)
6. สร้าง SSH key สำหรับ GitHub Actions (บนเครื่องพัฒนา: `ssh-keygen -t ed25519 -f foundlost_deploy -N ""`) → ใส่ `.pub` ใน `/home/deploy/.ssh/authorized_keys`
7. คัดลอก `FOUNDLOST/compose.deploy.yml` และโฟลเดอร์ `FOUNDLOST/deploy/` ไปไว้ที่ `/opt/foundlost` แล้ว (ผู้ใช้ `deploy`):
   - `bash deploy/make-env.sh <อีเมลแอดมิน>` → สร้าง `.env` + `backend.env` พร้อมสุ่มรหัส (chmod 600 ให้)
   - `nano backend.env` → ใส่ `MAIL_*`, `LINE_*`, `GOOGLE_*` เอง
   - `bash deploy/check-vps.sh` → ต้องขึ้น ✓ ทุกข้อ (ถ้าพอร์ต 3310 ชน: แก้ `APP_PORT` ใน `.env` และ `proxy_pass` ใน `deploy/nginx.conf`)
8. ติดตั้ง Nginx ของแอปนี้ (root):
   - `sudo cp /opt/foundlost/deploy/nginx.conf /etc/nginx/sites-available/foundlost.conf`
   - `sudo ln -s /etc/nginx/sites-available/foundlost.conf /etc/nginx/sites-enabled/foundlost.conf`
   - `sudo nginx -t && sudo systemctl reload nginx`
   - `sudo certbot --nginx -d app.foundlost.tech --redirect`

**GitHub**
9. ตั้ง secrets/variable ตามข้อ 6 → Actions → `Deploy` → Run workflow (branch `main`)
10. ถ้า package บน GHCR เป็น private ไม่ต้องทำอะไรเพิ่ม (workflow login ให้ด้วย token ของ job)

**หลัง deploy สำเร็จ (ทำครั้งเดียว)**
11. LINE Developers → Webhook URL `https://app.foundlost.tech/backend/api/line/webhook` → Verify
12. Rich Menu: `cd /opt/foundlost && docker compose -f compose.deploy.yml exec backend node scripts/line/deployRichMenu.js`
13. Google Cloud → OAuth client → Authorized JavaScript origins เพิ่ม `https://app.foundlost.tech`
14. ตั้ง backup รายวัน: `crontab -e` → `0 3 * * * /opt/foundlost/deploy/backup.sh >> /opt/foundlost/backup.log 2>&1`
15. ตั้ง monitor ภายนอก (เช่น UptimeRobot) ตรวจ `https://app.foundlost.tech/backend/health`

**ย้ายข้อมูลจากเครื่องพัฒนา (ถ้าต้องการ)**
- เครื่องพัฒนา: `docker exec postgres pg_dump -U postgres -d foundlost_db -Fc > db.dump` และ zip โฟลเดอร์ `backend/assets/*Uploads` เป็น `uploads.tgz` (`tar czf uploads.tgz -C backend/assets foundUploads lostUploads profileUploads reportUploads`)
- อัปโหลดทั้งสองไฟล์ไว้ในโฟลเดอร์เดียวบน VPS → `bash deploy/restore.sh <โฟลเดอร์>` (ซ้อมก่อน) → `bash deploy/restore.sh <โฟลเดอร์> --production`

## 8. การดูแลประจำ

| งาน | คำสั่ง (ใน `/opt/foundlost`) |
| --- | --- |
| deploy เวอร์ชันใหม่ | push เข้า `main` (อัตโนมัติ) |
| rollback | Actions → Deploy → Run workflow → `tag` = `sha-xxxxxxx` เก่า หรือ `bash deploy/deploy.sh sha-xxxxxxx` |
| แก้ค่าใน `backend.env` | `bash deploy/deploy.sh` (ไม่ใส่ tag = ใช้ image เดิม) |
| ดู log | `docker compose -f compose.deploy.yml logs -f --tail=100 backend` |
| สถานะ | `docker compose -f compose.deploy.yml ps` |
| สำรองทันที | `bash deploy/backup.sh` |
| ซ้อมกู้คืน | `bash deploy/restore.sh ~/foundlost-backups/<วันเวลา>` |

ตรวจหลัง deploy จริงครั้งแรก:
- [ ] `https://app.foundlost.tech` ขึ้นกุญแจ HTTPS และ `/backend/health` = 200
- [ ] ส่ง OTP ได้ และลิงก์ในอีเมลเป็นโดเมนจริง
- [ ] โพสต์ของหาย/เจอของพร้อมรูปได้ และรูปแสดงผล
- [ ] ออกเกียรติบัตร PDF ได้ (ฟอนต์ไทย)
- [ ] LINE: Verify webhook, เชื่อมบัญชี, Rich Menu เปิดหน้าเว็บโดเมนจริง, แจ้งเตือนจับคู่
- [ ] ปุ่ม Google แสดงและเข้าสู่ระบบ 2 ขั้น (Google → OTP) ได้
- [ ] ซ้อม restore จาก backup รายวันครั้งแรกผ่าน

## 9. เอกสารที่เกี่ยวข้อง

- `FOUNDLOST/README.md` — รันในเครื่อง
- `FOUNDLOST/README-LINE.md` — ตั้งค่า LINE Messaging API
- `testcase/TEST_PLAN.md`, `testcase/TEST_CASES.md` — แผนและผลการทดสอบ
