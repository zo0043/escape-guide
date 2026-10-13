# t32 综合交付报告：Phase 2 全量回归 + 24 项逐条验收（final-delivery-phase2）

- 任务：t32 · 执行：synthesizer（attempt acb17864-e7d7-4add-bdc8-a843e7149bfe）· 时间：2026-10-13 11:50–12:30
- 全量日志：`docs/audit/20261012-impl/phase2-regression.log`（1245 行，命令原文 + 完整输出；下文行号均指该日志）
- 本任务产出文件（均在 `docs/audit/20261012-impl/`）：`phase2-regression.log`、`t32-accept.mjs`（24 项验收脚本，可重跑）、`t32-classset.mjs`（样式纪律脚本，可重跑）、本报告
- 约束遵守：只写上述 4 个文件（+ canary 备份 `docs/audit/tmp/t32-canary-{b3,c5}-backup.md`，任务书要求的 B3/C5 canary 之还原凭证）。唯一构建经 D1 shim。
- 前置阅读（任务书要求）：`phase0-delivery.md`（D1/Y1/Y2）、`final-delivery.md`（目检清单格式/环境遗留）已读并沿用其口径。
- 并发提示（队长）：t35 并行改 `scripts/check-content.mjs` 一条 fail 消息字符串（「spec:37-39 要求三段命名…」→ 内容化引用），原子写、两形态均合法——本次回归读到的是改后形态（闸门注释已内容化），未判红灯。

## 1. 总体判定

**24/24 全 PASS。回归基线 8 项全绿。canary 2/2 判红还原。无红灯项。**

- 红灯区：**无**（产品级失败 0）。
- 验收脚本经历 8 轮运行才收敛（§6→§6h）：4 次崩溃 + 4 次口径更正，**全部是 t32 脚本自身缺陷**（import 来源错 / pathHitsFor 签名 / Set API / 捕获组 / 压缩 CSS 形态 / 打印块换行断言 / A6 导航上下文边界 / B3 启发式窗口 / B4 同义措辞 / C1 卡窗口越界 / C4 抽样假设 / chapter 全名），逐一更正并记录于日志各节头部；源码/产物零改动，产物始终为 §3 同一构建。
- 已知误报 Y1/Y2 按任务书口径未计红灯：§4b t12-compare-verify 复核 PASS（L766：70/70 首列链接、sitemap 135 缺 0）。
- 唯一写操作 = 任务书要求的 2 个 canary（§7 B3 / §8b C5），均 备份→改→判红→还原→cmp 字节一致→闸门回归 exit 0；§8 首次尝试因文件名全/半角冒号失误全链零写入（已就地标注无效，§8b 重跑成立）。

## 2. 回归基线（8 项）

| # | 命令 | 结果 | 日志 |
|---|---|---|---|
| 1 | `node scripts/check-content.mjs` | exit 0，122 条合规，**6 条警告**（名单与 Phase 1 后逐字一致；B3 收紧后 checked 全过——被删的 A/B checked warning 原本 0 触发） | §1 L327–341（L330/L332） |
| 2 | `npm run check` | exit 0，守卫「70 行 src 全部可解析；159 nums + 288 token 全部逐字命中」+ keyFigure 新断言空跑（122 条 0 存量） | §2 L343–362（L359） |
| 3 | `npm run build`（经 D1 shim） | 成功，**136 页**（Phase 2 不新增页面：无新条目、无新静态页，与 Phase 1 同数） | §3 L364–546（L542） |
| 4 | `node docs/audit/tmp/audit-tech.mjs` | 0 死链、0 残留 `[[`；**8840 href**（Phase 1 基线 8452，+388；增量主体=同域上/下一 232 + 回顶 122 + 路径 chip 下一步 12/五步回链 3 + PATH 04 卡 4 步 + 404 推荐入口 2/chip 12，重点新链接全部解析：122 dir-item 锚点/#all/PATH 04 4 步/404 12 chip/about#来源规则）；C3 **447 token 0 漂移**；audit-tech 本版新增 **E. rss.xml 核对：坏链接 0、残留 [[ 0**（L740–742）；C4 严格正则 70/70=Y1、B2「多余 10」=Y2（§4b 覆盖）；C1「页查失败 3」=raw-lookup 遗留指标（非缺陷，同 Phase 1 Y3 口径） | §4 L548–768（L569/L574/L582/L584/L736） |
| 5 | 零 JS 不变式 | **136/136 html 全 0**，非零文件数 0（U-6 进度条纯 CSS @supports 实证：§6h C4 + 本报告 §2 行 6） | §5 L771–777 |
| 6 | 样式纪律 `t32-classset.mjs` | **PASS**：12 个 Phase 2 新类（.concl-bar/.cb-title/.cb-num/.cb-risk/.path-chips/.path-pos/.entry-nav/.read-progress/.nf-suggest×4）+ 24 个 Phase 1 延续重点类，CSS×页面双侧全在场；**`.concl*` 本次 5 类在场（U-1 已落地，Phase 1「必须缺席」口径随 P2 完成作废）**；悬空类 0（5 个 Shiki 钩子按机制豁免） | §9 L1193–1245 |
| 7 | B1 红线①：about 页 mod-* 清零 | about 页 mod- 命中 **0**（P-22 连坐隔离成立） | §5b L780–793 |
| 8 | B1 红线②：条目页五节 mod-* 122/122 不变 | 122/122 页五节核心（mod-howto/plain/gain/source/notes）在场：119 页×5 + 3 页×6（3 条业绩条目多 mod-perf 节，结构本就如此） | §5d L796–803（§5c 首跑为 grep 形态错误，就地更正重跑） |

