# 05 · 技术可行性边界：哪些形式在零脚本 Astro 静态站能落地

> 立场：**技术现实派**。本报告是 T2/T3/T4 提案的约束清单，供红队（t6）与主编（t7）引用。
> 方法：只做静态分析，读 `astro.config.mjs` / `package.json` / `src/{pages,layouts,styles,lib,data,content.config.ts}` / `scripts/*.mjs` / `src/data/compare.json` 及 `dist/` 产物；**不运行 `astro build`**（v0 统一构建，避免污染 dist 基线）。所有结论带文件+行号或可复算命令。

---

## 0. 复算基线（2026-10-13，工作区现场）

```bash
# 零 <script> 不变式（源码 + 产物双向）
grep -rn "<script" src/ | wc -l        # → 0
grep -ro "<script" dist/ --include="*.html" | wc -l   # → 0

# 条目数（122 = 团队目标口径）
ls src/content/escape/*.md | wc -l      # → 122

# 闸门全绿（只跑闸门，不 build）
node scripts/check-content.mjs          # 122 条全绿 + 6 条 warning，exit 0
node scripts/check-compare.mjs          # 70 行 src 全可解析、nums/token 逐字命中，exit 0
```

- 关键事实：**「零 `<script>`」全文没有一处机械闸门在守**。`package.json:7-15` 的 `check` 只跑 `check-content` + `check-compare`，两个脚本都不查 dist 里有没有 `<script>`。它是**设计约定**（`src/styles/global.css:3-4`「约束：零 JS、零外链字体」）+ 队长的外部 `verify-baseline.log` + 代码评审在守，不是 CI 里的 fail-loud 断言。这一点直接决定第 4 节「破不变式的最小代价」。

- 结构事实：`package.json` 依赖只有 `astro / @astrojs/markdown-remark / @astrojs/rss / @astrojs/sitemap / unist-util-visit / yaml`——**无任何框架（react/vue/svelte）、无任何客户端脚本库**。全站 `.astro` 组件零 `client:*` 指令。所以"零脚本"目前是**结构性成立**的：Astro 对静态组件默认不产出 JS bundle，需要交互才会被打破。

---

## 1. 全站硬不变式逐条列（带文件+行号）

### 1.1 部署与路由

| # | 不变式 | 位置 | 后果 |
|---|---|---|---|
| D1 | `base = '/escape-guide/'`（站点挂在主站域名子路径） | `astro.config.mjs:20` `BASE`、`:31` `base: BASE` | 所有站内链接必须显式带前缀；硬编码 href 漏一个就是 404（`src/layouts/Base.astro:17-18` 注释明说） |
| D2 | `trailingSlash: 'always'` + `build.format: 'directory'` | `astro.config.mjs:32-33` | 产出 `/条目名/index.html` 而非 `/条目名`；锚点/相对链接都按目录形态设计 |
| D3 | `site = https://blog.zero43.top/escape-guide/` | `astro.config.mjs:28-30` | canonical / sitemap / RSS / og 全部带子路径；`Base.astro:71` canonical、`:76` RSS |
| D4 | 页面内所有 href 走 `import.meta.env.BASE_URL`（`Base.astro:19` `const B`） | 全站 `.astro`，`src/` 内 `BASE_URL` 共 9 处引用 | 这是**唯一**的 URL 前缀事实源；改部署路径只动 `astro.config.mjs:20` 这一处 |

### 1.2 构建闸门（`npm run check` 先行）

| # | 不变式 | 位置 |
|---|---|---|
| G1 | `"build": "npm run check && astro build"` —— 闸门非 0 就无 dist | `package.json:12` |
| G2 | `"check": "node scripts/check-content.mjs && node scripts/check-compare.mjs"` | `package.json:9` |
| G3 | `build:soft` = `astro build` 跳过闸门，**只限本地**，CI 恒走 build | `package.json:13`、`.github/workflows/deploy.yml:6-8` |
| G4 | CI 先独立跑一次 `node scripts/check-content.mjs` 再 `npm run build`（build 内含的 check 是第二次） | `.github/workflows/deploy.yml:44-48` |

注意：CI 的第 44-45 行只单跑 `check-content`，**没单跑 `check-compare`**——但第 48 行 `npm run build` 里两者都会跑，故完整守卫仍然生效；单跑那一步只是"更快的失败信号"。

### 1.3 front matter 白名单（Zod schema + 闸门双写）

