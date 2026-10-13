# t15 · P1-16 交付报告：404 页 noindex + favicon 引用

- **范围**：仅 `src/layouts/Base.astro` 与 `src/pages/404.astro`（依赖 t8/t11 的 Base.astro 改动已落定，本任务在其后串行）。
- **未做**：未跑 npm run build / astro build（dist 级验证归 v1 统一构建）。

## 1. diff 摘要

### Base.astro（本任务 4 个 hunk；同文件另有 t11 的 P1-9 nav-drop hunk，非本任务产物）
1. **Props**：`interface Props` 加 `noindex?: boolean`（注释：仅 404 页传）；解构行同步 `const { title, description, anchors, noindex } = Astro.props;`
2. **head · 图标（P1-16b，03-T5）**：在原 PNG icon 前插入两行 ico（按 sizes 先后：16 → 32 → 无 sizes 的 PNG）：
   ```html
   <link rel="icon" type="image/x-icon" href={`${B}zo0043_16x16.ico`} sizes="16x16" />
   <link rel="icon" type="image/x-icon" href={`${B}zo0043_32x32.ico`} sizes="32x32" />
   <link rel="icon" type="image/png" href={`${B}zo0043.png`} />
   ```
   两个 ico 均已存在于 `public/`（zo0043_16x16.ico 959B / zo0043_32x32.ico 2940B）。
3. **head · canonical（P1-16a，03-T4）**：无条件输出改条件输出——`{!noindex && <link rel="canonical" …/>}`。非 404 页面表达式为 true，输出与原代码逐字一致。
4. **head · robots（P1-16a）**：三元分支——`noindex ? <meta name="robots" content="noindex,nofollow" /> : (import.meta.env.PROD && <meta name="robots" content="index,follow" />)`。
   - 有意决策：404 的 `noindex,nofollow` **不分 PROD/dev 恒输出**（404 在任何环境都不该被索引；dev 下无 robots meta 的原行为对 404 无意义）。
   - 其余页面分支与原代码完全等价（仅 PROD 输出 index,follow），行为零变化。

### 404.astro
- `<Base title=…>` → `<Base noindex title="走丢了" description="这一页不在逃生路线图里。">`；文件头补 2 行注释说明缘由（404 模板同时是 `/escape-guide/404/` 的可达 200 URL，不 noindex 会被当普通页收录——审计 T4）。
- 全站唯一传 `noindex` 的页面（`grep -rn noindex src --include='*.astro'` 仅 404.astro:14 一处使用）。

## 2. 自检输出

```
$ node -e "parse check（@astrojs/compiler-rs parse，仅语法、无产物）"
parse OK: src/layouts/Base.astro | diagnostics: 0
parse OK: src/pages/404.astro | diagnostics: 0

$ node scripts/check-content.mjs
exit=0
✅ 条目格式闸门通过：122 条全部合规
⚠️  6 条警告（不阻断构建）   ← 与 t6 后基线一致（7→6，前景理论 disputed 后其线索警告消除）
（日志：docs/audit/tmp/t15-check-content.log）
```

## 3. 404 与首页 head 预期差异（供 v1 验收）

v1 构建后 `dist/404.html` 与 `dist/index.html` 的 head 应满足（B = /escape-guide/）：

| 项 | dist/404.html | dist/index.html（及全部其它 134 页） |
|---|---|---|
| robots meta | `<meta name="robots" content="noindex,nofollow">` | `<meta name="robots" content="index,follow">` |
| canonical | **无** canonical link | `<link rel="canonical" href="https://blog.zero43.top/escape-guide/">`（404 改前为自引用 `…/escape-guide/404/`） |
| ico links | 16x16 + 32x32 + PNG 三条（顺序：16、32、png） | 同左 |
| 其它 head（title/desc/og/twitter/rss-alternate/theme-color） | 与改前一致，无变化 | 与改前一致，无变化 |

v1 验收 grep 钩子（在 dist/ 上跑）：
```bash
grep -o '<meta name="robots" content="[^"]*"' dist/404.html            # 期望: noindex,nofollow
grep -c 'rel="canonical"' dist/404.html                                 # 期望: 0
grep -o '<link rel="canonical" href="[^"]*"' dist/index.html            # 期望: https://blog.zero43.top/escape-guide/
grep -c '<meta name="robots" content="index,follow"' dist/*.html        # 期望: 除 404 外 135 页各 1
for f in dist/zo0043_16x16.ico dist/zo0043_32x32.ico; do test -f $f && echo OK $f; done
grep -o '<link rel="icon"[^>]*>' dist/index.html                        # 期望: 3 条（16x16 / 32x32 / png，按此顺序）
```

## 4. 残留说明

- `/escape-guide/404/` 直接访问仍返回 200（静态托管固有行为，noindex + 无 canonical 后 SEO 语义已正确，收录风险解除；彻底消除需 301，超出本任务范围）。
- 留浏览器目检：favicon 在 16/32px 位置正常显示（ico 与 PNG 双声明，浏览器按 sizes 自选）。
