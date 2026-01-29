export default function Message({ message, isOwn }) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isOwn
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        {!isOwn && (
          <p className="text-xs font-medium text-blue-600 mb-1">
            {message.senderUsername}
          </p>
        )}
        <p className="break-words">{message.content}</p>
        <p
          className={`text-xs mt-1 ${
            isOwn ? "text-blue-200" : "text-gray-500"
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
