const DEFAULT_QUESTIONS = [
  {
    id: 1,
    category: "HTML",
    question: "Which HTML element is used to link an external CSS file?",
    options: ["<link>", "<style>", "<css>", "<stylesheet>"],
    correctIndex: 0,
    explanation: "The <link rel='stylesheet' href='...'> tag links external CSS stylesheets into an HTML document."
  },
  {
    id: 2,
    category: "CSS",
    question: "Which CSS property controls the spacing between lines of text?",
    options: ["letter-spacing", "line-height", "word-spacing", "text-indent"],
    correctIndex: 1,
    explanation: "'line-height' sets the distance between baselines of text."
  },
  {
    id: 3,
    category: "JavaScript",
    question: "What does the '===' operator check in JavaScript?",
    options: ["Value only", "Type only", "Both value and type without coercion", "Memory reference only"],
    correctIndex: 2,
    explanation: "Strict equality (===) checks both value and type without performing type coercion."
  },
  {
    id: 4,
    category: "HTML",
    question: "Which HTML5 element is best suited for independent, reusable content like blog posts?",
    options: ["<section>", "<div>", "<article>", "<main>"],
    correctIndex: 2,
    explanation: "The <article> element is intended for self-contained compositions intended to be independently distributable."
  },
  {
    id: 5,
    category: "CSS",
    question: "In CSS Flexbox, which property aligns items along the cross-axis?",
    options: ["justify-content", "align-items", "flex-direction", "align-content"],
    correctIndex: 1,
    explanation: "'align-items' controls alignment of items along the cross-axis within the current flex line."
  },
  {
    id: 6,
    category: "JavaScript",
    question: "Which array method creates a new array with all elements that pass a test function?",
    options: ["map()", "filter()", "reduce()", "forEach()"],
    correctIndex: 1,
    explanation: "The filter() method produces a shallow copy of portions of a given array filtered down to elements that pass the test."
  }
];

const MAX_QUESTIONS = 50;
const ADS_URL = 'https://www.profitableratecpmnetwork.com/pvr8jzwqk?key=7672ccaa0ae9cd3ce4f5fd168d596fde';

// Leaderboard Storage & Rank Logic
let inMemoryLeaderboard = [];
const LEADERBOARD_KEY = 'quick_quiz_leaderboard';

function getRank(score, accuracy) {
  if (accuracy >= 90) {
    return { tier: 'Master', medal: '🥇', label: 'Master' };
  } else if (accuracy >= 70) {
    return { tier: 'Pro', medal: '🥈', label: 'Pro' };
  } else {
    return { tier: 'Novice', medal: '🥉', label: 'Novice' };
  }
}

function getLeaderboard() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const data = window.localStorage.getItem(LEADERBOARD_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Could not read leaderboard from localStorage', e);
    }
  }
  return inMemoryLeaderboard;
}

function saveLeaderboardRecord(record) {
  const rank = getRank(record.score, record.accuracy);
  const newEntry = {
    date: record.date || new Date().toISOString().split('T')[0],
    score: typeof record.score === 'number' ? record.score : 0,
    accuracy: typeof record.accuracy === 'number' ? record.accuracy : 0,
    timeSpent: typeof record.timeSpent === 'number' ? record.timeSpent : 0,
    streak: typeof record.streak === 'number' ? record.streak : 0,
    rank
  };
  const list = getLeaderboard().slice();
  list.push(newEntry);
  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.timeSpent - b.timeSpent;
  });
  const topRecords = list.slice(0, 5);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(topRecords));
    } catch (e) {
      console.warn('Could not save leaderboard to localStorage', e);
    }
  }
  inMemoryLeaderboard = topRecords;
  return topRecords;
}

function clearLeaderboard() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(LEADERBOARD_KEY);
    } catch (e) {
      console.warn('Could not clear leaderboard from localStorage', e);
    }
  }
  inMemoryLeaderboard = [];
  return [];
}

