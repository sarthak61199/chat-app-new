import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../lib/api";

export function useChats() {
  return useQuery({
    queryKey: ["chats"],
    queryFn: api.getChats,
  });
}

export function useChat(chatId) {
  return useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => api.getChat(chatId),
    enabled: !!chatId,
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createChat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (chatId) => api.deleteChat(chatId),
    onSuccess: (_, chatId) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.removeQueries({ queryKey: ["chat", chatId] });
      queryClient.removeQueries({ queryKey: ["messages", chatId] });
      navigate({ to: "/" });
    },
  });
}

export function useMessages(chatId) {
  return useInfiniteQuery({
    queryKey: ["messages", chatId],
    queryFn: ({ pageParam }) => api.getMessages(chatId, pageParam),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!chatId,
  });
}

export function useSendMessage(chatId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content) => api.sendMessage(chatId, content),
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ["messages", chatId] });
      await queryClient.cancelQueries({ queryKey: ["chats"] });

      const previousMessages = queryClient.getQueryData(["messages", chatId]);
      const previousChats = queryClient.getQueryData(["chats"]);

      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content,
        senderId: "optimistic",
        senderUsername: "You",
        chatId,
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      // Update messages
      queryClient.setQueryData(["messages", chatId], (old) => {
        if (!old) {
          return {
            pages: [{ messages: [optimisticMessage], nextCursor: null }],
            pageParams: [undefined],
          };
        }
        return {
          ...old,
          pages: old.pages.map((page, index) =>
            index === 0
              ? { ...page, messages: [optimisticMessage, ...page.messages] }
              : page
          ),
        };
      });

      // Update chat list and move chat to top
      queryClient.setQueryData(["chats"], (old) => {
        if (!old) return old;
        const chatIndex = old.chats.findIndex((c) => c.id === chatId);
        if (chatIndex === -1) return old;

        const updatedChat = {
          ...old.chats[chatIndex],
          lastMessage: {
            id: optimisticMessage.id,
            content: optimisticMessage.content,
            senderId: optimisticMessage.senderId,
            senderUsername: optimisticMessage.senderUsername,
            createdAt: optimisticMessage.createdAt,
          },
          updatedAt: optimisticMessage.createdAt,
        };

        const otherChats = old.chats.filter((c) => c.id !== chatId);
        return {
          ...old,
          chats: [updatedChat, ...otherChats],
        };
      });

      return { previousMessages, previousChats };
    },
    onError: (err, content, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", chatId], context.previousMessages);
      }
      if (context?.previousChats) {
        queryClient.setQueryData(["chats"], context.previousChats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId]});
      queryClient.invalidateQueries({ queryKey: ["chats"]});
    },
  });
}

export function useSearchUsers() {
  return useMutation({
    mutationFn: api.searchUsers,
  });
}

export function useAddParticipant(chatId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => api.addParticipant(chatId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useRemoveParticipant(chatId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => api.removeParticipant(chatId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}
