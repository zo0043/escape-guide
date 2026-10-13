# t14 交付报告 · P1-10 方案 A：别名拼音跳格 + P1-13：域页 layer 分组四色

- 实施人：ux-analyst · attempt f0e05390-7677-4cdb-b9dc-2274a408d6b7
- 依据：00-final-report.md §5.2（U-2 方案 A）/§5.3（U-3）/§7 第 15/19 步；02 报告 P-12/P-14/U-2/U-3
- 改动文件（全部在范围内，未动 package.json——零新依赖）：
  - `src/pages/aliases.astro`（+126/−34 行，P1-10 主改）
  - `src/pages/topic/[domain].astro`（+49/−16 行，P1-13 主改）
  - `src/pages/index.astro`（+4/−1 行，layer-tag 加 class 一行）
  - `src/pages/[...slug].astro`（+1/−1 行，layer-tag 加 class 一行）
  - `src/styles/global.css`（t14 约 +85/−3 行：别名跳格块 + layer 四色块）
- 零 `<script>` 不变式：保持（5 文件 grep `<script>` 全 0；两项均纯 CSS/构建期渲染）
- 未运行 `npm run build`（v1 统一构建）；dist 级验证钩子见 §5

**数据基线说明**：动手时 t13（P1-6 半角别名）已落入工作区——别名 327→**377**。全部计数在实现里动态计算（不写死），映射表按「落地时 122 标题 ∪ 377 别名」的首字并集（172 字）制作并 100% 覆盖验证。

---

## 1. 两项各自 diff 摘要

### 1.1 P1-10 · 别名拼音跳格（`aliases.astro` + `global.css`）

**aliases.astro**：
- front matter 新增 `PYINIT` 静态映射表（172 个汉字→A–Z，内联在文件内、不进运行时、零依赖）+ `aliasGroup(a)` 归组函数（数字开头→`#`；拉丁→大写；CJK→查表；**未收录首字→构建期 `console.warn` 并落 `#` 组，不静默吞**）。
- 分组逻辑重写：域内把「条目×别名」摊平成行（**一个别名叫一个组**——条目有多个别名就出现在多个组，俗称成为一等目扫单元），组按 A–Z、`#` 殿后；组内按别名 `localeCompare('zh')`（ICU 中文序=拼音序，与跳格一致）。
- 渲染：域标题（h3，不变）下新增 `<nav class="alias-gchips">` 字母 chip 行（只渲染该域实际存在的组）+ 每组 `<h4 class="alias-ghead" id={gr.id}>` 组头（带计数 `<span class="alias-gcount">`）+ 组内 `<ul class="alias-list">`。
- 行结构按 02-P-12 修法③重排：`<a class="alias-chip alias-chip-lead">俗称</a>` 前置（加粗提色）+ `<a class="alias-entry-dim">正式标题</a>` 降为 0.78rem 小字；旧「又称」kicker span 删除（俗称在前后语义自明）。
- **两处有意的规格偏离**（均为规格简写不可直接实现）：
  1. 组头用 **h4** 而非规格写的 h3——域标题已是 h3，组头再用 h3 会让首字母组与域同级、破坏大纲层级（a11y）。
  2. 组 id 用 **`g-{域编号}-{字母}`**（`#` 组写作 `g-{域编号}-other`，避免 `#` 进 URL fragment）——规格的裸 `g-x` 在 6 个域各有一个 A 组时会撞 id（每域独立 chip 行各指各的组）。

**global.css**（别名块，~30 行）：`.alias-gchips`（flex wrap chip 行）/`.alias-gchip`（mono 小字）/`.alias-ghead`（mono 组头 + 下划发丝线 + `scroll-margin-top: calc(var(--header-h) + 0.5rem)` 防 sticky 页头盖住）/`.alias-gcount`；`.alias-chip-lead`（fg + 600 + **`white-space:normal`**——最长 22 字 CJK 别名在 320px 下允许折两行而非撑破页宽；不加字号，0.76rem 基础上仅加粗提色）；`.alias-entry-dim`（0.78rem fg-dim 小字，hover accent 下划线）。**删除**旧 `.alias-entry`/`.alias-entry:hover`/`.alias-kicker` 三条规则（页面不再渲染，类集合纪律，§3）。

**归组实测**（build-proxy 直接解析 shipped 文件的 PYINIT，非副本）：
- 覆盖：172/172 表项；377 别名 ∪ 122 标题首字 **100% 命中，0 warn**。
- 每域组数：**01→21 组**（A–Y+#，#=50 为最大组，股灾条目年份/点位别名多）、**02→21**、**03→19**、**04→14**、**05→12**、**06→9**；全站最大组 #=51、B=31、J=24、S=23、X=22。
- 组 id 页面级唯一（每域每字母一组，构造上唯一）。

### 1.2 P1-13 · 域页 layer 分组 + 四色（`topic/[domain].astro` + `global.css` + 两行 layer-tag）

