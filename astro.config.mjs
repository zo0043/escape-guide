import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import wikilinks from './src/lib/wikilinks.mjs';
import { loadEntries, makeIndex } from './src/lib/entries.mjs';

// A股散户逃生指南
// 2026-10-11 从 blog.zero43.top 的 /escape/ 拆分而来。
//
// 【部署位置】与同账号的 zo0043/learn-agent-harness 同一套做法：**项目仓库挂在主站域名
// 的子路径下，不单独配 DNS**。GitHub Pages 会把账号级自定义域（blog.zero43.top，
// 由 zo0043.github.io 仓库设置）继承给同账号下的项目站点，于是本仓库直接落在
// https://blog.zero43.top/escape-guide/ 上；仓库的 Pages 设置里 cname 必须留空——
// 一旦填了自定义域，就会从「继承主域的子路径」变成「独立域名」，那样才需要配 DNS。
//
// 若日后想改回独立域名 escape.zero43.top：把 BASE 改成 '/'、site 改成
// 'https://escape.zero43.top/'，并在仓库 Pages 设置里填 cname=escape.zero43.top，
// 同时补一条 DNS CNAME。
const BASE = '/escape-guide/';

// 双链索引在这里构建并注入 remark 插件：配置加载发生在项目根目录，
// 此时读磁盘是可靠的；等到构建期再读，模块已被打包、相对路径会失效。
// 索引建不起来就直接让构建失败——不要让它退化成「全站双链都未收录」。
const entries = loadEntries();
const linkIndex = makeIndex(entries);

export default defineConfig({
  // site 含子路径，canonical / sitemap / RSS 才会带上 /escape-guide/ 前缀。
  site: `https://blog.zero43.top${BASE}`,
  base: BASE,
  trailingSlash: 'always', // 与旧站一致：/条目名/ 而非 /条目名
  build: { format: 'directory' }, // 产出 /条目名/index.html
  markdown: {
    // BASE 显式传进插件：wikilinks.mjs 由本配置文件（Node 上下文）导入，
    // 那里拿不到 import.meta.env，不能依赖 Vite 注入的 BASE_URL。
    remarkPlugins: [wikilinks(linkIndex, BASE)],
    shikiConfig: { theme: 'github-dark' },
  },
  integrations: [sitemap()],
});
