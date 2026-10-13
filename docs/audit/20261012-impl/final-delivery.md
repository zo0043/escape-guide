# t16 综合交付报告：Phase 0+1 全量回归 + 20 项逐条验收（final-delivery）

- 任务：t16 · 执行：synthesizer（attempt cebf8a70-c77f-43b6-8ca7-c9dd04a76105）· 时间：2026-10-13 00:30–01:30
- 全量日志：`docs/audit/20261012-impl/phase1-regression.log`（912 行，命令原文 + 完整输出；下文行号均指该日志）
- 本任务产出文件（均在 `docs/audit/20261012-impl/`）：`phase1-regression.log`、`t16-accept.mjs`（20 项验收脚本，可重跑）、`t16-classset.mjs`（样式纪律脚本，可重跑）、本报告
- 约束遵守：只写上述 4 个文件，未改任何源码。唯一构建经 D1 shim（见 §8 环境遗留）。
- 前置阅读（任务书要求）：`docs/audit/20261012-impl/phase0-delivery.md`（D1/Y1/Y2/并发状态）已读并沿用其口径。

## 1. 总体判定

**20/20 全 PASS。回归基线 6 项全绿。无红灯项。**

- 红灯区：**无**（产品级失败 0，无需队长协调的失败项）。
- 过程中的 4 次非绿（§6 脚本崩溃 / §7 Shiki 钩子误报 / §6b 3 项口径错 / §6c 1 项正则错）**全部是 t16 验收脚本自身缺陷**，逐一更正后终跑 20/20（§6d，L867–912）；更正记录在日志 §6b/§6c/§6d 头部，源码/产物零改动，产物始终为 §3 同一构建。
- 已知误报 Y1/Y2（audit-tech C4 严格正则 / B2 顶层扫描）按任务书口径**未计为红灯**，由 §4b（t12-compare-verify，L599–612）覆盖：70/70 行首列带链接、ev-flag 14=14、sitemap 135 `<loc>` 对 dist 缺 0。

## 2. 回归基线（6 项）

| # | 命令 | 结果 | 日志 |
|---|---|---|---|
| 1 | `node scripts/check-content.mjs` | exit 0，122 条合规，**6 条警告**（名单与 P0 后一致：马克斯:二级思维怎么赚钱/确认偏误/心理学研究的证据强度/哪些偏差真的会亏钱/修行七件事/买理财亏了） | §1 L307–321（L310/L312） |
| 2 | `npm run check`（= check-content + check-compare） | exit 0，**P1-15 守卫生效**：「70 行 src 全部可解析；159 个 nums + 288 个单元格数字 token 全部逐字命中源条目」 | §2 L323–342（L339） |
| 3 | `npm run build`（经 D1 shim） | 成功，**136 页**（=135 sitemap 页 + 404.html） | §3 L344–525（L520） |
| 4 | `node docs/audit/tmp/audit-tech.mjs` | 0 死链、0 残留字面 `[[`、0 缺 BASE 前缀；**8452 href**（≥6331 基线，增量=P1-9 导航下拉 + P1-10 别名组/chip + P1-12 行锚等）；C3 **447 数字 token 0 漂移**（445→447 为 P0-1 日期格「1998-08-17」→「1998 年 8 月 17 日」再分词预期变化，非漂移）；C1「页查失败 3」为 raw-lookup 遗留指标（页面查表已归一化，非缺陷，见 phase0-delivery Y3）；C4 严格正则 70/70 误报=Y1、B2「多余 10」=Y2（§4b 覆盖） | §4 L526–597（L547/L552/L554/L560/L562/L579） |
| 5 | 零 JS 不变式 `grep -rc '<script' dist --include='*.html'` | **136/136 个 html 全部 0**，非零文件数 0 | §5 L627–641（L635–639） |
| 6 | 样式纪律 `t16-classset.mjs`（CSS 类集合 vs 页面输出类集合，AGENTS.md #9） | **PASS**：23 个重点类（.layer-* 四色/.nav-drop*×6/.alias-*×8/.qc-more/.row-anchor 等）CSS 与页面均在场；**`.concl*` 两侧 0 个（U-1 结论条是 P2，确认未被顺手加上）**；悬空类 0（4 个 Shiki 集成钩子类按机制豁免，`.astro-code` 规则在场佐证） | §7b L765–805（结论 L801） |

