# 03 技术审计报告：构建管线、数据一致性与链接完整性

- **审计对象**：`/home/ubuntu/dsh-workspace/1009/escape-guide`（Astro 静态站，122 条目 + 13 静态页 = 135 页）
- **审计方式**：只读审计。阅读 `astro.config.mjs`、`package.json`、`scripts/check-content.mjs`、`src/lib/*.mjs`、`src/content.config.ts`、全部 `src/pages/**`；运行 `node scripts/check-content.mjs`（及 `--canary`）；用临时脚本 `docs/audit/tmp/audit-tech.mjs`（v2，保留）做 slug/sitemap/compare/dist 链接的机械核对。
- **未做**：未运行 `astro build`（dist 已有产物），未改任何源文件。
- **证据文件**（均保留在 `docs/audit/tmp/`）：
  - `check-content-run.log`：闸门正常跑（exit 0）
  - `check-content-canary.log`：canary 跑（exit 1）
  - `audit-tech.mjs`：审计脚本（可重跑：`node docs/audit/tmp/audit-tech.mjs`）
  - `audit-tech-output.txt`：脚本输出（下文引用）

## 总览

| 维度 | 结论 |
|---|---|
| 格式闸门 | ✅ 122/122 通过；canary 证明能判红；CI（`.github/workflows/deploy.yml`）强制 闸门→build |
| slug 一致性 | ✅ 122 条 `slugify(title)` 与 `slugify(文件名)` 全同；无碰撞/前缀歧义；dist 目录与条目 1:1 |
| sitemap | ✅ 135 条 `<loc>` 与 dist 页面**逐一相等**（无缺失、无多余），前缀全部正确 |
| compare.json | ⚠️ 70 行全查：3 行首列失链（T1）；445 个数字 token 中 1 处非逐字（T2）；159 个 `nums` 全部逐字命中 |
| 链接完整性 | ✅ 136 个 html、6331 个 href：0 死链、0 缺 BASE 前缀、0 锚点缺失、0 残留字面 `[[`（代码块外）、0 个 og/meta description 含 `[[` |
| 双链渲染 | ✅ 1924 处 `class="wl"`，0 处 `wl-missing`（wikilink 插件接线修复有效） |
| RSS | ✅ 122 项，链接全部可解析，无 `[[` 残留 |
| 构建配置 | ⚠️ 子路径下 canonical/sitemap/RSS 均正确；404 页可被索引（T4）等 4 个低危项 |

共发现 **8 个问题：中危 1、低危 6、信息级 1**。无阻断级缺陷。

---

## 1. 管线

**链路**：`push → CI（deploy.yml）→ node scripts/check-content.mjs（闸门，非 0 即无产物）→ astro build（zod schema + glob loader + remark/rehype 插件）→ GitHub Pages`。

实测：

```
$ node scripts/check-content.mjs
✅ 条目格式闸门通过：122 条全部合规
⚠️  7 条警告（不阻断构建）：  ← 全部是 v3-17 的 disputed 线索警告（关键词代理，需人工复核）
$ node scripts/check-content.mjs --canary
❌ 条目格式闸门失败：122 条里有 1 项问题 … 构建已中止，无产物。（exit 1）
```

- 闸门 20 项校验读自 `scripts/check-content.mjs:1-442`；canary 判红证明它「真的能拦」，不是假绿灯。
- 7 条警告逐条列出于 `docs/audit/tmp/check-content-run.log`（马克斯、确认偏误、前景理论、心理学研究、哪些偏差、修行七件事、买理财）。
- 插件接线（`astro.config.mjs:41-48` 记录的 unified factory 修复）在 dist 中可验证：全站 1924 个 `class="wl"` span、0 个 `wl-missing`，双链确实被替换成链接。
- 管线弱点不在闸门本身，而在两个未声明依赖（T3）与一条注释承诺的缺失脚本（T6）。

## 2. slug 与文件名一致性、URL 歧义、sitemap 比对

脚本核对（`audit-tech-output.txt` A 节、B 节）：

