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
  flipCard,
  setTimerConfig,
  getStoredTheme,
  applyTheme,
  toggleTheme,
  initTheme,
  ADS_URL,
  QUESTIONS,
  state
} = require(path.resolve(__dirname, '../script.js'));

assert.strictEqual(typeof renderHeader, 'function');
assert.strictEqual(typeof renderQuestion, 'function');
assert.strictEqual(typeof renderScoreboard, 'function');
assert.strictEqual(typeof renderAll, 'function');
assert.strictEqual(typeof loadSampleQuestions, 'function');
assert.strictEqual(typeof flipCard, 'function');

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
    this.value = '';
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatchEvent(event) {
    const type = typeof event === 'string' ? event : event.type;
    if (this.listeners[type]) {
      this.listeners[type].forEach(fn => fn(event));
    }
  }
  click() {
    if (this.listeners['click']) {
      const evt = { preventDefault: () => {} };
      this.listeners['click'].forEach(fn => fn(evt));
    }
  }
  focus() {}
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
  }
  closest(selector) {
    let curr = this;
    while (curr) {
      if (selector.startsWith('.') && curr.classList.contains(selector.slice(1))) return curr;
      if (selector.startsWith('#') && curr.id === selector.slice(1)) return curr;
      if (curr.tagName && curr.tagName.toLowerCase() === selector.toLowerCase()) return curr;
      curr = curr.parentNode;
    }
    return null;
  }
  querySelectorAll(selector) {
    const results = [];
    const matchesSelector = (el, sel) => {
      if (sel.startsWith('.') && el.classList.contains(sel.slice(1))) return true;
      if (sel.startsWith('#') && el.id === sel.slice(1)) return true;
      if (el.tagName.toLowerCase() === sel.toLowerCase()) return true;
      if (sel.includes('[') || sel.includes(':checked')) {
        const tag = sel.match(/^([a-z0-9]+)/i);
        if (tag && el.tagName.toLowerCase() !== tag[1].toLowerCase()) return false;
        const nameM = sel.match(/\[name="([^"]+)"\]/);
        if (nameM && (!el.attributes || el.attributes['name'] !== nameM[1])) return false;
        const valM = sel.match(/\[value="([^"]+)"\]/);
        if (valM && (!el.attributes || el.attributes['value'] !== valM[1])) return false;
        if (sel.includes(':checked') && !el.checked) return false;
        return true;
      }
      return false;
    };
    const walk = (node) => {
      for (const child of node.children) {
        if (matchesSelector(child, selector)) {
          results.push(child);
        }
        walk(child);
      }
    };
    walk(this);
    return results;
  }
  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }
  get innerHTML() {
    if (this._innerHTML) return this._innerHTML;
    if (this.children.length > 0) {
      return this.children.map(c => c.innerHTML).join('');
    }
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
    const tagMatches = [...val.matchAll(/<([a-z0-9]+)([^>]*)>(.*?)<\/\1>/gis)];
    tagMatches.forEach(m => {
      const tag = m[1];
      const attrs = m[2];
      const content = m[3];
      const el = new MockElement(tag);
      const classMatch = attrs.match(/class="([^"]+)"/);
      if (classMatch) {
        classMatch[1].split(/\s+/).forEach(c => el.classList.add(c));
      }
      const dataMatches = [...attrs.matchAll(/data-([a-z0-9_-]+)="([^"]*)"/gi)];
      dataMatches.forEach(dm => {
        el.dataset[dm[1]] = dm[2];
      });
      if (content.includes('<')) {
        el.innerHTML = content;
      } else {
        el.textContent = content;
      }
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
  'feedback-explanation', 'feedback-correct-answer', 'next-btn', 'score-display', 'streak-display',
  'best-streak-display', 'accuracy-display', 'history-list', 'progress-track', 'flip-card-inner',
  'btn-theme-toggle', 'btn-sound-toggle', 'quiz-leaderboard', 'leaderboard-list', 'btn-clear-leaderboard',
  'confetti-canvas', 'category-filters', 'lifelines-toolbar', 'btn-lifeline-5050', 'btn-lifeline-skip',
  'review-modal', 'btn-close-review', 'review-list', 'btn-review-answers',
  'btn-refresh-page', 'btn-reset-quiz', 'correct-opt-select',
  'new-q-cat', 'topics-datalist', 'btn-add-topic-pill',
  'topic-modal', 'input-topic-name', 'topic-modal-error', 'btn-save-topic', 'btn-cancel-topic', 'btn-close-topic-modal',
  'btn-card-timer-settings', 'card-timer-badge'
];
ids.forEach(id => getOrCreateElement(id));

getOrCreateElement('topic-modal').classList.add('hidden');
getOrCreateElement('review-modal').classList.add('hidden');

const progressTrack = getOrCreateElement('progress-track');
progressTrack.classList.add('progress-track');
progressTrack.setAttribute('aria-valuenow', '1');

const docElement = new MockElement('html');

global.document = {
  documentElement: docElement,
  getElementById: (id) => elementsById.get(id) || null,
  querySelector: (selector) => {
    if (selector === '.progress-track') {
      return elementsById.get('progress-track') || null;
    }
    if (selector === '.card-timer-badge' || selector === '#card-timer-badge') {
      return elementsById.get('card-timer-badge') || null;
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
setTimerConfig('stopwatch');
state.elapsedSeconds = 65;
renderHeader();
assert.strictEqual(getOrCreateElement('timer-display').textContent, '00:01:05');
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
assert.strictEqual(getOrCreateElement('flip-card-inner').classList.contains('is-flipped'), true, 'Card must flip to reveal answer');
assert.ok(getOrCreateElement('feedback-correct-answer').textContent.includes('<link>'), 'Feedback must show correct answer on flip side');

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
assert.strictEqual(getOrCreateElement('flip-card-inner').classList.contains('is-flipped'), false, 'Card must flip back to front on next question');
assert.strictEqual(getOrCreateElement('progress-text').textContent, 'Question 2 of 6');
assert.strictEqual(progressTrack.getAttribute('aria-valuenow'), '2', 'aria-valuenow should be 2 on Q2');
assert.strictEqual(progressTrack.getAttribute('aria-valuemax'), String(QUESTIONS.length), 'aria-valuemax should match QUESTIONS.length on Q2');

// Test timer warning class rendering when time is <= 5s
setTimerConfig('per-question', 30);
state.remainingSeconds = 4;
renderHeader();
assert.strictEqual(getOrCreateElement('timer-display').textContent, '00:00:04');
assert.strictEqual(getOrCreateElement('timer-display').classList.contains('timer-warning'), true, 'Timer must show warning class when <= 5s');

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
assert.ok(getOrCreateElement('quiz-card').innerHTML.includes('cat-clapping-wrapper'), 'Completion screen must render cat-clapping-wrapper');

// Test handleRestart
handleRestart();
assert.strictEqual(state.currentIndex, 0);
assert.strictEqual(state.score, 0);
assert.strictEqual(state.isFinished, false);
assert.strictEqual(getOrCreateElement('progress-text').textContent, 'Question 1 of 6');
assert.strictEqual(progressTrack.getAttribute('aria-valuenow'), '1', 'aria-valuenow should reset to 1');
assert.strictEqual(progressTrack.getAttribute('aria-valuemax'), String(QUESTIONS.length), 'aria-valuemax should reset to QUESTIONS.length');

// Test Dark & Light theme toggling
initTheme();
const themeBtn = getOrCreateElement('btn-theme-toggle');
assert.strictEqual(docElement.getAttribute('data-theme'), null, 'Default theme should not set data-theme=light');
assert.strictEqual(themeBtn.textContent, '🌙 Dark');

// Toggle to light mode
const t1 = toggleTheme();
assert.strictEqual(t1, 'light');
assert.strictEqual(docElement.getAttribute('data-theme'), 'light');
assert.strictEqual(themeBtn.textContent, '☀️ Light');

// Toggle back to dark mode
const t2 = toggleTheme();
assert.strictEqual(t2, 'dark');
assert.strictEqual(docElement.getAttribute('data-theme'), null);
assert.strictEqual(themeBtn.textContent, '🌙 Dark');

// Check ADS_URL
// Check Sound Toggle
const { toggleSound, isSoundEnabled, initSound, handleKeyDown, renderLeaderboard } = require(path.resolve(__dirname, '../script.js'));
assert.strictEqual(typeof toggleSound, 'function', 'toggleSound must be a function');
assert.strictEqual(typeof isSoundEnabled, 'function', 'isSoundEnabled must be a function');
assert.strictEqual(typeof initSound, 'function', 'initSound must be a function');
assert.strictEqual(typeof handleKeyDown, 'function', 'handleKeyDown must be a function');
assert.strictEqual(typeof renderLeaderboard, 'function', 'renderLeaderboard must be a function');

// Test Sound initialization and toggle
initSound();
const soundBtn = getOrCreateElement('btn-sound-toggle');
assert.strictEqual(isSoundEnabled(), true, 'Sound should be enabled by default');
assert.ok(soundBtn.textContent.includes('🔊'), 'Sound button should display 🔊 when enabled');

toggleSound();
assert.strictEqual(isSoundEnabled(), false, 'Sound should be disabled after toggle');
assert.ok(soundBtn.textContent.includes('🔇'), 'Sound button should display 🔇 when muted');

toggleSound();
assert.strictEqual(isSoundEnabled(), true, 'Sound should be re-enabled after second toggle');

// Test Keyboard navigation
restartQuiz();
renderAll();
// Option buttons must contain .kbd-hint badges
const opt0 = getOrCreateElement('options-container').children[0];
assert.ok(opt0.innerHTML.includes('kbd-hint'), 'Option buttons must render .kbd-hint badge');

// Simulate keydown '2' (selects option 1)
handleKeyDown({ key: '2', target: { tagName: 'BODY' }, preventDefault: () => {} });
assert.strictEqual(state.isAnswered, true, 'Pressing 2 should select option');
assert.strictEqual(state.answers.length, 1);

// Simulate keydown 'Enter' when answered -> should advance to next question
handleKeyDown({ key: 'Enter', target: { tagName: 'BODY' }, preventDefault: () => {} });
assert.strictEqual(state.currentIndex, 1, 'Pressing Enter when answered should advance to next question');

// Simulate keydown inside an INPUT field -> should be ignored
handleKeyDown({ key: '1', target: { tagName: 'INPUT' }, preventDefault: () => {} });
assert.strictEqual(state.isAnswered, false, 'Pressing keys inside input field must be ignored');

// Test Leaderboard rendering
renderLeaderboard();
const lbList = getOrCreateElement('leaderboard-list');
assert.ok(lbList.innerHTML.includes('leaderboard-item') || lbList.children.length > 0, 'Leaderboard list should render records');

// 16. Test Confetti, Lifelines, Category Filters, and Review Modal
const {
  triggerConfetti,
  handleFiftyFifty,
  handleSkip,
  handleCategoryFilter,
  openReviewModal,
  closeReviewModal
} = require(path.resolve(__dirname, '../script.js'));

assert.strictEqual(typeof triggerConfetti, 'function', 'triggerConfetti must be a function');
assert.strictEqual(typeof handleFiftyFifty, 'function', 'handleFiftyFifty must be a function');
assert.strictEqual(typeof handleSkip, 'function', 'handleSkip must be a function');
assert.strictEqual(typeof handleCategoryFilter, 'function', 'handleCategoryFilter must be a function');
assert.strictEqual(typeof openReviewModal, 'function', 'openReviewModal must be a function');
assert.strictEqual(typeof closeReviewModal, 'function', 'closeReviewModal must be a function');

// Test triggerConfetti does not throw in headless / node environment
assert.doesNotThrow(() => triggerConfetti());

// Test 50:50 Lifeline DOM handling
restartQuiz();
renderAll();
const btn5050 = getOrCreateElement('btn-lifeline-5050');
handleFiftyFifty();
assert.strictEqual(btn5050.disabled, true, '50:50 button should be disabled after use');
const testOptContainer = getOrCreateElement('options-container');
const eliminatedCount = testOptContainer.children.filter(btn => btn.classList.contains('eliminated')).length;
assert.strictEqual(eliminatedCount, 2, '2 options should have .eliminated class');

// Test Skip Lifeline DOM handling
const btnSkip = getOrCreateElement('btn-lifeline-skip');
const idxBeforeSkip = state.currentIndex;
handleSkip();
assert.strictEqual(btnSkip.disabled, true, 'Skip button should be disabled after use');
assert.strictEqual(state.currentIndex, idxBeforeSkip + 1, 'Skip should advance to next question');

// Test Category Filtering
handleCategoryFilter('CSS');
assert.strictEqual(state.activeCategory, 'CSS');
assert.strictEqual(state.currentIndex, 0);

// Test Review Modal
selectOption(0);
openReviewModal();
const reviewModal = getOrCreateElement('review-modal');
assert.strictEqual(reviewModal.classList.contains('hidden'), false, 'openReviewModal should show modal');
const reviewList = getOrCreateElement('review-list');
assert.ok(reviewList.children.length > 0, 'review-list should render answered questions');

closeReviewModal();
assert.strictEqual(reviewModal.classList.contains('hidden'), true, 'closeReviewModal should hide modal');

// 17. Test Fresh Reload and Reset Quiz on Completion Screen
const { handleRefreshPage } = require(path.resolve(__dirname, '../script.js'));
assert.strictEqual(typeof handleRefreshPage, 'function', 'handleRefreshPage must be a function');

// Finish quiz and verify completion screen contains both Fresh and Reset buttons
state.currentIndex = QUESTIONS.length - 1;
state.isFinished = true;
renderQuestion();
const completionCard = getOrCreateElement('quiz-card');
assert.ok(completionCard.innerHTML.includes('id="btn-refresh-page"'), 'Completion screen must render Fresh Reload button (#btn-refresh-page)');
assert.ok(completionCard.innerHTML.includes('id="btn-reset-quiz"') || completionCard.innerHTML.includes('id="restart-btn"'), 'Completion screen must render Reset Quiz button');

// Verify user cannot re-question or answer after finish
const answersLenBefore = state.answers.length;
handleOptionClick(0);
assert.strictEqual(state.answers.length, answersLenBefore, 'User cannot answer questions when quiz is finished');

// Verify handleRefreshPage triggers window.location.reload
let reloaded = false;
global.window = global.window || {};
global.window.location = {
  reload: () => { reloaded = true; }
};
handleRefreshPage();
assert.strictEqual(reloaded, true, 'handleRefreshPage should call window.location.reload()');

// 18. Test Custom Question Form with Correct Answer Select Dropdown
const { initCustomQuestionForm } = require(path.resolve(__dirname, '../script.js'));
assert.strictEqual(typeof initCustomQuestionForm, 'function', 'initCustomQuestionForm must be a function');

const formSection = getOrCreateElement('custom-question-section');
const addForm = getOrCreateElement('add-question-form', 'form');
const correctSelect = getOrCreateElement('correct-opt-select', 'select');
correctSelect.value = '0';

// Setup radio buttons inside form
const radios = [];
for (let i = 0; i < 4; i++) {
  const radio = new MockElement('input');
  radio.setAttribute('name', 'correct-opt');
  radio.setAttribute('value', String(i));
  radio.value = String(i);
  radio.checked = (i === 0);
  radios.push(radio);
  addForm.appendChild(radio);
}

// Add text inputs
const qInput = getOrCreateElement('new-q-text', 'input');
const testOpt0 = getOrCreateElement('new-opt-0', 'input');
const testOpt1 = getOrCreateElement('new-opt-1', 'input');
const testOpt2 = getOrCreateElement('new-opt-2', 'input');
const testOpt3 = getOrCreateElement('new-opt-3', 'input');
const btnAddQ = getOrCreateElement('btn-add-question', 'button');

addForm.appendChild(correctSelect);
addForm.reset = function() {
  correctSelect.value = '0';
  radios.forEach((r, idx) => { r.checked = (idx === 0); });
  qInput.value = '';
  testOpt0.value = ''; testOpt1.value = ''; testOpt2.value = ''; testOpt3.value = '';
};

initCustomQuestionForm();

// Test select dropdown changes -> sync to radio
correctSelect.value = '2';
correctSelect.dispatchEvent('change');
assert.strictEqual(radios[2].checked, true, 'Changing select dropdown should check corresponding radio button');

// Test radio changes -> sync to select dropdown
radios[1].checked = true;
radios[1].dispatchEvent('change');
assert.strictEqual(correctSelect.value, '1', 'Checking radio button should update select dropdown value');

// Test submitting custom question with correctIndex from select dropdown
correctSelect.value = '3';
radios[3].checked = true;
qInput.value = 'What does DOM stand for?';
testOpt0.value = 'Document Object Model';
testOpt1.value = 'Data Object Mode';
testOpt2.value = 'Digital Order Map';
testOpt3.value = 'Direct Object Method';

const countBefore = QUESTIONS.length;
btnAddQ.click();
assert.strictEqual(QUESTIONS.length, countBefore + 1, 'Custom question should be added to QUESTIONS');
const added = QUESTIONS[QUESTIONS.length - 1];
assert.strictEqual(added.question, 'What does DOM stand for?');
assert.strictEqual(added.correctIndex, 3, 'Added question should have correctIndex matching selected option 3');

// 19. Test Dynamic Topic Management (Rendering, Add Topic, Delete Topic via mini button)
const { getTopics, addTopic, deleteTopic, renderCategoryFilters } = require(path.resolve(__dirname, '../script.js'));
assert.strictEqual(typeof getTopics, 'function', 'getTopics must be a function');
assert.strictEqual(typeof addTopic, 'function', 'addTopic must be a function');
assert.strictEqual(typeof deleteTopic, 'function', 'deleteTopic must be a function');
assert.strictEqual(typeof renderCategoryFilters, 'function', 'renderCategoryFilters must be a function');

// Render topics into #category-filters
renderCategoryFilters();
const filtersContainer = getOrCreateElement('category-filters');
assert.ok(filtersContainer.innerHTML.includes('category-pill-wrap'), 'Filters container should render .category-pill-wrap');
assert.ok(filtersContainer.innerHTML.includes('btn-topic-delete'), 'Filters container should render mini delete buttons');
assert.ok(filtersContainer.innerHTML.includes('btn-add-topic-pill'), 'Filters container should render add topic button');

// Test deleting a topic via deleteTopic
const topicsBeforeDel = getTopics().slice();
assert.ok(topicsBeforeDel.includes('CSS'), 'Topics should include CSS initially');
deleteTopic('CSS');
assert.ok(!getTopics().includes('CSS'), 'CSS topic should be removed');
renderCategoryFilters();
assert.ok(!filtersContainer.innerHTML.includes('data-topic="CSS"'), 'Category filters should no longer render CSS pill after deletion');

// Test adding a custom question with a new topic adds it to topics
const qCatInput = getOrCreateElement('new-q-cat', 'input');
qCatInput.value = 'TypeScript';
qInput.value = 'What is TypeScript?';
testOpt0.value = 'A typed superset of JavaScript';
testOpt1.value = 'A database engine';
testOpt2.value = 'A CSS preprocessor';
testOpt3.value = 'An operating system';
btnAddQ.click();

assert.ok(getTopics().includes('TypeScript'), 'Adding question with new topic should register topic in getTopics');
const tsQ = QUESTIONS[QUESTIONS.length - 1];
assert.strictEqual(tsQ.category, 'TypeScript', 'Added question should have category TypeScript');

// 20. Test Topic Input Mini Popup Modal (openTopicModal, closeTopicModal, initTopicModal)
const { openTopicModal, closeTopicModal, initTopicModal } = require(path.resolve(__dirname, '../script.js'));
assert.strictEqual(typeof openTopicModal, 'function', 'openTopicModal must be a function');
assert.strictEqual(typeof closeTopicModal, 'function', 'closeTopicModal must be a function');

const topicModal = getOrCreateElement('topic-modal');
const inputTopic = getOrCreateElement('input-topic-name', 'input');
const topicErr = getOrCreateElement('topic-modal-error');
const btnSaveTopic = getOrCreateElement('btn-save-topic', 'button');
const btnCancelTopic = getOrCreateElement('btn-cancel-topic', 'button');
const btnCloseTopicModal = getOrCreateElement('btn-close-topic-modal', 'button');

topicModal.classList.add('hidden');
initTopicModal();

// Test opening modal
openTopicModal();
assert.strictEqual(topicModal.classList.contains('hidden'), false, 'openTopicModal should reveal topic-modal');
assert.strictEqual(inputTopic.value, '', 'openTopicModal should clear input field');
assert.strictEqual(topicErr.classList.contains('hidden'), true, 'openTopicModal should hide error message');

// Test submitting empty topic shows validation error
inputTopic.value = '   ';
btnSaveTopic.click();
assert.strictEqual(topicErr.classList.contains('hidden'), false, 'Empty topic should show validation error');
assert.strictEqual(topicModal.classList.contains('hidden'), false, 'Modal should remain open on error');

// Test submitting duplicate topic shows error
inputTopic.value = 'JavaScript';
btnSaveTopic.click();
assert.strictEqual(topicErr.classList.contains('hidden'), false, 'Duplicate topic should show error');

// Test submitting valid new topic adds it and closes modal
inputTopic.value = 'NodeJS';
btnSaveTopic.click();
assert.strictEqual(topicModal.classList.contains('hidden'), true, 'Modal should close on successful topic addition');
assert.ok(getTopics().includes('NodeJS'), 'Newly added topic NodeJS should be in getTopics()');

// Test close buttons
openTopicModal();
assert.strictEqual(topicModal.classList.contains('hidden'), false);
btnCancelTopic.click();
assert.strictEqual(topicModal.classList.contains('hidden'), true, 'Cancel button should close topic-modal');

openTopicModal();
btnCloseTopicModal.click();
assert.strictEqual(topicModal.classList.contains('hidden'), true, 'Close (✕) button should close topic-modal');

// 21. Test Card Timer Badge & Urgency in Active Question Card
state.isFinished = false;
state.isAnswered = false;
state.currentIndex = 0;
renderQuestion();
const qCard = getOrCreateElement('quiz-card');
assert.ok(qCard.innerHTML.includes('card-timer-badge'), 'quiz-card must render .card-timer-badge');
assert.ok(qCard.innerHTML.includes('btn-card-timer-settings'), 'quiz-card must render #btn-card-timer-settings');

// Test urgent low-time styling when remainingSeconds <= 5
state.remainingSeconds = 4;
state.timerMode = 'per-question';
renderHeader();
const cardTimerBadge = getOrCreateElement('card-timer-badge');
assert.ok(cardTimerBadge, 'card-timer-badge must exist in qCard');
assert.strictEqual(cardTimerBadge.classList.contains('timer-urgent'), true, 'card-timer-badge must have .timer-urgent when remainingSeconds <= 5');

// Test timer settings button inside question card
const timerModal = getOrCreateElement('timer-settings-modal');
timerModal.classList.add('hidden');
const cardTimerBtn = getOrCreateElement('btn-card-timer-settings');
cardTimerBtn.click();
assert.strictEqual(timerModal.classList.contains('hidden'), false, 'Clicking settings button in card timer badge should open timer modal');

// 22. Test 50% Fail Test Sad Cat Animation vs Celebratory Animation
state.isFinished = true;
// Case A: 50% accuracy (e.g. 1 correct out of 2) -> Fail test
state.answers = [
  { questionIndex: 0, selectedIndex: 0, isCorrect: true },
  { questionIndex: 1, selectedIndex: 1, isCorrect: false }
];
renderQuestion();
assert.ok(qCard.innerHTML.includes('cat-crying-wrapper'), 'Fail test (50% accuracy) must render .cat-crying-wrapper');
assert.ok(qCard.innerHTML.includes('Test Failed'), 'Fail test must render failure heading');

// Case B: 100% accuracy -> Passing celebration
state.answers = [
  { questionIndex: 0, selectedIndex: 0, isCorrect: true },
  { questionIndex: 1, selectedIndex: 1, isCorrect: true }
];
renderQuestion();
assert.ok(qCard.innerHTML.includes('cat-clapping-wrapper'), 'Pass test (> 50% accuracy) must render .cat-clapping-wrapper');
assert.ok(qCard.innerHTML.includes('Congratulations'), 'Pass test must render Congratulations heading');

// 23. Test XSS Protection Across All Dynamic Views
const xssPayload = '<img src=x onerror=alert("XSS")>';
const xssTopic = '"><script>alert("XSS_TOPIC")</script>';

// A. Test escapeHTML utility
const { escapeHTML } = require(path.resolve(__dirname, '../script.js'));
assert.strictEqual(typeof escapeHTML, 'function', 'escapeHTML function must be defined and exported');
assert.strictEqual(escapeHTML(xssPayload), '&lt;img src=x onerror=alert(&quot;XSS&quot;)&gt;', 'escapeHTML must sanitize HTML characters');

// B. Test topic rendering in category filters
addTopic(xssTopic);
renderCategoryFilters();
const categoryContainer = getOrCreateElement('category-filters');
assert.ok(!categoryContainer.innerHTML.includes('<script>'), 'category-filters must never inject raw script tags');
assert.ok(categoryContainer.innerHTML.includes('&lt;script&gt;'), 'category-filters must escape topic name in HTML');

// C. Test Review Modal with XSS question and answers
state.answers = [{ questionIndex: 0, selectedIndex: 0, isCorrect: false }];
QUESTIONS[0] = {
  id: 'q-xss-test',
  question: 'What is <script>alert(1)</script>?',
  options: ['<img src=x onerror=alert(2)>', 'Safe Opt B', 'Safe Opt C', 'Safe Opt D'],
  correctIndex: 0,
  explanation: 'Because <svg/onload=alert(3)>',
  category: '<iframe src="javascript:alert(4)">'
};

openReviewModal();
const modalReviewList = getOrCreateElement('review-list');
assert.ok(!modalReviewList.innerHTML.includes('<script>alert(1)</script>'), 'review modal must not contain unescaped script tags');
assert.ok(!modalReviewList.innerHTML.includes('<img src=x onerror'), 'review modal must not contain unescaped img tags');
assert.ok(!modalReviewList.innerHTML.includes('<svg/onload'), 'review modal must not contain unescaped svg tags');
assert.ok(!modalReviewList.innerHTML.includes('<iframe'), 'review modal must not contain unescaped iframe tags');
assert.ok(modalReviewList.innerHTML.includes('&lt;script&gt;'), 'review modal must encode script tags');

console.log('All Component Rendering tests passed!');
