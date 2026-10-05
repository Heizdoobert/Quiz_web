'use client';

import React from 'react';
import { ClientQuestion, LeaderboardEntry } from '@/lib/types';
import { useQuizLogic } from '@/hooks/quiz/use-quiz-logic';
import { useSession } from '@/hooks/shared/use-session';
import Header from '../layout/Header';
import CategoryBar from './CategoryBar';
import QuizCard from './QuizCard';
import Sidebar from '../layout/Sidebar';
import AdZone from '../ads/AdZone';
import StickyBannerAd from '../ads/StickyBannerAd';
import SeoFaqSection from '../seo/SeoFaqSection';
import { QuizModals } from './QuizModals';
import dynamic from 'next/dynamic';

const QuestionForm = dynamic(() => import('./QuestionForm'), { ssr: false });
const LeaderboardPanel = dynamic(() => import('../leaderboard/LeaderboardPanel'), { ssr: true });

interface QuizLayoutProps {
  initialQuestion?: ClientQuestion | null;
  initialLeaderboard?: LeaderboardEntry[];
  initialCategory?: string;
}

export default function QuizLayout({
  initialQuestion = null,
  initialLeaderboard = [],
  initialCategory,
}: QuizLayoutProps = {}) {
  const {
    address,
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
  } = useQuizLogic({ initialQuestion, initialLeaderboard, initialCategory });
  const { account, requireSignIn } = useSession();

  return (
    <>
      <Header
        onOpenRewards={() => openModal('rewards')}
        onOpenProfile={() => openModal('profile')}
        hasClaimable={hasClaimableRewards}
        heldTokens={claimableRewards?.heldTokens}
        sweepsAt={claimableRewards?.sweepsAt}
      />
      <div className={`w-full flex justify-center pt-6 px-4 transition-[padding] duration-300 ${showStickyAd ? 'pb-[calc(70px+env(safe-area-inset-bottom))] sm:pb-[84px]' : 'pb-6'}`}>
      <div className="w-full max-w-[1540px] flex gap-6 justify-center items-start">
        {/* Center Main Content Area */}
        <div className="flex-1 max-w-6xl w-full flex flex-col items-center">
          {/* Top Banner Ad */}
          <AdZone variant="banner" slot="top-banner" />

          {/* 3-Column Responsive Core App Grid */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Stats & History Sidebar (3 cols) */}
            <div className="lg:col-span-3 w-full order-2 lg:order-1">
              <Sidebar
                stats={stats}
                history={history}
                onOpenReview={() => openModal('review')}
                claimableTokens={claimableRewards?.claimableTokens}
                onOpenRewards={() => openModal('rewards')}
              />
            </div>

            {/* Center Column: Quiz Card & Custom Question Form (6 cols) */}
            <div className="lg:col-span-6 w-full flex flex-col items-center order-1 lg:order-2 space-y-4">
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
                onOpenDispute={account ? () => openModal('dispute') : undefined}
                isUnlocked={isUnlocked}
                onUnlock={handleUnlock}
              />

              <div id="custom-form" className="w-full mt-4">
                {account ? (
                  <QuestionForm
                    walletAddress={address || null}
                    onQuestionAdded={loadNextQuestion}
                  />
                ) : (
                  <div className="w-full glass glass-border glass-edge rounded-3xl shadow-xl p-6 text-center space-y-3">
                    <p className="text-sm text-slate-400">
                      No questions yet. Sign in to add the first one.
                    </p>
                    <button
                      type="button"
                      onClick={() => requireSignIn()}
                      className="px-5 py-2 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] text-[#0A1128] rounded-xl font-black font-heading text-xs cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Leaderboards (3 cols) */}
            <div className="lg:col-span-3 w-full order-3">
              <LeaderboardPanel
                globalEntries={globalLeaderboard}
                groupEntries={groupLeaderboard}
                loading={leaderboardLoading}
                onOpenGroupModal={() => openModal('group')}
              />
            </div>
          </div>

          {/* Bottom Banner Ad */}
          <AdZone variant="banner" slot="bottom-banner" />

          {/* Semantic SEO & Knowledge FAQ Section */}
          <SeoFaqSection />
        </div>
      </div>

      <QuizModals
        activeModal={activeModal}
        closeModal={closeModal}
        openModal={openModal}
        timerMode={timerMode}
        timerDuration={timerDuration}
        handleSaveTimerSettings={handleSaveTimerSettings}
        address={address}
        handleSelectGroup={handleSelectGroup}
        history={history}
        handleCloseRewards={handleCloseRewards}
        stats={stats}
        claimableRewards={claimableRewards}
        currentQuestionId={currentQuestion?.id}
      />
    </div>

    {/* Sticky Bottom Banner Ad with Isolated Tap Targets */}
    {showStickyAd && (
      <StickyBannerAd position="bottom" onDismiss={() => setShowStickyAd(false)} />
    )}
    </>
  );
}