chapter 六值、layer 四值在**两处**逐字重复（改一处必须改另一处；`scripts/check-content.mjs:146` 注释点名此约束）：

| 字段 | 允许值 | schema | 闸门 |
|---|---|---|---|
| `chapter` | `01 市场与周期` / `02 理念与理论` / `03 人性与心理` / `04 规则与制度` / `05 风险与防守` / `06 实务与查证`（六值） | `src/content.config.ts:10-17`、`:33` | `scripts/check-content.mjs:135-142`、`:190-192` |
| `layer` | `理念` / `执行` / `档案` / `工具`（四值） | `src/content.config.ts:43` | `scripts/check-content.mjs:148`、`:196-200` |
| `metric` | `亏损`/`收益`/`时间`/`自由`/`处罚`（五值） | `src/content.config.ts:52` | `scripts/check-content.mjs:149`、`:201` |
| `evidence` | `A`/`B`/`C`（三值） | `src/content.config.ts:53` | `scripts/check-content.mjs:150`、`:202` |
| `gain` | `大`/`中`/`小` | `src/content.config.ts:50` | `scripts/check-content.mjs:154`、`:203` |
| `cost.money`/`cost.time`/`cost.will` | `0/少/多`、`少/中/多`、`否/些/是` | `src/content.config.ts:45-49` | `scripts/check-content.mjs:151-153`、`:205-207` |
| `description` | 必填非空（否则 og/twitter 泄漏字面 `[[…]]`） | `src/content.config.ts:32` | `scripts/check-content.mjs:185-188` |
| `checked` | 必填日期（说法的保质期） | `src/content.config.ts:56-57` | `scripts/check-content.mjs:210` |
| `keyFigure` | 若声明，必为 `keyNumber` 逐字子串（防大数字漂移） | `src/content.config.ts:66-67` | `scripts/check-content.mjs:211-225` |

### 1.4 正文结构闸门（`scripts/check-content.mjs:83-435`）

| # | 不变式 | 位置 |
|---|---|---|
| B1 | 五节齐全：`怎么做/说人话/收益/来源/备注` | `:83` 常量、`:227-231` 检查 |
| B2 | 「怎么做」四段标记齐全（四段式）+ 算例必选 | `:84`、`:235-245` |
| B3 | 「怎么做」六段顺序固定（什么时候用→步骤→算例→常见错→做完你会得到→怎么算过关） | `:88-95` 常量、`:343-354` 检查 |
| B4 | 「收益」三档：`量级（口径：X）：<含数字>` 或 `无量级（方向性）：`；口径 ∈ 五值且 === fm.metric | `:248-256`、`:368-380` |
| B5 | 「说人话」禁阿拉伯数字 + 三段段首标签（是什么/为什么发生/什么时候不成立） | `:98`、`:260-262`、`:386-391` |
| B6 | 「备注」≥3 列表项 | `:276-280` |
| B7 | 出度双链 ≥2（唯一目标数） | `:283-289` |
| B8 | 字数下限：怎么做汉字 ≥350、说人话汉字 ≥150 | `:291-307` |
| B9 | 双链后禁半角括号（`[[x]](y)` 死链）+ `[[` 配对检测 | `:315-337` |
| B10 | 裸 URL 后紧跟全角标点判红（否则 GFM 吞成 404） | `:134` 正则、`:412-420` |
| B11 | compare.json 的 `src` 必须可回源（最小断言） | `:438-475` |

### 1.5 对照表数字逐字回源（`scripts/check-compare.mjs`）

- 每行 `src` 可被标题/别名归一化索引解析（`:104-113`）；`nums[]` 每个数字串是源条目文件子串（`:114-125`）；单元格数字/日期 token 逐字命中（`:126-142`）。
- 这是首页"每一行都能点回条目，数字与条目逐字一致"承诺（`src/pages/index.astro:163` 文案，`src/pages/compare/[table].astro:3-4` 注释）的机械守卫。

### 1.6 渲染层结构不变式（构建期插件，`src/lib/`）

