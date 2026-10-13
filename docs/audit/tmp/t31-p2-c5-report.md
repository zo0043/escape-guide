# t31 · P2-C5 交付报告：keyFigure 显式大数字字段（schema + 闸门断言 + 结论条消费）

- **范围**：`src/content.config.ts`（+2 行）、`scripts/check-content.mjs`（+14 行断言 + 4 处注释内容化）、`src/pages/[...slug].astro`（3 处消费/注释）。
- **未做**：未 build（Zod schema 运行时验证归 v1 统一构建）；未 commit / push；**未填任何条目数据**（122 条 keyFigure 存量 = 0，未来哪条该加由内容侧决定）。

## 1. 三处主体 diff 摘要

### 1.1 src/content.config.ts（keyNumber 之后）
```diff
     /** 关键数字：最能说明问题的那一个数（含口径） */
     keyNumber: z.string().optional(),
+    /** 大数字：显式指定速览卡 3 / 结论条的大号数字（P2-C5）；声明了就必须是 keyNumber 的逐字子串（闸门机检，防漂移）；缺省时回退「首个数字串」机械提取（[...slug].astro 的 keyFigure 正则） */
+    keyFigure: z.string().optional(),
```

### 1.2 scripts/check-content.mjs（front matter 段，checked 规则之后；未编号 inline 检查，与 checked/layer 同款——不动「21 断言」编号体系，about.md 计数不受影响）
```diff
   if (!d.checked) fail(f, '缺 checked（来源核对日期，对所有条目必填，C 级也不例外——这个日期是说法的保质期）');
+  // P2-C5：keyFigure 显式声明「大数字」（速览卡 3 / 结论条大号展示）。
+  // 声明了就必须是 keyNumber 的逐字子串——与对照表「数字逐字一致」不变式
+  // 同风格，防声明的大号数字与来源句漂移。空串/缺 keyNumber → error。
+  // 未声明（undefined）不检查——当前 122 条均无该字段（2026-10-13 引入，零存量）。
+  if (d.keyFigure !== undefined && d.keyFigure !== null) {
+    const kn = String(d.keyNumber ?? '');
+    const kf = String(d.keyFigure);
+    if (!kf.trim()) {
+      fail(f, 'keyFigure 为空串（不声明就别写该字段——留空等价于回退机械提取，写空串没有意义）');
+    } else if (!kn) {
+      fail(f, `声明了 keyFigure「${kf}」但缺 keyNumber（keyFigure 必须是 keyNumber 的逐字子串）`);
+    } else if (!kn.includes(kf)) {
+      fail(f, `keyFigure「${kf}」不是 keyNumber 的逐字子串（防漂移：必须是 keyNumber 原文中逐字出现的一段）`);
+    }
+  }
```
- 三支 error：越界（非逐字子串）/ 缺 keyNumber / 空串。空串支是 spec 之外的防御性补充（空串是任何字符串的子串，纯子串检查会放行无意义声明）——已披露，供队长确认口径。
- **过程披露**：首次编辑误把 t26 的 checked 规则替换掉（edit 语义误用），随即恢复并复核两规则均在位、顺序复原；t26 交付物零丢失（canary 与最终闸门均覆盖 checked 规则存活）。

### 1.3 src/pages/[...slug].astro（两消费点 + 注释就地更新）
```diff
-// 3. 关键数字：两层结构（E1）——大数字=首个数字串，口径小字=完整原文。
+// 3. 关键数字：两层结构（E1）——大数字=显式声明的 keyFigure（P2-C5，闸门
+//    强制为 keyNumber 逐字子串），未声明时回退「首个数字串」机械提取；
+//    口径小字=完整原文。
...
-        figure: keyFigure(d.keyNumber),
+        figure: d.keyFigure || keyFigure(d.keyNumber),
...
-// 大数字复用 keyFigure 正则（t11 同款）——后续 t29 若落地 keyFigure 字段，
-// 此处直接改消费该字段，本任务不预实现。1997 型长 keyNumber 只取「大数字」，
-// 完整口径在下方速览卡 3 的 details（P1-8/P1-11 同批治理，不整段塞进 sticky 条）。
+// 大数字消费 front matter 的 keyFigure（P2-C5 落地：闸门已强制其为 keyNumber
+// 逐字子串）；未声明时回退 keyFigure 正则（t11 同款）机械取首个数字串。
+// 1997 型长 keyNumber 只取「大数字」，完整口径在下方速览卡 3 的 details
+// （P1-8/P1-11 同批治理，不整段塞进 sticky 条）。
 const hasQuick = Boolean(d.lede && d.when && d.keyNumber && d.maxRisk);
-const conclNum = d.keyNumber ? keyFigure(d.keyNumber) : '';
+const conclNum = d.keyNumber ? (d.keyFigure || keyFigure(d.keyNumber)) : '';
```
- 两处消费同口径 `d.keyFigure || keyFigure(...)`（truthy 回退：空串/未声明都落回正则，与闸门空串 error 互为保险）。
- `keyFigure` 正则函数名与新字段重名但作用域不同（一个是模块内 helper、一个是 front matter 字段），未改名——改名会扩大 diff 面，语义无歧义（helper 在 t25 注释里已同名）。
- 行为等价回归：122/122 条 keyFigure 不存在 → `d.keyFigure || keyFigure(kn)` 与 `keyFigure(kn)` 大数字逐条一致（yaml 解析实测 122/122）。

