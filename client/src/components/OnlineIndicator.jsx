import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function OnlineIndicator({ userId, size = "sm" }) {
  const { isOnline } = useOnlineStatus();

  if (!isOnline(userId)) return null;

  const sizeClasses = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
  };

  return (
    <span
      className={`absolute bottom-0 right-0 ${sizeClasses[size]} bg-green-500 border-2 border-white rounded-full`}
      title="Online"
    />
  );
}