## 3. 二十四项验收总表（U-1 + A1–A6 + B1–B6 + C1–C10）

证据行号指日志 §6h 终跑（L1004–1056）；canary 项引用 §7/§8b。

| # | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| U-1 | 结论条在场（完整/降级各抽 1 页）+ 639px 隐 cb-risk + 覆盖实数 | ✅ | concl-bar 覆盖 **122/122**；完整形态（cb-title+ev+cb-num+cb-risk）**41 条**（与数据侧四字段齐全 41 条一致，all-or-nothing）；降级 81 条；1997 样本 cb-num=−50.9%（正则提取）✓；CSS 639px 隐 .cb-risk ✓；`--concl-h:2.2rem` + `section-chips top:calc(var(--header-h) + var(--concl-h,0rem))` 双层 sticky 补偿 ✓ |
| A1 | A 级色统一 | ✅ | 产物 CSS 两处 ev-A 规则（.dir-ev.ev-A / .compare .ev-A）均 `var(--ok)`，accent 残留 0 |
| A2 | reduced-motion 块在场 | ✅ | `@media (prefers-reduced-motion:reduce)` 块 + scroll-behavior:auto + transition:none!important（压缩形态） |
| A3 | .dc-num 用 fg-dim | ✅ | `.dc-num{color:var(--fg-dim)}`（1.72:1→5.3:1） |
| A4 | 反链下划线 | ✅ | `.backlinks a{underline + text-decoration-color:var(--rule-strong)}`（与 .wl 同语言，覆盖反链+同域相关两容器） |
| A5 | 打印保留 quick-cards 2×2 | ✅ | 打印隐藏清单不含 .quick-cards；打印块内 `.quick-cards{grid-template-columns:repeat(2,1fr)}`；打印隐藏清单现 12 项（含 .concl-bar/.path-chips/.entry-nav/.read-progress 等 Phase 2 新增） |
| A6 | aria-current 在场 | ✅ | 全局 nav：首页 1（落 #all 目录，site-title 未标）、topic 页 1（落下拉对应域）、条目页/404 0；页内 chip 行（topic :163 / compare :105）另各标 1 处=另一导航上下文，与 compare 表页同款既有模式 |
| B1 | about h2 无 mod-* | ✅ | about 页 mod- 命中 0（§5b）；条目页 122/122 五节不变（§5d）；t20 的 122 条旧/新插件 HTML 逐字节一致为红线依据 |
| B2 | JSON-LD 注释已删 + 全站仍无 | ✅ | src+scripts「JSON-LD」0 命中；dist「ld+json」0 命中（与「未做实体补全」声明一致，队长裁定） |
| B3 | checked schema 必填 + 闸门 error（canary） | ✅ | schema `checked: z.coerce.date()` 无 .optional + 闸门 `if (!d.checked) fail('缺 checked…C 级也不例外')`；**canary（§7 L1058–1093）：删别追高 checked → 闸门 exit 1 精确报该条 → 还原 cmp 字节一致 → 回归 exit 0** |
| B4 | spec 例外节在场 + 两条登记 | ✅ | `docs/content-v2-spec.md` 总原则第 2 条子项：例外「真实数据复算型算例」+「已登记合规形态（2 条）」；巴菲特复利正文「（官方数字的复算，输入均为 2024 年度信逐字数字）」✓、大师业绩正文「（可复算：用巴菲特 2024/2025 股东信官方对比表复算 CAGR…）」✓（同义措辞，spec 允许）；两条条目 md 一行未动（t23 逐字比对 exit 0） |
| B5 | 悬空引用修正 | ✅ | audit-synthesis-20261012 / audit-t13-bare-url-tests 在 src+scripts 0 命中（改「未随仓库发布，规则原文已内联」，规则内容保留） |
| B6a/B6b | #all 链接 + CTA 文案/锚点 | ✅ | 首页 `id="all"` ✓；子页导航「目录」href=/escape-guide/#all ✓；hero CTA「来源规则（完整版）」→ about/#来源规则 ✓；about `h2 id="来源规则"` ✓ |
| C1 | PATH 04 4/4 步 + 「四种人」导语 | ✅ | steps 4/4 byTitle 解析（杀猪盘/查牌照/12386/调解仲裁）；首页导语「同一个市场，四种人该做的事完全不同」✓；第 4 卡 4 步链接全渲染；map 回链全页恰 3 处（PATH 01-03）+ p4 数据侧无 map 字段（t18 裁定） |
| C2 | 6 details 全开 + 122 dir-item id 零撞 + 域锚点 | ✅ | `<details class="dom-details" open>` 6/6；dir-item id 122 个零撞且=全部条目 slug（与 URL 逐字一致）；6 域 summary id（#域名 形状）✓ |
| C3 | 路径 chip 命中实数 + 三态抽样 | ✅ | pathHitsFor 命中 **16/122**（4×4 全唯一条目）=dist 渲染 16/16；抽样：先分清三种钱 PATH 01·1/4→下一步链✓、利弗莫尔错了就砍 2/4✓、看不懂的不碰 末步→「完整五步见投资体系地图」✓、调解不成怎么办→静态「路径走完」✓ |
| C4 | 同域 chip 对 + @supports 进度条 | ✅ | 数据侧 both=110/prevOnly=6/nextOnly=6/neither=0 ↔ dist 上一条 116/下一条 116 精确一致；回顶 122/122；域首条（先搞清楚）无上一条✓、域末条（投资体系地图）无下一条✓；`@supports(animation-timeline:scroll())` 在场 + 基态 .read-progress fixed/z40/无背景（降级态=不可见）✓ |
| C5 | keyFigure 断言 canary + fallback | ✅ | 闸门 keyFigure 三支断言在场；**canary（§8b L1144–1190）：合法支（50.9% 子串）→ exit 0；越界支（999.9% 非子串）→ exit 1 精确报「不是 keyNumber 的逐字子串」；还原 cmp 字节一致→回归 exit 0**（缺 keyNumber 支 t31 canary 已证）；存量 keyFigure 0/122，cb-num 走正则（1997=−50.9%） |
| C6 | 标签字号下限 | ✅ | 产物 CSS 89 处 font-size：<0.7rem **0 处**；<0.72rem 恰 1 处=`.ev-flag{font-size:.7rem}`（独立 override 行，minifier 去前导零形态）——全站功能文字最小 0.7rem |
| C7 | 404 chip 8-12 + 全解析 + 零 JS | ✅ | 「你是不是要找」区块在场；chip **12 个**（8-12 区间上沿），href 12/12 解码后全部存在；<script> 0；推荐入口行（别名索引+#all）在场 |
| C8 | 「等级说明：」只剩 C 级 | ✅ | 全库 **17 行/17 条，非 C 级使用 0**（t19 改前 19→17；17 处全 C 级：C1×1/C2×15/C3×1） |
| C9 | 三章域页注明渲染 | ✅ | 04 执行×10 / 05 执行×16 / 06 工具×7 注明在场（entry-crumb + layer-tag 四色，措辞与 content.config.ts layer 定义逐字一致）；01/02/03（多层域）0 处（与 chip/段头路径互斥） |
| C10 | rss pubDate 回退 + sitemap lastmod | ✅ | `rss.xml.js`：`e.data.date ?? e.data.checked ?? new Date()` ✓；dist rss.xml **122 个 pubDate**；sitemap-0.xml **135 个 lastmod**（构建时刻，静态站最近部署语义）；audit-tech E1 rss 坏链接 0 |

