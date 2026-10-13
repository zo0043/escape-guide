// 内容集合定义。Astro 7 起集合必须带 loader，旧的 type:'content' 写法会直接报错。
//
// 这里是 front matter 的结构化校验；正文的结构校验（五节 / 四段式 / 收益三档）
// 在 scripts/check-content.mjs 里做，因为 Zod schema 看不到正文。
// 两者都由 `npm run build` 强制执行。
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { slugify } from './lib/slug.mjs';

const CHAPTERS = [
  '01 市场与周期',
  '02 理念与理论',
  '03 人性与心理',
  '04 规则与制度',
  '05 风险与防守',
  '06 实务与查证',
];

const escape = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/escape',
    // 自定义 id：复刻 Hugo urlize 的中文行为，让条目 URL 的形状与旧站一致
    // （旧站 /escape/条目名/，现在部署在主站子路径下，即 /escape-guide/条目名/）。
    generateId: ({ entry }) => slugify(entry.replace(/\.md$/i, '').split('/').pop()),
  }),
  schema: z.object({
    title: z.string(),
    aliases: z.array(z.string()).default([]),
    date: z.coerce.date().optional(),
    /** 必填：留空会让 og/twitter 回退到正文摘要，泄漏字面 [[…]] */
    description: z.string().min(1, 'description 必填'),
    chapter: z.enum(CHAPTERS),
    /**
     * 层级标签（2026-10-12 S1 增设）：站点刻意把同一主题拆成理念层与执行层两条，
     * 读者读时不知道自己在哪一层。**不要合并同题条目**，只给一个层级信号。
     *   理念 = 讲清「为什么会这样」的概念/机制/理论
     *   执行 = 可以直接照做的动作、纪律、流程、自查
     *   档案 = 按人或按事件立档，核心是「发生过什么 + 可核数字」
     *   工具 = 去哪里查、怎么查的入口（查* 类）
     * 归类按条目性质，章节只作默认值；明细见 t9 交付的 layer 分布统计。
     */
    layer: z.enum(['理念', '执行', '档案', '工具']),
    weight: z.number().optional(),
    cost: z.object({
      money: z.enum(['0', '少', '多']),
      time: z.enum(['少', '中', '多']),
      will: z.enum(['否', '些', '是']),
    }),
    gain: z.enum(['大', '中', '小']),
    /** 收益数字的量纲；不同量纲之间不比较 */
    metric: z.enum(['亏损', '收益', '时间', '自由', '处罚']),
    evidence: z.enum(['A', 'B', 'C']),
    /** 可选：A/B 级存在反方证据时置 true */
    disputed: z.boolean().default(false),
    /** 来源核对日期；对所有条目必填（C 级也不例外）——A股规则会变，这个日期就是说法的保质期（与 about.md「来源规则」同口径） */
    checked: z.coerce.date(),
    // ── 一屏速览字段（2026-10-11 界面重做新增，全部可选）──
    // 条目页顶部四张事实卡：有这些字段就用它们，没有就回落到 成本/收益/证据 结构化事实。
    /** 一句话结论：这条到底在说什么（列表页 kicker 与条目页结论卡共用） */
    lede: z.string().optional(),
    /** 什么时候用：这条适用的处境（一句话） */
    when: z.string().optional(),
    /** 关键数字：最能说明问题的那一个数（含口径） */
    keyNumber: z.string().optional(),
    /** 大数字：显式指定速览卡 3 / 结论条的大号数字（P2-C5）；声明了就必须是 keyNumber 的逐字子串（闸门机检，防漂移）；缺省时回退「首个数字串」机械提取（[...slug].astro 的 keyFigure 正则） */
    keyFigure: z.string().optional(),
    /** 最大风险：用错这条会怎么死（一句话） */
    maxRisk: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

// 静态页（关于本站）。单独一个集合，免得被条目闸门当成条目校验。
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { escape, pages };