- **A1**：122 条 `slugify(data.title)` 与 `slugify(文件名)` **全部一致**。这很重要：闸门/双链索引用标题 slug，而 Astro 实际 URL 用 `generateId` 的文件名 slug（`content.config.ts:25`）——一旦两者漂移，双链会整体指向 404。当前无漂移。
- **A2**：半角/全角冒号混用（49 个半角 vs 47 个全角标题，与 `wikilinks.mjs:16` 注释一致）经 `slugify` 后**无碰撞**（`assertUniqueSlugs` 通过）；「去标点后相同」或「前缀包含」的近邻对：**0 对**。任务书中点名的「涨停买不进的别追」vs「别追高」类近邻在 slug 层互不包含、互不碰撞，不构成 URL 歧义（只是人类记忆层易混，属内容层问题）。
- **A3/A4**：122 条全部有 `dist/<slug>/index.html`；dist 顶层目录无多余、无缺失（122 条目 + about/aliases/compare/topic）。
- **B（sitemap-0.xml ↔ dist 逐一比对）**：sitemap 135 条 = 122 条目 + `/` + `about/` + `aliases/` + `topic/01..06/` + `compare/{crashes,masters,biases,philosophy}/`，与 dist 页面集合**完全相等**（v1 脚本曾报「多余/缺失」，系 percent-encoding 比对误差，v2 解码后归零）；135 条 `<loc>` 前缀全部是 `https://blog.zero43.top/escape-guide/`；`sitemap-index.xml` 正确指向 `sitemap-0.xml`；`robots.txt` 的 `Sitemap:` 指向 sitemap-index（子路径下正确）。`404.html` 未入 sitemap（正确做法）。
- 遗留小项：sitemap 无 `<lastmod>`（T8，可选）。

## 3. compare.json 一致性（70 行全查，超出抽样 20 行要求）

`src/data/compare.json`：4 张表（crashes 19 / masters 19 / biases 20 / philosophy 12），每行含 `c[]`（337 个单元格）、`src`（源条目标题）、`ev`、`nums`。

- **链接目标存在性**：70 个 `src` 按 `makeEntryIndex`（标题+别名索引）归一化查表，**0 个不存在**。
- **但页面渲染口径有 bug（T1）**：`compare/[table].astro:27,61` 用**原始字符串** `byTitle.get(r.src)` 查表，而索引键是 `normalizeKey(title)`（trim+小写+去空白）。凡 `src` 含空格或大写的 3 行查不到：
  - crashes 行 `src=「LTCM：诺奖得主们是怎么一起破产的」`（`compare.json:390`）
  - masters 行 `src=「林奇：麦哲伦 13 年的真相」`（`compare.json:545`）
  - masters 行 `src=「索罗斯：反身性与 1992 的单日十亿」`（`compare.json:559`）

  dist 实测（`dist/compare/crashes/index.html`、`dist/compare/masters/index.html`）：这 3 行的行头是纯文本 `<th …>LTCM 诺奖得主们</th>`，无 `<a>`；其余 67 行均正常带链接。masters 页 `ev-flag` 实际 7 处、按其源条目 `disputed:true` 应有 8 处——丢的正是「林奇·麦哲伦」行（该条目 `disputed: true`）。与首页承诺「每一行都能点回条目」（`index.astro:168`）直接冲突。
- **数字逐字一致**：把每行单元格+`nums` 里的数字/日期 token 全部抽出（445 个），与源条目 md 全文做子串核对：**444 个逐字命中，1 个漂移（T2）**——crashes 表 `「1998-08-17 俄罗斯违约」（compare.json:384）`，而源条目只有「1998 年 8 月 17 日俄罗斯违约」（`LTCM：诺奖得主们是怎么一起破产的.md:27`）。`nums[]` 159 个全部逐字命中。
- **四个表页 dist 与 json 一致**：337 个单元格文本在对应 `dist/compare/*/index.html` 中 0 缺失；67 个正常行首列链接 0 缺失（3 个缺失即 T1）。

## 4. 链接完整性（dist 全量扫描）

136 个 html（含 404.html）、6331 个 `href`，`audit-tech-output.txt` D 节：

