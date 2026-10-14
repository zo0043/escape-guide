# 逃生指南

> 先别亏钱。

面向 A 股散户的中文投资科普静态站:124 条 / 约 45 万字,覆盖六域 × 四层——市场与周期、理念与理论、人性与心理、规则与制度、风险与防守、实务与查证(21/39/29/10/18/7 条);条目分理念 / 执行 / 档案 / 工具四层。定位一句话:**只教方法,不荐股、不预测、不承诺收益**。

核心差异化是**可验证性**:证据分 A/B/C 三级(有争议的条目标 `disputed` 并附反证)、每个关键数字可逐字回源复算、构建期内容闸门强制体例——三条都用机器守住,人改不坏。

## 技术

- **Astro 7 静态站,零 JS**:139/139 页无运行时脚本、无外部资源请求,本地字体,明暗双主题,页均约 7.6 KB gz
- **双链网络**:1972 处 `[[…]]` 双链由构建期 remark 插件解析,0 死链 0 孤岛
- **构建期内容闸门**(`scripts/check-content.mjs` 条目闸门,23 条规则,v7 + `scripts/check-compare.mjs` 对照表数字守卫):五节体例、六段顺序、字数下限、数字口径、双链可解析、表数字逐字回源……非 0 退出就没有构建产物,`npm run build` 永远先跑这两个脚本
- **对照表页**:`src/data/compare.json` 5 张表 80 行(含「触发索引」:冲动时刻→先做这条→回链条目),数字必须是源条目 `keyNumber` 的逐字子串、每行可点回条目(闸门断言)

## 快速开始

```bash
# 需要 Node 22(系统 v18 跑不了 Astro 7)
export PATH=~/.nvm/versions/node/v22.23.2/bin:$PATH

npm i
npm run dev        # 本地开发
npm run build      # 先跑内容闸门,再构建(闸门红 = 无产物)
npm run check      # 只跑闸门(check-content + check-compare)
npm run preview    # 预览构建产物
```

`dist/` 已 gitignore,随时可删重建,旧产物不可依赖。

## 目录结构

```
src/
  content/escape/     # 124 条内容(markdown + frontmatter)
  pages/              # index / [...slug] 条目页 / topic/[domain] 域页
                      # compare/[table] 对照表 / about / aliases / 404 / rss.xml
  layouts/Base.astro  # 全局布局
  styles/global.css   # 全部样式(含 print)
  lib/                # entries / paths / aliases / wikilinks / slug / headings
  data/compare.json   # 对照表数据
scripts/
  check-content.mjs   # 条目格式闸门(23 条规则,与 about 页体例合同逐条对齐)
  check-compare.mjs   # 对照表数字逐字回源守卫
docs/
  handover.md         # 交接文档:现状 / 行动清单 / 决策日志(接手者必读)
  content-v2-spec.md  # 内容 v2 规格(唯一写作依据)
  audit/              # 2026-10-12 三方审计与实施记录
  20261015-escape-principle-review.md  # 逃生第一性原理审查(2026-10-15)
```

## 改动前必读:五条不变式

1. **零 JS**:不引入任何运行时脚本/外部资源。搜索、追踪、表单一律不做。
2. **数字逐字回源**:对照表与 `keyFigure` 中的数字必须是条目 `keyNumber` 的逐字子串,闸门已断言。
3. **title 即身份**:双链与对照表全靠标题解析,**永不合并/重命名条目**(同题收口用对照表 + 备注)。
4. **体例五段**:速览 4 卡 → 白话 → 怎么做六段(什么时候用/步骤/算例/常见错/做完你会得到/怎么算过关)→ 收益成本 → 来源(逐源"已核 YYYY-MM-DD")→ 备注。
5. **证据纪律**:evidence A/B/C(disputed 条目必须带反证);"语义层仅人工审计,机器只防机械错"是站内的诚实声明。

## 内容条目格式

frontmatter 分两组(结构校验在 `src/content.config.ts`,正文结构校验在闸门):

- **必填**:`title`(即身份,永不改名)、`description`、`chapter`(六域白名单)、`layer`(理念/执行/档案/工具)、`cost{money,time,will}`、`gain`、`metric`(亏损/收益/时间/自由/处罚)、`evidence`(A/B/C)、`checked`(来源核对日,即说法保质期)
- **可选**:`aliases`、`date`、`weight`、`disputed`(A/B 级有反方证据时置 true)、一屏速览四卡字段 `lede / when / keyNumber / keyFigure / maxRisk`、`tags`

约束:`keyFigure` 声明了就必须是 `keyNumber` 的逐字子串(闸门机检);缺省时速览卡回退"首个数字串"机械提取,故建议显式声明。

写作以 `docs/content-v2-spec.md` 为唯一依据;单条验证:`node scripts/check-content.mjs --only "<文件名特征串>"`。闸门规则与 `src/content/pages/about.md` 的"条目格式"节一一对应,改闸门必须同步改 about 页(不一致时以闸门为准)。

## 部署

GitHub Pages 子路径 **`https://blog.zero43.top/escape-guide/`**,不单独配 DNS:账号级自定义域 `blog.zero43.top`(配置在 `zo0043.github.io` 仓库)被同账号项目站点继承,因此**本仓库 Pages 设置里 cname 必须留空**——填了就会变成独立域名,那时才需要 DNS。

改回独立域名 `escape.zero43.top` 的做法见 `astro.config.mjs` 头部注释。

## 状态

- 结构:124 条字段齐全,双链 1972 处 0 断链 0 孤岛,139 页 sitemap 138(404 有意不入)
- 2026-10-16 已落地:工程缺陷批 D1–D9(handover §3)、第一性审查 7 项 IA 调整(总纲卡/路径终点/证据层降格/编号坐标声明/「本站不是什么」/长文桥/触发索引)、退出端 2 条新条目(盈利侧离场 + 再平衡)与地图接线、05 域五条边界措辞
- 待站长操作:GitHub 仓库设置 Enforce HTTPS(D4)、旧 /escape/ 路径 301(D8);拍板中的 ICP / 分发载体 / 变更日志节奏(handover §8);P1 行动清单(handover §5)未动
