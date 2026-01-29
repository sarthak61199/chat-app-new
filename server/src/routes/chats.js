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
            some: { userId: user.id },
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
      // Single query to get all unread counts
      prisma.$queryRaw`
        SELECT
          cp.chatId,
          COUNT(m.id) as unreadCount
        FROM ChatParticipant cp
        LEFT JOIN Message m ON m.chatId = cp.chatId
          AND m.senderId != cp.userId
          AND (cp.lastMessageReadAt IS NULL OR m.createdAt > cp.lastMessageReadAt)
        WHERE cp.userId = ${user.id}
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
        : chat.participants.find((p) => p.userId !== user.id)?.user.username || "Unknown",
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

    // For 1-1 chats, check if chat already exists
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
        return c.json({
          chat: {
            id: existingChat.id,
            name: existingChat.participants.find((p) => p.userId !== user.id)?.user.username,
            isGroup: existingChat.isGroup,
            participants: existingChat.participants.map((p) => ({
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
          some: { userId: user.id },
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

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    return c.json({
      chat: {
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
        createdAt: chat.createdAt,
      },
    });
  } catch (error) {
    console.error("Get chat error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default chats;
