import React from 'react';
import { ClaimableRewards, BADGE_NAMES, BADGE_ICONS } from '@/lib/types';
import { Award, ShieldCheck, Lock } from 'lucide-react';

const BADGE_CRITERIA: Record<number, string> = {
  0: 'Reach Rank #1 on the Global Leaderboard',
  1: 'Achieve a correct answer streak of 5+',
  2: 'Answer 100 total quiz questions',
  3: 'Score 100% accuracy with at least 10 answered',
};

export function NFTTrophyCase({
  claimableRewards,
  onOpenRewards,
  onClose,
}: {
  claimableRewards: ClaimableRewards | null;
  onOpenRewards: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-[#FFD166]" /> NFT Achievement Badges
        </h4>
        <span className="text-[11px] text-slate-400 font-mono">
          {(claimableRewards?.alreadyClaimedBadges?.length || 0)} / 4 Minted
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((badgeId) => {
          const name = BADGE_NAMES[badgeId] || `Badge #${badgeId}`;
          const icon = BADGE_ICONS[badgeId] || '🏅';
          const criteria = BADGE_CRITERIA[badgeId] || 'Complete quiz objectives';
          const isMinted = claimableRewards?.alreadyClaimedBadges?.includes(badgeId);
          const isEligible = claimableRewards?.eligibleBadges?.includes(badgeId);

          return (
            <div
              key={badgeId}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                isMinted
                  ? 'bg-[#FFD166]/10 border-[#FFD166]/50'
                  : isEligible
                  ? 'bg-[#00FFCC]/10 border-[#00FFCC]/50'
                  : 'bg-[#0A1128]/60 border-[#2D305A]/70 opacity-75'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                  isMinted
                    ? 'bg-[#FFD166]/20 border border-[#FFD166]/40'
                    : isEligible
                    ? 'bg-[#00FFCC]/20 border border-[#00FFCC]/40'
                    : 'bg-[#25284D]/40 border border-[#2D305A]'
                }`}
              >
                {icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-heading font-bold text-xs text-slate-200 truncate">
                    {name}
                  </span>
                  {isMinted ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#FFD166] shrink-0">
                      <ShieldCheck className="w-3 h-3" /> Minted
                    </span>
                  ) : isEligible ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRewards();
                      }}
                      className="px-2 py-0.5 rounded-md bg-[#00FFCC] text-[#0A1128] font-heading font-black text-[10px] hover:bg-[#00FFCC]/90 active:scale-95 transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1B35]"
                    >
                      Mint Now
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {criteria}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
