import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Server } from "socket.io";

import auth from "./routes/auth.js";
import chats from "./routes/chats.js";
import messages from "./routes/messages.js";
import participants from "./routes/participants.js";
import { setupSocket } from "./socket/index.js";

const app = new Hono();

// CORS configuration
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

// Socket.io instance will be attached to context
let io;

// Middleware to attach io to context
app.use("*", async (c, next) => {
  c.set("io", io);
  await next();
});

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api/auth", auth);
app.route("/api/chats", chats);
app.route("/api/chats", messages);
app.route("/api/chats", participants);

// Start server
const PORT = process.env.PORT || 3000;

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`Server running on http://localhost:${info.port}`);
  }
);

// Setup Socket.io
io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  },
});

setupSocket(io);

console.log("Socket.io server initialized");
