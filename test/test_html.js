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
assert.ok(html.includes('https://www.profitableratecpmnetwork.com/pvr8jzwqk?key=7672ccaa0ae9cd3ce4f5fd168d596fde'), 'Ad link must point to designated partner URL');

// Check custom question builder elements
assert.ok(html.includes('id="custom-question-section"'), 'Custom question section must exist');
assert.ok(html.includes('id="toggle-add-form-btn"'), 'Toggle add question button must exist');
assert.ok(html.includes('id="add-question-form"'), 'Add question form must exist');
assert.ok(html.includes('id="new-q-text"'), 'Question text input must exist');
assert.ok(html.includes('id="new-q-cat"'), 'Topic / category input must exist in custom question form');
assert.ok(html.includes('id="topics-datalist"'), 'Topics datalist must exist for auto-completing topics');
assert.ok(html.includes('id="correct-opt-select"'), 'Correct answer dropdown selector must exist in custom question form');
assert.ok(html.includes('id="btn-add-question"'), 'Add question button must exist');
// Check intro popup modal and welcome overlay elements
assert.ok(html.includes('id="intro-modal"'), 'Intro modal must exist');
assert.ok(html.includes('id="btn-intro-next"'), 'Intro modal next button must exist');
assert.ok(html.includes('id="btn-intro-prev"'), 'Intro modal prev button must exist');
assert.ok(html.includes('id="btn-intro-close"'), 'Intro modal close button must exist');
assert.ok(html.includes('id="welcome-overlay"'), 'Welcome overlay must exist');
assert.ok(html.includes('id="btn-welcome-add"'), 'Welcome add quiz button must exist');

// Check timer settings button and modal elements
assert.ok(html.includes('id="btn-timer-settings"'), 'Timer settings button must exist');
assert.ok(html.includes('id="timer-settings-modal"'), 'Timer settings modal must exist');
assert.ok(html.includes('id="timer-mode-select"'), 'Timer mode select must exist');
assert.ok(html.includes('id="timer-limit-input"'), 'Timer limit input must exist');
assert.ok(html.includes('id="btn-apply-timer"'), 'Apply timer button must exist');

// Check 3D flip card structure
assert.ok(html.includes('id="flip-card-inner"'), 'Flip card inner container must exist');
assert.ok(html.includes('class="flip-card-front"'), 'Flip card front face must exist');
assert.ok(html.includes('class="flip-card-back"'), 'Flip card back face must exist');
assert.ok(html.includes('id="feedback-correct-answer"'), 'Feedback correct answer container must exist');

// Check SEO meta tags and structured data
assert.ok(html.includes('<meta name="description"'), 'Meta description must exist for SEO');
assert.ok(html.includes('<meta name="keywords"'), 'Meta keywords must exist for SEO');
assert.ok(html.includes('<meta name="robots" content="index, follow">'), 'Robots meta tag must allow indexing and crawling');
assert.ok(html.includes('<link rel="canonical"'), 'Canonical URL link must exist');
assert.ok(html.includes('property="og:title"'), 'Open Graph title must exist');
assert.ok(html.includes('property="og:description"'), 'Open Graph description must exist');
assert.ok(html.includes('property="og:type" content="website"'), 'Open Graph type must be website');
assert.ok(html.includes('name="twitter:card"'), 'Twitter card meta tag must exist');
assert.ok(html.includes('application/ld+json'), 'Schema.org JSON-LD structured data must exist');
assert.ok(fs.existsSync('robots.txt'), 'robots.txt must exist for search engines');
assert.ok(fs.existsSync('sitemap.xml'), 'sitemap.xml must exist for search engines');
assert.ok(html.includes('<title>Quick Quiz</title>'), 'Title must be Quick Quiz');
assert.ok(html.includes('<h1 class="brand-title">Quick Quiz</h1>'), 'Brand title must be Quick Quiz');
assert.ok(html.includes('id="btn-theme-toggle"'), 'Theme toggle button must exist in index.html');
assert.ok(html.includes('id="btn-sound-toggle"'), 'Sound toggle button must exist in index.html');
assert.ok(html.includes('id="quiz-leaderboard"'), 'Leaderboard component must exist in index.html');
assert.ok(html.includes('id="leaderboard-list"'), 'Leaderboard list must exist in index.html');
assert.ok(html.includes('id="btn-clear-leaderboard"'), 'Clear leaderboard button must exist in index.html');

// Check Confetti Canvas, Categories, Lifelines, and Review Modal
assert.ok(html.includes('id="confetti-canvas"'), 'Canvas element for confetti animation must exist');
assert.ok(html.includes('id="category-filters"'), 'Category filters bar must exist in index.html');
assert.ok(html.includes('id="lifelines-toolbar"'), 'Lifelines toolbar must exist in index.html');
assert.ok(html.includes('id="btn-lifeline-5050"'), '50:50 Lifeline button must exist in index.html');
assert.ok(html.includes('id="btn-lifeline-skip"'), 'Skip Lifeline button must exist in index.html');
assert.ok(html.includes('id="review-modal"'), 'Review answers modal must exist in index.html');
assert.ok(html.includes('id="review-list"'), 'Review answers list must exist in index.html');

console.log('All HTML structure and SEO tests passed!');



