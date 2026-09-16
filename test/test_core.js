const assert = require('assert');
const {
  DEFAULT_QUESTIONS,
  QUESTIONS,
  loadSampleQuestions,
  state,
  calcAccuracy,
  formatTime,
  selectOption,
  nextQuestion,
  restartQuiz
} = require('../script.js');

// 1. Verify DEFAULT_QUESTIONS template array
assert.ok(Array.isArray(DEFAULT_QUESTIONS) && DEFAULT_QUESTIONS.length >= 6, 'Must have at least 6 sample questions');
DEFAULT_QUESTIONS.forEach((q, idx) => {
  assert.strictEqual(typeof q.id, 'number', `Question ${idx} must have numeric id`);
  assert.ok(typeof q.question === 'string' && q.question.length > 0, `Question ${idx} must have text`);
  assert.strictEqual(q.options.length, 4, `Question ${idx} must have 4 options`);
  assert.ok(q.correctIndex >= 0 && q.correctIndex < 4, `Question ${idx} correctIndex must be 0-3`);
  assert.ok(typeof q.explanation === 'string' && q.explanation.length > 0, `Question ${idx} must have explanation`);
});

// 2. Verify initial QUESTIONS array starts blank (0 questions)
assert.ok(Array.isArray(QUESTIONS) && QUESTIONS.length === 0, 'QUESTIONS must start blank initially');

// 3. Test loadSampleQuestions
loadSampleQuestions();
assert.strictEqual(QUESTIONS.length, DEFAULT_QUESTIONS.length, 'loadSampleQuestions should populate QUESTIONS');

// 4. Test formatTime
assert.strictEqual(formatTime(0), '00:00');
assert.strictEqual(formatTime(65), '01:05');
assert.strictEqual(formatTime(3600), '60:00');

// 5. Test calcAccuracy
assert.strictEqual(calcAccuracy([]), 0);
assert.strictEqual(calcAccuracy([{ isCorrect: true }, { isCorrect: false }]), 50);
assert.strictEqual(calcAccuracy([{ isCorrect: true }, { isCorrect: true }]), 100);

// 6. Test selectOption - correct answer
restartQuiz();
const q0 = QUESTIONS[0];
const correctRes = selectOption(q0.correctIndex);

assert.strictEqual(correctRes.isCorrect, true);
assert.strictEqual(state.score, 100);
assert.strictEqual(state.streak, 1);
assert.strictEqual(state.bestStreak, 1);
assert.strictEqual(state.isAnswered, true);

// 5. Test selectOption - cannot re-answer before next
const repeatRes = selectOption(1);
assert.strictEqual(repeatRes, null, 'Should ignore clicks when already answered');

// 6. Test nextQuestion
nextQuestion();
assert.strictEqual(state.currentIndex, 1);
assert.strictEqual(state.isAnswered, false);

// 7. Test selectOption - incorrect answer
const q1 = QUESTIONS[1];
const wrongIndex = (q1.correctIndex + 1) % 4;
const wrongRes = selectOption(wrongIndex);
assert.strictEqual(wrongRes.isCorrect, false);
assert.strictEqual(state.score, 100);
assert.strictEqual(state.streak, 0);
assert.strictEqual(state.bestStreak, 1);

// 8. Test restartQuiz
restartQuiz();
assert.strictEqual(state.currentIndex, 0);
assert.strictEqual(state.score, 0);
assert.strictEqual(state.streak, 0);
assert.strictEqual(state.bestStreak, 0);
assert.strictEqual(state.answers.length, 0);
assert.strictEqual(state.isAnswered, false);
assert.strictEqual(state.isFinished, false);

// 9. Test nextQuestion to end of quiz and timer clearInterval
let clearedId = null;
const origClearInterval = global.clearInterval;
global.clearInterval = (id) => { clearedId = id; };
state.currentIndex = QUESTIONS.length - 1;
state.timerIntervalId = 12345;
nextQuestion();
assert.strictEqual(state.isFinished, true);
assert.strictEqual(state.timerIntervalId, null);
assert.strictEqual(clearedId, 12345);
global.clearInterval = origClearInterval;

// 10. Test selectOption when quiz is finished
assert.strictEqual(selectOption(0), null);

// 11. Test restartQuiz cleans up timer if active
global.clearInterval = (id) => { clearedId = id; };
state.timerIntervalId = 99999;
restartQuiz();
assert.strictEqual(state.timerIntervalId, null);
assert.strictEqual(clearedId, 99999);
global.clearInterval = origClearInterval;

// 12. Test MiniStore and addCustomQuestion (up to 50 questions)
const { MiniStore, addCustomQuestion } = require('../script.js');
assert.ok(MiniStore, 'MiniStore must be exported');
assert.strictEqual(typeof addCustomQuestion, 'function', 'addCustomQuestion must be a function');

// Test adding a custom question
const initialCount = QUESTIONS.length;
const newQ = {
  question: "What does HTML stand for?",
  options: ["Hyper Text Markup Language", "High Tech Multi Language", "Hyperlink Text Mode Layout", "Home Tool Markup Language"],
  correctIndex: 0,
  explanation: "HTML stands for HyperText Markup Language."
};
const added = addCustomQuestion(newQ);
assert.ok(added, 'Valid question should be added');
assert.strictEqual(QUESTIONS.length, initialCount + 1);
assert.strictEqual(QUESTIONS[QUESTIONS.length - 1].question, "What does HTML stand for?");

// Test rejection of invalid question
assert.strictEqual(addCustomQuestion({ question: "", options: ["A", "B", "C", "D"], correctIndex: 0 }), null, 'Empty question must be rejected');
assert.strictEqual(addCustomQuestion({ question: "Valid?", options: ["A", "B"], correctIndex: 0 }), null, 'Must require 4 options');
assert.strictEqual(addCustomQuestion({ question: "Valid?", options: ["A", "B", "C", "D"], correctIndex: 5 }), null, 'correctIndex out of bounds must be rejected');

// Test 50 questions cap limit
while (QUESTIONS.length < 50) {
  addCustomQuestion({
    question: `Question ${QUESTIONS.length + 1}`,
    options: ["Option 1", "Option 2", "Option 3", "Option 4"],
    correctIndex: 0,
    explanation: "Sample explanation"
  });
}
assert.strictEqual(QUESTIONS.length, 50, 'Questions count should reach 50');

// Attempting 51st question must be rejected
const overLimitQ = addCustomQuestion({
  question: "51st Question?",
  options: ["A", "B", "C", "D"],
  correctIndex: 0
});
assert.strictEqual(overLimitQ, null, 'Adding beyond 50 questions must return null / be rejected');
assert.strictEqual(QUESTIONS.length, 50, 'Max questions cap must stay at 50');

console.log('All Core State Machine tests passed!');

