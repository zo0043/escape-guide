# 02 · 展现审计：信息架构、页面呈现与更好的展示形式

- 审计对象：`/home/ubuntu/dsh-workspace/1009/escape-guide`（Astro 静态站，零 JS、零外链字体、双主题跟随系统）
- 审计范围：`src/pages/*.astro`、`src/layouts/Base.astro`、`src/styles/global.css`、`src/data/compare.json`、构建期插件（`src/lib/headings.mjs`、`src/lib/entries.mjs`、`astro.config.mjs`、`src/content.config.ts`）与已构建产物 `dist/`（首页、122 个条目页、4 个对照表页、6 个域页、别名页、关于页、404）
- 日期：2026-10-12 · 审计人：ux-analyst（t2）
- 约束遵守：只读，未改任何源码。

## 0. 方法与验证边界

- **已做**：逐文件读源码与 dist HTML；对 dist 全部 122 个条目页做结构化统计（五节 mod-* 类、四段式 howto-part、quick-cards 回退卡、表格 data-label、反链/同域块）；对照表/别名/域页/首页/404 的 dist HTML 抽样验证；用脚本对两套主题的全部前景/背景配对计算 WCAG 对比度；对「一屏速览」与移动端导航做基于字号/行高/字符数的算术估算。
- **未做（明确标注）**：本机无 headless 浏览器、无 playwright。**一切依赖真实渲染的像素级判断（视口高度、折行、sticky 行为、focus 可见性）均标注「留浏览器目检」**，本文只给 CSS 证据与估算值，不用 HTTP 200 冒充页面正确。
- dist 与 src 一致性：`dist/_astro/Base.CfvTEb1z.css` 与 `src/styles/global.css` 语义一致（minify 差异），dist 为当前源码的忠实产物。

## 1. 现状盘点

| 项 | 实测值（dist） |
|---|---|
| 条目数 | 122（首页 stat 墙：122 条 / 6 域 / 29 条 A 级 / 14 条争议） |
| 域分布 | 01:21 · 02:39 · 03:29 · 04:10 · 05:16 · 06:7 |
| 页面类型 | 首页、122 条目页、4 对照表（crashes/masters/philosophy/biases）、6 域页、别名页、关于页、404 |
| JS | **全站 0 个 `<script>`**（含 aliases 页）；交互仅 `details/summary` 与 CSS |
| 五节结构 | 122/122 条目在 dist HTML 中均有 `mod-howto/plain/gain/source/notes` 五个 `<section class="mod mod-*">`，122/122 含四段式 `howto-when/steps/output/pass`；3 条大师条目多 `mod-perf`（第六节，TOC 条件渲染第 6 个 chip，已验证） |
| 速览字段 | `lede/when/keyNumber/maxRisk` 仅 **29/122（23.8%）** 条目填写；其余 93 条回落到「收益档位·量纲」「钱·时间·毅力」单行卡（已验证 93/122 出现回退文案） |
| 条目正文长度 | 中位 8.1KB（HTML），最长 38.4KB（泡沫的共同结构），最短 3.3KB |
| 反链 | 121/122 条目页底部有反链块，仅 1 条回落到「同域相关」 |
| 表格 | 对照表 4 张（crashes 19 数据行 × 7 列，133 个格全部带 `data-label`）；条目正文表 123 张，其中 26 张 ≥5 列被挂 `table-cards`（窄屏卡片化） |
| 对比度 | 两套主题全部文字色均过 AA（明细见 §3.4 表）；线条色 rule/rule-strong 仅 1.7–2.1:1（装饰线可接受，但有一处承载信息的例外，见 P-18） |

---

## 2. 发现清单

严重度：🔴 高（主路径受损）/ 🟡 中（体验或一致性明显受损）/ 🟢 低（打磨项）。
每条含：证据（文件+行号或 dist 路径）、描述、建议修法。

### 2.1 信息架构

**P-01 🔴 移动端页头导航必然溢出或压塌（全站所有页面）**
- 证据：`src/layouts/Base.astro:54-74`（header 结构）；`src/styles/global.css:82`（`.site-header .wrap { display:flex; align-items:center; gap:1.2rem; width:100% }`，**无 flex-wrap、无 overflow 处理**）；`global.css:74`（header 高度固定 `var(--header-h)=3.6rem`）；`global.css:94-97`（≤860px 仅隐藏首页两个次级锚点）。dist 实测：首页 nav 为 8 个链接、子页 4 个（`dist/index.html` site-nav 区）。
- 描述：375px 屏、≤640px 基础字号 16px 时，header 内容最小宽度 ≈ 站名 8 字（136px）+ 间距 19px + 子页 4 链接（目录/别名索引/关于本站/主站博客 ≈ 193px）+ padding 43px ≈ **391px > 375px**；首页 ≤860px 时 6 个链接 ≈ **519px**，超出 144px。CJK 文本的 min-content 可收缩到 1 字宽，flex 会把站名与链接压成多行窄列，而 header 高度锁死 3.6rem → 垂直方向裁剪/内容溢入正文。两种可能结局（横向滚动 或 文字竖排压塌）都不成立为可用导航。
- 建议修法：`.site-nav` 改 `overflow-x:auto` + 横向滚动（保留 `scrollbar-width:none`，与 section-chips 同一手法）并给 header 加 `min-height` 允许换行；或零 JS 汉堡（`<details>`）。**留浏览器目检**（确切断点与破损形态）。

