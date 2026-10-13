# t30 交付报告 · P2-C4：同域上/下一条 + 回顶 + U-6 纯 CSS 进度条

- 实施人：ux-analyst · attempt c7be811a-bd6d-4369-bce7-30e7c72b6e78
- 依据：00-final-report.md §3 P2-C4 行（:161）+ §5.4 + 02 报告 P-09（:85-89）/U-6（:217-221）
- 改动文件（仅任务所列 2 个；本任务 hunk 以 `grep 'P2-C4\|U-6'` 切分，与 Phase 0/1/t25/t29 已交付 hunk 并存）：
  - `src/pages/[...slug].astro`——front matter 同域序计算 +17 行、article 顶部进度条 div +7 行（含注释）、页面底部 entry-nav +16 行
  - `src/styles/global.css`——`.entry-nav` 块 +11 行、`.read-progress` + `@supports` 块 +30 行、打印隐藏清单 +2 选择器
- 零 `<script>` 不变式：保持（[...slug].astro grep = 0，进度条纯 CSS）；未跑 build、未 commit/push
- **交接面**：t31（keyFigure）将动 cb-num 消费逻辑——本任务未触碰 concl-bar 块（t25 交接面原样保留）

## 1. diff 摘要

**1. 同域上/下一条（[...slug].astro front matter + 底部 nav）**
- 计算：`domainOrder = all.filter(chapter 相同).sort((a,b) => (a.weight ?? 0) - (b.weight ?? 0))`——与域页 `topic/[domain].astro:43` **同口径**（weight 升序差值排序；稳定排序 → 同 weight 并列保持集合序，两页并列顺序一致）。`domainIdx` 定位自身 → `domainPrev`/`domainNext`（首条无 prev、末条无 next）。
- 渲染：页面最底部（backlinks/sameDomain 两个 aside 之后）`<nav class="entry-nav" aria-label="同域序导航">`：`← 上一条：{主名}` + `下一条：{主名} →` + `↑ 回顶部`（#main，skip-link 同款目标）。chip 语言复用 `.chip`；标题截断 `split('：')[0]` 与路径 chip（t29）同口径。
- 与反链互斥逻辑**共存而非替代**（P-09 原文要求）：序导航（沿 weight 走）与同域相关块（按关联度挑，仅无反链时渲染）正交并存，121/122 条恢复同域横向移动。

**2. 回顶部**：entry-nav 内恒渲染（`↑ 回顶部` → `#main`）。

**3. U-6 纯 CSS 进度条（global.css + article 顶部 div）**
- 结构：`<div class="read-progress" aria-hidden="true"></div>`（装饰性，aria-hidden）。
- 基态（所有浏览器）：`position:fixed; top:0; left:0; right:0; height:3px; z-index:40; pointer-events:none`——无背景无动画 = 不可见（降级形态即「无进度条」，元素本身不产生视觉）。
- `@supports (animation-timeline: scroll())` 内：`background: var(--accent); transform: scaleX(0); transform-origin: left; animation: read-progress-grow linear both; animation-timeline: scroll(root)`——滚动驱动 0→100% 填充。
- **层级确认（任务书要求）**：z-40 > 页头 30 > nav-drop 29 > sticky 结论条/chips 20——贴顶 3px 细线覆盖页头顶缘 3px，`pointer-events:none` 不抢点击；fixed（viewport 坐标）与 sticky 层的 top 偏移体系（header-h/concl-h）互不干涉；skip-link z-100 仍在最上。
- **@supports 之外零 JS**：降级完全靠「基态无背景」实现，无任何脚本。
- **P-16 联动（有意行为）**：t17 的 reduced-motion 块 `animation/transform none !important` 对进度条同时生效 →「减少动态效果」用户看不到进度条（滚动驱动的进度线归入动态效果，符合 P-16 意图）。

**打印**：`.entry-nav`、`.read-progress` 加入打印隐藏清单（导航辅助/装饰，非内容）。

## 2. 排序口径说明

