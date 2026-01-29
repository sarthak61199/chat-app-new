import { getCookie } from "hono/cookie";
import { prisma } from "../db.js";

export async function authMiddleware(c, next) {
  const sessionId = getCookie(c, "session");

  if (!sessionId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: sessionId } });
    }
    return c.json({ error: "Session expired" }, 401);
  }

  c.set("user", session.user);
  c.set("sessionId", sessionId);

  await next();
}

export function getSessionIdFromCookie(cookieHeader) {
  return cookieHeader?.match(/session=([^;]+)/)?.[1];
}