**P-02 🔴 六域/对照表入口不存在于全局导航；条目页深处无跨域路径**
- 证据：`Base.astro:57-72`（site-nav 仅 目录/别名索引/关于本站/主站博客 + 首页独有 4 个页内锚点）；条目页 `src/pages/[...slug].astro:88-90`（面包屑只链**本条所属域**）；域间 chip 行只在域页底部（`src/pages/topic/[domain].astro:111-123`）；对照表互链只在对照表页底部（`src/pages/compare/[table].astro:87-101`）。页脚（`Base.astro:78-88`）亦无域/表入口。
- 描述：「六域入口只出现在首页中段」属实——全局层面没有任何域级导航。用户在条目页想浏览另一个域：反链块只到**引用过本条**的条目、同域块只到**本域**、面包屑只到**本域**、站名回首页后再进域 = ≥2 跳，且用户未必记得六域的存在。122 条内容里，跨域发现完全依赖首页一次性曝光。
- 建议修法：site-nav 增加「域」入口——零 JS 方案：`<details class="nav-drop">` 六域 + 四表（桌面 hover/focus-within 展开、触屏点按展开，CSS 即可）；或在条目页底部加一行「六域地图」chip（复用 topic-nav 样式，构建期渲染，成本极小）。

**P-03 🟡 首页「目录」导航项是自链；「来源规则」有 3 个口径不一的入口**
- 证据：`Base.astro:68`（`<a href={B}>目录</a>`，在首页即指向自己，点击无位移）；`index.astro:87`（hero CTA「来源规则」→ `about/`）与 `index.astro:218-234`（首页自有 `#rules` 节「本站的来源规则」）与 `about.md` 的「来源规则」节（dist/about/index.html h2 列表实测）。
- 描述：首页点「目录」= 原地不动，语义失效；「来源规则」一词同时指 hero CTA 的去向（about）、首页 `#rules`、about 页同名节，读者无法判断三处内容是否同一份（实际 `#rules` 只是 about 的摘要，页内已写「以关于本站为权威」，但命名未消歧）。
- 建议修法：首页把「目录」nav 项改指 `#all`（或首页隐藏该项、改为「回顶部」）；hero CTA 文案改「来源规则（完整版）」或直接指 `about/#来源规则`，三处统一命名。

**P-04 🟡 首页全目录 6 个 `<details>` 默认全折叠，且条目无深链锚点**
- 证据：`index.astro:190-215`（每域一个 `<details class="dom-details">`，无 `open`）；dist 实测：`<details>` 6 个、`open` 0 个、`dir-item` 122 个；`global.css:94-97`（≤860px 隐藏「对照表/全部条目」锚点，「六域」锚点保留）。
- 描述：122 条内容**已全部在 DOM 里**（首页 45KB），`details` 只是视觉折叠。想从首页直达某条：点域展开 → 滚动找 → 点条目，3 步；无法给「首页目录里的某条」发深链（无 id/锚点）；浏览器 Ctrl+F 虽可用，但折叠态下部分浏览器 Ctrl+F 不搜 `details` 内隐藏内容（**留浏览器目检**，各内核行为不一）。
- 建议修法：① 每条 `dir-item` 加 `id`（slug），域 summary 支持 `#域名` 深链；② 宽屏（≥880px，dir-list 已是两列）默认展开全部域（`<details open>`，构建期按断点无法实现——改为：默认全开，窄屏体验由「6 个 summary 常驻 + 列表长」承担，45KB 页面无性能压力）；或 ③ 目录顶部加「按域直达」chip 行（零 JS）。

**P-05 🟢 首页三条处境路径不与条目页串联**
- 证据：`index.astro:49-68`（PATHS 各 4 步独立链接）；`[...slug].astro` 无任何 path 概念（全文无 PATH 字样）。
- 描述：「我还没入市/我已被套/我要建体系」是最强的新手动线设计，但读到第 1 步条目后，页面里没有「PATH 01 · 1/4 → 下一步：凯利公式」，用户必须回首页取第 2 步。路径在离开首页的一刻就断了。
- 建议修法：构建期把每条条目的 path 归属算好（PATHS 是硬编码常量，零成本），条目页速览卡下方渲染「路径进度」chip 行（第 i/4 步 + 下一步链接）。

**P-06 🟢 跳转深度本身合理，深在「域内检索」**
- 证据：首页→条目 1 跳（目录/路径/域卡/对照表行）；首页→域→条目 2 跳；别名页→条目 1 跳（别名页在 nav 恒可见）。02 域 39 条为单列表（`dist/topic/02/index.html`），无内部分组。
- 描述：经典 IA 深度 ≤2 跳，达标。真正的「深」在 02 域 39 条单列列表里的域内检索（与 P-14 同源）。
- 建议修法：见 P-14。

