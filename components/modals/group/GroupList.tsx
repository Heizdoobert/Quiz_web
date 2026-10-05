import React from 'react';
import { Group } from '@/lib/types';

export function GroupList({
  groups,
  loading,
  onSelectGroup,
  onLeaveGroup,
}: {
  groups: Group[];
  loading: boolean;
  onSelectGroup?: (groupId: string) => void;
  onLeaveGroup: (groupId: string) => void;
}) {
  return (
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
              className="p-4 bg-deep-space/70 rounded-xl border border-cyber-border flex items-center justify-between"
            >
              <div>
                <h4 className="font-bold text-white text-sm">{g.name}</h4>
                {g.description && (
                  <p className="text-xs text-slate-400 line-clamp-1">{g.description}</p>
                )}
                <span className="text-[10px] text-slate-500 font-mono">ID: {g.id}</span>
              </div>
              <div className="flex gap-2">
                {onSelectGroup && (
                  <button
                    type="button"
                    onClick={() => onSelectGroup(g.id)}
                    className="px-2.5 py-1 bg-electric-indigo/20 hover:bg-electric-indigo text-electric-indigo hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-indigo"
                  >
                    View Board
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onLeaveGroup(g.id)}
                  className="px-2.5 py-1 bg-pop-coral/15 hover:bg-pop-coral text-pop-coral hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pop-coral"
                >
                  Leave
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
