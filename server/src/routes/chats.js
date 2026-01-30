import { Hono } from "hono";
import { prisma } from "../db.js";
import { createChatSchema } from "../validators/schemas.js";
import { authMiddleware } from "../middleware/auth.js";

const chats = new Hono();

chats.use("*", authMiddleware);

// Get all chats for current user
chats.get("/", async (c) => {
  try {
    const user = c.get("user");

    // Fetch chats and unread counts in parallel (2 queries instead of N+1)
    const [userChats, unreadCounts] = await Promise.all([
      prisma.chat.findMany({
        where: {
          participants: {
            some: { userId: user.id, deletedAt: null },
          },
        },
        include: {
          participants: {
            where: { deletedAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      // Single query to get all unread counts (only for active participants, messages after joinedAt)
      prisma.$queryRaw`
        SELECT
          cp.chatId,
          COUNT(m.id) as unreadCount
        FROM ChatParticipant cp
        LEFT JOIN Message m ON m.chatId = cp.chatId
          AND m.senderId != cp.userId
          AND m.createdAt >= cp.joinedAt
          AND (cp.lastMessageReadAt IS NULL OR m.createdAt > cp.lastMessageReadAt)
        WHERE cp.userId = ${user.id} AND cp.deletedAt IS NULL
        GROUP BY cp.chatId
      `,
    ]);

    const unreadMap = Object.fromEntries(
      unreadCounts.map(({ chatId, unreadCount }) => [chatId, Number(unreadCount)])
    );

    const formattedChats = userChats.map((chat) => ({
      id: chat.id,
      name: chat.isGroup
        ? chat.name
        : chat.participants.find((p) => p.userId !== user.id)?.user.username || chat.name || "Unknown",
      isGroup: chat.isGroup,
      participants: chat.participants.map((p) => ({
        id: p.id,
        userId: p.user.id,
        username: p.user.username,
        email: p.user.email,
        isAdmin: p.isAdmin,
      })),
      lastMessage: chat.messages[0]
        ? {
            id: chat.messages[0].id,
            content: chat.messages[0].content,
            senderId: chat.messages[0].senderId,
            senderUsername: chat.messages[0].sender.username,
            createdAt: chat.messages[0].createdAt,
          }
        : null,
      updatedAt: chat.updatedAt,
      unreadCount: unreadMap[chat.id] || 0,
    }));

    return c.json({ chats: formattedChats });
  } catch (error) {
    console.error("Get chats error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Create new chat
chats.post("/", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const result = createChatSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: result.error.errors[0].message }, 400);
    }

    const { name, isGroup, participantIds } = result.data;

    // For 1-1 chats, check if chat already exists (including soft-deleted participants)
    if (!isGroup && participantIds.length === 1) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId: user.id } } },
            { participants: { some: { userId: participantIds[0] } } },
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (existingChat) {
        // Check if current user's participant record is soft-deleted
        const currentUserParticipant = existingChat.participants.find(
          (p) => p.userId === user.id
        );

        if (currentUserParticipant?.deletedAt) {
          // Reactivate the soft-deleted participant
          await prisma.chatParticipant.update({
            where: { id: currentUserParticipant.id },
            data: { deletedAt: null, joinedAt: new Date(), lastMessageReadAt: new Date() },
          });
        }

        // Return only active participants
        const activeParticipants = existingChat.participants.filter(
          (p) => !p.deletedAt || p.userId === user.id
        );

        return c.json({
          chat: {
            id: existingChat.id,
            name: activeParticipants.find((p) => p.userId !== user.id)?.user.username,
            isGroup: existingChat.isGroup,
            participants: activeParticipants.map((p) => ({
              id: p.id,
              userId: p.user.id,
              username: p.user.username,
              email: p.user.email,
              isAdmin: p.isAdmin,
            })),
          },
        });
      }
    }

    // Create chat
    const chat = await prisma.chat.create({
      data: {
        name: isGroup ? name : null,
        isGroup,
        participants: {
          create: [
            { userId: user.id, isAdmin: isGroup },
            ...participantIds.map((id) => ({ userId: id })),
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const formattedChat = {
      id: chat.id,
      name: chat.isGroup
        ? chat.name
        : chat.participants.find((p) => p.userId !== user.id)?.user.username,
      isGroup: chat.isGroup,
      participants: chat.participants.map((p) => ({
        id: p.id,
        userId: p.user.id,
        username: p.user.username,
        email: p.user.email,
        isAdmin: p.isAdmin,
      })),
    };

    return c.json({ chat: formattedChat }, 201);
  } catch (error) {
    console.error("Create chat error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get chat by ID
chats.get("/:chatId", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");

    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          some: { userId: user.id, deletedAt: null },
        },
      },
      include: {
        participants: {
          where: { deletedAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    return c.json({
      chat: {
        id: chat.id,
        name: chat.isGroup
          ? chat.name
          : chat.participants.find((p) => p.userId !== user.id)?.user.username || chat.name || "Unknown",
        isGroup: chat.isGroup,
        participants: chat.participants.map((p) => ({
          id: p.id,
          userId: p.user.id,
          username: p.user.username,
          email: p.user.email,
          isAdmin: p.isAdmin,
        })),
        createdAt: chat.createdAt,
      },
    });
  } catch (error) {
    console.error("Get chat error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete/leave chat - soft-deletes user's participation (sets deletedAt)
chats.delete("/:chatId", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");
    const io = c.get("io");

    // Get chat to check if it's a group
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { isGroup: true },
    });

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    // Verify user is an active participant
    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId: user.id } },
    });

    if (!participant || participant.deletedAt) {
      return c.json({ error: "Not a participant" }, 403);
    }

    // For 1-1 chats: store the leaving user's username in chat.name
    // so the remaining user still sees a meaningful name
    if (!chat.isGroup) {
      await prisma.chat.update({
        where: { id: chatId },
        data: { name: user.username },
      });
    }

    // Soft-delete: set deletedAt instead of removing the record
    await prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId: user.id } },
      data: { deletedAt: new Date() },
    });

    // Count only active participants
    const remainingCount = await prisma.chatParticipant.count({
      where: { chatId, deletedAt: null },
    });

    // Notify only active participants that user left
    if (remainingCount > 0) {
      const remaining = await prisma.chatParticipant.findMany({
        where: { chatId, deletedAt: null },
        select: { userId: true },
      });
      for (const p of remaining) {
        io.to(`user:${p.userId}`).emit("participant-removed", {
          chatId,
          userId: user.id,
        });
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete chat error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default chats;
