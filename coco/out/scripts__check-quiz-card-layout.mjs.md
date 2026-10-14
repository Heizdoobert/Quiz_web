# scripts/check-quiz-card-layout.mjs
lines:104 exports:
---
// Regression check: the quiz flip card must be as tall as its visible face.
// It once collapsed to its padding, letting the question spill over the page.
// Needs a running app and Chrome: node scripts/check-quiz-card-layout.mjs [url]
// Set CHROME_FLAGS=--no-sandbox when running as root (e.g. in a CI container).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] || 'http://localhost:3000';
const chromeBin = process.env.CHROME_BIN || 'google-chrome';
const extraFlags = (process.env.CHROME_FLAGS || '').split(' ').filter(Boolean);

const withTimeout = (promise, ms, what) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms).unref())]);

const profile = mkdtempSync(join(tmpdir(), 'quiz-card-check-'));
const chrome = spawn(chromeBin, [
  '--headless=new', '--disable-gpu', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, ...extraFlags, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const exited = new Promise((r) => chrome.once('exit', r));

// Returns the front face and its card, measured at the given viewport width.
const measure = `(() => {
  const face = document.querySelector('[data-testid="quiz-card-front"]');
  if (!face) return null;
  const card = face.firstElementChild;
  return { face: face.getBoundingClientRect().height, card: card.getBoundingClientRect().height, content: card.scrollHeight };
})()`;

let ws;
let failed = false;
try {
  // Chrome prints its DevTools WebSocket URL on stderr once it is listening.
  const browserWs = await withTimeout(new Promise((resolve, reject) => {
    let buf = '';
    const onData = (d) => {
      const m = (buf += d).match(/ws:\/\/\S+/);
      // Keep draining stderr after we stop reading it, or a full pipe blocks Chrome.
