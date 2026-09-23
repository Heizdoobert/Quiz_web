'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';
import { useGroupModal } from '@/hooks/modals/use-group-modal';
import { Shield, Users, UserPlus, Plus, Loader2 } from 'lucide-react';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string | null;
  onSelectGroup?: (groupId: string) => void;
}

export default function GroupModal({
  isOpen,
  onClose,
  walletAddress,
  onSelectGroup,
}: GroupModalProps) {
  const {
    tab,
    selectTab,
    groups,
    loading,
    message,
    groupName,
    setGroupName,
    groupDesc,
    setGroupDesc,
    joinId,
    setJoinId,
    handleCreate,
    handleJoin,
    handleLeave,
    handleSelectGroup,
  } = useGroupModal({ isOpen, onClose, walletAddress, onSelectGroup });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Groups & Guilds"
      icon={<Shield className="w-5 h-5 text-[#6C5CE7]" />}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2D305A] gap-2">
          <button
            type="button"
            onClick={() => selectTab('my')}
            className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7] rounded-t ${
              tab === 'my'
                ? 'border-[#6C5CE7] text-[#6C5CE7]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> My Groups ({groups.length})
          </button>
          <button
            type="button"
            onClick={() => selectTab('create')}
            className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7] rounded-t ${
              tab === 'create'
                ? 'border-[#6C5CE7] text-[#6C5CE7]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" /> Create Group
          </button>
          <button
            type="button"
            onClick={() => selectTab('join')}
            className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7] rounded-t ${
              tab === 'join'
                ? 'border-[#6C5CE7] text-[#6C5CE7]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Join Group
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold ${
              message.type === 'error'
                ? 'bg-[#FF4757]/15 text-[#FF4757] border border-[#FF4757]/30'
                : 'bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/30'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tab 1: My Groups */}
        {tab === 'my' && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-4">Loading groups...</p>
            ) : groups.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                You haven&apos;t joined any groups yet. Create or join one below!
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className="p-4 bg-[#0A1128]/70 rounded-xl border border-[#2D305A] flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm !font-sans">{g.name}</h4>
                      {g.description && (
                        <p className="text-xs text-slate-400 line-clamp-1">{g.description}</p>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">ID: {g.id}</span>
                    </div>
                    <div className="flex gap-2">
                      {onSelectGroup && (
                        <button
                          type="button"
                          onClick={() => handleSelectGroup(g.id)}
                          className="px-2.5 py-1 bg-[#6C5CE7]/20 hover:bg-[#6C5CE7] text-[#6C5CE7] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7]"
                        >
                          View Board
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleLeave(g.id)}
                        className="px-2.5 py-1 bg-[#FF4757]/15 hover:bg-[#FF4757] text-[#FF4757] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4757]"
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create Group */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white mb-1">Group Name *</label>
              <input
                type="text"
                required
                maxLength={40}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Web3 Titans"
                className="w-full px-4 py-2.5 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-sm focus:outline-none focus:border-[#00FFCC] focus:ring-1 focus:ring-[#00FFCC]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white mb-1">Description (Optional)</label>
              <textarea
                maxLength={200}
                rows={2}
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="What is this guild about?"
                className="w-full px-4 py-2.5 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-sm focus:outline-none focus:border-[#00FFCC] focus:ring-1 focus:ring-[#00FFCC]"
              />
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.015 }}
              whileTap={{ scale: loading ? 1 : 0.985 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="w-full py-2.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 disabled:opacity-50 text-[#0A1128] rounded-xl font-black text-sm transition-all shadow-md cursor-pointer font-heading flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[#0A1128]" />}
              <span>{loading ? 'Creating Group...' : 'Create Group'}</span>
            </motion.button>
          </form>
        )}

        {/* Tab 3: Join Group */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white mb-1">Group ID (UUID) *</label>
              <input
                type="text"
                required
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Paste group UUID here..."
                className="w-full px-4 py-2.5 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-sm font-mono focus:outline-none focus:border-[#00FFCC] focus:ring-1 focus:ring-[#00FFCC]"
              />
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.015 }}
              whileTap={{ scale: loading ? 1 : 0.985 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="w-full py-2.5 bg-gradient-to-r from-[#6C5CE7] to-[#00FFCC] hover:opacity-95 disabled:opacity-50 text-[#0A1128] rounded-xl font-black text-sm transition-all shadow-md cursor-pointer font-heading flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[#0A1128]" />}
              <span>{loading ? 'Joining Guild...' : 'Join Group'}</span>
            </motion.button>
          </form>
        )}
      </div>
    </Modal>
  );
}
