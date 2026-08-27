// เอกสาร OpenAPI ที่ Swagger UI ใช้งานที่ /api-docs
const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "FOUND&LOST API",
    version: "1.0.0",
    description: "API for reporting and browsing lost and found items.",
  },
  // URL หลักที่ Swagger UI ใช้เมื่อส่ง request
  servers: [{ url: "http://localhost:3000" }],
  // จัดกลุ่ม endpoint ตามหน้าที่ของระบบ
  tags: [
    { name: "Items", description: "Lost and found item endpoints" },
    { name: "Authentication", description: "Email OTP endpoints" },
    { name: "Users", description: "User endpoints" },
  ],
  // อธิบาย endpoint ที่เปิดใช้งาน รวมถึงรูปแบบ request และ response
  paths: {
    "/foundItem": {
      get: {
        tags: ["Items"],
        summary: "List found items",
        responses: { 200: { description: "Found items returned successfully" }, 500: { $ref: "#/components/responses/InternalServerError" } },
      },
      post: {
        tags: ["Items"],
        summary: "Create a found item",
        requestBody: { required: true, content: { "multipart/form-data": { schema: { $ref: "#/components/schemas/FoundItemInput" } } } },
        responses: {
          201: { description: "Found item created", content: { "application/json": { schema: { $ref: "#/components/schemas/ItemCreated" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/lostItem": {
      get: {
        tags: ["Items"],
        summary: "List lost items",
        responses: { 200: { description: "Lost items returned successfully" }, 500: { $ref: "#/components/responses/InternalServerError" } },
      },
      post: {
        tags: ["Items"],
        summary: "Create a lost item",
        requestBody: { required: true, content: { "multipart/form-data": { schema: { $ref: "#/components/schemas/LostItemInput" } } } },
        responses: {
          201: { description: "Lost item created", content: { "application/json": { schema: { $ref: "#/components/schemas/ItemCreated" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/user": {
      get: {
        tags: ["Users"],
        summary: "List users",
        responses: { 200: { description: "Users returned successfully" }, 500: { $ref: "#/components/responses/InternalServerError" } },
      },
    },
    "/api/send-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Send a one-time password to a registered email",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EmailRequest" } } } },
        responses: {
          200: { $ref: "#/components/responses/SuccessMessage" },
          400: { $ref: "#/components/responses/BadRequest" },
          404: { description: "Email not found" },
          503: { description: "Email service is not configured" },
        },
      },
    },
    "/api/verify-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Verify a one-time password",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/VerifyOtpRequest" } } } },
        responses: { 200: { $ref: "#/components/responses/SuccessMessage" }, 400: { $ref: "#/components/responses/BadRequest" } },
      },
    },
    "/api/users/{email}": {
      get: {
        tags: ["Users"],
        summary: "Get a user by email",
        parameters: [{ name: "email", in: "path", required: true, schema: { type: "string", format: "email" } }],
        responses: { 200: { description: "User returned successfully" }, 400: { $ref: "#/components/responses/BadRequest" }, 404: { description: "User not found" } },
      },
    },
  },
  // Schema และรูปแบบ response ที่นำกลับมาใช้ซ้ำได้
  components: {
    // รูปแบบข้อมูลนำเข้าและส่งออกที่แสดงใน Swagger UI
    schemas: {
      ItemFields: {
        type: "object",
        properties: {
          item_name: { type: "string", maxLength: 255 },
          category: { type: "string", maxLength: 100 },
          item_color: { type: "string", maxLength: 100 },
          description: { type: "string", maxLength: 5000 },
          deposit_location: { type: "string", maxLength: 255 },
          image: { type: "string", format: "binary" },
        },
        required: ["item_name"],
      },
      FoundItemInput: { allOf: [{ $ref: "#/components/schemas/ItemFields" }, { type: "object", required: ["found_date", "found_location"], properties: { found_date: { type: "string", format: "date" }, found_location: { type: "string", maxLength: 255 } } }] },
      LostItemInput: { allOf: [{ $ref: "#/components/schemas/ItemFields" }, { type: "object", required: ["lost_date", "lost_location"], properties: { lost_date: { type: "string", format: "date" }, lost_location: { type: "string", maxLength: 255 } } }] },
      ItemCreated: { type: "object", properties: { item_id: { type: "integer" } } },
      EmailRequest: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } },
      VerifyOtpRequest: { type: "object", required: ["email", "otp"], properties: { email: { type: "string", format: "email" }, otp: { type: "string", pattern: "^[0-9]{6}$" } } },
      Error: { type: "object", properties: { error: { type: "string" }, message: { type: "string" }, success: { type: "boolean" } } },
    },
    // รูปแบบ response สำเร็จและ response ข้อผิดพลาดที่ใช้ร่วมกัน
    responses: {
      BadRequest: { description: "Invalid request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      InternalServerError: { description: "Internal server error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      SuccessMessage: { description: "Request completed successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
  },
};

module.exports = swaggerSpec;