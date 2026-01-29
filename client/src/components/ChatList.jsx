import { Link, useParams } from "@tanstack/react-router";
import { useChats } from "../hooks/useChats";
import { useAuth } from "../hooks/useAuth";
import { useTypingIndicators } from "../hooks/useTypingIndicators";
import TypingDots from "./TypingDots";

export default function ChatList() {
  const { data, isLoading, error } = useChats();
  const { chatId } = useParams({ strict: false });
  const { user } = useAuth();
  const { isAnyoneTyping } = useTypingIndicators();

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading chats...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Failed to load chats
      </div>
    );
  }

  if (!data?.chats?.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        No chats yet. Start a new conversation!
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {data.chats.map((chat) => (
        <Link
          key={chat.id}
          to="/chat/$chatId"
          params={{ chatId: chat.id }}
          className={`block p-4 hover:bg-gray-50 transition-colors ${
            chatId === chat.id ? "bg-blue-50" : ""
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                chat.isGroup ? "bg-green-500" : "bg-blue-500"
              }`}
            >
              {chat.isGroup ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                chat.name?.[0]?.toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`font-medium truncate ${chat.unreadCount > 0 ? "text-gray-900 font-semibold" : "text-gray-900"}`}>
                  {chat.name}
                </p>
                <div className="flex items-center space-x-2">
                  {chat.lastMessage && (
                    <span className="text-xs text-gray-500">
                      {formatTime(chat.lastMessage.createdAt)}
                    </span>
                  )}
                  {chat.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-full min-w-[20px]">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
              {isAnyoneTyping(chat.id) ? (
                <p className="text-sm text-gray-500 flex items-center space-x-1">
                  <TypingDots />
                  <span>typing...</span>
                </p>
              ) : chat.lastMessage ? (
                <p className="text-sm text-gray-500 truncate">
                  {chat.lastMessage.senderId === user?.id
                    ? "You"
                    : chat.lastMessage.senderUsername}
                  : {chat.lastMessage.content}
                </p>
              ) : null}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  // Today
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // This week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  // Older
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
