import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSocket, useJoinChat } from "../hooks/useSocket";
import Sidebar from "../components/Sidebar";
import ChatView from "../components/ChatView";

export const Route = createFileRoute("/chat/$chatId")({
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData({
        queryKey: ["auth", "me"],
        queryFn: async () => {
          const res = await fetch("/api/auth/me", { credentials: "include" });
          if (!res.ok) throw new Error("Not authenticated");
          return res.json();
        },
      });
    } catch {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: ChatPage,
});

function ChatPage() {
  const { chatId } = Route.useParams();
  useSocket();
  useJoinChat(chatId);

  return (
    <div className="flex h-screen animate-fade-in">
      <Sidebar />
      <main className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm">
        <ChatView chatId={chatId} />
      </main>
    </div>
  );
}
