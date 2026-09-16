const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Verify script.js has the render functions and DOM event wiring
const scriptPath = fs.existsSync('script.js') ? 'script.js' : path.resolve(__dirname, '../script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

assert.ok(scriptContent.includes('function renderHeader'), 'Must define renderHeader');
assert.ok(scriptContent.includes('function renderQuestion'), 'Must define renderQuestion');
assert.ok(scriptContent.includes('function renderScoreboard'), 'Must define renderScoreboard');
assert.ok(scriptContent.includes('function renderAll'), 'Must define renderAll');
assert.ok(scriptContent.includes('document.addEventListener'), 'Must bind DOM events');
assert.ok(scriptContent.includes("document.getElementById('question-text').textContent = currentQ.question"), 'Must set question-text via textContent');

// Execute simulated DOM tests
const {
  renderHeader,
  renderQuestion,
  renderScoreboard,
  renderAll,
  handleOptionClick,
  handleNextClick,
  handleRestart,
  selectOption,
  restartQuiz,
  loadSampleQuestions,
  QUESTIONS,
  state
} = require(path.resolve(__dirname, '../script.js'));

assert.strictEqual(typeof renderHeader, 'function');
assert.strictEqual(typeof renderQuestion, 'function');
assert.strictEqual(typeof renderScoreboard, 'function');
assert.strictEqual(typeof renderAll, 'function');
assert.strictEqual(typeof loadSampleQuestions, 'function');

// 2. Simulated DOM tests
class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName;
    this.id = id;
    this.className = '';
    this.attributes = {};
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(n => classes.add(n)),
      remove: (...names) => names.forEach(n => classes.delete(n)),
      contains: (n) => classes.has(n),
      toString: () => Array.from(classes).join(' ')
    };
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.textContent = '';
    this._innerHTML = '';
    this.listeners = {};
    this.disabled = false;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  click() {
    if (this.listeners['click']) {
      this.listeners['click'].forEach(fn => fn());
    }
  }
  focus() {}
  appendChild(child) {
    this.children.push(child);
  }
  querySelector(selector) {
    for (const child of this.children) {
      if (selector.startsWith('.') && child.classList.contains(selector.slice(1))) {
        return child;
      }
      if (selector.startsWith('#') && child.id === selector.slice(1)) {
        return child;
      }
      if (child.tagName.toLowerCase() === selector.toLowerCase()) {
        return child;
      }
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
    // Auto-register elements defined in innerHTML templates
    const idMatches = [...val.matchAll(/id="([^"]+)"/g)];
    idMatches.forEach(m => {
      const id = m[1];
      const el = getOrCreateElement(id);
      el.children = [];
      el.textContent = '';
      el._innerHTML = '';
    });

    // Parse simple child spans or elements
    const tagMatches = [...val.matchAll(/<([a-z0-9]+)([^>]*)>(.*?)<\/\1>/gi)];
    tagMatches.forEach(m => {
      const tag = m[1];
      const attrs = m[2];
      const content = m[3];
      const el = new MockElement(tag);
      const classMatch = attrs.match(/class="([^"]+)"/);
      if (classMatch) {
        classMatch[1].split(/\s+/).forEach(c => el.classList.add(c));
      }
      el.textContent = content;
      this.children.push(el);
    });
  }
}

const elementsById = new Map();
function getOrCreateElement(id, tagName = 'div') {
  if (!elementsById.has(id)) {
    elementsById.set(id, new MockElement(tagName, id));
  }
  return elementsById.get(id);
}

// Pre-create initial elements from index.html
const ids = [
  'quiz-header', 'timer-display', 'progress-text', 'progress-bar-fill',
  'quiz-card', 'options-container', 'feedback-container', 'feedback-result',
  'feedback-explanation', 'next-btn', 'score-display', 'streak-display',
  'best-streak-display', 'accuracy-display', 'history-list', 'progress-track'
];
ids.forEach(id => getOrCreateElement(id));

