# t21 交付报告 · P2-C6：标签字号下限与 mono 清理

- 实施人：ux-analyst · attempt 462a83bd-59a2-4b63-887e-f2fce6965a36
- 依据：00-final-report.md §3 P2-C6 行（:163）+ 02 报告 P-17（:144-147）
- 改动文件：仅 `src/styles/global.css`（基于 t17 落地后的最新文件；t17 hunk 按 `grep 'P2-A'` 与本任务 `grep 'P2-C6'` 切分）
- 零 `<script>` 不变式：保持（grep 0）；未跑 build、未 commit/push

## 1. 涉及选择器清单（改前/改后）

### 1.1 字号下限 0.72rem（功能文字最小 12.2px）

| 选择器 | 改前 | 改后 | 内容性质 |
|---|---|---|---|
| `.layer-tag` | 0.68rem | **0.72rem** | 中文（理念/执行/档案/工具） |
| `.qc-label` | 0.7rem | **0.72rem** | 中文速览卡标签 |
| `.qc-more summary` | 0.7rem | **0.72rem** | 中文「完整口径」 |
| `.nav-drop-glabel` | 0.7rem | **0.72rem** | 中文「六域/对照表」 |
| `.dir-ev` | 0.7rem | **0.72rem** | Latin A/B/C（mono 保留） |
| `.alias-gcount` | 0.7rem | **0.72rem** | 数字（组计数） |
| `.qc-flag`（共享规则拆出） | 0.66rem | **0.72rem** | 中文「争议」徽章 |
| **`.ev-flag`（单独点名）** | 0.66rem | **0.7rem**（独立 override 行） | 中文「争议」徽章 |
| `.compare tbody td/th::before`（<641px 卡片化列名） | 0.68rem | **0.72rem** | 中文列名 |
| `.entry-body table.table-cards td/th::before`（条目内表格卡片化列名） | 0.68rem | **0.72rem** | 中文列名（动作/数字） |

改后全站功能文字最小 = `.ev-flag` 0.7rem（任务书点名值）；其余标签全部 ≥0.72rem（断言：`font-size: 0.5x/0.6x/0.7rem` 残留仅 .ev-flag 一处）。

### 1.2 中文标签去 mono（14 处）

`.nav-drop-glabel`、`.layer-tag`、`.qc-label`、`.qc-more summary`、`.qc-flag/.ev-flag`（原已 sans）、`.dc-meta`（「N 条 · A 级 M 条」）、`.entry-crumb`（面包屑）、`.hero-kicker`（「A 股散户逃生指南」）、`.part-label`（「步骤/算例/…」分段标签）、`.topic-item-meta`（「收益档位 · 量纲 · 证据」）、`.backlinks-title`（「反链来源/同域相关」）、`.dom-summary-count`（「N 条」）、`.compare thead th`（表头列名）、`.compare tbody td/th::before` + `.entry-body table.table-cards td/th::before`（两处卡片化列名伪元素）。

### 1.3 mono 保留（数字/日期/Latin/符号/代码，12 处，逐一核过）

`.alias-gchip`（A–Z/# 字母）、`.alias-ghead`（组头字母）、`.stat-num`（大统计数）、`.sc-num`（01/02/03）、`.section-label`（ALIASES/ENTRIES 等 Latin 大写）、`.dom-summary-num`（01–06）、`summary.dom-summary::after`（＋/－ 符号）、`.dir-ev`（A/B/C）、`.qc-value.is-num`（大数字，`.qc-figure` 继承）、`.entry-body code`（代码）、`.compare .row-anchor`（# 锚）、`.compare .ev`（A/B/C）。

### 1.4 伴随 letter-spacing 微调（披露项，非任务明列）

mono 宽字距是为 Latin 小码设计的，去 mono 后 CJK 上同样的 tracking 显稀疏，故同步减半：`.qc-label` 0.12→0.06em、`.entry-crumb` 0.08→0.04em、`.hero-kicker` 0.2→0.1em、`.backlinks-title` 0.14→0.06em、`.compare thead th` 0.1→0.05em。若目检判某处仍过紧/过松，属一行内微调，不另开任务。

## 2. 自检输出

1. `node scripts/check-content.mjs` → **exit 0**（122 条合规，既有警告与基线一致）。
2. `node scripts/check-compare.mjs` → **exit 0**（70 行 src 全解析；159 nums + 288 token 逐字命中）。
3. CSS 花括号配平：OK。
4. 字号下限断言（python 正则）：`font-size` < 0.72rem 残留仅 `.ev-flag { font-size: 0.7rem; }` 一处（任务点名值）——PASS。
5. mono 存留清单断言：12 处全部为数字/日期/Latin/符号/代码（逐一列于 §1.3）——PASS。
6. 零 `<script>`：global.css grep = 0。
7. 类集合：本任务无新增/删除 CSS 类（仅既有选择器属性值调整）——无悬空类风险。

## 3. 留目检项（并入验证任务目检清单）

1. 速览卡：「证据等级/关键数字」等标签（.qc-label 0.72 sans）+「争议」徽章（.qc-flag 0.72 / .ev-flag 0.7）观感——两主题。
2. 域页/条目头/首页目录的「理念/执行/…」layer-tag（0.72 sans + 四色）与证据 A/B/C 徽章（0.72 mono）并排观感。
3. 首页 hero-kicker（「A 股散户逃生指南」0.1em 字距）与折叠目录 summary 行（编号 mono + 「N 条」sans）观感。
4. 条目页：面包屑、part-label（「步骤/算例」）、底部反链标题 sans 化后的整体观感。
5. <641px 移动视口：对照表/条目表格卡片化的列名伪元素（0.72 sans）宽度（min-width 4.2em 随字号微增 ≈2px）不挤行。
6. 对照表 thead 中文列名（0.72 sans + 0.05em 字距）与 A/B/C 列（mono）并排观感。

## 4. 范围外记录

- `.a-num`（A 级索引行，0.8rem，可含中文 description）现为 sans，未涉 mono，不动。
- 正文内 `code` 行内代码的 mono 属代码语义，保留（非标签）。
