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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Chat</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Chat Type Toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsGroup(false)}
              className={`flex-1 py-2 px-4 rounded-lg border ${
                !isGroup
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Direct Message
            </button>
            <button
              onClick={() => setIsGroup(true)}
              className={`flex-1 py-2 px-4 rounded-lg border ${
                isGroup
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Group Chat
            </button>
          </div>

          {/* Group Name */}
          {isGroup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter group name"
              />
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {user.username}
                  <button
                    onClick={() => handleSelectUser(user)}
                    className="ml-2 hover:text-blue-900"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth={2} />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* User Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isGroup ? "Add Participants" : "Select User"}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by username or email"
            />

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                      selectedUsers.find((u) => u.id === user.id)
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    {selectedUsers.find((u) => u.id === user.id) && (
                      <svg
                        className="w-5 h-5 text-blue-600"
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

        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createChat.isPending ? "Creating..." : "Create Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