### 2.2 条目页呈现

**P-07 🔴 「一屏速览」在移动端不成立；且 93/122 条的速览卡是弱信息回退**
- 证据：
  - 字段覆盖：`src/content.config.ts:58-67`（四字段全 optional）；实测 front matter：`lede/when/keyNumber/maxRisk` 各 29/122 条填写；回退渲染逻辑 `[...slug].astro:59-68`；dist 实测 93/122 条目页出现「收益档位 … 量纲 …」「钱 … · 时间 … · 毅力 …」回退文案。
  - 栅格：`global.css:357-366`（<640px 单列；640–1279 两列；≥1280 四列）。
  - 文本长度实测：`when` 最长 78 字（2015到2016）、`keyNumber` 最长 **212 字**（`1997亚洲金融危机:从泰铢到韩元.md`，是整段散文而非一个数）、`maxRisk` 最长 108 字（2007到2008，dist 已渲染为 6 行小字）。
  - 算术估算（CJK 字宽≈字号，body 16px/17px，行高 1.7）：
    - 移动端 375px 单列：header（crumb+h1 2–3 行+lede 4–5 行+meta+又称行）≈ 400–520px；quick-cards 4 卡纵排，最坏组合（1997 条：关键数字卡 ≈250px + 最大风险卡 ≈200px + 什么时候用 ≈100px + 证据卡 ≈70px）≈ 630px → **合计 ≈ 1050–1150px**，超出 iPhone 12（844px）与 iPhone SE（667px）视口；即便是 93 条回退卡（4 卡 ≈ 310px），667px 屏 ≈ 770px 也放不下。
    - 桌面 1280×1080（可用 ≈950px）：四列卡高 ≈ 最坏 315px，header ≈ 300px，chips ≈ 40px → **≈715px，成立**（临界）。
- 描述：「一屏速览」在宽屏桌面成立（临界）、在平板两列区与手机单列区不成立；而真正填满四卡的只有 29 条，其余 93 条速览卡实际是「证据 A 级 / 一句 when / 收益档位 中·量纲 亏损 / 钱 0·时间 少·毅力 否」——信息量低于标题+lede 本身，「速览」的承诺对这 93 条接近空转。
- 建议修法：① 移动端 quick-cards 改 2×2（<640px 也两列，卡内文本本就短；1997 这类长 keyNumber 用「大数字 + 首句 + `details` 展开全文」）；② 文档（about.md）把「一屏速览」措辞限定为「宽屏桌面」；③ 中期给 93 条补 `when/maxRisk`（属内容任务，非展现层）。**留浏览器目检**（精确高度随字体渲染浮动）。

**P-08 🟡 五节结构「有视觉区分」但一半节几乎不可辨**
- 证据：dist 全量验证 122/122 条目五个 `mod-*` section 齐全（本次审计脚本，见 §0）；样式 `global.css:502-532`：`mod-plain`（bg-soft 底 + accent 左 3px 条 + h2 无下划线，**可辨**）、`mod-gain`（整卡边框，**可辨**）、`mod-source`（整体降为 0.88rem fg-dim，**可辨**）、`mod-perf`（3px double 上沿，**可辨**）；但 `mod-howto`（`border-top:1px solid var(--rule)`，`global.css:527`）与 `mod-notes`（`border-top:1px solid var(--rule)`，`global.css:521`）只有发丝线——而 howto 节紧贴 sticky chips 正下方，`--rule`（#e4dfd2，与背景对比 1.72:1）在该位置**视觉上消失**。四段式左条同理：`howto-when` 用 `--rule-strong`（2.06:1）偏弱（`global.css:502-507`）。
- 描述：结论是「有区分，不是五等份」：5 节里 3–4 节（plain/gain/source/perf）区分清晰，howto 与 notes 两节退化为「与正文无异的段落」。读者靠 h2 文字而不是靠模块形态知道「换节了」，速读时容易漏掉「怎么做」的边界。
- 建议修法：`mod-howto` 上沿改 accent 2px（它是条目主节，值得最重的上沿）；`mod-notes` 改 bg-soft 底（与 plain 同族但去左条）；四段式左条统一提到 `--rule-strong` 以上，或改「part-label 小色块 + 发丝线」。**留浏览器目检**（最终观感）。

**P-09 🟡 条目页缺阅读位置感：无进度、无回顶、无上一条/下一条**
- 证据：`[...slug].astro:123-125`（只有 sticky 节 chips）；`global.css:400-425`（section-chips 实现）；全文无 reading-progress / back-to-top / prev-next 类或锚；条目正文最长 38.4KB（`dist/泡沫的共同结构五次崩盘里的同一套剧本/index.html`，实测）≈ 20+ 屏滚动。
- 描述：sticky chips 解决了「跳到某节」，没解决「我在哪/读完没/下一篇是什么」。长条目读到 20 屏后：无进度指示、无回顶控件、底部反链块存在但与「继续读」动线正交；同域「上一条/下一条」不存在（weight 有序但没有序导航），按路径读（P-05）也没有序。
- 建议修法：① 底部加「同域上一/下一」chip 对（weight 序，构建期算，与反链块共存而非互斥——当前「有反链就不给同域」的互斥逻辑（`[...slug].astro:72-83`）让 121/122 条失去了同域横向移动）；② 纯 CSS 进度条：`animation-timeline: scroll(root)`（Chrome/Edge 115+，Safari/Firefox 优雅降级为无，零 JS）；③ 底部「回顶部」chip（`#main` 锚）。②③ **留浏览器目检**。

