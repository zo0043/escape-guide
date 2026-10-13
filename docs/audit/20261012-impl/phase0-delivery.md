# t12 Phase 0 交付报告：回归基线 + 四项 P0 验收（phase0-delivery）

- 任务：t12 · 执行：synthesizer（attempt 400af05d-dada-4f5a-9813-e37903ac7d87）· 时间：2026-10-13 00:00–00:20
- 全量日志：`docs/audit/20261012-impl/phase0-regression.log`（562 行，命令原文 + 完整输出；下文行号均指该日志）
- 本任务辅助文件（均在 `docs/audit/20261012-impl/`，可重跑）：
  - `t12-paths-check.mjs`——P0-3 验收比对脚本（只读 src/dist）
  - `t12-compare-verify.mjs`——对照表首列链接/sitemap 补充核对（修正 t3 脚本两处检测盲区，见 Y1/Y2）
  - `rename-shim.cjs`——沙箱兼容 shim（仅当 rename 返回 EXDEV 时用 复制+删除 模拟；见偏离 D1）
- 约束遵守：只写了上述 3 个脚本 + 本日志 + 本报告，共 5 个文件，全部在 `docs/audit/20261012-impl/`；未修改 `src/`、`scripts/`、`package.json`、`node_modules/` 等任何源文件。
  - 两处任务书内命令的固有副作用（如实记录）：① `npm run build`（任务书步骤 2 要求）重建了 `dist/`（构建产物，非源码）；② `node docs/audit/tmp/audit-tech.mjs`（任务书步骤 3 要求）按 t3 脚本第 226 行设计覆写了 `docs/audit/tmp/audit-tech-output.txt`（其自身日志文件，仍在 docs/audit/ 内）。

## 1. 总体判定

**P0×4 全部验收绿。无红灯项**（产品级失败 0）。
另有 1 项构建环境偏离（D1：沙箱拦截非 shell 进程 rename，需 shim）与 2 项 t3 审计脚本检测盲区（Y1/Y2：已用补充脚本 PASS 覆盖），均不改变验收结论，详见 §7。

## 2. P0×4 逐项验收表

| P0 | 任务书验收标准 | 结果 | 证据（日志行号/段） |
|---|---|---|---|
| **P0-1**（t7）compare 表 normalizeKey 修复 + 日期逐字 + 闸门断言 | compare 3 行（LTCM/林奇麦哲伦13/索罗斯1992）首列带 `<a>`；masters 页 ev-flag 7→8；数字 token 0 漂移（1998 年 8 月 17 日逐字命中）；href 0 死链；0 残留字面 `[[` | ✅ 全过 | §3 L450–482 + §3a L520–536（明细见 §2.1） |
| **P0-2**（t6）证据定级与近重复精修（5 条目） | 闸门 exit 0、122 条合规、警告 7→6（仅前景理论消失，其余 6 条名单不变） | ✅ 全过 | §1 L119–130（明细见 §2.2） |
| **P0-3**（t5）首页 PATHS 以地图为唯一事实源 | dist 首页 PATHS 12+3 标题链接 ⊆「投资体系地图」wikilink 目标集合（12/12 命中） | ✅ 全过 | §4 L541–552（明细见 §2.3） |
| **P0-4**（t8）移动端页头导航修复 | dist CSS `.site-nav` 含 `overflow-x:auto`（浏览器四断点目检留人工） | ✅ CSS 级过 | §5 L557、L562（目检清单见 §5） |

### 2.1 P0-1 明细

