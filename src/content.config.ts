// 内容集合定义。Astro 7 起集合必须带 loader，旧的 type:'content' 写法会直接报错。
//
// 这里是 front matter 的结构化校验；正文的结构校验（五节 / 四段式 / 收益三档）
// 在 scripts/check-content.mjs 里做，因为 Zod schema 看不到正文。
// 两者都由 `npm run build` 强制执行。
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { slugify } from './lib/slug.mjs';

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

const escape = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/escape',
    // 自定义 id：复刻 Hugo urlize 的中文行为，让 /条目名/ 的形状与旧站一致
    // （旧站是 /escape/条目名/，这里只少一层 escape/ 前缀）。
    generateId: ({ entry }) => slugify(entry.replace(/\.md$/i, '').split('/').pop()),
  }),
  schema: z.object({
    title: z.string(),
    aliases: z.array(z.string()).default([]),
    date: z.coerce.date().optional(),
    /** 必填：留空会让 og/twitter/JSON-LD 回退到正文摘要，泄漏字面 [[…]] */
    description: z.string().min(1, 'description 必填'),
    chapter: z.enum(CHAPTERS),
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
    /** 来源核对日期；引用监管文件的条目必填 */
    checked: z.coerce.date().optional(),
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
