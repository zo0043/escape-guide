#!/usr/bin/env node
// K1 · TsangerJinKai02 W05（字重 500）子集化工具
//
// 流程（对应任务 K1-字体）：
//   1. 遍历 dist/**/*.html（139 页），收集全部去重字符（含标点/数字/全角/拉丁/符号）
//   2. 并上安全边集（常见金融/历史用字 + 全量 CJK 标点 + 全角区 + 常用符号），
//      宁可多收——边集让「新条目复用常见词」不必重新子集化
//   3. 写 scripts/fonts/chars.txt（一行一字符，按码点排序）——覆盖闸门
//      scripts/check-font-coverage.mjs 的对照清单
//   4. 调 pyftsubset 生成 public/fonts/tscjk-500.woff2（--flavor=woff2）
//   5. 断言 woff2 体积 ≤ 2.5MB（红线）
//
// 字体来源（官方链路，与 Kami skills/kami/scripts/ensure-fonts.sh 同源）：
//   正式来源 = tw93/Kami 仓库 assets/fonts/TsangerJinKai02-W05.ttf（git 跟踪，commit 372a6ca）。
//   下载顺序（与 Kami ensure-fonts.sh 同源，实测 jsdmirror 最稳，jsdelivr 对大文件 404）：
//   1) https://cdn.jsdmirror.com/gh/tw93/Kami@main/assets/fonts/TsangerJinKai02-W05.ttf
//   2) https://cdn.jsdelivr.net/gh/tw93/Kami@main/assets/fonts/TsangerJinKai02-W05.ttf
//   3) https://tsanger.cn/download/仓耳今楷02-W05.ttf （官方站，文件名需 URL 编码）
//   sha256: 9744dc96801ec8c91a3390bed24c993d4722fb406e1d879177d343d40e985a6e
//   也可设 KAMI_TTF 指向本地 TTF（如 git clone --sparse 下来的仓库文件）跳过下载。
//   TTF 不入库（19MB），按 sha256 校验后缓存在系统临时目录。
//
// 用法：
//   node scripts/subset-font.mjs [dist 目录]     # 默认 ./dist
//   依赖：python3 + fonttools（pip3 install fonttools → pyftsubset）
//   注意：改 src/content/*.md 或模板文字后，先 npm run build:soft 再跑本脚本，
//   然后重跑 npm run build（覆盖闸门会对新 dist 校验 chars.txt）。

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.argv[2] ? join(ROOT, process.argv[2]) : join(ROOT, 'dist');
const CHARS_TXT = join(ROOT, 'scripts', 'fonts', 'chars.txt');
const OUT_WOFF2 = join(ROOT, 'public', 'fonts', 'tscjk-500.woff2');
const MAX_BYTES = 2.5 * 1024 * 1024;

const TTF_SHA256 = '9744dc96801ec8c91a3390bed24c993d4722fb406e1d879177d343d40e985a6e';
const TTF_URLS = [
  'https://cdn.jsdmirror.com/gh/tw93/Kami@main/assets/fonts/TsangerJinKai02-W05.ttf',
  'https://cdn.jsdelivr.net/gh/tw93/Kami@main/assets/fonts/TsangerJinKai02-W05.ttf',
  'https://tsanger.cn/download/%E4%BB%93%E8%80%B3%E4%BB%8A%E6%A5%B702-W05.ttf',
];
const TTF_CACHE = join(tmpdir(), `TsangerJinKai02-W05.ttf.${TTF_SHA256.slice(0, 12)}`);