- **ev-flag 7→8 及全表核对**（audit-tech C4，L456–459）：crashes 期望 1 实际 1；**masters 期望 8 实际 8**（修复前为 7）；biases 4=4；philosophy 1=1。
- **3 行首列失链恢复**：t3 脚本 C4 严格正则对本构建 70/70 行误报（见 Y1——P1-12 在制品改了 row-head 标记）；补充脚本前缀口径 **70/70 行首列带链接**（§3a L533），LTCM/林奇麦哲伦/索罗斯 3 行在其中。
- **数字 token 0 漂移**（C3，L455）：447 个 token、0 未命中。447 ≠ 445 是日期格改写的预期再分词：旧格「1998-08-17 俄罗斯违约」1 个 token（且未命中），新格「1998 年 8 月 17 日俄罗斯违约」3 个 token（1998/8/17，全部逐字命中源条目 `LTCM：诺奖得主们是怎么一起破产的.md:27`）。445 − 1 + 3 = 447。
- **死链/残留**（D 节，L463–482）：136 个 html、7773 个 href（≥6331 基线；增量来自 t5 回链 +3、t7 恢复行链 +3、P1-9 导航下拉 10 链×全页、P1-12 行锚 70+ 等）、站内死链 0、缺 BASE 前缀 0、锚点缺失 0、代码块外字面 `[[` 0、og/meta `[[` 0。
- **闸门断言**：t7 新增规则 21（error）本次 0 命中（闸门通过）；canary 判红证据在 t7 日志 `docs/audit/tmp/t7-canary-miss.log`（注入不存在 src → exit 1 报 compare.json:26，还原后 cmp 字节一致）。
- **独立旁证**：`npm run check` 链中的 P1-15 守卫 `scripts/check-compare.mjs`（已并入 CI）输出「70 行 src 全部可解析；159 个 nums + 288 个单元格数字 token 全部逐字命中源条目」（§2c L262）。

### 2.2 P0-2 明细

- 闸门：exit 0、`✅ 122 条全部合规`、`⚠️ 6 条警告`（L119–130）。
- 6 条名单逐字核对：马克斯:二级思维怎么赚钱 / 确认偏误 / 心理学研究的证据强度 / 哪些偏差真的会亏钱 / 修行七件事 / 买理财亏了——与任务书期望名单完全一致（基线 7 条减去前景理论 1 条），前景理论警告消失即 `disputed: true` 生效。

### 2.3 P0-3 明细

- `[src] PATHS 12 步 ⊆ 地图 wikilink 目标集: 12/12 HIT`（L545）。
- `[dist] start-here 区 18 链接 = sc-title 3 + 步骤 12 + 地图回链 3`；`步骤链接 12 个（去重 12 条）⊆ 目标集: 12/12 HIT`（L546–547）；地图回链 3/3 指向地图 slug；sc-title 3/3 指向各路径第 1 步；dist 渲染 12 步标题集合 === src PATHS 标题集合（渲染未丢字）（L549 PASS）。
- 归一化口径：站点同款 `normalizeKey`（trim+小写+去空白，标点敏感）。

### 2.4 P0-4 明细

- dist CSS（L557）：`.site-nav{scrollbar-width:none;-webkit-overflow-scrolling:touch;gap:1.2rem;min-width:0;margin-left:auto;font-size:.86rem;display:flex;overflow-x:auto}`——`overflow-x:auto` + 藏滚动条 + `min-width:0` 均在产物中。
- dist CSS（L562）：`.site-header{…min-height:var(--header-h)…}`（height→min-height 生效，允许换行）。
- 零 JS 不变式保持（全站 0 `<script>`，D 节 html 扫描未见 script 引入）。
- **浏览器 320/360/375/414px 四断点目检：留人工**（§5）。

## 3. 回归基线（每阶段交付标准，全部绿）

| # | 命令 | 结果 | 日志 |
|---|---|---|---|
| 1 | `node scripts/check-content.mjs` | exit 0，122 条合规，6 警告（7→6 达成） | L116–131 |
| 2 | `npm run build`（= `npm run check && astro build`） | 成功，136 页（= 135 sitemap 页 + 404.html）；需 D1 shim | L132–427（2c 为有效构建） |
| 3 | `node docs/audit/tmp/audit-tech.mjs` | A/B/C/D/E 各节：slug 122/122、sitemap 前缀 100%、C3 0 漂移、C4 ev-flag 全等、D 节 0 死链 0 残留（C4 严格正则误报见 Y1，B2 误报见 Y2） | L429–540 |
| 4 | `node docs/audit/20261012-impl/t12-paths-check.mjs` | PASS（全部 HIT） | L541–552 |
| 5 | `grep -o '.site-nav{[^}]*}' dist/_astro/*.css` | `overflow-x:auto` 在场 | L554–562 |

