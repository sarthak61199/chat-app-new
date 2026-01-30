import { useState } from "react";
import { useAuth, useSignOut } from "../hooks/useAuth";
import ChatList from "./ChatList";
import CreateChatModal from "./CreateChatModal";

export default function Sidebar() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <aside className="w-80 bg-white border-r border-slate-200/80 flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Chats</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl active:scale-95"
            title="New Chat"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <ChatList />
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-semibold shadow-md shadow-blue-500/20">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-sm text-slate-800">{user?.username}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut.mutate()}
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl active:scale-95"
            title="Sign Out"
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>

      {showCreateModal && (
        <CreateChatModal onClose={() => setShowCreateModal(false)} />
      )}
    </aside>
  );
}
