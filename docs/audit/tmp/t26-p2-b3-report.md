# t26 · P2-B3 交付报告：checked 字段三处口径统一（schema 必填 + 闸门 error）

- **范围**：`src/content.config.ts`（2 行：注释 + 代码）、`scripts/check-content.mjs`（3 行替换 3 行：2 注释 + 1 fail）。`about.md` **未动**（理由见 §1.3）。
- **未做**：未 build（Zod schema 的运行时验证归 v1 统一构建）；未 commit / push。

## 1. 三处改前/改后对照（按队长裁定的收紧方案）

### 1.1 src/content.config.ts:56-57
```diff
-    /** 来源核对日期；引用监管文件的条目必填 */
-    checked: z.coerce.date().optional(),
+    /** 来源核对日期；对所有条目必填（C 级也不例外）——A股规则会变，这个日期就是说法的保质期（与 about.md「来源规则」同口径） */
+    checked: z.coerce.date(),
```
（去 `.optional()` → Zod 层必填：缺 checked 的条目在构建期 schema 校验即失败。原注释「引用监管文件的条目必填」是第三套口径，一并改为与 about.md 逐字一致的核心措辞。）

### 1.2 scripts/check-content.mjs:208-210（基于 t24 后的最新文件；t7 规则 21 与 t10 逻辑未动）
```diff
-  if (d.evidence === 'A' || d.evidence === 'B') {
-    if (!d.checked) warn(f, `evidence=${d.evidence} 但没写 checked（来源核对日期）`);
-  }
+  // checked 对所有条目必填（C 级也不例外）——与 content.config.ts 必填 schema、
+  // about.md「来源规则」同口径（P2-B3/01-C-15，2026-10-12 收紧：原 A/B 级 warning）。
+  if (!d.checked) fail(f, '缺 checked（来源核对日期，对所有条目必填，C 级也不例外——这个日期是说法的保质期）');
```
（全证据级、error 级——C 级条目漏写 checked 从此构建判红，堵住 C-15 的活风险：「新增一条 C 级条目漏写 checked 会通过构建，违反 about 页对读者承诺的『核对日期 = 说法保质期』」。fail 消息沿用闸门既有措辞风格，含理由。）

### 1.3 about.md——无出入，未动
- about.md:163（来源规则节，审计时 :116 因队友并行内容改动移位）：「`checked` 对**所有条目必填**（C 级也不例外）：填你核对、写下这条的日期——A股规则会变，这个日期就是说法的保质期。」
- about.md:95（条目格式示例块）：「checked: 2026-10-08 # 来源核对日期，对所有条目必填（见「来源规则」）」
- 两处本就写「所有条目必填（C 级也不例外）」= 收紧后口径，任务书条件「无出入则不动」成立，零改动。

收紧后三处口径一致：核心措辞「对所有条目必填（C 级也不例外）」+ 保质期理由，schema（Zod 必填）、闸门（error）、公共文档（about）逐字对齐。

## 2. 122 条全填确认（改 schema 前置条件，重跑核实）

```
$ node -e "yaml 解析 122 个条目 front matter，检查 checked 存在且可解析为日期"
条目总数: 122 | checked 存在且可解析为日期: 122
缺失: 0
类型异常: 0
```
→ 必填化零破坏（与审计结论一致，重跑确认）。

## 3. canary：新 error 规则判红验证

```
临时移除 src/content/escape/12386与投诉三通道.md 的 checked 行（cp 备份）
$ node scripts/check-content.mjs
exit 1
  12386与投诉三通道.md
     · 缺 checked（来源核对日期，对所有条目必填，C 级也不例外——这个日期是说法的保质期）
还原：cp 备份覆盖 + cmp 字节一致
（日志 docs/audit/tmp/t26-canary-miss.log）
```

## 4. 自检输出

```
$ node --check scripts/check-content.mjs
OK
$ node scripts/check-content.mjs && node scripts/check-compare.mjs   （日志 docs/audit/tmp/t26-gates.log）
exit 0
✅ 条目格式闸门通过：122 条全部合规
⚠️  6 条警告（不阻断构建）   ← 与基线一致（被删的 A/B checked warning 原本 0 触发，警告名单不变）
✅ 对照表守卫通过：70 行 src 全部可解析；159 个 nums + 288 个单元格数字 token 全部逐字命中源条目
```

## 5. 备注

- 工作区并行改动较多；本任务 diff 仅 §1 所列 content.config.ts 2 行 + check-content.mjs 3 行（git diff 对 HEAD 另含 t7 rule 21、t24 注释修正等已交付任务产物，未触碰）。
- Zod 必填的运行时行为（缺字段 → schema error）由 v1 统一构建覆盖；本环境以闸门 error + canary 判红作为等价的可执行证据。
- 临时产物（审计区，保留）：t26-canary-miss.log、t26-gates.log；条目备份 /tmp/t26-entry-bak.md（已 cmp 确认还原）。
