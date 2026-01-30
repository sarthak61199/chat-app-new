import { prisma } from "../db.js";
import { getSessionIdFromCookie } from "../middleware/auth.js";

// Map<userId, Set<socketId>> - tracks all connections per user
const onlineUsers = new Map();

// Get all users the given user shares active chats with
async function getChatContacts(userId) {
  const contacts = await prisma.chatParticipant.findMany({
    where: {
      chat: { participants: { some: { userId, deletedAt: null } } },
      userId: { not: userId },
      deletedAt: null
    },
    select: { userId: true },
    distinct: ['userId']
  });
  return contacts.map(c => c.userId);
}

function isUserOnline(userId) {
  const sockets = onlineUsers.get(userId);
  return sockets && sockets.size > 0;
}

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
    const userId = socket.user.id;
    console.log(`User connected: ${socket.user.username}`);

    // Join user-specific room for receiving messages across all chats
    socket.join(`user:${userId}`);

    // Track this connection for online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    const userSockets = onlineUsers.get(userId);
    const wasOffline = userSockets.size === 0;
    userSockets.add(socket.id);

    // Get all users this user shares chats with
    const contacts = await getChatContacts(userId);

    // If this is user's first connection, notify contacts they're online
    if (wasOffline) {
      for (const contactId of contacts) {
        io.to(`user:${contactId}`).emit("user-online", { userId });
      }
    }

    // Send this user the list of their contacts who are currently online
    const onlineContacts = contacts.filter(id => isUserOnline(id));
    socket.emit("online-users", { userIds: onlineContacts });

    // Join a specific chat room (for presence tracking)
    socket.on("join-chat", async (chatId) => {
      // Verify user is an active participant
      const participant = await prisma.chatParticipant.findUnique({
        where: {
          chatId_userId: { chatId, userId: socket.user.id },
        },
      });

      if (participant && !participant.deletedAt) {
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
        where: { chatId, deletedAt: null },
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
        where: { chatId, deletedAt: null },
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

    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.user.username}`);

      // Remove this connection from online tracking
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);

        // If this was user's last connection, notify contacts they're offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const contacts = await getChatContacts(userId);
          for (const contactId of contacts) {
            io.to(`user:${contactId}`).emit("user-offline", { userId });
          }
        }
      }
    });
  });

  return io;
}
