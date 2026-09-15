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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    QUESTIONS,
    state,
    formatTime,
    calcAccuracy,
    selectOption,
    nextQuestion,
    restartQuiz
  };
}
