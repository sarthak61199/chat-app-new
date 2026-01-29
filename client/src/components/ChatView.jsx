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
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading chat...</p>
      </div>
    );
  }

  if (!chatData?.chat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Chat not found</p>
      </div>
    );
  }

  const chat = chatData.chat;
  const isAdmin = chat.participants.find((p) => p.userId === user?.id)?.isAdmin;

  return (
    <>
      {/* Chat Header */}
      <header className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
              chat.isGroup ? "bg-green-500" : "bg-blue-500"
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
            <h2 className="font-semibold text-gray-900">{chat.name}</h2>
            <p className="text-sm text-gray-500">
              {chat.isGroup
                ? `${chat.participants.length} members`
                : "Direct message"}
            </p>
          </div>
        </div>

        {chat.isGroup && (
          <button
            onClick={() => setShowManageModal(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
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
      <div className="flex-1 overflow-y-auto p-6 flex flex-col-reverse">
        {messagesLoading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">
            No messages yet. Say hello!
          </div>
        ) : (
          <div className="space-y-4">
            {hasNextPage && (
              <div className="text-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-blue-600 hover:underline disabled:opacity-50"
                >
                  {isFetchingNextPage ? "Loading..." : "Load older messages"}
                </button>
              </div>
            )}
            {[...messages].reverse().map((message) => (
              <Message
                key={message.id}
                message={message}
                isOwn={message.senderId === user?.id || message.senderId === "optimistic"}
              />
            ))}
          </div>
        )}
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-2 text-sm text-gray-500 flex items-center space-x-2">
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
    </>
  );
}
