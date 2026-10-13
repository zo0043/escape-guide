# t8 交付报告 · P0-4：移动端页头导航溢出/压塌修复（02-P-01）

- 实施人：ux-analyst · attempt 8524bb88-2b14-4178-b522-a180dd8ae6c0
- 依据：docs/audit/00-final-report.md §7 第 3 步 P0-4、§6 附录 A-1、02 报告 P-01
- 改动文件：仅 `src/styles/global.css`（`src/layouts/Base.astro` 未动——横滑方案纯 CSS 即可成立，结构无需调整）
- 零 JS 不变式：保持（纯 CSS 改动，未引入任何 `<script>`）
- 未运行 `npm run build`（v0 统一构建）；dist 级 grep 验证留给 v0/v1

## 1. CSS diff 摘要

```diff
 /* ============ 页头 ============ */
+/* P0-4（02-P-01）：height→min-height。锁高时窄屏内容无处可去（压塌或裁剪）；
+   改 min-height 后即使个别环境出现换行，页头是长高而不是裁剪。
+   var(--header-h) 仍被 .section-chips 的 top 与 h2 的 scroll-margin-top 引用——
+   正常布局下页头实际高度不变（nav 横滑、不再撑破），只是不再强制锁死。 */
 .site-header {
   position: sticky;
   top: 0;
   z-index: 30;
-  height: var(--header-h);
+  min-height: var(--header-h);
   ...
 }
 .site-title {
   ...
+  flex-shrink: 0; /* P0-4：站名保持完整，收缩预算全部给 nav 的横滑窗口 */
 }
-.site-nav { margin-left: auto; display: flex; gap: 1.2rem; font-size: 0.86rem; }
-.site-nav a { text-decoration: none; color: var(--fg-dim); }
+/* P0-4（02-P-01）：窄屏 nav 横滑——与 .section-chips 同手法（overflow-x:auto + 藏滚动条，零 JS）。
+   overflow 容器自动把 flex 最小尺寸钳到 0，nav 不再把页头撑出视口；
+   a 加 white-space:nowrap 保持单行滚动条带——否则 CJK 的 min-content 是 1 字宽，
+   链接会折成多行窄列（正是 02-P-01 描述的「压塌」形态）。
+   宽屏下内容放得下，无滚动、视觉与改前一致。 */
+.site-nav {
+  margin-left: auto;
+  display: flex;
+  gap: 1.2rem;
+  font-size: 0.86rem;
+  min-width: 0;
+  overflow-x: auto;
+  scrollbar-width: none;
+  -webkit-overflow-scrolling: touch;
+}
+.site-nav::-webkit-scrollbar { display: none; }
+.site-nav a { text-decoration: none; color: var(--fg-dim); white-space: nowrap; }
```

设计要点：
1. **横滑**：`.site-nav` 成为 `overflow-x:auto` 滚动容器（与既有 `.section-chips` 完全同手法）。overflow 容器的 flex 自动最小尺寸被钳到 0，nav 收缩窗口 = 页头剩余空间，超出部分在 nav 内部滚动——页面级横向溢出消失。
2. **单行条带**：`.site-nav a { white-space:nowrap }` 是关键补件。CJK 文本的 min-content 是 1 字宽，不加 nowrap 时链接会折成多行窄列（P-01 描述的「压塌」形态）；nowrap 后每条链接 min-content = 完整宽度，滚动条带保持单行。
3. **min-height 代替锁高**：`var(--header-h)` 仍被 `.section-chips { top }` 与 `.entry-body h2 { scroll-margin-top }` 引用，变量不动；正常布局下页头实际高度仍为 3.6rem（内容单行），只是不再强制——万一某环境换行，页头长高而非裁剪。
4. **站名 `flex-shrink:0`**：收缩预算全部给 nav 横滑窗口，站名（兼首页链接）完整可见。
5. **宽屏零感知**：≥861px 时 nav 内容放得下（推算见 §2），无溢出→无滚动，滚动条又已隐藏，视觉与改前一致。≤860px 隐藏次级锚点的既有规则（`global.css:114-117`）未动。

## 2. 375px 布局推算（改后）

参数：≤640px 基础字号 16px（`global.css` 640px 媒体查询）→ 1rem=16px；`.wrap` 内边距 1.35rem=21.6px×2=43.2px；站名 8 个 CJK × 1.06rem(16.96px) ≈ 137px（`flex-shrink:0`）；header 间距 1.2rem=19.2px；nav 字号 0.86rem=13.76px/字（≤860px 时 gap 0.9rem=14.4px）。

**nav 可用窗口 = 视口 − 43.2（padding）− 137（站名）− 19.2（间距）**

