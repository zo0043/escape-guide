import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import wikilinks from './src/lib/wikilinks.mjs';
import { loadEntries, makeIndex } from './src/lib/entries.mjs';

// A股散户逃生指南 · 独立站点
// 2026-10-11 从 blog.zero43.top 的 /escape/ 拆分而来。
//
// 双链索引在这里构建并注入 remark 插件：配置加载发生在项目根目录，
// 此时读磁盘是可靠的；等到构建期再读，模块已被打包、相对路径会失效。
// 索引建不起来就直接让构建失败——不要让它退化成"全站双链都未收录"。
const entries = loadEntries();
const linkIndex = makeIndex(entries);

export default defineConfig({
  site: 'https://escape.zero43.top',
  trailingSlash: 'always', // 与旧站一致：/条目名/ 而非 /条目名
  build: { format: 'directory' }, // 产出 /条目名/index.html
  markdown: {
    remarkPlugins: [wikilinks(linkIndex)],
    shikiConfig: { theme: 'github-dark' },
  },
  integrations: [sitemap()],
});
