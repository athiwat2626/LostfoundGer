# Backend ของ FOUND&LOST (Express 5 + PostgreSQL)
# build: docker build -t foundlost-backend FOUNDLOST/backend
# ค่า environment ทั้งหมดส่งเข้ามาตอนรัน (compose.deploy.yml) — ไม่มีไฟล์ .env อยู่ใน image
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# โฟลเดอร์รูปที่ผู้ใช้อัปโหลด — compose mount volume ทับทีละโฟลเดอร์ (assets/fonts และ assets/line เป็นไฟล์ของโค้ด)
RUN mkdir -p assets/foundUploads assets/lostUploads assets/profileUploads assets/reportUploads \
 && chown -R node:node assets
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