// ==========================================================================
// Web Audio API Synthesizer (0 external files)
// ==========================================================================
let audioCtx = null;
let soundEnabled = true;
const SOUND_STORAGE_KEY = 'quick_quiz_sound_enabled';

function isSoundEnabled() {
  return soundEnabled;
}

function initAudioContext() {
  if (audioCtx) return;
  const AudioContextClass = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));
  if (AudioContextClass) {
    try {
      audioCtx = new AudioContextClass();
    } catch (e) {
      console.warn('AudioContext not supported or blocked', e);
    }
  }
}

function playTone(freq, duration = 0.15, type = 'sine', gainVal = 0.1) {
  if (!soundEnabled) return;
  initAudioContext();
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Audio errors silently ignored
  }
}

function playCorrectSound() {
  if (!soundEnabled) return;
  playTone(523.25, 0.1, 'sine', 0.1); // C5
  setTimeout(() => playTone(659.25, 0.18, 'triangle', 0.1), 90); // E5
}

function playIncorrectSound() {
  if (!soundEnabled) return;
  playTone(220, 0.15, 'sawtooth', 0.08); // A3
  setTimeout(() => playTone(164.81, 0.22, 'sawtooth', 0.08), 110); // E3
}

function playStreakSound() {
  if (!soundEnabled) return;
  const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.16, 'triangle', 0.12), i * 70);
  });
}

function playCompletionFanfare() {
  if (!soundEnabled) return;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.22, 'sine', 0.14), i * 90);
  });
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
    } catch (e) {}
  }
  updateSoundButtonUI();
  return soundEnabled;
}

function updateSoundButtonUI() {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('btn-sound-toggle');
  if (btn) {
    btn.textContent = soundEnabled ? '🔊 Sound' : '🔇 Muted';
    btn.setAttribute('aria-pressed', String(soundEnabled));
    if (soundEnabled) {
      btn.classList.remove('muted');
    } else {
      btn.classList.add('muted');
    }
  }
}

function initSound() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(SOUND_STORAGE_KEY);
      if (stored !== null) {
        soundEnabled = stored === 'true';
      }
    } catch (e) {}
  }
  updateSoundButtonUI();
  if (typeof document !== 'undefined') {
    const btn = document.getElementById('btn-sound-toggle');
    if (btn && !btn._hasClickListener) {
      btn._hasClickListener = true;
      btn.addEventListener('click', () => {
        initAudioContext();
        toggleSound();
      });
    }
  }
}

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
    category: (data.category && typeof data.category === 'string' && data.category.trim().length > 0)
      ? data.category.trim()
      : 'General',
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
  leaderboardSaved: false,
  timerMode: 'per-question', // 'per-question' | 'total' | 'stopwatch'
  timerLimit: 30,           // seconds for per-question or total
  remainingSeconds: 30,
  lifelines: { fiftyFifty: true, skip: true },
  eliminatedOptions: [],
  activeCategory: 'All',
  topics: ['HTML', 'CSS', 'JavaScript']
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
  playIncorrectSound();

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
  state.eliminatedOptions = [];
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
  state.leaderboardSaved = false;
  state.remainingSeconds = state.timerLimit;
  state.eliminatedOptions = [];
  state.lifelines = { fiftyFifty: true, skip: true };
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
}

function useFiftyFifty() {
  if (!state.lifelines.fiftyFifty || state.isAnswered || state.isFinished || QUESTIONS.length === 0) {
    return null;
  }
  const currentQ = QUESTIONS[state.currentIndex];
  if (!currentQ) return null;
  const wrongIndices = [0, 1, 2, 3].filter(idx => idx !== currentQ.correctIndex);
  const eliminated = wrongIndices.slice(0, 2);
  state.lifelines.fiftyFifty = false;
  state.eliminatedOptions = eliminated;
  return eliminated;
}

