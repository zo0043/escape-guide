#!/usr/bin/env node
// t12 P0-3 验收脚本（只读 src/ 与 dist/，不修改任何文件）。
// 验收标准：dist 首页 PATHS 渲染出的 12+3 个标题链接 ⊆「投资体系地图」条目 wikilink 目标集合。
//   - 12 = 三处境 × 4 步的步骤链接（dist start-here 区内 .sc-path 中的条目链接，href 反查标题）
//   - 3 = 三个「完整五步见…」回链，必须全部指向地图条目 slug
// 口径：标题归一化用站点同款 normalizeKey（trim+小写+去空白，标点敏感，src/lib/slug.mjs）。
import fs from 'node:fs';
import path from 'node:path';
import { loadEntries, makeEntryIndex } from '../../../src/lib/entries.mjs';
import { normalizeKey, slugify } from '../../../src/lib/slug.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const BASE = '/escape-guide/';
const ok = [];
const bad = [];
const hit = (cond, msg) => (cond ? ok : bad).push(msg);

// ---------- 1. 站点条目索引（与 byTitle 同款口径） ----------
const entries = loadEntries();
const eIndex = makeEntryIndex(entries);
const bySlug = new Map(entries.map((e) => [e.slug, e]));
const MAP_TITLE = '投资体系地图:六个环节与你的入口';
const mapEntry = eIndex.get(normalizeKey(MAP_TITLE));
hit(!!mapEntry, `MAP_TITLE 可解析: ${mapEntry ? 'HIT → slug=' + mapEntry.slug : 'MISS'}`);

// ---------- 2. 地图条目 wikilink 目标集合（整条） ----------
const mapRaw = fs.readFileSync(path.join(ROOT, 'src/content/escape', mapEntry.file), 'utf8');
const wlSet = new Set();
for (const m of mapRaw.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)) wlSet.add(normalizeKey(m[1].trim()));
console.log(`地图条目 wikilink 目标（归一化后）共 ${wlSet.size} 个`);

// ---------- 3. src 侧：PATHS 常量解析（交叉参照，渲染前的事实源） ----------
const idxSrc = fs.readFileSync(path.join(ROOT, 'src/pages/index.astro'), 'utf8');
const pathsBlock = idxSrc.slice(idxSrc.indexOf('const PATHS = ['), idxSrc.indexOf('\n];', idxSrc.indexOf('const PATHS = [')));
const lit = [...pathsBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]);
hit(lit.length === 21, `PATHS 字面量 21 个（3×7：num/title/desc/4步）: ${lit.length}`);
const srcSteps = [];
for (let i = 0; i < 3; i++) srcSteps.push(lit.slice(i * 7 + 3, i * 7 + 7));
let srcHit = 0;
for (const s of srcSteps.flat()) {
  if (wlSet.has(normalizeKey(s))) srcHit += 1;
  else console.log(`  [src] MISS: ${s}`);
}
console.log(`[src] PATHS 12 步 ⊆ 地图 wikilink 目标集: ${srcHit}/12 ${srcHit === 12 ? 'HIT' : 'MISS'}`);

// ---------- 4. dist 侧：start-here 区渲染出的标题链接 ----------
const distIdx = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
const startAt = distIdx.indexOf('<div class="start-here">');
hit(startAt >= 0, 'dist 首页存在 start-here 区');
const region = distIdx.slice(startAt, distIdx.indexOf('</section>', startAt));
const anchors = [...region.matchAll(/<a ([^>]*)>([^<]*)<\/a>/g)];
const scTitle = [], stepLinks = [], mapLinks = [];
for (const m of anchors) {
  const attrs = m[1];
  const href = (attrs.match(/href="([^"]+)"/) ?? [])[1];
  const text = m[2];
  if (!href || !href.startsWith(BASE)) continue;
  const slug = decodeURIComponent(href.slice(BASE.length).replace(/\/$/, ''));
  if (/class="sc-title"/.test(attrs)) scTitle.push({ href, text, slug });
  else if (href.endsWith(`/${mapEntry.slug}/`) || href.endsWith(mapEntry.slug)) mapLinks.push({ href, text, slug });
  else stepLinks.push({ href, text, slug });
}
console.log(`dist start-here 链接：sc-title ${scTitle.length} / 步骤 ${stepLinks.length} / 地图回链 ${mapLinks.length}（合计 ${anchors.length}）`);

// 4a. 12 个步骤链接 ⊆ 地图 wikilink 目标集（href 反查标题）
let dHit = 0;
const stepTitles = new Set();
for (const l of stepLinks) {
  const e = bySlug.get(l.slug);
  if (!e) { console.log(`  [dist] 步骤链接反查 MISS: ${l.href} → ${l.text}`); continue; }
  stepTitles.add(e.title);
  if (wlSet.has(normalizeKey(e.title))) dHit += 1;
  else console.log(`  [dist] MISS（不在地图目标集）: ${e.title}（链接文本「${l.text}」）`);
}
console.log(`[dist] 步骤链接 ${stepLinks.length} 个（去重 ${stepTitles.size} 条）⊆ 地图 wikilink 目标集: ${dHit}/${stepLinks.length} ${dHit === stepLinks.length && stepLinks.length === 12 ? 'HIT' : 'MISS'}`);

// 4b. 3 个回链全部指向地图条目
const mapOk = mapLinks.length === 3 && mapLinks.every((l) => l.slug === mapEntry.slug);
hit(mapOk, `地图回链 3/3 指向 ${mapEntry.slug}: ${mapOk ? 'HIT' : 'MISS'}`);

// 4c. 交叉一致性：dist 步骤标题集合 === src PATHS 步骤标题集合（渲染未丢字）
const srcTitles = new Set(srcSteps.flat());
const sameSet = srcTitles.size === stepTitles.size && [...srcTitles].every((t) => stepTitles.has(t));
hit(sameSet, `dist 渲染 12 步标题集合 === src PATHS 标题集合: ${sameSet ? 'HIT' : 'MISS'}`);

// 4d. sc-title（3 个）应指向各 path 第 1 步
let scOk = 0;
scTitle.forEach((l, i) => {
  if (bySlug.get(l.slug)?.title === srcSteps[i][0]) scOk += 1;
});
hit(scOk === 3, `sc-title 3/3 指向各路径第 1 步: ${scOk}/3 ${scOk === 3 ? 'HIT' : 'MISS'}`);

// ---------- 结论 ----------
const pass = bad.length === 0;
console.log(`\n===== t12 P0-3 验收结论: ${pass ? 'PASS（全部 HIT）' : 'FAIL（' + bad.length + ' 项 MISS）'} =====`);
if (!pass) for (const b of bad) console.log(`  MISS: ${b}`);
process.exit(pass ? 0 : 1);
