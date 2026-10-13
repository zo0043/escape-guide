#!/usr/bin/env node
// t20 P2-B1 等价性自查（无 build，用 astro 同款渲染器）：
//   对全部 122 条条目正文 + about.md，分别用「改前 entryHeadings（t20-headings-old.mjs）」
//   与「改后（src/lib/headings.mjs）」各渲染一遍，比较 HTML 字节：
//     A. 条目页（front matter 含 chapter+layer）：新旧必须逐字节一致 —— 回归红线 122/122。
//     B. about.md（pages 集合，无 chapter/layer）：改后不得出现 mod-* / howto-part /
//        part-label / table-cards（连坐全部解除）；改前应出现 mod-generic（证明缺陷存在）。
// 渲染链与 astro 构建一致：unified({remarkPlugins:[wikilinks], rehypePlugins:[entryHeadings]})
//   → createRenderer → render(body, { fileURL, frontmatter })（frontmatter 经 vfile.data.astro 进插件）。
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { unified } from '@astrojs/markdown-remark';
import { parse as yamlParse } from 'yaml';
import wikilinks from '../../../src/lib/wikilinks.mjs';
import { loadEntries, makeIndex } from '../../../src/lib/entries.mjs';
import entryHeadingsNew from '../../../src/lib/headings.mjs';
import entryHeadingsOld from './t20-headings-old.mjs';

const BASE = '/escape-guide/';
const entries = loadEntries();
const linkIndex = makeIndex(entries);

function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error('no frontmatter');
  return { fm: yamlParse(m[1]), body: raw.slice(m[0].length) };
}

async function makeRenderer(entryHeadings) {
  const processor = unified({
    remarkPlugins: [[({ index, base }) => wikilinks(index, base), { index: linkIndex, base: BASE }]],
    rehypePlugins: [entryHeadings],
  });
  const renderer = await processor.createRenderer({ gfm: true, smartypants: true });
  return (body, fileURL, frontmatter) => renderer.render(body, { fileURL, frontmatter });
}

const renderNew = await makeRenderer(entryHeadingsNew);
const renderOld = await makeRenderer(entryHeadingsOld);

let same = 0, diff = 0;
const diffList = [];
// A. 条目页逐字节等价
for (const e of entries) {
  const raw = fs.readFileSync(path.join('src/content/escape', e.file), 'utf8');
  const { fm, body } = splitFrontmatter(raw);
  const url = pathToFileURL(path.join('src/content/escape', e.file)).href;
  const a = (await renderOld(body, url, fm)).code;
  const b = (await renderNew(body, url, fm)).code;
  if (a === b) same += 1;
  else {
    diff += 1;
    diffList.push(e.file);
  }
}
console.log(`A. 条目页新旧渲染逐字节一致: ${same}/122`, diff ? ` 不一致: ${JSON.stringify(diffList)}` : '');

// B. about.md 连坐解除
const aboutRaw = fs.readFileSync('src/content/pages/about.md', 'utf8');
const about = splitFrontmatter(aboutRaw);
const aboutUrl = pathToFileURL('src/content/pages/about.md').href;
const before = (await renderOld(about.body, aboutUrl, about.fm)).code;
const after = (await renderNew(about.body, aboutUrl, about.fm)).code;
const count = (s, re) => (s.match(re) || []).length;
console.log(`B. about.md 改前: mod-* 段 = ${count(before, /class="mod /g)}（缺陷存在应为 >0）`);
console.log(`B. about.md 改后: mod-* 段 = ${count(after, /class="mod /g)}，howto-part = ${count(after, /howto-part/g)}，part-label = ${count(after, /part-label/g)}，table-cards = ${count(after, /table-cards/g)}（应全 0）`);
console.log(`B. about.md 改后 h2 数 = ${count(after, /<h2 /g)}（h2 本身与核心 heading-id 保留）`);
fs.writeFileSync(new URL('./t20-about-after.html', import.meta.url), after);
fs.writeFileSync(new URL('./t20-about-before.html', import.meta.url), before);

const ok = diff === 0 && count(before, /class="mod /g) > 0 && count(after, /class="mod /g) === 0 && count(after, /howto-part|part-label|table-cards/g) === 0;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
