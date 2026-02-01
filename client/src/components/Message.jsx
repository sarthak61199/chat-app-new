export default function Message({ message, isOwn }) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
          isOwn
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/20"
            : "bg-white text-slate-800 shadow-slate-200/50 border border-slate-100"
        }`}
      >
        {!isOwn && (
          <p className="text-xs font-semibold text-blue-500 mb-1">
            {message.senderUsername}
          </p>
        )}
        <p className="break-words leading-relaxed">{message.content}</p>
        <div
          className={`flex items-center justify-end gap-1 mt-1.5 ${
            isOwn ? "text-blue-200" : "text-slate-400"
          }`}
        >
          <span className="text-xs">{formatMessageTime(message.createdAt)}</span>
          {isOwn && <MessageTicks isRead={message.isRead} />}
        </div>
      </div>
    </div>
  );
}

function MessageTicks({ isRead }) {
  return (
    <svg
      className={`w-4 h-4 ${isRead ? "text-cyan-300" : "text-white/60"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* First check mark */}
      <polyline points="3 12 8 17 18 6" />
      {/* Second check mark (offset) */}
      <polyline points="8 12 13 17 23 6" />
    </svg>
  );
}

function formatMessageTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
