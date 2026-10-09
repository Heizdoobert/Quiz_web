import React from 'react';
import dynamic from 'next/dynamic';
import { UserStats, HistoryItem } from '@/lib/types';

const IntroModal = dynamic(() => import('../modals/IntroModal'), { ssr: false });
const TimerSettingsModal = dynamic(() => import('../modals/TimerSettingsModal'), { ssr: false });
const GroupModal = dynamic(() => import('../modals/GroupModal'), { ssr: false });
const ReviewModal = dynamic(() => import('../modals/ReviewModal'), { ssr: false });
const ProfileModal = dynamic(() => import('../modals/ProfileModal'), { ssr: false });
const DisputeModal = dynamic(() => import('../modals/DisputeModal'), { ssr: false });

type TimerModeType = 'per-question' | 'total' | 'stopwatch';

interface QuizModalsProps {
  activeModal: string | null;
  closeModal: () => void;
  timerMode: TimerModeType;
  timerDuration: number;
  handleSaveTimerSettings: (mode: TimerModeType, duration: number) => void;
  handleSelectGroup: (groupId: string) => void;
  history: HistoryItem[];
  stats: UserStats;
  currentQuestionId: string | undefined;
}

export function QuizModals({
  activeModal,
  closeModal,
  timerMode,
  timerDuration,
  handleSaveTimerSettings,
  handleSelectGroup,
  history,
  stats,
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
        onSelectGroup={handleSelectGroup}
      />
      <ReviewModal isOpen={activeModal === 'review'} onClose={closeModal} history={history} />
      <ProfileModal
        isOpen={activeModal === 'profile'}
        onClose={closeModal}
        stats={stats}
      />
      <DisputeModal
        isOpen={activeModal === 'dispute'}
        onClose={closeModal}
        questionId={currentQuestionId}
      />
    </>
  );
}
