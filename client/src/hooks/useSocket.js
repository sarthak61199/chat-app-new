import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket, connectSocket } from "../lib/socket";
import { handleUserTyping, handleUserStopTyping } from "./useTypingIndicators";
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
        const isCurrentChat = message.chatId === currentChatId;

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

    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);

    return () => {
      socket.off("new-message");
      socket.off("participant-added");
      socket.off("participant-removed");
      socket.off("user-typing");
      socket.off("user-stop-typing");
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
  }, [chatId, queryClient]);
}