## 3. 二十项验收总表（P0×4 + P1×16）

证据行号指 phase1-regression.log §6d 终跑（L867–912）；「日志」列同时给出基线证据位置。

| # | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| P0-1 | compare 3 行首列带 `<a>` + masters ev-flag 8 + 日期格逐字 | ✅ | §6d：3 行（LTCM@crashes/林奇麦哲伦@masters/索罗斯@masters）row-head 首列链接全命中；masters ev-flag=8；「1998 年 8 月 17 日俄罗斯违约」在 compare.json 且 C3 0 漂移（§4 L552）；70/70 全表口径 §4b L606 |
| P0-2 | 前景理论 disputed:true + 警告 6 条名单保持 | ✅ | §6d：disputed=true；其余 6 条 disputed 均 false；闸门 6 条名单 §1 L312 |
| P0-3 | PATHS 12/12 命中地图 wikilink 目标集 + 3/3 回链 + 区分句 | ✅ | §6d：dist 首页含「六域是内容地图、六环节是学习顺序」；12/12 + 3/3：§4c L614–624（t12-paths-check PASS，L622） |
| P0-4 | dist CSS `.site-nav` 含 `overflow-x:auto` | ✅ | §6d + §5 前基线 grep：`.site-nav{…overflow-x:auto…}`（浏览器四断点目检留人工，见 §5 目检清单 A-1） |
| P1-1 | 先问市场 layer=理念（矛盾消除）+ 怎么赚钱 入度≥1（孤岛消除） | ✅ | §6d：先问市场 layer=理念；孤岛「怎么赚钱」wikilink 入度=1（来源：钱从哪来——t6 唯一补链，0→1）；钱从哪来 md 层✓/dist 渲染✓（href 解码后比对，见 §8 注 N1） |
| P1-2 | 博格对双向链 | ✅ | §6d：大多数基金经理↔别试图跑赢 双向 md✓/dist✓ |
| P1-3 | 损失厌恶↔前景理论双向链 + description 书名号标注 | ✅ | §6d：双向 md✓；损失厌恶 description「动作侧…《前景理论…》」、前景理论「理论侧…《损失厌恶…》」（书名号纯文本=已裁定形态） |
| P1-4 | 投资体系地图 evidence=C + C2 等级说明句 | ✅ | §6d：evidence=C（B→C）；「等级说明：C2 民间共识无出处」在场 |
| P1-5 | about 模板与闸门逐字段一致（抽查 5 点） | ✅ | §6d：模板 layer 必填行✓/layer 四层定义表✓/闸门「layer 必填+四值枚举」断言✓/六段含算例（模板↔SECTION_ORDER）✓/节首「与闸门保持一致、以闸门为准」声明✓（about.md:20） |
| P1-6 | 别名 327→377 + 50 条半角别名可解析 + 「47」注释已修 | ✅ | §6d：dist/aliases `alias-chip-lead`=377；全角标题 50 条全部带半角别名且索引自解 50/50；「单押一个故事」title↔alias 对调✓；wikilinks.mjs:16 + table.astro:18 注释「50 个标题用半角/50 个全角」且无「47 个标题」残留 |
| P1-7 | 21 条「核对于 YYYY-MM-DD」grep 计数=21 | ✅ | §6d：21/21 条各命中≥1、合计恰 21（任务书口径）；全库「核对于 YYYY-MM-DD」实测 109 处/109 条（含既有基线），其中「；核对于」格式 22 处（21 追加 + 1 既同格式；既有 86 条基线的 2 处差异为前置字符形态不同，01-C-13 口径） |
| P1-8 | 12 条路径条目四字段齐全 + 3 超长字段≤限长 | ✅ | §6d：12/12×(lede/when/keyNumber/maxRisk) 0 缺失；2015到2016 when=38 字(≤40)；1997 keyNumber=114 字(≤114)且标志数「韩元 −50.9%」前置✓、compare 1997 行含 50.9 逐字✓（§2 守卫 447 token 0 漂移同证）；2007到2008 maxRisk=40 字(≤40) |
| P1-9 | dist 全局 nav 含六域入口（details.nav-drop + 六域四表链接） | ✅ | §6d：首页与子页（别追高）均 `details.nav-drop` 六域 6/6 + 四表 4/4（构建期渲染、Base.astro 全局） |
| P1-10 | 别名页 A–Z 组头存在 + 又称 chip 前置 + 零 `<script>` 保持 | ✅ | §6d：组头 h4 覆盖 6 域、字母 chip 锚悬空 0；377/377 行首子元素为 lead chip；`<script>`=0（§5 同证） |
| P1-11 | <640px 2×2 CSS 存在 + 超长 keyNumber details 渲染（1997 条） | ✅ | §6d：`.quick-cards` 基础 `repeat(2,1fr)`（≥1280 才 4 列）；1997 页 `<details class="qc-more">「完整口径」`在场 |
| P1-12 | mod-howto accent 上沿 + mod-notes bg-soft + `<tr id>` 行锚 70/70 零撞 | ✅ | §6d：CSS `.mod-howto{border-top:2px solid var(--accent)}`/`.mod-notes{background:var(--bg-soft)}`；4 表 `<tr id>` 总 70、去重 70 |
| P1-13 | 域页四段分组 + 三处 layer-tag 带色 class | ✅ | §6d：topic/02 段头 理念 19/执行 1/档案 19（马克斯改层后自洽，39=39）+ layer-jump chip 3；04/05/06 无段头（与改前同形）；首页目录/域页/条目头三处 `layer-tag layer-*`✓；四色 CSS✓ |
| P1-14 | package.json 含 yaml/unist-util-visit 显式声明 | ✅ | §6d：dependencies yaml=`^2.9.1`、unist-util-visit=`^5.1.0` |
| P1-15 | npm run check 含 check-compare | ✅ | §6d：check=`node scripts/check-content.mjs && node scripts/check-compare.mjs`；build=`npm run check && astro build`（§2 实证守卫已跑） |
| P1-16 | dist/404.html noindex,nofollow + 无自引用 canonical + ico 双 link | ✅ | §6d：404 robots=noindex,nofollow、无 canonical、ico 16+32+png 三 link；首页 canonical 保留（回归无伤） |

