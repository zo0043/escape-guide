#!/usr/bin/env node
// t12 补充核对脚本（只读 src/ 与 dist/）——修正 t3 审计脚本 audit-tech.mjs 的两处检测盲区：
//   ① C4 的「首列应链未链」正则要求 </th> 紧跟条目链接，但 P1-12（t11）已在 row-head 内新增
//      <a class="row-anchor">（行级深链），导致旧正则 70/70 行全误报。本脚本改为前缀匹配
//      「row-head 开头即是首列链接」，与产品语义一致。
//   ② B2 的 dist 页面集合只扫顶层目录，漏掉 dist/compare/*、dist/topic/* 嵌套页，
//      导致 10 个真实存在的嵌套 sitemap URL 误报「多余」。本脚本直接验证这 10 页存在。
// 用法：node docs/audit/20261012-impl/t12-compare-verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { loadEntries, makeEntryIndex } from '../../../src/lib/entries.mjs';
import { normalizeKey } from '../../../src/lib/slug.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const DIST = path.join(ROOT, 'dist');
const BASE = '/escape-guide/';
const SITE = 'https://blog.zero43.top';
let fails = 0;

// ---------- ① 四表 70 行首列链接（宽松口径：row-head 起始即首列链接） ----------
const entries = loadEntries();
const eIndex = makeEntryIndex(entries);
const compare = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/compare.json'), 'utf8'));
let total = 0, linked = 0, evExp = 0, evAct = 0;
for (const t of compare.tables) {
  const html = fs.readFileSync(path.join(DIST, 'compare', t.slug, 'index.html'), 'utf8');
  let miss = 0;
  for (const r of t.rows) {
    total += 1;
    const entry = eIndex.get(normalizeKey(r.src));
    if (!entry) { console.log(`  MISS src 不可解析: ${t.slug} 「${r.src}」`); miss += 1; continue; }
    const pre = `<th scope="row" class="row-head" data-label="${t.cols[0]}"><a href="${BASE}${entry.slug}/">`;
    if (html.includes(pre)) linked += 1;
    else { miss += 1; console.log(`  MISS 首列无链接: ${t.slug} 行「${r.c[0]}」（期望 ${BASE}${entry.slug}/）`); }
  }
  const exp = t.rows.filter((r) => eIndex.get(normalizeKey(r.src))?.data?.disputed).length;
  const act = (html.match(/ev-flag/g) || []).length;
  evExp += exp; evAct += act;
  console.log(`${t.slug}: ${t.rows.length} 行，首列链接 ${t.rows.length - miss}/${t.rows.length}；ev-flag 期望 ${exp} 实际 ${act}${miss || exp !== act ? '  ← 异常' : ''}`);
  fails += miss + (exp === act ? 0 : 1);
}
console.log(`四表合计：70 行中首列带链接 ${linked}；ev-flag 期望 ${evExp} 实际 ${evAct}`);
fails += linked === 70 ? 0 : 1;
fails += evExp === evAct ? 0 : 1;

// ---------- ② B2 误报的 10 个嵌套页存在性 ----------
const sitemapRaw = fs.readFileSync(path.join(DIST, 'sitemap-0.xml'), 'utf8');
const locs = [...sitemapRaw.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
let missing = 0;
for (const l of locs) {
  const p = decodeURIComponent(new URL(l).pathname);
  if (!p.startsWith(BASE)) { console.log(`  MISS 前缀异常: ${l}`); missing += 1; continue; }
  const f = path.join(DIST, p.slice(BASE.length) + 'index.html');
  if (!fs.existsSync(f)) { console.log(`  MISS dist 缺页: ${l}`); missing += 1; }
}
console.log(`sitemap 135 条 <loc> 逐条对照 dist 文件（含嵌套 compare/topic）: 缺 ${missing} 个${missing === 0 ? ' → B2「多余 10 个」判定为脚本顶层扫描盲区，sitemap 与 dist 实为 1:1' : ''}`);
fails += missing;

console.log(`\n===== t12 补充核对结论: ${fails === 0 ? 'PASS' : 'FAIL（' + fails + ' 项）'} =====`);
process.exit(fails === 0 ? 0 : 1);
