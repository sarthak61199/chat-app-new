import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import Sidebar from "../components/Sidebar";

export const Route = createFileRoute("/")({
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
  component: IndexLayout,
});

function IndexLayout() {
  const { user } = useAuth();
  useSocket();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <h2 className="text-xl font-medium mb-2">Welcome, {user?.username}!</h2>
          <p>Select a chat or start a new conversation</p>
        </div>
      </main>
    </div>
  );
}