## 4. 改动文件 git diff --stat 汇总（按任务归属）

共享工作区当前未提交改动：**90 个 tracked 文件，+746/−189**（日志 §0.2 L112–208）+ untracked `scripts/check-compare.mjs`、`docs/audit/`、`.agent-teams/`。其中 76 个为 `src/content/escape/*.md` 条目文件（多任务并集，逐文件 diff 见日志），14 个非条目文件：

| 任务 | 文件 |
|---|---|
| P0-3（t5） | `src/pages/index.astro` |
| P0-2+P1-1/2/3/4（t6） | 7 个条目 md（前景理论/投资体系地图/马克斯×2/损失厌恶/钱从哪来/博格:大多数基金经理） |
| P0-1（t7） | `src/pages/compare/[table].astro`、`src/data/compare.json`、`scripts/check-content.mjs`（+50 规则 21） |
| P0-4（t8） | `src/styles/global.css`（.site-header/.site-nav/.site-title 部分） |
| P1-5（t9） | `src/content/pages/about.md` |
| P1-14+P1-15（t10） | `package.json`、`package-lock.json`、untracked `scripts/check-compare.mjs` |
| P1-9+P1-11+P1-12（t11） | `src/layouts/Base.astro`（+36）、`src/pages/[...slug].astro`（+27）、`src/pages/compare/[table].astro`（行锚 hunk）、`src/styles/global.css`（其余部分） |
| P1-6+P1-7+P1-8（t13） | 57 个条目 md（50 别名+21 核对句式+12 速览字段+3 压缩，多文件重叠）+ `src/lib/wikilinks.mjs`、`src/pages/compare/[table].astro`（注释 47→50） |
| P1-10+P1-13（t14） | `src/pages/aliases.astro`、`src/pages/topic/[domain].astro`（+65）、`src/styles/global.css`（四色/层分组部分）、`src/pages/index.astro` + `[...slug].astro`（layer-tag class 行） |
| P1-16（t15） | `src/layouts/Base.astro`（noindex prop + ico link）、`src/pages/404.astro` |

> 归属依据各任务交付报告 + diff 内注释（P1-9/11/12/13 注释自署）；并行工作区无法逐文件切分 hunk 级归属（同文件多任务：Base.astro=t11+t15、index.astro=t5+t14、[...slug].astro=t11+t14、global.css=t8+t11+t14、[table].astro=t7+t13+t11）。**验收结论基于共享工作区当前状态**，与各实施任务自检同口径。

