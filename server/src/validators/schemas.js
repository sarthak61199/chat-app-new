import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signInSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const createChatSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  isGroup: z.boolean().default(false),
  participantIds: z.array(z.string().uuid()).min(1, "At least one participant is required"),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message is too long"),
});

export const addParticipantSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});
