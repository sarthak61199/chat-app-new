import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  useSearchUsers,
  useAddParticipant,
  useRemoveParticipant,
} from "../hooks/useChats";

export default function ManageParticipantsModal({ chat, isAdmin, onClose }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const searchUsers = useSearchUsers();
  const addParticipant = useAddParticipant(chat.id);
  const removeParticipant = useRemoveParticipant(chat.id);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const data = await searchUsers.mutateAsync(query);
    // Filter out users already in the chat
    const existingIds = chat.participants.map((p) => p.userId);
    setSearchResults(data.users.filter((u) => !existingIds.includes(u.id)));
  };

  const handleAddUser = (userId) => {
    addParticipant.mutate(userId, {
      onSuccess: () => {
        setSearchQuery("");
        setSearchResults([]);
      },
    });
  };

  const handleRemoveUser = (userId) => {
    if (confirm("Are you sure you want to remove this participant?")) {
      removeParticipant.mutate(userId);
    }
  };

  const handleLeaveChat = () => {
    if (confirm("Are you sure you want to leave this chat?")) {
      removeParticipant.mutate(user.id, {
        onSuccess: () => {
          onClose();
          window.location.href = "/";
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Manage Participants</h2>
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
          {/* Add Participant (Admin only) */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Add Participant
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
                  {searchResults.map((searchUser) => (
                    <button
                      key={searchUser.id}
                      onClick={() => handleAddUser(searchUser.id)}
                      disabled={addParticipant.isPending}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{searchUser.username}</p>
                        <p className="text-sm text-gray-500">{searchUser.email}</p>
                      </div>
                      <svg
                        className="w-5 h-5 text-blue-600"
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
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Current Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Participants ({chat.participants.length})
            </label>
            <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {chat.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="px-3 py-2 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {participant.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {participant.username}
                        {participant.userId === user?.id && " (You)"}
                      </p>
                      <p className="text-xs text-gray-500">{participant.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {participant.isAdmin && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                    {isAdmin && participant.userId !== user?.id && (
                      <button
                        onClick={() => handleRemoveUser(participant.userId)}
                        disabled={removeParticipant.isPending}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="Remove participant"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(addParticipant.error || removeParticipant.error) && (
            <p className="text-red-500 text-sm">
              {addParticipant.error?.message || removeParticipant.error?.message}
            </p>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={handleLeaveChat}
            disabled={removeParticipant.isPending}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
          >
            Leave Chat
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
