# Web Quiz Application Design Specification

## 1. Overview
A single-page, responsive web quiz application built using vanilla HTML, CSS, and JavaScript across exactly 3 core files. The application presents 3 distinct visual components together on a unified screen: a Header with live timer and progress tracking, an Active Question Card with interactive options and instant feedback, and a Scoreboard displaying score, streak, and question history.

## 2. Architecture & File Structure
The project contains exactly 3 files in the root directory:
- `index.html`: Semantic HTML structure defining containers for the three components.
- `style.css`: Modern responsive design using CSS Grid and Flexbox, color system, and interactive states.
- `script.js`: Self-contained questions dataset, state machine, event delegation, and component rendering logic.

### 2.1 Three-Component Layout
The layout uses CSS Grid with a top header and a side-by-side main section on desktop screens (>= 768px), collapsing to a single-column stack on smaller viewports.

1. **Header Component (`<header class="quiz-header">`)**:
   - Application title ("Web Dev Quiz").
   - Progress indicator (`Question X of Y`) with a visual progress bar.
   - Live elapsed timer (`MM:SS`).

2. **Active Question Card Component (`<main class="quiz-card">`)**:
   - Active question heading.
   - 4 clickable answer option buttons (`<button class="option-btn">`).
   - Feedback message and contextual explanation upon selecting an answer.
   - Action button ("Next Question" / "View Results" / "Restart Quiz").

3. **Scoreboard Component (`<aside class="quiz-scoreboard">`)**:
   - Total Score display (100 points per correct answer).
   - Current Streak and Best Streak counter.
   - Accuracy percentage (`Correct / Total Answered * 100`).
   - Answer history tracker showing icon badges (✓ / ✗) for answered questions.

## 3. Data Model & State Management

### 3.1 Question Schema
Stored directly in `script.js` as an array of question objects:
```javascript
const QUESTIONS = [
  {
    id: 1,
    question: "Which HTML element is used to link an external CSS file?",
    options: ["<link>", "<style>", "<css>", "<stylesheet>"],
    correctIndex: 0,
    explanation: "The <link rel='stylesheet' href='...'> tag links external CSS stylesheets into an HTML document."
  },
  {
    id: 2,
    question: "Which CSS property controls the spacing between lines of text?",
    options: ["letter-spacing", "line-height", "word-spacing", "text-indent"],
    correctIndex: 1,
    explanation: "'line-height' sets the distance between baselines of text."
  },
  {
    id: 3,
    question: "What does the '===' operator check in JavaScript?",
    options: ["Value only", "Type only", "Both value and type without coercion", "Memory reference only"],
    correctIndex: 2,
    explanation: "Strict equality (===) checks both value and type without performing type coercion."
  },
  {
    id: 4,
    question: "Which HTML5 element is best suited for independent, reusable content like blog posts?",
    options: ["<section>", "<div>", "<article>", "<main>"],
    correctIndex: 2,
    explanation: "The <article> element is intended for self-contained compositions intended to be independently distributable."
  },
  {
    id: 5,
    question: "In CSS Flexbox, which property aligns items along the cross-axis?",
    options: ["justify-content", "align-items", "flex-direction", "align-content"],
    correctIndex: 1,
    explanation: "'align-items' controls alignment of items along the cross-axis within the current flex line."
  },
  {
    id: 6,
    question: "Which array method creates a new array with all elements that pass a test function?",
    options: ["map()", "filter()", "reduce()", "forEach()"],
    correctIndex: 1,
    explanation: "The filter() method produces a shallow copy of portions of a given array filtered down to elements that pass the test."
  }
];
```

### 3.2 State Structure
```javascript
const state = {
  currentIndex: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  answers: [], // Array of { questionId: number, selectedIndex: number, isCorrect: boolean }
  isAnswered: false,
  elapsedSeconds: 0,
  timerIntervalId: null,
  isFinished: false
};
```

### 3.3 State Transitions & Handlers
1. `initApp()`:
   - Sets `timerIntervalId = setInterval(tickTimer, 1000)`.
   - Calls `renderAll()`.
2. `selectOption(index)`:
   - Guarded: returns if `state.isAnswered` or `state.isFinished`.
   - Checks `isCorrect = (index === currentQuestion.correctIndex)`.
   - If correct: `state.score += 100`, `state.streak += 1`, updates `state.bestStreak = Math.max(state.streak, state.bestStreak)`.
   - If incorrect: `state.streak = 0`.
   - Records `{ questionId, selectedIndex: index, isCorrect }` in `state.answers`.
   - Sets `state.isAnswered = true`.
   - Re-renders components to show answer highlights, explanation, and "Next Question" button.
3. `nextQuestion()`:
   - If `currentIndex < QUESTIONS.length - 1`: `state.currentIndex++`, `state.isAnswered = false`, re-renders.
   - If `currentIndex === QUESTIONS.length - 1`: `state.isFinished = true`, stops timer, renders completion screen.
4. `restartQuiz()`:
   - Resets state to initial values, clears timer, starts new timer, re-renders all components.

## 4. User Interface & Interactions

### 4.1 Header (`quiz-header`)
- **Top Row**: Brand title and live elapsed timer formatted as `MM:SS`.
- **Bottom Row**: Text `Question X of Y` and a `<div class="progress-bar">` with inner `<div class="progress-fill">` whose width reflects `((currentIndex + 1) / totalQuestions) * 100%`.

### 4.2 Question Card (`quiz-card`)
- **Active State**:
  - Displays question text in an `<h2>`.
  - Four option buttons with index badges (A, B, C, D).
  - When option is clicked:
    - Correct option gains class `.correct` (green background/border with checkmark).
    - If wrong option was chosen, it gains class `.incorrect` (red background/border with cross icon).
    - All option buttons are disabled (`disabled` attribute).
    - Explanation card reveals below the options.
    - "Next Question" button becomes visible and focused.
- **Finished State**:
  - Displays celebratory summary (Final Score, Total Time, Accuracy percentage, Highest Streak).
  - Provides a "Play Again" restart button.

### 4.3 Scoreboard (`quiz-scoreboard`)
- Metric cards:
  - **Score**: Big numeric counter (`0 pts`).
  - **Streak**: Flame icon with current streak and best streak.
  - **Accuracy**: Dynamic percentage (`0%` -> `100%`).
- **History List**:
  - Shows row items for answered questions with status badge (`✓ Correct` or `✗ Incorrect`).

## 5. Accessibility & Responsiveness
- **Semantic landmarks**: `<header>`, `<main>`, `<aside>`, `<button>`.
- **Keyboard navigation**: All interactive elements are native `<button>` tags with clear `:focus-visible` styling.
- **Screen reader announcements**: `aria-live="polite"` on the feedback and score regions.
- **Responsiveness**:
  - Viewport meta tag included.
  - Mobile layout: single-column vertical flow with full touch target sizes (min 44px height for buttons).
  - Desktop layout: CSS Grid container with 2-column layout (`minmax(0, 2fr) minmax(0, 1fr)`).

## 6. Verification & Self-Checks
- Automated unit/integration self-check script (`test_quiz.js`) executed via Node.js to verify:
  1. `QUESTIONS` dataset contains valid objects with 4 options and valid `correctIndex`.
  2. Scoring calculation, streak counter, and accuracy formula behave correctly.
  3. Reset function cleanly restores initial state.
- File integrity checks ensuring `index.html` loads without missing assets and matches required 3-file constraint.