function useSkip() {
  if (!state.lifelines.skip || state.isAnswered || state.isFinished || QUESTIONS.length === 0) {
    return false;
  }
  state.lifelines.skip = false;
  nextQuestion();
  return true;
}

function getFilteredQuestions(category) {
  const cat = category || state.activeCategory || 'All';
  if (!cat || cat.toLowerCase() === 'all') {
    return QUESTIONS;
  }
  return QUESTIONS.filter(q => (q.category || 'General').toLowerCase() === cat.toLowerCase());
}

function setCategoryFilter(category) {
  state.activeCategory = category || 'All';
  restartQuiz();
  return getFilteredQuestions(category);
}

// ==========================================================================
// Dynamic User-Managed Topics
// ==========================================================================
const DEFAULT_TOPICS = ['HTML', 'CSS', 'JavaScript'];
const TOPICS_STORAGE_KEY = 'quiz_topics';

function getStoredTopics() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(TOPICS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
  }
  return [...DEFAULT_TOPICS];
}

function getTopics() {
  if (!state.topics || !Array.isArray(state.topics)) {
    state.topics = getStoredTopics();
  }
  return state.topics;
}

function addTopic(topicName) {
  if (!topicName || typeof topicName !== 'string') return false;
  const trimmed = topicName.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase() === 'all') return false;

  const topics = getTopics();
  if (topics.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
    return false; // duplicate
  }

  topics.push(trimmed);
  state.topics = topics;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
    } catch (e) {}
  }
  renderCategoryFilters();
  updateTopicsDatalist();
  return true;
}

function deleteTopic(topicName) {
  if (!topicName || typeof topicName !== 'string') return false;
  const trimmed = topicName.trim();
  const topics = getTopics();
  const idx = topics.findIndex(t => t.toLowerCase() === trimmed.toLowerCase());
  if (idx === -1) return false;

  topics.splice(idx, 1);
  state.topics = topics;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
    } catch (e) {}
  }

  // Reassign any questions under this topic to 'General'
  let modified = false;
  QUESTIONS.forEach(q => {
    if (q.category && q.category.toLowerCase() === trimmed.toLowerCase()) {
      q.category = 'General';
      modified = true;
    }
  });
  if (modified) {
    MiniStore.save(QUESTIONS);
  }

  // If deleted topic was active, reset to 'All'
  if (state.activeCategory && state.activeCategory.toLowerCase() === trimmed.toLowerCase()) {
    setCategoryFilter('All');
  }

  renderCategoryFilters();
  updateTopicsDatalist();
  return true;
}

function updateTopicsDatalist() {
  if (typeof document === 'undefined') return;
  const datalist = document.getElementById('topics-datalist');
  if (!datalist) return;
  datalist.innerHTML = '';
  const topics = getTopics();
  topics.forEach(top => {
    const opt = document.createElement('option');
    opt.value = top;
    datalist.appendChild(opt);
  });
}

function renderCategoryFilters() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('category-filters');
  if (!container) return;

  const topics = getTopics();
  const active = state.activeCategory || 'All';

  let html = `
    <button class="category-pill ${active.toLowerCase() === 'all' ? 'active' : ''}" data-category="All" type="button">All Topics</button>
  `;

  topics.forEach(topic => {
    const isActive = active.toLowerCase() === topic.toLowerCase();
    html += `
      <div class="category-pill-wrap">
        <button class="category-pill ${isActive ? 'active' : ''}" data-category="${topic}" type="button">${topic}</button>
        <button class="btn-topic-delete" data-topic="${topic}" type="button" title="Delete topic ${topic}" aria-label="Delete topic ${topic}">✕</button>
      </div>
    `;
  });

  html += `
    <button id="btn-add-topic-pill" class="category-pill add-topic-pill" type="button" title="Add a new topic">➕ Topic</button>
  `;

  container.innerHTML = html;
}

