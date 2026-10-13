#!/usr/bin/env node
// t16 二十项逐条验收脚本（P0×4 + P1×16，只读 src/ 与 dist/，不改任何文件）
// 依据：docs/audit/00-final-report.md §7 各 P 项验收要求 + t5/t6/t7/t8/t9/t10/t11/t13/t14/t15 交付要求。
// 用法：node docs/audit/20261012-impl/t16-accept.mjs   （须在 npm run build 之后运行）
// 已知误报口径（Y1/Y2，见 phase0-delivery.md）：audit-tech.mjs 的 C4 严格正则 / B2 顶层扫描
//   不在本脚本范围——首列链接与 sitemap 一致性由 t12-compare-verify.mjs 覆盖（另跑，已入日志）。
import fs from 'node:fs';
import path from 'node:path';
import {
  loadEntries,
  makeEntryIndex,
  computeBacklinksFrom,
  extractWikilinkTargets,
} from '../../../src/lib/entries.mjs';
import { normalizeKey, slugify } from '../../../src/lib/slug.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const DIST = path.join(ROOT, 'dist');
const BASE = '/escape-guide/';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const dist = (p) => fs.readFileSync(path.join(DIST, p), 'utf8');
const count = (s, re) => (s.match(re) || []).length;

const entries = loadEntries();
const eIndex = makeEntryIndex(entries);
const byPrefix = (pre) => entries.filter((e) => e.slug.startsWith(slugify(pre)));
const one = (pre, label) => {
  const c = byPrefix(pre);
  if (c.length !== 1) throw new Error(`${label}: 前缀「${pre}」解析到 ${c.length} 条（应 1）`);
  return c[0];
};

const results = [];
const check = (id, name, pass, evidence) => results.push({ id, name, pass: !!pass, evidence });

// ---------- P0-1 compare 3 行 + ev-flag 8 + 日期逐字 ----------
{
  const compare = JSON.parse(read('src/data/compare.json'));
  const dateCell = JSON.stringify(compare.tables.find((t) => t.slug === 'crashes')).includes('1998 年 8 月 17 日俄罗斯违约');
  const named = ['LTCM：诺奖得主们是怎么一起破产的', '林奇：麦哲伦 13 年的真相', '索罗斯：反身性与 1992 的单日十亿'];
  const namedRows = named.map((n) => {
    const e = eIndex.get(normalizeKey(n));
    const t = compare.tables.find((tb) => tb.rows.some((r) => eIndex.get(normalizeKey(r.src))?.slug === e.slug));
    const row = t.rows.find((r) => eIndex.get(normalizeKey(r.src))?.slug === e.slug);
    const html = dist(`compare/${t.slug}/index.html`);
    const linked = html.includes(`<th scope="row" class="row-head" data-label="${t.cols[0]}"><a href="${BASE}${e.slug}/">`);
    return { n, slug: e.slug, table: t.slug, linked };
  });
  const evFlag = count(dist('compare/masters/index.html'), /ev-flag/g);
  check(
    'P0-1',
    'compare 3 行首列带 <a> + masters ev-flag 8 + 日期格逐字',
    dateCell && namedRows.every((r) => r.linked) && evFlag === 8,
    `日期格「1998 年 8 月 17 日俄罗斯违约」${dateCell ? '在场' : '缺失'}；${namedRows.map((r) => `${r.n.slice(0, 12)}@${r.table}:${r.linked ? '链✓' : '链✗'}`).join('；')}；masters ev-flag=${evFlag}（期望 8）`,
  );
}