## 4. 改动文件 diff --stat 汇总（日志 §0.2，L43–66）

共享工作区当前未提交改动（16 个 tracked 文件 + 2 个 untracked 新脚本/目录），按任务归属：

| 归属 | 文件 | diff --stat |
|---|---|---|
| P0-3（t5） | `src/pages/index.astro` | 23 +- |
| P0-2 + P1-1/2/3/4（t6） | 7 个条目 md（前景理论 / 马克斯×2 / 投资体系地图 / 损失厌恶 / 博格×2） | 合计 21 行级 |
| P0-1（t7） | `src/pages/compare/[table].astro`、`src/data/compare.json`、`scripts/check-content.mjs` | 15 / 2 / 50 |
| P0-4（t8） | `src/styles/global.css`（部分，.site-header/.site-nav/.site-title） | — |
| **Phase 1 在制品**（非本验收对象，但已进入本次构建产物） | `src/layouts/Base.astro`（+36，P1-9 六域下拉）、`src/pages/[...slug].astro`（+27，P1-11 长 keyNumber 折叠）、`src/styles/global.css`（其余部分）、`package.json`/`package-lock.json`（依赖声明，P1-14 类）、`scripts/check-compare.mjs`（untracked，P1-15 守卫）、`src/pages/compare/[table].astro` 中 P1-12 行锚 hunk | 见 L43–66 |
| 审计产物（untracked） | `docs/audit/`、`.agent-teams/` | 不属源码 |

> 说明：工作区有队友并行改动，`git diff --stat` 是共享工作区快照，无法逐任务切分；上表归属依据各任务交付报告 + diff 内注释（P1-9/P1-11/P1-12 注释均自署）。**P0 验收结论仅针对 P0 四项的验收标准**，在制品改动只影响检测脚本口径（Y1）与 href 计数增量，未引入任何死链/警告/漂移。

## 5. 待浏览器目检清单（继承 final-report 附录 A）

P0 级目检项（本机无 headless 浏览器，须真实浏览器确认）：

1. **A-1（P0-4 唯一目检项）**：移动端导航在 **320/360/375/414px** 四断点的实际形态——预期：nav 自含横滑（`overflow-x:auto`）、页面宽=视口宽、无竖排压塌、无横向页面滚动；375px 首页首屏可见 开始/六域/目录/别名索引，其余一次左滑可达（t8 交付报告 `docs/audit/tmp/t8-p0-4-report.md` §2 推算表 + §4 目检 7 项子清单）。
2. （提示，非 P0 验收项）本次 dist 含 Phase 1 在制品渲染变化（P1-9 全局下拉、P1-11 关键数字折叠、P1-12 行内 `#` 锚、P1-12 关联的 howto/notes 视觉调整如有）——其目检项记录在各自交付报告中，随 Phase 1 验收处理。

## 6. 红灯区

**无。** 五项检查（闸门/构建/audit-tech/P0-3 比对/CSS 确认）全部绿；未发现产品级缺陷，无需队长协调的失败项。

## 7. 偏离与黄灯备注（D/Y，均不改变验收结论）

### D1【偏离·须显著标注】构建经沙箱兼容 shim 完成（`npm run build` 原生跑不通）

- **现象**：§2（L165）与 §2b（L224）两次构建均在 `ssrMoveAssets`（`astro/dist/core/build/static-build.js:334`，`fs.promises.rename` 移动 `.prerender/_astro` → `dist/_astro`）处 `EXDEV: cross-device link not permitted`，构建中止。
- **定位**（§2a + 本任务两组对照实验，全部记录在日志）：
  - 同一路径对：shell `mv` 成功；Node `fs.renameSync` 失败 EXDEV（L2a 段）；
  - 粒度实验：Node 下**任意目录**间 rename 均 EXDEV（普通目录/dist 子目录/.prerender 三组全红）→ 非路径特异；
  - Python `os.rename` 同样 EXDEV（errno 18）→ 非 Node/Astro 特异；
  - rename 两侧 `stat` 设备号相同（64514，/dev/vda2，Docker overlayfs），内核层不存在跨设备；
  - **结论：本沙箱环境对非 shell 进程的 rename(2) 系统性拦截（返回 EXDEV），属环境行为，不是源码/配置缺陷。** 非沙箱环境（CI/宿主）无需 shim。
