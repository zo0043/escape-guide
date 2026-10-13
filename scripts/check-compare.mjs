#!/usr/bin/env node
// 对照表守卫 —— src/data/compare.json ↔ 源条目（src/content/escape/*.md）的机械不变式。
//
// 来源（2026-10-12 审计 → P1-15，见 docs/audit/00-final-report.md §7 第 8 步）：
//   · 首页承诺「每一行都能点回条目，表里的数字与条目逐字一致」（index.astro:168）；
//   · compare/[table].astro:4 注释引用的 verify-escape-guide.sh 留在旧站仓库，
//     本仓库没有任何机械守卫——2026-10-12 审计实测 445 个数字 token 里已有 1 处
//     漂移（03-T2：「1998-08-17」vs 条目「1998 年 8 月 17 日」），T2 即缺位的直接后果；
//   · 本脚本把审计脚本 docs/audit/tmp/audit-tech.mjs 的 C 节逻辑固化为正式守卫。
//
// 与 scripts/check-content.mjs 的关系：
//   · 闸门规则 21（v5）只拦「src 整行解析不到条目」（最小断言）；
//   · 本脚本是完整版：src 可解析 + nums 逐字 + 单元格数字 token 逐字。
//     两者都跑（npm run check = check-content && check-compare），规则 21 先行
//     给出更快的失败信号，本脚本兜住数字漂移。改本脚本时勿删规则 21。
//
// 检查项（全部 error，任一失败 exit 1）：
//   1. 每行 src 可解析：makeEntryIndex 归一化索引（键 = normalizeKey(标题/别名)，
//      与表页查表同一口径）命中——解析不到，该行首列在渲染层静默失链；
//   2. nums 逐字命中：每行 nums[] 的每个数字串必须是源条目文件的子串
//      ——这是「数字与条目逐字一致」承诺的核心；
//   3. 单元格数字 token 逐字命中：每个单元格里的数字/日期 token
//      （\d{4}-\d{1,2}-\d{1,2} 或 \d[\d,]*(\.\d+)?，含千分位/小数/百分数主体）
//      必须能在源条目里逐字找到。纯文字摘要单元格（机制一句话、自检问题等）
//      不做逐字要求——站点的逐字承诺只针对数字。
//
// 行号定位：按 compare.json 原文逐行匹配（src 行 / 单元格行 / nums 元素行），
// 报「src/data/compare.json:行号」。
//
// 用法：node scripts/check-compare.mjs
//   退出码：0 全部通过 / 1 有 error（构建中止） / 2 输入不可读（compare.json 或条目目录）
import fs from 'node:fs';
import path from 'node:path';
import { loadEntries, makeEntryIndex, resolveContentDir } from '../src/lib/entries.mjs';
import { normalizeKey } from '../src/lib/slug.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const COMPARE_FILE = new URL('../src/data/compare.json', import.meta.url);

const problems = [];
const fail = (file, msg) => problems.push({ file, msg });

// ---- 输入 ----
let compareRaw;
try {
  compareRaw = fs.readFileSync(COMPARE_FILE, 'utf8');
} catch (err) {
  console.error(`✗ 无法读取 ${COMPARE_FILE.pathname}：${err.message}`);
  process.exit(2);
}
let compare;
try {
  compare = JSON.parse(compareRaw);
} catch (err) {
  console.error(`✗ ${COMPARE_FILE.pathname} 不是合法 JSON：${err.message}`);
  process.exit(2);
}

let entries;
try {
  entries = loadEntries();
} catch (e) {
  console.error(`✗ 无法读取条目：${e.message}`);
  process.exit(2);
}

const contentDir = resolveContentDir();
let index;
try {
  index = makeEntryIndex(entries);
} catch (err) {
  console.error(`✗ 标题/别名索引构建失败：${err.message}`);
  process.exit(2);
}
const rawBySlug = new Map();
for (const e of entries) {
  rawBySlug.set(e.slug, fs.readFileSync(path.join(contentDir, e.file), 'utf8'));
}

const compareLines = compareRaw.split(/\r?\n/);
// 行号定位：src 行、单元格行、nums 元素行（按 JSON 引号形态精确匹配，避免误中）
const lineOfSrc = (src) =>
  compareLines.findIndex((l) => l.trim() === `"src": ${JSON.stringify(src)},`) + 1;
const lineOfCell = (cell) =>
  compareLines.findIndex((l) => l.includes(JSON.stringify(cell))) + 1;
const lineOfNum = (n) =>
  compareLines.findIndex((l) => {
    const t = l.trim();
    return t === JSON.stringify(n) || t === `${JSON.stringify(n)},`;
  }) + 1;

// 数字/日期 token（与审计脚本 C 节同一口径）
const NUM_RE = /\d{4}-\d{1,2}-\d{1,2}|\d[\d,]*(?:\.\d+)?/g;

let rows = 0;
let srcMiss = 0;
let numsChecked = 0;
let numsMiss = 0;
let tokensChecked = 0;
let tokenMiss = 0;

for (const t of compare.tables ?? []) {
  for (const r of t.rows ?? []) {
    rows += 1;
    const entry = index.get(normalizeKey(r.src));
    if (!entry) {
      srcMiss += 1;
      fail(
        `src/data/compare.json:${lineOfSrc(r.src) || '?'}`,
        `src「${r.src}」（表 ${t.slug}）无法被标题/别名归一化索引解析——该行首列将失去链接。核对标题拼写，或给条目补 aliases`,
      );
      continue;
    }
    const raw = rawBySlug.get(entry.slug) ?? '';
    // 1. nums 逐字
    for (const n of r.nums ?? []) {
      numsChecked += 1;
      if (!raw.includes(n)) {
        numsMiss += 1;
        fail(
          `src/data/compare.json:${lineOfNum(n) || '?'}`,
          `nums「${n}」（表 ${t.slug}，行 src「${r.src}」）未在源条目 ${entry.file} 逐字找到——表与条目数字必须逐字一致，改表或改条目`,
        );
      }
    }
    // 2. 单元格数字 token 逐字
    for (const cell of r.c ?? []) {
      const seen = new Set();
      for (const m of cell.matchAll(NUM_RE)) {
        const tok = m[0];
        if (seen.has(tok)) continue;
        seen.add(tok);
        tokensChecked += 1;
        if (!raw.includes(tok)) {
          tokenMiss += 1;
          fail(
            `src/data/compare.json:${lineOfCell(cell) || '?'}`,
            `单元格「${cell}」（表 ${t.slug}，行 src「${r.src}」）中的数字「${tok}」未在源条目 ${entry.file} 逐字找到——改表内写法或补写进条目（日期统一「YYYY 年 M 月 D 日」）`,
          );
        }
      }
    }
  }
}

if (problems.length === 0) {
  console.log(
    `✅ 对照表守卫通过：${rows} 行 src 全部可解析；${numsChecked} 个 nums + ${tokensChecked} 个单元格数字 token 全部逐字命中源条目`,
  );
  process.exit(0);
}

console.error(`❌ 对照表守卫失败：${rows} 行里 src 不可解析 ${srcMiss}，nums 漂移 ${numsMiss}，单元格数字漂移 ${tokenMiss}\n`);
const byFile = new Map();
for (const p of problems) {
  if (!byFile.has(p.file)) byFile.set(p.file, []);
  byFile.get(p.file).push(p.msg);
}
for (const [file, msgs] of byFile) {
  console.error(`  ${file}`);
  for (const m of msgs) console.error(`     · ${m}`);
}
console.error(`\n构建已中止，无产物。`);
process.exit(1);
