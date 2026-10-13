#!/usr/bin/env node
// 技术审计脚本 v2（t3，docs/audit/tmp/，用后保留）。
// 只读 src/ dist/ scripts/；不修改任何源文件。
// 修正 v1：sitemap/rss/href 均做 percent-decode 后再与 dist 目录比对（v1 把编码差异误报为缺失）。
import fs from 'node:fs';
import path from 'node:path';
import { loadEntries, makeEntryIndex } from '../../../src/lib/entries.mjs';
import { slugify, normalizeKey } from '../../../src/lib/slug.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const DIST = path.join(ROOT, 'dist');
const BASE = '/escape-guide/';
const SITE = 'https://blog.zero43.top';
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

const out = [];
const P = (...a) => out.push(a.join(' '));
const section = (t) => P(`\n===== ${t} =====`);

// ---------- A. 条目加载与 slug 一致性 ----------
section('A. slug 与文件名一致性');
const entries = loadEntries();
P(`loadEntries(): ${entries.length} 条（assertUniqueSlugs 已通过）`);
let mismatch = 0;
for (const e of entries) {
  const fileSlug = slugify(e.basename);
  if (fileSlug !== e.slug) { mismatch += 1; P(`MISMATCH: file=${e.file} title=${e.title} 标题slug=${e.slug} 文件slug=${fileSlug}`); }
}
P(mismatch === 0 ? `A1 OK：${entries.length} 条 slugify(title) 与 slugify(文件名) 全部一致` : `A1 不一致 ${mismatch} 条`);
const slugs = entries.map((e) => e.slug).sort();
const dePunct = (s) => s.replace(/[^\p{sc=Han}a-z0-9-]/gu, '');
const nearMiss = [];
for (let i = 0; i < slugs.length; i++) {
  for (let j = i + 1; j < slugs.length; j++) {
    if (dePunct(slugs[i]) === dePunct(slugs[j])) nearMiss.push(`「${slugs[i]}」==「${slugs[j]}」(仅标点差异)`);
    if (slugs[j].startsWith(slugs[i])) nearMiss.push(`「${slugs[i]}」是「${slugs[j]}」的前缀`);
  }
}
P(`A2 去标点后碰撞/前缀包含: ${nearMiss.length === 0 ? '无' : nearMiss.join('；')}`);
let missingDist = 0;
for (const e of entries) if (!fs.existsSync(path.join(DIST, e.slug, 'index.html'))) { missingDist += 1; P(`A3 缺 dist: ${e.slug}`); }
P(missingDist === 0 ? `A3 OK：${entries.length} 条全部有 dist/<slug>/index.html` : `A3 缺 ${missingDist}`);
const distDirs = new Set(fs.readdirSync(DIST, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== '_astro').map((d) => d.name));
const entrySlugs = new Set(entries.map((e) => e.slug));
P(`A4 dist 多余顶层目录: ${JSON.stringify([...distDirs].filter((d) => !entrySlugs.has(d) && !['about','aliases','compare','topic'].includes(d)))}`);
P(`A4 dist 缺失条目目录: ${JSON.stringify([...entrySlugs].filter((s) => !distDirs.has(s)))}`);