// ==========================================================================
// Native Canvas Confetti Particle System (0 external dependencies)
// ==========================================================================
let confettiAnimationId = null;
let confettiParticles = [];

function triggerConfetti(particleCount = 70) {
  if (typeof document === 'undefined') return;
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = (typeof window !== 'undefined' && window.innerWidth) || 800;
  canvas.height = (typeof window !== 'undefined' && window.innerHeight) || 600;

  const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b'];

  for (let i = 0; i < particleCount; i++) {
    confettiParticles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 3 + (Math.random() - 0.5) * 50,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 1) * 16 - 4,
      size: Math.random() * 9 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.015 + 0.012,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12
    });
  }

  if (!confettiAnimationId && typeof requestAnimationFrame === 'function') {
    function animateConfetti() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = confettiParticles.length - 1; i >= 0; i--) {
        const p = confettiParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38; // gravity
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y > canvas.height) {
          confettiParticles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (confettiParticles.length > 0) {
        confettiAnimationId = requestAnimationFrame(animateConfetti);
      } else {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(confettiAnimationId);
        }
        confettiAnimationId = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    animateConfetti();
  }
}

// ==========================================================================
// Lifelines & Power-Ups Handlers
// ==========================================================================
function updateLifelinesUI() {
  if (typeof document === 'undefined') return;
  const btn5050 = document.getElementById('btn-lifeline-5050');
  const btnSkip = document.getElementById('btn-lifeline-skip');
  if (btn5050) {
    btn5050.disabled = !state.lifelines.fiftyFifty;
  }
  if (btnSkip) {
    btnSkip.disabled = !state.lifelines.skip;
  }
}

function handleFiftyFifty() {
  const eliminated = useFiftyFifty();
  if (!eliminated) return;
  updateLifelinesUI();
  if (typeof document !== 'undefined') {
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => {
      const idx = parseInt(btn.dataset.index, 10);
      if (eliminated.includes(idx)) {
        btn.classList.add('eliminated');
        btn.disabled = true;
      }
    });
  }
}

function handleSkip() {
  const success = useSkip();
  if (!success) return;
  updateLifelinesUI();
  renderAll();
}

// ==========================================================================
// Category Filtering Handlers
// ==========================================================================
function handleCategoryFilter(category) {
  setCategoryFilter(category);
  if (typeof document !== 'undefined') {
    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => {
      if (pill.dataset && pill.dataset.category) {
        if (pill.dataset.category.toLowerCase() === state.activeCategory.toLowerCase()) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      }
    });
  }
  renderAll();
}

function initCategoryFilters() {
  if (typeof document === 'undefined') return;
  const filterContainer = document.getElementById('category-filters');
  if (!filterContainer) return;

  renderCategoryFilters();

  if (!filterContainer._hasClickListener) {
    filterContainer._hasClickListener = true;
    filterContainer.addEventListener('click', (e) => {
      // Check if delete button clicked
      const delBtn = e.target.closest ? e.target.closest('.btn-topic-delete') : null;
      if (delBtn && delBtn.dataset && delBtn.dataset.topic) {
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        deleteTopic(delBtn.dataset.topic);
        return;
      }

      // Check if Add Topic button clicked
      const addBtn = e.target.closest ? e.target.closest('#btn-add-topic-pill') : null;
      if (addBtn) {
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        openTopicModal();
        return;
      }

      // Check if category pill clicked
      const pill = e.target.closest ? e.target.closest('.category-pill') : e.target;
      if (pill && pill.dataset && pill.dataset.category) {
        handleCategoryFilter(pill.dataset.category);
      }
    });
  }
}

// ==========================================================================
// Add Topic Mini Popup Modal Handlers
// ==========================================================================
function openTopicModal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('topic-modal');
  const input = document.getElementById('input-topic-name');
  const errorBox = document.getElementById('topic-modal-error');
  if (modal) {
    modal.classList.remove('hidden');
    if (input) {
      input.value = '';
      if (typeof input.focus === 'function') input.focus();
    }
    if (errorBox) {
      errorBox.classList.add('hidden');
      errorBox.textContent = '';
    }
  }
}

