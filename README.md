# Quick Quiz

A modern, responsive, single-page web quiz application built with vanilla HTML5, CSS3, and modern JavaScript. It features real-time scoring, live streak tracking, instant answer feedback with explanations, and a designated zone for affiliate links or advertisement banners.

Zero frameworks. Zero runtime dependencies. Zero build step.

---

## Features

- **3-Component Unified Interface**:
  - **Configurable Clock & Time Lapse**: Choose between **Per-Question Countdown** (default 30s; presets for 15s, 30s, 60s, 2m, or custom), **Total Quiz Countdown**, or classic **Stopwatch**. Includes low-time visual warning pulses (< 5s) and automatic timeout handling.
  - **3D Flip Card Question Presentation (Zero Scrolling)**: Questions are displayed on 3D perspective flip cards. The front displays the question and options; answering smoothly flips the card 180° to reveal the outcome, correct answer, explanation, and next button on the back—completely eliminating the need to scroll down!
  - **Live Scoreboard**: Real-time points (+100 per correct answer), current & best streak counter with flame indicator, dynamic accuracy percentage, and a scrollable per-question history log.
- **Blank Start & Welcome Overlay**:
  - Loads with a pristine blank question bank (`QUESTIONS = []`), allowing users to create their own custom quiz or populate 6 sample web dev trivia questions with one click.
  - Displays a transparent glassmorphism `#welcome-overlay` on `#quiz-card` with "Add New Quiz", "Load Sample Questions", and "How to Play" action buttons.
- **3-Step Interactive Onboarding Guide**:
  - Modal walkthrough (`#intro-modal`) guiding users through quiz creation and gameplay:
    - **Step 1: Create Your Quiz**: Add up to 50 custom multiple-choice questions with 4 options and answer keys.
    - **Step 2: Lightweight Mini-DB**: Saves in browser session storage & cookies, automatically clearing upon page reload for a fresh slate.
    - **Step 3: Play & Track Progress**: Real-time timer, streak multipliers, accuracy stats, and instant answer explanations.
  - Step dots indicator and keyboard-accessible navigation controls.
- **Custom Question Creator (Up to 50 Questions)**:
  - Users can easily add their own questions and options directly in the browser via a collapsible, smoothly animated form (`#custom-question-section`).
  - Supports up to 50 questions with instantaneous validation and radio-button answer keys.
  - Option to "Add Question" to the current pool or "Add & Start Quiz" to jump straight into the customized quiz.
- **Mini JSON DB Storage (`sessionStorage` + Session Cookie)**:
  - Custom questions are serialized into a lightweight JSON database stored in both `sessionStorage` and browser session cookies.
  - **Auto-Clear on Reload**: Refreshing or reloading the page automatically wipes custom session data, restoring the pristine default question bank.
- **Transparent Glassmorphism & Smooth Animation**:
  - Semi-transparent cards with `backdrop-filter: blur(12px)` and subtle glowing borders.
  - Fluid cubic-bezier transitions on form expansion, hover states, button clicks, and feedback alerts.
- **Affiliate & Ad-Ready Zone**:
  - Dedicated, unobtrusively styled slot (`#affiliate-zone`) in the sidebar column for sponsored content, affiliate recommendations, or ad network scripts.
- **Accessible & Compliant**:
  - Semantic landmark tags (`<header>`, `<main>`, `<aside>`, `<section>`).
  - Screen-reader friendly via `aria-live="polite"` feedback and ARIA progress bar properties.
  - Full keyboard accessibility with prominent `:focus-visible` styling on all interactive elements.
- **Responsive Layout**:
  - Built with CSS Grid and Flexbox.
  - Seamlessly adapts between a 2-column desktop dashboard and a stacked single-column mobile view (< 768px).


---

## File Structure

```text
.
├── index.html            # Compiled, production-ready semantic HTML layout
├── template.html         # Clean, lightweight source template (~75 lines)
├── build.js              # Fast, zero-dependency sub-HTML component compiler
├── components/           # Modular sub-HTML component partials:
│   ├── header.html       # Brand header, timer, category pills, progress
│   ├── question-form.html# Custom question builder section & collapsible form
│   ├── quiz-card.html    # Active question card, welcome overlay, 3D flip card
│   ├── scoreboard.html   # Stats, streaks, question history, leaderboard & ads
│   └── modals.html       # Intro guide, timer config, topic, & review modals
├── style.css             # Modern dark-theme styling, CSS variables, and layout
├── script.js             # State machine, question dataset, and DOM rendering
├── README.md             # Project documentation and ad integration guide
└── test/
    ├── test_core.js      # Unit tests for question dataset and state machine logic
    ├── test_html.js      # Structural validation for required elements & a11y attributes
    ├── test_css.js       # Theme variables, responsive media queries, and style assertions
    └── test_render.js    # Integration tests verifying DOM rendering and safe text handling
```

---

## Quick Start

No installation or build tools required.

### 1. Open Directly
Double-click `index.html` or drag it into any modern web browser (Chrome, Firefox, Safari, Edge).

### 2. Run via Local Server (Optional)
If you prefer running via a local development server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js npx
npx serve .
```
Then visit `http://localhost:8000` in your browser.

---

## Integrating Affiliate Links & Ads

The application includes an affiliate and advertisement container designed to integrate seamlessly without disrupting quiz gameplay:

### Location in `index.html`
Look for the `<section id="affiliate-zone" class="ad-card">` inside `.sidebar-column`.

### Option A: Custom Affiliate Link (Amazon, Udemy, Hosting, etc.)
Replace the link URL, title, and description inside `<div class="ad-content">`:

```html
<section id="affiliate-zone" class="ad-card" aria-label="Sponsored Content">
  <div class="ad-badge">Sponsored</div>
  <div class="ad-content">
    <a href="YOUR_AFFILIATE_LINK_HERE" class="ad-link" target="_blank" rel="noopener sponsored">
      <div class="ad-placeholder-art" aria-hidden="true">💻</div>
      <div class="ad-text">
        <strong class="ad-title">Recommended Web Dev Bootcamps</strong>
        <p class="ad-desc">Master full-stack JavaScript with top-rated courses.</p>
      </div>
    </a>
  </div>
</section>
```

### Option B: Ad Network Script (Google AdSense, Carbon Ads, etc.)
To display dynamic display ads, replace the content inside `.ad-content` with your ad unit snippet:

```html
<section id="affiliate-zone" class="ad-card" aria-label="Sponsored Content">
  <div class="ad-badge">Advertisement</div>
  <div class="ad-content">
    <!-- Google AdSense Unit Example -->
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
         data-ad-slot="XXXXXXXXXX"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>
         (adsbygoogle = window.adsbygoogle || []).push({});
    </script>
  </div>
</section>
```

---

## Automated Testing

All core game logic, HTML semantics, CSS rules, and component renderers are covered by automated tests using Node.js built-in assertion utilities:

```bash
# Run all tests
node test/test_core.js && node test/test_html.js && node test/test_css.js && node test/test_render.js
```

Test coverage includes:
- Verification of 6+ questions schema, correct option index bounds, and explanation strings.
- Pure calculation testing for elapsed time formatting (`MM:SS`) and accuracy percentage calculation.
- State machine testing for option selection, streak calculation, and reset behavior.
- HTML semantic markup, viewport meta tag, and screen reader attribute compliance.
- CSS variables, focus-visible accessibility outlines, and responsive media query coverage.
- Safe literal text rendering (preventing unescaped HTML tags from rendering as blank buttons).

---

## License

MIT License. Feel free to customize questions, styles, and monetization components for your own projects.
