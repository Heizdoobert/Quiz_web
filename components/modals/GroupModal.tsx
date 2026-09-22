'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import { Group } from '@/lib/types';
import { createGroup, joinGroup, leaveGroup, getUserGroups } from '@/lib/actions/group-actions';

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
  const [tab, setTab] = useState<'my' | 'create' | 'join'>('my');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Form states
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [joinId, setJoinId] = useState('');

  const loadGroups = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    const list = await getUserGroups(walletAddress);
    setGroups(list);
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    if (isOpen && walletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadGroups();
    }
  }, [isOpen, walletAddress, loadGroups]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setMessage({ type: 'error', text: 'Please connect your wallet first.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await createGroup({
      name: groupName,
      description: groupDesc,
      ownerWallet: walletAddress,
    });
    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to create group' });
    } else {
      setMessage({ type: 'success', text: `Group "${res.group?.name}" created!` });
      setGroupName('');
      setGroupDesc('');
      loadGroups();
      setTab('my');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setMessage({ type: 'error', text: 'Please connect your wallet first.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await joinGroup(joinId.trim(), walletAddress);
    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to join group' });
    } else {
      setMessage({ type: 'success', text: 'Successfully joined group!' });
      setJoinId('');
      loadGroups();
      setTab('my');
    }
  };

  const handleLeave = async (groupId: string) => {
    if (!walletAddress) return;
    await leaveGroup(groupId, walletAddress);
    loadGroups();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Groups & Guilds" icon="🛡️" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-700 gap-2">
          <button
            onClick={() => { setTab('my'); setMessage(null); }}
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'my'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            My Groups ({groups.length})
          </button>
          <button
            onClick={() => { setTab('create'); setMessage(null); }}
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'create'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Group
          </button>
          <button
            onClick={() => { setTab('join'); setMessage(null); }}
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'join'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Join Group
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-medium ${
              message.type === 'error'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
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
                    className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-white text-sm">{g.name}</h4>
                      {g.description && (
                        <p className="text-xs text-slate-400 line-clamp-1">{g.description}</p>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">ID: {g.id}</span>
                    </div>
                    <div className="flex gap-2">
                      {onSelectGroup && (
                        <button
                          onClick={() => {
                            onSelectGroup(g.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded text-xs font-medium transition-colors"
                        >
                          View Board
                        </button>
                      )}
                      <button
                        onClick={() => handleLeave(g.id)}
                        className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded text-xs font-medium transition-colors"
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
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Group Name *</label>
              <input
                type="text"
                required
                maxLength={40}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Web3 Titans"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
              <textarea
                maxLength={200}
                rows={2}
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="What is this guild about?"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        )}

        {/* Tab 3: Join Group */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Group ID (UUID) *</label>
              <input
                type="text"
                required
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Paste group UUID here..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
