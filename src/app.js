import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { authMiddleware } from "./lib/auth.js";
import { swaggerSpec } from "./lib/swagger.js";

// ─── Route imports ────────────────────────────────────────────────────────────
import authRoutes from "./routes/auth.js";
import registerRoutes from "./routes/register.js";
import categoriesRoutes from "./routes/categories.js";
import tasksRoutes from "./routes/tasks.js";
import offersRoutes from "./routes/offers.js";
import notificationsRoutes from "./routes/notifications.js";
import messagesRoutes from "./routes/messages.js";
import conversationsRoutes from "./routes/conversations.js";
import friendsRoutes from "./routes/friends.js";
import reviewsRoutes from "./routes/reviews.js";
import uploadRoutes from "./routes/upload.js";
import transactionsRoutes from "./routes/transactions.js";
import userRoutes from "./routes/user.js";
import kycRoutes from "./routes/kyc.js";
import taskerRoutes from "./routes/tasker.js";
import paymentsRoutes from "./routes/payments.js";
import adminRoutes from "./routes/admin.js";
import aiRoutes from "./routes/ai.js";
import mobileRoutes from "./routes/mobile.js";
import cronRoutes from "./routes/cron.js";
import setupAdminRoutes from "./routes/setup-admin.js";
import testRoutes from "./routes/test.js";

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim());

const isLocalhostOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

app.use(
  cors({
    origin:
      allowedOrigins.length === 1 && allowedOrigins[0] === "*"
        ? true
        : (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            if (process.env.NODE_ENV !== "production" && isLocalhostOrigin(origin)) {
              return callback(null, true);
            }
            return callback(new Error(`Not allowed by CORS: ${origin}`));
          },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With", "ngrok-skip-browser-warning"],
    credentials: true,
  })
);

// ─── Body parsers ─────────────────────────────────────────────────────────────
// Raw body needed for Stripe webhook signature verification
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ─── Auth middleware (populates req.user on every request) ────────────────────
app.use(authMiddleware);

// ─── Static files (uploaded images) ──────────────────────────────────────────
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(join(__dirname, "../../public/uploads")));

// ─── Swagger UI ───────────────────────────────────────────────────────────────
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/swagger.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/register", registerRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/user", userRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/tasker", taskerRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/mobile", mobileRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/setup-admin", setupAdminRoutes);
app.use("/api/test", testRoutes);

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
