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

console.log('All HTML structure tests passed!');