| # | 不变式 | 位置 |
|---|---|---|
| R1 | 五节 h2 挂稳定 id（`howto/plain/gain/source/notes` + 大师条目 `perf`），并包成 `section.mod.mod-*` | `src/lib/headings.mjs:26-33`、`:75-96` |
| R2 | 四段标记 `<strong>` → `<span class=part-label>` + `howto-when/steps/output/pass`（只动 class/属性不动文字） | `src/lib/headings.mjs:98-113` |
| R3 | ≥5 列正文表挂 `table-cards` + 每格 `data-label`（窄屏卡片化） | `src/lib/headings.mjs:117-138`、`src/styles/global.css:899-953` |
| R4 | 双链 `[[…]]` → `<a class=wl>`；未解析目标 → `<span class="wl wl-missing">`（橙色虚线，不产生死链） | `src/lib/wikilinks.mjs:48-63` |
| R5 | 索引冲突（两标题/别名归一化后撞同一 key）→ 构建 throw，不退化成静默漏链 | `src/lib/entries.mjs:111-124`（makeIndex）、`:136-152`（makeEntryIndex） |

### 1.7 构建期不读磁盘（`src/lib/entries.mjs:3-9`）

构建期模块**一律不读磁盘**——索引在 `astro.config.mjs:25-26`（`loadEntries` + `makeIndex`）加载时注入；页面反链、wikilink 插件、对照表查表全用注入的普通对象。违反此条的唯一症状是"反链静默变 0、双链集体退化成未收录"而构建全绿（该模块头注释是踩坑记录）。**任何新方案若要在构建期读文件，必须沿用"config 注入或纯函数入参"这个模式。**

---

## 2. 交互/可视化诉求在「纯静态零脚本」下的可实现区间

### 2.1 零脚本可做（且站内已有先例，照抄即可）

| 诉求 | 机制 | 站内先例 |
|---|---|---|
| 折叠/渐进披露 | `<details>/<summary>`（open 默认态可控） | 首页目录 `index.astro:192`（`<details open>`）；速览卡长口径 `[...slug].astro:202-207`；导航下拉 `Base.astro:110-132` |
| 悬停展开 | `:hover` + `:focus-within`，`@media(hover)` 守卫防触屏误触 | `global.css:167-171`（nav-drop） |
| 锚点深链 | `<h* id>` / `<summary id>` / `<tr id>` + `scroll-margin-top` | 目录条目 `index.astro:201`；对照表行 `compare/[table].astro:68-76` + `global.css:990-1002`；别名跳格 `aliases.astro:146-165` |
| 首列 sticky + 右缘提示 | `position:sticky` + `box-shadow` 内阴影（纯 CSS） | `global.css:954-965` |
| 表格响应式（卡片化） | 构建期挂 `data-label` + CSS 转块级 | `headings.mjs:117-138` + `global.css:899-953` |
| 双主题跟随系统 | `prefers-color-scheme` + CSS 变量 | `global.css:33-52`、shiki 双主题 `astro.config.mjs:55` |
| 减少动态效果 | `prefers-reduced-motion` 关 transition/animation | `global.css:1031-1034` |
| 打印版 | `@media print` 隐头尾、外链展开 URL | `global.css:1078-1087` |
| 纯 CSS 进度条/计数 | `:has()` + `animation-timeline: scroll()`（@supports 优雅降级） | 进度条 `global.css:1035-1062`；`:has(.concl-bar)` `global.css:600` |
| 决策查表（非实时计算） | 构建期预计算矩阵 → 静态 `<table>`/锚点 | R-B 查表版（无代码，数据 + 模板） |
| 静态 SVG 图 | 构建期生成内联 `<svg>`（无 `<script>` 子孙、无外链） | 无（R-C 提案，见 §3） |

### 2.2 不可做 / 需权衡（零脚本下没有等效物）

| 诉求 | 判定 | 说明 |
|---|---|---|
| **实时计算器**（输入 p/b 即时出 f*） | 不可做（需脚本或每次提交） | 零 JS 下只能"查表"或"论文式算例"，没有任意输入的即时回算 |
| **全文/子串搜索过滤**（即输即筛 122 条） | 不可做（需脚本） | 静态站零 JS 只有：拼音跳格（`aliases.astro:34-104` 已落地）、按顺序全量罗列、构建期静态切片。站点自己承认无搜索框（`aliases.astro:128-131`） |
| **实时数据**（行情/估值分位） | 不可做且违反来源纪律 | 静态站无服务端也无客户端取数；且"A/B/C 证据分级 + checked 保质期"要求数字可回源，实时值天然漂移 |
| **404 服务端/JS 模糊匹配** | 不可做（托管限制） | `404.astro:9-14`：GitHub Pages 的 404.html 拿不到请求路径，已定为"只做两档静态兜底" |
| **跨页状态/记忆**（已读、勾选持久化） | 不可做 | 无 localStorage/无 cookie；`:checked` 勾选只在当次页面内 |