**P-10 🟢 「A 级」在全站有两种颜色语义**
- 证据：首页目录 `global.css:311`（`.dir-ev.ev-A { color:var(--ok) }` 绿）；对照表 `global.css:704`（`.compare .ev-A { color:var(--accent) }` 橙）；条目速览卡证据卡无专用色（仅 mono 大字）。dist 实测两处渲染。
- 描述：同一个「A」在首页是绿、在对照表是橙，读者跨页时颜色→等级的心智模型会被重置。对照表里橙还是 accent（与所有链接 hover 同色），「A 级」与「可点」两个语义撞车。
- 建议修法：统一为单一体系（建议：A=ok 绿全站一致，B=fg 加粗，C=fg-dim 虚线，与首页目录一致；accent 只留给交互）。

**P-11 🟢 keyNumber「大数字」是「首个数字串」的机械提取，可能不是该条最重要的数**
- 证据：`[...slug].astro:53-56`（`keyFigure` 正则取首个数字串）；`[...slug].astro:47-50` 注释自认「实测 keyNumber 并非都约定写在最前」；实例：1997 条 keyNumber 以「泰铢 24.52 → 30.18…」开头，大数字卡显示 **24.52**（一个中间值），而该条标志性数字是韩元 −50.9%；2000 互联网泡沫大数字 −77.93%（恰好正确，属运气）。
- 描述：「大数字是钩子、小字是完整口径」的降级设计限制了伤害（读者往下读小字能纠正），但 29 条里「钩子抓错数」没有机制保证不发生。
- 建议修法：front matter 增可选 `keyFigure` 字段（显式指定大数字），缺省时保留现算术回退；构建期校验 `keyFigure` 必须是 `keyNumber` 的子串（防漂移，与对照表「数字逐字一致」的既有不变式同风格）。

### 2.3 集合页呈现

**P-12 🔴 别名索引是纯罗列：无搜索、无过滤、无跳格，检索效率 O(N)**
- 证据：`dist/aliases/index.html` 实测：51,283 字节、`<input>` **0** 个、`<script>` **0** 个（全站 0）、`<details>` 0 个、`alias-chip` **327** 个、`alias-item` 122 行；页内文案自认「本站没有搜索框」（`aliases.astro:52-56`）。
- 描述：别名页是全站第一检索入口（site-nav、页脚、404、首页 #all 导语、stat 墙五处都指向它），但 327 个别名 × 122 个条目的唯一查法是整页滚动或浏览器 Ctrl+F（对 51KB 单页有效，但对「我想查『千股跌停』到底在哪条」这类任务，是逐行目扫）。零 JS 约束是设计决定，不是缺陷本身；问题是**在零 JS 约束内也有未做的检索增强**（见修法 ①③）。
- 建议修法：① 零 JS：每域列表顶加「域内按首字（拼音）直达」chip 行（构建期按 pinyin 首字母分组，锚点跳转）；② 若允许破零 JS：≤3KB vanilla 过滤框（`<input>` + 隐藏不匹配的 `.alias-item`，保留全部链接可达性，无索引无依赖）；③ 零 JS 兜底优化：每行把「又称」chip 前置、条目标题降为 chip 后小字——目扫目标是俗称，不是正式标题。②需团队决策（破不破零 JS），①③纯构建期。

**P-13 🟡 对照表：窄屏方案是亮点，但无行级深链、无行内注、桌面横滑区体验可再收**
- 证据：`dist/compare/crashes/index.html` 实测：19 数据行 × 7 列、**133/133 格带 data-label**；`global.css:599-672`（≤640px 全卡片化 + data-label 伪元素列名；641–1180px 首列 sticky + 右缘 inset 阴影提示可滑——零 JS 三件套，设计良好）；行无 id（`compare/[table].astro:59-81`，`<tr>` 无属性）；`foot` 为 100+ 字长段（compare.json crashes.foot，把 8 处口径备注压在一句话里）。
- 描述：移动端卡片化是全站最佳响应式实现。缺三件事：① 行无 id → 「把 2008 那一行发给你」做不到，评论/引用场景只能发整表；② foot 长段与表内括号注释（如「收盘口径见表内括号」）需要来回滚动对照，注-文分离；③ 641–1180px 横滑区，sticky 首列背景 `var(--bg)`（`global.css:667`）与卡片 hover `bg-soft` 不一致，横滑时行底颜色跳变（**留浏览器目检**）。
- 建议修法：① 行加 `id`（slugify 行首事件名，构建期），row-head 链接改为「标题链条目 + ⌘ 小锚」或行内加 `#` 图标（纯 CSS `a::after`）；② foot 拆成 ①②… 上标 + 表下注块（改 compare.json 结构：`footNotes: [{ref, text}]`，行内 `c` 文本允许 `[[fn:1]]` 标记）；③ sticky 列背景改 `var(--bg-card)` 或行 hover 时同步。

