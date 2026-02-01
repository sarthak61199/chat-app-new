import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket, connectSocket } from "../lib/socket";
import { handleUserTyping, handleUserStopTyping } from "./useTypingIndicators";
import {
  handleOnlineUsers,
  handleUserOnline,
  handleUserOffline,
  clearOnlineStatus,
} from "./useOnlineStatus";
import { api } from "../lib/api";

// Track current chat for unread count management
let currentChatId = null;

export function setCurrentChatId(id) {
  currentChatId = id;
}

export function getCurrentChatId() {
  return currentChatId;
}

export function useSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectSocket();

    socket.on("new-message", (message) => {
      // Check if chat exists in current list (might be reactivated)
      const chatsData = queryClient.getQueryData(["chats"]);
      const chatExists = chatsData?.chats?.find((c) => c.id === message.chatId);

      if (!chatExists) {
        // Chat was reactivated (soft-deleted participant was restored)
        // Invalidate chats query to fetch the reactivated chat
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        return;
      }

      const isCurrentChat = message.chatId === currentChatId;

      // Update messages cache for the chat (infinite query structure)
      queryClient.setQueryData(["messages", message.chatId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, index) =>
            index === 0
              ? { ...page, messages: [message, ...page.messages] }
              : page
          ),
        };
      });

      // Update chat list, move chat to top, and handle unread count
      queryClient.setQueryData(["chats"], (old) => {
        if (!old) return old;
        const chatIndex = old.chats.findIndex((c) => c.id === message.chatId);
        if (chatIndex === -1) return old;

        const chat = old.chats[chatIndex];

        const updatedChat = {
          ...chat,
          lastMessage: {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            senderUsername: message.senderUsername,
            createdAt: message.createdAt,
          },
          updatedAt: message.createdAt,
          unreadCount: isCurrentChat ? 0 : (chat.unreadCount || 0) + 1,
        };

        const otherChats = old.chats.filter((c) => c.id !== message.chatId);
        return {
          ...old,
          chats: [updatedChat, ...otherChats],
        };
      });

      // If user is currently viewing this chat, mark the new message as read
      if (isCurrentChat) {
        api.markAsRead(message.chatId).catch(console.error);
      }
    });

    socket.on("participant-added", ({ chatId, participant }) => {
      queryClient.setQueryData(["chat", chatId], (old) => {
        if (!old) return old;
        return {
          ...old,
          chat: {
            ...old.chat,
            participants: [...old.chat.participants, participant],
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    });

    socket.on("participant-removed", ({ chatId, userId }) => {
      queryClient.setQueryData(["chat", chatId], (old) => {
        if (!old) return old;
        return {
          ...old,
          chat: {
            ...old.chat,
            participants: old.chat.participants.filter((p) => p.userId !== userId),
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    });

    socket.on("messages-read", ({ chatId, readAt }) => {
      // Update messages to mark them as read
      queryClient.setQueryData(["messages", chatId], (old) => {
        if (!old) return old;
        const readTime = new Date(readAt);
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) => {
              // Mark messages as read if they were sent before readAt
              if (new Date(msg.createdAt) <= readTime) {
                return { ...msg, isRead: true };
              }
              return msg;
            }),
          })),
        };
      });
    });

    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);

    // Online status events
    socket.on("online-users", handleOnlineUsers);
    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);
    socket.on("disconnect", clearOnlineStatus);

    return () => {
      socket.off("new-message");
      socket.off("participant-added");
      socket.off("participant-removed");
      socket.off("messages-read");
      socket.off("user-typing");
      socket.off("user-stop-typing");
      socket.off("online-users");
      socket.off("user-online");
      socket.off("user-offline");
      socket.off("disconnect", clearOnlineStatus);
    };
  }, [queryClient]);

  return getSocket();
}

export function useJoinChat(chatId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!chatId) {
      setCurrentChatId(null);
      return;
    }

    // Set current chat for unread tracking
    setCurrentChatId(chatId);

    const socket = getSocket();
    socket.emit("join-chat", chatId);

    // Mark messages as read and reset unread count
    api.markAsRead(chatId).then(() => {
      queryClient.setQueryData(["chats"], (old) => {
        if (!old) return old;
        return {
          ...old,
          chats: old.chats.map((chat) =>
            chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
          ),
        };
      });
    }).catch(console.error);

    return () => {
      socket.emit("leave-chat", chatId);
      setCurrentChatId(null);
    };
  }, [chatId]);
}
