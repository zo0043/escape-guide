#!/usr/bin/env node
// K1 CDP 实测脚本（一次性验证，非构建链）
// 起 headless chromium，对 astro preview 的本地服务做 computed style 断言。
// 用法：node scripts/cdp-verify.mjs  （需已 npm run preview，端口 4321）
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/home/ubuntu/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const PORT = 9333;
const BASE = 'http://127.0.0.1:4321/escape-guide';

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--window-size=1440,900', '--force-color-profile=srgb', 'about:blank',
], { stdio: ['ignore', 'ignore', 'inherit'] });

let target;
try {
  // 等 DevTools 起来
  let list = null;
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch {}
    if (list?.length) break;
  }
  const page = list.find((t) => t.type === 'page');
  const created = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${BASE}/`, { method: 'PUT' })).json().catch(() => null);
  target = created ?? page;
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error('JS exception: ' + JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text));
    return r.result?.result?.value;
  };
  const nav = async (url) => {
    await send('Page.navigate', { url });
    for (let i = 0; i < 60; i++) {
      await sleep(250);
      const s = await evalJs('document.readyState');
      if (s === 'complete') break;
    }
    await evalJs(`document.fonts ? document.fonts.ready : Promise.resolve()`);
    await sleep(300);
  };

  const results = {};

  // ── 浅色模式 ─────────────────────────────────────────────────────────
  await nav(`${BASE}/`);
  results.light = await evalJs(`(() => {
    const cs = getComputedStyle(document.body);
    const h1 = document.querySelector('.hero-title');
    const nav = document.querySelector('.site-nav a');
    const b = document.querySelector('.hero-lede b');
    const face = [...document.fonts].find(f => f.family.includes('TsangerJinKai02'));
    return {
      readyState: document.readyState,
      fontsStatus: document.fonts.status,
      fontFace: face ? { family: face.family, weight: face.weight, status: face.status, style: face.style } : null,
      fontCheck16px: document.fonts.check('16px TsangerJinKai02'),
      bodyFont: cs.fontFamily,
      bodyLineHeight: cs.lineHeight,
      bodyFontWeight: cs.fontWeight,
      bodyBg: cs.backgroundColor,
      bodyColor: cs.color,
      h1Font: h1 && getComputedStyle(h1).fontFamily,
      h1LineHeight: h1 && getComputedStyle(h1).lineHeight,
      h1Weight: h1 && getComputedStyle(h1).fontWeight,
      navFont: nav && getComputedStyle(nav).fontFamily,
      bColor: b && getComputedStyle(b).color,
      bWeight: b && getComputedStyle(b).fontWeight,
    };
  })()`);

  // 条目页：strong 语义 + 行高 + 阴影
  const entry = `${BASE}/凯利公式仓位下注多少/`;
  await nav(entry);
  results.entry = await evalJs(`(() => {
    const strong = document.querySelector('.entry-body strong');
    const p = document.querySelector('.entry-body p');
    const h2 = document.querySelector('.entry-body h2');
    const h3 = document.querySelector('.entry-body h3');
    const th = document.querySelector('.entry-body thead th') || document.querySelector('.compare thead th');
    const menu = document.querySelector('.nav-drop-menu');
    const menuCs = getComputedStyle(menu);
    return {
      url: location.pathname,
      strongCount: document.querySelectorAll('.entry-body strong').length,
      strongColor: strong && getComputedStyle(strong).color,
      strongWeight: strong && getComputedStyle(strong).fontWeight,
      pLineHeight: p && getComputedStyle(p).lineHeight,
      pFont: p && getComputedStyle(p).fontFamily,
      h2LineHeight: h2 && getComputedStyle(h2).lineHeight,
      h2Weight: h2 && getComputedStyle(h2).fontWeight,
      h3LineHeight: h3 && getComputedStyle(h3).lineHeight,
      thFont: th && getComputedStyle(th).fontFamily,
      navDropShadow: menuCs.boxShadow,
    };
  })()`);

  // ── 暗色模式 ─────────────────────────────────────────────────────────
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await sleep(300);
  results.dark = await evalJs(`(() => {
    const cs = getComputedStyle(document.body);
    const a = document.querySelector('.hero-lede b') || document.querySelector('strong');
    return { bodyBg: cs.backgroundColor, bodyColor: cs.color, accentSample: a && getComputedStyle(a).color };
  })()`);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });

  // ── 打印模式 ─────────────────────────────────────────────────────────
  await send('Emulation.setEmulatedMedia', { media: 'print' });
  await sleep(300);
  results.print = await evalJs(`(() => {
    const cs = getComputedStyle(document.body);
    const card = document.querySelector('.quick-card, .start-card');
    const header = document.querySelector('.site-header');
    return {
      bodyBg: cs.backgroundColor,
      bodyColor: cs.color,
      cardBg: card && getComputedStyle(card).backgroundColor,
      headerDisplay: header && getComputedStyle(header).display,
      progressDisplay: (() => { const p = document.querySelector('.read-progress'); return p && getComputedStyle(p).display; })(),
    };
  })()`);

  console.log(JSON.stringify(results, null, 2));
  ws.close();
} finally {
  chrome.kill('SIGKILL');
}
