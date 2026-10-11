import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const entries = await getCollection('escape');
  return rss({
    title: 'A股散户逃生指南',
    description:
      '把「别亏钱」拆成一条条能照着做的清单：每条写清什么时候用、怎么做、做完得到什么、怎么算过关。',
    site: context.site,
    trailingSlash: true,
    items: entries
      .map((e) => ({
        title: e.data.title,
        description: e.data.description,
        link: `/${e.id}/`,
        pubDate: e.data.checked ?? e.data.date ?? new Date(),
        categories: [e.data.chapter, `证据${e.data.evidence}`, `口径${e.data.metric}`],
      }))
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)),
    customData: '<language>zh-cn</language>',
  });
}
