# t17 交付报告 · P2 A 批 CSS 小修补（A1–A5）+ A6 aria-current + B6a 目录自链

- 实施人：ux-analyst · attempt f2527911-28fc-4b04-ab22-df17f1c2af2f
- 依据：00-final-report.md §3 P2-A 表（:136-141）+ P2-B6 行（:152，本任务仅 B6a 前半）
- 改动文件（仅任务所列 2 个；行号为落地时实际行位，非审计时点值）：
  - `src/styles/global.css`（t17 7 处 hunk，均带 P2-A 注释标记；同文件另有 Phase 0/1 已交付 hunk：t8 横滑/t11 2×2+四色+行锚/t14 别名跳格，git diff 中并存，可按 `grep 'P2-A'` 切分）
  - `src/layouts/Base.astro`（t17 3 处 hunk：front matter aria-current 计算块 + 下拉两链接 + 四个顶层链接）
- 零 `<script>` 不变式：保持（2 文件 grep 全 0）
- 未运行 build（验证任务统一构建）；不 commit 不 push

## 1. 七处 diff 摘要

| # | 落地位置 | 改动 |
|---|---|---|
| A1 | `:905` `.compare .ev-A` | `color: var(--accent)` → `var(--ok)`（与 `:424` `.dir-ev.ev-A` 绿一致）；注释同步「A accent 加粗」→「A ok 绿加粗（P2-A1：…accent 只留交互元素，避免『A 级』与『可点』撞语义）」。全站 ev-A 规则现仅两处、同色（grep 验证 accent-on-ev-A 残留 = 0） |
| A2 | `:914-920`（`html{scroll-behavior:smooth}` 之后） | 新增 `@media (prefers-reduced-motion: reduce)` 块（5 行）：`html{scroll-behavior:auto}` + `*/*::before/*::after { transition:none!important; animation:none!important; transform:none!important }`。覆盖实测 4 处动效源（`.chip` :287 transition、`.start-card` :342-344 transition+hover translateY、:375 transition）；全站无基态 transform（grep transform 仅 :342/:344 命中），`!important` 置空无布局副作用 |
| A3 | `:378` `.dc-num` | `color: var(--rule-strong)`（1.72:1）→ `var(--fg-dim)`（5.3:1，「要信息」方案）；注释注明理由 |
| A4 | `:750-758` `.backlinks a` | `text-decoration:none` + hover 才下划线 → **常显下划线与 `.wl` 同语言**（`underline` + `text-decoration-color: var(--rule-strong)` + `thickness:1px` + `offset:0.25em`），hover 出 accent（文字+下划线色）。反链与「同域相关」共用 `.backlinks` 容器（同域相关即 `<aside class="backlinks">`，见 [...slug].astro:172），一处规则覆盖两类 |
| A5 | `:938-945` 打印块 | `.quick-cards` 从隐藏清单移出（清单剩 7 项）+ 块内加 `.quick-cards { grid-template-columns: repeat(2, 1fr) }`（打印宽度下原 4 列会挤）；注释注明 4 个速览事实恰是打印价值最高内容 |
| A6 | `Base.astro` front matter（:35-45）+ 6 个链接 | 构建期 `Astro.url.pathname` 精确匹配（写法参照 compare/[table].astro:105 既有 `aria-current={x === y ? 'page' : undefined}`）：`isHome`/`isAliases`/`isAbout` + `curDomain`/`curTable`（复用 navDomains/navTables 数组比对，无正则）。**处理**：site-title 是品牌 logo 不是导航目标 → 不给 aria-current（否则首页会与「目录」双标）；首页 current 落在「目录」上；域页/表页 current 落在「域与表」下拉内对应项 |
| B6a | `Base.astro` :135「目录」 | `href={B}`（自链首页根）→ `href={`${B}#all`}`——子页访问一步到全部条目列表，首页点击页内滚至 #all（锚点存在：index.astro `<section id="all">`） |

## 2. 自检输出

1. `node scripts/check-content.mjs` → **exit 0**（122 条合规，既有 disputed 警告与基线一致）。
2. `node scripts/check-compare.mjs` → **exit 0**（70 行 src 全解析；159 nums + 288 token 逐字命中）。
3. CSS 花括号配平：OK。
4. 7 项逐条断言（python 脚本，见会话日志）：
   - A1：两处 ev-A 规则均为 `var(--ok)`；`ev-A…{…accent` 残留 = 0；
   - A2：`@media (prefers-reduced-motion: reduce)` 块在场（5 行体）；
   - A3：`.dc-num { … color: var(--fg-dim); }`；
   - A4：`.backlinks a` 含 underline + rule-strong；
   - A5：打印隐藏清单不含 `.quick-cards`；打印块含 `repeat(2, 1fr)`。
5. aria-current 路由模拟（build-proxy，复刻 front matter 匹配逻辑）：
   ```
   首页 → 目录；别名页 → 别名索引；关于页 → 关于本站；
   topic/01、03、06 → 下拉对应域；compare/crashes、philosophy → 下拉对应表；
   条目页、404 → 无标记。全部路由至多 1 个 current 标记（无双标）
   ```
6. 零 `<script>`：Base.astro / global.css grep 全 0。
7. 类集合：本任务未新增/删除任何 CSS 类（A5 只改既有选择器在打印块的显隐与栅格；A6/B6a 为属性级改动）——无悬空类风险。

## 3. 留浏览器目检项（本机无 headless，UI 渲染层不代验）

1. **A1**：对照表「证据」列 A 行显绿（与首页目录 ev-A 徽章同绿）——浅/深两主题各看一眼；确认「A=绿、可点=橙」语义不再混。
2. **A2**：系统开「减少动态效果」后：锚点跳转（如 #all）无平滑滚动、start-card hover 无上浮、chip hover 无过渡；关时行为不变。
3. **A3**：首页六域卡「01–06」编号可读性（fg-dim 灰 vs 原发丝线灰）——两主题。
4. **A4**：条目页底部「被哪些条目引用/同域相关」下划线常显不糊字（0.25em 偏移观感）；hover 变橙。
5. **A5**：打印预览（Ctrl+P）：速览 4 卡以 2×2 出现、容器边框可见、文字可读；注意浏览器默认不印背景，卡底色（bg-card）大概率不印，若判观感差可后续给打印态补 `background:#fff`（不在本任务范围）。
6. **A6**：DevTools/读屏器验证：首页「目录」带 `aria-current="page"` 且 site-title 不带（无双标）；topic 页/compare 页标记在「域与表」下拉对应项（需展开下拉可见）；条目页/404 无标记。
7. **B6a**：从任意子页点「目录」→ 直达 #all 列表（非首页根再手动找）；首页点「目录」→ 页内滚至 #all（与导航区「全部条目」锚点同目标，首页上二者并存为任务书选定的 #all 方案的预期形态）。

## 4. 范围外记录

- P2-B6 后半（index.astro hero CTA 改「来源规则（完整版）」指 about/#来源规则）不属本任务（任务书明确 B6a 前半），留后续任务。
- A5 打印态 quick-cards 背景色（bg-card 默认不印）如需白底，属打印观感微调，留目检后决策。
