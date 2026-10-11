#!/usr/bin/env node
// 条目格式闸门 —— 旧站里由 layouts/partials/guide-guard.html 在 Hugo 构建期用 errorf 硬拦，
// 拆站后用 Astro 重建为这个脚本，由 `npm run build` 在 astro build 之前调用。
// 保留了「绕不过去」的性质：CI 直接跑 npm run build，脚本非 0 退出就没有产物。
//
// 校验项（每条都对应旧站发生过的真实缺陷）：
//   1. 五节齐全：怎么做 / 说人话 / 收益 / 来源 / 备注
//   2. 「怎么做」四段式：什么时候用 / 步骤 / 做完你会得到 / 怎么算过关
//      —— 旧站 41 条里 21 条是一句话格言，没有触发条件、步骤、产出物、验收标准
//   3. 「收益」三档制：量级（口径：X）：<必须含数字> 或 无量级（方向性）：<原因>
//      —— 旧站自称「按口径给量级」，实测 41/41 条通篇无阿拉伯数字，全是形容词
//   4. 「说人话」不许出现阿拉伯数字（它只负责解释，不引入收益栏之外的新数字）
//   5. front matter：chapter 白名单、metric 词表、cost/gain/evidence 取值、description 必填
//   6. 双链目标可解析（解析不到只警告：旧站里「未收录」是合法的渲染状态）
//
// 用法：node scripts/check-content.mjs [--canary]
//   --canary  故意让一项断言失败，用来证明这个闸门真的能判红（退出码应为 1）
import {
  loadEntries,
  splitSections,
  extractWikilinkTargets,
  makeIndex,
  resolveContentDir,
} from '../src/lib/entries.mjs';
import { normalizeKey } from '../src/lib/slug.mjs';

const CANARY = process.argv.includes('--canary');

const SECTIONS = ['怎么做', '说人话', '收益', '来源', '备注'];
const HOWTO_MARKERS = ['**什么时候用**', '**步骤**', '**做完你会得到**', '**怎么算过关**'];
const CHAPTERS = [
  '01 先认清你在跟谁玩',
  '02 A股祖训',
  '03 投资理论',
  '04 你的大脑会骗你',
  '05 别做那些事',
  '06 被坑了怎么办',
  '07 规则里的保护条款',
  '08 动手查证',
];
const METRICS = ['亏损', '收益', '时间', '自由', '处罚'];
const EVIDENCE = ['A', 'B', 'C'];
const MONEY = ['0', '少', '多'];
const TIME = ['少', '中', '多'];
const WILL = ['否', '些', '是'];
const GAIN = ['大', '中', '小'];

// 用对象而不是拼字符串：文件名本身含全角冒号（如「先搞清楚：你的交易对手是谁.md」），
// 用分隔符拼接会让分组输出错位。
const problems = [];
const warnings = [];
const fail = (file, msg) => problems.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });

let entries;
try {
  entries = loadEntries();
} catch (e) {
  console.error(`✗ 无法读取条目：${e.message}`);
  process.exit(1);
}

if (entries.length === 0) {
  console.error(`✗ ${resolveContentDir()} 里没有条目`);
  process.exit(1);
}

