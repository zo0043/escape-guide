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
// v2 扩充（2026-10-11，详见 docs/content-v2-spec.md）：
//   7. 「怎么做」必含 **算例** 段——可复算的假设案例，把「写下/算一遍」落到具体数字
//   8. 「备注」至少 3 个列表项——适用前提 / 已知反例 / 关联条目 / 有效期
//   9. 出度双链 ≥ 2（唯一目标）——手册感 = 网络感，54% 条目零反链的教训
//      （7–9 使存量 41 条全部判红，构建在批次改写完成前预期失败——刻意的）
//  10. 「怎么做」汉字数 ≥350、11.「说人话」汉字数 ≥150——防回退下限
//      （阈值按批次 C 实测最小值 529/262 取下，余量 34%/43%；只数汉字）
//
// v3 扩充（2026-10-12，出自 2026-10-12 整合审计「闸门的系统性盲区」一节——
// 该审计文档未随仓库发布，规则原文已内联在下方 14–19 的逐条注释里）：
//   上面 1–13 条有一个共同盲区：**只查「标记存在」，不查「语义正确」与「渲染结果」**。
//   2026-10-12 整合审计实测：16 条必须改里 7 条的根因都是这一条——六段标记齐但顺序错、
//   front matter metric 合法但正文行内口径逃出词表、三段散文段过字数下限但缺 spec 要求的
//   段首命名、A/B 级有反方证据却没 disputed、裸 URL 后紧跟全角标点被自动链接吞成坏地址。
//   14–19 即按这个盲区补齐（分级：error 阻断 / warning 不阻断，理由逐条注明）。
//  14. 「怎么做」六段顺序固定（error）
//  15. 收益节行内口径 ∈ 五值词表且 === front matter metric（error）
//  16. 「说人话」三段段首标签齐全（error）
//  17. 反方证据线索 vs disputed 漏标（warning：关键词是代理，须人工复核）
//  18. 裸 URL 后紧跟全角标点（error：会被 GFM 自动链接吞进 href，点了就是 404）
//  19. 「无公开统计」的读法消歧（warning：口径不存在 vs 本次未取得）
//
// v4 扩充（2026-10-12，t14 —— t9/C5+C7 交付时提的待办 #2）：
//  20. layer 必填 + 四值枚举（error）
//      —— content.config.ts 里 layer 是 required z.enum，但闸门一直不校验它。
//      新增条目漏填/写错只在 astro build 的 zod 阶段才报 `Invalid enum value`，
//      那时已进构建流程、报错也不指出四值可选。t12 要写 5 条新条目，先补这道闸。
//      实测基线：117/117 条全部合规（理念 42 / 档案 38 / 执行 32 / 工具 5），零误报。
//
// v5 扩充（2026-10-12，t7 P0-1 —— 审计 03-T1/T2/T6 的实施）：
//  21. compare.json 的 src 可回源（error，最小断言）：
//      src/data/compare.json 每行的 src 必须被 makeEntryIndex 归一化索引
//      （键 = normalizeKey(标题/别名)，与表页查表同一口径）命中，未命中即列
//      文件名+行号判红。背景：表页查表未归一化时，src 含空格/大写的 3 行
//      （LTCM、麦哲伦 13、1992 单日十亿）首列静默失链、构建全绿（03-T1）。
//      完整的表↔条目数字逐字守卫是后续 P1-15 的 scripts/check-compare.mjs——
//      本条只拦「整行解析不到条目」，勿在此重复造轮子。
//
// 用法：node scripts/check-content.mjs [--canary] [--only <文件名特征串>]
//   --canary  故意让一项断言失败，用来证明这个闸门真的能判红（退出码应为 1）
//   --only    只检查文件名包含该串的文件（批次改写时逐条自查用；
//             双链索引仍按全量条目构建，不受过滤影响）
import fs from 'node:fs';
import {
  loadEntries,
  splitSections,
  extractWikilinkTargets,
  makeIndex,
  makeEntryIndex,
  resolveContentDir,
} from '../src/lib/entries.mjs';
import { normalizeKey } from '../src/lib/slug.mjs';