// ---------- P0-2 disputed + 警告 6 条 ----------
{
  const pt = eIndex.get(normalizeKey('前景理论:亏损为什么比赚更重'));
  const ptDisputed = pt?.data?.disputed === true;
  const six = ['马克斯：二级思维怎么赚钱', '确认偏误：你的信息流只喂你想看的', '心理学研究的证据强度:哪些结论能信', '哪些偏差真的会亏钱:十二个现象按证据排位', '修行七件事:顺序比清单重要', '买理财亏了，先问一句：它做过风险测评吗'];
  const sixClean = six.map((n) => ({ n, d: eIndex.get(normalizeKey(n))?.data?.disputed === true }));
  check(
    'P0-2',
    '前景理论 disputed:true + 其余 6 条警告名单保持（无 disputed）',
    ptDisputed && sixClean.every((x) => !x.d),
    `前景理论 disputed=${ptDisputed}（警告消失即此生效）；其余 6 条 disputed 均为 false：${sixClean.map((x) => `${x.n.slice(0, 8)}=${x.d ? 'TRUE✗' : 'false✓'}`).join('；')}；闸门 6 条警告名单见日志 §1`,
  );
}

// ---------- P0-3 PATHS 12/12 + 3/3 + 区分句（12/12+3/3 由日志 §4c t12-paths-check 覆盖，此处验区分句） ----------
{
  const idx = dist('index.html');
  const sentence = idx.includes('六域是内容地图、六环节是学习顺序');
  check(
    'P0-3',
    '区分句在场（12/12 步骤 ⊆ 地图 wikilink 目标集 + 3/3 回链 → 日志 §4c）',
    sentence,
    `dist/index.html 含「六域是内容地图、六环节是学习顺序」：${sentence ? '✓' : '✗'}；12/12 与 3/3 证据：日志 §4c（t12-paths-check.mjs PASS）`,
  );
}

// ---------- P0-4 .site-nav overflow-x:auto ----------
{
  const css = read('dist/_astro/' + fs.readdirSync(path.join(DIST, '_astro')).find((f) => f.endsWith('.css')));
  const hit = /\.site-nav\{[^}]*overflow-x:auto/.test(css);
  check('P0-4', 'dist CSS .site-nav 含 overflow-x:auto', hit, `dist/_astro/${fs.readdirSync(path.join(DIST, '_astro')).find((f) => f.endsWith('.css'))}：${hit ? '✓ .site-nav{…overflow-x:auto…}' : '✗ 缺失'}`);
}

