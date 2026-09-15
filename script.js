const QUESTIONS = [
  {
    id: 1,
    question: "Which HTML element is used to link an external CSS file?",
    options: ["<link>", "<style>", "<css>", "<stylesheet>"],
    correctIndex: 0,
    explanation: "The <link rel='stylesheet' href='...'> tag links external CSS stylesheets into an HTML document."
  },
  {
    id: 2,
    question: "Which CSS property controls the spacing between lines of text?",
    options: ["letter-spacing", "line-height", "word-spacing", "text-indent"],
    correctIndex: 1,
    explanation: "'line-height' sets the distance between baselines of text."
  },
  {
    id: 3,
    question: "What does the '===' operator check in JavaScript?",
    options: ["Value only", "Type only", "Both value and type without coercion", "Memory reference only"],
    correctIndex: 2,
    explanation: "Strict equality (===) checks both value and type without performing type coercion."
  },
  {
    id: 4,
    question: "Which HTML5 element is best suited for independent, reusable content like blog posts?",
    options: ["<section>", "<div>", "<article>", "<main>"],
    correctIndex: 2,
    explanation: "The <article> element is intended for self-contained compositions intended to be independently distributable."
  },
  {
    id: 5,
    question: "In CSS Flexbox, which property aligns items along the cross-axis?",
    options: ["justify-content", "align-items", "flex-direction", "align-content"],
    correctIndex: 1,
    explanation: "'align-items' controls alignment of items along the cross-axis within the current flex line."
  },
  {
    id: 6,
    question: "Which array method creates a new array with all elements that pass a test function?",
    options: ["map()", "filter()", "reduce()", "forEach()"],
    correctIndex: 1,
    explanation: "The filter() method produces a shallow copy of portions of a given array filtered down to elements that pass the test."
  }
];

const state = {
  currentIndex: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  answers: [],
  isAnswered: false,
  elapsedSeconds: 0,
  timerIntervalId: null,
  isFinished: false
};

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function calcAccuracy(answers) {
  if (!answers || answers.length === 0) return 0;
  const correctCount = answers.filter(a => a.isCorrect).length;
  return Math.round((correctCount / answers.length) * 100);
}

function selectOption(index) {
  if (state.isAnswered || state.isFinished) return null;
  const currentQ = QUESTIONS[state.currentIndex];
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= currentQ.options.length) {
    return null;
  }
  const isCorrect = (index === currentQ.correctIndex);

  if (isCorrect) {
    state.score += 100;
    state.streak += 1;
    state.bestStreak = Math.max(state.streak, state.bestStreak);
  } else {
    state.streak = 0;
  }

  const record = { questionId: currentQ.id, selectedIndex: index, isCorrect };
  state.answers.push(record);
  state.isAnswered = true;
  return record;
}

function nextQuestion() {
  if (state.currentIndex < QUESTIONS.length - 1) {
    state.currentIndex += 1;
    state.isAnswered = false;
  } else {
    state.isFinished = true;
    if (state.timerIntervalId) {
      clearInterval(state.timerIntervalId);
      state.timerIntervalId = null;
    }
  }
}

function restartQuiz() {
  state.currentIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.answers = [];
  state.isAnswered = false;
  state.elapsedSeconds = 0;
  state.isFinished = false;
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
}

// --- DOM Rendering Functions ---

function renderHeader() {
  const timerDisplay = document.getElementById('timer-display');
  const progressText = document.getElementById('progress-text');
  const progressBarFill = document.getElementById('progress-bar-fill');

  if (timerDisplay) {
    timerDisplay.textContent = formatTime(state.elapsedSeconds);
  }

  const total = QUESTIONS.length;
  const currentNum = Math.min(state.currentIndex + 1, total);

  if (progressText) {
    progressText.textContent = state.isFinished ? 'Quiz Complete!' : `Question ${currentNum} of ${total}`;
  }

  if (progressBarFill) {
    const pct = state.isFinished ? 100 : Math.round((currentNum / total) * 100);
    progressBarFill.style.width = `${pct}%`;
  }
}

