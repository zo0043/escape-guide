# t20 · P2-B1 交付报告：pages 集合渲染脱离 entryHeadings 连坐（about 页 h2）

- **范围**：仅 `src/lib/headings.mjs`（+14/−1，单一 hunk）。`astro.config.mjs` 未动（理由见 §1）。
- **未做**：未跑 npm run build / astro build（dist 级复核归验证任务）；未 commit / push。

## 1. 改法选择理由

任务书给了三个候选：content 级 markdown 配置覆盖 / 集合级 remark 插件拆分 / headings.mjs 内按 front matter 判别跳过。动手前按任务书要求读清了 Astro 7.3.8（本机实际安装版本）的 markdown 渲染链：

1. **Astro 7.3 不存在集合级（或 content 级）markdown 配置**。`astro/dist/vite-plugin-markdown/index.js` 的 transform 用**单例**全局 renderer 处理所有 `.md`（含内容集合条目，`hasContentFlag(id, MARKDOWN_CONTENT_ENTRY_FLAG)` 与页面 md 走同一 handler）：`renderer = md.processor.createRenderer({…})` 只从全局 `settings.config.markdown` 构建一次，`render(content, { fileURL, frontmatter })` 按文件传 frontmatter。`defineCollection`（`astro/dist/content/config.js`）对 config 原样透传，没有任何 markdown 键参与渲染选项解析。→ 候选 1、2 在此版本**无配置面可用**，任务书所述「content 级 > 集合级 > 全局」优先级在本安装版不成立（新版 Astro 可能引入，7.3.8 没有）。
2. **front matter 在插件内可达**：`@astrojs/markdown-remark/dist/index.js:85-94`（纯 md 渲染路径）构造 `VFile({ data: { astro: { frontmatter } } })` 再走 unified 管线——rehype 插件第二参 `file` 即该 VFile，`file.data.astro.frontmatter` 可直接读。
3. **判别字段可靠**：条目 front matter 必填 `chapter`+`layer`（`src/content.config.ts` 的 Zod schema 构建期强制；实测 122/122 条目双有），静态页集合 schema 仅 `title`+`description`（about.md 无此二字段）。→ 候选 3 成立且最小。
4. **跳过粒度取整插件**（h2 稳定 id / mod-* 包裹 / 四段式标记 / 表格卡片化 全部跳过，而非只跳 mod-* 包裹）：任务标题与修法是「走**不带 entryHeadings** 的 processor」，且 P-22 明确点出第二个风险——about 页「将来若新增与五节同名的 h2 会被误挂 id」（about 现有 h2「来源规则」与五节名「来源」只差「规则」二字，部分隔离等于没隔离）。about.md 现行内容对 2/3/4 三步本就是空操作（五节示例 h2 在 ```text 代码围栏内、无段首四段式标记、表格仅 3 列），整体跳过对现有 about 页的实际变化恰等于只去掉 mod-* 包裹，且对未来内容更稳。

**改法**：`headings.mjs` 的 transformer 签名 `(tree)` → `(tree, file)`，首部加守卫——`file.data.astro.frontmatter` 缺 `chapter` 或 `layer`（非 string）即整体 return。条目页（chapter+layer 齐）执行路径与原代码**逐语句一致**（守卫是唯一新增分支，且对条目恒为 false）。

## 2. diff 摘要（唯一 hunk，src/lib/headings.mjs）

```diff
 export default function entryHeadings() {
-  return (tree) => {
+  return (tree, file) => {
+    // P2-B1（02-P-22，2026-10-12）：全局 processor 命中所有 markdown，pages 集合
+    // （about.md 等静态页）被连坐——h2 挂条目式 mod-* 类，将来若静态页出现与五节
+    // 同名的 h2 还会被误挂稳定 id。本插件对静态页整体跳过（不是只跳 mod-* 包裹：
+    // 「来源规则」这类 h2 与五节名只差几个字，部分跳过等于没隔离）。
+    // 判别依据 front matter：条目 front matter 必填 chapter+layer（content.config.ts
+    // 的 Zod schema 在构建期强制，122/122 条目双有），静态页 schema 只有
+    // title+description。Astro 7.3 的 .md 渲染走唯一全局 renderer
+    // （astro/dist/vite-plugin-markdown 单实例 createRenderer，无集合级 markdown
+    // 配置），配置层拆不出「pages 专用 processor」，故在插件内判别——这是最小改法。
+    // 条目页（chapter+layer 齐）走原有全部代码路径，行为逐字等价。
+    const fm = file?.data?.astro?.frontmatter;
+    if (!fm || typeof fm.chapter !== 'string' || typeof fm.layer !== 'string') return;
+
     // 1. h2 挂 id
```

`extractWhenSentence`（纯函数，`[...slug].astro` 直接 import）不在 transformer 内，不受影响。

## 3. 条目页 processor 等价性自查（回归红线）

方法：不做 build，用 **astro 构建同款渲染链**（`@astrojs/markdown-remark` 的 `unified({remarkPlugins:[wikilinks 注入 linkIndex], rehypePlugins:[entryHeadings]}) → createRenderer → render(body, {fileURL, frontmatter})`，frontmatter 走 vfile.data.astro 进插件，与 vite-plugin-markdown 一致）对**全部 122 条真实条目 + about.md** 各渲染一遍：

- **A. 旧插件（`git show HEAD:src/lib/headings.mjs` 存为 `docs/audit/tmp/t20-headings-old.mjs`）vs 新插件**，同一份真实 front matter：
  **122/122 条目 HTML 逐字节一致**（不是「mod 类还在」这种弱断言，是全量字节等价）。
- **B. about.md 连坐解除**（同一渲染链）：
  - 改前：`mod-*` 段 = **4**（缺陷实存：4 个真实 h2 双链怎么用/条目格式/证据等级/来源规则 各被包一层 `<section class="mod mod-generic">`；五节名 h2 示例在 ```text 围栏内不参与）
  - 改后：`mod-*` = **0**，`howto-part` = 0，`part-label` = 0，`table-cards` = 0；h2 数仍 = 4（h2 本体与 Astro 核心 `rehypeHeadingIds` 的中文 id 保留——id 来自核心插件不在 entryHeadings 内，P-22 的「中文 id 锚点可用」不受影响）
- 渲染面普查：markdown 仅两个入口（escape 122 条 + pages 1 页），`src/pages/` 无 .md——无第三类被守卫误伤的渲染面。
- 产物留档：`docs/audit/tmp/t20-about-before.html` / `t20-about-after.html`（可 diff 目检）。

dist 级复核钩子（供验证任务，v1 构建后）：
```bash
grep -c 'class="mod ' dist/about/index.html                      # 期望: 0
grep -o '<section class="mod mod-[a-z]*">' dist/<任一条目>/index.html | sort | uniq -c  # 期望: 五节/六节 mod-* 段照常
```

## 4. 自检输出

```
$ node docs/audit/tmp/t20-equivalence.mjs     （日志 docs/audit/tmp/t20-equivalence.log）
A. 条目页新旧渲染逐字节一致: 122/122
B. about.md 改前: mod-* 段 = 4（缺陷存在应为 >0）
B. about.md 改后: mod-* 段 = 0，howto-part = 0，part-label = 0，table-cards = 0（应全 0）
B. about.md 改后 h2 数 = 4（h2 本身与核心 heading-id 保留）
PASS（exit 0）

$ node scripts/check-content.mjs && node scripts/check-compare.mjs   （日志 docs/audit/tmp/t20-gates.log）
exit 0
✅ 条目格式闸门通过：122 条全部合规（⚠️ 6 条警告 = 基线）
✅ 对照表守卫通过：70 行 src 全部可解析；159 个 nums + 288 个单元格数字 token 全部逐字命中源条目
```

## 5. 备注

- 工作区有大量队友并行改动（about.md、wikilinks.mjs、[...slug].astro、topic/、aliases.astro、100+ 条目 md 等，属 B 批其它任务）；本任务 diff 仅 headings.mjs 单 hunk（`git diff src/lib/headings.mjs` = +14/−1）。
- 等价性自查基于当前共享工作区的真实内容（含并行改动）；about.md 若后续再增五节同名 h2，守卫保证其不再被误挂 id/mod-*。
- 临时产物（审计区，保留）：t20-equivalence.mjs（可重跑）、t20-headings-old.mjs（改前插件存档）、t20-{equivalence,gates}.log、t20-about-{before,after}.html。
