'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ClientQuestion, LeaderboardEntry } from '@/lib/types';
import { useQuizLogic } from '@/hooks/quiz/use-quiz-logic';
import Header from '../layout/Header';
import CategoryBar from './CategoryBar';
import QuizCard from './QuizCard';
import Sidebar from '../layout/Sidebar';
import LeaderboardPanel from '../leaderboard/LeaderboardPanel';
import QuestionForm from './QuestionForm';
import AdZone from '../ads/AdZone';
import StickyBannerAd from '../ads/StickyBannerAd';
import IntroModal from '../modals/IntroModal';
import TimerSettingsModal from '../modals/TimerSettingsModal';
import GroupModal from '../modals/GroupModal';
import ReviewModal from '../modals/ReviewModal';
import RewardsModal from '../modals/RewardsModal';
import ProfileModal from '../modals/ProfileModal';
import DisputeModal from '../modals/DisputeModal';
import SeoFaqSection from '../seo/SeoFaqSection';

interface QuizLayoutProps {
  initialQuestion?: ClientQuestion | null;
  initialLeaderboard?: LeaderboardEntry[];
}

export default function QuizLayout({
  initialQuestion = null,
  initialLeaderboard = [],
}: QuizLayoutProps = {}) {
  const {
    address,
    isConnected,
    selectedCategory,
    currentQuestion,
    isFlipped,
    isSubmitting,
    result,
    showStickyAd,
    setShowStickyAd,
    stats,
    history,
    timerMode,
    timerDuration,
    timeLeft,
    fiftyFiftyUsed,
    skipUsed,
    eliminatedIndices,
    globalLeaderboard,
    groupLeaderboard,
    leaderboardLoading,
    activeModal,
    openModal,
    closeModal,
    claimableRewards,
    hasClaimableRewards,
    loadNextQuestion,
    handleSelectCategory,
    handleAnswerSubmit,
    handle5050,
    handleSkip,
    handleSelectGroup,
    handleSaveTimerSettings,
    handleCloseRewards,
    isUnlocked,
    handleUnlock,
  } = useQuizLogic({ initialQuestion, initialLeaderboard });

  return (
    <>
      <Header
        onOpenRewards={() => openModal('rewards')}
        onOpenProfile={() => openModal('profile')}
        hasClaimable={hasClaimableRewards}
        isConnected={isConnected}
      />
      <div className={`w-full flex justify-center pt-6 px-4 transition-[padding] duration-300 ${showStickyAd ? 'pb-[calc(70px+env(safe-area-inset-bottom))] sm:pb-[84px]' : 'pb-6'}`}>
      <div className="w-full max-w-[1540px] flex gap-6 justify-center items-start">
        {/* Left Skyscraper Ad (Desktop Only) */}
        <AdZone variant="skyscraper" slot="left-sky" />

        {/* Center Main Content Area */}
        <div className="flex-1 max-w-6xl w-full flex flex-col items-center">
          {/* Top Banner Ad */}
          <AdZone variant="banner" slot="top-banner" />

          {/* 3-Column Responsive Core App Grid */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Stats & History Sidebar (3 cols) */}
            <motion.div
              className="lg:col-span-3 w-full order-2 lg:order-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 * 0.04 }}
            >
              <Sidebar
                stats={stats}
                history={history}
                onOpenReview={() => openModal('review')}
                claimableTokens={claimableRewards?.claimableTokens}
                onOpenRewards={() => openModal('rewards')}
              />
            </motion.div>

            {/* Center Column: Quiz Card & Custom Question Form (6 cols) */}
            <motion.div
              className="lg:col-span-6 w-full flex flex-col items-center order-1 lg:order-2 space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 * 0.04 }}
            >
              <CategoryBar
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
              />
              <QuizCard
                question={currentQuestion}
                isFlipped={isFlipped}
                timeLeft={timeLeft}
                result={result}
                onSelectAnswer={handleAnswerSubmit}
                onNextQuestion={loadNextQuestion}
                onOpenTimerSettings={() => openModal('timer')}
                onUse5050={handle5050}
                onUseSkip={handleSkip}
                fiftyFiftyUsed={fiftyFiftyUsed}
                skipUsed={skipUsed}
                eliminatedIndices={eliminatedIndices}
                isSubmitting={isSubmitting}
                onAddQuestionClick={() => {
                  const form = document.getElementById('custom-form');
                  form?.scrollIntoView({ behavior: 'smooth' });
                }}
                onOpenDispute={() => openModal('dispute')}
                isUnlocked={isUnlocked}
                onUnlock={handleUnlock}
              />

              <div id="custom-form" className="w-full mt-4">
                <QuestionForm
                  walletAddress={address || null}
                  onQuestionAdded={loadNextQuestion}
                />
              </div>
            </motion.div>

            {/* Right Column: Leaderboards (3 cols) */}
            <motion.div
              className="lg:col-span-3 w-full order-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 * 0.04 }}
            >
              <LeaderboardPanel
                globalEntries={globalLeaderboard}
                groupEntries={groupLeaderboard}
                loading={leaderboardLoading}
                onOpenGroupModal={() => openModal('group')}
              />
            </motion.div>
          </div>

          {/* Bottom Banner Ad */}
          <AdZone variant="banner" slot="bottom-banner" />

          {/* Semantic SEO & Knowledge FAQ Section */}
          <SeoFaqSection />
        </div>

        {/* Right Skyscraper Ad (Desktop Only) */}
        <AdZone variant="skyscraper" slot="right-sky" />
      </div>

      {/* Modals rendered via Portals */}
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
        questionId={currentQuestion?.id}
        walletAddress={address || null}
      />
    </div>

    {/* Sticky Bottom Banner Ad with Isolated Tap Targets */}
    {showStickyAd && (
      <StickyBannerAd position="bottom" onDismiss={() => setShowStickyAd(false)} />
    )}
    </>
  );
}
