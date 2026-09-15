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

// Check accessibility styles: focus-visible and contrast
assert.ok(css.includes(':focus-visible'), 'CSS must include :focus-visible rules');
assert.ok(css.includes('.option-btn:focus-visible'), 'CSS must include .option-btn:focus-visible');
assert.ok(css.includes('.btn:focus-visible'), 'CSS must include .btn:focus-visible');
assert.ok(css.includes('outline: 2px solid var(--color-primary)'), 'CSS must specify 2px solid var(--color-primary) outline');
assert.ok(css.includes('outline-offset: 2px'), 'CSS must specify outline-offset: 2px');
assert.ok(css.includes('#064e3b'), 'CSS must use high-contrast text color #064e3b on correct badge');

// Check responsiveness
assert.ok(css.includes('@media'), 'CSS must include media queries for responsive layout');

console.log('All CSS styling tests passed!');