**一个要红队/主编注意的降级事实**：R-B 用 `<input type=checkbox>` + CSS `:has(:checked)` 计数的前提是**启用态 checkbox**。GFM 原生任务清单 checkbox 是 `disabled`（`global.css:717-724` 只是给它上色，不可点），要计数必须由 `.astro` 模板手工输出 `<input type=checkbox>`（新标记，不来自 markdown）。`:has()` / `animation-timeline` 的支持门槛此站**已接受**（`global.css:600`、`:1051` 都在用，且都写了"不支持者优雅降级"），所以"老内核退化"不是驳回理由。

---

## 3. 对 T2 已列方案方向的逐条判定（结论条 / 别名检索 / layer 四色 / 计算器 / 图表）

> 来源：`docs/adversarial-design/02-presentation.md` 的 R-A~R-E 与附录 A 的 U 系列。判定口径：**零脚本可做 / 需少量脚本需决策 / 不可做**，每条附成本 + SEO/build 影响。

### 3.1 结论条（U-1 sticky 结论条）—— **零脚本可做，已落地**

- 现状：`[...slug].astro:180-191`（sticky bar）+ `global.css:601-645`。数据全部来自 front matter 四字段（41/122 条 complete 形态），零新数据、零脚本，sticky 排序用 CSS 变量 `--concl-h`（`global.css:600` `:has` 注入）。
- 成本：已付清，无增量。SEO：内容本就在正文，去重无影响；build：无。
- 边界：它只搬运一线字段，不生成新信息（T2 附录 A 原判）——这是内容层问题，不是技术约束。

### 3.2 别名检索（U-2）—— **零脚本可做（方案 A 已落地）；方案 B 过滤框 = 需少量脚本需决策（队长已裁定不复议）**

- 方案 A（拼音跳格）：`aliases.astro:34-104`，构建期静态首字母表（`PYINIT`）+ 锚点跳格，零 JS。成本已付清。SEO 正面：别名页是爬虫可走的全量别名清单，长尾词（"千股跌停""6124 点"）可被索引。
- 方案 B（即输即筛）：需 2-3KB JS。T2 `02-presentation.md:195` 已记录"队长裁定方案 A，不复议"——技术上也确认：零 JS 没有"即输即筛"等效物，只有"静态切片 ×N"（见 R-D）。
- Build 影响：加别名/chip 若引用不存在的条目，`404.astro:37`、`index.astro:48` 会构建期 throw——这是好事（fail-loud）。

### 3.3 layer 四色（U-3）+ R-A 分型渲染 —— **零脚本可做（四色已落地；分型是同一套构建期分支）**

- 四色：`global.css:487-519`（`--layer-c` 自定义属性 + `.layer-*` 类），已落地。
- R-A 分型（让 layer 决定默认形态）：纯"构建期按 `d.layer` 走不同 `.astro` 分支 + CSS 类"，**不破零 JS**（T2 自判"不破"，`02-presentation.md:106`）。成本：中（改 `[...slug].astro` + `global.css` + 可能 `src/lib` 抽取 per-section 文本）。
- **技术风险点（必须写进约束）**：R-A 要把"说人话抽到结论层 / 正文步骤转 `<details>` 分步展开"，这在**渲染层**重排 h2 节序。闸门规则 B3（`:343-354`）只校验"怎么做**内部 marker** 顺序"，**不校验五个 h2 节的先后**，所以重排不会触发闸门判红；但 `headings.mjs:75-96` 目前按文档顺序包 `section.mod-*`，重排意味着要新增"构建期抽取 per-section 文本 + 重排 tree.children"，并补一条 verify："重排不丢任何 section 文本、`mod-*` 五 section 仍齐"（T2 `02-presentation.md:215` 已列同类断言）。这与 T3 的 I-1/I-2 是同一条路。
- SEO/build 影响：折叠用 `<details>` 时全文仍在 DOM，爬虫照读、Ctrl+F 照找，SEO 不影响；"默认折叠"对爬虫可读性微乎其微（全文在 HTML 里）。build：无新页面、无新数据源。

### 3.4 计算器（R-B）—— **查表版 = 零脚本可做；实时输入版 = 需少量脚本需决策**

