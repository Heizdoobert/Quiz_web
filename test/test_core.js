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
assert.strictEqual(formatTime(0), '00:00:00');
assert.strictEqual(formatTime(65), '00:01:05');
assert.strictEqual(formatTime(3600), '01:00:00');
assert.strictEqual(formatTime(3665), '01:01:05');

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

// 13. Test Timer Configuration & Countdown Logic
const { setTimerConfig, tickTimer, handleTimeout } = require('../script.js');
assert.strictEqual(typeof setTimerConfig, 'function', 'setTimerConfig must be a function');
assert.strictEqual(typeof tickTimer, 'function', 'tickTimer must be a function');
assert.strictEqual(typeof handleTimeout, 'function', 'handleTimeout must be a function');

// Default timer state: 'per-question', 30s limit, 30s remaining
restartQuiz();
assert.strictEqual(state.timerMode, 'per-question', 'Default mode should be per-question');
assert.strictEqual(state.timerLimit, 30, 'Default timerLimit should be 30s');
assert.strictEqual(state.remainingSeconds, 30, 'Default remainingSeconds should be 30s');

// Test setTimerConfig
setTimerConfig('stopwatch');
assert.strictEqual(state.timerMode, 'stopwatch');
setTimerConfig('per-question', 15);
assert.strictEqual(state.timerMode, 'per-question');
assert.strictEqual(state.timerLimit, 15);
assert.strictEqual(state.remainingSeconds, 15);

// Test tickTimer in countdown mode
tickTimer();
assert.strictEqual(state.remainingSeconds, 14, 'Countdown should decrement remainingSeconds');

// Fast-forward to 0s in per-question mode
state.remainingSeconds = 1;
tickTimer();
assert.strictEqual(state.remainingSeconds, 0);
assert.strictEqual(state.isAnswered, true, 'Timeout should mark question as answered');
assert.strictEqual(state.streak, 0, 'Timeout should reset streak to 0');
assert.strictEqual(state.answers.length > 0 && state.answers[state.answers.length - 1].isTimeout, true, 'Answer record should mark isTimeout: true');

// 14. Test Leaderboard and Rank determination
const { getRank, saveLeaderboardRecord, getLeaderboard, clearLeaderboard } = require('../script.js');
assert.strictEqual(typeof getRank, 'function', 'getRank must be a function');
assert.strictEqual(typeof saveLeaderboardRecord, 'function', 'saveLeaderboardRecord must be a function');
assert.strictEqual(typeof getLeaderboard, 'function', 'getLeaderboard must be a function');
assert.strictEqual(typeof clearLeaderboard, 'function', 'clearLeaderboard must be a function');

// Test getRank tiers
assert.strictEqual(getRank(600, 100).tier, 'Master');
assert.strictEqual(getRank(600, 90).tier, 'Master');
assert.strictEqual(getRank(400, 80).tier, 'Pro');
assert.strictEqual(getRank(400, 70).tier, 'Pro');
assert.strictEqual(getRank(200, 50).tier, 'Novice');

// Test saving and sorting leaderboard records
clearLeaderboard();
assert.deepStrictEqual(getLeaderboard(), []);

saveLeaderboardRecord({ score: 300, accuracy: 70, timeSpent: 45, streak: 3, date: '2026-09-16' });
saveLeaderboardRecord({ score: 600, accuracy: 100, timeSpent: 30, streak: 6, date: '2026-09-16' });
saveLeaderboardRecord({ score: 600, accuracy: 100, timeSpent: 25, streak: 6, date: '2026-09-16' });
saveLeaderboardRecord({ score: 100, accuracy: 50, timeSpent: 60, streak: 1, date: '2026-09-16' });

const records = getLeaderboard();
assert.strictEqual(records.length, 4);
// Rank 1: score 600 with lower timeSpent (25s)
assert.strictEqual(records[0].score, 600);
assert.strictEqual(records[0].timeSpent, 25);
assert.strictEqual(records[0].rank.tier, 'Master');
// Rank 2: score 600 with timeSpent 30s
assert.strictEqual(records[1].score, 600);
assert.strictEqual(records[1].timeSpent, 30);
// Rank 3: score 300
assert.strictEqual(records[2].score, 300);
// Rank 4: score 100
// 15. Test Lifelines (50:50 and Skip) & Category Filtering
const { useFiftyFifty, useSkip, getFilteredQuestions, setCategoryFilter } = require('../script.js');
assert.strictEqual(typeof useFiftyFifty, 'function', 'useFiftyFifty must be a function');
assert.strictEqual(typeof useSkip, 'function', 'useSkip must be a function');
assert.strictEqual(typeof getFilteredQuestions, 'function', 'getFilteredQuestions must be a function');

