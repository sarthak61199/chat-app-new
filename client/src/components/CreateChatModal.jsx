import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCreateChat, useSearchUsers } from "../hooks/useChats";

export default function CreateChatModal({ onClose }) {
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  const navigate = useNavigate();
  const createChat = useCreateChat();
  const searchUsers = useSearchUsers();

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const data = await searchUsers.mutateAsync(query);
    setSearchResults(data.users || []);
  };

  const handleSelectUser = (user) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleCreate = () => {
    if (selectedUsers.length === 0) return;

    const chatData = {
      isGroup,
      participantIds: selectedUsers.map((u) => u.id),
      ...(isGroup && groupName && { name: groupName }),
    };

    createChat.mutate(chatData, {
      onSuccess: (data) => {
        onClose();
        navigate({ to: "/chat/$chatId", params: { chatId: data.chat.id } });
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">New Chat</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Chat Type Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsGroup(false)}
              className={`flex-1 py-2.5 px-4 rounded-xl border-2 font-medium transition-all ${
                !isGroup
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Direct Message
            </button>
            <button
              onClick={() => setIsGroup(true)}
              className={`flex-1 py-2.5 px-4 rounded-xl border-2 font-medium transition-all ${
                isGroup
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Group Chat
            </button>
          </div>

          {/* Group Name */}
          {isGroup && (
            <div className="animate-fade-in-up">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 focus:bg-white"
                placeholder="Enter group name"
              />
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 animate-fade-in">
              {selectedUsers.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium"
                >
                  {user.username}
                  <button
                    onClick={() => handleSelectUser(user)}
                    className="ml-2 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* User Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {isGroup ? "Add Participants" : "Select User"}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 focus:bg-white"
              placeholder="Search by username or email"
            />

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-xl max-h-40 overflow-y-auto animate-fade-in">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between transition-colors first:rounded-t-xl last:rounded-b-xl ${
                      selectedUsers.find((u) => u.id === user.id)
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium text-slate-800">{user.username}</p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                    {selectedUsers.find((u) => u.id === user.id) && (
                      <svg
                        className="w-5 h-5 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {createChat.error && (
            <p className="text-red-500 text-sm">{createChat.error.message}</p>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={
              selectedUsers.length === 0 ||
              (!isGroup && selectedUsers.length !== 1) ||
              createChat.isPending
            }
            className="px-5 py-2.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md shadow-blue-500/25 active:scale-[0.98]"
          >
            {createChat.isPending ? "Creating..." : "Create Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
