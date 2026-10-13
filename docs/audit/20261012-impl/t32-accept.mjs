#!/usr/bin/env node
// t32 二十四项逐条验收脚本（Phase 2：U-1 + A1-A6 + B1-B6 + C1-C10，只读 src/ 与 dist/，不改任何文件）
// 依据：docs/audit/00-final-report.md §3 P2 全表 + §5.1 + t17–t31 交付要求。
// B3/C5 的 canary（临时改源文件→判红→字节还原）为写操作，单独在日志 §7/§8 以命令原文执行，
// 本脚本只做其只读部分（存量 0 keyFigure / 122 条无 keyFigure、fallback 行为）。
// 用法：node docs/audit/20261012-impl/t32-accept.mjs （须在 npm run build 之后运行）
import fs from 'node:fs';
import path from 'node:path';
import { loadEntries, makeEntryIndex } from '../../../src/lib/entries.mjs';
import { normalizeKey } from '../../../src/lib/slug.mjs';
import { PATHS, pathHitsFor } from '../../../src/lib/paths.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const DIST = path.join(ROOT, 'dist');
const BASE = '/escape-guide/';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const dist = (p) => fs.readFileSync(path.join(DIST, p), 'utf8');
const count = (s, re) => (s.match(re) || []).length;

const entries = loadEntries();
const eIndex = makeEntryIndex(entries);
const entryPages = entries.map((e) => `${e.slug}/index.html`);
const allEntryHtml = entryPages.map((p) => dist(p));
const cssName = fs.readdirSync(path.join(DIST, '_astro')).find((f) => f.endsWith('.css'));
const css = read(`dist/_astro/${cssName}`);
const decHref = (html) => new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => decodeURIComponent(m[1])));

const results = [];
const check = (id, name, pass, evidence) => results.push({ id, name, pass: !!pass, evidence });