// ---------- B. sitemap 与 dist 比对（已 decode） ----------
section('B. sitemap-0.xml vs dist');
const sitemapRaw = fs.readFileSync(path.join(DIST, 'sitemap-0.xml'), 'utf8');
const locs = [...sitemapRaw.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
P(`sitemap-0.xml 共 ${locs.length} 条 <loc>`);
const badBase = locs.filter((l) => !l.startsWith(SITE + BASE));
P(`B1 非 ${SITE + BASE} 前缀: ${JSON.stringify(badBase)}`);
const urlSet = new Set(locs.map((l) => dec(new URL(l).pathname)));
const distPages = new Set([BASE]);
for (const d of fs.readdirSync(DIST, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === '_astro') continue;
  if (fs.existsSync(path.join(DIST, d.name, 'index.html'))) distPages.add(BASE + d.name + '/');
}
const extraSitemap = [...urlSet].filter((u) => !distPages.has(u)).sort();
const missingSitemap = [...distPages].filter((u) => !urlSet.has(u)).sort();
P(`B2 sitemap 多余: ${extraSitemap.length === 0 ? '无' : JSON.stringify(extraSitemap)}`);
P(`B2 sitemap 缺失: ${missingSitemap.length === 0 ? '无' : JSON.stringify(missingSitemap)}`);
P(`B3 lastmod 属性数: ${(sitemapRaw.match(/<lastmod>/g) || []).length}`);
P(`B4 robots.txt: ${JSON.stringify(fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8'))}`);

// ---------- C. compare.json 核对 ----------
section('C. compare.json vs 源条目');
const compare = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/compare.json'), 'utf8'));
const eIndex = makeEntryIndex(entries);
const rawBySlug = new Map();
for (const e of entries) rawBySlug.set(e.slug, fs.readFileSync(path.join(ROOT, 'src/content/escape', e.file), 'utf8'));

// 数字/日期 token 提取（站点数字形态：整数/小数/百分号/日期/带千分位）
const NUM_RE = /\d{4}-\d{1,2}-\d{1,2}|\d[\d,]*(?:\.\d+)?/g;
let rowsTotal = 0, srcMissing = 0, pageFail = 0, cellsTotal = 0, cellsVerbatim = 0, cellsNumeric = 0, numericMiss = 0;
const srcMissList = [], pageFailList = [], numericMissList = [];
for (const t of compare.tables) {
  for (const r of t.rows) {
    rowsTotal += 1;
    const hitPage = eIndex.get(r.src);
    const hitNorm = eIndex.get(normalizeKey(r.src));
    if (!hitNorm) { srcMissing += 1; srcMissList.push(`${t.slug}: 「${r.src}」不存在`); continue; }
    if (!hitPage) { pageFail += 1; pageFailList.push(`${t.slug}: src=「${r.src}」→ 页面首列无链接`); }
    const raw = rawBySlug.get(hitNorm.slug) ?? '';
    for (const cell of r.c) {
      cellsTotal += 1;
      if (raw.includes(cell)) cellsVerbatim += 1;
      const tokens = new Set(cell.match(NUM_RE) || []);
      for (const tok of tokens) {
        cellsNumeric += 1;
        if (!raw.includes(tok)) numericMiss += 1, numericMissList.push(`${t.slug}: 「${cell}」中数字「${tok}」不在 ${hitNorm.file}`);
      }
    }
    for (const n of r.nums ?? []) {
      cellsNumeric += 1;
      if (!raw.includes(n)) numericMiss += 1, numericMissList.push(`${t.slug}: nums「${n}」不在 ${hitNorm.file}`);
    }
  }
}
P(`C1 ${rowsTotal} 行：src 不存在 ${srcMissing}；页查失败（首列失链） ${pageFail}`);
for (const s of pageFailList) P(`  ${s}`);
P(`C2 单元格 ${cellsTotal} 个：逐字命中 ${cellsVerbatim}（其余为表格摘要措辞，站点对「数字」作逐字承诺）`);
P(`C3 单元格/nums 数字 token 共 ${cellsNumeric} 个，未在源条目逐字找到 ${numericMiss}：`);
for (const s of numericMissList) P(`  ${s}`);

// C4. dist/compare 页核对（行头链接按页面语义判定）
for (const t of compare.tables) {
  const html = fs.readFileSync(path.join(DIST, 'compare', t.slug, 'index.html'), 'utf8');
  let missLink = 0; const missLinkRows = [];
  for (const r of t.rows) {
    const entry = eIndex.get(normalizeKey(r.src));
    if (!entry) continue;
    // 找到该行：以「行头 + 首格文本应渲染为链接」判定
    const cellEsc = r.c[0].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cellRe = cellEsc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const linkedRe = new RegExp(`<th scope="row" class="row-head" data-label="${t.cols[0]}"><a href="${BASE}${entry.slug}/">${cellRe}</a></th>`);
    if (!linkedRe.test(html)) { missLink += 1; missLinkRows.push(r.c[0]); }
  }
  let evFlag = 0;
  for (const r of t.rows) {
    const entry = eIndex.get(normalizeKey(r.src));
    if (entry?.data?.disputed) evFlag += 1;
  }
  P(`C4 dist/compare/${t.slug}: 首列应链未链 ${missLink} 行 ${JSON.stringify(missLinkRows)}；该表源条目 disputed=true 有 ${evFlag} 条（应渲染「争议」小标 ${evFlag} 处，页面实际 ${(html.match(/ev-flag/g) || []).length} 处）`);
}

// ---------- D. dist 链接完整性（已 decode） ----------
section('D. dist href 扫描');
const htmlFiles = [];
(function walk(dir) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) { if (d.name !== '_astro') walk(p); continue; }
    if (d.name.endsWith('.html')) htmlFiles.push(p);
  }
}(DIST));
P(`D0 扫描 ${htmlFiles.length} 个 html 文件`);
const dead = [], noBaseAbs = [], anchorMissing = [], external = new Set();
let literalWl = 0, ogWl = 0, totalHrefs = 0;
const literalPages = [];
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(DIST, path.dirname(f));
  const pageUrl = BASE + (rel ? rel.replace(/\\/g, '/') + '/' : '');
  for (const m of html.matchAll(/\bhref="([^"]*)"/g)) {
    const href = decode(m[1]);
    totalHrefs += 1;
    if (/^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) {
      if (/^https?:/.test(href)) external.add(new URL(href).host);
      continue;
    }
    if (href.startsWith('#')) {
      const id = href.slice(1);
      if (id && !html.includes(`id="${id}"`)) anchorMissing.push(`${pageUrl}#${id}`);
      continue;
    }
    let targetPath;
    if (href.startsWith('/')) {
      if (!href.startsWith(BASE)) { noBaseAbs.push(`${pageUrl} → ${href}`); continue; }
      targetPath = dec(href).slice(BASE.length);
    } else {
      targetPath = dec(path.posix.normalize(path.posix.join(pageUrl.slice(BASE.length), href)));
    }
    if (targetPath.startsWith('../')) { dead.push(`${pageUrl} → ${href}（越界）`); continue; }
    const candidates = targetPath.endsWith('/') ? [targetPath + 'index.html'] : [targetPath, targetPath + '/index.html', targetPath + '.html'];
    if (!candidates.some((c) => fs.existsSync(path.join(DIST, c)))) dead.push(`${pageUrl} → ${href}`);
  }
  const body = html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '');
  const wl = [...body.matchAll(/\[\[/g)];
  if (wl.length) { literalWl += wl.length; literalPages.push(`${pageUrl}: ${wl.length} 处`); }
  for (const mm of html.matchAll(/<(?:meta property="og:description"|meta name="description")[^>]*content="([^"]*)"/g)) {
    if (mm[1].includes('[[')) { ogWl += 1; P(`  OG 残留: ${pageUrl}: ${mm[1].slice(0, 80)}`); }
  }
}
P(`D1 href 总数 ${totalHrefs}`);
P(`D2 绝对路径缺 ${BASE} 前缀: ${noBaseAbs.length === 0 ? '无' : noBaseAbs.join(' | ')}`);
P(`D3 站内死链: ${dead.length === 0 ? '无' : ''}`);
for (const s of [...new Set(dead)]) P(`  ${s}`);
P(`D4 锚点缺失: ${[...new Set(anchorMissing)].join(' | ') || '无'}`);
P(`D5 代码块外字面 [[ : ${literalWl} 处 ${literalPages.join(' | ')}`);
P(`D6 og/meta description 残留 [[ : ${ogWl}`);
P(`D7 外链域名: ${[...external].sort().join(', ')}`);

