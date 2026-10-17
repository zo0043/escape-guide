# 02 · 工程审查：闸门规则有效性、渲染层实证、CI 门禁与文档漂移

> 审查人：reviewer-2（t2 · 工程审查）· 2026-10-15
> 共同基线：`docs/audit/captain-baseline-20261015.md`（下称「基线」，A1–A9 / D1–D9 编号沿用）
> 约束：只读 src/ scripts/ docs/ .github/；临时验证样本一律建 `/tmp`，验证后清理；产出仅本文件。
> 核心问题：**这套「用机器守住内容」的工程承诺，兑现了多少？哪里是空的？**

## 0. 审计范围与方法

- 闸门：`scripts/check-content.mjs`（约 709 行）、`scripts/check-compare.mjs`、`check:canary`、`check:font`
- 渲染层：`dist/`（139 页已构建产物）
- CI/部署：`.github/workflows/deploy.yml`、线上 `https://blog.zero43.top/escape-guide/`
- 文档：`README.md`、`src/content/about.md`（或实际 about 页来源）、`docs/handover.md`
- 每条规则回答三问：(a) 实际拦什么？(b) 能否绕过（`/tmp` 实证）？(c) 断言是否空转（假绿）？
- 纪律：每项发现带 严重度 + 文件:行号 + 命令原文与输出证据 + 修法；无实证标「未定位」。

## 1. 闸门规则逐条有效性审计（check-content.mjs / check-compare.mjs）

### 1.1 check-content.mjs 规则清单与三问（读码结论，709 行全读）

规则 1–24 全部为**机械层**断言。逐条三问（a 拦什么 / b 可绕过写法 / c 是否假绿）：

| # | 规则（代码行） | (a) 实际拦什么 | (b) 绕过写法（读码，待 /tmp 实证） | (c) 假绿判定 |
|---|---|---|---|---|
| 1 | 五节齐全（L353） | 缺 `## 节` | 节存在但内容空/灌水（后续规则只设下限） | 否（结构层真断言） |
| 2 | 四标记齐全（L360） | 缺标记文本 | `includes()` 是子串匹配：标记写成段内引用文字也算在场，无需独立成段 | 部分：查在场不查结构 |
| 2b | **算例**必选（L366） | 缺算例标记 | 标记在场即过；算例内容可空、可错——**无算术校验**（A9 核心空洞） | 是：「可复算」三字无人验 |
| 3 | 收益三档（L381） | 前缀+至少 1 个阿拉伯数字 | 量级档写「量级（口径：亏损）：10」一个孤立数字即过；**「无量级（方向性）：」之后原因可为空**（仅 startsWith，无后续内容断言） | 部分 |
| 4 | 说人话禁数字（L392） | 阿拉伯数字 + 精确中文数字（v7 三类） | ① 全角数字 ０-９（U+FF10-FF19）两支正则均不匹配；② 口语白名单（几X/X成/X倍/一半/裸十位）放行是**设计选择**但等于精确数字可换皮；③ 全角百分号「％」+ 中文数走 X成 放行 | 部分（白名单是口径，不是漏洞） |
| 5 | front matter 枚举（L304-330） | chapter/layer/metric/evidence/gain/cost/checked/description | 取值域内无法绕过；但 **description 与正文是否相符不查**，[[…]] 仅 warn | 否（枚举真断言） |
| 6 | 双链可解析（L405） | —（**warn 不阻断**） | 设计选择：「未收录」合法渲染 | 是（故意的，但见 §1.4 组合效应） |
| 8 | 备注 ≥3 列表项（L415） | 列表项计数 | `match(/^\s*[-*]\s+/gm)` 数所有行首 `-`/`*`：**3 个空 bullet（无内容）即过**；正文中任意位置的嵌套 bullet 也计入 | 部分 |
| 9 | 出度双链 ≥2（L423） | 唯一目标数 ≥2 | 与规则 6 组合：**2 个不存在的目标**（双双 warn）即可满足出度——结构闸可用死链凑数 | 组合假绿 |
| 10 | 怎么做 ≥350 汉字（L432） | 长度下限 | 灌水到 350 汉字即过（下限非质量） | 部分 |
| 11 | 说人话 ≥150 汉字（L441） | 长度下限 | 同上 | 部分 |
| 12 | 双链后禁半角括号（L454） | `]](` | 代码块/行内代码已剥；`[[目标]](x)` 写成 `[目标](x)` 正常链接则不在本规则射程（也无需拦） | 否 |
| 13 | `[[` 配对（L467） | opens>closed | 只查 opens>closed；`[[a]]` 出现在 HTML 注释 `<!-- -->` 内成对出现不误报也不误拦（可接受） | 否 |
| 14 | 六段顺序（L484） | 标记首现顺序 | **只用 `indexOf` 首现位置**：在「什么时候用」段里提前引用一次「**算例**」字样，首现位置提前，实际错序可被掩盖 | 部分（真实绕过，待实证） |
| 15 | 行内口径五值+==fm（L510） | `量级（口径：X）` 全角式 | ① 同节第二处行内口径写**半角括号** `量级 (口径：时间)` → 正则只匹配全角 `（口径：`，漏检；② 「无量级」档正文里混入「量级（口径：…」完全不入规则射程（matchAll 在 startsWith 量级 的 if 内） | 部分（真实绕过，待实证） |
| 16 | 说人话三标签（L541） | 三标签在场 | `includes()`：标签写进任意句子中段也算（不查段首位置） | 部分 |
| 17 | disputed 线索（L552） | —（**warn 不阻断**） | 设计选择（关键词代理须人工）；A7 的 6 条 warning 即此 | 是（故意的） |
| 18 | 裸 URL+全角标点（L561） | GFM 吞标点 404 | 前瞻集 `[（，；：、。]`+引号组合；**全角 ！？… 不在集内**——`https://x.com！` 不被拦且同样被 GFM 吞（待 micromark 实证）；文档自认的 `)` 内嵌缺口 L185 | 部分（漏字面集，待实证） |
| 19 | 无公开统计消歧（L584） | —（**warn 不阻断**） | 设计选择 | 是（故意的） |
| 20 | layer 枚举（L316） | 同规则 5 | 同 | 否 |
| 21 | compare src 可回源（L598） | 整行 src 解析 | 只拦整行；**数字漂移由 check-compare 守**（见 §1.2） | 否 |
| 22 | 量级档「这个数怎么用」（L533） | 收尾句在场 | `includes()`：**句子放在收益节开头也算**（不查结尾位置）；句子内容与该数是否相关不查 | 部分 |
| 23 | **常见错**必选（L374） | 标记在场 | 同规则 2b：在场即过，内容不查 | 部分 |
| 24 | crash ⊂ keyNumber（L349） | 5 字段逐字子串 | `recover` 长句不机检（注释自认 L96）；**keyNumber 本身与正文的关系不查**（见 §1.3 关键发现 K1） | 部分 |