**P-14 🟡 域页单列表无组织：02 域 39 条一列到底，与首页目录双风格**
- 证据：`topic/[domain].astro:41-43`（仅按 weight 排序，无 layer 分组）；`dist/topic/02/index.html`（39 条连续 `topic-list`，无 h3/锚点）；`dist/index.html` 同数据在首页是「details 折叠 + 两列 + ev 徽标 + layer tag + description kicker」，域页是「单列 + meta 文字行（收益档位 中 · 量纲 亏损 · 证据 A · layer）」——同一份数据两种信息密度与视觉语言。
- 描述：域页是「章→条」的中间层，对标 Our World in Data topic page 的意图是对的（essence 先行），但 39 条单列 + 无层分组 + 无锚点，使 02 域页本身成为 P-06 说的「深」。且 122/122 条都有 `layer`（理念/执行/档案/工具，`content.config.ts:43`，闸门必填）——**数据里有分组维度，展现层没用它**。
- 建议修法：域页列表按 layer 分 4 段（理念→执行→档案→工具），段标题 + 锚点 + 顶部「层直达」chip（零 JS，构建期渲染）；列表行样式向首页目录对齐（复用 `dir-ev` 徽标 + `layer-tag`，去掉 meta 长串）。

**P-15 🟢 404 多出口好，但没有「你是不是要找」**
- 证据：`dist/404.html`（5 个出口按钮，覆盖 首页/域/表/别名/关于）。
- 描述：出口设计完整。但 slug 即中文标题（`[...slug].astro` + `slugify`），用户手打/拼错的 URL（漏字、标点全半角、同音字）落到 404 后没有任何近似提示；别名 327 个、标题 122 个都在构建期可枚举，近似匹配是纯离线计算。
- 建议修法：构建期对 404 无法枚举任意 URL，但可加一层轻量静态 404 策略：GitHub Pages 的 `404.html` 无法知道请求路径（纯静态）——**此条在纯静态托管下只能做到「推荐别名页 + 高频 6124 类俗称直达 chip」**；若迁 Vercel/带重写的托管，可做服务端模糊匹配。成本视托管而定，收益中。

### 2.4 可读性与可访问性

**对比度实测**（脚本计算，两套主题全配对；文字色全部过 AA）：

| 配对 | 亮色 | 暗色 |
|---|---|---|
| fg / bg | 17.2:1 | 14.7:1 |
| fg-dim / bg | 5.3:1 | 6.6:1 |
| accent / bg | 6.5:1 | 8.0:1 |
| on-accent / accent | 6.8:1 | 8.0:1 |
| ok / bg | 6.0:1 | 7.9:1 |
| warn / bg | 4.8:1（AA 过，临界） | 9.7:1 |
| risk / bg | 7.0:1 | 7.1:1 |
| rule / bg（线） | 1.72:1 | —（装饰） |
| rule-strong / bg（线） | 2.06:1 | —（装饰） |

**P-16 🟡 无 `prefers-reduced-motion` 处理**
- 证据：`global.css:719`（`html { scroll-behavior:smooth }` 无 media 包裹）、`global.css:229-231`（start-card hover `translateY(-2px)`）、`global.css:174`（cta transition）、`global.css:262`（domain-card transition）。全文无 `prefers-reduced-motion`（grep 实测 0 处）。
- 描述：锚点平滑滚动（全站 chips/导航大量使用）与 hover 位移对前庭敏感用户是刺激源。
- 建议修法：`@media (prefers-reduced-motion: reduce) { html { scroll-behavior:auto } * { transition:none !important; transform:none !important } }`，约 5 行。

**P-17 🟡 标签字密度过低：多处 10.5–12.5px，且多为 mono**
- 证据：`global.css` 实测字号：`.qc-flag/.ev-flag` 0.66rem（11.2px，≤640px 屏 ≈10.6px）、`.layer-tag` 0.68rem（11.6px）、`.qc-label/.dir-ev` 0.7rem（11.9px）、`.alias-kicker` 0.72rem、`.dc-meta/.section-label/.dom-summary-count` 0.74rem、对照表列名伪元素 0.68rem（`global.css:623-632`）。
- 描述：对比度都过 AA，问题不是对比度是**字号**：CJK 11px 以下字形成辨识度显著下降，mono 字体（这些标签全部 `var(--mono)`）在小字号下尤甚。`.ev-flag`「争议」0.66rem 带边框——是全站最小的功能文字。
- 建议修法：标签下限提到 0.72rem（12.2px），`.ev-flag` 提到 0.7rem；mono 仅留给数字/编号，中文标签改 sans（视觉损失小，可读收益大）。**留浏览器目检**（改后观感）。

