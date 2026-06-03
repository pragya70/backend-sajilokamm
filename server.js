import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./src/app.js";

const port = parseInt(process.env.PORT || "4000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";

const httpServer = createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim());

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length === 1 && allowedOrigins[0] === "*" ? "*" : allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/api/socketio",
});

// Store io instance globally so lib/notifications.ts can use it
global.io = io;

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("join-user-room", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  socket.on("leave-user-room", (userId) => {
    socket.leave(`user-${userId}`);
    console.log(`👋 User ${userId} left their room`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

httpServer
  .once("error", (err) => {
    console.error(err);
    process.exit(1);
  })
  .listen(port, hostname, () => {
    console.log(`> Backend ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO ready on path: /api/socketio`);
  });