- **0 个站内死链**（绝对路径剥离 `/escape-guide/` 前缀、相对路径按页解析后逐一对照 dist 文件；v1 报告的 16 条「死链」是跨页 fragment 链接如 `/escape-guide/#domains` 的解析误差，v2 已改判：目标页存在且 `#domains/#tables/#all/#start/#evidence-a` 等 id 全部在目标页中核实存在）。
- **0 个绝对链接漏加 `/escape-guide/` 前缀**（子路径部署下这是最典型的 404 源，全站无一例）。
- **0 个锚点失效**（同页 755 个 `#…` 全核，含五节 h2 id：howto/plain/gain/source/notes/perf 与 `#main`）。
- **残留字面 `[[`：0 处**（先剥 `<pre>/<code>`——`about` 页的 2 处 `[[…]]` 是行内代码里的教学示例，属有意保留）。`og:description`/`meta description` 含 `[[`：0 处（`content.config.ts:31` 提示的风险未发生；闸门规则 176 行的 description 检查本期 0 警告）。
- **`wl-missing`（未收录标记）：0 个**——全站双链目标 100% 可解析。
- **RSS**：122 项，`<link>` 全部解析到 dist 真实页面，无 `[[` 残留；`pubDate` 取 `checked ?? date`（`rss.xml.js:20`），122 条聚在 3 个核对日（10-08/10-11/10-12 各 41/40/41），属设计选择（见 T8）。
- 页面无任何 `<img src>`（og:image 走 meta），无图片死链面。

## 5. 构建配置（BASE_URL 子路径 + 兜底）

- `site = https://blog.zero43.top/escape-guide/` 含子路径（`astro.config.mjs:30`），sitemap/canonical/RSS 全部正确带前缀（dist 实测 F1/F2/B1/E1 均为 0 异常）；`base`/`trailingSlash:'always'`/`build.format:'directory'` 三者自洽，dist 形状（每目录一个 index.html）与配置一致。
- **canonical**：`new URL(Astro.url.pathname, Astro.site)`（`Base.astro:35`）在生产构建下 pathname 自带 base，正确（index → `…/escape-guide/`，条目 → `…/escape-guide/别追高/`，percent-encoded 合法）。
- **RSS alternate / og:image / 图标**：均带前缀（`Base.astro:34,40,46`）。
- **404.astro 兜底**：5 个出口（目录/六域/对照表/别名/关于）+ 页头页脚导航共 18 个 href，全部解析成功；产物即 `dist/404.html`，与 GitHub Pages 项目站点的 404 约定匹配（`404.astro:5-6` 注释正确）。
- **aliases.astro 兜底**：别名 chip 与 A 级清单共 100+ 链接全部指向真实条目页；`#all`/`#domains` 跨页锚点目标存在。
- 配置层遗留：404 页带 `index,follow` + 自引用 canonical，且 `/escape-guide/404/` 在 Pages 上会返回 200（T4）；favicon.ico 未声明（T5）。

---

## 问题清单

### T1【中危】compare 表页按未归一化字符串查表，3 行首列失链、1 个「争议」小标丢失
- **证据**：`src/pages/compare/[table].astro:27` 与 `:61` 两处 `byTitle.get(r.src)`；`makeEntryIndex` 的键是 `normalizeKey`（`entries.mjs:136-152`）。dist 实测：`dist/compare/crashes/index.html` 中 `<th scope="row" class="row-head" data-label="事件">LTCM 诺奖得主们</th>`（无 `<a>`）；`dist/compare/masters/index.html` 中「林奇·麦哲伦」「索罗斯·反身性」两行同样纯文本；masters 页 `ev-flag` 出现 7 次，按其源条目 `disputed:true` 计应为 8 次。
- **描述**：C6/S4 修复让索引层支持标题/别名等价，但页面查表漏了 `normalizeKey`。`src` 含空格或大写（LTCM、`麦哲伦 13`、`1992 的`）的 3 行静默丢失首列链接与争议小标，页面不报错、构建全绿——正是注释里自己警告过的「静默丢成 undefined」模式，修了一半。
- **建议修法**：两处改为 `byTitle.get(normalizeKey(r.src))`（`normalizeKey` 已在 `slug.mjs:14` 导出，`index.astro:43` 已是正确用法可参照）；顺手在 `scripts/check-content.mjs` 加一条「compare.json 的 src 必须能被归一化索引命中，且页面口径查表命中」的断言，防止回归。