### 1.2 check-compare.mjs 三问（164 行全读）

| 检查（代码行） | (a) 实际拦什么 | (b) 绕过写法 | (c) 假绿判定 |
|---|---|---|---|
| ① src 可解析（L105） | 整行首列失链 | 无（与规则 21 同源同索引） | 否 |
| ② nums 逐字（L116） | 表数字 ⊆ 源条目**整文件**文本 | ① 匹配对象是**含 front matter 的整文件**：数字只要出现在 `keyNumber`/`checked`/URL 里即算命中，不要求出现在读者看到的正文/来源句里；② 匹配方向单向（表→条目），条目里核心数字没进表不报 | 部分（「逐字一致」被实现为「子串存在」） |
| ③ 单元格 token 逐字（L127） | 单元格内数字 token ⊆ 源条目 | **token 正则 `\d[\d,]*(\.\d+)?` 不含符号**：单元格「−89.19%」只取 token `89.19`，源条目写「+89.19%」照样命中——**符号翻转（盈↔亏）检不出**；与 check-content 规则 24「含全角 − 号逐字」的口径自相矛盾（待 /tmp 实证） | 部分 |
| 行号定位（L82-90） | — | `findIndex` 重复行报首行（纯 cosmetic） | — |

**口径矛盾实证点**：check-content 规则 24 明确「含全角 − 号，子串匹配天然区分 −89.19% 与 +89.19%」（L95），check-compare 的 NUM_RE 丢符号——同一个「逐字」承诺，两个脚本两种口径。

### 1.3 关键结构性发现（读码 + grep 实证）

- **K1 · keyNumber 无正文锚定（高）**：`grep keyNumber scripts/`（19 处，命令与输出见 §6 证据 E1）证实 scripts/ 里 keyNumber 的全部角色是「keyFigure 与 crash 字段的超集」。没有任何规则断言 **keyNumber 本身逐字出现在条目正文（来源节）里**。后果：`keyNumber` 可填任意字符串，只要 keyFigure ⊂ keyNumber、crash ⊂ keyNumber，渲染层速览卡/峰谷条的「大数字」全链自洽却**可以整条与正文脱钩**，构建全绿。「数字逐字回源」三支柱中，锚点（keyNumber↔正文）恰好是无机器守卫的一环。
- **K2 · `build:soft` 是零闸门构建入口（中，设计选择但需文档化）**：`package.json` L15 `"build:soft": "astro build"` 完全绕开两个内容闸门（字体闸门不在其列）。deploy.yml L8 声称「CI 永远走 build」，但该保证只覆盖 CI；本地/任何脚本链调 build:soft 即可产出无闸门 dist。README L31 只说 dist 可删重建，未提示 build:soft 的闸门绕过性质。
- **K3 · CI 里字体闸门恒绿（高）**：`check-font-coverage.mjs` L37-40：dist 不存在 → exit 0 跳过。`dist/` 在 .gitignore（实证 E2），GitHub Actions 每次全新 runner 无 dist → **CI 构建中字体闸门 100% 走跳过分支**，实际只在「本地已有上一轮 dist」的机器上生效（且校验的是**上一轮**产物，滞后一拍）。README L11「构建期字体覆盖闸门」的承诺在 CI 兑现率为 0。

### 1.4 A9 量化：完全没有机器守卫的错误类别

about 页「哪些是机器守着的，哪些只是承诺」表（about.md L160-183）**自认** 7 类靠人工审计；本次读码另加 3 类。合并清单：

