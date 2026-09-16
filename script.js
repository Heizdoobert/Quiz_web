const DEFAULT_QUESTIONS = [
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

const MAX_QUESTIONS = 50;
const ADS_URL = 'https://www.profitableratecpmnetwork.com/pvr8jzwqk?key=7672ccaa0ae9cd3ce4f5fd168d596fde';

// Mini JSON-like DB storage using sessionStorage and session cookie
const MiniStore = {
  sessionKey: 'quiz_mini_db',
  cookieName: 'quiz_mini_session',

  getCookie(name) {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  },

  setCookie(name, value) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
  },

  deleteCookie(name) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  },

  clear() {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(this.sessionKey);
    }
    this.deleteCookie(this.cookieName);
  },

  save(data) {
    const json = JSON.stringify(data);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(this.sessionKey, json);
    }
    this.setCookie(this.cookieName, json);
  },

  load() {
    let raw = null;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      raw = window.sessionStorage.getItem(this.sessionKey);
    }
    if (!raw) {
      raw = this.getCookie(this.cookieName);
    }
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
};

// Active questions array (starts blank initially)
const QUESTIONS = [];


function loadSampleQuestions() {
  QUESTIONS.length = 0;
  DEFAULT_QUESTIONS.forEach(q => QUESTIONS.push(JSON.parse(JSON.stringify(q))));
  MiniStore.save(QUESTIONS);
  restartQuiz();
  if (typeof document !== 'undefined') {
    if (typeof renderAll === 'function') renderAll();
    if (typeof updateQuestionCountBadge === 'function') updateQuestionCountBadge();
  }
}


function addCustomQuestion(data) {

  if (!data || typeof data.question !== 'string' || data.question.trim().length === 0) {
    return null;
  }
  if (!Array.isArray(data.options) || data.options.length !== 4) {
    return null;
  }
  for (const opt of data.options) {
    if (typeof opt !== 'string' || opt.trim().length === 0) {
      return null;
    }
  }
  if (typeof data.correctIndex !== 'number' || !Number.isInteger(data.correctIndex) || data.correctIndex < 0 || data.correctIndex >= 4) {
    return null;
  }
  if (QUESTIONS.length >= MAX_QUESTIONS) {
    return null;
  }

  const newId = QUESTIONS.length > 0 ? Math.max(...QUESTIONS.map(q => q.id)) + 1 : 1;
  const newQuestion = {
    id: newId,
    question: data.question.trim(),
    options: data.options.map(o => o.trim()),
    correctIndex: data.correctIndex,
    explanation: data.explanation && typeof data.explanation === 'string' && data.explanation.trim().length > 0
      ? data.explanation.trim()
      : `Correct answer: ${data.options[data.correctIndex].trim()}`
  };

  QUESTIONS.push(newQuestion);
  MiniStore.save(QUESTIONS);
  return newQuestion;
}


const state = {
  currentIndex: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  answers: [],
  isAnswered: false,
  elapsedSeconds: 0,
  timerIntervalId: null,
  isFinished: false,
  timerMode: 'per-question', // 'per-question' | 'total' | 'stopwatch'
  timerLimit: 30,           // seconds for per-question or total
  remainingSeconds: 30
};

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function calcAccuracy(answers) {
  if (!answers || answers.length === 0) return 0;
  const correctCount = answers.filter(a => a.isCorrect).length;
  return Math.round((correctCount / answers.length) * 100);
}

function setTimerConfig(mode, limit) {
  if (mode === 'per-question' || mode === 'total' || mode === 'stopwatch') {
    state.timerMode = mode;
  }
  if (typeof limit === 'number' && limit > 0) {
    state.timerLimit = limit;
  }
  if (state.timerMode === 'per-question' || state.timerMode === 'total') {
    state.remainingSeconds = state.timerLimit;
  }
  if (typeof renderHeader === 'function' && typeof document !== 'undefined') {
    renderHeader();
  }
}