// ---------- P1-1 马克斯 pair：先问市场 layer=理念 + 怎么赚钱 入度≥1（孤岛消除） ----------
// 口径说明（00-final-report P1-1 / C-05）：孤岛是「马克斯：二级思维怎么赚钱」（人物档案，
// in-degree=0），补链落在「钱从哪来」表格格内；layer 矛盾改的是「先问市场已定价了什么」
// （档案→理念）。两者是同一 P1-1 的两半。
// dist 层说明：remark 渲染的 wikilink href 为百分号编码（模板生成的链接为原始 CJK），
// 解码后比对——浏览器/死链守卫同口径（audit-tech D3 0 死链已证功能等效）。
{
  const island = eIndex.get(normalizeKey('马克斯：二级思维怎么赚钱'));
  const concept = eIndex.get(normalizeKey('马克斯：二级思维，先问市场已定价了什么'));
  const layer = concept?.data?.layer;
  const back = computeBacklinksFrom(entries);
  const inDeg = back.get(island.slug)?.length ?? 0;
  const refBy = back.get(island.slug)?.map((r) => r.title.slice(0, 10)) ?? [];
  const qnSrc = read('src/content/escape/钱从哪来：投资大师的七种收益来源.md');
  const srcHas = extractWikilinkTargets(qnSrc).some((t) => eIndex.get(normalizeKey(t))?.slug === island.slug);
  const qnPage = dist('钱从哪来投资大师的七种收益来源/index.html');
  const hrefs = new Set([...qnPage.matchAll(/href="(\/escape-guide\/[^"]+)"/g)].map((m) => decodeURIComponent(m[1])));
  const distHas = hrefs.has(`/escape-guide/${island.slug}/`);
  check(
    'P1-1',
    '先问市场 layer=理念（矛盾消除）+ 怎么赚钱 入度≥1（孤岛消除）',
    layer === '理念' && inDeg >= 1 && srcHas && distHas,
    `先问市场 layer=${layer}（档案→理念，对方 79 行注记随之变准确）；孤岛「怎么赚钱」wikilink 入度=${inDeg}（来源：${refBy.join('、')}）；钱从哪来 md 层 ${srcHas ? '✓' : '✗'} / dist 渲染（href 解码后比对）${distHas ? '✓' : '✗'}`,
  );
}

// ---------- P1-2 博格对双向链 ----------
{
  const a = eIndex.get(normalizeKey('博格：大多数基金经理就是跑不赢指数'));
  const b = eIndex.get(normalizeKey('博格：别试图跑赢市场，定投宽基指数'));
  const aTargets = extractWikilinkTargets(a.body).map((t) => eIndex.get(normalizeKey(t))?.slug);
  const bTargets = extractWikilinkTargets(b.body).map((t) => eIndex.get(normalizeKey(t))?.slug);
  const aToB = aTargets.includes(b.slug);
  const bToA = bTargets.includes(a.slug);
  const distA = dist(`${a.slug}/index.html`).includes(`<a href="${BASE}${b.slug}/"`);
  const distB = dist(`${b.slug}/index.html`).includes(`<a href="${BASE}${a.slug}/"`);
  check(
    'P1-2',
    '博格对双向链（步骤合并后仍互链）',
    aToB && bToA && distA && distB,
    `大多数基金经理→别试图跑赢：md ${aToB ? '✓' : '✗'}/dist ${distA ? '✓' : '✗'}；反向：md ${bToA ? '✓' : '✗'}/dist ${distB ? '✓' : '✗'}`,
  );
}

// ---------- P1-3 损失厌恶/前景双向链 + description 标注 ----------
{
  const s = eIndex.get(normalizeKey('损失厌恶：亏一笔比赚一笔难受得多'));
  const f = eIndex.get(normalizeKey('前景理论:亏损为什么比赚更重'));
  const sTo = extractWikilinkTargets(s.body).some((t) => eIndex.get(normalizeKey(t))?.slug === f.slug);
  const fTo = extractWikilinkTargets(f.body).some((t) => eIndex.get(normalizeKey(t))?.slug === s.slug);
  const sDesc = String(s.data.description ?? '');
  const fDesc = String(f.data.description ?? '');
  const sMark = sDesc.includes('《前景理论') && sDesc.includes('动作侧');
  const fMark = fDesc.includes('《损失厌恶') && fDesc.includes('理论侧');
  check(
    'P1-3',
    '损失厌恶↔前景理论双向链 + description 书名号标注',
    sTo && fTo && sMark && fMark,
    `md 双向：损失→前景 ${sTo ? '✓' : '✗'} / 前景→损失 ${fTo ? '✓' : '✗'}；description 标注：损失厌恶「动作侧」${sMark ? '✓' : '✗'} / 前景理论「理论侧」${fMark ? '✓' : '✗'}`,
  );
}

// ---------- P1-4 地图 evidence=C + 等级说明句 ----------
{
  const m = eIndex.get(normalizeKey('投资体系地图:六个环节与你的入口'));
  const ev = m?.data?.evidence;
  const note = m?.body?.includes('等级说明：C2 民间共识无出处') ?? false;
  check('P1-4', '投资体系地图 evidence=C + 来源节 C2 等级说明句', ev === 'C' && note, `evidence=${ev}（B→C）；「等级说明：C2 民间共识无出处」${note ? '✓' : '✗'}`);
}

// ---------- P1-5 about 模板与闸门抽查 ----------
{
  const about = read('src/content/pages/about.md');
  const gate = read('scripts/check-content.mjs');
  const t1 = /layer:\s*"/.test(about) && about.includes('必填');
  const t2 = about.includes('| layer |');
  const t3 = gate.includes('layer 必填 + 四值枚举') && gate.includes('四值枚举');
  const t4 = about.includes('算例') && /SECTION_ORDER/.test(gate) && gate.includes('算例');
  const t5 = about.includes('保持一致') && about.includes('以闸门为准');
  check(
    'P1-5',
    'about 模板与闸门逐字段一致（抽查 5 点）',
    t1 && t2 && t3 && t4 && t5,
    `模板 layer 必填行 ${t1 ? '✓' : '✗'}；layer 四层定义表 ${t2 ? '✓' : '✗'}；闸门「layer 必填+四值枚举」断言 ${t3 ? '✓' : '✗'}；六段含算例（模板↔SECTION_ORDER）${t4 ? '✓' : '✗'}；节首「与闸门保持一致、以闸门为准」声明 ${t5 ? '✓' : '✗'}`,
  );
}

// ---------- P1-6 别名 327→377 + 50 半角别名 + 注释修正 ----------
{
  const aliasesHtml = dist('aliases/index.html');
  const chips = count(aliasesHtml, /alias-chip-lead/g);
  const fullWidth = entries.filter((e) => String(e.title ?? '').includes('：'));
  const aliasOk = fullWidth.filter((e) => {
    const half = String(e.title).replace('：', ':');
    return e.aliases?.includes(half) && eIndex.get(normalizeKey(half))?.slug === e.slug;
  });
  const dy = eIndex.get(normalizeKey('亏钱的理念:单押一个故事'));
  const dySwapped = dy && String(dy.title).includes(':') && dy.aliases?.includes('亏钱的理念：单押一个故事');
  const wl = read('src/lib/wikilinks.mjs');
  const tb = read('src/pages/compare/[table].astro');
  const cmt = wl.includes('50 个标题用半角') && tb.includes('50 个标题用半角') && !/47 个标题/.test(wl + tb);
  check(
    'P1-6',
    '别名 chip 377 + 50 条半角别名可解析 + 「47」注释已修',
    chips === 377 && fullWidth.length === 50 && aliasOk.length === 50 && dySwapped && cmt,
    `dist/aliases alias-chip-lead=${chips}（327→377）；全角标题 ${fullWidth.length} 条全部带半角别名且索引自解 ${aliasOk.length}/50；「单押一个故事」title↔alias 对调 ${dySwapped ? '✓' : '✗'}；注释 50/50 且无「47 个标题」残留 ${cmt ? '✓' : '✗'}`,
  );
}

// ---------- P1-7 21 条「核对于 YYYY-MM-DD」 ----------
{
  const names21 = ['1637郁金香狂热', '1720南海泡沫', '1929大萧条', '1987黑色星期一', '1990日本', '1990台湾', '1997亚洲金融危机', '2000互联网泡沫', '2008全球金融危机', '2011欧债危机', '2020新冠崩盘', '2022股债双杀', '1993到1994', '2001到2005', '2007到2008', '2015到2016', '2018', '2021到2024', '大师的业绩怎么写', '泡沫的共同结构', '修行七件事'];
  const RE = /；核对于 \d{4}-\d{2}-\d{2}/;
  let hit = 0;
  const detail = [];
  for (const n of names21) {
    const c = byPrefix(n);
    if (c.length !== 1) { detail.push(`${n}:解析${c.length}条✗`); continue; }
    const cnt = count(c[0].body, RE);
    if (cnt >= 1) hit += 1;
    else detail.push(`${n.slice(0, 10)}:0次✗`);
  }
  const globalTotal = entries.reduce((s, e) => s + count(e.body, RE), 0);
  check(
    'P1-7',
    '21 条「核对于 YYYY-MM-DD」命中',
    hit === 21 && detail.length === 0,
    `21 条命中 ${hit}/21${detail.length ? '（' + detail.join('；') + '）' : ''}；全库「；核对于 YYYY-MM-DD」总计 ${globalTotal}（基线 86 + 追加 21 = 107 预期）`,
  );
}

// ---------- P1-8 12 条路径条目四字段 + 3 超长字段限长 ----------
{
  const twelve = ['先分清三种钱：保命钱、闲钱、搏钱', '凯利公式：仓位下注多少', '博格：别试图跑赢市场，定投宽基指数', 'A股长期收益与回撤', '买入之前先写下「错了怎么办」', '利弗莫尔：错了就砍，永远不摊平输家', '期望值与破产：仓位是算术问题', '行情差的时候，最好的策略是观望', '钱从哪来：投资大师的七种收益来源', '先搞清楚：你的交易对手是谁', '损失厌恶：亏一笔比赚一笔难受得多', '频繁交易的换手成本'];
  const FIELDS = ['lede', 'when', 'keyNumber', 'maxRisk'];
  const missing = [];
  for (const t of twelve) {
    const e = eIndex.get(normalizeKey(t));
    if (!e) { missing.push(`${t.slice(0, 10)}:解析失败`); continue; }
    for (const f of FIELDS) {
      const v = String(e.data[f] ?? '').trim();
      if (!v) missing.push(`${t.slice(0, 10)}:缺${f}`);
    }
  }
  const w2015 = one('2015', '2015到2016');
  const k1997 = one('1997', '1997');
  const r2007 = one('2007', '2007到2008');
  const whenLen = String(w2015.data.when ?? '').length;
  const knLen = String(k1997.data.keyNumber ?? '').length;
  const knLead = String(k1997.data.keyNumber ?? '').slice(0, 16).includes('50.9');
  const riskLen = String(r2007.data.maxRisk ?? '').length;
  const crashes = JSON.parse(read('src/data/compare.json')).tables.find((t) => t.slug === 'crashes');
  const row1997 = crashes.rows.find((r) => eIndex.get(normalizeKey(r.src))?.slug === k1997.slug);
  const compare509 = row1997 ? JSON.stringify(row1997).includes('50.9') : false;
  check(
    'P1-8',
    '12 条路径条目四字段齐全 + 3 超长字段≤限长 + 50.9 逐字在 compare',
    missing.length === 0 && whenLen <= 40 && knLen <= 114 && knLead && riskLen <= 40 && compare509,
    `四字段缺失 ${missing.length ? missing.join('；') : '0 处（12/12×4 齐全）'}；2015 when=${whenLen}字(≤40)；1997 keyNumber=${knLen}字(≤114)且标志数前置 ${knLead ? '✓' : '✗'}；2007 maxRisk=${riskLen}字(≤40)；compare 1997 行含 50.9 ${compare509 ? '✓' : '✗'}`,
  );
}

// ---------- P1-9 dist 全局 nav 六域入口 ----------
{
  const navBlock = (html) => {
    const i = html.indexOf('<details class="nav-drop">');
    if (i < 0) return '';
    const j = html.indexOf('</details>', i);
    return html.slice(i, j + 9);
  };
  const home = navBlock(dist('index.html'));
  const sub = navBlock(dist('别追高/index.html'));
  const topicLinks = (b) => count(b, /href="\/escape-guide\/topic\/0[1-6]\/"/g);
  const compareLinks = (b) => count(b, /href="\/escape-guide\/compare\/[a-z]+\/"/g);
  check(
    'P1-9',
    '全局 nav details.nav-drop 含六域+四表（首页与子页）',
    topicLinks(home) === 6 && compareLinks(home) === 4 && topicLinks(sub) === 6 && compareLinks(sub) === 4,
    `首页：六域 ${topicLinks(home)}/6 + 四表 ${compareLinks(home)}/4；子页(别追高)：六域 ${topicLinks(sub)}/6 + 四表 ${compareLinks(sub)}/4（构建期渲染、全局 Base.astro）`,
  );
}

// ---------- P1-10 别名页组头 + chip 前置 + 零 <script> ----------
{
  const html = dist('aliases/index.html');
  const h4 = [...html.matchAll(/<h4 class="alias-ghead" id="([^"]+)">/g)].map((m) => m[1]);
  const chipHrefs = [...html.matchAll(/<a class="chip alias-gchip" href="#([^"]+)"/g)].map((m) => m[1]);
  const dangling = chipHrefs.filter((h) => !h4.includes(h));
  const items = [...html.matchAll(/<li class="alias-item">/g)].length;
  const leadFirst = [...html.matchAll(/<li class="alias-item"><a class="alias-chip alias-chip-lead"/g)].length;
  const noScript = count(html, /<script/g) === 0;
  const domains = new Set(h4.map((id) => id.split('-')[1]));
  check(
    'P1-10',
    '别名页组头 h4 + chip 锚完整 + 又称 chip 前置 + 零 <script>',
    h4.length >= 40 && chipHrefs.length >= 40 && dangling.length === 0 && domains.size === 6 && leadFirst === items && noScript,
    `组头 h4 ${h4.length} 个（6 域：${[...domains].join(',')}）；字母 chip ${chipHrefs.length} 个、锚悬空 ${dangling.length}；alias-item ${items} 行、首子元素为 lead chip ${leadFirst}/${items}；<script>=${noScript ? '0 ✓' : '非零 ✗'}`,
  );
}

// ---------- P1-11 <640px 2×2 CSS + 超长 keyNumber details ----------
{
  const css = read('dist/_astro/' + fs.readdirSync(path.join(DIST, '_astro')).find((f) => f.endsWith('.css')));
  const grid2 = /\.quick-cards\{[^}]*repeat\(2,1fr\)/.test(css);
  const e1997 = one('1997', '1997');
  const p = dist(`${e1997.slug}/index.html`);
  const det = p.includes('<details class="qc-more">') && p.includes('<summary>完整口径</summary>');
  check(
    'P1-11',
    'quick-cards 2×2 基础规则 + 1997 长 keyNumber details 折叠',
    grid2 && det,
    `CSS .quick-cards 基础 repeat(2,1fr)（≥1280 才 4 列）${grid2 ? '✓' : '✗'}；1997 页 <details class="qc-more">「完整口径」${det ? '✓' : '✗'}`,
  );
}

// ---------- P1-12 mod-howto/mod-notes + <tr id> 70/70 零撞 ----------
{
  const css = read('dist/_astro/' + fs.readdirSync(path.join(DIST, '_astro')).find((f) => f.endsWith('.css')));
  const howto = /\.mod-howto\{[^}]*border-top:2px solid var\(--accent\)/.test(css);
  const notes = /\.mod-notes\{[^}]*background:var\(--bg-soft\)/.test(css);
  const tables = ['crashes', 'masters', 'biases', 'philosophy'];
  let total = 0;
  const ids = new Set();
  for (const t of tables) {
    const h = dist(`compare/${t}/index.html`);
    for (const m of h.matchAll(/<tr id="([^"]+)"/g)) { total += 1; ids.add(t + ':' + m[1]); }
  }
  check(
    'P1-12',
    'mod-howto accent 上沿 + mod-notes bg-soft + <tr id> 70/70 零撞',
    howto && notes && total === 70 && ids.size === 70,
    `CSS howto 上沿 ${howto ? '✓' : '✗'} / notes 底块 ${notes ? '✓' : '✗'}；<tr id> 总 ${total}、去重 ${ids.size}（期望 70/70）`,
  );
}

// ---------- P1-13 域页四段分组 + 三处 layer-tag 带色 ----------
{
  const t02 = dist('topic/02/index.html');
  const heads = [...t02.matchAll(/<h3 class="topic-layer-head (layer-[^"]+)" id="layer-[^"]+">([^<]+)/g)].map((m) => `${m[1]}(${m[2].trim()})`);
  const jump = t02.includes('class="topic-nav layer-jump"') && count(t02, /<a class="chip layer-[^"]+"/g) === 3;
  const t0456 = ['04', '05', '06'].every((d) => !fs.readFileSync(path.join(DIST, 'topic', d, 'index.html'), 'utf8').includes('topic-layer-head'));
  const idx = dist('index.html');
  const entry = dist('别追高/index.html');
  const tags = idx.includes('layer-tag layer-') && t02.includes('layer-tag layer-') && entry.includes('layer-tag layer-');
  const css = read('dist/_astro/' + fs.readdirSync(path.join(DIST, '_astro')).find((f) => f.endsWith('.css')));
  const colors = ['layer-理念', 'layer-执行', 'layer-档案', 'layer-工具'].every((c) => css.includes(`.${c}{`) || css.includes(`.${c} {`));
  check(
    'P1-13',
    '域页层分组（02 三段+直达 chip；04/05/06 无）+ 三处 layer-tag 带色 + 四色 CSS',
    heads.length === 3 && jump && t0456 && tags && colors,
    `topic/02 段头：${heads.join('、')}（马克斯改层后 19/1/19）；layer-jump chip ${jump ? '3✓' : '✗'}；04/05/06 无段头 ${t0456 ? '✓' : '✗'}；layer-tag 三处（首页目录/域页/条目头）${tags ? '✓' : '✗'}；四色 CSS ${colors ? '✓' : '✗'}`,
  );
}