| # | 无守卫类别 | 证据（代码缺位位置） | 已发生的事故 |
|---|---|---|---|
| U1 | **算术正确性**（算例逐行可复算、跨行口径一致） | 规则 2b 只查 `**算例**` 标记在场（L366）；全脚本无任何算术/数值关系断言 | A2（索罗斯条 6 万 vs 9.2 万） |
| U2 | **事实与日期** | 无任何规则碰正文事实；`checked` 只查在场不查真假（L330） | — |
| U3 | **书目真伪**（书名/年份/出版社/含谁） | 零规则；about L182 自认「人工审计」 | A1（假《Market Wizards》引用） |
| U4 | **来源链接可达性 / 一手性** | 零规则；about L182 自认 | A3（工序话术混入来源节） |
| U5 | **keyNumber ↔ 正文锚定** | K1（scripts/ 无此断言） | 未发生（K1 为潜伏） |
| U6 | **对照表数字的符号/口径** | check-compare NUM_RE 丢符号（§1.2 ③） | 未发生（潜伏） |
| U7 | 语义正确性（标记齐但意思写反） | about L179 自认 | — |
| U8 | 速览字段覆盖率 | about L181 自认（可选字段） | 已补齐 124/124（基线 §3.3） |
| U9 | description/lede 与正文的一致性 | 零规则 | — |

**量化结论**：闸门 24 条 + 对照表 3 项 = 27 项断言，**全部**落在「结构/枚举/子串/计数」四类机械层；U1–U6 是「内容错而构建绿」的完整通道。README L7 宣称「三条都用机器守住」中，「每个关键数字可逐字回源复算」实际只守住**链式自洽**（keyFigure⊂keyNumber、表⊂条目子串），未守住**锚定**（keyNumber⊂正文）与**真值**（算术/事实）。

### 1.5 绕过实证（/tmp 样本，已清理）

方法：利用 `resolveContentDir()` 认 `ESCAPE_CONTENT_DIR`（entries.mjs L21），把最小真实条目
`牛市里猪都能飞，熊市里猪先摔.md`（5510 B，全规则合规）复制为单条目目录，逐个注入单点变异，
跑**真实闸门脚本** `node scripts/check-content.mjs`（非复刻）。v0 对照组：该条目层 0 error。
注：单条目目录会使规则 21（compare.json 回源）恒定报 80 个 error（目录里没有表引用的条目），
属测试环境噪声，已过滤；只看 `test-entry.md` 层 error。

| 变异 | 注入写法 | 期望 | 实测 | 结论 |
|---|---|---|---|---|
| v1 全角数字走私（规则 4） | 「说人话」段首加「（３０）」（U+FF13/FF10） | 判红 | **0 error（绿）** | **绕过成立**：`/[0-9]/` 只认 ASCII，plainNumberHits 三类正则全是中文数字 |
| v2 半角口径（规则 15） | 收益节两行：`量级（口径：亏损）：1 元，这个数怎么用：…` + `量级 (口径：收益)：2 元。` | 判红（收益≠fm 亏损、且「收益」≠「亏损」矛盾） | **0 error（绿）** | **绕过成立**：matchAll 正则 `量级（口径：([^）]*)）` 只匹配全角括号 |
| v3 无量级空原因（规则 3） | 收益节 = `无量级（方向性）：`（无任何原因） | 判红 | **0 error（绿）** | **绕过成立**：startsWith 前缀匹配后无后续内容断言 |
| v4 空 bullet 凑数（规则 8） | 备注节 = 2 个死链 bullet + 3 个纯空 bullet（`- `） | 判红 | **0 error（绿）** | **绕过成立**：`^\s*[-*]\s+` 只数行首符号不数内容 |
| v5 死链凑出度（规则 9+6） | 删光全部双链，只留 `[[不存在甲]]` `[[不存在乙]]` | 判红 | **0 error，2 条 warning「未收录」（绿）** | **绕过成立**：出度 ≥2 可用两个不存在目标满足；网络感承诺可被死链刷分 |
| v6 段序交叉引用（规则 14） | 真实段序改为 **算例→步骤**（错序），并在「什么时候用」行内加「（先按**步骤**执行）」交叉引用 | 判红 | **0 error（绿）** | **绕过成立**：规则 14 用 `indexOf` 首现位置，行内引用把「步骤」首现位置提前，掩盖真实段序 |
| v8 keyNumber 脱锚（K1） | `keyNumber: "+5%（此句正文从未出现，捏造的出处锚）"`，keyFigure 保持 `+5%` | 判红 | **0 error（绿）** | **K1 实证**：keyNumber 与正文无任何锚定断言，大数字链可整体与正文脱钩 |

命令原文（可重跑，样本已清理；重建方式见 §7）：
```bash
mkdir -p /tmp/gate-bypass/vX && cp src/content/escape/牛市里猪都能飞，熊市里猪先摔.md /tmp/gate-bypass/vX/test-entry.md
# （对 v1–v6/v8 按上表做单点编辑）
ESCAPE_CONTENT_DIR=/tmp/gate-bypass/vX node scripts/check-content.mjs; echo exit=$?
# 对照表符号翻转复现（复制 check-compare.mjs L93 的 NUM_RE）：
node -e "const NUM_RE=/\d{4}-\d{1,2}-\d{1,2}|\d[\d,]*(?:\.\d+)?/g;const entryRaw='最大涨幅 +89.19%（盈利）';const cell='−89.19%';const toks=[...cell.matchAll(NUM_RE)].map(m=>m[0]);console.log(toks, toks.every(t=>entryRaw.includes(t)))"
# 输出: [ '89.19' ] true → 表写亏损、条目写盈利，符号翻转检不出
```

