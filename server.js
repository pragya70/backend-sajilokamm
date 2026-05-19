import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socketio",
  });

  // Store io instance globally
  global.io = io;

  io.on("connection", (socket) => {
    console.log("✅ Client connected:", socket.id);

    // Join user-specific room
    socket.on("join-user-room", (userId) => {
      socket.join(`user-${userId}`);
      console.log(`👤 User ${userId} joined their room`);
    });

    // Leave user room
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
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO ready on path: /api/socketio`);
    });
});
