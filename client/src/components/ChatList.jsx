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
      <div className="p-6 text-center">
        <div className="inline-flex items-center gap-2 text-slate-400">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading chats...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 text-sm">
        Failed to load chats
      </div>
    );
  }

  if (!data?.chats?.length) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        No chats yet. Start a new conversation!
      </div>
    );
  }

  return (
    <div className="py-2">
      {data.chats.map((chat, index) => (
        <Link
          key={chat.id}
          to="/chat/$chatId"
          params={{ chatId: chat.id }}
          className={`block mx-2 mb-1 px-3 py-3 rounded-xl transition-all duration-150 animate-fade-in-up ${
            chatId === chat.id
              ? "bg-blue-50 border border-blue-100"
              : "hover:bg-slate-50 border border-transparent"
          }`}
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold shadow-md ${
                chat.isGroup
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-emerald-500/20"
                  : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20"
              }`}
            >
              {chat.isGroup ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                chat.name?.[0]?.toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className={`font-medium truncate text-sm ${
                  chat.unreadCount > 0 ? "text-slate-900" : "text-slate-700"
                }`}>
                  {chat.name}
                </p>
                <div className="flex items-center gap-2 ml-2">
                  {chat.lastMessage && (
                    <span className="text-xs text-slate-400 tabular-nums">
                      {formatTime(chat.lastMessage.createdAt)}
                    </span>
                  )}
                  {chat.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-blue-500 rounded-full min-w-[20px] shadow-sm">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
              {isAnyoneTyping(chat.id) ? (
                <p className="text-sm text-blue-500 flex items-center gap-1.5">
                  <TypingDots />
                  <span>typing...</span>
                </p>
              ) : chat.lastMessage ? (
                <p className="text-sm text-slate-400 truncate">
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