## 4. 改动文件 git diff --stat 汇总（按任务归属）

工作区未提交改动（Phase 0+1+2 累计）：**96 个 tracked 文件，+1185/−265**（日志 §0.2 L120–222）+ untracked `src/lib/paths.mjs`（t29 新增）、`scripts/check-compare.mjs`（t10，Phase 1）、`docs/audit/`。其中 77 个条目 md（Phase 1 的 76 + t19 首次改动的「怎么查一只指数或股票的当前估值与历史分位.md」），19 个非条目文件：

| 任务 | 文件 |
|---|---|
| Phase 1（t5–t15） | index.astro、[...slug].astro、compare/[table].astro、aliases.astro、topic/[domain].astro、Base.astro、about.md、global.css、compare.json、check-content.mjs（rule 21）、wikilinks.mjs、package.json/lock、404.astro（noindex/ico） |
| t17（A1–A6+B6a） | global.css（7 处 P2-A hunk：ev-A/reduced-motion/dc-num/backlinks/打印）、Base.astro（aria-current 计算块 + 6 链接 + #all） |
| t18（C1 PATH 04） | index.astro（PATHS 第 4 卡 + 「四种人」导语；后由 t29 迁至 paths.mjs） |
| t19（C8+C9） | 公告与财报…md、怎么查…估值…md（各 1 行标级改写）、topic/[domain].astro（+14 行 LAYER_GLOSS 注明） |
| t20（B1） | src/lib/headings.mjs（transformer 加 file 守卫，+14/−1） |
| t21（C6） | global.css（字号 10 处提至 ≥0.72rem + .ev-flag 0.7rem override + 14 处中文标签去 mono + 5 处 letter-spacing 减半） |
| t22（C2+B6b） | index.astro（6 details open + 122 dir-item id + 6 summary id + CTA 文案/锚点，4 处增量） |
| t23+t33+t34（B4） | docs/content-v2-spec.md（+2 行例外+登记）、about.md（算例行交叉引用 + 术语归一，各 1 行内） |
| t24（B2+B5） | content.config.ts、check-content.mjs（各 1 处 JSON-LD 注释删 + 4 处悬空引用改「未随仓库发布」） |
| t25（U-1） | [...slug].astro（.concl-bar 结构 + --concl-h 注入）、global.css（concl-bar/cb-* + 639px 隐 cb-risk + chips top 补偿 + 打印清单） |
| t26（B3） | content.config.ts（checked 必填 2 行）、check-content.mjs（warning→error 3 行） |
| t27（C7） | 404.astro（nf-suggest 构建期 chip 解析）、global.css（.nf-suggest 5 规则块） |
| t28（C10） | rss.xml.js（pubDate 回退）、astro.config.mjs（sitemap lastmod） |
| t29（C3） | **src/lib/paths.mjs（新增）**、index.astro（删本地 PATHS 改 import）、[...slug].astro（.path-chips 渲染） |
| t30（C4） | [...slug].astro（.entry-nav + .read-progress）、global.css（同域 chip + @supports 进度条 + 打印/隐藏清单） |
| t31（C5） | content.config.ts（keyFigure 可选）、check-content.mjs（三支断言）、[...slug].astro（keyFigure 消费 + t33 内容化引用） |
| t35（并行收尾） | check-content.mjs（1 条 fail 消息字符串内容化，队长提示的并行项，两形态均合法） |