**topic/[domain].astro**：
- front matter 新增 `layerGroups`：`['理念','执行','档案','工具']` 依次过滤本域条目（段内保持 weight 序），只留非空段。
- ENTRIES 节：`layerGroups.length > 1` 时渲染「层直达」chip 行（`<nav class="topic-nav layer-jump">`，`<span class="chip chip-static">层</span>` + 每段 `<a class="chip layer-X">X N</a>` 指向 `#layer-X`）+ 每段 `<h3 class="topic-layer-head layer-X" id="layer-X">X · N 条</h3>` 段头 + 独立 `<ul class="topic-list">`。
- **单段域退化**：04（执行 10）/05（执行 16）/06（工具 7）只有一个层——不渲染 chip 行与段头（无信息量），markup 与改前逐字一致（回归安全）。
- meta 行 layer-tag 加 class（`layer-tag layer-X`）。
- 前置确认：122/122 条目均有 layer 字段（无漏段风险）；t6 已修马克斯 pair 矛盾（档案→理念），四色不固化数据矛盾。

**index.astro / [...slug].astro**：各一行——layer-tag 渲染处加 `layer-${layer}` class（index.astro 为 t5 改动后的最新行位 219；[...slug].astro 为 t11 改动后的最新行位 114）。

**global.css**（layer 块，~55 行）：
- `.layer-理念/.layer-执行/.layer-档案/.layer-工具` 四色经 **CSS 自定义属性 `--layer-c`** 挂在元素上（理念=accent 橙 / 执行=ok 绿 / 档案=fg-dim 灰 / 工具=warn 黄）；
- 三个消费处各自克制：**layer-tag**（三处共用）→ 边框+文字取层色；**层直达 chip** → 文字取层色 + `::before` 小圆点（0.5rem，层色）；**段标题** → 左侧 3px 层色条 + 衬线 1.28rem + 锚点偏移。全部小元素，无大色块（杂志风克制达标）。
- `.layer-jump { margin-top: 1.1rem }`。

**layer 分布实测**：01 档案18+理念3（2 段）、02 档案19+执行1+理念19（3 段）、03 理念21+执行8（2 段）、04/05/06 单段退化。

---

## 2. 拼音归组实现说明（映射表 vs 库）

**选型：预计算静态映射表（内联 aliases.astro），零新依赖**——队长裁定优先项，且对本数据集是精确解而非妥协：

| 维度 | 静态表（采用） | build-only 拼音库 |
|---|---|---|
| 依赖 | 0 | +1（pinyin-pro 类 ~MB 级 + 数据文件）；lockfile 刚被 t10 动过 |
| 精确性 | 对 172 字是**精确**的（全常用字，逐字核对） | 同样查内嵌字典，无额外精度 |
| 可审性 | 表在源码里，diff 可逐字审 | 映射藏在依赖里 |
| 运行时 | 0 JS（表仅构建期用） | 同样 0 JS |
| 残留风险 | 每字只能记一个首字母（多音字）；新字需补表 | 字典更新随库版本，但同样需兜底策略 |

**验证深度**（build-proxy 直接解析 shipped 文件，非手抄副本）：
1. 表完整性：正则从 `aliases.astro` 提取 172 项，数量与首字并集一致；
2. 覆盖率：377 别名 ∪ 122 标题首字 100% 命中，0 warn；
3. **多音字逐词读音核对**——查出并修正两处错误映射：`调` 初稿取 D（diào），但数据中唯一用法是「**调解**」tiáo→改 T；`长` 初稿取 Z（zhǎng），但数据中用法是「**长期**」cháng→改 C。另核对 大（dà）/空（kōng/kòng）/行（xíng/háng）/结（jié/jiē）——多读音但首字母相同，无误。**这正是静态表方案的主要风险形态，靠数据驱动核对兜住**；
4. 归组正确性：每域 A–Z+# 组数、最大组、id 唯一性全部实测（§1.1）。

**残留风险（已记录，接受）**：静态表每字一读音——若未来数据引入「调查」（diào→D）或「增长」（zhǎng→Z），该字会按现表读音归组（静默错组，不会 warn，因为字在表内）。对策：文件注释已写明「需人工改表」；t13 后续批次落地后建议复跑一次首字覆盖检查（一行 node 脚本，报告 §5 给出）。若未来多音字冲突变多，再评估 build-only 库不迟。

**兜底策略**：表外新字 → `console.warn('[aliases.astro] P1-10：首字「X」…已落入 # 组——请补 PYINIT 表')` + 归 `#` 组——符合站点 fail-loud 文化（不静默吞），页面仍可构建可访问。

## 3. 四色 class 与模板渲染一致性自查（CSS 类集合 vs 页面输出类集合）

新增 CSS 类 12 个，双向比对（python 正则 + 模板字面量，脚本输出见 §4）：

| 类 | CSS | 模板 | 渲染范围 |
|---|---|---|---|
| `.alias-gchips` / `.alias-gchip` | ✅ | ✅ aliases.astro | 6 域 chip 行（每域仅实际存在的组） |
| `.alias-ghead` / `.alias-gcount` | ✅ | ✅ | 每域每组（21/21/19/14/12/9 组） |
| `.alias-chip-lead` | ✅ | ✅ | 377 个别名行 |
| `.alias-entry-dim` | ✅ | ✅ | 377 行 |
| `.layer-理念/执行/档案/工具` | ✅ | ✅ | 三处 layer-tag（122+122+122 次出现）+ 域页层 chip/段头 |
| `.topic-layer-head` / `.layer-jump` | ✅ | ✅ | 01/02/03 域页（单段域不渲染） |

