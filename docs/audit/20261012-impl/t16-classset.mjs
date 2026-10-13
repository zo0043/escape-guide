#!/usr/bin/env node
// t16 样式纪律脚本：CSS 定义的类集合 vs 页面实际输出的类集合（AGENTS.md 纪律 #9）
// 重点项：.layer-* 四色（P1-13）、.nav-drop*（P1-9）应在场；.concl*（U-1 结论条，P2 未做）必须缺席。
// 用法：node docs/audit/20261012-impl/t16-classset.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const DIST = path.join(ROOT, 'dist');
let fail = 0;

// --- CSS 侧：全部 dist/_astro/*.css 中的类定义 ---
const cssFiles = fs.readdirSync(path.join(DIST, '_astro')).filter((f) => f.endsWith('.css'));
let cssText = cssFiles.map((f) => fs.readFileSync(path.join(DIST, '_astro', f), 'utf8')).join('\n');
const CLASS_RE = /\.([a-zA-Z\u4e00-\u9fff][a-zA-Z0-9_\-\u4e00-\u9fff]*)/g;
const cssClasses = new Set();
for (const m of cssText.matchAll(CLASS_RE)) cssClasses.add(m[1]);

// --- 页面侧：全部 dist HTML 的 class 属性输出 ---
const htmlFiles = [];
{
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) htmlFiles.push(p);
    }
  };
  walk(DIST);
}
const pageClasses = new Set();
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/).filter(Boolean)) pageClasses.add(c);
  }
}

// --- 重点项 ---
const focus = ['layer-理念', 'layer-执行', 'layer-档案', 'layer-工具', 'nav-drop', 'nav-drop-sum', 'nav-drop-menu', 'nav-drop-menu-in', 'nav-drop-group', 'nav-drop-glabel', 'layer-jump', 'topic-layer-head', 'alias-chip-lead', 'alias-entry-dim', 'alias-ghead', 'alias-gcount', 'alias-gchips', 'alias-gchip', 'alias-item', 'qc-more', 'row-anchor', 'skip-link', 'backlinks'];
console.log(`CSS 类 ${cssClasses.size} 个；页面输出类 ${pageClasses.size} 个（${htmlFiles.length} 个 html）\n`);
console.log('重点类在场情况（期望：CSS 与页面均在场）：');
for (const c of focus) {
  const inCss = cssClasses.has(c);
  const onPage = pageClasses.has(c);
  const ok = inCss && onPage;
  if (!ok) fail += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'} .${c}  css:${inCss ? '✓' : '✗'}  page:${onPage ? '✓' : '✗'}`);
}

// --- .concl* 必须缺席（U-1 结论条是 P2，确认未被顺手加上） ---
const conclCss = [...cssClasses].filter((c) => c.startsWith('concl'));
const conclPage = [...pageClasses].filter((c) => c.startsWith('concl'));
console.log(`\n.concl*（P2 未做项）：CSS 中 ${conclCss.length} 个${conclCss.length ? ' ' + conclCss.join(',') : ''}；页面 ${conclPage.length} 个${conclPage.length ? ' ' + conclPage.join(',') : ''}`);
if (conclCss.length || conclPage.length) fail += 1;

// --- 悬空类：页面输出但 CSS 未定义（静默失效风险，AGENTS.md #9） ---
// 白名单：Astro Shiki 双主题集成的声明钩子类——token 实际样式由内联 style="--shiki-dark:…"
// + CSS 规则 .astro-code{color:var(--shiki-dark)…}（[data-theme] 块内）提供，github-light/
// github-dark/astro-code-themes/line 四个类本身无专属 CSS 属该集成机制，非站点悬空类。
const SHIKI_HOOKS = new Set(['astro-code', 'astro-code-themes', 'github-dark', 'github-light', 'line']);
const shikiCssPresent = /\.astro-code,\.astro-code span\{color:var\(--shiki-dark\)/.test(cssText);
const dangling = [...pageClasses].filter((c) => !cssClasses.has(c) && !SHIKI_HOOKS.has(c)).sort();
const shikiFlagged = [...pageClasses].filter((c) => SHIKI_HOOKS.has(c) && !cssClasses.has(c));
console.log(`\n页面输出但 CSS 未定义的类（悬空，期望 0）：${dangling.length === 0 ? '无 ✓' : dangling.join(' ')}`);
console.log(`Shiki 集成钩子类（白名单豁免，.astro-code 规则在场=${shikiCssPresent ? '✓' : '✗'}）：${shikiFlagged.join(' ') || '无'}`);
if (dangling.length || !shikiCssPresent) fail += 1;

// --- 信息项：CSS 定义但页面未输出（可能为备用/媒体查询内类，仅计数） ---
const unused = [...cssClasses].filter((c) => !pageClasses.has(c)).sort();
console.log(`CSS 定义但页面未输出的类（信息项，备用/未触达）：${unused.length} 个${unused.length ? '：' + unused.join(' ') : ''}`);

console.log(`\n===== t16 样式纪律结论: ${fail === 0 ? 'PASS' : 'FAIL（' + fail + ' 项）'} =====`);
process.exit(fail === 0 ? 0 : 1);