## 5. 待浏览器目检清单（合并）

本机无 headless 浏览器，以下须在真实浏览器确认。A-1…A-10 为 final-report 附录 A 全部 10 项（其中 A-5/A-6/A-7/A-8/A-9 对应 P2 未做项，P2 实施后复验；本次 P0/P1 相关项标注了复验来源）：

**A 系列（附录 A 原文 10 项）**
1. **A-1** P-01 移动端导航 320/360/375/414px 确切断点与破损形态（**P0-4 修后复验**）——t8 报告 §4 细化 7 项：四断点无横向页面滚动/nav 单行不压塌；375px 首页首屏四入口+左滑露出余下；键盘 Tab 聚焦横滑区外链接的自动滚动；条目页双层 sticky 位置；深/浅主题 backdrop-blur；≥861px（861/1024/1280）布局像素一致；50%/200% 缩放不塌
2. **A-2** P-07 一屏速览在 667/844px/iPad/1280×1080 的确切高度（**P1-8/P1-11 修后复验**）——t11 报告 §6-2：典型条目 ≈650–720px；最坏条目改后 ≈890–910px（P1-8 已压缩 3 超长字段，最终判读在此目检）
3. **A-3** Ctrl+F 对 `details` 折叠内容的检索行为（各内核不一）——P-04 相关；另覆盖 P1-11「完整口径」details 的触屏点按展开手感（t11 §6-3）
4. **A-4** 641–1180px 横滑时 sticky 首列与 hover 行底色观感（**P1-12 未改该底色**，t11 §6-9 记录观感供 P2 决策）+ 行锚 `#` 点击后 scroll-margin 落位与 `#` 小字排版（t11 §6-10）
5. A-5 P-17 标签字号下限观感（**P2-C6 未做**，P2 实施后复验）
6. A-6 P-20 Linux 无 CJK 衬线字体回落（CI 截图环境）
7. A-7 U-6 `scroll-timeline` 进度条 Safari/Firefox 降级观感（**P2-C4 未做**）
8. A-8 U-7 首页全展开后长页面观感（**P2-C2 未做**）
9. A-9 U-1 结论条 + sticky chips 双层叠加窄屏 sticky 总高度观感（**P2 未做**；本次 classset 已证 `.concl*` 未在场）
10. **A-10** quick-cards 2×2 在 320px 超窄屏大数字折行/截断观感（**P1-11 修后复验**）——t11 §6-1（已预防性缩 1.3rem）

**实施报告新增项（附录 A 之外）**
- t11 §6（P1-9 新增 5 项）：桌面 hover「域与表」展开/收起与键盘 Tab 遍历 10 链接；触屏 375px 点按开合与 fixed 全宽条带定位；菜单与横滑 nav 叠加（横滑到最右触发器可点、展开不抖动）；深/浅主题菜单背景与 ▾/▴ 可见性；iOS Safari `position:fixed`+backdrop-filter 包含块定位
- t11 §6-11/12：五节观感（howto accent 2px 上沿 vs notes bg-soft 底块层次；notes 块内 h2/列表两主题）；打印样式（nav-drop-menu 隐藏、quick-cards 维持现状）
- t14 §6（9 项）：别名页 375/1280px chip 行换行与 chip 跳组 scroll-margin；俗称 pill 前置行观感（含 22 字最长 pill 320px 折行）；组头 h4+计数与域标题 h3 层级区分；深/浅主题 lead chip/dim 标题对比；`#` 组（01 域 50 条）滚动长度；02 域页（3 段）层直达 chip 与段头左条视觉键一致、点「档案 19」跳段落位；01/03 域页（2 段）同验、04/05/06 域页与改前逐字一致确认；三处 layer-tag 四色（首页目录小 pill/域页 meta 行/条目头，浅深两主题「档案=fg-dim」是否过弱）；同题双条目读条目头层色一眼可判
- t15：favicon 16/32px 位置显示（ico+PNG 双声明按 sizes 自选）

## 6. 未做事项声明

