import React from 'react';
import dynamic from 'next/dynamic';
import { UserStats, HistoryItem, ClaimableRewards } from '@/lib/types';
import { ActiveModal } from '@/hooks/quiz/use-quiz-logic';

const IntroModal = dynamic(() => import('../modals/IntroModal'), { ssr: false });
const TimerSettingsModal = dynamic(() => import('../modals/TimerSettingsModal'), { ssr: false });
const GroupModal = dynamic(() => import('../modals/GroupModal'), { ssr: false });
const ReviewModal = dynamic(() => import('../modals/ReviewModal'), { ssr: false });
const RewardsModal = dynamic(() => import('../modals/RewardsModal'), { ssr: false });
const ProfileModal = dynamic(() => import('../modals/ProfileModal'), { ssr: false });
const DisputeModal = dynamic(() => import('../modals/DisputeModal'), { ssr: false });

type TimerModeType = 'per-question' | 'total' | 'stopwatch';

interface QuizModalsProps {
  activeModal: string | null;
  closeModal: () => void;
  openModal: (modal: Exclude<ActiveModal, null>) => void;
  timerMode: TimerModeType;
  timerDuration: number;
  handleSaveTimerSettings: (mode: TimerModeType, duration: number) => void;
  address: string | undefined;
  handleSelectGroup: (groupId: string) => void;
  history: HistoryItem[];
  handleCloseRewards: () => void;
  stats: UserStats;
  claimableRewards: ClaimableRewards | null;
  currentQuestionId: string | undefined;
}

export function QuizModals({
  activeModal,
  closeModal,
  openModal,
  timerMode,
  timerDuration,
  handleSaveTimerSettings,
  address,
  handleSelectGroup,
  history,
  handleCloseRewards,
  stats,
  claimableRewards,
  currentQuestionId,
}: QuizModalsProps) {
  return (
    <>
      <IntroModal isOpen={activeModal === 'intro'} onClose={closeModal} />
      <TimerSettingsModal
        isOpen={activeModal === 'timer'}
        onClose={closeModal}
        currentMode={timerMode}
        currentDuration={timerDuration}
        onSave={handleSaveTimerSettings}
      />
      <GroupModal
        isOpen={activeModal === 'group'}
        onClose={closeModal}
        walletAddress={address || null}
        onSelectGroup={handleSelectGroup}
      />
      <ReviewModal isOpen={activeModal === 'review'} onClose={closeModal} history={history} />
      <RewardsModal
        isOpen={activeModal === 'rewards'}
        onClose={handleCloseRewards}
        walletAddress={address || null}
      />
      <ProfileModal
        isOpen={activeModal === 'profile'}
        onClose={closeModal}
        address={address}
        stats={stats}
        claimableRewards={claimableRewards}
        onOpenRewards={() => openModal('rewards')}
      />
      <DisputeModal
        isOpen={activeModal === 'dispute'}
        onClose={closeModal}
        questionId={currentQuestionId}
        walletAddress={address || null}
      />
    </>
  );
}