function handleTimeout() {
  if (state.isAnswered || state.isFinished || QUESTIONS.length === 0) return null;
  const currentQ = QUESTIONS[state.currentIndex];
  state.streak = 0;
  const record = { questionId: currentQ ? currentQ.id : null, selectedIndex: -1, isCorrect: false, isTimeout: true };
  state.answers.push(record);
  state.isAnswered = true;

  if (typeof document !== 'undefined') {
    const feedbackResult = document.getElementById('feedback-result');
    const feedbackExplanation = document.getElementById('feedback-explanation');
    const correctAnsDisplay = document.getElementById('feedback-correct-answer');
    const nextBtn = document.getElementById('next-btn');

    if (feedbackResult) {
      feedbackResult.className = 'feedback-result incorrect';
      feedbackResult.textContent = "⏰ Time's Up!";
    }
    if (feedbackExplanation && currentQ) {
      feedbackExplanation.textContent = currentQ.explanation || 'No explanation provided.';
    }
    if (correctAnsDisplay && currentQ) {
      correctAnsDisplay.textContent = `Correct answer: ${currentQ.options[currentQ.correctIndex]}`;
    }
    if (nextBtn) {
      nextBtn.classList.remove('hidden');
      nextBtn.focus();
    }
    if (typeof flipCard === 'function') {
      flipCard(true);
    }
    renderScoreboard();
  }
  return record;
}

function tickTimer() {
  if (state.isFinished || QUESTIONS.length === 0) return;

  if (state.timerMode === 'stopwatch') {
    state.elapsedSeconds += 1;
  } else if (state.timerMode === 'per-question') {
    if (state.remainingSeconds > 0 && !state.isAnswered) {
      state.remainingSeconds -= 1;
      if (state.remainingSeconds === 0) {
        handleTimeout();
      }
    }
  } else if (state.timerMode === 'total') {
    if (state.remainingSeconds > 0) {
      state.remainingSeconds -= 1;
      if (state.remainingSeconds === 0) {
        state.isFinished = true;
        if (state.timerIntervalId) {
          clearInterval(state.timerIntervalId);
          state.timerIntervalId = null;
        }
        if (typeof renderAll === 'function') {
          renderAll();
        }
      }
    }
  }

  if (typeof renderHeader === 'function' && typeof document !== 'undefined') {
    renderHeader();
  }
}