function closeTopicModal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('topic-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function initTopicModal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('topic-modal');
  const input = document.getElementById('input-topic-name');
  const errorBox = document.getElementById('topic-modal-error');
  const btnSave = document.getElementById('btn-save-topic');
  const btnCancel = document.getElementById('btn-cancel-topic');
  const btnClose = document.getElementById('btn-close-topic-modal');

  const handleSave = () => {
    if (!input) return;
    const name = (input.value || '').trim();
    if (!name) {
      if (errorBox) {
        errorBox.textContent = 'Please enter a topic name.';
        errorBox.classList.remove('hidden');
      }
      if (typeof input.focus === 'function') input.focus();
      return;
    }

    if (name.toLowerCase() === 'all') {
      if (errorBox) {
        errorBox.textContent = '"All" is a reserved topic name.';
        errorBox.classList.remove('hidden');
      }
      return;
    }

    const topics = getTopics();
    if (topics.some(t => t.toLowerCase() === name.toLowerCase())) {
      if (errorBox) {
        errorBox.textContent = `Topic "${name}" already exists.`;
        errorBox.classList.remove('hidden');
      }
      return;
    }

    const added = addTopic(name);
    if (added) {
      closeTopicModal();
    }
  };

  if (btnSave && !btnSave._hasListener) {
    btnSave._hasListener = true;
    btnSave.addEventListener('click', handleSave);
  }

  if (btnCancel && !btnCancel._hasListener) {
    btnCancel._hasListener = true;
    btnCancel.addEventListener('click', closeTopicModal);
  }

  if (btnClose && !btnClose._hasListener) {
    btnClose._hasListener = true;
    btnClose.addEventListener('click', closeTopicModal);
  }

  if (input && !input._hasListener) {
    input._hasListener = true;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        closeTopicModal();
      }
    });
  }

  if (modal && !modal._hasBackdropListener) {
    modal._hasBackdropListener = true;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeTopicModal();
      }
    });
  }
}

// ==========================================================================
// Post-Quiz Review / Answer Breakdown Modal Handlers
// ==========================================================================
function openReviewModal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('review-modal');
  const reviewList = document.getElementById('review-list');
  if (!modal || !reviewList) return;

  reviewList.innerHTML = '';
  const currentQs = QUESTIONS;

  state.answers.forEach((ans, idx) => {
    const q = currentQs.find(item => item.id === ans.questionId) || currentQs[idx] || { question: `Question ${idx + 1}`, options: [], correctIndex: 0, explanation: '' };
    const item = document.createElement('div');
    item.className = `review-item ${ans.isCorrect ? 'is-correct' : 'is-incorrect'}`;
    const badgeText = ans.isTimeout ? '⏰ Timed Out' : (ans.isCorrect ? '✓ Correct' : '✗ Incorrect');
    const badgeClass = ans.isCorrect ? 'correct' : 'incorrect';
    const chosenText = (ans.selectedIndex >= 0 && q.options && q.options[ans.selectedIndex]) ? q.options[ans.selectedIndex] : 'None / Skipped';
    const correctText = (q.options && q.options[q.correctIndex]) ? q.options[q.correctIndex] : 'N/A';

    item.innerHTML = `
      <div class="review-meta-row">
        <span class="category-card-badge">${q.category || 'Web Dev'}</span>
        <span class="review-badge ${badgeClass}">${badgeText}</span>
      </div>
      <h3 class="review-q-title">Q${idx + 1}: ${q.question}</h3>
      <p style="font-size: 0.82rem; margin: 4px 0 2px;">Your Answer: <strong>${chosenText}</strong></p>
      ${!ans.isCorrect ? `<p style="font-size: 0.82rem; margin: 0 0 4px; color: var(--color-success);">Correct Answer: <strong>${correctText}</strong></p>` : ''}
      <p class="review-explanation"><strong>Explanation:</strong> ${q.explanation || 'No explanation available.'}</p>
    `;
    reviewList.appendChild(item);
  });

  modal.classList.remove('hidden');
}

