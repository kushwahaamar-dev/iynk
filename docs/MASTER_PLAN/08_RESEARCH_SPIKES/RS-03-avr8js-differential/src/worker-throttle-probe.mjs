// Probe: can CPU throttling be applied to a dedicated worker target over raw CDP?
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { chromium } from 'playwright';
import WebSocket from 'ws';
const ROOT = process.env.RS03_DIR ?? process.cwd();
const server = http.createServer((req, res) => {
  const p = req.url.split('?')[0];
  const f = p.startsWith('/out/') ? `${ROOT}${p}` : `${ROOT}/web${p === '/' ? '/index.html' : p}`;
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'text/plain' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(43555, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--remote-debugging-port=43556'] });
const ver = await (await fetch('http://127.0.0.1:43556/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r) => ws.on('open', r));
let id = 0; const pending = new Map();
const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const workerSessions = [];
ws.on('message', async (m) => {
  const msg = JSON.parse(m);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Target.attachedToTarget' && msg.params.targetInfo.type === 'worker') {
    const sid = msg.params.sessionId;
    const r = await send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.RATE ?? 4) }, sid);
    console.log('worker attached', msg.params.targetInfo.url, 'setCPUThrottlingRate ->', JSON.stringify(r.error ?? r.result));
    await send('Runtime.runIfWaitingForDebugger', {}, sid);
    workerSessions.push(sid);
  }
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:43555/');
const targets = (await send('Target.getTargets')).result.targetInfos;
const pt = targets.find((t) => t.type === 'page' && t.url.includes('43555'));
const att = await send('Target.attachToTarget', { targetId: pt.targetId, flatten: true });
await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, att.result.sessionId);
const r = await page.evaluate(async () => {
  const hex = await (await fetch('/out/blink/blink.ino.hex')).text();
  const w = new Worker('/worker.js', { type: 'module' });
  const out = await new Promise((res) => { w.onmessage = (e) => res(e.data); w.postMessage({ hex, simSeconds: 5, adc: [], listeners: true }); });
  w.terminate(); return out;
});
console.log('rate', process.env.RATE ?? 4, JSON.stringify(r));
await browser.close(); ws.close(); server.close();