function selectOption(index) {
  if (state.isAnswered || state.isFinished || QUESTIONS.length === 0) return null;
  const currentQ = QUESTIONS[state.currentIndex];
  if (!currentQ || typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= currentQ.options.length) {
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
    if (state.timerMode === 'per-question') {
      state.remainingSeconds = state.timerLimit;
    }
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
  state.remainingSeconds = state.timerLimit;
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
}

// --- DOM Rendering Functions ---

function renderHeader() {
  if (typeof document === 'undefined') return;
  const timerDisplay = document.getElementById('timer-display');

  const progressText = document.getElementById('progress-text');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressTrack = document.querySelector ? document.querySelector('.progress-track') : null;

  if (timerDisplay) {
    if (state.timerMode === 'stopwatch') {
      timerDisplay.textContent = formatTime(state.elapsedSeconds);
      if (timerDisplay.classList) timerDisplay.classList.remove('timer-warning');
    } else {
      timerDisplay.textContent = formatTime(state.remainingSeconds);
      if (timerDisplay.classList) {
        if (state.remainingSeconds <= 5 && !state.isAnswered && !state.isFinished && QUESTIONS.length > 0) {
          timerDisplay.classList.add('timer-warning');
        } else {
          timerDisplay.classList.remove('timer-warning');
        }
      }
    }
  }

  const total = QUESTIONS.length;
  const currentNum = total > 0 ? Math.min(state.currentIndex + 1, total) : 0;

  if (progressText) {
    if (total === 0) {
      progressText.textContent = 'Question 0 of 0 (Add a question to start)';
    } else {
      progressText.textContent = state.isFinished ? 'Quiz Complete!' : `Question ${currentNum} of ${total}`;
    }
  }

  if (progressBarFill) {
    const pct = total === 0 ? 0 : (state.isFinished ? 100 : Math.round((currentNum / total) * 100));
    progressBarFill.style.width = `${pct}%`;
  }

  if (progressTrack) {
    progressTrack.setAttribute('aria-valuenow', currentNum);
    progressTrack.setAttribute('aria-valuemax', total);
  }
}

function renderQuestion() {
  const questionCard = document.getElementById('quiz-card');
  if (!questionCard) return;

  if (QUESTIONS.length === 0) {
    questionCard.innerHTML = `
      <div id="welcome-overlay" class="welcome-overlay">
        <div class="welcome-icon" aria-hidden="true">🎯</div>
        <h2 class="welcome-heading">Welcome to Quiz Web</h2>
        <p class="welcome-desc">No quiz questions yet. Click below to add your first question or load sample web trivia to begin!</p>
        <div class="welcome-actions">
          <button id="btn-welcome-add" class="btn btn-primary" type="button">➕ Add New Quiz</button>
          <button id="btn-welcome-sample" class="btn btn-secondary" type="button">⚡ Load Sample Questions</button>
          <button id="btn-welcome-intro" class="btn btn-secondary" type="button">📖 How to Play</button>
        </div>
      </div>
    `;

    const btnAdd = document.getElementById('btn-welcome-add');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const formSection = document.getElementById('custom-question-section');
        const toggleBtn = document.getElementById('toggle-add-form-btn');
        if (formSection) formSection.classList.add('expanded');
        if (toggleBtn) {
          toggleBtn.setAttribute('aria-expanded', 'true');
          toggleBtn.textContent = '✖ Close Question Form';
        }
        const qInput = document.getElementById('new-q-text');
        if (qInput) qInput.focus();
      });
    }

    const btnSample = document.getElementById('btn-welcome-sample');
    if (btnSample) {
      btnSample.addEventListener('click', () => {
        loadSampleQuestions();
      });
    }

    const btnIntro = document.getElementById('btn-welcome-intro');
    if (btnIntro) {
      btnIntro.addEventListener('click', () => {
        openIntroModal();
      });
    }
    return;
  }


  if (state.isFinished) {
    const accuracy = calcAccuracy(state.answers);
    questionCard.innerHTML = `
      <div class="completion-summary">
        <div class="cat-clapping-wrapper" aria-label="Cat clapping celebration animation">
          <div class="confetti-sparkles" aria-hidden="true">
            <span class="sparkle s1">✨</span>
            <span class="sparkle s2">🎉</span>
            <span class="sparkle s3">🎊</span>
            <span class="sparkle s4">⭐</span>
          </div>
          <div class="cat-stage">
            <div class="cat-head-wrap">
              <span class="cat-avatar" aria-hidden="true">🐱</span>
            </div>
            <div class="cat-paws-stage" aria-hidden="true">
              <span class="cat-paw paw-left">🐾</span>
              <span class="cat-clap-burst">👏</span>
              <span class="cat-paw paw-right">🐾</span>
            </div>
          </div>
        </div>
        <h2 class="completion-heading">🎉 Congratulations! Quiz Completed!</h2>
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
      <div id="flip-card-inner" class="flip-card-inner">
        <!-- Front Face: Question Prompt and Options -->
        <div class="flip-card-front">
          <h2 id="question-text" class="question-heading"></h2>
          <div id="options-container" class="options-grid" role="group" aria-label="Answer options"></div>
        </div>

        <!-- Back Face: Answer Feedback & Next Button (No Scrolling Required) -->
        <div class="flip-card-back">
          <div id="feedback-container" class="feedback-card hidden" aria-live="polite">
            <div id="feedback-result" class="feedback-result"></div>
            <div id="feedback-correct-answer" class="feedback-correct-answer"></div>
            <p id="feedback-explanation" class="feedback-explanation"></p>
          </div>
          <div class="action-footer">
            <button id="next-btn" class="btn btn-primary hidden" type="button">
              ${state.currentIndex === QUESTIONS.length - 1 ? 'Finish Quiz' : 'Next Question →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('question-text').textContent = currentQ.question;

  const optionsContainer = document.getElementById('options-container');
  const badges = ['A', 'B', 'C', 'D'];

  currentQ.options.forEach((optText, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.dataset.index = idx;
    btn.innerHTML = `<span class="badge">${badges[idx]}</span> <span class="option-text"></span>`;
    const textSpan = btn.querySelector ? btn.querySelector('.option-text') : null;
    if (textSpan) {
      textSpan.textContent = optText;
    }
    btn.addEventListener('click', () => handleOptionClick(idx));
    optionsContainer.appendChild(btn);
  });

  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', handleNextClick);
  }
}

function flipCard(isFlipped) {
  if (typeof document === 'undefined') return;
  const cardInner = document.getElementById('flip-card-inner');
  if (cardInner && cardInner.classList) {
    if (isFlipped) {
      cardInner.classList.add('is-flipped');
    } else {
      cardInner.classList.remove('is-flipped');
    }
  }
}

function renderScoreboard() {
  if (typeof document === 'undefined') return;
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
  if (typeof document === 'undefined') return;
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
  const correctAnsDisplay = document.getElementById('feedback-correct-answer');
  const nextBtn = document.getElementById('next-btn');

  if (feedbackContainer && feedbackResult && feedbackExplanation) {
    feedbackContainer.classList.remove('hidden');
    feedbackResult.className = `feedback-result ${res.isCorrect ? 'correct' : 'incorrect'}`;
    feedbackResult.textContent = res.isCorrect ? '✓ Correct!' : '✗ Incorrect';
    feedbackExplanation.textContent = currentQ.explanation;
  }

  if (correctAnsDisplay) {
    correctAnsDisplay.textContent = `Correct answer: ${currentQ.options[currentQ.correctIndex]}`;
  }

  if (nextBtn) {
    nextBtn.classList.remove('hidden');
    nextBtn.focus();
  }

  flipCard(true);
  renderScoreboard();
}

function handleNextClick() {
  flipCard(false);
  nextQuestion();
  renderAll();
}

function handleRestart() {
  flipCard(false);
  restartQuiz();
  startTimer();
  renderAll();
}

function startTimer() {
  if (state.timerIntervalId) clearInterval(state.timerIntervalId);
  state.timerIntervalId = setInterval(tickTimer, 1000);
}

function updateQuestionCountBadge() {
  const badge = document.getElementById('question-count-badge');
  if (badge) {
    badge.textContent = `(${QUESTIONS.length}/${MAX_QUESTIONS} questions)`;
  }
  const addBtn = document.getElementById('btn-add-question');
  const addStartBtn = document.getElementById('btn-add-start-quiz');
  if (QUESTIONS.length >= MAX_QUESTIONS) {
    if (addBtn) addBtn.disabled = true;
    if (addStartBtn) addStartBtn.disabled = true;
    const alertBox = document.getElementById('form-alert-msg');
    if (alertBox) {
      alertBox.textContent = `Maximum limit of ${MAX_QUESTIONS} questions reached.`;
      alertBox.classList.remove('hidden');
    }
  }
}

function initCustomQuestionForm() {
  const toggleBtn = document.getElementById('toggle-add-form-btn');
  const formSection = document.getElementById('custom-question-section');
  const form = document.getElementById('add-question-form');

  if (toggleBtn && formSection) {
    toggleBtn.addEventListener('click', () => {
      const isExpanded = formSection.classList.toggle('expanded');
      toggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      toggleBtn.textContent = isExpanded ? '✖ Close Question Form' : '➕ Add Custom Question';
    });
  }

  updateQuestionCountBadge();

  if (form) {
    const handleAdd = (startNow) => {
      const qTextInput = document.getElementById('new-q-text');
      const opt0 = document.getElementById('new-opt-0');
      const opt1 = document.getElementById('new-opt-1');
      const opt2 = document.getElementById('new-opt-2');
      const opt3 = document.getElementById('new-opt-3');
      const correctRadio = document.querySelector('input[name="correct-opt"]:checked');
      const expInput = document.getElementById('new-q-exp');
      const alertBox = document.getElementById('form-alert-msg');

      if (!qTextInput || !opt0 || !opt1 || !opt2 || !opt3 || !correctRadio) return;

      const qText = qTextInput.value.trim();
      const options = [opt0.value.trim(), opt1.value.trim(), opt2.value.trim(), opt3.value.trim()];
      const correctIndex = parseInt(correctRadio.value, 10);
      const explanation = expInput ? expInput.value.trim() : '';

      if (!qText) {
        if (alertBox) {
          alertBox.textContent = 'Please enter a question.';
          alertBox.className = 'form-alert error';
          alertBox.classList.remove('hidden');
        }
        qTextInput.focus();
        return;
      }

      if (options.some(o => o.length === 0)) {
        if (alertBox) {
          alertBox.textContent = 'Please fill in all 4 options.';
          alertBox.className = 'form-alert error';
          alertBox.classList.remove('hidden');
        }
        return;
      }

      const result = addCustomQuestion({
        question: qText,
        options,
        correctIndex,
        explanation
      });

      if (!result) {
        if (alertBox) {
          alertBox.textContent = `Cannot add question. Max limit of ${MAX_QUESTIONS} reached.`;
          alertBox.className = 'form-alert error';
          alertBox.classList.remove('hidden');
        }
        return;
      }

      if (alertBox) {
        alertBox.textContent = '✓ Question added to quiz!';
        alertBox.className = 'form-alert success';
        alertBox.classList.remove('hidden');
        setTimeout(() => {
          if (alertBox) alertBox.classList.add('hidden');
        }, 2500);
      }

      form.reset();
      updateQuestionCountBadge();

      if (startNow) {
        if (formSection && toggleBtn) {
          formSection.classList.remove('expanded');
          toggleBtn.setAttribute('aria-expanded', 'false');
          toggleBtn.textContent = '➕ Add Custom Question';
        }
        handleRestart();
      } else {
        renderHeader();
      }
    };

    const btnAdd = document.getElementById('btn-add-question');
    if (btnAdd) {
      btnAdd.addEventListener('click', (e) => {
        e.preventDefault();
        handleAdd(false);
      });
    }

    const btnAddStart = document.getElementById('btn-add-start-quiz');
    if (btnAddStart) {
      btnAddStart.addEventListener('click', (e) => {
        e.preventDefault();
        try {
          if (typeof window !== 'undefined' && window.open) {
            window.open(ADS_URL, '_blank', 'noopener,noreferrer');
          }
        } catch (err) {}
        handleAdd(true);
      });
    }
  }
}

let currentIntroStep = 1;

function openIntroModal() {
  const modal = document.getElementById('intro-modal');
  if (modal) {
    modal.classList.remove('hidden');
    currentIntroStep = 1;
    showIntroStep(1);
  }
}

function closeIntroModal() {
  const modal = document.getElementById('intro-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function showIntroStep(step) {
  currentIntroStep = step;
  const steps = [1, 2, 3];
  steps.forEach(s => {
    const el = document.getElementById(`intro-step-${s}`);
    if (el) {
      if (s === step) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  });

  const dots = document.querySelectorAll ? document.querySelectorAll('.step-dot') : [];
  dots.forEach(dot => {
    const s = parseInt(dot.dataset.step, 10);
    if (s === step) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  const prevBtn = document.getElementById('btn-intro-prev');
  const nextBtn = document.getElementById('btn-intro-next');

  if (prevBtn) {
    if (step === 1) {
      prevBtn.classList.add('hidden');
    } else {
      prevBtn.classList.remove('hidden');
    }
  }

  if (nextBtn) {
    if (step === 3) {
      nextBtn.textContent = 'Got It, Let’s Create! 🚀';
    } else {
      nextBtn.textContent = 'Next Step →';
    }
  }
}

function initIntroModal() {
  const modal = document.getElementById('intro-modal');
  if (!modal) return;

  const closeBtn = document.getElementById('btn-intro-close');
  if (closeBtn) closeBtn.addEventListener('click', closeIntroModal);

  const prevBtn = document.getElementById('btn-intro-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentIntroStep > 1) {
        showIntroStep(currentIntroStep - 1);
      }
    });
  }

  const nextBtn = document.getElementById('btn-intro-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentIntroStep < 3) {
        showIntroStep(currentIntroStep + 1);
      } else {
        closeIntroModal();
        const qInput = document.getElementById('new-q-text');
        const formSection = document.getElementById('custom-question-section');
        const toggleBtn = document.getElementById('toggle-add-form-btn');
        if (formSection) formSection.classList.add('expanded');
        if (toggleBtn) {
          toggleBtn.setAttribute('aria-expanded', 'true');
          toggleBtn.textContent = '✖ Close Question Form';
        }
        if (qInput) qInput.focus();
      }
    });
  }

  const dots = document.querySelectorAll ? document.querySelectorAll('.step-dot') : [];
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const s = parseInt(dot.dataset.step, 10);
      showIntroStep(s);
    });
  });

  // Header guide button
  const headerGuideBtn = document.getElementById('btn-header-guide');
  if (headerGuideBtn) {
    headerGuideBtn.addEventListener('click', openIntroModal);
  }

  // Close modal when clicking outside on backdrop
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeIntroModal();
    });
  }

  // Show intro modal on initial load if questions are blank
  if (QUESTIONS.length === 0) {
    openIntroModal();
  }
}

function openTimerSettingsModal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('timer-settings-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const modeSelect = document.getElementById('timer-mode-select');
  if (modeSelect) modeSelect.value = state.timerMode;

  const limitInput = document.getElementById('timer-limit-input');
  if (limitInput) limitInput.value = state.timerLimit;

  updateTimerDurationVisibility();
  updateActivePresetPill(state.timerLimit);
}

function closeTimerSettingsModal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('timer-settings-modal');
  if (modal) modal.classList.add('hidden');
}

function updateTimerDurationVisibility() {
  if (typeof document === 'undefined') return;
  const modeSelect = document.getElementById('timer-mode-select');
  const durationGroup = document.getElementById('timer-duration-group');
  if (!modeSelect || !durationGroup) return;
  if (modeSelect.value === 'stopwatch') {
    durationGroup.classList.add('hidden');
  } else {
    durationGroup.classList.remove('hidden');
  }
}

function updateActivePresetPill(seconds) {
  if (typeof document === 'undefined') return;
  const pills = document.querySelectorAll ? document.querySelectorAll('.preset-pill') : [];
  pills.forEach(pill => {
    const s = parseInt(pill.dataset.seconds, 10);
    if (s === seconds) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

function applyTimerSettings() {
  if (typeof document === 'undefined') return;
  const modeSelect = document.getElementById('timer-mode-select');
  const limitInput = document.getElementById('timer-limit-input');
  const mode = modeSelect ? modeSelect.value : 'per-question';
  const limit = limitInput ? parseInt(limitInput.value, 10) : 30;

  setTimerConfig(mode, limit > 0 ? limit : 30);
  closeTimerSettingsModal();
  restartQuiz();
  startTimer();
  renderAll();
}

function initTimerSettings() {
  if (typeof document === 'undefined') return;
  const btnSettings = document.getElementById('btn-timer-settings');
  if (btnSettings) btnSettings.addEventListener('click', openTimerSettingsModal);

  const btnClose = document.getElementById('btn-close-timer');
  if (btnClose) btnClose.addEventListener('click', closeTimerSettingsModal);

  const btnCancel = document.getElementById('btn-cancel-timer');
  if (btnCancel) btnCancel.addEventListener('click', closeTimerSettingsModal);

  const btnApply = document.getElementById('btn-apply-timer');
  if (btnApply) btnApply.addEventListener('click', applyTimerSettings);

  const modeSelect = document.getElementById('timer-mode-select');
  if (modeSelect) {
    modeSelect.addEventListener('change', updateTimerDurationVisibility);
  }

  const pills = document.querySelectorAll ? document.querySelectorAll('.preset-pill') : [];
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const s = parseInt(pill.dataset.seconds, 10);
      const limitInput = document.getElementById('timer-limit-input');
      if (limitInput) limitInput.value = s;
      updateActivePresetPill(s);
    });
  });

  const timerModal = document.getElementById('timer-settings-modal');
  if (timerModal) {
    timerModal.addEventListener('click', (e) => {
      if (e.target === timerModal) closeTimerSettingsModal();
    });
  }
}

function getStoredTheme() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('quiz-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
  } catch (e) {}
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (root) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      if (root.removeAttribute) root.removeAttribute('data-theme');
    }
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('quiz-theme', theme);
    }
  } catch (e) {}

  const btn = document.getElementById('btn-theme-toggle');
  if (btn) {
    if (theme === 'light') {
      btn.textContent = '☀️ Light';
      btn.setAttribute('aria-label', 'Switch to Dark Mode');
      btn.title = 'Switch to Dark Mode';
    } else {
      btn.textContent = '🌙 Dark';
      btn.setAttribute('aria-label', 'Switch to Light Mode');
      btn.title = 'Switch to Light Mode';
    }
  }
}

function toggleTheme() {
  const isLight = typeof document !== 'undefined' && document.documentElement && document.documentElement.getAttribute && document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  applyTheme(next);
  return next;
}

function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
  const btn = document.getElementById('btn-theme-toggle');
  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }
}

function initApp() {
  // Clear any existing stored data on page reload as requested
  MiniStore.clear();
  // Save fresh questions into session storage and cookie
  MiniStore.save(QUESTIONS);

  initTheme();
  initCustomQuestionForm();
  initIntroModal();
  initTimerSettings();
  startTimer();
  renderAll();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initApp);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_QUESTIONS,
    QUESTIONS,
    MAX_QUESTIONS,
    MiniStore,
    loadSampleQuestions,
    addCustomQuestion,
    openIntroModal,
    closeIntroModal,
    showIntroStep,
    openTimerSettingsModal,
    closeTimerSettingsModal,
    applyTimerSettings,
    flipCard,
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
    setTimerConfig,
    tickTimer,
    handleTimeout,
    startTimer,
    getStoredTheme,
    applyTheme,
    toggleTheme,
    initTheme,
    ADS_URL,
    initApp
  };
}