> 归属依据各任务交付报告 + diff 注释自署；同文件多任务（global.css = t17+t21+t25+t27+t30、[...slug].astro = t25+t29+t30+t31、check-content.mjs = t24+t26+t31+t35）无法逐 hunk 切分，验收基于共享工作区当前状态。

## 5. 待浏览器目检清单（合并）

本机无 headless 浏览器。结构：Phase 1 遗留 27 项中本轮相关项（P2 已做→复验）+ 本轮新增。

**A 系列复验（final-report 附录 A 中本轮已落地项）**
- **A-5**（t21 后复验）：标签字号下限观感——速览卡徽章、layer-tag 与 A/B/C 徽章并排、hero-kicker、面包屑 part-label、移动卡片化列名宽度、对照表 thead 列名（t21 留目检 6 项；letter-spacing 减半的 5 处 CJK 标签观感）
- **A-7**（t30 后复验，升级）：U-6 进度条——Chrome/Edge 115+ 滚动时 3px accent 线增长、Safari/Firefox 降级为无（零 JS 不可见态）、深/浅主题 accent 线、reduced-motion 用户不显示（有意 a11y 行为）
- **A-8**（t22 后复验）：首页 6 域全展开后的长页面观感 + 点域名收起 + dir-item/域锚点 `#域名` 深链落位 + Ctrl+F 在 open details 下的检索（各内核）
- **A-9**（t25 后复验，升级为三层 sticky）：窄屏 sticky 总高度（header 3.6rem + 结论条 2.2rem + section-chips）对正文的挤压；20 屏外抬头可读；降级形态（无 cb-num/cb-risk）信息量是否过空；结论条双 border 与 quick-cards 相邻观感；639px 隐 cb-risk 后条形过空判断；锚点跳转 scroll-margin 落位；打印联动（.concl-bar 在打印隐藏清单）
- A-1/A-2/A-3/A-4（P0-4 移动端四断点/一屏速览/Ctrl+F/sticky 横滑）：Phase 1 遗留，本轮未涉及，仍待目检
- A-6（P-20 Linux CJK 字体回落）：**接受现状不实施**（见 §6 未做声明），CI 截图环境验证即可
- A-10（quick-cards 320px 大数字折行）：Phase 1 遗留，本轮 quick-cards 未改（仅打印规则），仍待目检

