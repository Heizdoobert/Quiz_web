// Regression check: the quiz flip card must be as tall as its visible face.
// It once collapsed to its padding, letting the question spill over the page.
// Needs a running app and Chrome: node scripts/check-quiz-card-layout.mjs [url]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] || 'http://localhost:3000';
const chromeBin = process.env.CHROME_BIN || 'google-chrome';
const profile = mkdtempSync(join(tmpdir(), 'quiz-card-check-'));
const chrome = spawn(chromeBin, [
  '--headless=new', '--disable-gpu', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank',
]);

// Chrome prints its DevTools WebSocket URL on stderr once it is listening.
const browserWs = await new Promise((resolve, reject) => {
  let buf = '';
  chrome.stderr.on('data', (d) => {
    const m = (buf += d).match(/ws:\/\/\S+/);
    if (m) resolve(m[0]);
  });
  chrome.on('exit', () => reject(new Error('Chrome exited before DevTools was ready')));
});

const port = new URL(browserWs).port;
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let nextId = 0;
function send(method, params = {}) {
  const id = ++nextId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => {
    ws.addEventListener('message', function onMsg(e) {
      const msg = JSON.parse(e.data);
      if (msg.id === id) { ws.removeEventListener('message', onMsg); resolve(msg.result); }
    });
  });
}

// Returns the front face and its card, measured at the given viewport width.
const measure = `(() => {
  const face = document.querySelector('.perspective-1000 .backface-hidden');
  if (!face) return null;
  const card = face.firstElementChild;
  return { face: face.getBoundingClientRect().height, card: card.getBoundingClientRect().height, content: card.scrollHeight };
})()`;

let failed = false;
try {
  for (const width of [375, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    await send('Page.navigate', { url });
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
} finally {
  ws.close();
  const exited = new Promise((r) => chrome.once('exit', r));
  chrome.kill();
  await exited;
  rmSync(profile, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
