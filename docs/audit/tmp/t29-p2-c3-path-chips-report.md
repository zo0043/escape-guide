# t29 交付报告 · P2-C3（U-4）：条目页路径进度 chip「PATH 0X · n/m → 下一步」

- 实施人：ux-analyst · attempt 38115301-b798-46d3-9332-c5ce0a7d5469
- 依据：00-final-report.md §3 P2-C3 行（:160）+ §5.4 + 02 报告 P-05（:58-61）/U-4（:205-209）
- 依赖：t18（PATH 04，4 路径×4 步）、t25（U-1 结论条，[...slug].astro 串行前序）
- 改动文件（4 个；本任务 hunk 以 `grep 'P2-C3'` 切分，与 Phase 0/1 已交付 hunk 并存）：
  - **新增 `src/lib/paths.mjs`**（~80 行：PATHS/MAP_TITLE 共享数据 + `pathHitsFor` 反查纯函数 + 唯一事实源约束头注释）
  - `src/pages/index.astro`——删除本地 MAP_TITLE/PATHS 块（-40 行），改 import 共享源（+5 行含注释）；`byTitle`/`makeEntryIndex`/渲染区**零改动**
  - `src/pages/[...slug].astro`——imports +3 行、front matter 路径反查 +19 行、markup 路径 chip 行 +20 行
  - `src/styles/global.css`——`.path-chips`/`.path-pos` 块 +19 行、打印隐藏清单 +1 选择器
- 零 `<script>` 不变式：保持（两 astro 文件 grep = 0）；未跑 build、未 commit/push

## 1. PATHS 共享化改法说明

**提取方式（最小改动）**：只把数据常量（`MAP_TITLE` + `PATHS` 4 对象）从 index.astro 原样移入 `src/lib/paths.mjs`（纯 .mjs，无 astro 依赖，头注释完整迁移 P0-3 唯一事实源约束 + t18 的 PATH 04 无 map 回链裁定）。index.astro 的 `byTitle`/`makeEntryIndex`/路径卡渲染区**一行未动**——「引用不存在标题构建即 throw」的 fail-loud 语义原封不动（byTitle 仍是 index.astro 的渲染引用点，逐字校验全部 16 步骤标题 + 3 map 标题）。

**[...slug].astro 消费**：`pathHitsFor(entryId, entryIndex, normalizeKey)` 纯函数反查（lib 内实现，吃 `makeEntryIndex` 产物）——匹配是**查表不是引用**，命中即渲染。步骤标题缺失时同一次构建里 index.astro 的 byTitle 先 throw，故反查侧无静默漏链路径（lib 注释已写明该依赖关系）。条目形状兼容：`makeEntryIndex` 本就同吃集合条目/归一化条目两种形状（entries.mjs:104-108），[...slug].astro 用既有 `all`（normalizeCollection 产物）建索引，零额外集合加载。

## 2. 命中条目实数与渲染形态（build-proxy 全 122 条，直接 import 真实 paths.mjs 执行）

- **命中 16/122**（与任务书预估「16 条左右」一致；4 路径×4 步全部唯一条目，无一条目多路径命中）
- index.astro 渲染引用全校验：**20/20 HIT**（16 步骤 + 3 map + 域导语 MAP_TITLE），构建期零 throw
- chip 形态分布：**「下一步」链接 12** + **「完整五步见投资体系地图」回链 3**（PATH 01-03 末步）+ **静态「路径走完」1**（PATH 04 末步「证券纠纷调解与仲裁」——t18 裁定该路径无 map 回链，不用任务书原文的「完整五步」措辞，避免挂不存在的五步纵深）
- 抽样（全 16 条见自检日志）：`先分清三种钱…` PATH 01 1/4 → 下一步：泡沫的共同结构；`凯利公式…` PATH 03 3/4 → 下一步：查历史数据:中证指数与FRED怎么用；`如果今天空仓…` PATH 02 4/4 → 完整五步见投资体系地图…

**披露**：下一步/map 标题与 index.astro 路径卡同口径 `split('：')[0]`（全角冒号）；半角冒号标题（「查历史数据:…」「投资体系地图:…」）截不动、chip 内显全名——index 侧同款既有行为，两页观感一致，不在本任务改（一行内可后续统一两页同时改）。

## 3. diff 摘要

