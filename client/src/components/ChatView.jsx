import { useState, useMemo } from "react";
import { useChat, useMessages } from "../hooks/useChats";
import { useAuth } from "../hooks/useAuth";
import { useTypingIndicators } from "../hooks/useTypingIndicators";
import MessageInput from "./MessageInput";
import Message from "./Message";
import ManageParticipantsModal from "./ManageParticipantsModal";
import TypingDots from "./TypingDots";

export default function ChatView({ chatId }) {
  const { data: chatData, isLoading: chatLoading } = useChat(chatId);
  const {
    data: messagesData,
    isLoading: messagesLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMessages(chatId);
  const { user } = useAuth();
  const { getTypingUsers } = useTypingIndicators();
  const [showManageModal, setShowManageModal] = useState(false);
  const typingUsers = getTypingUsers(chatId);

  const messages = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  if (chatLoading) {
    return (
      <div className="flex-1 flex items-center justify-center animate-pulse-soft">
        <div className="flex items-center gap-2 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading chat...</span>
        </div>
      </div>
    );
  }

  if (!chatData?.chat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">Chat not found</p>
      </div>
    );
  }

  const chat = chatData.chat;
  const isAdmin = chat.participants.find((p) => p.userId === user?.id)?.isAdmin;

  return (
    <div className="flex-1 flex flex-col animate-fade-in">
      {/* Chat Header */}
      <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
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
          <div>
            <h2 className="font-semibold text-slate-800">{chat.name}</h2>
            <p className="text-sm text-slate-400">
              {chat.isGroup
                ? `${chat.participants.length} members`
                : "Direct message"}
            </p>
          </div>
        </div>

        {chat.isGroup && (
          <button
            onClick={() => setShowManageModal(true)}
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl active:scale-95"
            title="Manage participants"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col-reverse bg-slate-50/50">
        {messagesLoading ? (
          <div className="text-center text-slate-400 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            No messages yet. Say hello!
          </div>
        ) : (
          <div className="space-y-3">
            {hasNextPage && (
              <div className="text-center py-2">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-sm text-blue-500 hover:text-blue-600 disabled:opacity-50 font-medium"
                >
                  {isFetchingNextPage ? "Loading..." : "Load older messages"}
                </button>
              </div>
            )}
            {[...messages].reverse().map((message, index) => (
              <Message
                key={message.id}
                message={message}
                isOwn={message.senderId === user?.id || message.senderId === "optimistic"}
                animationDelay={index * 20}
              />
            ))}
          </div>
        )}
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-2 text-sm text-slate-500 flex items-center gap-2 bg-white border-t border-slate-100 animate-fade-in">
          <TypingDots />
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.join(", ")} are typing...`}
          </span>
        </div>
      )}

      {/* Message Input */}
      <MessageInput chatId={chatId} />

      {showManageModal && (
        <ManageParticipantsModal
          chat={chat}
          isAdmin={isAdmin}
          onClose={() => setShowManageModal(false)}
        />
      )}
    </div>
  );
}
