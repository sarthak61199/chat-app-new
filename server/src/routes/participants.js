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

    // Verify current user is an active admin
    const currentParticipant = chat.participants.find(
      (p) => p.userId === user.id && !p.deletedAt
    );
    if (!currentParticipant || !currentParticipant.isAdmin) {
      return c.json({ error: "Only admins can add participants" }, 403);
    }

    // Check if user is already an active participant
    const existingParticipant = chat.participants.find((p) => p.userId === userId);
    if (existingParticipant && !existingParticipant.deletedAt) {
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

    let participant;

    // If user has a soft-deleted participant record, reactivate it
    if (existingParticipant && existingParticipant.deletedAt) {
      participant = await prisma.chatParticipant.update({
        where: { id: existingParticipant.id },
        data: { deletedAt: null, joinedAt: new Date(), lastMessageReadAt: new Date() },
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
    } else {
      // Add new participant
      participant = await prisma.chatParticipant.create({
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
    }

    const formattedParticipant = {
      id: participant.id,
      userId: participant.user.id,
      username: participant.user.username,
      email: participant.user.email,
      isAdmin: participant.isAdmin,
    };

    // Emit to all active participants' user rooms (including the new/reactivated participant)
    const io = c.get("io");
    if (io) {
      const activeParticipants = chat.participants.filter((p) => !p.deletedAt);
      const allParticipants = [...activeParticipants, { userId }];
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

    // Verify current user is an active admin or removing themselves
    const currentParticipant = chat.participants.find(
      (p) => p.userId === user.id && !p.deletedAt
    );
    if (!currentParticipant) {
      return c.json({ error: "You are not a participant of this chat" }, 403);
    }

    const isRemovingSelf = userIdToRemove === user.id;
    if (!isRemovingSelf && !currentParticipant.isAdmin) {
      return c.json({ error: "Only admins can remove other participants" }, 403);
    }

    // Check if participant exists and is active
    const participantToRemove = chat.participants.find(
      (p) => p.userId === userIdToRemove && !p.deletedAt
    );
    if (!participantToRemove) {
      return c.json({ error: "User is not a participant" }, 404);
    }

    // Soft-delete: set deletedAt instead of removing the record
    await prisma.chatParticipant.update({
      where: { id: participantToRemove.id },
      data: { deletedAt: new Date() },
    });

    // Emit to all active participants' user rooms (including the removed user)
    const io = c.get("io");
    if (io) {
      const activeParticipants = chat.participants.filter((p) => !p.deletedAt);
      for (const p of activeParticipants) {
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
