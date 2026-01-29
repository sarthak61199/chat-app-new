import { useState } from "react";
import { useAuth, useSignOut } from "../hooks/useAuth";
import ChatList from "./ChatList";
import CreateChatModal from "./CreateChatModal";

export default function Sidebar() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Chats</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
            title="New Chat"
          >
            <svg
              className="w-6 h-6"
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
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-sm">{user?.username}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut.mutate()}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
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
