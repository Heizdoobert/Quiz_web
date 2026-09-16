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

// Check ad styling classes
assert.ok(css.includes('.ad-card'), 'CSS must style .ad-card');
assert.ok(css.includes('.ad-badge'), 'CSS must style .ad-badge');

// Check custom question card, glassmorphism, and smooth animation classes
assert.ok(css.includes('.custom-question-card'), 'CSS must style .custom-question-card');
assert.ok(css.includes('backdrop-filter: blur'), 'CSS must include backdrop-filter blur for glassmorphism transparency');
assert.ok(css.includes('transition:'), 'CSS must include smooth transitions');
// Check modal and welcome overlay styles
assert.ok(css.includes('.modal-overlay'), 'CSS must style .modal-overlay');
assert.ok(css.includes('.modal-card'), 'CSS must style .modal-card');
assert.ok(css.includes('.step-indicator'), 'CSS must style .step-indicator');
assert.ok(css.includes('.step-dot'), 'CSS must style .step-dot');
assert.ok(css.includes('.welcome-overlay'), 'CSS must style .welcome-overlay');

// Check 3D flip card styling
assert.ok(css.includes('.flip-card'), 'CSS must style .flip-card');
assert.ok(css.includes('.flip-card-inner'), 'CSS must style .flip-card-inner');
assert.ok(css.includes('perspective: 1000px'), 'CSS must set perspective for 3D flip card');
assert.ok(css.includes('transform-style: preserve-3d'), 'CSS must set transform-style: preserve-3d');
assert.ok(css.includes('backface-visibility: hidden'), 'CSS must set backface-visibility: hidden');
assert.ok(css.includes('.is-flipped'), 'CSS must style .is-flipped state');
assert.ok(css.includes('.flip-card-front'), 'CSS must style .flip-card-front');
assert.ok(css.includes('.flip-card-back'), 'CSS must style .flip-card-back');
assert.ok(css.includes('.timer-warning'), 'CSS must style .timer-warning');
assert.ok(css.includes('.preset-pill'), 'CSS must style .preset-pill');

console.log('All CSS styling tests passed!');