**Phase 2 全部未做**（按 00-final-report §7 排期在 Phase 2，共 20 项 P2 + 方案 B）：
- P2-A1…A6：A 级两色统一、prefers-reduced-motion、域卡编号对比度、底部反链下划线、打印保留 quick-cards、nav aria-current
- P2-B1…B6：about h2 连坐 mod-generic、JSON-LD 注释失实、checked 口径统一、2 条复算型算例 spec 例外、闸门注释引用缺失文件、首页目录自链
- P2-C1…C8：**PATH 04「我被骗了/我要投诉」**、首页全目录 U-7 深链、U-4 路径续接 chip、同域上/下一+回顶+U-6 进度条、P-11 keyFigure 字段、P-17 标签字号、P-15 404 推荐入口、C2 句式去污染
- **U-1 结论条**（P2，classset 已证未在场）；**P1-10 方案 B**（≤3KB 过滤框，本次落地方案 A 零 JS 跳格）；**404 301 重定向**（静态托管限制，t15 残留说明）

## 7. 交付纪律自查

1. **每条断言有出处**：§2/§3 每项均给出日志行号或 dist 路径 + grep 输出；数值（377/21/107/70/70/447/8452/136/6）全部来自可重跑命令的实测输出，未采用任何转述值。
2. **UI 渲染层判断全部标注留目检**：CSS/markup 级断言（类在场、规则在场、结构在场）与浏览器渲染断言严格分开——后者（断点观感/手势/打印/主题对比度）全部进 §5 清单，无一用「CSS 在场」冒充「渲染正确」。
3. **验收边界逐字引自上游**：20 项标准逐条取自任务书 §2 与 00-final-report §7 各 P 项验收行；未为迁就已完成工作调整任何边界。P1-1 的「孤岛对象」在核对 C-05 原文后按上游判定执行（孤岛=「怎么赚钱」人物档案，layer 改的是「先问市场」），§6b 首次检查的对象错置已在日志更正说明中就地划改。
4. **可重跑**：`t16-accept.mjs` / `t16-classset.mjs` / 日志内全部命令原文可重放；构建命令含 D1 shim 注入（见 §8）。

## 8. 环境遗留（供 Phase 2 构建参考）

1. **D1（必须）**：本沙箱对非 shell 进程 `rename(2)` 系统性拦截（EXDEV；node/python 复现、shell mv 不受影响、同设备号——完整诊断链见 phase0-delivery.md §7-D1）。**本环境任何 `npm run build` 必须**：
   `NODE_OPTIONS="--require $PWD/docs/audit/20261012-impl/rename-shim.cjs" npm run build`
   shim 仅当 rename 返回 EXDEV 时用 复制+删除 模拟，不改任何源文件；CI/宿主环境无需。
2. **Y1/Y2（脚本盲区，建议修订 audit-tech.mjs）**：C4 严格正则不认 P1-12 的 `<a class="row-anchor">`（70/70 误报）；B2 只扫顶层目录漏 compare/topic 嵌套页（10 条误报「多余」）。本次以 `t12-compare-verify.mjs` 覆盖。
3. **N1（信息项）href 编码双形态并存**：remark 表格格内 wikilink 的 href 为百分号编码（1929 条），模板生成的链接为原始 CJK（4981 条）——既有渲染行为（非本次引入），解码后全部可解析（D3 死链 0 已证），浏览器功能等效；如追求 HTML 源层一致性可在 P2 收口。
4. **N2（并发状态）**：验证窗口内工作区含全部 Phase 1 在制品并行落定（§4 归属表）；无其他临时文件残留（本次 90 文件 = 各任务声明之并集，无 123 条目式临时态）。
5. **audit-tech.mjs 副作用**：运行会覆写 `docs/audit/tmp/audit-tech-output.txt`（t3 脚本设计，任务书要求运行）。

## 9. 可重跑

```bash
# 本环境重建（D1 shim 必需）
NODE_OPTIONS="--require $PWD/docs/audit/20261012-impl/rename-shim.cjs" npm run build
# 二十项验收（须在 build 后）
node docs/audit/20261012-impl/t16-accept.mjs
# 样式纪律（须在 build 后）
node docs/audit/20261012-impl/t16-classset.mjs
# Y1/Y2 覆盖 + P0-3 比对
node docs/audit/20261012-impl/t12-compare-verify.mjs
node docs/audit/20261012-impl/t12-paths-check.mjs
# 全量日志
cat docs/audit/20261012-impl/phase1-regression.log
```