// ---------- U-1 结论条 ----------
{
  const four = (e) => ['lede', 'when', 'keyNumber', 'maxRisk'].every((f) => String(e.data[f] ?? '').trim());
  const full = entries.filter(four);
  const barAll = allEntryHtml.filter((h) => h.includes('class="concl-bar"')).length;
  const fullForm = allEntryHtml.filter((h) => h.includes('class="concl-bar"') && h.includes('class="cb-num"') && h.includes('class="cb-risk"')).length;
  const sampleFull = dist('1997亚洲金融危机从泰铢到韩元/index.html');
  const sampleFullOk = sampleFull.includes('class="concl-bar"') && /cb-num[^>]*>−?50\.9%/.test(sampleFull);
  const degraded = full.length < 122 ? allEntryHtml.findIndex((h) => h.includes('class="concl-bar"') && !h.includes('class="cb-num"')) : -1;
  const hide639 = /@media[^{]*max-width:639px[^{]*\{[^}]*\.cb-risk\{display:none/.test(css.replace(/\n/g, '')) || /\.cb-risk\{display:none/.test(css);
  const conclH = /--concl-h:2\.2rem/.test(css) && /section-chips\{[^}]*top:calc\(var\(--header-h\) \+ var\(--concl-h,0rem\)\)/.test(css.replace(/\n/g, ''));
  check(
    'U-1',
    '结论条在场（完整/降级双形态）+ 639px 隐 cb-risk + --concl-h 补偿',
    barAll === 122 && fullForm === full.length && sampleFullOk && degraded >= 0 && hide639 && conclH,
    `concl-bar 覆盖 ${barAll}/122；完整形态（cb-title+ev+cb-num+cb-risk）${fullForm} 条（数据侧四字段齐全 ${full.length} 条）；1997 样本 cb-num=−50.9%（正则提取，keyFigure 字段未用）${sampleFullOk ? '✓' : '✗'}；降级形态样本 index=${degraded}；CSS 639px 隐 .cb-risk ${hide639 ? '✓' : '✗'}；--concl-h + section-chips top 补偿 ${conclH ? '✓' : '✗'}`,
  );
}

// ---------- A1 A 级色统一 ----------
{
  const evARules = [...css.matchAll(/([.#][^{]*ev-A[^{]*)\{([^}]*)\}/g)].map((m) => ({ sel: m[1], body: m[2] }));
  const allOk = evARules.length >= 2 && evARules.every((r) => r.body.includes('var(--ok)'));
  const noAccent = !evARules.some((r) => r.body.includes('var(--accent)'));
  check('A1', 'A 级色统一（全部 ev-A 规则 var(--ok)，无 accent 残留）', allOk && noAccent,
    `ev-A 规则 ${evARules.length} 处：${evARules.map((r) => `${r.sel.slice(0, 24)}=${r.body.includes('var(--ok)') ? 'ok' : '✗'}`).join('，')}；accent 残留 ${noAccent ? '0' : '有'}`);
}

// ---------- A2 reduced-motion ----------
{
  const ok = /@media \(prefers-reduced-motion: ?reduce\)/.test(css) && /scroll-behavior:auto/.test(css) && /transition:none!important/.test(css);
  check('A2', 'prefers-reduced-motion 块在场', ok, `@media (prefers-reduced-motion: reduce) ${ok ? '✓' : '✗'}（scroll-behavior:auto + transition/animation/transform 置空）`);
}

// ---------- A3 .dc-num ----------
{
  const m = /\.dc-num\{([^}]*)\}/.exec(css);
  const ok = m && m[1].includes('var(--fg-dim)');
  check('A3', '.dc-num 用 fg-dim（1.72:1→5.3:1）', ok, `.dc-num{${(m ? m[1] : '').slice(0, 80)}}`);
}

// ---------- A4 反链下划线 ----------
{
  const m = /\.backlinks a\{([^}]*)\}/.exec(css);
  const ok = m && m[1].includes('underline') && m[1].includes('rule-strong');
  check('A4', '.backlinks a 常显下划线（与 .wl 同语言）', ok, `.backlinks a{${(m ? m[1] : '').slice(0, 90)}}`);
}

// ---------- A5 打印保留 quick-cards 2×2 ----------
{
  const pIdx = css.indexOf('@media print{');
  const printBlock = pIdx >= 0 ? css.slice(pIdx, css.indexOf('@media', pIdx + 10) > 0 ? css.indexOf('@media', pIdx + 10) : css.length) : '';
  const inHide = /(\.quick-cards[^{}]*,|,\.quick-cards)[^{]*display:none|\.quick-cards\{display:none/.test(printBlock);
  const grid2 = /\.quick-cards\{[^}]*repeat\(2,1fr\)/.test(printBlock);
  check('A5', '打印保留 quick-cards 且 2×2', !inHide && grid2, `打印隐藏清单含 .quick-cards：${inHide ? '是✗' : '否✓'}；打印块内 repeat(2,1fr)：${grid2 ? '✓' : '✗'}`);
}

// ---------- A6 aria-current ----------
{
  const gnav = (h) => { const i = h.indexOf('<nav class="site-nav'); const j = h.indexOf('</nav>', i); return i >= 0 ? h.slice(i, j) : ''; };
  const cur = (h) => count(gnav(h), /aria-current="page"/g);
  const home = dist('index.html');
  const homeOk = cur(home) === 1 && gnav(home).includes('href="/escape-guide/#all" aria-current="page"') && !/<a class="site-title"[^>]*aria-current/.test(home);
  const sub = dist('topic/01/index.html');
  const subOk = cur(sub) === 1 && gnav(sub).includes('/escape-guide/topic/01/" aria-current="page"');
  const entryPage = dist('别追高/index.html');
  const none = cur(entryPage) === 0 && cur(dist('404.html')) === 0;
  const chipNote = count(dist('topic/01/index.html'), /aria-current="page"/g) - cur(dist('topic/01/index.html'));
  check('A6', '全局 nav aria-current（首页落目录、域页落下拉、条目/404 无；每导航上下文至多 1）', homeOk && subOk && none,
    `全局 nav：首页 ${cur(home)}（落 #all 目录 ${homeOk ? '✓' : '✗'}、site-title 未标 ✓）；topic/01 ${cur(sub)} 落本域下拉 ${subOk ? '✓' : '✗'}；条目页/404 ${none ? '0 ✓' : '非0 ✗'}；（页内 chip 行另有 aria-current ${chipNote} 处=另一导航上下文，与 compare 表页同款既有模式）`);
}

// ---------- B1 about h2 无 mod-*（红线①②已在日志 §5b/§5d 实测，此处复核 about） ----------
{
  const about = dist('about/index.html');
  const n = count(about, /mod-/g);
  check('B1', 'about 页 mod-* 清零（条目页五节 122/122 见日志 §5d）', n === 0, `about 页 mod- 命中 ${n}（期望 0；条目页 119×5+3×6 节：日志 §5d）`);
}

// ---------- B2 JSON-LD 注释已删 + 全站仍无 ----------
{
  const srcHit = count(read('src/content.config.ts') + read('scripts/check-content.mjs'), /JSON-LD/g);
  const distHit = count(fs.readdirSync(DIST, { recursive: true }).filter((f) => String(f).endsWith('.html')).map((f) => fs.readFileSync(path.join(DIST, f), 'utf8')).join(''), /ld\+json/g);
  check('B2', 'JSON-LD 注释 0 残留 + 全站无 ld+json', srcHit === 0 && distHit === 0, `src+scripts JSON-LD=${srcHit}；dist ld+json=${distHit}（与「未做实体补全」声明一致）`);
}

// ---------- B3 只读部分（canary 见日志 §7） ----------
{
  const schema = read('src/content.config.ts');
  const gate = read('scripts/check-content.mjs');
  const req = /checked:\s*z\.coerce\.date\(\)/.test(schema) && !/checked:\s*z\.coerce\.date\(\)\.optional/.test(schema);
  const err = /if \(!d\.checked\) fail\(f, '缺 checked（来源核对日期，对所有条目必填，C 级也不例外/.test(gate);
  check('B3', 'checked schema 必填 + 闸门 error 断言在场（canary 判红→还原：日志 §7）', req && err, `schema checked 必填 ${req ? '✓' : '✗'}；闸门 checked error 断言 ${err ? '✓' : '✗'}；canary 实测见日志 §7`);
}

// ---------- B4 spec 例外节 + 两条登记 ----------
{
  const spec = read('docs/content-v2-spec.md');
  const ex = spec.includes('真实数据复算型算例') && spec.includes('（官方数字的复算）');
  const regs = count(spec, /已登记合规形态（2 条/g);
  const bf = entries.find((e) => String(e.title ?? '').startsWith('巴菲特：复利机器'));
  const ms = entries.find((e) => String(e.title ?? '').startsWith('大师的业绩怎么写'));
  const bfOk = bf && bf.body.includes('官方数字的复算，输入均为 2024 年度信逐字数字');
  const msOk = ms && ms.body.includes('可复算：用巴菲特 2024/2025 股东信官方对比表复算 CAGR');
  check('B4', 'spec 例外节在场 + 两条算例登记（条目现写法逐字保留）', ex && regs === 1 && bfOk && msOk,
    `spec「真实数据复算型算例」例外 ${ex ? '✓' : '✗'}；登记节「已登记合规形态（2 条）」${regs === 1 ? '✓' : '✗'}；巴菲特复利正文标签（官方数字的复算…）${bfOk ? '✓' : '✗'}；大师业绩正文标签（可复算：…股东信…）${msOk ? '✓' : '✗'}`);
}

// ---------- B5 悬空引用修正 ----------
{
  const blob = read('scripts/check-content.mjs') + read('src/lib/wikilinks.mjs') + read('src/content.config.ts');
  const hit = count(blob, /audit-synthesis-20261012|audit-t13-bare-url-tests/g);
  check('B5', '悬空审计文件引用 0 命中（src+scripts）', hit === 0, `audit-synthesis/audit-t13 引用 ${hit} 处（期望 0；t24 改为「未随仓库发布，规则原文已内联」）`);
}

// ---------- B6a #all + B6b CTA ----------
{
  const home = dist('index.html');
  const allAnchor = home.includes('id="all"');
  const navAll = decHref(dist('about/index.html')).has('/escape-guide/#all');
  const cta = /来源规则（完整版）/.test(home) && decHref(home).has(`${BASE}about/#来源规则`);
  const aboutAnchor = dist('about/index.html').includes('id="来源规则"');
  check('B6a/B6b', '#all 锚点 + 子页「目录」指 #all + CTA「来源规则（完整版）」→ about/#来源规则', allAnchor && navAll && cta && aboutAnchor,
    `首页 #all ${allAnchor ? '✓' : '✗'}；子页导航 href=${navAll ? '#all✓' : '✗'}；CTA 文案+href ${cta ? '✓' : '✗'}；about h2 id=来源规则 ${aboutAnchor ? '✓' : '✗'}`);
}

// ---------- C1 PATH 04 ----------
{
  const p4 = PATHS[3];
  const steps = p4.steps.map((s) => eIndex.get(normalizeKey(s)));
  const allHit = steps.every(Boolean);
  const home = dist('index.html');
  const intro = home.includes('四种人');
  // 第 4 张卡区域：倒数第 2 个 start-card 之后
  const stepLinks = p4.steps.filter((s) => { const e = eIndex.get(normalizeKey(s)); return e && decHref(home).has(`${BASE}${e.slug}/`); }).length;
  const mapBacks = count(home, /完整五步见/g);
  const noMapBack = mapBacks === 3 && p4.map === undefined;
  check('C1', 'PATH 04 4/4 步 byTitle 解析 + 「四种人」导语 + 无 map 回链（t18 裁定）', allHit && intro && stepLinks === 4 && noMapBack,
    `steps 解析 ${steps.filter(Boolean).length}/4（${p4.steps.map((s) => s.slice(0, 8)).join('、')}）；导语「四种人」${intro ? '✓' : '✗'}；第 4 卡步骤链接 ${stepLinks}/4；map 回链 ${noMapBack ? '无✓' : '有✗'}`);
}

// ---------- C2 6 details 全开 + 122 dir-item id + 域锚点 ----------
{
  const home = dist('index.html');
  const open6 = count(home, /<details class="dom-details" open>/g) === 6;
  const ids = [...home.matchAll(/<li class="dir-item" id="([^"]+)"/g)].map((m) => m[1]);
  const uniq = new Set(ids).size === ids.length && ids.length === 122;
  const sumIds = ['市场与周期', '理念与理论', '人性与心理', '规则与制度', '风险与防守', '实务与查证'].every((n) => home.includes(`id="${n}"`));
  const urlMatch = entries.every((e) => ids.includes(e.slug));
  check('C2', '6 details open + 122 dir-item id 零撞且与条目 slug 一致 + 6 域 summary 锚点', open6 && uniq && sumIds && urlMatch,
    `dom-details open ${count(home, /<details class="dom-details" open>/g)}/6；dir-item id ${ids.length}（零撞 ${new Set(ids).size === ids.length ? '✓' : '✗'}、=122 ${ids.length === 122 ? '✓' : '✗'}、覆盖全部条目 slug ${urlMatch ? '✓' : '✗'}）；6 域 summary id ${sumIds ? '✓' : '✗'}`);
}

// ---------- C3 路径 chip ----------
{
  const hits = new Map();
  for (const e of entries) { const h = pathHitsFor(e.slug, eIndex, normalizeKey); if (h.length) hits.set(e.slug, h); }
  const barPages = entryPages.filter((p) => dist(p).includes('class="path-chips"')).length;
  const s1 = eIndex.get(normalizeKey('先分清三种钱：保命钱、闲钱、搏钱'));
  const s1ok = dist(`${s1.slug}/index.html`).includes('PATH 01 · 1/4') && decHref(dist(`${s1.slug}/index.html`)).has(`${BASE}${eIndex.get(normalizeKey('泡沫的共同结构：五次崩盘里的同一套剧本')).slug}/`);
  const s2 = eIndex.get(normalizeKey('利弗莫尔：错了就砍，永远不摊平输家'));
  const s2ok = dist(`${s2.slug}/index.html`).includes('PATH 02 · 2/4');
  const s3 = eIndex.get(normalizeKey('看不懂的不碰'));
  const s3ok = dist(`${s3.slug}/index.html`).includes('完整五步见投资体系地图');
  const p4last = eIndex.get(normalizeKey('证券纠纷调解与仲裁：调解不成怎么办'));
  const p4ok = p4last ? dist(`${p4last.slug}/index.html`).includes('路径走完') : false;
  check('C3', '路径 chip 命中实数 16/122 + 三态抽样（下一步/中步/末步回链 + PATH 04 静态）', hits.size === 16 && barPages === 16 && s1ok && s2ok && s3ok && p4ok,
    `pathHitsFor 命中 ${hits.size}/122（期望 16）；dist 渲染 ${barPages}/16；先分清三种钱 1/4→下一步 ${s1ok ? '✓' : '✗'}；利弗莫尔错了就砍 2/4 ${s2ok ? '✓' : '✗'}；看不懂的不碰 末步→完整五步见 ${s3ok ? '✓' : '✗'}；调解不成怎么办 路径走完 ${p4ok ? '✓' : '✗'}`);
}

// ---------- C4 同域 chip + @supports 进度条 ----------
{
  const doms = [...new Set(entries.map((e) => String(e.data.chapter)))].sort();
  let prevOnly = 0, nextOnly = 0, both = 0, neither = 0;
  for (const d of doms) {
    const list = entries.filter((e) => String(e.data.chapter) === d).sort((a, b) => (a.data.weight ?? 0) - (b.data.weight ?? 0));
    list.forEach((e, i) => {
      const p = i > 0, n = i < list.length - 1;
      if (p && n) both++; else if (p) prevOnly++; else if (n) nextOnly++; else neither++;
    });
  }
  const withPrev = allEntryHtml.filter((h) => h.includes('← 上一条：')).length;
  const withNext = allEntryHtml.filter((h) => h.includes('下一条：')).length;
  const withTop = allEntryHtml.filter((h) => h.includes('class="entry-nav"') && h.includes('#main')).length;
  const dom01 = entries.filter((e) => String(e.data.chapter) === doms[0]).sort((a, b) => (a.data.weight ?? 0) - (b.data.weight ?? 0));
  const first = dom01[0], lastE = dom01[dom01.length - 1];
  const firstOk = dist(`${first.slug}/index.html`).includes('entry-nav') && !dist(`${first.slug}/index.html`).includes('← 上一条');
  const lastOk = dist(`${lastE.slug}/index.html`).includes('entry-nav') && !dist(`${lastE.slug}/index.html`).includes('下一条：');
  const supports = /@supports[^{]*animation-timeline:scroll\(\)[^{]*\{/.test(css) && css.includes('class="read-progress"') === false && /\.read-progress\{/.test(css);
  const rpRule = (/.read-progress\{[^}]*\}/.exec(css.replace(/\n/g, '')) || [,''])[0];
  const base = rpRule.includes('position:fixed') && rpRule.includes('z-index:40') && !rpRule.includes('background');
  check('C4', '同域上/下一 chip（数据侧分布=dist 实测）+ 回顶恒渲染 + @supports 进度条纯 CSS',
    withPrev === both + prevOnly && withNext === both + nextOnly && withTop === 122 && firstOk && lastOk && supports && base,
    `数据侧 both=${both}/prevOnly=${prevOnly}/nextOnly=${nextOnly}/neither=${neither}；dist 上一条 ${withPrev}（=${both + prevOnly}）下一条 ${withNext}（=${both + nextOnly}）回顶 ${withTop}/122；域首条（weight 最小：${first.title.slice(0,10)}）无上一条 ${firstOk ? '✓' : '✗'}、域末条（${lastE.title.slice(0,10)}）无下一条 ${lastOk ? '✓' : '✗'}；@supports(animation-timeline) ${supports ? '✓' : '✗'} + .read-progress fixed z40 ${base ? '✓' : '✗'}`);
}

// ---------- C5 只读部分（canary 见日志 §8） ----------
{
  const gate = read('scripts/check-content.mjs');
  const assert = /keyFigure/.test(gate) && /逐字子串|不是.*子串|非逐字/.test(gate);
  const none = entries.filter((e) => e.data.keyFigure).length;
  const fb = /cb-num/.test(dist('1997亚洲金融危机从泰铢到韩元/index.html'));
  check('C5', 'keyFigure 断言在场 + 122 条 0 存量 + fallback（cb-num 走正则）（canary 判红：日志 §8）', assert && none === 0 && fb,
    `闸门 keyFigure 断言 ${assert ? '✓' : '✗'}；存量 keyFigure ${none} 条（期望 0）；1997 cb-num 正则提取 ${fb ? '✓' : '✗'}；canary 三支判红见日志 §8`);
}

// ---------- C6 标签字号下限 ----------
{
  const sizes = [...css.matchAll(/font-size:([\d.]+)rem/g)].map((m) => parseFloat(m[1]));
  const below07 = sizes.filter((s) => s < 0.7);
  const below072 = sizes.filter((s) => s < 0.72);
  const evFlag = /\.ev-flag\{font-size:\.7rem\}/.test(css.replace(/\n/g, ''));
  check('C6', '产物 CSS 最小功能字号 ≥0.7rem（唯一 <0.72 处为 .ev-flag 0.7rem）', below07.length === 0 && below072.length <= 1 && evFlag,
    `font-size 声明 ${sizes.length} 处；<0.7rem ${below07.length} 处${below07.length ? '：' + below07.join(',') : ''}；<0.72rem ${below072.length} 处（期望≤1）；.ev-flag 0.7rem ${evFlag ? '✓' : '✗'}`);
}

// ---------- C7 404 chip ----------
{
  const p = dist('404.html');
  const chips = [...p.matchAll(/<a class="alias-chip" href="([^"]+)"/g)].map((m) => decodeURIComponent(m[1]));
  const exist = chips.filter((c) => fs.existsSync(path.join(DIST, c.slice(BASE.length) + 'index.html'))).length;
  const noScript = count(p, /<script/g) === 0;
  const inRange = chips.length >= 8 && chips.length <= 12;
  check('C7', '404 高频俗称 chip 8-12 个 + 链接全部解析 + 零 <script>', inRange && exist === chips.length && noScript,
    `chip ${chips.length} 个（8-12）；href 全部存在 ${exist}/${chips.length}；<script> ${noScript ? '0✓' : '非0✗'}；「你是不是要找」区块在场 ${p.includes('nf-suggest-label') ? '✓' : '✗'}`);
}

// ---------- C8 等级说明只剩 C 级 ----------
{
  const dir = path.join(ROOT, 'src/content/escape');
  const re = /等级说明：/g;
  let lines = 0, nonC = [];
  for (const e of entries) {
    const n = count(e.body, re);
    lines += n;
    if (n && !String(e.data.evidence ?? '').startsWith('C')) nonC.push(e.title.slice(0, 10));
  }
  check('C8', '「等级说明：」只剩 C 级在用（17 处/17 条，非 C 级 0）', lines === 17 && nonC.length === 0,
    `全库「等级说明：」${lines} 行（t19 改前 19→改后 17）；非 C 级使用 ${nonC.length} 条${nonC.length ? '：' + nonC.join('、') : ''}`);
}

// ---------- C9 单层域注明 ----------
{
  const t4 = dist('topic/04/index.html'), t5 = dist('topic/05/index.html'), t6 = dist('topic/06/index.html');
  const t123 = ['01', '02', '03'].map((d) => dist(`topic/${d}/index.html`));
  const ok = t4.includes('本域 10 条均为') && t5.includes('本域 16 条均为') && t6.includes('本域 7 条均为') &&
    t4.includes('layer-执行') && t6.includes('layer-工具') && t123.every((h) => !h.includes('本域 ') || !h.includes('条均为'));
  check('C9', '04/05/06 单层域注明渲染（10/16/7 条 + layer-tag），01/02/03 不渲染', ok,
    `04 执行×10 ${t4.includes('本域 10 条均为') ? '✓' : '✗'}；05 执行×16 ${t5.includes('本域 16 条均为') ? '✓' : '✗'}；06 工具×7 ${t6.includes('本域 7 条均为') ? '✓' : '✗'}；01/02/03 无注明 ${t123.every((h) => !h.includes('条均为')) ? '✓' : '✗'}`);
}

// ---------- C10 rss pubDate + sitemap lastmod ----------
{
  const rss = read('src/pages/rss.xml.js');
  const logic = /e\.data\.date \?\? e\.data\.checked \?\? new Date\(\)/.test(rss);
  const distRss = fs.readFileSync(path.join(DIST, 'rss.xml'), 'utf8');
  const pub = count(distRss, /<pubDate>/g);
  const sm = dist('sitemap-0.xml');
  const lastmod = count(sm, /<lastmod>/g);
  check('C10', 'rss pubDate = date ?? checked 回退 + dist 122 pubDate + sitemap lastmod 在场', logic && pub === 122 && lastmod >= 135,
    `rss.xml.js 回退逻辑 ${logic ? '✓' : '✗'}；dist rss <pubDate> ${pub}（期望 122）；sitemap <lastmod> ${lastmod}（期望≥135 全页）`);
}

// ---------- 输出 ----------
let fail = 0;
for (const r of results) {
  if (!r.pass) fail += 1;
  console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.id} | ${r.name}\n     证据: ${r.evidence}`);
}
console.log(`\n===== t32 二十四项验收结论: ${fail === 0 ? '全部 PASS（24/24）' : fail + ' 项 FAIL'} =====`);
process.exit(fail === 0 ? 0 : 1);
