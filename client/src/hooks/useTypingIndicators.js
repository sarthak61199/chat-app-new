import { useState, useEffect, useCallback } from "react";

// Global state for typing users across all chats
// Map<chatId, Map<userId, { username, timeoutId }>>
const typingUsersMap = new Map();
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function handleUserTyping({ chatId, userId, username }) {
  if (!typingUsersMap.has(chatId)) {
    typingUsersMap.set(chatId, new Map());
  }
  const chatTyping = typingUsersMap.get(chatId);

  // Clear existing timeout
  const existing = chatTyping.get(userId);
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId);
  }

  // Set new timeout to auto-clear after 3.5s (slightly longer than server)
  const timeoutId = setTimeout(() => {
    chatTyping.delete(userId);
    if (chatTyping.size === 0) {
      typingUsersMap.delete(chatId);
    }
    notifyListeners();
  }, 1500);

  chatTyping.set(userId, { username, timeoutId });
  notifyListeners();
}

export function handleUserStopTyping({ chatId, userId }) {
  const chatTyping = typingUsersMap.get(chatId);
  if (!chatTyping) return;

  const existing = chatTyping.get(userId);
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId);
  }

  chatTyping.delete(userId);
  if (chatTyping.size === 0) {
    typingUsersMap.delete(chatId);
  }
  notifyListeners();
}

export function useTypingIndicators() {
  const [, forceUpdate] = useState({});

  // Subscribe to updates
  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const getTypingUsers = useCallback((chatId) => {
    const chatTyping = typingUsersMap.get(chatId);
    if (!chatTyping) return [];
    return Array.from(chatTyping.values()).map((v) => v.username);
  }, []);

  const isAnyoneTyping = useCallback((chatId) => {
    const chatTyping = typingUsersMap.get(chatId);
    return chatTyping && chatTyping.size > 0;
  }, []);

  return { getTypingUsers, isAnyoneTyping };
}