// ---------- E. rss.xml（已 decode） ----------
section('E. rss.xml 核对');
const rss = fs.readFileSync(path.join(DIST, 'rss.xml'), 'utf8');
const rssItems = [...rss.matchAll(/<item>[\s\S]*?<\/item>/g)].map((m) => m[0]);
P(`E0 <item> 数: ${rssItems.length}（条目 ${entries.length}）`);
let rssBad = 0, rssWl = 0;
const pubDates = new Map();
for (const it of rssItems) {
  const link = (it.match(/<link>([^<]*)<\/link>/) ?? [])[1];
  const title = (it.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '';
  const desc = (it.match(/<description>([^<]*)<\/description>/) ?? [])[1] ?? '';
  const pd = (it.match(/<pubDate>([^<]*)<\/pubDate>/) ?? [])[1] ?? '';
  if (title.includes('[[') || desc.includes('[[')) rssWl += 1;
  if (pd) pubDates.set(pd.slice(0, 10), (pubDates.get(pd.slice(0, 10)) ?? 0) + 1);
  if (!link) continue;
  const u = new URL(link);
  const p = dec(u.pathname);
  if (u.origin !== SITE || !p.startsWith(BASE)) { rssBad += 1; P(`  前缀异常: ${link}`); continue; }
  const ok = fs.existsSync(path.join(DIST, p.slice(BASE.length) + 'index.html')) || fs.existsSync(path.join(DIST, p.slice(BASE.length)));
  if (!ok) { rssBad += 1; P(`  目标不存在: ${link}`); }
}
P(`E1 rss 坏链接 ${rssBad}，残留 [[ ${rssWl}`);
const topDates = [...pubDates.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
P(`E2 pubDate 分布 top5: ${JSON.stringify(topDates)}（共 ${pubDates.size} 个不同日期）`);

// ---------- F. 配置抽查 ----------
section('F. 构建配置抽查');
const idxHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
P(`F1 canonical(index): ${idxHtml.match(/<link rel="canonical" href="([^"]*)"/)?.[1]}`);
const entryHtml = fs.readFileSync(path.join(DIST, '别追高/index.html'), 'utf8');
P(`F2 canonical(条目): ${entryHtml.match(/<link rel="canonical" href="([^"]*)"/)?.[1]}`);
P(`F3 favicon: ${[...idxHtml.matchAll(/<link rel="icon"[^>]*>/g)].map((m) => m[0]).join(' | ') || '无'}`);
P(`F4 robots.txt 见 B4`);
const wlCount = fs.readFileSync(path.join(DIST, '涨停买不进的别追/index.html'), 'utf8').match(/class="wl/g) || [];
P(`F5 双链渲染抽查（涨停买不进的别追）: class="wl" ${wlCount.length} 处`);
// 404 页链接
const nf = fs.readFileSync(path.join(DIST, '404.html'), 'utf8');
P(`F6 404.html 存在: yes；href 数: ${(nf.match(/\bhref=/g) || []).length}`);

fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'audit-tech-output.txt'), out.join('\n'));
console.log(out.join('\n'));