// ---------- P1-14 package.json 显式依赖 ----------
{
  const pkg = JSON.parse(read('package.json'));
  const has = pkg.dependencies?.yaml && pkg.dependencies?.['unist-util-visit'];
  check('P1-14', 'package.json 显式声明 yaml + unist-util-visit', has, `dependencies: yaml=${pkg.dependencies?.yaml}、unist-util-visit=${pkg.dependencies?.['unist-util-visit']}`);
}

// ---------- P1-15 npm run check 含 check-compare ----------
{
  const pkg = JSON.parse(read('package.json'));
  const c = pkg.scripts?.check ?? '';
  const b = pkg.scripts?.build ?? '';
  check(
    'P1-15',
    'check = check-content && check-compare（build 同链）',
    c.includes('check-content') && c.includes('check-compare') && b.includes('npm run check'),
    `check="${c}"；build="${b}"`,
  );
}

// ---------- P1-16 404 noindex + ico ----------
{
  const p404 = dist('404.html');
  const idx = dist('index.html');
  const noindex = /<meta name="robots" content="noindex,nofollow">/.test(p404);
  const noCanon = !p404.includes('rel="canonical"');
  const ico2 = count(p404, /<link rel="icon" type="image\/x-icon"[^>]*>/g) === 2 && p404.includes('zo0043.png');
  const homeCanon = idx.includes('rel="canonical"');
  check(
    'P1-16',
    '404 noindex,nofollow + 无 canonical + ico 双 link（首页 canonical 回归）',
    noindex && noCanon && ico2 && homeCanon,
    `404: robots noindex,nofollow ${noindex ? '✓' : '✗'} / 无自引用 canonical ${noCanon ? '✓' : '✗'} / ico 16+32+png ${ico2 ? '✓' : '✗'}；首页 canonical 保留 ${homeCanon ? '✓' : '✗'}`,
  );
}

// ---------- 输出 ----------
let fail = 0;
for (const r of results) {
  if (!r.pass) fail += 1;
  console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.id} | ${r.name}\n     证据: ${r.evidence}`);
}
console.log(`\n===== t16 二十项验收结论: ${fail === 0 ? '全部 PASS（20/20）' : fail + ' 项 FAIL'} =====`);
process.exit(fail === 0 ? 0 : 1);
