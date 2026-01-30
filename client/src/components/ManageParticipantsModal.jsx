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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Manage Participants</h2>
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
          {/* Add Participant (Admin only) */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Add Participant
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
                  {searchResults.map((searchUser) => (
                    <button
                      key={searchUser.id}
                      onClick={() => handleAddUser(searchUser.id)}
                      disabled={addParticipant.isPending}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{searchUser.username}</p>
                        <p className="text-sm text-slate-400">{searchUser.email}</p>
                      </div>
                      <svg
                        className="w-5 h-5 text-blue-500"
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Participants ({chat.participants.length})
            </label>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {chat.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                      {participant.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-800">
                        {participant.username}
                        {participant.userId === user?.id && (
                          <span className="text-slate-400 font-normal"> (You)</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">{participant.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {participant.isAdmin && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-medium">
                        Admin
                      </span>
                    )}
                    {isAdmin && participant.userId !== user?.id && (
                      <button
                        onClick={() => handleRemoveUser(participant.userId)}
                        disabled={removeParticipant.isPending}
                        className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
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

        <div className="p-5 border-t border-slate-100 flex justify-between">
          <button
            onClick={handleLeaveChat}
            disabled={removeParticipant.isPending}
            className="px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl font-medium"
          >
            Leave Chat
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
