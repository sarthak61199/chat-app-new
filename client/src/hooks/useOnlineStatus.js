import { useState, useEffect, useCallback } from "react";

// Global state for online users - Set<userId>
const onlineUsersSet = new Set();
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

// Called when receiving initial online users list on connect
export function handleOnlineUsers({ userIds }) {
  onlineUsersSet.clear();
  userIds.forEach((id) => onlineUsersSet.add(id));
  notifyListeners();
}

// Called when a user comes online
export function handleUserOnline({ userId }) {
  onlineUsersSet.add(userId);
  notifyListeners();
}

// Called when a user goes offline
export function handleUserOffline({ userId }) {
  onlineUsersSet.delete(userId);
  notifyListeners();
}

// Clear all online status (on disconnect)
export function clearOnlineStatus() {
  onlineUsersSet.clear();
  notifyListeners();
}

export function useOnlineStatus() {
  const [, forceUpdate] = useState({});

  // Subscribe to updates
  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const isOnline = useCallback((userId) => {
    return onlineUsersSet.has(userId);
  }, []);

  return { isOnline };
}