const progressTrack = getOrCreateElement('progress-track');
progressTrack.classList.add('progress-track');
progressTrack.setAttribute('aria-valuenow', '1');

global.document = {
  getElementById: (id) => elementsById.get(id) || null,
  querySelector: (selector) => {
    if (selector === '.progress-track') {
      return elementsById.get('progress-track') || null;
    }
    return null;
  },
  querySelectorAll: (selector) => {
    if (selector === '.option-btn') {
      const optContainer = elementsById.get('options-container');
      return optContainer ? optContainer.children : [];
    }
    return [];
  },
  createElement: (tagName) => new MockElement(tagName),
  addEventListener: () => {}
};

// 1. Verify blank state initially
assert.strictEqual(QUESTIONS.length, 0, 'QUESTIONS should start blank');
restartQuiz();
renderHeader();
assert.strictEqual(getOrCreateElement('progress-text').textContent, 'Question 0 of 0 (Add a question to start)');
assert.strictEqual(getOrCreateElement('progress-bar-fill').style.width, '0%');
renderQuestion();
assert.ok(getOrCreateElement('quiz-card').innerHTML.includes('welcome-overlay'), 'Quiz card must show welcome overlay when empty');
assert.ok(getOrCreateElement('quiz-card').innerHTML.includes('btn-welcome-add'), 'Must have btn-welcome-add button');

// Populate questions for quiz gameplay tests
loadSampleQuestions();
assert.strictEqual(QUESTIONS.length, 6, 'loadSampleQuestions should populate 6 sample questions');

// 2. Bounds check on selectOption(index) with active questions
restartQuiz();
assert.strictEqual(selectOption(-1), null, 'Negative index must return null');
assert.strictEqual(selectOption(4), null, 'Index >= options.length must return null');
assert.strictEqual(selectOption(99), null, 'Large index must return null');
assert.strictEqual(selectOption('0'), null, 'Non-number index must return null');
assert.strictEqual(selectOption(NaN), null, 'NaN index must return null');
assert.strictEqual(selectOption(1.5), null, 'Non-integer index must return null');
assert.strictEqual(state.isAnswered, false, 'State should not be answered');
assert.strictEqual(state.answers.length, 0, 'No answer should be recorded');

// 3. Test renderHeader & aria-valuenow with active questions
restartQuiz();
state.elapsedSeconds = 65;
renderHeader();
assert.strictEqual(getOrCreateElement('timer-display').textContent, '01:05');
assert.strictEqual(getOrCreateElement('progress-text').textContent, 'Question 1 of 6');
assert.strictEqual(getOrCreateElement('progress-bar-fill').style.width, '17%');
assert.strictEqual(progressTrack.getAttribute('aria-valuenow'), '1', 'aria-valuenow should be 1 on Q1');
assert.strictEqual(progressTrack.getAttribute('aria-valuemax'), String(QUESTIONS.length), 'aria-valuemax should be updated on Q1');

// Test renderQuestion with HTML tags in options (Question 1)
renderQuestion();
const questionHeading = getOrCreateElement('question-text');
assert.strictEqual(questionHeading.textContent, QUESTIONS[0].question, 'Question heading textContent should match question text');

// Verify question text containing HTML tags is rendered safely as literal textContent
const origQ = QUESTIONS[0].question;
QUESTIONS[0].question = 'What do <section> and <article> elements represent?';
renderQuestion();
assert.strictEqual(getOrCreateElement('question-text').textContent, 'What do <section> and <article> elements represent?');
assert.ok(
  !getOrCreateElement('quiz-card').innerHTML.includes('class="question-heading">What do'),
  'Question text must not be raw interpolated into innerHTML'
);
QUESTIONS[0].question = origQ;
renderQuestion();
const optContainer = getOrCreateElement('options-container');
assert.strictEqual(optContainer.children.length, 4);
assert.strictEqual(optContainer.children[0].dataset.index, 0);