- 查表版：构建期预计算矩阵（凯利 / 跌幅→回本 / 三钱分流）+ 静态表 + `<details>` 分流，**零脚本可做**。成本：中（一次性造矩阵数据 + 模板）；若只做凯利 + 回本两张，切片为小。
- **必须先有的机械守卫**（T2 `02-presentation.md:212` 已列，技术现实派确认必须做）：`calculators.json` 的每格值 == 独立公式重算（凯利 `p-(1-p)/b`、回本 `1/(1-d)-1`），**不读生成器输出**——否则"修显示值不修生成器"的老毛病（`~/.dsh/AGENTS.md` 纪律 #5）会原样复发。
- 实时输入版：需 1-3KB JS，**破零 `<script>`**。SEO：预计算表仍是静态 HTML 可索引，JS 即时结果不可被爬虫索引——SEO 损失小；build：JS 内联。裁定倾向：T2 自评"暂不破，先查表"（`02-presentation.md:194`），技术现实派同意。
- 边界提醒：`<input type=checkbox>` 必须是启用态（§2.2 已点），`:has` 支持门槛已接受。

### 3.5 图表（R-C 内联 SVG）—— **零脚本可做（构建期内联静态 SVG）**

- 实现：`src/lib/charts.mjs`（新增，纯构建期读 `compare.json`/front matter → 输出 svg 字符串，无 `<script>` 子孙）嵌进 `compare/[table].astro` 或条目页，其上保留数据表（图是"看"，表是"核"）。**不破零 JS**（T2 自判 `02-presentation.md:149`）。
- 成本：中（坐标/刻度生成器 + 中文标签挤压调试是脏活）。SEO：内联 SVG 文本可被爬虫读，但**不新增关键词**（数字都已在表/正文里）；收益在"扫读层"不在 SEO。build：无新页面。
- **必须新增的机械守卫**：`svg` 内数字集合 == 对应 `compare.json`/条目数字逐字子串集合（复用 `check-compare.mjs` 的"逐字一致"方法论）；且 `svg` 内无 `<script>` 子孙。T2 `02-presentation.md:210` 已列，确认必需。
- **留浏览器目检**（不可 headless 代验）：SVG 中文标签 320px 挤压/负数/百分比溢出、双主题观感（T2 §4.2 第 3/4 项）。这是 SVG 最大的坑。

### 3.6 （补齐）R-D 切片 / R-E PATH 导览

- R-D：零 JS 方案（构建期生成排序/过滤的静态锚点切片）**零脚本可做，成本小**；客户端 `<select>` 排序 = 需 1-2KB JS 需决策。零 JS 方案的本质是"同一数据渲染 N 份不同行序"，重复 HTML、不重跑任何东西。
- R-E：`/guide/<n>/` 导览页，消费现有 `src/lib/paths.mjs`，**零脚本可做，成本小**，无新数据源。

**汇总表**：

| 方向 | 判定 | 成本 | SEO 影响 | build 影响 |
|---|---|---|---|---|
| 结论条 U-1 | 零脚本可做（已落地） | 0 | 中性 | 0 |
| 别名检索 A / 过滤框 B | A 可做（已落地）/ B 需 JS 需决策 | A 0 / B 小 | A 正面 / B 中性 | 0 |
| layer 四色 / R-A 分型 | 零脚本可做（色已落地，形=构建期分支） | 中 | 中性（全文在 DOM） | 渲染外壳，无新页 |
| 计算器 R-B | 查表可做 / 实时需 JS 需决策 | 中→可切小 | 查表正面 / 实时中性 | +calculators.json + 重算守卫 |
| 图表 R-C | 零脚本可做 | 中 | 中性（不增词） | +charts.mjs + SVG 逐字守卫 |
| R-D 切片 / R-E 导览 | 零脚本可做 | 小 | 中性 / 正面（可分享 URL） | R-D 重复渲染 |

---

## 4. 「两条方案在零脚本下冲突」的最小代价路径

### 冲突一：实时交互（R-B 实时计算器 / R-D 客户端筛选 / U-2 方案 B 过滤框） vs 零 `<script>` 不变式

这是"方案 vs 不变式"的正面冲突。关键事实：**零 `<script>` 目前没有机械闸门**（§0），它是约定 + 评审。所以"改不变式"其实是两步：

**路径 A（不破不变式，先做）——零代价**：用查表 + 静态切片 + `<details>` 分流替代任意输入。不改任何不变式文件，只新增数据（`calculators.json`）与模板，且都要配逐字重算守卫。

