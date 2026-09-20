// เอกสาร OpenAPI ที่ Swagger UI ใช้งานที่ /api-docs
const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "FOUND&LOST API",
    version: "1.0.0",
    description: "Comprehensive API for FOUND&LOST system - reporting, browsing lost/found items, user authentication, and certificate system.",
    contact: {
      name: "API Support",
      url: "http://localhost:3000",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    { url: "http://localhost:3000", description: "Development server" },
    { url: "http://localhost:5173", description: "Frontend development server" },
  ],
  tags: [
    { name: "Health Check", description: "System status endpoints" },
    { name: "Items", description: "Lost and found item management" },
    { name: "Authentication", description: "User registration, login, and OTP verification" },
    { name: "Users", description: "User profile and data endpoints" },
    { name: "Certificates", description: "Certificate and successful returns tracking" },
    { name: "Reports", description: "User and item report management" },
    { name: "Admin", description: "Admin authentication, moderation, and management endpoints" },
  ],
  paths: {
    "/": {
      get: {
        tags: ["Health Check"],
        summary: "Health check endpoint",
        description: "Check if the server is running and responding",
        responses: {
          200: {
            description: "Server is healthy",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Hello World!" },
              },
            },
          },
        },
      },
    },
    "/foundItem": {
      get: {
        tags: ["Items"],
        summary: "Get all found items",
        description: "Retrieve a list of all reported found items",
        responses: {
          200: {
            description: "Found items retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/FoundItem" },
                },
              },
            },
          },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Items"],
        summary: "Create a new found item",
        description: "Report a new found item with details and optional image",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/FoundItemInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Found item created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ItemCreatedResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/lostItem": {
      get: {
        tags: ["Items"],
        summary: "Get all lost items",
        description: "Retrieve a list of all reported lost items",
        responses: {
          200: {
            description: "Lost items retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/LostItem" },
                },
              },
            },
          },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Items"],
        summary: "Create a new lost item",
        description: "Report a new lost item with details and optional image",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/LostItemInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Lost item created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ItemCreatedResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/send-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Send OTP to email",
        description: "Generate and send a 6-digit OTP code to the user's registered email address. Valid for 5 minutes.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SendOtpRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "OTP sent successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "OTP Sent Successfully",
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid email format",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: {
                      type: "string",
                      example: "A valid email is required",
                    },
                  },
                },
              },
            },
          },
          404: {
            description: "Email not found in system",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Email not found" },
                  },
                },
              },
            },
          },
          503: {
            description: "Email service not configured",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: {
                      type: "string",
                      example: "Email service is not configured",
                    },
                  },
                },
              },
            },
          },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/verify-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Verify OTP code",
        description: "Verify the OTP code sent to user's email. OTP must be valid and not expired.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyOtpRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "OTP verified successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "OTP Verified Successfully",
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid or expired OTP",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: {
                      type: "string",
                      example: "Invalid or expired OTP",
                    },
                  },
                },
              },
            },
          },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/user": {
      get: {
        tags: ["Users"],
        summary: "Get current user data",
        description: "Retrieve the current user's profile information",
        responses: {
          200: {
            description: "User data retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/users/{email}": {
      get: {
        tags: ["Users"],
        summary: "Get user by email",
        description: "Retrieve public user profile information by email address",
        parameters: [
          {
            name: "email",
            in: "path",
            required: true,
            description: "User's email address",
            schema: { type: "string", format: "email" },
            example: "user@example.com",
          },
        ],
        responses: {
          200: {
            description: "User profile retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    user: { $ref: "#/components/schemas/UserPublic" },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid email format",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/report": {
      post: {
        tags: ["Reports"],
        summary: "Submit a user/item report",
        description: "Report a suspicious found or lost item posting. Accepts optional image evidence (max 5 MB).",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["reported_item_id", "item_type", "reason"],
                properties: {
                  reported_item_id: { type: "integer", description: "ID of the item being reported", example: 42 },
                  item_type: { type: "string", enum: ["found", "lost"], description: "Whether the item is a found or lost listing", example: "found" },
                  reason: { type: "string", maxLength: 100, description: "Reason for the report", example: "การรายงานของพบปลอม" },
                  detail: { type: "string", maxLength: 500, description: "Additional details (optional)", example: "รายการนี้ดูน่าสงสัย" },
                  reporter_student_id: { type: "string", description: "Student ID of the reporter (optional)", example: "6510000001" },
                  evidence: { type: "string", format: "binary", description: "Evidence image file (optional, max 5 MB)" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Report submitted successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReportCreatedResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/admin/auth/login": {
      post: {
        tags: ["Admin"],
        summary: "Admin login",
        description: "Authenticate with an admin email and password, returning a Bearer JWT.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful, returns a Bearer token" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { description: "Invalid email or password" },
        },
      },
    },
    "/admin/auth/me": {
      get: {
        tags: ["Admin"],
        summary: "Get the current admin",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Current admin info" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/admin/auth/profile": {
      patch: {
        tags: ["Admin"],
        summary: "Update the current admin's display name",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["display_name"],
                properties: {
                  display_name: { type: "string", maxLength: 100 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated admin profile" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/admin/auth/change-password": {
      post: {
        tags: ["Admin"],
        summary: "Change the current admin's password",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["current_password", "new_password"],
                properties: {
                  current_password: { type: "string" },
                  new_password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Password updated" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { description: "Current password is incorrect / unauthorized" },
        },
      },
    },
    "/admin/dashboard/stats": {
      get: {
        tags: ["Admin"],
        summary: "Get dashboard stat tiles",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Aggregate counts for users, items, reports, suspended/banned users" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/admin/activity": {
      get: {
        tags: ["Admin"],
        summary: "Recent admin activity",
        description: "Recently resolved/dismissed reports with who acted on them and when, for a Settings-page audit trail.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }],
        responses: {
          200: { description: "Recent activity entries" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/admin/reports": {
      get: {
        tags: ["Admin"],
        summary: "List reports (Review Center queue)",
        description: "Reports joined with reporter/reported-user identity, filterable by status and free-text search.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["all", "pending", "under_review", "resolved", "dismissed"] } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "offset", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Reports, total count, and stat-tile counts" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/admin/reports/{report_id}": {
      get: {
        tags: ["Admin"],
        summary: "Get a single report's detail",
        description: "Includes reporter/reported-user cards, evidence, and a derived timeline. Auto-transitions a pending report to under_review.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "report_id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Report detail" },
          401: { description: "Unauthorized" },
          404: { description: "Report not found" },
        },
      },
    },
    "/admin/reports/{report_id}/moderate": {
      post: {
        tags: ["Admin"],
        summary: "Moderate a report",
        description: "Atomically resolves the report and, for warn/suspend/ban, applies the effect to the reported user.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "report_id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: { type: "string", enum: ["dismiss", "warn", "suspend", "ban"] },
                  duration_days: { type: "integer", enum: [3, 7, 30], description: "Required when action is 'suspend'" },
                  note: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated report" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { description: "Unauthorized" },
          404: { description: "Report or reported user not found" },
        },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users (admin management)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["all", "active", "suspended", "banned"] } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "offset", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Users and total count" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/admin/users/{student_id}/action": {
      post: {
        tags: ["Admin"],
        summary: "Directly moderate a user",
        description: "Used by the Users page for warn/suspend/ban and for the only place unsuspend/unban happen.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "student_id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: { type: "string", enum: ["warn", "suspend", "ban", "unsuspend", "unban"] },
                  duration_days: { type: "integer", enum: [3, 7, 30], description: "Required when action is 'suspend'" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated user" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { description: "Unauthorized" },
          404: { description: "User not found" },
        },
      },
    },
    "/admin/items": {
      get: {
        tags: ["Admin"],
        summary: "List found/lost items (admin management)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "type", in: "query", required: true, schema: { type: "string", enum: ["found", "lost"] } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "offset", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Items and total count" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/admin/items/{type}/{item_id}": {
      patch: {
        tags: ["Admin"],
        summary: "Edit a found/lost item listing",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "type", in: "path", required: true, schema: { type: "string", enum: ["found", "lost"] } },
          { name: "item_id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["item_name"],
                properties: {
                  item_name: { type: "string" },
                  category: { type: "string" },
                  item_color: { type: "string" },
                  description: { type: "string" },
                  deposit_location: { type: "string" },
                  found_date: { type: "string", format: "date", description: "Required when type is 'found'" },
                  found_location: { type: "string", description: "Required when type is 'found'" },
                  lost_date: { type: "string", format: "date", description: "Required when type is 'lost'" },
                  lost_location: { type: "string", description: "Required when type is 'lost'" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated item" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { description: "Unauthorized" },
          404: { description: "Item not found" },
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete a found/lost item listing",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "type", in: "path", required: true, schema: { type: "string", enum: ["found", "lost"] } },
          { name: "item_id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Item deleted" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { description: "Unauthorized" },
          404: { description: "Item not found" },
        },
      },
    },
    "/api/returns/confirm-success": {
      post: {
        tags: ["Certificates"],
        summary: "Confirm successful item return",
        description: "Mark an item return as successful using the recipient's email. When the return count reaches 3, 6, 9, etc., a certificate PDF is sent directly to that email address.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "Email address of the person who returned the item",
                    example: "user@example.com",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Return confirmed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "บันทึกการส่งคืนของสำเร็จแล้ว",
                    },
                    successfulReturns: {
                      type: "integer",
                      description: "Total number of successful returns",
                      example: 3,
                    },
                    certificateIssued: {
                      type: "boolean",
                      description: "Whether a certificate was issued for reaching milestone",
                      example: true,
                    },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          404: { description: "User email not found" },
          500: { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
  },
  components: {
    schemas: {
      ItemFields: {
        type: "object",
        properties: {
          item_name: {
            type: "string",
            maxLength: 255,
            description: "Name of the item",
            example: "Red Wallet",
          },
          category: {
            type: "string",
            maxLength: 100,
            description: "Category of the item",
            example: "Accessories",
          },
          item_color: {
            type: "string",
            maxLength: 100,
            description: "Color of the item",
            example: "Red",
          },
          description: {
            type: "string",
            maxLength: 5000,
            description: "Detailed description of the item",
            example: "Red leather wallet with student ID inside",
          },
          deposit_location: {
            type: "string",
            maxLength: 255,
            description: "Where the item can be picked up or where it was deposited",
            example: "Library Information Desk",
          },
          image: {
            type: "string",
            format: "binary",
            description: "Image file of the item (optional)",
          },
        },
        required: ["item_name"],
      },
      FoundItemInput: {
        allOf: [
          { $ref: "#/components/schemas/ItemFields" },
          {
            type: "object",
            required: ["found_date", "found_location"],
            properties: {
              found_date: {
                type: "string",
                format: "date",
                description: "Date when the item was found",
                example: "2024-09-02",
              },
              found_location: {
                type: "string",
                maxLength: 255,
                description: "Location where the item was found",
                example: "Parking Lot A",
              },
            },
          },
        ],
      },
      LostItemInput: {
        allOf: [
          { $ref: "#/components/schemas/ItemFields" },
          {
            type: "object",
            required: ["lost_date", "lost_location"],
            properties: {
              lost_date: {
                type: "string",
                format: "date",
                description: "Date when the item was lost",
                example: "2024-09-01",
              },
              lost_location: {
                type: "string",
                maxLength: 255,
                description: "Location where the item was lost",
                example: "Classroom B101",
              },
            },
          },
        ],
      },
      FoundItem: {
        type: "object",
        properties: {
          item_id: { type: "integer" },
          item_name: { type: "string" },
          category: { type: "string" },
          item_color: { type: "string" },
          description: { type: "string" },
          deposit_location: { type: "string" },
          found_date: { type: "string", format: "date" },
          found_location: { type: "string" },
          image_url: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      LostItem: {
        type: "object",
        properties: {
          item_id: { type: "integer" },
          item_name: { type: "string" },
          category: { type: "string" },
          item_color: { type: "string" },
          description: { type: "string" },
          deposit_location: { type: "string" },
          lost_date: { type: "string", format: "date" },
          lost_location: { type: "string" },
          image_url: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      ItemCreatedResponse: {
        type: "object",
        properties: {
          item_id: { type: "integer", description: "ID of the created item" },
        },
        example: { item_id: 42 },
      },
      SendOtpRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "Email address to send OTP to",
            example: "user@example.com",
          },
        },
      },
      VerifyOtpRequest: {
        type: "object",
        required: ["email", "otp"],
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "Email address that received the OTP",
            example: "user@example.com",
          },
          otp: {
            type: "string",
            pattern: "^[0-9]{6}$",
            description: "6-digit OTP code",
            example: "123456",
          },
        },
      },
      User: {
        type: "object",
        properties: {
          student_id: { type: "string", description: "Unique student identifier" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string", format: "email" },
          profile_image: { type: "string", nullable: true, description: "URL to user's profile image" },
          successful_returns: {
            type: "integer",
            description: "Number of successful item returns",
          },
        },
      },
      UserPublic: {
        type: "object",
        description: "Public user profile information",
        properties: {
          student_id: { type: "string" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string", format: "email" },
          profile_image: { type: "string", nullable: true },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
            description: "Error code or type",
          },
          message: {
            type: "string",
            description: "Human-readable error message",
          },
          success: {
            type: "boolean",
            description: "Whether the request was successful",
          },
        },
      },
      Report: {
        type: "object",
        properties: {
          report_id: { type: "string", example: "RPT-2026-001245" },
          reporter_student_id: { type: "string", nullable: true, example: "6510000001" },
          reported_item_id: { type: "integer", example: 42 },
          item_type: { type: "string", enum: ["found", "lost"] },
          reason: { type: "string", example: "การรายงานของพบปลอม" },
          detail: { type: "string", nullable: true },
          evidence_url: { type: "string", nullable: true },
          status: { type: "string", enum: ["pending", "reviewing", "resolved"], example: "pending" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      ReportCreatedResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          report_id: { type: "string", example: "RPT-2026-001245" },
          created_at: { type: "string", format: "date-time" },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Invalid request parameters or body",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      InternalServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      SuccessMessage: {
        description: "Request completed successfully",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Admin JWT returned by POST /admin/auth/login",
      },
    },
  },
};

module.exports = swaggerSpec;