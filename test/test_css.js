const fs = require('fs');
const assert = require('assert');

assert.ok(fs.existsSync('style.css'), 'style.css must exist');
const css = fs.readFileSync('style.css', 'utf8');

// Check CSS Custom Properties (Theming)
assert.ok(css.includes(':root'), 'Must define :root variables');
assert.ok(css.includes('--color-primary') || css.includes('--primary'), 'Must include primary color variable');
assert.ok(css.includes('--color-success') || css.includes('--success'), 'Must include success color variable');
assert.ok(css.includes('--color-error') || css.includes('--error'), 'Must include error color variable');

// Check layout classes
const requiredSelectors = [
  '.app-layout',
  '.quiz-header',
  '.main-content-grid',
  '.quiz-card',
  '.quiz-scoreboard',
  '.option-btn',
  '.correct',
  '.incorrect',
  '.hidden'
];

requiredSelectors.forEach(sel => {
  assert.ok(css.includes(sel), `CSS must include selector ${sel}`);
});

// Check responsiveness
assert.ok(css.includes('@media'), 'CSS must include media queries for responsive layout');

console.log('All CSS styling tests passed!');
