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

// Check study-mood clock styling
assert.ok(css.includes('tabular-nums'), 'Clock must use tabular-nums for fixed-width digits');
assert.ok(css.includes('monospace'), 'Clock must use monospace font family for study mood aesthetic');

// Check fluid typography and smooth text fitting
assert.ok(css.includes('clamp('), 'CSS must use fluid clamp() scaling for text fitting');
assert.ok(css.includes('word-break: break-word') || css.includes('overflow-wrap: break-word'), 'CSS must prevent text overflow with break-word');
assert.ok(css.includes('align-items: flex-start'), 'Option buttons must align items to flex-start for multi-line text');
assert.ok(css.includes('-webkit-font-smoothing: antialiased'), 'CSS must specify antialiased font smoothing');
assert.ok(css.includes('scrollbar-width: thin'), 'CSS must style back face with thin scrollbar');

// Check custom select dropdown and label styling
assert.ok(css.includes('select.input-field'), 'CSS must style select.input-field specifically');
assert.ok(css.includes('appearance: none'), 'Select must have appearance: none for custom arrow');
assert.ok(css.includes('select.input-field option'), 'Option elements must be styled for dark mode theme');
assert.ok(css.includes('.timer-mode-group label'), 'CSS must smoothly style dropdown timer mode label');

// Check Dark and Light mode theme support
assert.ok(css.includes('[data-theme="light"]'), 'CSS must define [data-theme="light"] theme rules');
assert.ok(!css.includes('.brand-title {\n  font-size: 1.5rem;\n  font-weight: 700;\n  letter-spacing: -0.025em;\n  color: #fff;'), 'brand-title must not have hardcoded white text');
assert.ok(css.includes('[data-theme="light"] .flip-card-back'), 'CSS must style flip-card-back in light mode');
assert.ok(css.includes('[data-theme="light"] .stat-card'), 'CSS must style stat-card in light mode');
assert.ok(css.includes('[data-theme="light"] .stat-value.highlight'), 'CSS must adjust stat-value highlight for light mode');
assert.ok(css.includes('.cat-clapping-wrapper'), 'CSS must style .cat-clapping-wrapper');
assert.ok(css.includes('catClapLeft'), 'CSS must define catClapLeft animation');
assert.ok(css.includes('.kbd-hint'), 'CSS must style keyboard shortcut badges');
assert.ok(css.includes('cardSlideIn'), 'CSS must define cardSlideIn transition animation');
assert.ok(css.includes('.leaderboard-section'), 'CSS must style leaderboard section');
assert.ok(css.includes('.leaderboard-item'), 'CSS must style individual leaderboard rows');

// Check Confetti Canvas, Categories, Lifelines, and Review Modal styles
assert.ok(css.includes('.confetti-canvas'), 'CSS must style confetti-canvas');
assert.ok(css.includes('.category-filters'), 'CSS must style category filters container');
assert.ok(css.includes('.category-pill'), 'CSS must style category pill buttons');
assert.ok(css.includes('.lifelines-toolbar'), 'CSS must style lifelines toolbar');
assert.ok(css.includes('.btn-lifeline'), 'CSS must style lifeline action buttons');
assert.ok(css.includes('.option-btn.eliminated'), 'CSS must style 50:50 eliminated option buttons');
assert.ok(css.includes('.review-item'), 'CSS must style review breakdown items');

// Check Correct Answer Setting & Fresh/Reset completion buttons
assert.ok(css.includes('.correct-answer-group'), 'CSS must style correct answer dropdown group in question creator');
assert.ok(css.includes('.btn-refresh-page'), 'CSS must style fresh reload button on completion screen');
assert.ok(css.includes('.btn-reset-quiz'), 'CSS must style reset quiz button on completion screen');

console.log('All CSS styling tests passed!');