| 视口 | nav 窗口 | 首页 nav 内容（6 链接，319.5px） | 子页 nav 内容（4 链接，235.7px） | 结果 |
|---|---|---|---|---|
| 320px | 120.6px | 开始/六域/目录 可见，余 198.9px 横滑 | 目录/别名索引 可见 + 关于本站 露 9px，余横滑 | 自含横滑 ✓ |
| 360px | 160.6px | 开始/六域/目录 + 别名索引 63% | 目录/别名索引/关于本站 90% | 自含横滑 ✓ |
| **375px** | **175.6px** | **开始/六域/目录/别名索引 91% 可见**，关于本站/主站博客 横滑 | **目录/别名索引/关于本站 全可见**，主站博客 横滑（60px） | 自含横滑 ✓ |
| 414px | 214.6px | 开始/六域/目录/别名索引/关于本站 62% | 4 链接中前 3 全可见 + 主站博客 62% | 自含横滑 ✓ |

- 375px 首页首屏可见的正是移动端最关键的四个入口（开始、六域、目录、别名索引）；「关于本站/主站博客」一次左滑可达。子页 375px 下三个站内链接全可见。
- 页面横向宽度 = 视口宽度（滚动被收纳在 nav 元素内部，不产生页面级横向滚动条）。
- 页头高度保持 3.6rem（单行），sticky section-chips 的 `top: var(--header-h)` 与 h2 `scroll-margin-top` 不受影响。
- 宽屏对照（≥861px，17px 基础）：8 链接首页 nav 内容 ≈ 493.6px，页头总需 ≈ 708px < 861px → 放得下、无滚动，视觉与改前一致。
- 对照改前（02-P-01 实测推算）：375px 首页 nav 最小内容宽 ≈ 519px > 可用 332px → flex 收缩触发 CJK min-content 折行 + 锁高裁剪。改后该冲突不存在。

（上表为字号/字宽算术估算；确切像素与滚动观感以浏览器目检为准，见 §4。）

## 3. 自检输出

```
$ node scripts/check-content.mjs
✅ 条目格式闸门通过：122 条全部合规
⚠️  7 条警告（不阻断构建）：…（均为既有 disputed 漏标警告，与改前基线一致，非本次改动引入）
exit=0
```

其他验证：
- `git diff -- src/styles/global.css src/layouts/Base.astro`：改动范围 = global.css 页头区 3 处（§1 diff）；Base.astro 无改动。
- CSS 花括号配平检查：OK（python 逐字符计数，depth 归零无负深）。
- 改动文件 grep 无 `<script>`；未运行 `npm run build`。
- **dist 级验证（v0/v1 执行）**：构建后 `grep -o 'site-nav[^}]*overflow-x:auto' dist/_astro/*.css` 应命中（minify 后形如 `.site-nav{...overflow-x:auto...}`）。

## 4. 留浏览器目检清单（对应 00-final-report 附录 A-1 第 1 项，P0-4 修后复验）

本机无 headless 浏览器，以下无法代验，交付后须在真实浏览器确认：

1. **320/360/375/414px 四断点**：页面无横向滚动条（横向滚动只发生在 nav 条带内部）；页头无垂直压塌/裁剪；nav 保持单行高度（站名不折行）。
2. **375px 首页**：首屏可见 开始/六域/目录/别名索引；左滑 nav 露出 关于本站/主站博客；nav 内横滑手势与页面纵向滚动的轴锁定行为（iOS Safari / Android Chrome / 桌面触控板各测一次）。
3. **键盘可达性**：Tab 聚焦到 nav 中被隐藏（需横滑才可见）的链接时，浏览器是否自动滚动其进入视口（focus 时 scrollIntoView 行为）。
4. **sticky 叠加**：条目页长文滚动时，页头 + section-chips 双层 sticky 位置与改前一致（chips 顶部仍贴页头底边）。
5. **深/浅两套主题**：nav 横滑状态下 backdrop-blur 背景与 hover 变色正常。
6. **≥861px 回归**（861/1024/1280）：8 链接首页页头布局与改前像素一致（右对齐、无滚动条）。
7. **极端情况**：浏览器 50%/200% 页面缩放下页头不塌（min-height 兜底生效）。

## 5. 备选方案未采用的理由

报告备选的 `<details>` 汉堡未用：横滑方案纯 CSS 即成立（与站点既有 `.section-chips` 手法一致，维护面最小），且保留「所有入口一行可见/可滑」的杂志风横向导航，不引入点击层级。汉堡仅在「横滑在真机目检中被判为不可用」（如轴锁定手感不可接受）时才需要——若目检（§4-2）不通过，再回切汉堡不迟（结构改动同样限于 Base.astro nav 区，约 30 分钟）。
