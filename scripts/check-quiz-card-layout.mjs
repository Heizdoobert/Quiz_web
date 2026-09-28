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
      if (m) { chrome.stderr.off('data', onData); chrome.stderr.resume(); resolve(m[0]); }
    };
    chrome.stderr.on('data', onData);
    chrome.once('error', reject);
    chrome.once('exit', () => reject(new Error('Chrome exited before DevTools was ready')));
  }), 15000, 'Chrome DevTools startup');

  const port = new URL(browserWs).port;
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await withTimeout(new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('DevTools WebSocket failed to open')), { once: true });
  }), 10000, 'DevTools WebSocket open');

  // One dispatcher routes replies by id; a closed socket fails every pending call.
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    const call = pending.get(msg.id);
    if (!call) return;
    pending.delete(msg.id);
    if (msg.error) call.reject(new Error(`${call.method}: ${msg.error.message}`));
    else call.resolve(msg.result);
  });
  ws.addEventListener('close', () => {
    for (const call of pending.values()) call.reject(new Error('DevTools connection closed'));
    pending.clear();
  });
  let nextId = 0;
  const send = (method, params = {}) => {
    const id = ++nextId;
    const reply = new Promise((resolve, reject) => pending.set(id, { method, resolve, reject }));
    ws.send(JSON.stringify({ id, method, params }));
    return withTimeout(reply, 10000, method);
  };

  for (const width of [375, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    const nav = await send('Page.navigate', { url });
    if (nav.errorText) { console.log(`FAIL ${width}px: ${nav.errorText}`); failed = true; continue; }
    let m = null;
    for (let i = 0; i < 60 && !m; i++) {
      await new Promise((r) => setTimeout(r, 500));
      m = (await send('Runtime.evaluate', { expression: measure, returnByValue: true })).result.value;
    }
    if (!m) { console.log(`FAIL ${width}px: no quiz card rendered (no questions loaded?)`); failed = true; continue; }
    // The card box must hold its content; a collapsed card is only its padding tall.
    const ok = m.card + 1 >= m.content && m.face >= 400;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${width}px: face=${m.face}px card=${m.card}px content=${m.content}px`);
    if (!ok) failed = true;
  }
} catch (err) {
  console.log(`FAIL: ${err.message}`);
  failed = true;
} finally {
  ws?.close();
  if (chrome.exitCode === null && chrome.signalCode === null) {
    chrome.kill();
    await withTimeout(exited, 5000, 'Chrome shutdown').catch(() => chrome.kill('SIGKILL'));
  }
  rmSync(profile, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