- 同域序 = chapter 内 weight 升序（`topic/[domain].astro:43` 同款比较器，逐字一致）；t14 层分组只重排显示分组、组内仍 weight 序，故序导航与域页列表的逐条顺序一致。
- build-proxy 全 122 条实测：122/122 条均能在自己域序中定位；chip 形态 **both=110 / prevOnly=6（各域首条）/ nextOnly=6（各域末条）/ neither=0**（最小域 06 域 7 条，无单条域——「neither」分支是防御性代码，当前数据下不触发）。
- 样例：`12386与投诉三通道` [04 域] ← 可转债 / → 证券纠纷调解与仲裁；`1637郁金香狂热…` [01 域] ← A股长期收益与回撤 / → 1720南海泡沫…

## 3. 降级行为说明（@supports 块）

| 环境 | 行为 |
|---|---|
| Chrome/Edge 115+（及任何通过 `@supports (animation-timeline: scroll())` 的浏览器，含未来 Safari） | 贴顶 3px accent 细线随滚动 0→100% 填充 |
| Safari（现版本）/ Firefox（现版本）等不支持者 | 元素在场但无背景/动画 → 观感上无进度条（优雅降级，不占布局空间，零 JS） |
| 系统「减少动态效果」开启 | reduced-motion 块置空 animation/transform → 进度条不显示（P-16 有意联动） |
| 打印 | `.read-progress` 在隐藏清单 → 不出现 |

## 4. 自检输出

1. build-proxy（复刻 front matter 逻辑，全 122 条）：122/122 定位成功；形态 110/6/6/0（§2）；域规模 01:21 02:39 03:29 04:10 05:16 06:7。
2. 类集合比对（AGENTS.md #9）：新类 2 个（.entry-nav/.read-progress）CSS 定义与模板输出双向在场；复用 .chip 既有——无悬空类。
3. 结构断言（python）：brace OK；progress fixed/top0/3px/z40/pointer-none ✓；@supports 门 + keyframes 在场 ✓；entry-nav 非 sticky ✓；打印清单含两新类 ✓；progress div aria-hidden ✓；`#main` 回顶 ✓；front matter 比较器与域页逐字一致 ✓；DOM 顺序 article<progress…entry-nav</Base> ✓；模板 0 `<script>` ✓。
4. `node scripts/check-content.mjs` → **exit 0**（122 条合规，既有警告与基线一致）。
5. `node scripts/check-compare.mjs` → **exit 0**（70 行 src 全解析；159 nums + 288 token 逐字命中）。
6. t31 交接面：concl-bar 块/t25 的 --concl-h 体系未触碰（本任务 hunk 仅 3 处新增 + 2 处 CSS 块 + 打印清单）。

## 5. 留目检项（并入验证任务目检清单，附录 A-7 升级）

1. **进度条支持/降级**（A-7）：Chrome/Edge 滚动长条目（如 1997 条 20+ 屏）看 3px 线填充；Safari/Firefox 确认「无进度条且不占空间、不露白条」；两主题下 accent 线可见性（深色主题 accent 对深色页头顶缘的对比）。
2. reduced-motion 开启后进度条消失、且其余动效行为不变（t17 联动）。
3. 同域 chip 观感：页面底部 `← 上一条/下一条/↑ 回顶部` 三 chip 行（长标题截断观感、窄屏换行）；首/末条各看一条（6+6 条）。
4. 回顶 chip 点击 → 平滑滚回 #main（A2 下 reduced-motion 用户为即时跳）。
5. 序导航与上方 backlinks/sameDomain aside 的间距（margin-top 2.2rem）观感。
6. 打印预览：entry-nav 与进度条均不出现。

## 6. 范围外记录

- U-6 02 原文提到「若 U-1 已做，此项收益递减」——任务书仍要求实现（可选三处之一，按任务书执行）；若验证任务目检后判收益不足，删除 = 删 1 div + 1 CSS 块，一行任务可回滚。
- 「同域上一/下一」的域间序（跨域上一条/下一条）不在 P2-C4 范围（任务书仅同域 weight 序）。
- 半角冒号 split 口径（同 t29 披露）：条目标题若以半角冒号分隔，chip 内显全名——与 t29 路径 chip 行为一致，留后续一行统一。
