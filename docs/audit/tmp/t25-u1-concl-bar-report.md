# t25 交付报告 · P2 U-1：条目页 sticky「结论条」

- 实施人：ux-analyst · attempt d76e0017-b8e8-4858-9aff-0a41d4b39870
- 依据：00-final-report.md §5.1（:211 起，含示例 HTML/CSS）+ 02 报告 U-1
- 改动文件（仅任务所列 2 个；本任务 hunk 以 `grep 'U-1'` 切分，两文件共 5 处注释标记；同文件另有 Phase 0/1 已交付 hunk 并存）：
  - `src/pages/[...slug].astro`——front matter 结论条数据计算（+11 行）+ header 后/quick-cards 前插入结论条（+20 行）
  - `src/styles/global.css`——`.concl-bar` 样式块（+45 行，含 639px 窄屏块）+ `.section-chips` top 偏移 + `.entry-body h2` scroll-margin + 打印隐藏清单
- 零 `<script>` 不变式：保持（[...slug].astro grep = 0）；未跑 build、未 commit/push

## 1. diff 摘要

**模板（[...slug].astro）**
1. front matter：`hasQuick = Boolean(d.lede && d.when && d.keyNumber && d.maxRisk)` + `conclNum = d.keyNumber ? keyFigure(d.keyNumber) : ''`——数据全部现成，大数字**复用既有 keyFigure 正则**（t11 同款，:53-56）；注释注明 t29 keyFigure 字段落地后直接切换、本任务不预实现。
2. markup：`</header>` 之后、`<div class="quick-cards">` 之前插入（§5.1「header 之后、section-chips 之前」取最上沿位置——加载即可见，P-07 结论常驻的意图）：
   ```
   .concl-bar
   ├─ .cb-title          标题（nowrap+ellipsis，title 属性兜全文）
   ├─ .dir-ev.ev-A/B/C   ev 徽标——复用目录同款全局徽章（.dir-ev.ev-A/B/C 已全局定义，
   │                     零新徽章类；§5.1 示例的 class="ev ev-A" 无全局 CSS，不照抄类名）
   ├─ .cb-num            mono 大数字（keyFigure 提取；无数字不渲染）
   └─ .cb-risk           「最大风险：{maxRisk}」（前缀补在条内——字段本体无前缀，
                         示例 HTML 亦带前缀；nowrap+ellipsis+title 兜底）
   降级形态（无四字段）：cb-title + ev 徽标 + .cb-meta「收益档位 X · 量纲 Y」（E2 措辞，与速览卡 3 回落同源）
   ```

**CSS（global.css）**
- `article:has(.concl-bar) { --concl-h: 2.2rem; }`——**单一来源**的条形高度变量：仅条目页 article 注入，其他页面 0 偏移、行为不变。条形 `height: var(--concl-h)` 固定（单行 + 全 span nowrap/ellipsis 设计 → 高度确定），使双层 sticky 可精确叠加。
- `.concl-bar`：`position:sticky; top:var(--header-h); z-index:20`（与 section-chips 同档；nav-drop 29、页头 30 仍在上，展开下拉不遮挡——任务书层级约束）；半透明 bg + blur 与页头/chips 同语言。
- `.section-chips { top: calc(var(--header-h) + var(--concl-h, 0rem)) }`——条目页 chips 落到结论条下沿，**消除同 top 重叠**（否则 DOM 靠后的 chips 会盖住结论条）；非条目页无 chips，无影响（.section-chips 仅 [...slug].astro 使用，已 grep 确认）。
- `.entry-body h2 { scroll-margin-top: calc(var(--header-h) + var(--concl-h, 0rem) + 3.2rem) }`——锚点跳转越过 页头+结论条 双层（原式仅 +3.2rem 是为 chips 预留，结论条新增 2.2rem 不补偿会被盖）。
- `@media (max-width: 639px) { .cb-risk { display: none } }`——窄屏只留 标题+ev+大数字（§5.1 示例 CSS）。
- 打印隐藏清单加 `.concl-bar`（sticky 装饰，与速览卡内容重复；打印保留 quick-cards 承载同样事实）。

## 2. 有/无字段两形态渲染说明（build-proxy 全 122 条模拟）

| 形态 | 条件 | 覆盖 | 条内内容 |
|---|---|---|---|
| 完整 | lede+when+keyNumber+maxRisk 齐（实测 all-or-nothing） | **41/122** | 标题 + ev 徽标 + 大数字 + 「最大风险：…」 |
| 降级 | 无速览四字段 | **81/122** | 标题 + ev 徽标 + 「收益档位 X · 量纲 Y」 |

