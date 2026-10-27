// ค่า environment สำหรับการทดสอบ (ไม่ต่อฐานข้อมูลจริง เพราะทุกไฟล์ mock ./db ไว้)
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.DB_PASSWORD = "test";
process.env.MAIL_USER = "noreply@test.local";
process.env.MAIL_APP_PASSWORD = "app-password";
delete process.env.NOTIFY_API_KEY;
delete process.env.ADMIN_SEED_EMAIL;
delete process.env.ADMIN_SEED_PASSWORD;
delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
delete process.env.LINE_USER_ID;

// ปิด log ของ backend ระหว่างรันเทส
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "warn").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_ALLOWED_DOMAINS;
