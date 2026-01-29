import { prisma } from "../db.js";
import { getSessionIdFromCookie } from "../middleware/auth.js";

export function setupSocket(io) {
  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const sessionId = getSessionIdFromCookie(cookieHeader);

      if (!sessionId) {
        return next(new Error("Unauthorized"));
      }

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        return next(new Error("Session expired"));
      }

      socket.user = session.user;
      next();
    } catch (error) {
      console.error("Socket auth error:", error);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.user.username}`);

    // Join user-specific room for receiving messages across all chats
    socket.join(`user:${socket.user.id}`);

    // Join a specific chat room (for presence tracking)
    socket.on("join-chat", async (chatId) => {
      // Verify user is a participant
      const participant = await prisma.chatParticipant.findUnique({
        where: {
          chatId_userId: { chatId, userId: socket.user.id },
        },
      });

      if (participant) {
        socket.join(chatId);
        console.log(`${socket.user.username} joined chat ${chatId}`);
      }
    });

    // Leave a specific chat room
    socket.on("leave-chat", (chatId) => {
      socket.leave(chatId);
      console.log(`${socket.user.username} left chat ${chatId}`);
    });

    // Handle typing events - server just relays, client manages timeouts
    socket.on("typing", async ({ chatId }) => {
      if (!chatId) return;

      const participants = await prisma.chatParticipant.findMany({
        where: { chatId },
        select: { userId: true },
      });

      for (const p of participants) {
        if (p.userId !== socket.user.id) {
          io.to(`user:${p.userId}`).emit("user-typing", {
            chatId,
            userId: socket.user.id,
            username: socket.user.username,
          });
        }
      }
    });

    socket.on("typing-stop", async ({ chatId }) => {
      if (!chatId) return;

      const participants = await prisma.chatParticipant.findMany({
        where: { chatId },
        select: { userId: true },
      });

      for (const p of participants) {
        if (p.userId !== socket.user.id) {
          io.to(`user:${p.userId}`).emit("user-stop-typing", {
            chatId,
            userId: socket.user.id,
          });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.username}`);
    });
  });

  return io;
}
