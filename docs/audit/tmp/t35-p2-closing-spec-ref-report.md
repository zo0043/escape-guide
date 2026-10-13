# t35 · P2 收尾交付报告：check-content.mjs fail 消息 spec 行号引用内容化

- **范围**：`scripts/check-content.mjs` 单一字符串（:389 fail 消息）。
- **未做**：未 build；未 commit / push。

## 1. 前置核实（改前）

- spec 现行「说人话」节（docs/content-v2-spec.md「### 说人话」）确实含三段命名要求：
  「从 1 段扩到 **3 短段**…**1. 是什么**…**2. 为什么发生**…**3. 什么时候不成立**」——内容锚点成立，可改。
- grep 全脚本行号引用计数（改前）：
  - `spec:[0-9]` 形式 = **1**（仅 :389 fail 消息字符串；t31 已把 4 处注释内容化）
  - `content-v2-spec.md:[0-9]` 形式 = **0**

## 2. diff（改前/改后字符串）

```diff
-      fail(f, `「说人话」缺段首标签：${miss.join(' / ')}（spec:37-39 要求三段命名，纯加字即可，不动正文）`);
+      fail(f, `「说人话」缺段首标签：${miss.join(' / ')}（spec「说人话」节要求三段命名，纯加字即可，不动正文）`);
```
只动行号引用部分（`spec:37-39` → `spec「说人话」节`），消息其余文字逐字保留。运行时字符串（非注释）里 grep 确认无其它 spec:NN 行号引用——**改前仅此 1 处，无遗漏**。

## 3. 自检输出（docs/audit/tmp/t35-gates.log）

```
$ grep -c 'spec:[0-9]' scripts/check-content.mjs            → 改后 0
$ grep -c 'content-v2-spec.md:[0-9]' scripts/check-content.mjs → 改后 0
$ node --check scripts/check-content.mjs                    → OK
$ node scripts/check-content.mjs
exit 0
✅ 条目格式闸门通过：122 条全部合规
⚠️  6 条警告（不阻断构建）——与 t31 基线日志逐字 diff 一致（diff 无输出，名单不变）
```

## 4. 备注

- 该 fail 消息仅在「说人话」缺段首标签时打印（当前 122 条全绿，不触发）——本次改动对当前构建输出零影响，属文案防腐。
- 工作区并行改动较多；本任务 diff 仅此 1 行（git diff 对 HEAD 另含 t7/t24/t26/t31 等已交付任务产物，未触碰）。
- 临时产物（审计区）：t35-gates.log。