**canary 机制评估**（check-content.mjs L632-680）：`--canary` 只自证**新增断言的判定函数**
（规则 22/23/4中文支/24）「能判红+不误伤」，这是「防空断言」的有效机制；但它**不能**自证
上述 7 种绕过（那是规则边界选择，不是断言失效）。canary 的覆盖面 ≠ 闸门的覆盖面——
README 若暗示「canary 全绿=闸门无死角」则是夸大（README 未这样暗示，此处仅澄清边界）。

## 2. 闸门 vs about 页「条目格式」合同一致性

### 2.1 数字对齐（README 24 / about 23 / 代码 v8）

| 出处 | 声称 | 与代码比对 |
|---|---|---|
| README.md L15 | 「24 条规则，v8」 | **一致**（check-content.mjs 文件头 1–24 连续编号，L88 v8 段） |
| about.md L33 | 「当前 v6，23 条规则，2026-10-13」 | **过期**：代码 v8（v7=2026-10-16 规则 4 升格不加编号，v8=2026-10-18 新增规则 24）；about 落后 2 个版本、1 条规则 |
| check-content.mjs | 1–24，v8 | 基准 |
| content-v2-spec.md L37 | 「说人话…仍禁阿拉伯数字（闸门机检）」 | **过期**（v7 起禁「阿拉伯数字 + 精确中文数字」，spec 未更新；spec 自述日期 2026-10-11 属历史文档，但 README L49 仍称其为「唯一写作依据」） |

对齐结论：**24（README）= 24（代码）；23（about）= 代码 v6 时的历史值，非误报**——about 页「本节与 `scripts/check-content.mjs` 保持一致，两者不一致时以闸门为准」（L33）这句话本身现在就是假的。

### 2.2 逐条比对：文档承诺 vs 闸门实装

**A 类：文档（about/spec）声称的承诺，闸门比其更严或文档未覆盖（作者会被「文档没写但构建会红」坑到）**

| # | 文档位置 | 文档口径 | 闸门实际 | 严重度 |
|---|---|---|---|---|
| C1 | about.md L41/L73；spec L14/L37 | 说人话「不许出现阿拉伯数字」 | v7 起**精确中文数字也判红**（百分之X / X点Y / 百千万亿级，L270-274） | **中**：按文档写「百分之三十」会被莫名判红；文档未给出白名单（几X/X成/X倍/一半/年份…），作者无合规写法可循 |
| C2 | about.md L33 | 「当前 v6，23 条」 | v8，24 条（规则 24 crash 在 about 字段表 L147 有文档，但版本头未同步） | 低：版本头过期 |

**B 类：文档承诺了，闸门没实装（或只 warning）——「写在 about 上」≠「被机器守住」**

| # | 文档位置 | 文档口径 | 闸门实际 | 严重度 |
|---|---|---|---|---|
| C3 | about.md L100/L135（字段表头 L130「取值非法或必填缺失都会构建失败」语境） | description「不许含 [[…]]」 | **只 warning 不判红**（check-content.mjs L307-309） | **中**：读者/作者按「构建失败」预期行事，实际 description 里的 [[…]] 会原样漏进 meta/og/RSS（L306 注释自认的泄漏），构建全绿 |
| C4 | about.md L44 | 备注「≥3 个列表项（闸门机检数量）」 | 机检的是**行首符号数**：空 bullet、无内容 bullet 都计数（v4 实证 4 个空 bullet 过闸） | 低-中：文档语义是 3 个**内容项**，闸门是 3 个**行首符号** |
| C5 | README.md L57 不变式 2 | 「对照表、keyFigure 与 crash 峰谷数字条中的数字必须是条目 keyNumber 的逐字子串，闸门已断言」 | **对照表数字只需是源条目整文件的子串，不要求出自 keyNumber**（check-compare.mjs L118 `raw.includes(n)`，raw=含 front matter 的整文件）；README 把「表数字⊂keyNumber」说成了已断言事实 | **中**：文档承诺了比机器更强的不变式。后果双向：① 表数字可以来自条目里任意一处（含 front matter、URL、checked 日期）而全绿；② 接手者以为表数字被 keyNumber 锚定，实际没有 |
| C6 | about.md L34-35 | 「闸门由 npm run build…调用——不是外挂脚本，所以**绕不过去**」 | `npm run build:soft`（package.json L15）完全跳过两个内容闸门；CI 里字体闸门恒跳过（K3） | 中：「绕不过去」只对 `npm run build` 入口成立 |
| C7 | about.md L87-89 三档制 | 「量级：…闸门仍接受」历史前缀 | 一致（L382）；但「无量级（方向性）：」之后**原因可为空**（v3 实证），文档示例暗示后面应有「<说明为什么算不出>」 | 低 |

**C 类：闸门实装了，文档没写（机器比文档多守的）**

| # | 闸门位置 | 闸门实际 | 文档 |
|---|---|---|---|
| C8 | check-content.mjs L188（规则 18 前瞻集） | 裸 URL 后全角标点含 `。` 与 `"URL"。` 两型（2026-10-12 实测缺口补入） | about L68 只举 `https://…。` 与 `"https://…"。` 两例——**一致**（about 恰好覆盖了这两型） |

