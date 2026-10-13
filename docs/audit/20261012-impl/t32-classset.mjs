#!/usr/bin/env node
// t32 样式纪律（Phase 2）：dist CSS 定义的类集合 vs 136 个页面输出的类集合（AGENTS.md #9）
// 重点：Phase 2 新增 .concl-bar/.cb-* / .path-chips/.path-pos / .entry-nav/.read-progress / .nf-suggest*
// + Phase 1 重点类延续 + .concl* 本次必须在场（U-1 已落地，Phase 1 时的「必须缺席」口径作废）
// Shiki 双主题的声明性钩子类（无专属 CSS，靠内联 style + .astro-code 规则）按机制豁免。
// 用法：node docs/audit/20261012-impl/t32-classset.mjs （须在 build 之后）
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const DIST = path.join(ROOT, 'dist');

const cssName = fs.readdirSync(path.join(DIST, '_astro')).find((f) => f.endsWith('.css'));
const css = fs.readFileSync(path.join(DIST, '_astro', cssName), 'utf8');
const cssClasses = new Set([...css.matchAll(/\.(?=[a-zA-Z\u4e00-\u9fff])[a-zA-Z\u4e00-\u9fff][a-zA-Z0-9_\-\u4e00-\u9fff]*/g)].map((m) => m[0].slice(1)));

const htmlFiles = fs.readdirSync(DIST, { recursive: true }).filter((f) => String(f).endsWith('.html'));
const pageClasses = new Set();
for (const f of htmlFiles) {
  const html = fs.readFileSync(path.join(DIST, f), 'utf8');
  for (const m of html.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c) pageClasses.add(c);
}

// 页面 class 属性里以 class=" 开头但属多类（mod mod-howto 等）已按空白拆分覆盖。
// 注意：data 属性/其他属性值中的 "class" 字样不计（正则只匹配 class="...").

const SHIKI_HOOKS = new Set(['astro-code', 'astro-code-themes', 'github-dark', 'github-light', 'line']);
const isShikiRule = /\.astro-code,\s*\.astro-code span\s*\{\s*color:var\(--shiki-dark\)/.test(css.replace(/\n/g, ' '));

const FOCUS = [
  // Phase 2 新增（t25/t27/t29/t30）
  'concl-bar', 'cb-title', 'cb-num', 'cb-risk',
  'path-chips', 'path-pos',
  'entry-nav', 'read-progress',
  'nf-suggest', 'nf-suggest-label', 'nf-suggest-entries', 'nf-suggest-chips',
  // Phase 1 延续（t11/t14 重点类）
  'layer-理念', 'layer-执行', 'layer-档案', 'layer-工具', 'layer-tag',
  'nav-drop', 'nav-drop-sum', 'nav-drop-menu', 'nav-drop-glabel',
  'alias-chip', 'alias-gchips', 'alias-ghead', 'alias-gcount',
  'qc-more', 'quick-cards', 'row-anchor', 'dir-item', 'dom-details', 'dom-summary',
  'topic-nav', 'topic-layer-head', 'backlinks', 'site-nav', 'site-title', 'ev-flag',
];

let fail = 0;
console.log(`CSS 类 ${cssClasses.size} 个 · 页面输出类 ${pageClasses.size} 个 · html ${htmlFiles.length} 个`);
console.log('Shiki 钩子白名单在场：' + SHIKI_HOOKS.size + ' 类；.astro-code 规则在场：' + (isShikiRule ? '✓' : '✗'));
console.log('\n-- 重点类（CSS 在场 × 页面在场）--');
for (const c of FOCUS) {
  const inCss = cssClasses.has(c), inPage = pageClasses.has(c);
  if (!inCss || !inPage) fail++;
  console.log(`${inCss && inPage ? '✓' : '✗'} ${c}  css:${inCss ? '✓' : '✗'}  page:${inPage ? '✓' : '✗'}`);
}
// .concl* 形态统计（U-1 结论条本次必须在场）
const conclCss = [...cssClasses].filter((c) => c.startsWith('concl') || c.startsWith('cb-'));
const conclPage = [...pageClasses].filter((c) => c.startsWith('concl') || c.startsWith('cb-'));
console.log(`\n.concl*/.cb-*：CSS ${conclCss.length} 个（${conclCss.join(', ')}）· 页面 ${conclPage.length} 个（${conclPage.join(', ')}）`);
if (!conclCss.includes('concl-bar') || !conclPage.includes('concl-bar')) { fail++; console.log('✗ .concl-bar 未双侧在场'); }

// 悬空类：页面输出但 CSS 无定义（Shiki 钩子豁免）
const dangling = [...pageClasses].filter((c) => !cssClasses.has(c) && !SHIKI_HOOKS.has(c)).sort();
console.log(`\n悬空类（页面有 / CSS 无）：${dangling.length} 个${dangling.length ? '：' + dangling.join(', ') : ''}`);
if (dangling.length) fail++;

// CSS 有但页面未用（信息项，不计失败——Phase 1 同口径：主题态/媒体态选择器常态未用）
const unused = [...cssClasses].filter((c) => !pageClasses.has(c) && !SHIKI_HOOKS.has(c)).sort();
console.log(`CSS 未用（信息项）：${unused.length} 个${unused.length ? '：' + unused.join(', ') : ''}`);

console.log(`\n===== t32 样式纪律结论: ${fail === 0 ? 'PASS' : 'FAIL（' + fail + ' 项）'} =====`);
process.exit(fail === 0 ? 0 : 1);