const CANARY = process.argv.includes('--canary');

// --only <特征串> 或 --only=<特征串>：只检查文件名包含该串的文件
const argv = process.argv.slice(2);
const onlyIdx = argv.indexOf('--only');
const ONLY =
  onlyIdx >= 0
    ? argv[onlyIdx + 1]
    : (argv.find((a) => a.startsWith('--only=')) ?? '').slice(7) || null;
if (onlyIdx >= 0 && !argv[onlyIdx + 1]) {
  console.error('✗ --only 需要参数（文件名特征串）');
  process.exit(1);
}

const SECTIONS = ['怎么做', '说人话', '收益', '来源', '备注'];
const HOWTO_MARKERS = ['**什么时候用**', '**步骤**', '**做完你会得到**', '**怎么算过关**'];
// v3-14：段顺序固定（docs/content-v2-spec.md「怎么做」节：六段式段顺序固定）。**算例** 与 **常见错** 也纳入
// 顺序断言——旧闸门只查「存在」，实测「大师的业绩怎么写」把 **算例** 排在 **步骤**
// 之前仍全绿。**常见错** 按 spec 是「建议写、不机检」，故不存在时不参与顺序比较。
const SECTION_ORDER = [
  '**什么时候用**',
  '**步骤**',
  '**算例**',
  '**常见错**',
  '**做完你会得到**',
  '**怎么算过关**',
];
// v3-16：「说人话」三段段首命名（docs/content-v2-spec.md「说人话」节：是什么/为什么发生/什么时候不成立）。旧闸门只数汉字、
// 只禁阿拉伯数字，实测 23 条是三个无标签散文段——段落数都是 3、字数都过下限，全绿。
const PLAIN_LABELS = ['是什么', '为什么发生', '什么时候不成立'];
// v3-17：反方证据线索（about.md:64：A/B 级条目若存在反方证据，有则置 disputed: true）。
// 这是**关键词代理**，必然有假阳性（方法论讨论、检查清单模板、「暂未找到反例」都会
// 命中），所以定级 warning 不阻断——它的作用是把人引到条目前人工复核，不是自动判红。
const DISPUTED_CUES = ['批评', '反方', '复现失败', '自承'];
// v3-19：「无公开统计」的两种读法（本站自己的两处权威定义：1993到1994:111 与
// 2008全球金融危机:67——前者「公开渠道确认不存在」、后者「有口径但本机取不到」）。
// 词汇表取自这两处定义 + 全库实测用法，不是凭空造的。比对范围是全正文：该词 162 处
// 分布在怎么做 85 / 来源 41 / 收益 22 / 备注 14，两处权威定义也分别在备注与怎么做里。
const STAT_CUES = [
  '拿不到', '不存在', '未取得', '取不到', '未核到', '不可比',
  '没有可复算', '没有统一', '确认不存在', '无可核', '没有拿到', '未在任何',
];
// v3-18：裸 URL（无 < > 包裹、无反引号）后紧跟全角标点 → GFM 自动链接不截断，
// 把标点和后面的中文一起吞进 href——点了就是 404，而这正违反本站立站规则
// 「打不开的链接等于没有来源」（index.astro:100）。实测 dist 7 处、4 个条目页，
// 形态如 `2024ltr.pdf（curl` / `index.html，两页均为…` / `fmpxx"（实测`。
// 修法：URL 改 <URL> 包裹，或在 URL 与标点间加一个空格。
// 后瞻集合原本只有 （，；：、 与 ["']+（，；：、。t6(C3) 做全量渲染时补上一条实测
// 缺口：`"URL"。` 这一型当时漏网——**全角句号 `。` 不在 GFM 的 ASCII 尾部修剪集
// 里**，所以它和后面的中文会整串吞进 href。已用 micromark + gfmAutolinkLiteral
// 逐型复现（过程与输出未随仓库发布；复现结果内联如下）：
//   `URL。`    → href="…foo%E3%80%82%E5%90%8E%E9%9D%A2…"（句号 + 后文全吞）
//   `"URL"。`  → href="…foo%22%E3%80%82%E5%90%8E…"（引号变 %22、句号 + 后文全吞）
//   `URL，/、/；`→ 同为 %EF%BC%8C 等（原已覆盖）
// 故 `。` 同时进两支：紧跟支（裸 URL 后直接是句号）与引号组合支（`"URL"。`）。
// 仍不含 ）」』——那会误伤 `[文字](URL）」` 这种正常 markdown 链接收尾。
// 另必须剥代码块/行内代码：全库的 curl 重跑命令都长在反引号里，不剥会误报。
// ⚠️ 但 `。` 进后瞻会**重新打开**上面这个误报口子：正文 `[文字](URL)」。` 里，URL 后
// 的 `)」` 都落在 `[^\s<>`]` 允许范围内，懒惰匹配会一路吃到 `。` 上，把正常 markdown
// 链接判成裸 URL（实测复现；过程与输出未随仓库发布）。故在**前瞻**再补
// `(?<!\]\()`：URL 紧跟 `](` 即 markdown 链接，不判。这样既保住 `"URL"。` / `URL。`
// 判红，也不误伤 `[文字](URL)」。`；`(URL)。` 这种正文半角括号包 URL 仍照判。
// 代价（已实测确认可接受）：URL 自身含半角 `)` 且其后紧跟 `。` 时漏判——全库 4 个
// 含 `)` 的 URL 都在反引号代码块里（curl 命令），本就被剥掉，实际影响 0。
// 另必须剥代码块/行内代码：全库的 curl 重跑命令都长在反引号里，不剥会误报。
const BARE_URL_RE = /(?<![<`]|\]\()((?:https?:\/\/|www\.)[^\s<>`]*?)(?=[（，；：、。]|["']["'（，；：、。])/g;
const CHAPTERS = [
  '01 市场与周期',
  '02 理念与理论',
  '03 人性与心理',
  '04 规则与制度',
  '05 风险与防守',
  '06 实务与查证',
];
// t14（C5/C7 的 t9 反馈 #2）：layer 在 content.config.ts 里是 **required z.enum**，
// 但本闸门一直不校验它。后果是新增条目漏填/写错时，只有 astro build 的 zod 阶段才报
// `Invalid enum value`——那时已经进了构建流程，报错也不指出四值可选。
// 这四值与 schema 必须逐字一致（src/content.config.ts:43）；改一处必须改另一处。
// 定级 error：schema 层本就是必填，漏填同样会让 build 失败，闸门只是把失败提前。
const LAYERS = ['理念', '执行', '档案', '工具'];
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

let checked = 0;
for (const e of entries) {
  const f = e.file;
  const d = e.data ?? {};
  if (ONLY && !f.includes(ONLY)) continue;
  checked += 1;

  // ---- front matter ----
  if (!d.title) fail(f, '缺 title');
  if (!String(d.description ?? '').trim()) {
    fail(f, '缺 description。留空会让 og/twitter 回退到正文摘要，泄漏字面 [[…]]');
  } else if (/\[\[[^\]]+\]\]/.test(String(d.description))) {
    warn(f, 'description 含 [[…]]，该字段会原样进入 meta/og/twitter/RSS，不会被渲染成链接');
  }
  if (!CHAPTERS.includes(d.chapter)) {
    fail(f, `chapter 不在白名单：「${d.chapter}」（允许：${CHAPTERS.join(' / ')}）`);
  }
  // t14：layer 必填 + 四值枚举。缺字段与非法值分开报——前者是「忘了写」，
  // 后者是「写了个不在表里的值」，两种修法不同，文案也该不同。
  // 两条都列出四值，免得下一个写条目的人再去翻 content.config.ts。
  if (d.layer === undefined || d.layer === null || String(d.layer).trim() === '') {
    fail(f, `缺 layer（归类字段，必填）。允许四值：${LAYERS.join(' / ')}——按条目性质归一类，chapter 只作默认值`);
  } else if (!LAYERS.includes(d.layer)) {
    fail(f, `layer 非法：「${d.layer}」（允许：${LAYERS.join(' / ')}）`);
  }
  if (!METRICS.includes(d.metric)) fail(f, `metric 非法：「${d.metric}」（允许：${METRICS.join('|')}）`);
  if (!EVIDENCE.includes(d.evidence)) fail(f, `evidence 非法：「${d.evidence}」（允许：A|B|C）`);
  if (!GAIN.includes(d.gain)) fail(f, `gain 非法：「${d.gain}」（允许：大|中|小）`);
  const cost = d.cost ?? {};
  if (!MONEY.includes(cost.money)) fail(f, `cost.money 非法：「${cost.money}」（允许：0|少|多）`);
  if (!TIME.includes(cost.time)) fail(f, `cost.time 非法：「${cost.time}」（允许：少|中|多）`);
  if (!WILL.includes(cost.will)) fail(f, `cost.will 非法：「${cost.will}」（允许：否|些|是）`);
  // checked 对所有条目必填（C 级也不例外）——与 content.config.ts 必填 schema、
  // about.md「来源规则」同口径（P2-B3/01-C-15，2026-10-12 收紧：原 A/B 级 warning）。
  if (!d.checked) fail(f, '缺 checked（来源核对日期，对所有条目必填，C 级也不例外——这个日期是说法的保质期）');
  // P2-C5：keyFigure 显式声明「大数字」（速览卡 3 / 结论条大号展示）。
  // 声明了就必须是 keyNumber 的逐字子串——与对照表「数字逐字一致」不变式
  // 同风格，防声明的大号数字与来源句漂移。空串/缺 keyNumber → error。
  // 未声明（undefined）不检查——当前 122 条均无该字段（2026-10-13 引入，零存量）。
  if (d.keyFigure !== undefined && d.keyFigure !== null) {
    const kn = String(d.keyNumber ?? '');
    const kf = String(d.keyFigure);
    if (!kf.trim()) {
      fail(f, 'keyFigure 为空串（不声明就别写该字段——留空等价于回退机械提取，写空串没有意义）');
    } else if (!kn) {
      fail(f, `声明了 keyFigure「${kf}」但缺 keyNumber（keyFigure 必须是 keyNumber 的逐字子串）`);
    } else if (!kn.includes(kf)) {
      fail(f, `keyFigure「${kf}」不是 keyNumber 的逐字子串（防漂移：必须是 keyNumber 原文中逐字出现的一段）`);
    }
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
    // 2b. v2 算例：可复算的假设案例（docs/content-v2-spec.md）
    if (!howto.includes('**算例**')) {
      fail(f, '「怎么做」缺 **算例** 段（v2 必选：一个可复算的假设案例，带具体数字）');
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

  // 8. v2「备注」至少 3 个列表项：适用前提 / 已知反例 / 关联条目 / 有效期
  if (sections.has('备注')) {
    const noteItems = (sections.get('备注').match(/^\s*[-*]\s+/gm) || []).length;
    if (noteItems < 3) {
      fail(f, `「备注」列表项 ${noteItems} 个（v2 要求 ≥3：适用前提/已知反例/关联条目/有效期）`);
    }
  }

  // 9. v2 出度双链 ≥ 2（唯一目标数；链接地图见各批次任务书）
  {
    const outTargets = new Set(extractWikilinkTargets(e.body).map((t) => normalizeKey(t)));
    if (outTargets.size < 2) {
      fail(f, `出度双链 ${outTargets.size} 个（v2 要求 ≥2，按任务书链接地图执行，可加不可减）`);
    }
  }

  // 10. v2 防回退：「怎么做」汉字数 ≥350（只数汉字，标点/数字/表格符号不计）
  //     阈值依据：批次 C（04 章 12 条）实测最小 529，余量 34%
  {
    const howtoCjk = (howto.match(/[\u4e00-\u9fff]/g) || []).length;
    if (howtoCjk < 350) {
      fail(f, `「怎么做」汉字数 ${howtoCjk}（v2 防回退要求 ≥350；只数汉字，标点与数字不计）`);
    }
  }

  // 11. v2 防回退：「说人话」汉字数 ≥150（只数汉字）
  //     阈值依据：批次 C 实测最小 262，余量 43%；spec 的「≥150 字」按汉字口径执行
  {
    const plainCjk = ((sections.get('说人话') ?? '').match(/[\u4e00-\u9fff]/g) || []).length;
    if (plainCjk < 150) {
      fail(f, `「说人话」汉字数 ${plainCjk}（v2 要求 ≥150；只数汉字，标点与数字不计）`);
    }
  }

  // 12. 双链后禁紧跟半角括号（渲染破坏，必须判红而非警告）
  //     `[[目标]](注释)` 会被 Markdown 原生解析成 `[目标](注释)` 链接：
  //     目标地址变成那句注释文字（死链、且漏子路径前缀），显示文本退化成
  //     字面 [目标]。全库惯例是 `[[目标]]（注释）`（全角括号，2026-10-11 起
  //     老条目 168 处全用全角；2026-10-12 两批新条目共 120 处误用半角，
  //     一次是 96 处死链、一次是 22 处，闸门均未报警——本规则即因此增设）。
  {
    let b = e.body;
    b = b.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '');
    b = b.replace(/`[^`]*`/g, '');
    const n = (b.match(/\]\]\(/g) || []).length;
    if (n > 0) {
      fail(f, `双链后紧跟半角括号 ${n} 处：「[[目标]](注释)」会被解析成死链，注释一律用全角「[[目标]]（注释）」`);
    }
  }
  // 13. 源码级 [[ 配对检测（渲染层字面 [[ 残留的上游防线）
  //     `[[目标]]` 少写一个 ]（写成 `[[目标])`）时插件不解析，正文渲染出
  //     字面 [[——2026-10-12 满仓单吊 2 处 `]])` 单括号漏网：出度够、四标记齐、
  //     规则 12 也不响，只有渲染层 verify 抓到。本规则在源码层判红。
  {
    let b = e.body;
    b = b.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '');
    b = b.replace(/`[^`]*`/g, '');
    const opens = (b.match(/\[\[/g) || []).length;
    const closed = (b.match(/\[\[[^[\]\n]+\]\]/g) || []).length;
    if (opens > closed) {
      fail(f, `双链未闭合 ${opens - closed} 处：「[[目标)」少写一个 ] 时插件不解析、渲染出字面 [[，请补全为 [[目标]]`);
    }
  }

  // 14. v3「怎么做」六段顺序固定（docs/content-v2-spec.md「怎么做」节：段顺序固定）
  //     旧闸门只查 6 个标记存在（规则 2/2b），不查顺序。实测 1 处违规：
  //     「大师的业绩怎么写」**算例**(L33) 排在 **步骤**(L49) 之前，全绿通过。
  {
    const present = SECTION_ORDER.filter((k) => howto.includes(k));
    const pos = present.map((k) => howto.indexOf(k));
    const sorted = [...pos].sort((a, b) => a - b);
    if (pos.join(',') !== sorted.join(',')) {
      const actual = present
        .map((k, i) => ({ k, p: pos[i] }))
        .sort((a, b) => a.p - b.p)
        .map((x) => x.k.replace(/\*\*/g, ''))
        .join(' → ');
      fail(f, `「怎么做」六段顺序违反规格（应 ${SECTION_ORDER.map((k) => k.replace(/\*\*/g, '')).join(' → ')}）：实测 ${actual}`);
    }
  }

  // 15. v3 收益节行内口径：必须 ∈ 五值词表、且与 front matter metric 一致
  //     旧闸门只校验 front matter 的 metric（规则 5），不校验正文行内写的
  //     「量级（口径：X）」。实测 5 处：4 处的 X 根本不是合法值（「复现率与效应量」
  //     「会员费与跟单亏损」…），1 处 X 合法但与 fm 矛盾（行内「收益」vs fm「亏损」）。
  //     后果：读者按 about 页学到的五个口径在读这 5 条时失效；域页显示的「口径 亏损」
  //     与条目正文自称的不是一回事。正确写法：**括号内只放五值之一**，量纲说明写在
  //     冒号之后的正文里（`量级（口径：亏损）：本条量纲是复现率与效应量，不是金额——…`）。
  //     ⚠️ 提示语踩坑记录：2026-10-12 t7 第一版按本规则旧提示「量纲说明请写进括号」
  //     把量纲写进同一对括号（`量级（口径：亏损，含会员费与跟单浮亏两项）`），被
  //     下面这条正则整串捕获——`[^）]*` 到**第一个右括号**为止，于是「亏损，含会员费
  //     与跟单浮亏两项」被判不在五值词表。已改为明确说「括号内只放五值之一」，别再让
  //     下一个人踩同一个坑。
  {
    const g = (sections.get('收益') ?? '').trim();
    if (g.startsWith('量级（口径：') || g.startsWith('量级：')) {
      for (const m of g.matchAll(/量级（口径：([^）]*)）/g)) {
        const v = m[1].trim();
        if (!METRICS.includes(v)) {
          fail(f, `收益节行内口径「${v}」不在五值词表（允许：${METRICS.join('|')}）。括号内只放五值之一；量纲说明请写在冒号之后的正文里，如「量级（口径：亏损）：本条量纲是复现率与效应量，不是金额——…」`);
        } else if (v !== d.metric) {
          fail(f, `收益节行内口径「${v}」与 front matter metric「${d.metric}」不一致——两处必须同一个口径`);
        }
      }
    }
  }

  // 16. v3「说人话」三段段首标签齐全（docs/content-v2-spec.md「说人话」节要求命名）
  //     旧闸门只查汉字数 ≥150 与禁阿拉伯数字（规则 4/11）。实测 23 条是三个无标签
  //     自然段——段落数都是 3、字数都过下限，所以全绿；但新条目是
  //     「是什么/为什么发生/什么时候不成立」的显式结构，同一节两种文体。
  if (sections.has('说人话')) {
    const miss = PLAIN_LABELS.filter((k) => !plain.includes(k));
    if (miss.length) {
      fail(f, `「说人话」缺段首标签：${miss.join(' / ')}（spec「说人话」节要求三段命名，纯加字即可，不动正文）`);
    }
  }

  // 17. v3 弱校验：A/B 级条目出现反方证据线索却没置 disputed: true
  //     about.md:64「disputed：A/B 级条目若存在反方证据，改写/写作时复查，有则置 true」。
  //     实测 1 条真漏标（双系统：备注与来源都有卡内基自承 + R-index 14）。关键词是
  //     代理指标，「暂未找到反例」「复现失败的原因有很多种」也会命中，故只警告不阻断。
  if ((d.evidence === 'A' || d.evidence === 'B') && d.disputed !== true) {
    let txt = `${sections.get('备注') ?? ''}\n${sections.get('来源') ?? ''}`;
    txt = txt.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '').replace(/`[^`]*`/g, '');
    const cues = DISPUTED_CUES.filter((c) => txt.includes(c));
    if (cues.length) {
      warn(f, `备注/来源出现反方证据线索（${cues.join('、')}）但未置 disputed: true——请人工复核是否该标（about.md:64）`);
    }
  }

  // 18. v3 裸 URL 后紧跟全角标点（error）
  //     GFM 自动链接只修剪一小组 ASCII 尾部标点，不认全角括号/逗号。裸 URL 后紧跟
  //     「（」「，」时，标点和后面的中文会被一起吞进 href——点了就是 404，而这正违反
  //     本站立站规则「打不开的链接等于没有来源」（index.astro:100）。实测 dist 7 处、
  //     4 个条目页。修法：URL 改 <URL> 包裹，或在 URL 与标点间加一个空格。
  //     必须先剥代码块/行内代码：全库的 curl 重跑命令都长在反引号里，不剥会误报。
  {
    let b = e.body;
    b = b.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '');
    b = b.replace(/`[^`]*`/g, '');
    const hits = [...b.matchAll(BARE_URL_RE)].map((m) => m[1]);
    if (hits.length) {
      fail(f, `裸 URL 后紧跟全角标点 ${hits.length} 处（如 ${hits[0]}）：会被自动链接吞成坏地址，请改成 <URL> 或在 URL 与标点间加空格`);
    }
  }

  // 19. v3 弱校验：「无公开统计」的读法要能看出是「口径不存在」还是「本次未取得」
  //     本站自己有两处权威定义（1993到1994:111「前者是公开渠道确认不存在，后者是
  //     本次未取得」；2008全球金融危机:67「前者是口径本身不存在，后者是有口径但
  //     本机取不到」），但全站没有规范、首页还把三分法压成一句。本条只警告。
  //     范围取**全正文**而不是「来源」节：实测该词 162 处分布在 怎么做 85 / 来源 41 /
  //     收益 22 / 备注 14，且上面两处权威定义分别在备注与怎么做里——只查来源会漏掉
  //     四分之三的用例，也会把「定义了却定义在别的节」的条目误报成缺口。
  {
    let b = e.body;
    b = b.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '').replace(/`[^`]*`/g, '');
    if (b.includes('无公开统计') && !STAT_CUES.some((c) => b.includes(c))) {
      warn(f, '用了「无公开统计」但整条看不出是「口径不存在」还是「本次未取得」——请补一句消歧（权威定义见 1993到1994 / 2008全球金融危机）');
    }
  }
}

// 21. v5（P0-1）：compare.json 的 src 可回源（最小断言，error）
//     表页（src/pages/compare/[table].astro）用 makeEntryIndex 查表，键是
//     normalizeKey(标题/别名)。src 一旦解析不到，该行首列静默失链、争议小标
//     一起消失，而构建全绿（2026-10-12 审计 03-T1 实测 3 行）。本断言与表页
//     同一索引、同一归一化，在构建前把「整行回源失败」拦下。
{
  const compareFile = new URL('../src/data/compare.json', import.meta.url);
  let compareRaw;
  try {
    compareRaw = fs.readFileSync(compareFile, 'utf8');
  } catch (err) {
    fail('src/data/compare.json', `读取失败：${err.message}（表页依赖此文件，缺失即构建必红）`);
    compareRaw = null;
  }
  if (compareRaw) {
    let compareIndex = null;
    try {
      compareIndex = makeEntryIndex(entries);
    } catch (err) {
      fail('src/data/compare.json', `标题/别名索引构建失败：${err.message}（与表页查表同源索引，冲突即构建必红）`);
    }
    if (compareIndex) {
      const compareData = JSON.parse(compareRaw);
      const compareLines = compareRaw.split(/\r?\n/);
      for (const t of compareData.tables ?? []) {
        for (const r of t.rows ?? []) {
          if (compareIndex.get(normalizeKey(r.src))) continue;
          const lineNo =
            compareLines.findIndex((l) => l.includes(`"src": ${JSON.stringify(r.src)}`)) + 1;
          fail(
            `src/data/compare.json:${lineNo || '?'}`,
            `src「${r.src}」（表 ${t.slug}）无法被标题/别名归一化索引解析——该行首列将失去链接。核对标题拼写，或给条目补 aliases`,
          );
        }
      }
    }
  }
}

if (CANARY) {
  fail('__canary__', '这是金丝雀：故意注入的失败，用来证明闸门真的能判红');
}

const total = ONLY ? checked : entries.length;
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
if (warnings.length) {
  console.error(`\n⚠️  ${warnings.length} 条警告（不阻断构建，但需人工复核）：`);
  for (const w of warnings.slice(0, 30)) console.error(`   - ${w.file}：${w.msg}`);
  if (warnings.length > 30) console.error(`   …另有 ${warnings.length - 30} 条`);
}
console.error(`\n构建已中止，无产物。`);
process.exit(1);
