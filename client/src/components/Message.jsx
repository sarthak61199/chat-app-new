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
        <p
          className={`text-xs mt-1.5 ${
            isOwn ? "text-blue-200" : "text-slate-400"
          }`}
        >
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function formatMessageTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