### T2【低危】crashes 表 LTCM 行日期与源条目非逐字一致
- **证据**：`src/data/compare.json:384` `「1998-08-17 俄罗斯违约」` vs `src/content/escape/LTCM：诺奖得主们是怎么一起破产的.md:27`「1998 年 8 月 17 日俄罗斯违约」。445 个数字 token 中唯一一处。
- **描述**：站点在首页承诺「表里的数字与条目逐字一致」（`index.astro:168`），该格违反承诺（日期同一事实、两种写法，非事实错误）。
- **建议修法**：表内改为「1998 年 8 月 17 日俄罗斯违约」，或条目中补写 `1998-08-17` 形态；二选一并保持全站日期写法约定一致。

### T3【低危】`yaml`、`unist-util-visit` 是幻影依赖（源码 import 但 package.json 未声明）
- **证据**：`src/lib/entries.mjs:13` `import YAML from 'yaml'`；`src/lib/headings.mjs:23` `import { visit } from 'unist-util-visit'`；`package.json:15-20` dependencies 只有 4 个 Astro 包。`package-lock.json` 中二者均为 astro 依赖树的传递依赖（yaml 2.9.1 / unist-util-visit 5.1.0），靠 npm 顶层提升才可解析。
- **描述**：当前 `npm ci`（CI 用）+ lockfile 下确定性可用；但任何一次 `npm install`（更新 astro 传递树、换包管理器、lockfile 重生成）都可能让顶层提升消失，届时闸门与构建直接 `ERR_MODULE_NOT_FOUND`，报错点离根因很远。
- **建议修法**：`npm i yaml unist-util-visit` 显式声明为直接依赖（版本取 lockfile 现值），或在 `scripts/check-content.mjs` 顶部对 import 做存在性自检。

### T4【低危】404 页被要求索引：`index,follow` + 自引用 canonical，且 `/escape-guide/404/` 直接访问返回 200
- **证据**：`dist/404.html` 含 `<meta name="robots" content="index,follow">` 与 `<link rel="canonical" href="https://blog.zero43.top/escape-guide/404/">`；`Base.astro:50` 的 robots meta 对 404 页同样生效。dist 中 `404.html` 位于站点根，Pages 上 `/escape-guide/404/` 会命中它并返回 200。
- **描述**：404 模板同时是一个可被索引的 200 URL，SEO 语义混乱（虽不在 sitemap，仍可能被直接收录）。
- **建议修法**：404 页不走 `Base.astro`（或给 Base 加 `noindex` 开关，仅 404 传）；robots meta 对 404 输出 `noindex`。

### T5【低危】ico 文件已部署但未被引用，浏览器默认 favicon 请求 404
- **证据**：`dist/zo0043_16x16.ico`、`dist/zo0043_32x32.ico` 存在；`dist/index.html` 仅 `<link rel="icon" type="image/png" href="/escape-guide/zo0043.png">`（`Base.astro:34`）。
- **描述**：浏览器按惯例请求 `/escape-guide/favicon.ico` → 404（控制台报错、部分浏览器不显示 PNG 图标）。
- **建议修法**：`Base.astro` 增加 `zo0043_32x32.ico`（及 16x16，带 `sizes`）的 `<link rel="icon">`。

### T6【低危】注释承诺的 `verify-escape-guide.sh` 不在本仓库，「表↔条目数字逐字」不变式无机械守卫
- **证据**：`src/pages/compare/[table].astro:4`「（verify-escape-guide.sh 有对应不变式，防表格与条目漂移）」；仓库内无任何 `.sh` 脚本（`ls *.sh scripts/*.sh` 为空），CI 也不含该检查。本次人工审计 445 个数字 token 才有 1 处漂移（T2）——说明守卫缺位时漂移确实会发生。
- **描述**：不变式只活在注释里（脚本可能留在旧站 blog.zero43.top 仓库），独立仓库的 CI 不执行它。
- **建议修法**：把「compare.json 的 src 可解析 + nums 逐字出现在源条目 + 单元格数字 token 出现在源条目」做成 `scripts/check-compare.mjs` 挂进 `npm run check`（本次审计脚本 C 节逻辑可直接搬），或把注释改为指向真实存在的检查。

