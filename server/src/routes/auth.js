import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import bcrypt from "bcrypt";
import { prisma } from "../db.js";
import { signUpSchema, signInSchema } from "../validators/schemas.js";
import { authMiddleware } from "../middleware/auth.js";

const auth = new Hono();

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

// Sign up
auth.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    const result = signUpSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: result.error.errors[0].message }, 400);
    }

    const { email, username, password } = result.data;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return c.json({ error: "Email already in use" }, 400);
      }
      return c.json({ error: "Username already taken" }, 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
      },
    });

    setCookie(c, "session", session.id, {
      httpOnly: true,
      path: "/",
      sameSite: "Lax",
      maxAge: SESSION_MAX_AGE,
    });

    return c.json({ user });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Sign in
auth.post("/signin", async (c) => {
  try {
    const body = await c.req.json();
    const result = signInSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: result.error.errors[0].message }, 400);
    }

    const { identifier, password } = result.data;

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
      },
    });

    setCookie(c, "session", session.id, {
      httpOnly: true,
      path: "/",
      sameSite: "Lax",
      maxAge: SESSION_MAX_AGE,
    });

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Sign out
auth.post("/signout", authMiddleware, async (c) => {
  try {
    const sessionId = c.get("sessionId");

    await prisma.session.delete({
      where: { id: sessionId },
    });

    deleteCookie(c, "session", {
      path: "/",
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Signout error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get current user
auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user");

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    },
  });
});

// Search users (for adding to chats)
auth.get("/users", authMiddleware, async (c) => {
  try {
    const query = c.req.query("q") || "";
    const currentUser = c.get("user");

    if (query.length < 2) {
      return c.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUser.id } },
          {
            OR: [
              { username: { contains: query } },
              { email: { contains: query } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
      take: 10,
    });

    return c.json({ users });
  } catch (error) {
    console.error("Search users error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default auth;