- **处理**：`NODE_OPTIONS="--require …/docs/audit/20261012-impl/rename-shim.cjs"` 注入 shim——优先走原生 rename，仅当返回 EXDEV 时用 复制+删除 模拟（同文件系统行为等效；差异仅非原子，本场景无并发读者）。§2c 第三次构建成功（L418）。
- **影响与风险**：只影响该验证构建进程；未改任何源文件；dist 产物内容与 rename 方式无关（内容寻址哈希不变，CSS 哈希 Base.D8kdKnjn 两次构建一致可佐证）。残留风险：本环境后续任何构建（Phase 1/2）需同样注入或改在宿主构建，请队长知悉排期。

### Y1【黄灯·t3 脚本盲区】audit-tech.mjs C4「首列应链未链」70/70 行误报

- 根因：P1-12（t11 在制品，diff 注释自署）在 row-head 内新增 `<a class="row-anchor">`（行级深链），t3 脚本 C4 的正则要求 `</th>` 紧跟条目链接 → 全部 70 行不匹配。
- 补充核对（§3a，L520–536）：前缀口径（row-head 起始即首列链接）**70/70 行带链接**；ev-flag 期望 14 实际 14 → PASS。
- 建议（本任务不改 t3 脚本）：后续修订 `audit-tech.mjs` C4 正则容忍 row-anchor，或在 P1-12 落定后重跑基线。

### Y2【黄灯·t3 脚本盲区】audit-tech.mjs B2「sitemap 多余 10 个」误报

- 根因：脚本 dist 页面集合只扫顶层目录，漏 `dist/compare/*`、`dist/topic/*` 嵌套页。
- 补充核对（§3a L534）：sitemap 135 条 `<loc>` 逐条对照 dist 文件（含嵌套）→ 缺 0 个，sitemap 与 dist 实为 1:1。

### Y3【备注】audit-tech C1「页查失败（首列失链）3」为 raw-lookup 遗留指标

- t3 脚本以 `eIndex.get(r.src)`（未归一化）判「页面首列」——P0-1 后页面查表已归一化，该 3 行（LTCM/林奇/索罗斯）不再是页面缺陷（ev-flag 8=8 与 §3a 70/70 即证明）。指标含义应随脚本修订更新。

### Y4【备注】验证期间工作区存在队友并行改动

- §2b 构建的闸门段一度显示 **123 条/7 警告**（L201 附近）——某队友当时正在新建第 123 个条目（其自带 1 条 disputed 线索警告）；§2c（最终有效构建）已回到 122 条/6 警告。
- `git diff --stat` 含 Phase 1 在制品（见 §4 归属表）；本次验收结论基于共享工作区当前状态（与 t6/t7 交付时同一口径）。

### Y5【备注】dist 曾短暂处于 0 页状态

- §2/§2b 两次失败构建在 `ssrMoveAssets`（先于 `generatePages`，`static-build.js:145–148`）处中止，且旧 dist 已被清理 → 期间 dist 0 个 HTML 页。§2c 构建成功后完整恢复（136 页，§2d 核对）。若期间有其他任务读 dist，可能读到空状态——请队长知悉。

## 8. 可重跑

```bash
# 本环境重建（需 D1 shim）
NODE_OPTIONS="--require $PWD/docs/audit/20261012-impl/rename-shim.cjs" npm run build
# P0-3 验收
node docs/audit/20261012-impl/t12-paths-check.mjs
# 对照表/sitemap 补充核对
node docs/audit/20261012-impl/t12-compare-verify.mjs
# 全量日志
cat docs/audit/20261012-impl/phase0-regression.log
```