1. **paths.mjs**：`MAP_TITLE`/`PATHS`（原 index.astro:58-87 原样迁移）+ `pathHitsFor()` 返回 `[{num, step, total, next, map}]`（next/map 为条目对象，末步 next=null，无 map 路径 map=null）。
2. **index.astro**：`import { MAP_TITLE, PATHS } from '../lib/paths.mjs'`；本地块换成 3 行注释（指向 lib 头注释）。
3. **[...slug].astro**：
   - front matter：`pathEntryIndex = makeEntryIndex(all)` + `pathChips = pathHitsFor(entry.id, …).map(…)`（nextSlug/nextTitle/mapSlug/mapTitle，标题截断同 index 口径）；
   - markup：速览卡 `</div>` 之后、`<nav class="section-chips">` 之前插入 `pathChips.length > 0 && <nav class="path-chips" aria-label="路径进度">`——每命中渲染 `<span class="path-pos">PATH 0X · n/m</span>` + `<a class="chip">下一步：{主名}</a>` / `<a class="chip">完整五步见{主名}</a>` / `<span class="chip chip-static">路径走完</span>` 三态之一；未命中不渲染。
4. **global.css**：`.path-chips { display:flex; flex-wrap:wrap; gap:0.45rem; margin: 0.9rem 0 0.6rem }`（**普通流非 sticky**——与 sticky 结论条/页内 chips 无叠压，窄屏随文档换行）+ `.path-pos`（mono 0.72rem Latin+数字标签，P2-C6 口径）；打印隐藏清单加 `.path-chips`（导航辅助非内容，与 .section-chips 同处理）。

## 4. 自检输出

1. `node --check src/lib/paths.mjs` → 语法过。
2. build-proxy（node ESM 直接 import 真实 paths.mjs/entries.mjs/slug.mjs 执行，非复刻）：
   - index.astro byTitle 引用 20/20 HIT；
   - 命中 16/122；各路径 4/4 步全命中；形态 next=12 / map=3 / end=1（§2）。
3. 类集合比对（AGENTS.md #9）：新类 2 个（.path-chips/.path-pos）CSS 定义与模板输出双向在场；复用类 .chip/.chip-static CSS 既有——无悬空类。
4. 结构断言（python）：brace OK；path-chips 非 sticky ✓ 可换行 ✓；DOM 顺序 quick-cards < path-chips < section-chips ✓；index 本地块已删、import 在场、byTitle/PATHS 渲染/MAP_TITLE 引用全在场 ✓；两 astro 文件 0 `<script>` ✓。
5. `node scripts/check-content.mjs` → **exit 0**（122 条合规，既有警告与基线一致）。
6. `node scripts/check-compare.mjs` → **exit 0**（70 行 src 全解析；159 nums + 288 token 逐字命中）。

## 5. 留目检项（并入验证任务目检清单）

1. 桌面/窄屏 chip 行观感：`.path-pos`（mono 灰）+ `.chip`（pill）+ 下一行长条（「下一步：买入之前先写下「错了怎么办」」约 17 字，窄屏 ≤360px 会换行两行——flex-wrap 已留位）。
2. 与上方 quick-cards（下边距 0）/下方 sticky section-chips 的间距（0.9rem/0.6rem 实测观感）；滚动时 chips 上移后与 chip 行的相对位置。
3. 半角冒号长标题 chip（「下一步：查历史数据:中证指数与FRED怎么用」「完整五步见投资体系地图:六个环节与你的入口」）的实际宽度——若过宽，两页同时改 split 口径（一行）。
4. 16 条命中条目各看一条（四路径末步三态各一：`如果今天空仓…`→map 回链、`证券纠纷调解与仲裁…`→「路径走完」、`先分清三种钱…`→下一步）。
5. 首页路径卡（消费共享源后）与改动前 dist 逐字比对——应零差异（数据原样迁移，渲染区未动）。
6. 打印预览：chip 行不出现（与 .section-chips/.concl-bar 同清单）。

## 6. 范围外记录

- t30（[...slug].astro 串行后续）接手时基于本任务后最新文件；本任务未动反链/同域/序导航逻辑。
- 半角/全角冒号 split 口径统一（index + slug 两页同改）留后续一行任务。
- U-4 的另一半「howto 四段进度化」（02-U-4 改 headings.mjs 的部分）不在 P2-C3 范围（任务书仅路径串联 chip 行）。
