const fs = require('fs');
const assert = require('assert');

assert.ok(fs.existsSync('index.html'), 'index.html must exist');
const html = fs.readFileSync('index.html', 'utf8');

// Check meta and linkage
assert.ok(html.includes('<!DOCTYPE html>'), 'Must have DOCTYPE');
assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'), 'Must have viewport meta tag');
assert.ok(html.includes('<link rel="stylesheet" href="style.css">'), 'Must link style.css');
assert.ok(html.includes('<script src="script.js">') || html.includes('<script defer src="script.js">'), 'Must link script.js');

// Check 3 main semantic components
assert.ok(html.includes('id="quiz-header"'), 'Header component must exist');
assert.ok(html.includes('id="quiz-card"'), 'Question Card component must exist');
assert.ok(html.includes('id="quiz-scoreboard"'), 'Scoreboard component must exist');

// Check essential elements
const requiredIds = [
  'timer-display',
  'progress-text',
  'progress-bar-fill',
  'question-text',
  'options-container',
  'feedback-container',
  'next-btn',
  'score-display',
  'streak-display',
  'accuracy-display',
  'history-list'
];

requiredIds.forEach(id => {
  assert.ok(html.includes(`id="${id}"`), `Element with id="${id}" must exist in index.html`);
});

// Check accessibility attributes: quiz-card should not have aria-live, feedback-container should
assert.ok(!html.includes('id="quiz-card" class="quiz-card" aria-live'), 'quiz-card must not have aria-live attribute');
assert.ok(html.includes('id="feedback-container" class="feedback-card hidden" aria-live="polite"'), 'feedback-container must have aria-live="polite"');

// Check affiliate ad zone
assert.ok(html.includes('id="affiliate-zone"'), 'Affiliate ad zone must exist');
assert.ok(html.includes('class="ad-card"'), 'Ad card styling class must exist');

// Check custom question builder elements
assert.ok(html.includes('id="custom-question-section"'), 'Custom question section must exist');
assert.ok(html.includes('id="toggle-add-form-btn"'), 'Toggle add question button must exist');
assert.ok(html.includes('id="add-question-form"'), 'Add question form must exist');
assert.ok(html.includes('id="new-q-text"'), 'Question text input must exist');
assert.ok(html.includes('id="btn-add-question"'), 'Add question button must exist');
// Check intro popup modal and welcome overlay elements
assert.ok(html.includes('id="intro-modal"'), 'Intro modal must exist');
assert.ok(html.includes('id="btn-intro-next"'), 'Intro modal next button must exist');
assert.ok(html.includes('id="btn-intro-prev"'), 'Intro modal prev button must exist');
assert.ok(html.includes('id="btn-intro-close"'), 'Intro modal close button must exist');
assert.ok(html.includes('id="welcome-overlay"'), 'Welcome overlay must exist');
assert.ok(html.includes('id="btn-welcome-add"'), 'Welcome add quiz button must exist');

console.log('All HTML structure tests passed!');