C 类基本为空：about 页的「哪些是机器守着的」表（L160-183）是一份高质量的自声明边界，24 条规则全部对得上号（规则 21 在 L69、24 在 L147、warning 级 6/17/19 在 L174-175 均如实标注）。**about 页没有发现「文档说机器守着、实际没有」的条目**——它的失守集中在版本头（C2）与两处措辞（C1/C3）。

**D 类：代码内部自相矛盾（文档与代码都难称为单一事实源）**

| # | 矛盾 | 位置 |
|---|---|---|
| C9 | 规则 18 的前瞻集**漏全角 ！？…**：`BARE_URL_RE` 前瞻 `[（，；：、。]`（L188）不含 ！？…；GFM 对全角标点一律不修剪，`https://x.com！` 与 `https://x.com，` 同罪却不同判 | 待下一轮用 micromark 实证吞标点行为（若实证吞 → 补集；若不吞 → 无缺陷，删除此项） |
| C10 | 「逐字」口径两处不同：check-content 规则 24「含全角 − 号逐字子串」（L95）vs check-compare NUM_RE 丢符号（§1.2③） | 同一不变式两种实现 |

## 3. 渲染层实证（dist，139 页）

### 3.1 TOC 锚点

- 含 `.toc` 折叠卡的页面 = **76**（`grep -rl 'class="toc"' dist --include="*.html" | wc -l`）→ README L14「页内 TOC（76 条）」**属实**。
- 全 139 页逐页比对「页内 `href="#x"` ↔ 同页 `id="x"`」：**死锚点 0**（python 脚本，输出「页内 #锚点 href 在自身无对应 id 的：0」）→ 零 JS 的原生锚点跳转在当前产物上全部成立。

### 3.2 折叠卡

- 全 dist `<details>`/`<summary>` = **641/641**（配对完整），分布：19 个崩盘档案页各 17（时间线）、条目页各 2–5（八问四眼镜）、topic 6 页各 1、compare 5 页各 1、index 7、about/aliases/404 各 1。
- `.q-item`（八问四眼镜折叠卡）总数 = **恰好 204**（`grep -roh "q-item" dist --include="*.html" | wc -l`，17 页）→ README L14「204 项」**属实**。
- 全部原生 `<details>`，零 JS 依赖（零 JS 不变式复验：`grep -rl "<script" dist --include="*.html" | wc -l` = **0**）。

### 3.3 字体子集反验（check:font 只保证 dist ⊆ chars.txt，本节反验清单 ⊆ woff2）

命令：`pip install --user fonttools brotli` 后 `TTFont('dist/fonts/tscjk-500.woff2').getBestCmap()` 与 `scripts/fonts/chars.txt` 双向比对。

| 方向 | 结果 |
|---|---|
| dist HTML 字符 ⊆ chars.txt（check:font 正向） | ✅ 通过（`node scripts/check-font-coverage.mjs` → OK，清单 2587 字符） |
| **chars.txt ⊆ woff2 cmap（反验）** | ❌ **243 个清单字符不在 woff2**（cmap 共 2346 映射）；其中 172 个是 CJK 标点/兼容字符（〄 〆 〓 〘 〝 〟 〰 〱 〲…，U+3004–303F 段） |
| **HTML 实际用到 ∧ woff2 缺失（真实回退集）** | **10 个，全部非 CJK**：`\n ƒ ☐ ☑ ⚠ ✅ ✓ ✗ U+FE0F 🧭`；**CJK 真实缺字 = 0** → 当前 dist 无豆腐块 |

解读（读 `scripts/subset-font.mjs` 头注释后）：chars.txt = dist 字符 ∪ **安全边集**（MARGIN_TEXT「宁可多收」，含全量 CJK 标点 U+3000–303F）→ 边集字符若 TSCJK 本体无字形，pyftsubset 生成 woff2 时静默丢弃 → 「清单 ⊆ 字体」**按构造就不成立**。真正的安全属性应是「HTML 用到的字符 ⊆ woff2 cmap」，**没有任何闸门断言这一条**：
- **具体绕过**：新条目写入边集内但 TSCJK 无字形的字符（如 〓 U+3013）→ check:font 绿（它在清单里）→ 页面靠 `--serif` 回退链（"Songti SC", "Source Han Serif SC"，global.css L42-43）渲染 → 常见系统无豆腐但**字体身份漂移**；无 CJK 字体的系统上豆腐。
- 叠加 K3：CI 里 check:font 恒跳过，此属性在部署链上**零守卫**。

### 3.4 meta / OG / canonical / RSS

- index 与条目页 head 均含：`lang=zh-CN`、viewport、字体 preload、title、description、`theme-color` ×2（明暗）、favicon ×3、**canonical**（全站 139 页 0 缺失）、RSS alternate、og:title/description/type/url/image+宽高（`og-image.png` 实测存在，80,735 B）、twitter:card、robots。
- `dist/rss.xml`：**124 个 `<item>`**（与条目数一致）、channel 结构完整（103 KB）。
- `dist/404.html` 存在且含 canonical。

### 3.5 明暗主题 / print / 对比度

