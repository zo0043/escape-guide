# t24 · P2-B2 + P2-B5 交付报告：假 JSON-LD 注释删除 + 悬空审计文件引用修正

- **范围**：`src/content.config.ts`（1 行）、`scripts/check-content.mjs`（4 行）、`src/lib/wikilinks.mjs`（1 行）——全部为注释行，外加任务书明确指定的 check-content.mjs:185 一条 fail 消息字符串（同属「删 JSON-LD 字样」）。
- **未做**：未 build；未 commit / push；JSON-LD 实体补全不做（队长裁定：删注释方案）。

## 1. P2-B2（03-T7）：JSON-LD 字样删除（保留 og/twitter）

### src/content.config.ts:31
```diff
-    /** 必填：留空会让 og/twitter/JSON-LD 回退到正文摘要，泄漏字面 [[…]] */
+    /** 必填：留空会让 og/twitter 回退到正文摘要，泄漏字面 [[…]] */
```

### scripts/check-content.mjs:185（front matter description 的 fail 消息，任务书 :174 因 t7 增行后移至 :185）
```diff
-    fail(f, '缺 description。留空会让 og/twitter/JSON-LD 回退到正文摘要，泄漏字面 [[…]]');
+    fail(f, '缺 description。留空会让 og/twitter 回退到正文摘要，泄漏字面 [[…]]');
```
（此行为 fail 消息而非注释，但任务书点名此位置、改法同为删「JSON-LD」字样；og/twitter 保留——二者在 Base.astro head 真实存在。）

## 2. P2-B5（01-C-19）：悬空审计文件引用修正（断引用、留规则）

被引用文件：`audit-synthesis-20261012.md`、`audit-t13-bare-url-tests.log`（均不在仓库，核实见 §3）。

### scripts/check-content.mjs:24
```diff
-// v3 扩充（2026-10-12，详见 audit-synthesis-20261012.md §5「闸门的系统性盲区」）：
+// v3 扩充（2026-10-12，出自 2026-10-12 整合审计「闸门的系统性盲区」一节——
+// 该审计文档未随仓库发布，规则原文已内联在下方 14–19 的逐条注释里）：
```

### scripts/check-content.mjs:118
```diff
-// 逐型复现（过程与输出见 audit-t13-bare-url-tests.log）：
+// 逐型复现（过程与输出未随仓库发布；复现结果内联如下）：
```

### scripts/check-content.mjs:127
```diff
-// 链接判成裸 URL（实测复现，见 audit-t13-bare-url-tests.log）。故在**前瞻**再补
+// 链接判成裸 URL（实测复现；过程与输出未随仓库发布）。故在**前瞻**再补
```

### src/lib/wikilinks.mjs:15
```diff
-// ⚠️ C6/S4 设计决定（2026-10-12，audit-synthesis-20261012.md §2.2 S4）：
+// ⚠️ C6/S4 设计决定（2026-10-12，出自 2026-10-12 整合审计 S4——
+// 该审计文档未随仓库发布，规则原文已内联在本注释里）：
```
（wikilinks.mjs 该注释后续行完整内联了 C6/S4 决定全文——别名感知放索引层不放归一化层、normalizeKey 不剥标点理由、49 个全角别名做法——「规则原文已内联」属实。）

## 3. 被引用文件不存在的核实（命令 + 输出）

```
$ find . -path ./node_modules -prune -o \( -name 'audit-synthesis-20261012.md' -o -name 'audit-t13-bare-url-tests.log' \) -print
（无输出——两个文件均不在工作区）
$ git ls-files | grep -E 'audit-synthesis|audit-t13'
（无输出，命中数 0——两个文件均不在 git 跟踪内）
$ grep -rl 'ld+json' dist --include='*.html' | wc -l
0        ← 佐证 T7：dist 136 页无任何 JSON-LD，注释声称的通道不存在
```

## 4. 语法与自检

```
$ node --check scripts/check-content.mjs && node --check src/lib/wikilinks.mjs
OK（两文件语法均通过——注释/字符串改动未破坏脚本）

$ node scripts/check-content.mjs && node scripts/check-compare.mjs     （日志 docs/audit/tmp/t24-gates.log）
exit 0
✅ 条目格式闸门通过：122 条全部合规（⚠️ 6 条警告 = 基线；description fail 消息仅在缺 description 时触发，不影响本次自检）
✅ 对照表守卫通过：70 行 src 全部可解析；159 个 nums + 288 个单元格数字 token 全部逐字命中源条目

$ grep -rn 'audit-synthesis\|audit-t13\|JSON-LD' src scripts astro.config.mjs
（0 命中——悬空引用与假 JSON-LD 字样全部清除）
```

## 5. 备注（工作区并行状态）

- `git diff` 对 HEAD 的 check-content.mjs 差异还包含 **t7（P0-1，已完成交付）的 rule 21 代码块**（import fs / makeEntryIndex / v5 注释 / 21 条实现）——非本任务产物；本任务在 check-content.mjs 的改动仅 §1/§2 所列 4 行。
- wikilinks.mjs 的 `git diff` 还含一行**队友并行改动**（「49 个/47 个」→「50 个/50 个」计数注释，属 M7 过期注释任务的在制品）——非本任务产物；本任务仅改 :15 一处。
- 任务书行号（:24/107/116/174）为审计时行号，t7 增 10 行后实际位置 :24/:118/:127/:185——已按内容定位而非行号盲改。
- t25（B3）与 check-content.mjs 同文件、在其后执行——本任务只动注释/消息行，未改任何规则逻辑，不干扰 t25 基线。