// ── 安全边集 ──────────────────────────────────────────────────────────────
// 常见金融/投资/历史用字（站点语料之外的前瞻覆盖：新条目大概率复用的词）。
// 全量 CJK 标点（U+3000–303F）+ 全角区（U+FF00–FFEF）+ 常用数学/编号符号另整段并入。
const MARGIN_TEXT = [
  // A 股交易与账户
  '股票涨跌停盘券基金债期货期权权证指数行情市值市盈率市净率股息分红派息配股转增除权除息涨停跌停熔断限涨限跌开户销户银证转账佣金印花税手续费过户费最低买入卖出委托撤单成交结算交割托管质押回购融资融券杠杆空仓满仓半仓仓位本金收益亏损回报率收益率波动率回撤夏普比率最大回撤复利单利年化月度季度年度',
  // 行情形态与操作
  '牛市熊市震荡横盘底部顶部反弹反转突破盘整割韭菜接盘站岗套牢解套补仓减仓清仓止损止盈摊平定投建仓底仓轻仓重仓梭哈一把梭内幕拉升出货洗盘对倒坐庄操纵信披披露造假退市上市注册制核准制借壳重组并购杠杆收购要约收购大宗交易协议转让股权激励限制性股票行权解禁减持信用风险违约破产重整清算赔偿先行赔付投资者保护适当性合格投资者',
  // 参与者与通道
  '散户机构游资主力庄家北向资金南向资金沪股通深股通港股通美股新三板科创板创业板北交所退市风险警示特别处理停牌复牌异动公告临时公告定期报告年报季报半年报业绩预告业绩快报利润分配预案股东大会董事会监事会独立董事保荐人主承销商登记结算上交所深交所证监会金融监管总局证监局交易所做市商集合竞价连续竞价开盘收盘竞价盘前盘后折溢价溢价率折价率换手率量比振幅均价成本价目标价支撑压力阻力颈线头肩顶双底双顶三角形旗形楔形缺口跳空高开低走缩量放量换手筹码分布恐慌贪婪情绪',
  // 行为偏差（站点六域高频词）
  '从众锚定确认偏误损失厌恶过度自信近因赌徒谬误羊群行为泡沫破裂崩盘股灾熔断机制心理账户沉没成本禀赋效应框架效应代表性启发式可得性启发式自我服务归因错误处置效应追涨杀跌频繁交易满仓单吊预测短期听消息',
  // 金融史/宏观（崩盘档案与历史条目高频）
  '崩盘泡沫狂热郁金香荷兰日本股市房地产通缩通货紧缩零利率负利率量化宽松缩表加息降息基准利率存款准备金率汇率货币财政政策衰退萧条危机传染杠杆出清去化资产负债表衰退恒等式人口老龄化少子化生产率全要素劳动生产率技术革命产业周期债务周期长期债务周期中期选举财政赤字国债央行美联储欧日银行英格兰银行大萧条胡佛罗斯福新政二战布雷顿森林广场协议石油危机黑星期一黑色星期四黑色星期二互联网泡沫次贷危机雷曼兄弟希腊债务危机欧债危机英国脱欧贸易战关税战杠杆出清资产负债表出清信用收缩货币超发通胀通缩滞胀金本位银本位纸币券信用货币准备金',
  // 人物/地名常见字（投资大师与历史条目）
  '巴菲特芒格格雷厄姆利弗莫尔索罗斯达利欧马克斯彼得林奇西蒙斯凯恩斯罗斯柴尔德洛克菲勒卡内基福特通用电气标准石油铁路运河运河股票交易所华尔街道琼斯纳斯达克恒生富时日经上证深证创业板科创板北交所沪深京港股美股欧股伦敦东京纽约芝加哥底特律匹兹堡费城波士顿旧金山洛杉矶',
].join('');

// 全量 CJK 标点与符号区（码点段整收，防漏）
function range(lo, hi) {
  let s = '';
  for (let cp = lo; cp <= hi; cp++) s += String.fromCodePoint(cp);
  return s;
}
const MARGIN_RANGES =
  range(0x3000, 0x303f) + // CJK 标点
  range(0xff00, 0xffef) + // 全角/半角形式
  range(0x2010, 0x2027) + // 破折号/引号类（General Punctuation 常用段）
  range(0x2460, 0x2473) + // ①②③…⑳
  range(0x00b2, 0x00b9) + // ² ³ ¹ … ℉
  range(0x2070, 0x209f) + // 上标/下标
  range(0x0391, 0x03c9) + // 希腊字母
  '±×÷≠≈≥≤∈⊂√∞′″℃℉‰½⅓⅔ⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ→←↑↓↔§№※¶†‡•·‐‑‒–—―‛’‘“”«»‹›■□▲△○●◎★☆⑴⑵⑶⑷⑸⑹⑺⑼⑽⊖⊗⊘∏∫∂∆∅∇≈∝≡∞ℵ℘ℏℨ℘ℂℝℕℤℙℚ';