**P-18 🟢 域卡大数字 `.dc-num` 对比度 1.72:1（亮）/2.06:1（暗）——承载信息的数字近乎隐形**
- 证据：`global.css:265`（`.dc-num { color: var(--rule-strong) }`）；对比度为本次脚本实测值。
- 描述：「01–06」域编号是导航信息（与域名一起构成「第 01 域」），亮色主题下几乎看不见，实际观感是纯装饰水印。设计意图若是水印，它不该在信息路径上占 1.9rem 行高。
- 建议修法：二选一——要信息：`color: var(--fg-dim)`（5.3:1）；要装饰：缩到 1rem 并绝对定位到卡角，把行高让给 `dc-essence`。

**P-19 🟢 触屏链接可识别性：底部反链/同域链接无下划线、无 hover 态**
- 证据：`global.css:569-570`（`.backlinks a { text-decoration:none }` + hover 出下划线）、`global.css:65-66`（全局 `a { color:inherit }`，正文普通 `<a>` 依赖 UA 默认下划线可辨——验证有效，但仅靠下划线）；`[...slug].astro:132-160`（反链块 121/122 条存在）。
- 描述：正文外链有 UA 默认下划线，可用；但条目页底部反链/同域块里的链接是「同字号同色无下划线」，触屏无 hover，只能靠「这个块整体都是链接」的上下文推断——对屏幕阅读器用户，链接语义仍在（`<a>` 可聚焦），主要是视觉线索缺失。
- 建议修法：`.backlinks a` 与 `.topic-item-title`、`.compare .row-head a` 统一加 `text-decoration:underline; text-decoration-color:var(--rule-strong)`（与 `.wl` 同一套细下划线语言，全站链接可识别性归一）。

**P-20 🟢 字体栈的 Linux 回落：serif 标题会退化成 sans**
- 证据：`global.css:23-24`（`--serif: Songti SC → Source Han Serif SC → Noto Serif CJK SC → SimSun → Georgia…`）。
- 描述：macOS（宋体-简）/Windows（SimSun）无碍；未装上述 CJK 衬线的 Linux 环境（CI 截图、部分服务器、少数用户）里 CJK 回落到系统默认 sans，杂志风的衬线标题整体消失。真实用户影响小，CI/截图环境必现。
- 建议修法：接受现状（零外链字体是硬约束）；若 CI 截图需要一致性，在 CI 镜像装 `fonts-noto-cjk`。**留浏览器目检**。

**P-21 🟢 打印样式把速览卡排除了**
- 证据：`global.css:734-741`（`@media print` 隐藏 `.quick-cards` 等）。
- 描述：打印规则整体好（隐头尾、外链展 URL、`break-inside:avoid`），但「证据等级/关键数字/最大风险」恰恰是打印带走价值最高的 4 个事实（自查表类条目自称「打印版」，见 `global.css:734` 注释），却被隐掉。
- 建议修法：打印保留 `.quick-cards` 改 2×2 网格，隐藏 `.section-chips`/`.backlinks` 不变。

**P-22 🟢 关于页被条目插件「连坐」：h2 挂 `mod-generic` 与中文 id**
- 证据：`dist/about/index.html`（`<section class="mod mod-generic"><h2 id="双链怎么用">`）；根因：`astro.config.mjs:49` 的 `entryHeadings` 挂在**全局** markdown processor 上，pages 集合也吃同一套（`headings.mjs:62-83` 对任何 h2 包 section）。
- 描述：功能无损（中文 id 锚点可用），但静态说明页的 h2 带着条目式的 accent 左条，语义上「这不是条目」；将来 about 若新增与五节同名的 h2 会被误挂 id。
- 建议修法：`astro.config.mjs` 对 pages 渲染走不带 `entryHeadings` 的 processor，或插件内按 front matter 标记跳过。

**P-23 🟢 全局 nav 无 `aria-current`**
- 证据：`Base.astro:57-72`（无任何 `aria-current`）；对照 `compare/[table].astro:96` 与 `topic/[domain].astro:117`（底部 chip 都有 `aria-current="page"`）。
- 描述：屏幕阅读器用户在全局 nav 里无法知道当前在哪一页（「目录」在首页是 self-link，见 P-03）。
- 建议修法：Base 按 `Astro.url.pathname` 在对应 nav 项加 `aria-current="page"`（构建期，零 JS）。

**a11y 正面清单**（做得对的，记录以免重复建议）：`skip-link` 存在且 focus 可见（`Base.astro:53`、`global.css:721-733`）；`lang="zh-CN"`、viewport、canonical、OG 齐全（`Base.astro:26-49`）；`<details>/<summary>` 原生键盘可达；对照表行头 `scope="row"`（`compare/[table].astro:66`）；sticky chips 有 `aria-label="页内目录"`（`[...slug].astro:123`）；未出现 `outline:none` 反模式（grep 实测）；shiki 双主题零 JS 切换（`global.css:473-479`）。

---

## 3. 更好的展示形式（替代/增强方案）

按「收益/成本」排序。每条：解决什么问题 → 改哪个文件 → 成本（小/中/大）→ 预期收益。涉及真实渲染效果的均标「留浏览器目检」。

