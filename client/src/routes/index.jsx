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
    <div className="flex h-screen animate-fade-in">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center bg-white/50 backdrop-blur-sm">
        <div className="text-center text-slate-500 animate-fade-in-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Welcome back, {user?.username}!</h2>
          <p className="text-slate-400">Select a chat or start a new conversation</p>
        </div>
      </main>
    </div>
  );
}