// Test category properties on DEFAULT_QUESTIONS
DEFAULT_QUESTIONS.forEach(q => {
  assert.ok(typeof q.category === 'string' && q.category.length > 0, `Question ${q.id} must have a non-empty category`);
});

// Test getFilteredQuestions
assert.strictEqual(getFilteredQuestions('All').length, QUESTIONS.length);
const htmlQs = getFilteredQuestions('HTML');
assert.ok(htmlQs.length > 0, 'HTML category should return questions');
htmlQs.forEach(q => assert.strictEqual(q.category, 'HTML'));

// Test Lifeline: 50:50
restartQuiz();
assert.strictEqual(state.lifelines.fiftyFifty, true, 'fiftyFifty lifeline should be available initially');
const eliminated = useFiftyFifty();
assert.ok(Array.isArray(eliminated) && eliminated.length === 2, 'useFiftyFifty should return 2 eliminated option indices');
const currentQ = QUESTIONS[state.currentIndex];
assert.ok(!eliminated.includes(currentQ.correctIndex), 'Eliminated options must not include the correct answer');
assert.strictEqual(state.lifelines.fiftyFifty, false, 'fiftyFifty lifeline should be marked used');
assert.strictEqual(useFiftyFifty(), null, 'Re-using 50:50 in the same quiz must return null');

// Test Lifeline: Skip Question
assert.strictEqual(state.lifelines.skip, true, 'skip lifeline should be available initially');
const prevIndex = state.currentIndex;
const skipResult = useSkip();
assert.strictEqual(skipResult, true, 'useSkip should return true');
assert.strictEqual(state.currentIndex, prevIndex + 1, 'useSkip should advance currentIndex without altering streak or score');
assert.strictEqual(state.lifelines.skip, false, 'skip lifeline should be marked used');
assert.strictEqual(useSkip(), false, 'Re-using Skip in the same quiz must return false');

// Test reset on restartQuiz
restartQuiz();
assert.strictEqual(state.lifelines.fiftyFifty, true, 'restartQuiz should reset fiftyFifty lifeline');
assert.strictEqual(state.lifelines.skip, true, 'restartQuiz should reset skip lifeline');

// 16. Test Dynamic User-Managed Topics
const { addTopic, deleteTopic, getTopics } = require('../script.js');
assert.strictEqual(typeof addTopic, 'function', 'addTopic must be a function');
assert.strictEqual(typeof deleteTopic, 'function', 'deleteTopic must be a function');
assert.strictEqual(typeof getTopics, 'function', 'getTopics must be a function');

const initialTopics = getTopics();
assert.ok(Array.isArray(initialTopics), 'getTopics must return an array');
assert.ok(initialTopics.includes('HTML'), 'Initial topics should include HTML');
assert.ok(initialTopics.includes('CSS'), 'Initial topics should include CSS');
assert.ok(initialTopics.includes('JavaScript'), 'Initial topics should include JavaScript');

// Add a new topic
const addRes = addTopic('Python');
assert.strictEqual(addRes, true, 'addTopic should return true for valid new topic');
assert.ok(getTopics().includes('Python'), 'getTopics should include newly added topic');

// Duplicate topic rejected
assert.strictEqual(addTopic('python'), false, 'addTopic should reject case-insensitive duplicate');
assert.strictEqual(addTopic('   '), false, 'addTopic should reject empty string');

// Add question with 'Python' topic
const pythonQ = {
  question: 'What is Python?',
  options: ['A language', 'A snake only', 'A car', 'A bird'],
  correctIndex: 0,
  category: 'Python',
  explanation: 'Python is a high-level programming language.'
};
QUESTIONS.push(pythonQ);
assert.strictEqual(QUESTIONS[QUESTIONS.length - 1].category, 'Python');

// Set active category to Python and verify deletion
state.activeCategory = 'Python';
const delRes = deleteTopic('Python');
assert.strictEqual(delRes, true, 'deleteTopic should return true for existing topic');
assert.ok(!getTopics().includes('Python'), 'getTopics should no longer include deleted topic');
assert.strictEqual(state.activeCategory, 'All', 'Active category should reset to All when active topic is deleted');
assert.strictEqual(pythonQ.category, 'General', 'Question under deleted topic should be reassigned to General');

// Deleting starter topic HTML
deleteTopic('HTML');
assert.ok(!getTopics().includes('HTML'), 'getTopics should allow deleting starter topics like HTML');
const htmlQsAfter = QUESTIONS.filter(q => q.category === 'HTML');
assert.strictEqual(htmlQsAfter.length, 0, 'No questions should retain deleted HTML category');

console.log('All Core State Machine tests passed!');

