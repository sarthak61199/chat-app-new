import { useState, useRef, useCallback } from "react";
import { useSendMessage } from "../hooks/useChats";
import { getSocket } from "../lib/socket";

export default function MessageInput({ chatId }) {
  const [content, setContent] = useState("");
  const sendMessage = useSendMessage(chatId);
  const stopTypingTimeoutRef = useRef(null);
  const lastEmitTimeRef = useRef(0);

  const emitTypingStop = useCallback(() => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("typing-stop", { chatId });
    }
    lastEmitTimeRef.current = 0;
  }, [chatId]);

  const emitTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected) return;

    const now = Date.now();

    // Emit typing if not already typing OR if 2s passed (to keep indicator alive)
    if (now - lastEmitTimeRef.current > 750) {
      socket.emit("typing", { chatId });
      lastEmitTimeRef.current = now;
    }

    // Reset stop-typing timer (emit stop after 3s of inactivity)
    clearTimeout(stopTypingTimeoutRef.current);
    stopTypingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
    }, 1500);
  }, [chatId, emitTypingStop]);

  const handleChange = (e) => {
    setContent(e.target.value);
    if (e.target.value.trim()) {
      emitTyping();
    } else {
      // Input cleared, stop typing
      clearTimeout(stopTypingTimeoutRef.current);
      emitTypingStop();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    // Stop typing on send
    clearTimeout(stopTypingTimeoutRef.current);
    emitTypingStop();

    sendMessage.mutate(trimmed, {
      onSuccess: () => setContent(""),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
      <div className="flex items-end space-x-3">
        <textarea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
          style={{ minHeight: "42px" }}
        />
        <button
          type="submit"
          disabled={!content.trim() || sendMessage.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
