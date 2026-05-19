import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HTTPServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socket",
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join user-specific room
    socket.on("join-user-room", (userId: string) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Leave user room
    socket.on("leave-user-room", (userId: string) => {
      socket.leave(`user-${userId}`);
      console.log(`User ${userId} left their room`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initSocketIO first.");
  }
  return io;
}

// Helper function to emit notification to a specific user
export function emitNotificationToUser(userId: string, notification: any) {
  try {
    const socketIO = getIO();
    socketIO.to(`user-${userId}`).emit("new-notification", notification);
    console.log(`Notification sent to user ${userId}`);
  } catch (error) {
    console.error("Failed to emit notification:", error);
  }
}

// Helper function to emit notification to all admins
export async function emitNotificationToAdmins(notification: any) {
  try {
    const { prisma } = await import("./prisma");
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    const socketIO = getIO();
    admins.forEach((admin) => {
      socketIO.to(`user-${admin.id}`).emit("new-notification", notification);
    });
    console.log(`Notification sent to ${admins.length} admins`);
  } catch (error) {
    console.error("Failed to emit notification to admins:", error);
  }
}