- 暗色：`@media (prefers-color-scheme: dark)` 全套变量 ✓；theme-color meta 双值 ✓。
- print：`@media print {` 块实质存在（白底、隐藏 chrome 组件、外链 URL 打印在链接后、quick-cards 强制 2×2）✓。
- **对比度 4.45:1（A8/handover L65）→ 已随 2026-10-17 Kami 重塑消解**：用当前色板全量计算 fg×bg 组合，**所有真实文字对 ≥ 5.3:1**（最低 = 亮色 fg-dim #6b6459 on bg #f5f4ed = 5.3；正文 fg/bg = 13.6/12.97；accent 文字一律走 --on-accent，10.99/6.98）。低于 4.5 的组合（--fg on --accent 1.24、--on-accent on --bg 1.1 等）经 CSS 核查**无实际渲染规则**（--accent 背景只出现在 6px 圆点 L1048、read-progress 条 L1336、.cta-primary:hover 与 .ev-A 徽章——后两者均配 --on-accent）。handover 的 4.45:1 是重塑前色板的值，**文档过期而非现存缺陷**（与基线 §3.3 handover 漂移一致）。

## 4. CI 与部署

### 4.1 deploy.yml 门禁结构

- `build` job：显式「条目格式闸门」step（`node scripts/check-content.mjs`）→ `npm run build`（内部再跑 check-content + check-compare + check:font）→ upload-pages-artifact。**坏条目 → 构建非 0 → 无 artifact → 不部署**（站点冻结在上一个健康版本，不会上线坏页）。
- **无 `pull_request:` 触发器 → 无 PR 门禁**（A8 确认）：作者只能在 push main 后、于 Actions 里发现坏条目；没有合并前反馈。
- **check:font 在 CI 恒绿（K3 复述）**：dist gitignored → 全新 runner 无 dist → `check-font-coverage.mjs` L37-40 走 skip 分支 exit 0。CI 三闸门实际只有两个半（字体闸门只在「本地已有上一轮 dist」的机器上生效，且滞后一拍）。
- 正面：`build:soft` 只存在于本地入口，CI 不引用（deploy.yml 注释 L8 自证）。

### 4.2 线上 vs 本地 dist

命令：python urllib 逐页 fetch（路径 percent-encode）+ sha256 对比本地 dist。

| 页 | live vs local |
|---|---|
| `/`（index） | **同一** |
| `/rss.xml` | **同一** |
| `/about/` | **同一** |
| `/compare/crashes/` | **同一** |
| `/topic/03/` | **同一** |
| `/索罗斯反身性与1992的单日十亿/` | **同一** |
| `/1929大萧条从全民炒股到十年失业/`（crash 页） | **同一** |
| `/别满仓别单吊/`（61 链入口） | **同一** |
| `/404.html` | **同一** |

9/9 字节级一致（live last-modified: Thu, 15 Oct 2026 07:50:11 GMT）。**线上 = 本地 dist**（抽样；未逐页核 139 页）。
⚠️ 取证陷阱备忘：直接 curl 中文 slug 未编码路径，GitHub 返回 400「Bad request」页——首轮 hash 比对因此假阳性，已用 percent-encode 重测。

### 4.3 Enforce HTTPS / 旧路径 301

| 检查 | 命令 | 实测 | 结论 |
|---|---|---|---|
| Enforce HTTPS | `curl -sI http://blog.zero43.top/escape-guide/` | **HTTP/1.1 200 OK**（明文 HTTP 直接返回整站，92 KB） | **未启用**（A8/D4 仍 pending，与 README L84「待站长操作」一致） |
| HSTS（旁证） | https 响应头 | `strict-transport-security: max-age=31536000; includeSubDomains; preload` 存在 | HSTS 有（GitHub Pages 默认），但 301 重定向未开，首次明文访问仍无保护 |
| 旧 `/escape/` 301 | `curl -sI https://blog.zero43.top/escape/` | **HTTP/2 404**（非 301） | **未设 301**（D8 仍 pending）——旧站旧书签/旧引链全部死链 |

## 5. 文档 vs 代码漂移

方法：README/about 中所有反引号文件路径逐一 `os.path.exists` 核验；`src/lib/`、`src/pages/` 实际目录列表比对 README 目录树。

| # | 漂移 | 证据 | 严重度 |
|---|---|---|---|
| D1 | **README L42 目录树称 `lib/` 含 `aliases` 模块** | 实际 `src/lib/` = entries.mjs / headings.mjs / paths.mjs / slug.mjs / wikilinks.mjs，**无 aliases.mjs**（`ls src/lib/`）；全仓 grep `aliases\.mjs` 零命中（README 目录树是唯一出处）。别名功能由 front matter `aliases:` 字段实现（entries.mjs entryKeys），无独立模块 | 低（误导接手者找不存在的文件） |
| D2 | about L33 版本头「v6，23 条，2026-10-13」 | 代码 v8/24（§2.1） | 低-中（见 C2） |
| D3 | about L41/L73 与 spec L14/L37 说人话只禁「阿拉伯数字」 | v7 起精确中文数字也判红（§2.2 C1） | 中 |
| D4 | about L100/L135 description「不许含 [[…]]」语境暗示判红 | 代码仅 warning（L307-309）（§2.2 C3） | 中 |
| D5 | README L57 不变式 2「对照表…数字必须是条目 keyNumber 的逐字子串，闸门已断言」 | check-compare.mjs L118 是**整文件**子串，不锚 keyNumber（§2.2 C5） | 中 |
| D6 | handover.md 全文停留 2026-10-13（122 条/闸门 v6/4.45:1 等） | 基线 §3.3 已记；本次另证 4.45:1 已随重塑消解（§3.5）——handover §3 P1「--warn 对比度 4.45:1 略低于 AA」现为过期项 | 低-中 |
| D7 | 日期不一致：check-content.mjs L88「v8 扩充（**2026-10-18**，崩盘可视化批 B）」 vs README L83「**2026-10-17** 已落地：…崩盘可视化」 | 同一批工作两个日期 | 低 |