## 2. 追加项：spec 行号引用内容化（P2-B4 观察项①，队长裁定）

先 grep 全脚本：按行号引 `docs/content-v2-spec.md` 的注释共 **4 处**（任务书指认的 2 处范围各出现两次：常量定义区 + 规则体注释区），全部内容化；另 2 处（:16 头部、算例规则）只引文件名无行号，不动。

```diff
-// v3-14：段顺序固定（docs/content-v2-spec.md:22-26）。**算例** 与 **常见错** 也纳入
+// v3-14：段顺序固定（docs/content-v2-spec.md「怎么做」节：六段式段顺序固定）。**算例** 与 **常见错** 也纳入
...
-// v3-16：「说人话」三段段首命名（docs/content-v2-spec.md:37-39）。旧闸门只数汉字、
+// v3-16：「说人话」三段段首命名（docs/content-v2-spec.md「说人话」节：是什么/为什么发生/什么时候不成立）。旧闸门只数汉字、
...
-  // 14. v3「怎么做」六段顺序固定（docs/content-v2-spec.md:22-26）
+  // 14. v3「怎么做」六段顺序固定（docs/content-v2-spec.md「怎么做」节：段顺序固定）
...
-  // 16. v3「说人话」三段段首标签齐全（docs/content-v2-spec.md:37-39 要求命名）
+  // 16. v3「说人话」三段段首标签齐全（docs/content-v2-spec.md「说人话」节要求命名）
```
内容锚点均已对 spec 现行文本核实（「怎么做」节含「段顺序固定」+ 六段 code block；「说人话」节含三段命名）。改后全脚本注释 0 处 spec 行号引用。

**留一项未动（供队长裁定）**：`scripts/check-content.mjs:389` 的 **fail 消息字符串**内含 `（spec:37-39 要求三段命名…）`——同为 M7 类行号腐烂，但属运行时字符串非注释，任务书明令「只动注释行，不动任何规则逻辑」，故未动。一行改动即可（改为「spec『说人话』节要求三段命名」），请队长定夺。

## 3. canary 判红日志（三支全实测，docs/audit/tmp/t31-canary.log）

```
$ 临时注入后 node scripts/check-content.mjs → exit 1（逐支，还原后 cmp 字节一致）
  林奇：买你看得懂的，在自己生活里找股票.md        （无 keyNumber 条目）
     · 声明了 keyFigure「50」但缺 keyNumber（keyFigure 必须是 keyNumber 的逐字子串）
  亏钱的理念:满仓单吊.md                            （有 keyNumber 条目）
     · keyFigure「99999」不是 keyNumber 的逐字子串（防漂移：必须是 keyNumber 原文中逐字出现的一段）
  亏钱的理念:满仓单吊.md                            （空串注入）
     · keyFigure 为空串（不声明就别写该字段——留空等价于回退机械提取，写空串没有意义）
```
（任务书要求的是越界支 canary；缺 keyNumber 支与空串支一并实测，三支全红。）

## 4. 自检输出（docs/audit/tmp/t31-gates.log）

```
$ node --check scripts/check-content.mjs                    → OK
$ @astrojs/compiler-rs parse('[...slug].astro')             → 0 diagnostics
$ node scripts/check-content.mjs && node scripts/check-compare.mjs
exit 0
✅ 条目格式闸门通过：122 条全部合规（⚠️ 6 条警告 = 基线，名单不变——新断言零存量不触发）
✅ 对照表守卫通过：70 行 src 全部可解析；159 个 nums + 288 个单元格数字 token 全部逐字命中源条目
```

## 5. 交接说明（供验证任务与内容侧）

- **零存量**：122/122 条 front matter 无 keyFigure（grep + yaml 双核），改后渲染大数字与改前逐条一致（122/122 实测）——dist 级验收钩子：
  ```bash
  # 改后 dist 与改前同页大数字应零差异（当前零存量）
  grep -o 'class="qc-figure[^>]*>[^<]*' dist/<任一条目>/index.html
  ```
- **未来内容侧操作**：给某条加大号数字钩子时，在该条 front matter 加 `keyFigure: "−50.9%"` 之类（必须是该条 keyNumber 的逐字子串，含符号/百分号形态），闸门自动守住；不改任何代码。1997 条是首个候选（标志数韩元 −50.9%，现机械提取抓 24.52 中间值）。
- **schema 运行时验证**（keyFigure 声明 → Zod 通过 / 类型 string）归 v1 统一构建覆盖。
- 工作区并行改动较多；本任务 diff 仅 §1/§2 所列（git diff 对 HEAD 另含 t26 checked 规则、t7 rule 21、t24 注释等已交付任务产物，未触碰）。
- 临时产物（审计区）：t31-canary.log、t31-gates.log；条目备份 /tmp/t31-*.md（已 cmp 还原）。