**本轮新增（实施报告留目检项）**
- t17（7 项）：A1 对照表 A 行绿 vs 目录徽章同绿（两主题）；A2 系统「减少动态效果」开/关行为差；A3 域卡 01–06 编号可读性（两主题）；A4 反链下划线 0.25em 偏移观感 + hover 变橙；A5 打印预览速览 4 卡 2×2（浏览器默认不印背景，卡底色大概率不印，白底微调留决策）；A6 DevTools/读屏器 aria-current 落点（首页目录/下拉对应项/无双标）；B6a 子页点「目录」直达 #all
- t19（1 项）：04/05/06 域页单层注明（entry-crumb 小字 + layer-tag）两主题观感
- t25（7 项）：见 A-9 升级（已并入）
- t27（2 项）：404 整体观感 + 12 chip 窄屏换行
- t29（6 项）：chip 行两宽度（320/1280）观感、与 sticky 层间距、半角冒号长标题 chip 宽度（与 index 同款既有行为）、三态各看一条、首页路径卡与改前 dist 应零差异、打印不出现
- t30（6 项）：见 A-7 升级（已并入）+ 同域 chip 首末条（无上一条/无下一条形态）、回顶平滑（reduced-motion 下瞬时）
- B1（1 项）：about 页 4 个 h2 无 howto 包裹观感（标题/层级与改前一致，仅去连坐类）

## 6. 未做事项声明