### T7【低危】代码/注释假设存在 JSON-LD，实际全站没有
- **证据**：`content.config.ts:31`「留空会让 og/twitter/JSON-LD 回退到正文摘要」；`scripts/check-content.mjs:174` 同样提 JSON-LD；`grep -r 'ld+json' dist --include='*.html'` 无结果，`Base.astro` head 中无 `<script type="application/ld+json">`。
- **描述**：description 必填的真实受益面只有 og/twitter meta；注释把不存在的通道也列进去，会让后续维护者误判「JSON-LD 已覆盖」。
- **建议修法**：要么在 `Base.astro` 补 Article/WebSite JSON-LD（description/title/url 已在手），要么把两处注释里的「JSON-LD」删掉。

### T8【信息】sitemap 无 `lastmod`；RSS `pubDate` 为核对日期而非发布日期
- **证据**：`sitemap-0.xml` 0 个 `<lastmod>`；`rss.xml` 122 项 pubDate 聚在 2026-10-08/11/12 三个日期（各 41/40/41），对应 `checked` 字段（`rss.xml.js:20`）。
- **描述**：均非错误——`lastmod` 属可选优化；RSS 以「来源核对日」为时间戳是本站证据体系的合理选择，但所有条目看起来都「最近更新」，对 feed 读者的时间感有轻微误导。
- **建议修法**（可选）：条目加 `date`（首次发布/拆分日）后 RSS 改 `date ?? checked`；sitemap 需要时由 Astro 按文件 mtime 生成 lastmod。

---

## 通过项（含证据）

1. **闸门**：`node scripts/check-content.mjs` → `✅ 122 条全部合规`（exit 0，7 警告）；`--canary` → exit 1 且正确注入失败（`docs/audit/tmp/check-content-*.log`）。
2. **slug**：标题/文件名双口径 122/122 一致；`assertUniqueSlugs` 通过；去标号碰撞 0、前缀包含 0；dist 目录 1:1。
3. **sitemap**：135/135 与 dist 相等、前缀 100% 正确、index/robots 指向链完整。
4. **链接**：6331 href 0 死链 / 0 缺前缀 / 0 锚点失效；代码块外字面 `[[` 0；og/meta `[[` 0；`wl-missing` 0、`class="wl"` 1924。
5. **RSS**：122 项 0 坏链 0 `[[`。
6. **compare 渲染**：337 单元格 0 缺失、67/70 行首列链接正常、`ev` 证据格 4 表全渲染（crashes/biases/philosophy 争议小标 1/3/1 与源一致）。
7. **CI**：`deploy.yml` 闸门与 build 串联、`npm ci` 锁文件安装、Pages artifact 部署链完整。
8. **404/aliases 兜底**：18 + 100+ 出口链接全部可解析。

## Top 5 技术问题

1. **【中】T1** `compare/[table].astro` 查表未过 `normalizeKey`：3 行对照表首列失链 + 1 个争议小标丢失，且静默（构建全绿）——与首页「每行可回源」承诺直接冲突，两行代码可修，应尽快。
2. **【低】T6** 「表↔条目数字逐字」不变式在独立仓库里无机械守卫（注释指向不存在的脚本），T2 的漂移就是缺位的直接后果——把审计脚本 C 节逻辑固化进 `scripts/` 并挂 CI。
3. **【低】T3** `yaml`/`unist-util-visit` 幻影依赖：闸门与构建的地基依赖未声明，锁文件一变即全线 `MODULE_NOT_FOUND`。
4. **【低】T4+T5** 404 页 `index,follow` + `/escape-guide/404/` 返回 200 的自索引隐患，叠加 favicon.ico 404——子路径部署下两处「浏览器默认行为」没管好。
5. **【低】T2** crashes 表 `1998-08-17` 与条目「1998 年 8 月 17 日」非逐字——全站唯一一处数字形态漂移，顺手与 T6 的守卫一起修掉。

---

## 临时脚本说明（按要求保留）

- `docs/audit/tmp/audit-tech.mjs`：本次审计主脚本（v2，含 percent-decode 修正与数字 token 核对），只读 src/、dist/，可重跑。v1 的「sitemap 多余/缺失」「跨页 fragment 死链」为编码/fragment 解析误差，v2 已消除，最终数字以 `audit-tech-output.txt` 为准。
- `docs/audit/tmp/check-content-run.log`、`check-content-canary.log`：闸门与 canary 原始输出。