**删除类**：`.alias-entry`、`.alias-kicker`（+`:hover`）CSS 规则已删，模板同步不再渲染——双向 false（无悬空规则、无失样式元素）。
**已知既有行为（非本次引入，记录备查）**：print 媒体查询本就隐藏 `.alias-chip`（global.css 既有规则）——lead chip 带 `.alias-chip` 类，打印时别名页只留小字标题链接 + 组头 + A 级节，与改前打印形态一致（chip 不印）。

## 4. 自检输出

1. `node scripts/check-content.mjs` → **exit 0**（122 条合规，6 条既有 disputed 警告与 t6 后基线一致）。
2. `node scripts/check-compare.mjs` → **exit 0**（70 行 src 全解析；159 nums + 288 token 逐字命中）。
3. CSS 花括号配平：OK。
4. 5 个改动文件 `grep -c '<script>'`：全 0——零 JS 不变式保持（dist 级复验钩子 §5）。
5. 类集合比对：新增 12/12 双向命中；删除 2/2 双向 false（§3）。
6. 拼音 build-proxy（解析 shipped PYINIT）：172 表项；377∪122 首字 100% 覆盖 0 warn；调→T、长→C 修正后「调解不成怎么办→T」「长期资本管理公司破产→C」「长期持有→C」逐条验证；每域组数 21/21/19/14/12/9。
7. layer 数据：122/122 有 layer；域段分布 2/3/2/1/1/1（§1.2）。

## 5. v1 构建后 dist 级验证钩子（本次禁 build，留 v1）

```
grep -c 'alias-ghead' dist/aliases/index.html          # =96（6 域组数之和）
grep -o 'id="g-0[1-6]-[a-z]*"' dist/aliases/index.html | sort -u | wc -l   # =96（组 id 唯一）
grep -c 'alias-chip-lead' dist/aliases/index.html       # =377（每个别名叫一行）
grep -c 'topic-layer-head' dist/topic/02/index.html     # =3（理念/执行/档案三段头）
grep -c 'topic-layer-head' dist/topic/04/index.html     # =0（单段退化）
grep -c 'layer-jump' dist/topic/03/index.html           # =1
grep -c 'layer-tag layer-' dist/index.html              # ≥122（目录全量）
grep -o 'layer-档案{[^}]*' dist/_astro/*.css            # 四色自定义属性在构建产物
```
（组数/377 等数字基于落地时数据；v1 若数据有变以构建期日志为准。）

## 6. 留浏览器目检清单（本机无 headless 浏览器）

**P1-10**
1. 别名页 375px/1280px：字母 chip 行换行观感（01 域 21 个 chip）；点 chip 跳组后组头不被 sticky 页头盖住（scroll-margin 生效）。
2. 行观感：俗称 pill（加粗）+ 右侧小字标题——目扫效率是否成立；最长 22 字 CJK 别名 pill（如「假冒券商 App 与钓鱼链接:账户与出金安全」）在 320px 折两行的形态是否可接受（`white-space:normal` 预期折行不撑破）。
3. 组头 h4 + 计数（如「B 14」）的字号层级：与域标题 h3 的区分度。
4. 深/浅两主题：lead chip 提色（fg）与 dim 标题（fg-dim）对比。
5. `#` 组（01 域 50 条，最大组）滚动长度观感——若目检判过长，P2 可再按年份二分组（不在本次范围）。

**P1-13**
6. 02 域页（3 段）：层直达 chip 行（圆点+层色文字）与段头左条的视觉键是否一致可辨；点「档案 19」跳段落位。
7. 01/03 域页（2 段）同验；04/05/06 域页确认**与改前逐字一致**（无 chip 行、无段头）。
8. 三处 layer-tag 四色：首页目录（dir-link 内，0.68rem 小 pill）/域页 meta 行/条目头——浅/深两主题下「档案=fg-dim」是否过弱（预期最弱但可辨，若目检判不可辨，P2 可给档案 tag 加底色）。
9. 同题双条目场景（摊平三件套：理念 vs 执行）：读条目头时层色是否一眼可判「我在读原理还是读动作」（U-3 的核心收益点）。

## 7. 范围外记录（供后续任务）

- `#` 组过大（01 域 50 条，全站 51 条数字开头别名）：股灾年份/点位别名天然数字开头；若目检判检索体验不佳，P2 可把 `#` 组按「年份 vs 点位」二分（纯构建期，零 JS）。
- 拼音表复跑建议：t13 后续批次或任何别名批量改动后，跑一遍「首字 ∪ 表」差集检查（一行脚本，同 §2 方法），有差集即补表。
- 别名页打印形态（chip 不印，仅小字标题链接）为既有行为；若 P2-A 类打印优化启动，可一并评估 lead chip 是否印出。
