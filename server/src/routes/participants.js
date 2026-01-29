import { Hono } from "hono";
import { prisma } from "../db.js";
import { addParticipantSchema } from "../validators/schemas.js";
import { authMiddleware } from "../middleware/auth.js";

const participants = new Hono();

participants.use("*", authMiddleware);

// Add participant to group chat
participants.post("/:chatId/participants", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");
    const body = await c.req.json();
    const result = addParticipantSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: result.error.errors[0].message }, 400);
    }

    const { userId } = result.data;

    // Get chat and verify it's a group
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: true,
      },
    });

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    if (!chat.isGroup) {
      return c.json({ error: "Cannot add participants to a 1-1 chat" }, 400);
    }

    // Verify current user is admin
    const currentParticipant = chat.participants.find((p) => p.userId === user.id);
    if (!currentParticipant || !currentParticipant.isAdmin) {
      return c.json({ error: "Only admins can add participants" }, 403);
    }

    // Check if user is already a participant
    const existingParticipant = chat.participants.find((p) => p.userId === userId);
    if (existingParticipant) {
      return c.json({ error: "User is already a participant" }, 400);
    }

    // Verify user exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });

    if (!userToAdd) {
      return c.json({ error: "User not found" }, 404);
    }

    // Add participant
    const participant = await prisma.chatParticipant.create({
      data: {
        chatId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    const formattedParticipant = {
      id: participant.id,
      userId: participant.user.id,
      username: participant.user.username,
      email: participant.user.email,
      isAdmin: participant.isAdmin,
    };

    // Emit to all participants' user rooms (including the new participant)
    const io = c.get("io");
    if (io) {
      const allParticipants = [...chat.participants, { userId }];
      for (const p of allParticipants) {
        io.to(`user:${p.userId}`).emit("participant-added", {
          chatId,
          participant: formattedParticipant,
        });
      }
    }

    return c.json({ participant: formattedParticipant }, 201);
  } catch (error) {
    console.error("Add participant error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Remove participant from group chat
participants.delete("/:chatId/participants/:userId", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");
    const userIdToRemove = c.req.param("userId");

    // Get chat and verify it's a group
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: true,
      },
    });

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    if (!chat.isGroup) {
      return c.json({ error: "Cannot remove participants from a 1-1 chat" }, 400);
    }

    // Verify current user is admin or removing themselves
    const currentParticipant = chat.participants.find((p) => p.userId === user.id);
    if (!currentParticipant) {
      return c.json({ error: "You are not a participant of this chat" }, 403);
    }

    const isRemovingSelf = userIdToRemove === user.id;
    if (!isRemovingSelf && !currentParticipant.isAdmin) {
      return c.json({ error: "Only admins can remove other participants" }, 403);
    }

    // Check if participant exists
    const participantToRemove = chat.participants.find((p) => p.userId === userIdToRemove);
    if (!participantToRemove) {
      return c.json({ error: "User is not a participant" }, 404);
    }

    // Delete participant
    await prisma.chatParticipant.delete({
      where: { id: participantToRemove.id },
    });

    // Emit to all participants' user rooms (including the removed user)
    const io = c.get("io");
    if (io) {
      for (const p of chat.participants) {
        io.to(`user:${p.userId}`).emit("participant-removed", {
          chatId,
          userId: userIdToRemove,
        });
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Remove participant error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default participants;
