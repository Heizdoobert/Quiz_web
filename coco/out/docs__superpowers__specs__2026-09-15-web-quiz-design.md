# docs/superpowers/specs/2026-09-15-web-quiz-design.md
lines:158 exports:
---
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
