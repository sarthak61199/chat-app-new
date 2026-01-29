import { Hono } from "hono";
import { prisma } from "../db.js";
import { sendMessageSchema } from "../validators/schemas.js";
import { authMiddleware } from "../middleware/auth.js";

const messages = new Hono();

messages.use("*", authMiddleware);

// Get messages for a chat
messages.get("/:chatId/messages", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");
    const cursor = c.req.query("cursor");
    const limit = parseInt(c.req.query("limit") || "50");

    // Verify user is participant
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: { chatId, userId: user.id },
      },
    });

    if (!participant) {
      return c.json({ error: "Not a participant of this chat" }, 403);
    }

    const chatMessages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    const hasMore = chatMessages.length > limit;
    const items = hasMore ? chatMessages.slice(0, -1) : chatMessages;

    return c.json({
      messages: items.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        senderUsername: m.sender.username,
        createdAt: m.createdAt,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Send a message
messages.post("/:chatId/messages", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");
    const body = await c.req.json();
    const result = sendMessageSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: result.error.errors[0].message }, 400);
    }

    const { content } = result.data;

    // Verify user is participant
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: { chatId, userId: user.id },
      },
    });

    if (!participant) {
      return c.json({ error: "Not a participant of this chat" }, 403);
    }

    // Create message and update chat
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          content,
          chatId,
          senderId: user.id,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      }),
    ]);

    const formattedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderUsername: message.sender.username,
      chatId,
      createdAt: message.createdAt,
    };

    // Emit to all participants' user rooms (except sender)
    const io = c.get("io");
    if (io) {
      const participants = await prisma.chatParticipant.findMany({
        where: { chatId },
        select: { userId: true },
      });

      for (const p of participants) {
        if (p.userId !== user.id) {
          io.to(`user:${p.userId}`).emit("new-message", formattedMessage);
        }
      }
    }

    return c.json({ message: formattedMessage }, 201);
  } catch (error) {
    console.error("Send message error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Mark messages as read for a chat
messages.patch("/:chatId/read", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");

    await prisma.chatParticipant.update({
      where: {
        chatId_userId: { chatId, userId: user.id },
      },
      data: {
        lastMessageReadAt: new Date(),
      },
    });

    return c.json({ success: true });
  } catch (error) {
    if (error.code === "P2025") {
      return c.json({ error: "Not a participant of this chat" }, 403);
    }
    console.error("Mark read error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default messages;
