#!/usr/bin/env node
// K1 · 字体覆盖闸门（构建链：闸门之后、astro build 之前）
//
// 断言：dist 全部 HTML 里出现的 CJK 字符（汉字/扩展A/CJK 标点/全角区）
// ⊆ 子集字符清单 scripts/fonts/chars.txt（由 scripts/subset-font.mjs 产出）。
//
// 设计口径：
//   · 只解析 chars.txt 与 dist HTML 文本，不解析 woff2（产物字节不入库校验链）。
//   · 扫描 raw HTML（文本 + 属性值都算渲染字符——tooltip/alt/title 同样吃字体）。
//   · dist 不存在（首次 clone / CI 冷启动无产物）→ 跳过（exit 0，打印原因）：
//     闸门校的是「上一次构建的产物是否被当前子集覆盖」，无产物可校不判红。
//   · 内容改字后流程：npm run build:soft → node scripts/subset-font.mjs → npm run build。
//     本闸门在「新 dist 已构建、子集未更新」时会判红，逼你先更新子集。

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHARS_TXT = join(ROOT, 'scripts', 'fonts', 'chars.txt');
const DIST = join(ROOT, 'dist');

// CJK 判定：统一表意区 + 扩展 A + CJK 标点 + 全角/半角形式区
function isCjk(cp) {
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x3000 && cp <= 0x303f) ||
    (cp >= 0xff00 && cp <= 0xffef)
  );
}

if (!existsSync(CHARS_TXT)) {
  console.error('[font-coverage] 缺 scripts/fonts/chars.txt——先跑 node scripts/subset-font.mjs');
  process.exit(1);
}
if (!existsSync(DIST)) {
  console.log('[font-coverage] dist 不存在，跳过（首次构建，无上一轮产物可校）');
  process.exit(0);
}

const allowed = new Set();
for (const ch of readFileSync(CHARS_TXT, 'utf8')) {
  const cp = ch.codePointAt(0);
  if (cp) allowed.add(cp);
}

function walkHtml(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkHtml(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const missing = new Map(); // codepoint -> 首个命中的文件
for (const f of walkHtml(DIST, [])) {
  for (const ch of readFileSync(f, 'utf8')) {
    const cp = ch.codePointAt(0);
    if (isCjk(cp) && !allowed.has(cp)) {
      if (!missing.has(cp)) missing.set(cp, f.replace(`${ROOT}/`, ''));
    }
  }
}

if (missing.size > 0) {
  console.error(`[font-coverage] 判红：dist 有 ${missing.size} 个 CJK 字符不在子集清单里：`);
  const sample = [...missing.entries()]
    .slice(0, 40)
    .map(([cp, file]) => `  U+${cp.toString(16).toUpperCase().padStart(4, '0')} ${String.fromCodePoint(cp)}（${file}）`)
    .join('\n');
  console.error(sample + (missing.size > 40 ? `\n  … 另有 ${missing.size - 40} 个` : ''));
  console.error('[font-coverage] 处理：npm run build:soft && node scripts/subset-font.mjs && npm run build');
  process.exit(1);
}
console.log(`[font-coverage] OK：dist CJK 字符 ⊆ chars.txt（清单 ${allowed.size} 字符）`);
