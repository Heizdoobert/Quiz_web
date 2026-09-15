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
  QUESTIONS,
  state
} = require(path.resolve(__dirname, '../script.js'));

assert.strictEqual(typeof renderHeader, 'function');
assert.strictEqual(typeof renderQuestion, 'function');
assert.strictEqual(typeof renderScoreboard, 'function');
assert.strictEqual(typeof renderAll, 'function');

// 1. Bounds check on selectOption(index)
restartQuiz();
assert.strictEqual(selectOption(-1), null, 'Negative index must return null');
assert.strictEqual(selectOption(4), null, 'Index >= options.length must return null');
assert.strictEqual(selectOption(99), null, 'Large index must return null');
assert.strictEqual(selectOption('0'), null, 'Non-number index must return null');
assert.strictEqual(selectOption(NaN), null, 'NaN index must return null');
assert.strictEqual(selectOption(1.5), null, 'Non-integer index must return null');
assert.strictEqual(state.isAnswered, false, 'State should not be answered');
assert.strictEqual(state.answers.length, 0, 'No answer should be recorded');

// 2. Simulated DOM tests
class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName;
    this.id = id;
    this.className = '';
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
      if (!elementsById.has(id)) {
        elementsById.set(id, new MockElement('div', id));
      }
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
  'best-streak-display', 'accuracy-display', 'history-list'
];
ids.forEach(id => getOrCreateElement(id));

global.document = {
  getElementById: (id) => elementsById.get(id) || null,
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

// Test renderHeader
restartQuiz();
state.elapsedSeconds = 65;
renderHeader();
assert.strictEqual(getOrCreateElement('timer-display').textContent, '01:05');
assert.strictEqual(getOrCreateElement('progress-text').textContent, 'Question 1 of 6');
assert.strictEqual(getOrCreateElement('progress-bar-fill').style.width, '17%');

// Test renderQuestion
renderQuestion();
const optContainer = getOrCreateElement('options-container');
assert.strictEqual(optContainer.children.length, 4);
assert.strictEqual(optContainer.children[0].dataset.index, 0);

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

// Test handleNextClick
handleNextClick();
assert.strictEqual(state.currentIndex, 1);
assert.strictEqual(state.isAnswered, false);
assert.strictEqual(getOrCreateElement('progress-text').textContent, 'Question 2 of 6');

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

// Clean up timer interval
if (state.timerIntervalId) {
  clearInterval(state.timerIntervalId);
  state.timerIntervalId = null;
}

console.log('All Component Rendering tests passed!');

