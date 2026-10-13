// P2-C3（U-4，2026-10-12）：四条处境路径——index.astro（路径卡）与 [...slug].astro
// （条目页路径进度 chip 行）的共享数据源。此前 PATHS 硬编码在 index.astro 内，
// 条目页无路可查（02-P-05：路径在离开首页的一刻就断）。
//
// 唯一事实源约束（P0-3 / audit 01-C-08，2026-10-12）：
//   · PATH 01-03 是「投资体系地图」三入口×5 步（该条目 44-72 行）的 4 步摘要：
//     步骤标题逐字取自地图各入口表格的 wikilink 目标（每步取主条目，
//     地图里「如/与」引出的次条目不进首页摘要）；被摘要掉的步骤由 map 回链兜住。
//   · **改路径必须改地图条目，本文件不得出现地图三入口之外的步骤。**
//   · PATH 04 是反骗/维权链路（audit 01-C-09 / P2-C1）：4 步全部复用既有条目、不新增；
//     地图三入口（未入市/被套/建体系）没有对应入口，故本条不带 map 回链（无 map 字段）——
//     4 步链路自身完整，纵深由条目互链与 04 域卡承接（t18 裁定）。
//
// 引用校验：消费方 index.astro 的 byTitle（makeEntryIndex + normalizeKey，查不到构建即
// throw）逐字校验全部步骤标题与 map 标题——fail-loud 语义不随提取改变。
// 消费方 [...slug].astro 只做反查匹配（pathHitsFor），命中即渲染，不做渲染引用，
// 故步骤标题缺失时 index.astro 构建先 throw，不会静默漏链。
export const MAP_TITLE = '投资体系地图:六个环节与你的入口';

export const PATHS = [
  {
    num: 'PATH 01',
    title: '我还没入市',
    desc: '先把钱的性质和底线定下来，再决定要不要进场——顺序反了，后面全是补救。',
    steps: ['先分清三种钱：保命钱、闲钱、搏钱', '泡沫的共同结构：五次崩盘里的同一套剧本', '买入之前先写下「错了怎么办」', '看不懂的不碰'],
    map: MAP_TITLE,
  },
  {
    num: 'PATH 02',
    title: '我已被套',
    desc: '先处理手上的仓位，再谈回本。最常见的二次伤害是「摊平」和「等反弹」。',
    steps: ['一笔数学：亏一半要赚一倍才回本', '利弗莫尔：错了就砍，永远不摊平输家', '别摊平亏损', '如果今天空仓，你还会买现在的持仓吗'],
    map: MAP_TITLE,
  },
  {
    num: 'PATH 03',
    title: '我要建体系',
    desc: '把六环各配一条可自检的标准，而不是收集更多观点。',
    steps: ['多元思维模型：看市场要戴四副眼镜', '期望值与破产：仓位是算术问题', '凯利公式：仓位下注多少', '查历史数据:中证指数与FRED怎么用'],
    map: MAP_TITLE,
  },
  {
    num: 'PATH 04',
    title: '我被骗了 / 我要投诉',
    desc: '先固证，再查证，再走官方通道——被骗后的每一步都有顺序，顺序错了证据就没了。',
    steps: ['被「杀猪盘」盯上：先固证，再报警', '查一家机构有没有牌照', '12386与投诉三通道', '证券纠纷调解与仲裁：调解不成怎么办'],
  },
];

/**
 * 一条条目落在 PATHS 各路径的哪些步骤上（构建期反查，纯数据，零 JS 渲染前提）。
 *
 * @param {string} entryId  当前条目的集合 id（= slug）
 * @param {Map} entryIndex  makeEntryIndex(entries) 的产物（标题/别名 → 条目，与 byTitle 同机制；
 *                          吃 Astro 集合条目或 normalizeCollection 归一化条目两种形状）
 * @param {(s: string) => string} normalizeKey  lib/slug.mjs 的归一化（大小写/空白不敏感）
 * @returns 命中数组；每项 { num, step, total, next, map }：
 *   · next  = 下一步的条目对象（末步为 null）
 *   · map   = 该路径有 map 回链时解析出的地图条目对象，否则 null（PATH 04 恒 null）
 * 无命中返回 []——消费方据此不渲染。
 */
export function pathHitsFor(entryId, entryIndex, normalizeKey) {
  const hits = [];
  for (const p of PATHS) {
    p.steps.forEach((title, i) => {
      const hit = entryIndex.get(normalizeKey(title));
      if (hit && (hit.slug ?? hit.id) === entryId) {
        hits.push({
          num: p.num,
          step: i + 1,
          total: p.steps.length,
          next: i + 1 < p.steps.length ? entryIndex.get(normalizeKey(p.steps[i + 1])) : null,
          map: p.map ? entryIndex.get(normalizeKey(p.map)) : null,
        });
      }
    });
  }
  return hits;
}
