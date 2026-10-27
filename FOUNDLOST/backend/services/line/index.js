// ประกอบบริการ LINE ที่ใช้งานจริง (ฐานข้อมูลจริง + LINE API จริง)
// ไฟล์ทดสอบสร้างบริการเองด้วย repository/client จำลองผ่านฟังก์ชัน create* แต่ละตัว
const db = require("../../db");
const client = require("./lineClient");
const { getLineConfig, isMessagingConfigured } = require("./config");
const { createLineRepository } = require("./lineRepository");
const { createAccountLinking } = require("./accountLinking");
const { createWebhookHandler } = require("./webhook");
const { createMatchDelivery } = require("./matchDelivery");

const repo = createLineRepository(db);
const linking = createAccountLinking({ repo, ttlMinutes: () => getLineConfig().linkTokenTtlMinutes });
const webhook = createWebhookHandler({ repo, client, linking, getConfig: getLineConfig });
const matchDelivery = createMatchDelivery({ repo, client, isConfigured: isMessagingConfigured });

// งานดูแลระบบเป็นระยะ: ลองส่งใหม่ + ล้าง event/รหัสเชื่อมเก่า
const startLineBackgroundJobs = () => {
  matchDelivery.startRetryWorker();
  const cleanup = setInterval(() => {
    repo.pruneWebhookEvents().catch((error) => console.error("[line] prune webhook events failed:", error.message));
    repo.pruneLinkTokens().catch((error) => console.error("[line] prune link tokens failed:", error.message));
  }, 60 * 60 * 1000);
  cleanup.unref();
};

module.exports = { repo, linking, webhook, matchDelivery, startLineBackgroundJobs };