// Verify Question 1 options preserve literal HTML markup without rendering as DOM tags
const expectedOptsQ1 = ['<link>', '<style>', '<css>', '<stylesheet>'];
expectedOptsQ1.forEach((expectedText, i) => {
  const btn = optContainer.children[i];
  const textSpan = btn.querySelector('.option-text');
  assert.ok(textSpan, `Button ${i} must have .option-text element`);
  assert.strictEqual(textSpan.textContent, expectedText, `Option ${i} textContent must preserve literal text "${expectedText}"`);
});

// Test handleOptionClick with correct choice
const correctIdx = QUESTIONS[0].correctIndex;
handleOptionClick(correctIdx);
assert.strictEqual(state.isAnswered, true);
assert.strictEqual(state.score, 100);
assert.ok(optContainer.children[correctIdx].classList.contains('correct'));
assert.strictEqual(getOrCreateElement('feedback-container').classList.contains('hidden'), false);
assert.strictEqual(getOrCreateElement('next-btn').classList.contains('hidden'), false);

// Test renderScoreboard
renderScoreboard();
assert.strictEqual(getOrCreateElement('score-display').textContent, 100);
assert.strictEqual(getOrCreateElement('streak-display').textContent, 1);
assert.strictEqual(getOrCreateElement('accuracy-display').textContent, '100%');
const historyList = getOrCreateElement('history-list');
assert.strictEqual(historyList.children.length, 1);

// Test handleNextClick and aria-valuenow update
handleNextClick();
assert.strictEqual(state.currentIndex, 1);
assert.strictEqual(state.isAnswered, false);
assert.strictEqual(getOrCreateElement('progress-text').textContent, 'Question 2 of 6');
assert.strictEqual(progressTrack.getAttribute('aria-valuenow'), '2', 'aria-valuenow should be 2 on Q2');
assert.strictEqual(progressTrack.getAttribute('aria-valuemax'), String(QUESTIONS.length), 'aria-valuemax should match QUESTIONS.length on Q2');

// Verify Question 4 options (which contain <section>, <div>, <article>, <main>)
state.currentIndex = 3;
state.isAnswered = false;
renderQuestion();
assert.strictEqual(getOrCreateElement('question-text').textContent, QUESTIONS[3].question, 'Question 4 heading textContent should match');
const expectedOptsQ4 = ['<section>', '<div>', '<article>', '<main>'];
expectedOptsQ4.forEach((expectedText, i) => {
  const btn = optContainer.children[i];
  const textSpan = btn.querySelector('.option-text');
  assert.ok(textSpan, `Button ${i} on Q4 must have .option-text element`);
  assert.strictEqual(textSpan.textContent, expectedText, `Option ${i} textContent must preserve literal text "${expectedText}"`);
});

// Test renderAll with quiz finished
state.currentIndex = QUESTIONS.length - 1;
state.isFinished = true;
renderAll();
assert.strictEqual(getOrCreateElement('progress-text').textContent, 'Quiz Complete!');
assert.strictEqual(getOrCreateElement('progress-bar-fill').style.width, '100%');
assert.ok(getOrCreateElement('quiz-card').innerHTML.includes('completion-summary'));

// Test handleRestart
handleRestart();
assert.strictEqual(state.currentIndex, 0);
assert.strictEqual(state.score, 0);
assert.strictEqual(state.isFinished, false);
assert.strictEqual(getOrCreateElement('progress-text').textContent, 'Question 1 of 6');
assert.strictEqual(progressTrack.getAttribute('aria-valuenow'), '1', 'aria-valuenow should reset to 1');
assert.strictEqual(progressTrack.getAttribute('aria-valuemax'), String(QUESTIONS.length), 'aria-valuemax should reset to QUESTIONS.length');

// Clean up timer interval
if (state.timerIntervalId) {
  clearInterval(state.timerIntervalId);
  state.timerIntervalId = null;
}

console.log('All Component Rendering tests passed!');