**U-1 · 条目页顶部固定「结论条」（sticky conclusion bar）——推荐第一优先**
- 解决：P-09（长条目中段失去位置感）+ P-07（「一屏」承诺的桌面兑现 + 移动部分兑现）——任何时刻抬头都能看到「哪条 / 什么等级 / 最重要的数 / 最大风险」。
- 改哪里：`src/pages/[...slug].astro`（header 后插入一条 `<div class="concl-bar">`：标题截断 + ev 徽标 + keyNumber 大数字 + maxRisk 截断）；`src/styles/global.css`（sticky top:var(--header-h)，与 section-chips 同 z-index 体系，窄屏只显示「标题 + ev + 大数字」）。
- 成本：**小**（零 JS，复用既有 sticky 机制，构建期数据现成）。
- 预期收益：高。阅读 20 屏的长条目时结论永不丢失；「先别亏钱」的站点气质在视觉上也落实为「结论永远在顶部」。

**U-2 · 别名检索增强（零 JS 跳格 或 ≤3KB 过滤框）——推荐第二优先**
- 解决：P-12（第一检索入口 O(N) 目扫）。
- 改哪里：`src/pages/aliases.astro`（方案 A：每域 pinyin 首字母分组 + 锚点 chip 行；方案 B：`<input>` + 内联 ≤3KB vanilla JS 过滤，保留全部链接可达）；`src/styles/global.css`（chip 行样式复用 topic-nav）。
- 成本：方案 A **小**（纯构建期）；方案 B **小**（一次破零 JS 决策，全站 JS 预算仍 <5KB）。
- 预期收益：高。别名页是 5 处入口共同指向的检索页，O(N)→O(1) 是全站单点收益最大的改动。方案 A/B 二选一需团队对「零 JS 约束」表态（`global.css:1-5` 把零 JS 列为设计取向）。

**U-3 · 按 layer 着色：理念/执行/档案/工具 四色信号**
- 解决：P-14（02 域 39 条单列）+ `content.config.ts:35-41` 注释自己提出的问题（「读者读时不知道自己在哪一层」「不要合并同题条目，只给一个层级信号」——目前信号是灰底小 tag，四值同色，信号≈无）。
- 改哪里：`src/styles/global.css`（`.layer-理念/.layer-执行/.layer-档案/.layer-工具` 四色：建议 理念=accent、执行=ok、档案=fg-dim、工具=warn，仅用于小圆点/左条，不用于大色块，守住杂志风克制）；`src/pages/index.astro:206`、`src/pages/topic/[domain].astro:78`、`src/pages/[...slug].astro:97`（`layer-tag` 加对应 class，三处共用）。
- 成本：**小**（纯 CSS + 三个模板各一行）。
- 预期收益：中高。同题双条目（理念 vs 执行）是本站刻意的设计，四色让「我在读原理还是读动作」一眼可判；域页按层分组后（P-14 修法）颜色还兼作分组锚点的视觉键。

**U-4 · 章节内阅读序列：howto 四段进度化 + 首页路径串联**
- 解决：P-05（路径断链）+ P-08（howto 节边界弱）。「什么时候用→步骤→做完你会得到→怎么算过关」本身是四步流程，现在只是四段不同左色的段落。
- 改哪里：`src/lib/headings.mjs`（四段 p 外加一个四格进度条容器，构建期）；`src/pages/[...slug].astro`（路径归属 chip：从 PATHS 常量反查）；`src/pages/index.astro:49-68`（PATHS 导出供复用）；`src/styles/global.css`。
- 成本：**中**（构建期数据流要动三处，渲染简单）。
- 预期收益：中。执行类条目（32 条）的「照做感」强化；新手三条路径成为真正的路径而非四条独立链接。

**U-5 · 对照表行级深链 + 表内脚注**
- 解决：P-13（「把 2008 那行发你」做不到；foot 长段与表内括号来回对照）。
- 改哪里：`src/pages/compare/[table].astro`（`<tr id>` + row-head 行内 `#` 锚）；`src/data/compare.json`（`foot` → `footNotes` 结构，行内 `[[fn:n]]`）；`src/styles/global.css`（上标 + 注块）。
- 成本：**中小**（JSON 结构改动要过 `verify` 脚本的「数字逐字一致」不变式，需同步更新校验）。
- 预期收益：中。引用/评论/收藏单行场景；口径备注从 100 字长段变成就近可查的注。

**U-6 · 纯 CSS 阅读进度条（`animation-timeline: scroll()`）**
- 解决：P-09 的进度部分（若 U-1 已做，此项收益递减）。
- 改哪里：`src/styles/global.css` 约 10 行（Chrome/Edge 115+ 生效，Safari/Firefox 优雅降级为无进度条，零 JS）。
- 成本：**小**。
- 预期收益：小中。**留浏览器目检**（支持率与降级观感）。

