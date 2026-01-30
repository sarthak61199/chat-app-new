import { getSocket } from "./socket";

const API_BASE = "/api";

async function request(endpoint, options = {}) {
  const socket = getSocket();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(socket?.id && { "x-socket-id": socket.id }),
      ...options.headers,
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

export const api = {
  // Auth
  signUp: (data) => request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  signIn: (data) => request("/auth/signin", { method: "POST", body: JSON.stringify(data) }),
  signOut: () => request("/auth/signout", { method: "POST" }),
  getMe: () => request("/auth/me"),
  searchUsers: (query) => request(`/auth/users?q=${encodeURIComponent(query)}`),

  // Chats
  getChats: () => request("/chats"),
  getChat: (chatId) => request(`/chats/${chatId}`),
  createChat: (data) => request("/chats", { method: "POST", body: JSON.stringify(data) }),
  deleteChat: (chatId) => request(`/chats/${chatId}`, { method: "DELETE" }),

  // Messages
  getMessages: (chatId, cursor) =>
    request(`/chats/${chatId}/messages${cursor ? `?cursor=${cursor}` : ""}`),
  sendMessage: (chatId, content) =>
    request(`/chats/${chatId}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
  markAsRead: (chatId) =>
    request(`/chats/${chatId}/read`, { method: "PATCH" }),

  // Participants
  addParticipant: (chatId, userId) =>
    request(`/chats/${chatId}/participants`, { method: "POST", body: JSON.stringify({ userId }) }),
  removeParticipant: (chatId, userId) =>
    request(`/chats/${chatId}/participants/${userId}`, { method: "DELETE" }),
};
