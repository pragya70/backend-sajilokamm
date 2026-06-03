import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Tasker API",
      version: "1.0.0",
      description: "REST API documentation for the Tasker platform",
    },
    servers: [
      {
        url: process.env.API_URL || "https://dev.api.sajilokaam.com",
        description: "Production server",
      },
      {
        url: "http://localhost:4000",
        description: "Local development",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["USER", "TASKER", "ADMIN"] },
            image: { type: "string", nullable: true },
            verificationStatus: { type: "string" },
            selectedCategories: { type: "array", items: { type: "string" } },
          },
        },
        Task: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            budget: { type: "number" },
            status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
            category: { type: "string", nullable: true },
            location: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