**U-7 · 首页目录宽屏默认展开 + 条目级锚点**
- 解决：P-04（折叠深链缺失；122 条已在 DOM，折叠纯省视觉高度）。
- 改哪里：`src/pages/index.astro`（`<details open>` + 每 `dir-item` 加 `id`）；`src/layouts/Base.astro`（「目录」nav 项首页改指 `#all`）。
- 成本：**小**。
- 预期收益：小中（首页变长，但域 summary 行仍常驻可折叠；**留浏览器目检**长首页观感）。

---

## 4. Top 5 展现问题

| # | 问题 | 严重度 | 一句话 |
|---|---|---|---|
| 1 | **P-01 移动端页头导航溢出/压塌** | 🔴 | 全站每页在 ≤~400px 屏上导航要么横滚要么竖排裁剪（375px 首页需 519px 最小宽 vs 可用 332px），**留浏览器目检**确切形态 |
| 2 | **P-07 「一屏速览」移动端不成立 + 93/122 条速览卡是弱回退** | 🔴 | 最坏条目移动端 ≈1050–1150px > 844px 视口；只有 29 条有四卡真数据，其余 93 条速览≈标题复述 |
| 3 | **P-12 别名索引纯罗列，检索 O(N)** | 🔴 | 全站第一检索入口（5 处指向）0 输入框 0 脚本 327 chip，只能滚动/Ctrl+F；零 JS 约束内仍有未做的增强 |
| 4 | **P-02 六域入口不在全局导航，条目页深处无跨域路径** | 🔴 | 离开首页中段后域级导航消失；条目页跨域浏览 ≥2 跳且依赖用户记住六域存在 |
| 5 | **P-08 五节视觉区分「一半在场」+ P-13 对照表无行级深链** | 🟡 | howto/notes 两节退化为发丝线不可辨；对照表 133 格卡片化做得好但行不能深链、口径注与表身分离（两条合并为「结构区分与可引用性」主题） |

## 5. Top 3 展示形式升级

| # | 升级 | 成本 | 预期收益 |
|---|---|---|---|
| 1 | **U-1 条目页 sticky「结论条」**（标题+等级+关键数+最大风险，滚动不丢） | 小 | 高——长条目位置感 + 结论常驻，零 JS |
| 2 | **U-2 别名检索增强**（零 JS 拼音跳格 或 ≤3KB 过滤框，二选一待决策） | 小 | 高——全站第一检索入口 O(N)→O(1) |
| 3 | **U-3 layer 四色信号**（理念/执行/档案/工具，目录/域页/条目头三处共用） | 小 | 中高——「同题双条目」设计意图第一次在视觉层落地，兼作域页分组键 |

---

## 附录 A · dist 结构验证记录（本次审计脚本实测）

1. 122/122 条目页含 `mod-howto/plain/gain/source/notes` 五 section 与四段式 `howto-when/steps/output/pass`；3 条（巴菲特复利机器/林奇麦哲伦/钱从哪来）含 `mod-perf` 且 TOC 渲染第 6 个 chip「业绩验证」。
2. quick-cards：122/122 页存在；93/122 含「收益档位…量纲…」回退卡与「钱…·时间…·毅力…」回退卡；「什么时候用」卡 122/122 有文案（29 条 front matter `when` + 93 条构建期 `extractWhenSentence` 提取，提取文案 ≤76 字，实测最长 76）。
3. 对照表 crashes：20 个 `<tr>`（1 表头 + 19 数据行），133/133 数据格带 `data-label`；行无 id。
4. 别名页：51,283 B，`<input>` 0、`<script>` 0（全站 0）、`alias-chip` 327、`a-item` 29。
5. 首页：nav 8 链接（含 4 页内锚点），`<details>` 6 个 `open` 0 个，`dir-item` 122；stat 墙 122/6/29/14。
6. about 页：h2 挂 `mod mod-generic` + 中文 id（`id="双链怎么用"` 等 4 处）。
7. 条目正文表：123 张，26 张 `table-cards`（≥5 列卡片化）。
8. 反链块 121/122 条，同域块 1/122 条（互斥逻辑 `[...slug].astro:72-83`）。
9. dist CSS 与 src CSS 语义一致（minify 差异），dist 为当前源码产物。

## 附录 B · 「留浏览器目检」清单

以下判断无法在本机（无 headless 浏览器）代验，交付后须在真实浏览器确认：
1. P-01 移动端导航在 320/360/375/414px 的确切断点与破损形态（溢出 or 压塌）。
2. P-07 「一屏速览」在 iPhone SE 667px / iPhone 12 844px / iPad 两列区 / 1280×1080 桌面 的确切高度。
3. P-12 浏览器 Ctrl+F 对 `details` 折叠内容的检索行为（P-04 相关，各内核不一）。
4. P-13 641–1180px 横滑时 sticky 首列与 hover 行底色的实际观感。
5. P-17 标签字号下限调整后的观感（改后验证）。
6. P-20 Linux 无 CJK 衬线时的字体回落（CI 截图环境）。
7. U-1/U-6 sticky 结论条与 CSS scroll-timeline 进度条在 Safari/Firefox 的降级观感。
8. U-7 首页全展开后的长页面观感。