- 122/122 条 evidence ∈ {A,B,C}（分布 A29/B76/C17），badge 类 `.dir-ev.ev-A/B/C` 全覆盖；gain/metric 无缺失；41 条完整形态 keyFigure 提取无空值。
- 样例·完整：`1637郁金香狂热:第一场有记录的泡沫` → [C] `1630` + 最大风险：把流传的「涨了几百倍」当事实引用……
- 样例·降级：`12386与投诉三通道` → [B] 收益档位 中 · 量纲 时间
- 1997 型长 keyNumber（114 字）：条内只取大数字（keyFigure 首数字串），完整口径在下方速览卡 3 的 `details.完整口径`（P1-11 既有），不整段塞入。
- maxRisk 长度实测：中位 68 字、19/41 超 70 字、最长 108 字——桌面 70rem 容器单行约容 80 字，超长条 ellipsis 截尾 + `title` 悬停兜全文；全文常驻在下方速览卡 4（结论条定位为「压缩索引」，P-07 的完整载体是卡片）。

## 3. 自检输出

1. `node scripts/check-content.mjs` → **exit 0**（122 条合规，既有警告与基线一致）。
2. `node scripts/check-compare.mjs` → **exit 0**（70 行 src 全解析；159 nums + 288 token 逐字命中）。
3. CSS 花括号配平：OK。
4. 类集合比对（AGENTS.md #9）：新类 5 个（.concl-bar/.cb-title/.cb-num/.cb-risk/.cb-meta）CSS 定义与模板输出双向在场；复用类（.dir-ev.ev-*）CSS 既有——无悬空类、无未定义输出。
5. 结构断言（python）：concl-bar sticky top=var(--header-h) ✓、z-20 ✓、639px 隐藏 .cb-risk ✓（:644）、chips top 含 --concl-h ✓、h2 scroll-margin 含 --concl-h ✓、--concl-h 定义处 = 1 ✓、DOM 顺序 header<bar<quick-cards ✓、打印清单含 .concl-bar ✓、模板 0 `<script>` ✓。
6. build-proxy 全量模拟（122 条）：41/81 两形态、无缺 gain/metric、无空 keyFigure、evidence 全合法（§2）。
7. 未新增 CSS 依赖；:has() 支持基线与站点既有 color-mix/backdrop-filter 同级（现代浏览器），:has 不可用时 --concl-h 落 0 回退（chips 与条同 top 重叠但内容可读，属降级不破损）。

## 4. 留目检项（并入验证任务目检清单，附录 A-9 升级）

1. **双层 sticky 叠加**（验收注意项）：条目页滚动——页头(3.6rem)+结论条(2.2rem)+chips(≈2.7rem) 窄屏合计 ≈8.5rem，对正文挤压观感（≤640px 与 641–1180px 各看）。
2. 完整形态：长条目（如 1997 条）滚到 20 屏外抬头——标题/等级/大数字/最大风险一行可读；maxRisk 超长条的 ellipsis 截点是否伤语义（19 条 >70 字，重点看 108 字那条）。
3. 降级形态：81 条中抽看（如 12386 条）——「收益档位·量纲」信息量是否够「结论条」名。
4. chips 与结论条的 1px 双 border 相邻观感（两条下边框贴叠）；半透明 bg 下正文滚动穿透的虚化观感（两主题）。
5. 锚点跳转：点 chips「怎么做/来源」——h2 落位是否恰好越过多层 sticky（scroll-margin 补偿 2.2rem 后的观感）。
6. 窄屏（≤639px）：结论条只剩 标题+ev+大数字，.cb-risk 隐藏后空间是否过空（可判是否加「最大风险→卡片 4」暗示）。
7. 打印预览：结论条不出现、速览卡 2×2 保留（与 t17 A5 联动）。

## 5. 范围外记录

- t29（keyFigure 字段，技术链）落地后，`.cb-num` 与速览卡 3 的 figure 提取应切换为直接消费该字段（本任务注释已留切换点），勿在后续任务重复正则逻辑。
- 既有观察（非本任务引入，未改）：`.entry-body h2` 原 scroll-margin（+3.2rem）在加结论条前对 chips 层（≈2.7rem）的预留偏紧 0.5rem——本次 +2.2rem 后总预留 5.4rem > 双层 4.9rem，锚点落位反而变正确；若目检仍偏上，属一行内微调。
- §5.1 示例的 `class="ev ev-A"` 未照抄：全局 CSS 无裸 `.ev` 规则，改用既有全局徽章 `.dir-ev.ev-*`（零新徽章类、与目录徽章同视觉语言）。
