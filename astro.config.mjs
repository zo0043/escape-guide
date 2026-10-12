import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import wikilinks from './src/lib/wikilinks.mjs';
import entryHeadings from './src/lib/headings.mjs';
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
    // Astro 7.3 起 remark/rehype 插件走 unified()（旧的 markdown.remarkPlugins 已弃用）。
    // BASE 显式传进 wikilinks：本配置文件由 Node 上下文加载，拿不到 Vite 注入的
    // import.meta.env，依赖它会静默生成 "undefined条目名/" 这种死链。
    // entryHeadings：h2 挂 id（页内目录锚点）+ 四段式标记换结构块 class，
    // 只动 class/属性、不动文字——verify 脚本的文本断言不受影响。
    processor: unified({
      // 【2026-10-12 接线修复】unified 的插件协议是「先调 factory(options) 拿
      // transformer，再拿 tree 调 transformer」。旧写法 `wikilinks(linkIndex, BASE)`
      // 在配置加载时就执行了工厂，把**裸 transformer** 传进插件数组，于是 unified
      // 又把它当工厂、以 undefined 调了一遍，`walk(undefined)` 静默返回——构建全绿，
      // 但全站双链一直是字面 [[…]] 文本（线上可证）。
      // 「未收录 span=0」的 verify 检查在「根本没有 span」时同样为 0，抓不住这种
      // 假绿灯，故 verify 脚本另加正向断言（至少一页含 class="wl"）。
      remarkPlugins: [[({ index, base }) => wikilinks(index, base), { index: linkIndex, base: BASE }]],
      rehypePlugins: [entryHeadings],
    }),
    shikiConfig: { theme: 'github-dark' },
  },
  integrations: [sitemap()],
});