- **P-20 / C11 Linux 无 CJK 衬线字体回落**：接受现状（任务书口径），仅留 CI 截图环境验证
- **P2-B2 JSON-LD 实体补全**：队长裁定只做注释删除（假声明清理），实体补全留后续
- **P1-10 方案 B**（≤3KB 过滤框）：明确未做（方案 A 零 JS 跳格 Phase 1 已落地）
- **P2-C7 服务端模糊匹配**：未做（纯静态托管决策：只做「推荐别名页 + 高频俗称 chip」；迁带重写托管再做服务端方案——已写入 404.astro 注释与 t27 报告）
- **A5 打印态 quick-cards 白底**（bg-card 默认不印）：t17 范围外记录，留目检后决策
- **t31 遗留 :389 fail 消息字符串**（spec:37-39）：任务限定只动注释行，由 **t35 并行收尾**（队长提示；两形态均合法，本次回归读到改后形态）
- **404 301 重定向**：Phase 1 遗留（静态托管限制，t15）
- **N1 href 编码双形态收口**：Phase 1 信息项（1929 编码 + 4981 原始 CJK 并存，死链 0 证等效），Phase 2 未收口，可入后续
- **Phase 1 遗留目检项**（A-1/A-2/A-3/A-4/A-10 + t11/t14 各项）：待真实浏览器目检

## 7. 交付纪律自查

1. **每条断言有出处**：§2/§3 每项给出日志行号 + 产物路径/规则原文；数值（122/136/8840/447/41/81/16/110+6+6/116/12/17/135/136）全部来自可重跑命令实测输出。
2. **UI 渲染层判断全部标注留目检**：CSS/markup/结构级断言与浏览器渲染断言严格分开；后者全部进 §5，无一用「规则在场」冒充「渲染正确」。
3. **验收边界逐字引自上游**：24 项标准逐条取自任务书 §2 与 00-final-report §3 P2 全表；C8 的「17」引自 t19 交付报告的改前/改后计数表，C3 的「16」引自 t29 交付报告实数，C4 的分布引自 t30 build-proxy 实数——本次独立重算与上游一致。
4. **canary 写操作的边界**：任务书明文要求的 B3/C5 canary 是唯一改源操作；目标单条、备份→改→判红→还原→cmp 字节一致→闸门回归 0，全程命令原文在日志 §7/§8b；§8 无效尝试（文件名全/半角冒号）就地标注而非删除，其「零写入」有 FileNotFoundError + mtime + git 状态三重凭证。
5. **脚本 8 轮收敛留痕**：§6/6b/6c/6d/6e/6f/6g/6h 每轮头部写明崩溃/FAIL 根因与更正内容；A6 的「页内 chip 行 aria-current」边界解释（另一导航上下文，与 compare 表页同款既有模式）在证据中就地披露而非静默放宽。
6. **可重跑**：`t32-accept.mjs` / `t32-classset.mjs` / 日志全部命令原文可重放（canary 需人工确认无并发编辑后执行）。

## 8. 环境遗留

1. **D1（维持）**：本沙箱对非 shell 进程 rename(2) 系统拦截（EXDEV）——**Phase 2 后的任何 `npm run build` 仍需** `NODE_OPTIONS="--require $PWD/docs/audit/20261012-impl/rename-shim.cjs" npm run build`（CI/宿主无需）。
2. **Y1/Y2（维持）**：audit-tech.mjs C4 严格正则（row-anchor 误报 70/70）+ B2 顶层扫描盲区（嵌套页误报 10）；本版 audit-tech 新增 E. rss.xml 核对节（坏链接 0），C1「页查失败 3」raw-lookup 指标口径不变。
3. **N1（维持）**：href 编码双形态（1929 编码/4981 原始 CJK）——既有行为，死链 0 证功能等效，收口可入后续。
4. **t35 并行**：check-content.mjs 的 fail 消息字符串在验证窗口内被并行内容化（原子写），后续构建读到任一形态均合法。
5. **canary 备份**：`docs/audit/tmp/t32-canary-{b3,c5}-backup.md` 保留为还原凭证（与源文件 cmp 字节一致）。

## 9. 可重跑

```bash
# 本环境重建（D1 shim 必需）
NODE_OPTIONS="--require $PWD/docs/audit/20261012-impl/rename-shim.cjs" npm run build
# 二十四项验收（须在 build 后；只读）
node docs/audit/20261012-impl/t32-accept.mjs
# 样式纪律（须在 build 后；只读）
node docs/audit/20261012-impl/t32-classset.mjs
# Y1/Y2 覆盖
node docs/audit/20261012-impl/t12-compare-verify.mjs
# B3/C5 canary：见日志 §7/§8b 命令原文（需确认无并发编辑）
# 全量日志
cat docs/audit/20261012-impl/phase2-regression.log
```