function renderQuestion() {
  const questionCard = document.getElementById('quiz-card');
  if (!questionCard) return;

  if (state.isFinished) {
    const accuracy = calcAccuracy(state.answers);
    questionCard.innerHTML = `
      <div class="completion-summary">
        <div class="completion-icon" aria-hidden="true">🏆</div>
        <h2>Quiz Completed!</h2>
        <div class="completion-stats">
          <div class="stat-card">
            <span class="stat-label">Final Score</span>
            <span class="stat-value highlight">${state.score} pts</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Accuracy</span>
            <span class="stat-value">${accuracy}%</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Best Streak</span>
            <span class="stat-value">🔥 ${state.bestStreak}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Total Time</span>
            <span class="stat-value">${formatTime(state.elapsedSeconds)}</span>
          </div>
        </div>
        <button id="restart-btn" class="btn btn-primary" type="button">Play Again</button>
      </div>
    `;
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', handleRestart);
    }
    return;
  }

  const currentQ = QUESTIONS[state.currentIndex];
  questionCard.innerHTML = `
    <div class="card-inner">
      <h2 id="question-text" class="question-heading">${currentQ.question}</h2>
      <div id="options-container" class="options-grid" role="group" aria-label="Answer options"></div>
      <div id="feedback-container" class="feedback-card hidden" aria-live="polite">
        <div id="feedback-result" class="feedback-result"></div>
        <p id="feedback-explanation" class="feedback-explanation"></p>
      </div>
      <div class="action-footer">
        <button id="next-btn" class="btn btn-primary hidden" type="button">
          ${state.currentIndex === QUESTIONS.length - 1 ? 'Finish Quiz' : 'Next Question →'}
        </button>
      </div>
    </div>
  `;

  const optionsContainer = document.getElementById('options-container');
  const badges = ['A', 'B', 'C', 'D'];

  currentQ.options.forEach((optText, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.dataset.index = idx;
    btn.innerHTML = `<span class="badge">${badges[idx]}</span> <span class="option-text">${optText}</span>`;
    btn.addEventListener('click', () => handleOptionClick(idx));
    optionsContainer.appendChild(btn);
  });

  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', handleNextClick);
  }
}

function renderScoreboard() {
  const scoreDisplay = document.getElementById('score-display');
  const streakDisplay = document.getElementById('streak-display');
  const bestStreakDisplay = document.getElementById('best-streak-display');
  const accuracyDisplay = document.getElementById('accuracy-display');
  const historyList = document.getElementById('history-list');

  if (scoreDisplay) scoreDisplay.textContent = state.score;
  if (streakDisplay) streakDisplay.textContent = state.streak;
  if (bestStreakDisplay) bestStreakDisplay.textContent = `Best: ${state.bestStreak}`;
  if (accuracyDisplay) accuracyDisplay.textContent = `${calcAccuracy(state.answers)}%`;

  if (historyList) {
    historyList.innerHTML = '';
    state.answers.forEach((ans, idx) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const badgeClass = ans.isCorrect ? 'correct' : 'incorrect';
      const badgeText = ans.isCorrect ? '✓ Correct' : '✗ Incorrect';
      li.innerHTML = `
        <span>Q${idx + 1}</span>
        <span class="history-badge ${badgeClass}">${badgeText}</span>
      `;
      historyList.appendChild(li);
    });
  }
}

function renderAll() {
  renderHeader();
  renderQuestion();
  renderScoreboard();
}

function handleOptionClick(idx) {
  if (state.isAnswered) return;
  const res = selectOption(idx);
  if (!res) return;

  const currentQ = QUESTIONS[state.currentIndex];
  const optionButtons = document.querySelectorAll('.option-btn');

  optionButtons.forEach(btn => {
    const btnIdx = parseInt(btn.dataset.index, 10);
    btn.disabled = true;
    if (btnIdx === currentQ.correctIndex) {
      btn.classList.add('correct');
    } else if (btnIdx === idx && !res.isCorrect) {
      btn.classList.add('incorrect');
    }
  });

  const feedbackContainer = document.getElementById('feedback-container');
  const feedbackResult = document.getElementById('feedback-result');
  const feedbackExplanation = document.getElementById('feedback-explanation');
  const nextBtn = document.getElementById('next-btn');

  if (feedbackContainer && feedbackResult && feedbackExplanation) {
    feedbackContainer.classList.remove('hidden');
    feedbackResult.className = `feedback-result ${res.isCorrect ? 'correct' : 'incorrect'}`;
    feedbackResult.textContent = res.isCorrect ? '✓ Correct!' : '✗ Incorrect';
    feedbackExplanation.textContent = currentQ.explanation;
  }

  if (nextBtn) {
    nextBtn.classList.remove('hidden');
    nextBtn.focus();
  }

  renderScoreboard();
}

function handleNextClick() {
  nextQuestion();
  renderAll();
}

function handleRestart() {
  restartQuiz();
  startTimer();
  renderAll();
}

function startTimer() {
  if (state.timerIntervalId) clearInterval(state.timerIntervalId);
  state.timerIntervalId = setInterval(() => {
    state.elapsedSeconds += 1;
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
      timerDisplay.textContent = formatTime(state.elapsedSeconds);
    }
  }, 1000);
}

function initApp() {
  startTimer();
  renderAll();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initApp);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    QUESTIONS,
    state,
    formatTime,
    calcAccuracy,
    selectOption,
    nextQuestion,
    restartQuiz,
    renderHeader,
    renderQuestion,
    renderScoreboard,
    renderAll,
    handleOptionClick,
    handleNextClick,
    handleRestart,
    startTimer,
    initApp
  };
}