**漂移正面项**（核实为真、不必改）：README L13「1972 处双链 0 死链」——`npm run check` 输出中「未收录」warning = **0**（死链为 0 属实）；README L14 的 76/204 数字实测全对；about「layer 四层定义与 content.config.ts 逐字一致」核查为真（L151-156 vs content.config.ts L37-40 逐字同）；about 字段枚举表与 schema/闸门三向一致；scripts/ 两闸门内注释引用的文件路径全部存在（E7 纪律保持）。

## 6. 分级发现清单（汇总）

**高危**

| ID | 发现 | 证据 | 修法 |
|---|---|---|---|
| F1（=K1） | keyNumber 无正文锚定：大数字链（keyFigure⊂keyNumber、crash⊂keyNumber）可整体与正文脱钩而构建绿 | grep keyNumber scripts/ 19 处无正文断言；/tmp v8 变异 0 error（§1.5） | 加规则：`keyNumber`（或其显式声明的子句）必须逐字出现于正文（建议限「来源/收益」节）；`--canary` 同款自证 |
| F2（=K3） | CI 里字体闸门恒跳过（dist gitignored → 全新 runner 无 dist → skip exit 0）；且 check:font 校验的是上一轮 dist，本地也滞后一拍 | .gitignore `dist/`；check-font-coverage.mjs L37-40；deploy.yml 无 dist 缓存 step | CI 在 build 后加一步：对**新产物**跑 check:font（build:soft → check:font → 校验，或把 check:font 挪到 astro build 之后断言新 dist）；README 删改「构建期字体覆盖闸门」为「本地开发期」 |
| F3 | 「清单 ⊆ woff2」按构造不成立（243 缺，172 个 CJK 标点），真正安全属性（HTML 字符 ⊆ woff2 cmap）**无闸门**；边集字符（如 〓 U+3013）可过闸而以系统字体回退 | fontTools cmap 反验（§3.3） | 闸门改断言「dist HTML 字符 ⊆ woff2 cmap」（fontTools 读 cmap，CI 可用）；或 subset-font.mjs 生成后自检「dist 用到的字符全在 cmap」并把该自检纳入 CI |

**中危**

| ID | 发现 | 证据 | 修法 |
|---|---|---|---|
| F4 | A9 结构性缺口：27 项断言全在机械层；算术/事实/书目/来源可达性/keyNumber 锚定/表数字符号 六类零守卫（U1–U6） | §1.4 清单 + A1/A2 事故 | 分两步：① 短期——给「算例」加**机械可判定**的算术断言试点（表格行数字与结论行数字的关系，可复算型算例可生成断言）；② 书目 106 本外核（t1 范围）。「语义层仅人工审计」是站内已声明口径，但 README L7「三条都用机器守住」的对外表述应降级为与 about L184 同口径 |
| F5 | 规则 18 裸 URL 前瞻集漏 `！？…`：GFM 吞标点实证（`！`→%EF%BC%81 吞入 href，点击 404） | remark-gfm 实测（§2.2 C9，命令在 §7 可重跑段） | BARE_URL_RE 两分支前瞻集补 `！？…`；补一条 canary 反例 |
| F6 | check-compare NUM_RE 丢符号：表「−89.19%」vs 条目「+89.19%」判绿（盈↔亏翻转检不出）；与规则 24「含全角 − 号」口径自相矛盾 | node 复现（§1.5 末段命令） | 单元格 token 抽取改为「可含前导 −/−(U+2212)/+ 的完整数字串」，与规则 24 同口径 |
| F7 | 绕过族（7 例实证，全绿）：全角数字 v1 / 半角口径 v2 / 无量级空原因 v3 / 空 bullet v4 / 死链凑出度 v5 / 段序交叉引用 v6 | §1.5 表 | 逐条收紧：规则 4 正则补全角数字类；规则 15 正则同时匹配半角 `(口径：`；规则 3 对「无量级」档加最低内容断言（如 ≥10 汉字）；规则 8 只数**有内容**的 bullet；规则 9 对「未收录」目标降权（出度只计可解析目标，未收录改记 warning 不计数）；规则 14 改用**段标题行**位置而非全文 indexOf |
| F8 | 无 PR 门禁：坏条目只能在 push main 后于 Actions 发现；A8 确认项 | deploy.yml 无 pull_request 触发器 | 加 `pull_request:` 触发器跑 `npm run check`（不部署）；或 GitHub branch protection 要求 Actions 绿 |
| F9 | Enforce HTTPS 未开：http:// 明文 200 返回整站 | `curl -sI http://…` = 200（§4.3） | GitHub 仓库设置开 Enforce HTTPS（站长操作，README L84 已列） |
| F10 | 旧 /escape/ 路径 404 非 301：旧站书签/外部引链全死 | `curl -sI https://…/escape/` = 404（§4.3） | Pages 自定义域 301 配置（zo0043.github.io 仓库侧，站长操作） |
| F11 | description 含 [[…]] 仅 warning，但 about 语境暗示判红（C3） | about L100/L135 vs check-content L307 | 二选一：升格判红（[[…]] 入 meta/og/RSS 是实质泄漏），或 about 改写明「warning，需人工处理」 |