**路径 B（破不变式，最小代价）**，若红队/主编裁定"查表体验不达标"必须上真输入：

1. 改 `package.json:9` 的 `check` 链，追加一个 `scripts/check-no-script.mjs`：把"零脚本"从约定变成**机械契约**——默认断言 `dist/**/*.html` 与 `dist/**/index.html` 内 `<script` 计数为 0，白名单页（如唯一 `/calc/`）例外，白名单本身写死在脚本内。
2. 改 `src/pages/[...slug].astro`（或新页）：对白名单页输出 ≤2KB 内联原生脚本，无依赖、无 fetch、无服务端。
3. 改 `src/styles/global.css:1-5` 的头注释 + 团队目标里的"零脚本可信度"措辞：从"全站零 JS"改为"全站除白名单页外零 JS"。
4. **后果**：这是站的差异化护城河之一（零脚本 = 可审计、可离线、可 grep 验），破口会削弱"可信度叙事"并让 verify 断言从"全站 0"退化为"除 X 外 0"；同时 JS 即时结果不可被爬虫索引。**成本小但语义代价大，决策权在主编+红队**（与 T2 `02-presentation.md:187-197` 口径一致）。

### 冲突二：R-A「说人话前置 + 默认折叠正文」 vs 闸门五节体例 + `headings.mjs` 固定 mod 包裹 + T3「说人话/收益永不可折」

这不是"破零 JS"，而是**渲染层重排与折叠范围**的冲突。技术上三条都无硬拦：

- 闸门 B1/B3 只查"五节**存在**"与"怎么做内部 marker **顺序**"，**不查五个 h2 的先后**，所以"把说人话提到结论层"不会判红。
- `headings.mjs:75-96` 现在是按文档序包 `section.mod-*`；重排 = 新增"构建期抽取 per-section 文本再重排 `tree.children`"（`splitSections`（`entries.mjs:155-177`）与 `extractWhenSentence`（`headings.mjs:148-163`）已给出抽取先例）。
- 折叠正文用 `<details>` 时全文仍在 DOM（SEO/Ctrl+F/打印不丢）。

最小代价路径：**只改渲染层** `src/lib/headings.mjs` + `src/pages/[...slug].astro` + `src/styles/global.css`，**不动** `scripts/check-content.mjs` 的任一条正文断言，另补一条 verify："重排后 122/122 条仍含 `mod-howto/plain/gain/source/notes` 五 section + 四段式 class"（沿用 T2 §4.1 第 7 项）。"说人话/收益能否折"是内容/认知层裁决（T3 说不可折），技术层两者皆可，**由主编 T7 裁 fold scope**。

**一句话给主编**：技术上没有任何一条 T2/T3/T4 方案"必须"破零 JS 或改闸门；所有冲突都收敛成两种最小路径——①查表/静态切片替代实时（零价）、②若有且仅有 1-2 处真交互不可替代，走"白名单 + 机械闸门 + 措辞改"的 scope-limited 破口，其余全站维持零脚本。

---

## 5. 引用契约（供红队 t6 / 主编 t7 直接抄）

- **headless 可代验**（结构/计数/算术）：零 `<script>` 计数（§0）、五节/四段式/出度/字数（`npm run check`）、compare 数字逐字（`npm run check`）、SVG 无脚本子孙 + 数字逐字、calc 矩阵独立重算、锚点 id 唯一性、WCAG 对比度。
- **留浏览器目检**（像素/观感/引擎差异）：R-A 折叠后一屏占比与 sticky 总高挤压、R-C SVG 中文标签 320px 挤压与双主题观感、R-B `:has(:checked)` 老内核降级、R-D 静态切片 chip 横溢、R-E 一屏一卡节奏——**不得拿"dist 结构存在"冒充"页面正确"**（`~/.dsh/AGENTS.md` 纪律 #2，T2 §4.2 已逐项列）。
- **必须经红队裁决才可放行的破口**：任何 `<script>` 的引入（哪怕 1KB）。

## 附：本次用到的可复算命令

```bash
grep -rn "<script" src/ | wc -l
grep -ro "<script" dist/ --include="*.html" | wc -l
ls src/content/escape/*.md | wc -l
node scripts/check-content.mjs && node scripts/check-compare.mjs
grep -c "<script" dist/index.html dist/aliases/index.html 2>/dev/null
```