for (const e of entries) {
  const f = e.file;
  const d = e.data ?? {};

  // ---- front matter ----
  if (!d.title) fail(f, '缺 title');
  if (!String(d.description ?? '').trim()) {
    fail(f, '缺 description。留空会让 og/twitter/JSON-LD 回退到正文摘要，泄漏字面 [[…]]');
  } else if (/\[\[[^\]]+\]\]/.test(String(d.description))) {
    warn(f, 'description 含 [[…]]，该字段会原样进入 meta/og/twitter/RSS，不会被渲染成链接');
  }
  if (!CHAPTERS.includes(d.chapter)) {
    fail(f, `chapter 不在白名单：「${d.chapter}」（允许：${CHAPTERS.join(' / ')}）`);
  }
  if (!METRICS.includes(d.metric)) fail(f, `metric 非法：「${d.metric}」（允许：${METRICS.join('|')}）`);
  if (!EVIDENCE.includes(d.evidence)) fail(f, `evidence 非法：「${d.evidence}」（允许：A|B|C）`);
  if (!GAIN.includes(d.gain)) fail(f, `gain 非法：「${d.gain}」（允许：大|中|小）`);
  const cost = d.cost ?? {};
  if (!MONEY.includes(cost.money)) fail(f, `cost.money 非法：「${cost.money}」（允许：0|少|多）`);
  if (!TIME.includes(cost.time)) fail(f, `cost.time 非法：「${cost.time}」（允许：少|中|多）`);
  if (!WILL.includes(cost.will)) fail(f, `cost.will 非法：「${cost.will}」（允许：否|些|是）`);
  if (d.evidence === 'A' || d.evidence === 'B') {
    if (!d.checked) warn(f, `evidence=${d.evidence} 但没写 checked（来源核对日期）`);
  }

  // ---- 正文小节 ----
  const sections = splitSections(e.body);
  for (const s of SECTIONS) {
    if (!sections.has(s)) fail(f, `缺小节「## ${s}」（五节必须齐全：${SECTIONS.join('/')}）`);
  }

  // 2. 「怎么做」四段式
  const howto = sections.get('怎么做') ?? '';
  if (sections.has('怎么做')) {
    for (const marker of HOWTO_MARKERS) {
      if (!howto.includes(marker)) {
        fail(f, `「怎么做」缺小标记 ${marker}（四段必须齐全：什么时候用 / 步骤 / 做完你会得到 / 怎么算过关）`);
      }
    }
  }

  // 3. 「收益」三档制
  if (sections.has('收益')) {
    const g = (sections.get('收益') ?? '').trim();
    if (g.startsWith('量级（口径：') || g.startsWith('量级：')) {
      if (!/[0-9]/.test(g)) {
        fail(f, '「收益」写了「量级…」但通篇没有阿拉伯数字——形容词充数。给出数字，或改写成「无量级（方向性）：…」');
      }
    } else if (!g.startsWith('无量级（方向性）：')) {
      fail(f, '「收益」必须以「量级（口径：X）：」或「无量级（方向性）：」开头');
    }
  }

  // 4. 「说人话」不许有阿拉伯数字
  const plain = sections.get('说人话') ?? '';
  if (/[0-9]/.test(plain)) {
    fail(f, '「说人话」里出现阿拉伯数字。这一节只做解释，不许引入收益栏之外的新数字');
  }

  // 6. 双链可解析性（只警告）
  try {
    const index = makeIndex(entries);
    for (const t of extractWikilinkTargets(e.body)) {
      if (!index.has(normalizeKey(t))) warn(f, `双链目标「${t}」未收录（渲染成「未收录」标记）`);
    }
  } catch (err) {
    fail(f, `双链索引构建失败：${err.message}`);
  }
}

if (CANARY) {
  fail('__canary__', '这是金丝雀：故意注入的失败，用来证明闸门真的能判红');
}

const total = entries.length;
if (problems.length === 0) {
  console.log(`✅ 条目格式闸门通过：${total} 条全部合规`);
  if (warnings.length) {
    console.log(`\n⚠️  ${warnings.length} 条警告（不阻断构建）：`);
    for (const w of warnings.slice(0, 20)) console.log(`   - ${w.file}：${w.msg}`);
    if (warnings.length > 20) console.log(`   …另有 ${warnings.length - 20} 条`);
  }
  process.exit(0);
}

console.error(`❌ 条目格式闸门失败：${total} 条里有 ${problems.length} 项问题\n`);
const byFile = new Map();
for (const p of problems) {
  if (!byFile.has(p.file)) byFile.set(p.file, []);
  byFile.get(p.file).push(p.msg);
}
for (const [file, msgs] of byFile) {
  console.error(`  ${file}`);
  for (const m of msgs) console.error(`     · ${m}`);
}
if (warnings.length) console.error(`\n（另有 ${warnings.length} 条不阻断的警告）`);
console.error(`\n构建已中止，无产物。`);
process.exit(1);