// ── 1. 遍历 dist HTML，收全部去重字符 ────────────────────────────────────
function walkHtml(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkHtml(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const htmlFiles = walkHtml(DIST, []);
if (htmlFiles.length === 0) {
  console.error(`[subset-font] dist 里没有 HTML：${DIST}——先跑 npm run build:soft`);
  process.exit(1);
}
const seen = new Set([' ']);
for (const f of htmlFiles) for (const ch of readFileSync(f, 'utf8')) seen.add(ch);
for (const ch of MARGIN_TEXT) seen.add(ch);
for (const ch of MARGIN_RANGES) seen.add(ch);

const sorted = [...seen].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
mkdirSync(dirname(CHARS_TXT), { recursive: true });
writeFileSync(CHARS_TXT, sorted.map((c) => c).join('\n') + '\n', 'utf8');
console.log(`[subset-font] ${htmlFiles.length} 页 HTML → ${sorted.length} 个去重字符（含边集）→ ${CHARS_TXT}`);

// ── 2. 取 TTF（缓存 + sha256 校验，必要时下载）────────────────────────────
function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}
let ttf = process.env.KAMI_TTF && existsSync(process.env.KAMI_TTF) ? process.env.KAMI_TTF : TTF_CACHE;
if (!existsSync(ttf) || sha256(ttf) !== TTF_SHA256) {
  ttf = join(tmpdir(), `TsangerJinKai02-W05.dl-${process.pid}.ttf`);
  let ok = false;
  for (const url of TTF_URLS) {
    console.log(`[subset-font] 下载 ${url}`);
    const r = spawnSync('curl', ['-fSL', '--retry', '2', '--connect-timeout', '15', '--max-time', '600', url, '-o', ttf], { stdio: ['ignore', 'ignore', 'inherit'] });
    if (r.status === 0 && existsSync(ttf) && sha256(ttf) === TTF_SHA256) {
      writeFileSync(TTF_CACHE, readFileSync(ttf));
      ok = true;
      break;
    }
  }
  if (!ok) {
    console.error('[subset-font] 字体下载失败或 sha256 不符（期望 ' + TTF_SHA256 + '）');
    process.exit(1);
  }
  ttf = TTF_CACHE;
}
console.log(`[subset-font] TTF 就绪：${ttf}（sha256 校验通过）`);

// ── 3. pyftsubset → woff2 ─────────────────────────────────────────────────
const tmpText = join(tmpdir(), `tscjk-chars-${process.pid}.txt`);
writeFileSync(tmpText, sorted.join(''), 'utf8');
mkdirSync(dirname(OUT_WOFF2), { recursive: true });
const py = spawnSync('pyftsubset', [
  ttf,
  `--text-file=${tmpText}`,
  `--output-file=${OUT_WOFF2}`,
  '--flavor=woff2',
  '--name-IDs=*',
  '--notdef-glyph',
  '--notdef-outline',
], { stdio: ['ignore', 'inherit', 'inherit'] });
if (py.status !== 0) {
  console.error('[subset-font] pyftsubset 失败（需 python3 + fonttools：pip3 install fonttools）');
  process.exit(1);
}
const bytes = readFileSync(OUT_WOFF2).length;
console.log(`[subset-font] 产物 ${OUT_WOFF2} = ${(bytes / 1024 / 1024).toFixed(3)} MB（红线 2.5MB）`);
if (bytes > MAX_BYTES) {
  console.error(`[subset-font] 超红线：收紧 scripts/subset-font.mjs 的 MARGIN_TEXT 后重跑`);
  process.exit(1);
}
console.log('[subset-font] 完成。重跑 npm run build 让覆盖闸门校验新 dist。');
