# t28 · P2-C10 交付报告：RSS pubDate 回退 date + sitemap lastmod

- **范围**：`src/pages/rss.xml.js`（1 行逻辑 + 4 行注释）、`astro.config.mjs`（1 行 + 4 行注释）。
- **未做**：未 build（dist 级验证归验证任务）；未 commit / push。

## 1. diff 摘要

### src/pages/rss.xml.js:20
```diff
-        pubDate: e.data.checked ?? e.data.date ?? new Date(),
+        // P2-C10（03-T8）：pubDate 优先取条目 date（RSS 时间线=内容时间），
+        // 无 date 回退 checked（来源核对日期）。现有条目 date 与 checked
+        // 全同值（写下即核对），改后输出与改前一致；今后若把 date 与
+        // checked 分离，RSS 时间线即跟随 date。
+        pubDate: e.data.date ?? e.data.checked ?? new Date(),
```

### astro.config.mjs:57
```diff
-  integrations: [sitemap()],
+  // P2-C10（03-T8）：sitemap 补 lastmod。@astrojs/sitemap 3.7.4 的选项形状是
+  // lastmod?: Date（SitemapOptions，全页统一一个值；不设置则完全不输出 <lastmod>，
+  // 没有按页面 mtime 的自动生成）。静态站语义 = 最近构建/部署时间，故取构建期
+  // new Date()（配置加载即构建时刻，GitHub Pages 每次 push 重建即刷新）。
+  integrations: [sitemap({ lastmod: new Date() })],
```

## 2. 配置项形状依据（@astrojs/sitemap 3.7.4，本机实装版本）

- 类型定义 `dist/index.d.ts:7-18`：`SitemapOptions` 中 **`lastmod?: Date`**——单一 Date、全页统一；**不是** boolean、**不是** 函数。
- 包自带 zod schema 运行时验证（`dist/schema.js` 的 `SitemapOptionsSchema`）：
  - `safeParse({ lastmod: new Date() })` → **PASS**
  - 反例 `safeParse({ lastmod: true })` → **FAIL**（预期——任务书备选「只加 lastmod: true」在该版本会非法，故未采用）
- 源码行为（`dist/generate-sitemap.js:3-18`）：`lastmod: lastmodSrc?.toISOString()` 后对**所有页面**统一写入；不设置则 url 数据里无 lastmod 键 → 不输出 `<lastmod>`。**任务书「Astro 按页面 mtime 生成」的说法与该版本实现不符**（无 mtime 自动生成），已在注释中如实记录。
- `new Date()` 取配置加载时刻 = 构建时刻；静态站 lastmod 语义 = 最近构建/部署时间，GitHub Pages 每次 push 重建即刷新，语义正确。
- 附带验证：`node` 直接 `import('./astro.config.mjs')` 加载成功（integrations 对象构建无异常），两文件 `node --check` OK。

## 3. 数据事实更正（重要）

任务书谓「当前 122 条均无 date，行为与改前一致」——**前一分句不实**：实测 122/122 条目**都有** `date` 字段，且与 `checked` 逐条同值（写下即核对的站点惯例，如 12386 条 `date: 2026-10-11` + `checked: 2026-10-11`）。

改后行为**仍然**与改前逐条一致，但原因是「date === checked」而非「date 缺失」：
```
$ yaml 扫描 122 条目
date !== checked 的条目: 0（122/122 同值）
新旧 pubDate 表达式逐条一致: 122/122
pubDate 取值分布（改后 = 改前）: 2026-10-08:41 / 2026-10-11:40 / 2026-10-12:41
```
（分布与 03-T8 审计记载的 41/40/41 三核对日完全一致。）语义收益不变：今后条目若把 date（内容时间）与 checked（核对时间）分离，RSS 时间线即跟随 date。代码注释已按事实书写（初稿误引任务书口径，已就地更正，并删去易过期的硬编码计数/日期——M7 同类问题）。

## 4. 自检输出

```
$ node --check src/pages/rss.xml.js && node --check astro.config.mjs
OK（两文件语法通过）
$ node scripts/check-content.mjs && node scripts/check-compare.mjs   （日志 docs/audit/tmp/t28-gates.log）
exit 0
✅ 条目格式闸门通过：122 条全部合规（⚠️ 6 条警告 = 基线）
✅ 对照表守卫通过：70 行 src 全部可解析；159 个 nums + 288 个单元格数字 token 全部逐字命中源条目
```

## 5. dist 级验收钩子（供验证任务，v1 构建后）

```bash
grep -c '<lastmod>' dist/sitemap-index.xml        # 期望: = 页面数（135+）；不设置 lastmod 时为 0
grep -o '<lastmod>[^<]*</lastmod>' dist/sitemap-index.xml | sort -u   # 期望: 单一值 = 构建时刻
grep -o '<pubDate>[^<]*</pubDate>' dist/rss.xml | sort | uniq -c      # 期望: 分布与改前 41/40/41 一致
```

## 6. 备注

- 工作区并行改动较多；本任务 diff 仅 §1 两 hunk（git diff 对 HEAD 的 astro.config.mjs 无其他在制品；rss.xml.js 亦无）。
- 临时产物（审计区）：t28-gates.log；形状验证命令与输出见 §2（可重跑）。