function closeReviewModal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('review-modal');
  if (modal) modal.classList.add('hidden');
}

function initReviewModal() {
  if (typeof document === 'undefined') return;
  const closeBtn = document.getElementById('btn-close-review');
  const footerCloseBtn = document.getElementById('btn-review-close-footer');
  if (closeBtn && !closeBtn._hasClickListener) {
    closeBtn._hasClickListener = true;
    closeBtn.addEventListener('click', closeReviewModal);
  }
  if (footerCloseBtn && !footerCloseBtn._hasClickListener) {
    footerCloseBtn._hasClickListener = true;
    footerCloseBtn.addEventListener('click', closeReviewModal);
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
    if (!state.leaderboardSaved) {
      state.leaderboardSaved = true;
      saveLeaderboardRecord({
        score: state.score,
        accuracy: accuracy,
        timeSpent: state.elapsedSeconds,
        streak: state.bestStreak,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      });
    }
    renderLeaderboard();
    playCompletionFanfare();
    triggerConfetti(85);

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
        <div class="completion-actions" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 16px;">
          <button id="btn-refresh-page" class="btn btn-refresh-page" type="button" title="Reload page to start 100% fresh">🔄 Refresh Page</button>
          <button id="btn-reset-quiz" class="btn btn-reset-quiz" type="button" title="Reset quiz questions and score in-place">🔁 Reset Quiz</button>
          <button id="btn-review-answers" class="btn btn-secondary" type="button" title="Review questions and explanations">📋 Review Answers</button>
        </div>
      </div>
    `;
    const refreshBtn = document.getElementById('btn-refresh-page');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', handleRefreshPage);
    }
    const resetBtn = document.getElementById('btn-reset-quiz') || document.getElementById('restart-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', handleRestart);
    }
    const reviewBtn = document.getElementById('btn-review-answers');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', openReviewModal);
    }
    return;
  }

  const currentQ = QUESTIONS[state.currentIndex];
  questionCard.innerHTML = `
    <div class="card-inner card-slide-in">
      <div id="flip-card-inner" class="flip-card-inner">
        <!-- Front Face: Question Prompt and Options -->
        <div class="flip-card-front">
          <div class="card-meta-bar" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span class="category-card-badge">${currentQ.category || 'Web Dev'}</span>
            <div id="lifelines-toolbar" class="lifelines-toolbar" aria-label="Quiz Lifelines">
              <span class="lifelines-label">Power-Ups:</span>
              <button id="btn-lifeline-5050" class="btn-lifeline" type="button" title="Eliminate 2 wrong answers (Once per quiz)">✂️ 50:50</button>
              <button id="btn-lifeline-skip" class="btn-lifeline" type="button" title="Skip this question without penalty (Once per quiz)">⏭️ Skip</button>
            </div>
          </div>
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
  const kbdHints = ['1', '2', '3', '4'];

  currentQ.options.forEach((optText, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.dataset.index = idx;
    if (state.eliminatedOptions && state.eliminatedOptions.includes(idx)) {
      btn.classList.add('eliminated');
      btn.disabled = true;
    }
    btn.innerHTML = `<span class="badge">${badges[idx]}</span> <span class="option-text"></span> <span class="kbd-hint">[${kbdHints[idx]}]</span>`;
    const textSpan = btn.querySelector ? btn.querySelector('.option-text') : null;
    if (textSpan) {
      textSpan.textContent = optText;
    }
    btn.addEventListener('click', () => handleOptionClick(idx));
    optionsContainer.appendChild(btn);
  });

  updateLifelinesUI();
  const btn5050 = document.getElementById('btn-lifeline-5050');
  if (btn5050) {
    btn5050.addEventListener('click', handleFiftyFifty);
  }
  const btnSkip = document.getElementById('btn-lifeline-skip');
  if (btnSkip) {
    btnSkip.addEventListener('click', handleSkip);
  }

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

function renderLeaderboard() {
  if (typeof document === 'undefined') return;
  const listContainer = document.getElementById('leaderboard-list');
  if (!listContainer) return;
  const records = getLeaderboard();
  if (!records || records.length === 0) {
    listContainer.innerHTML = '<p class="leaderboard-empty">No records yet. Complete a quiz to rank!</p>';
    return;
  }
  listContainer.innerHTML = '';
  records.forEach((rec, idx) => {
    const item = document.createElement('div');
    item.className = 'leaderboard-item';
    item.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span class="leaderboard-rank">${rec.rank ? rec.rank.medal : '🏅'}</span>
        <div class="leaderboard-info">
          <span class="leaderboard-score-line">#${idx + 1} • ${rec.score} pts</span>
          <span class="leaderboard-meta">${rec.accuracy}% acc • ${formatTime(rec.timeSpent)} • ${rec.date}</span>
        </div>
      </div>
      <span class="leaderboard-tier-badge">${rec.rank ? rec.rank.label : 'Ranked'}</span>
    `;
    listContainer.appendChild(item);
  });

  const clearBtn = document.getElementById('btn-clear-leaderboard');
  if (clearBtn && !clearBtn._hasClickListener) {
    clearBtn._hasClickListener = true;
    clearBtn.addEventListener('click', () => {
      clearLeaderboard();
      renderLeaderboard();
    });
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

  renderLeaderboard();
}

function handleKeyDown(e) {
  if (!e || !e.key) return;
  // Ignore keystrokes when user is typing into an input field or modal textarea
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
    return;
  }

  // Ignore if modal dialogs are active
  if (typeof document !== 'undefined') {
    const introModal = document.getElementById('intro-modal');
    if (introModal && !introModal.classList.contains('hidden')) return;
    const timerModal = document.getElementById('timer-settings-modal');
    if (timerModal && !timerModal.classList.contains('hidden')) return;
    const reviewModal = document.getElementById('review-modal');
    if (reviewModal && !reviewModal.classList.contains('hidden')) return;
    const topicModal = document.getElementById('topic-modal');
    if (topicModal && !topicModal.classList.contains('hidden')) return;
  }

  const key = e.key;

  // Answer hotkeys: 1-4 or A-D
  let optIndex = -1;
  if (key === '1' || key.toLowerCase() === 'a') optIndex = 0;
  else if (key === '2' || key.toLowerCase() === 'b') optIndex = 1;
  else if (key === '3' || key.toLowerCase() === 'c') optIndex = 2;
  else if (key === '4' || key.toLowerCase() === 'd') optIndex = 3;

  if (optIndex !== -1) {
    if (!state.isFinished && !state.isAnswered && QUESTIONS.length > 0) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      handleOptionClick(optIndex);
    }
    return;
  }

  // Advance or restart: Enter or Space
  if (key === 'Enter' || key === ' ') {
    if (state.isFinished) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      handleRestart();
    } else if (state.isAnswered) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      handleNextClick();
    }
  }
}

function renderAll() {
  if (typeof document === 'undefined') return;
  renderHeader();
  renderQuestion();
  renderScoreboard();
}

function handleOptionClick(idx) {
  if (state.isAnswered || state.isFinished) return;
  const res = selectOption(idx);
  if (!res) return;

  if (res.isCorrect) {
    playCorrectSound();
    if (state.streak >= 3) {
      playStreakSound();
      triggerConfetti(35);
    }
  } else {
    playIncorrectSound();
  }

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

function handleRefreshPage() {
  if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
    window.location.reload();
  } else {
    MiniStore.clear();
    restartQuiz();
    renderAll();
  }
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
  updateTopicsDatalist();

  if (form) {
    const correctSelect = document.getElementById('correct-opt-select');
    const radioInputs = form.querySelectorAll('input[name="correct-opt"]');

    // Sync select dropdown -> radio inputs
    if (correctSelect) {
      correctSelect.addEventListener('change', () => {
        const val = correctSelect.value;
        const targetRadio = form.querySelector(`input[name="correct-opt"][value="${val}"]`);
        if (targetRadio) {
          targetRadio.checked = true;
        }
      });
    }

    // Sync radio inputs -> select dropdown
    if (radioInputs && radioInputs.length > 0) {
      radioInputs.forEach(radio => {
        radio.addEventListener('change', () => {
          if (radio.checked && correctSelect) {
            correctSelect.value = radio.value;
          }
        });
      });
    }

    const handleAdd = (startNow) => {
      const qTextInput = document.getElementById('new-q-text');
      const opt0 = document.getElementById('new-opt-0');
      const opt1 = document.getElementById('new-opt-1');
      const opt2 = document.getElementById('new-opt-2');
      const opt3 = document.getElementById('new-opt-3');
      const expInput = document.getElementById('new-q-exp');
      const alertBox = document.getElementById('form-alert-msg');

      if (!qTextInput || !opt0 || !opt1 || !opt2 || !opt3) return;

      const qText = qTextInput.value.trim();
      const options = [opt0.value.trim(), opt1.value.trim(), opt2.value.trim(), opt3.value.trim()];

      // Get correctIndex from select dropdown or checked radio
      let correctIndex = 0;
      if (correctSelect && correctSelect.value !== '') {
        correctIndex = parseInt(correctSelect.value, 10);
      } else {
        const correctRadio = form.querySelector('input[name="correct-opt"]:checked');
        if (correctRadio) {
          correctIndex = parseInt(correctRadio.value, 10);
        }
      }

      const qCatInput = document.getElementById('new-q-cat');
      let category = (qCatInput && typeof qCatInput.value === 'string') ? qCatInput.value.trim() : '';
      if (!category) {
        category = 'General';
      } else {
        addTopic(category);
      }

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
        category,
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
      if (qCatInput) {
        qCatInput.value = '';
      }
      if (correctSelect) {
        correctSelect.value = '0';
      }
      const defaultRadio = form.querySelector('input[name="correct-opt"][value="0"]');
      if (defaultRadio) {
        defaultRadio.checked = true;
      }
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
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        handleAdd(false);
      });
    }

    const btnAddStart = document.getElementById('btn-add-start-quiz');
    if (btnAddStart) {
      btnAddStart.addEventListener('click', (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
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
  initSound();
  initCustomQuestionForm();
  initIntroModal();
  initTimerSettings();
  initCategoryFilters();
  initTopicModal();
  initReviewModal();
  startTimer();
  renderAll();

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }
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
    renderLeaderboard,
    renderAll,
    handleOptionClick,
    handleNextClick,
    handleRestart,
    handleRefreshPage,
    handleKeyDown,
    setTimerConfig,
    tickTimer,
    handleTimeout,
    startTimer,
    getStoredTheme,
    applyTheme,
    toggleTheme,
    initTheme,
    toggleSound,
    isSoundEnabled,
    initSound,
    ADS_URL,
    getRank,
    getLeaderboard,
    saveLeaderboardRecord,
    clearLeaderboard,
    useFiftyFifty,
    useSkip,
    getFilteredQuestions,
    setCategoryFilter,
    triggerConfetti,
    handleFiftyFifty,
    handleSkip,
    updateLifelinesUI,
    handleCategoryFilter,
    openReviewModal,
    closeReviewModal,
    getTopics,
    addTopic,
    deleteTopic,
    renderCategoryFilters,
    openTopicModal,
    closeTopicModal,
    initTopicModal,
    initCustomQuestionForm,
    initApp
  };
}