**低危 / 文档**

| ID | 发现 | 修法 |
|---|---|---|
| F12（C1/D3） | about/spec 未文档化 v7 精确中文数字禁令与口语白名单——按文档写作会被莫名判红 | about「说人话」节补 v7 口径 + 白名单例子 |
| F13（D1） | README 目录树 `lib/aliases` 不存在 | 删该词（或注明「别名由 front matter aliases 字段承载」） |
| F14（C4） | 备注 bullet 计数含空 bullet（文档语义是内容项） | 规则 8 改数有内容 bullet（并入 F7） |
| F15（C7） | 「无量级（方向性）：」后可空 | 并入 F7 |
| F16（D2） | about 版本头 v6/23 过期 | 改 v8/24 + 日期 |
| F17（D7） | 崩盘批日期 10-17 vs 10-18 不一致 | 统一 |
| F18（D6） | handover 4.45:1 项已消解但文档未划改 | handover §3 P1 该项标注「2026-10-17 重塑后已消解（全对 ≥5.3:1）」 |

**正面结论**（承诺兑现的部分，勿当缺陷）：
- 闸门「判红即无产物」链在 `npm run build` 入口真实有效（canary 自证，基线 §2）；坏条目不能上线（只能冻结旧版）。
- 线上与本地 dist 9/9 抽样字节一致；sitemap 138 / RSS 124 / 零 JS 0 页 / 死锚点 0 / 死链 0 / canonical 139/139 / q-item 恰好 204 / TOC 恰好 76。
- about「哪些是机器守着的」表是诚实且准确的自声明边界——本站最可贵的是**把「机器没守住的」也写出来**。
- 明暗/print 变体完整，对比度全过 AA（4.45:1 为历史值）。

## 7. 本次未覆盖的部分

1. **内容层**（算术/书目/事实逐条核验）属 t1 范围，本报告只量化了「机器未守卫」的类别与通道，未逐条重算 124 条算例。
2. **读者路径走查**属 t3 范围；我仅独立复核了 76（TOC）/204（q-item）两个声称数字，未走完整读者链路。
3. 127 张表的 caption/th scope（A8 另一子项）未逐表审计（handover 已记，未复测）。
4. 线上一致性为 9 页抽样（含 index/rss/about/compare/topic/3 条目/404），未逐页核 139 页；GitHub 仓库设置页（Enforce HTTPS 开关 UI）未直接查看，以行为（http 200）为证据。
5. `npm run check:canary` 未在本轮重跑（基线 §2 已实测：canary 判红机制工作）。
6. 性能（7.6 KB gz/页、2 请求/页）未复测（基线/handover 已有值，非本任务焦点）。
7. 绕过实证的样本基于单条目最小集；多条目交互（如别名冲突 makeIndex throw）未构造反例——makeIndex/makeEntryIndex 的冲突 throw 是 error 级（entries.mjs L117/L143），读码判定为真断言，未实证触发。

### 可重跑证据命令（本节）

```bash
# C9：GFM 吞全角 ！ ？ …（remark-gfm 链 = Astro 实际渲染链）
node --input-type=module -e "
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
const md = (s) => unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify).processSync(s).toString();
for (const s of ['详见 https://example.com！后面文字','详见 <https://example.com>！后面文字']) console.log(JSON.stringify(s), '->', md(s).trim());"
# → 裸 URL+！：href 吞「！后面文字」（%EF%BC%81…）；<URL>！包裹：OK

# 字体反验
pip install --user fonttools brotli
python3 -c "from fontTools.ttLib import TTFont; f=TTFont('dist/fonts/tscjk-500.woff2'); c=f.getBestCmap(); chars=set(ord(x) for x in open('scripts/fonts/chars.txt',encoding='utf-8').read() if ord(x)); print(len(chars), len(c), len(chars-set(c)))"

# 线上 vs 本地（9 页抽样）
python3 -c "
import urllib.request, urllib.parse, hashlib
def h(p):
    with urllib.request.urlopen('https://blog.zero43.top/escape-guide/'+urllib.parse.quote(p),timeout=30) as r: return hashlib.sha256(r.read()).hexdigest()
print(h(''), hashlib.sha256(open('dist/index.html','rb').read()).hexdigest())"

# Enforce HTTPS / 旧路径
curl -sI http://blog.zero43.top/escape-guide/ | head -1    # → HTTP/1.1 200 OK（未重定向）
curl -sI https://blog.zero43.top/escape/ | head -1         # → HTTP/2 404（非 301）

# 死锚点全扫（python，本报告 §3.1 同款脚本）
# 零 JS：grep -rl "<script" dist --include="*.html" | wc -l   → 0
```
