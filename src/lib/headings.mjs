// 条目正文的结构性 rehype 插件（纯视觉层，不改任何正文文字）：
//
//   1. 五节 h2（怎么做/说人话/收益/来源/备注）挂稳定 id —— 供条目页 sticky 页内目录锚点用。
//      固定映射而不是按文字 slug：五节名是闸门强制的常量，映射永远成立，且 URL 锚点不随措辞漂移。
//   2. 四段式标记（**什么时候用**/**步骤**/**做完你会得到**/**怎么算过关**）
//      markdown 渲染出来是 <p><strong>标记</strong>：…</p>，四个段在视觉上毫无区别。
//      这里把 <strong> 换成 <span class="part-label">，并给 <p> 挂
//      class="howto-part howto-<when|steps|output|pass>"，CSS 才能把
//      「触发 → 动作 → 产出 → 验收」渲成四种不同的结构块。
//
// 约束：只改 class/属性，不改文字、不增删节点（除 strong→span 的类型替换），
// 所以验收脚本对「四段式标记文本齐全」「反链数」的断言不受影响。
// 与 wikilinks.mjs 同属构建期插件，不读磁盘、不依赖 import.meta.url。
//
// 2026-10-12 U3/U5 扩充（t8，见 audit-presentation-20261012.md E3/E4/E5/E10）：
//   3. extractWhenSentence(body)：从正文「怎么做」节的 **什么时候用** 段提取首句，
//      供条目页速览卡用——when 字段缺失时由此补齐（当前 122/122 条均有 when，
//      兜底保留；2026-10-13 审计时 88 条缺），零内容改动。
//   4. 表格卡片化：≥5 列的正文表挂 class="table-cards" 且每个单元格带
//      data-label（列名取自 thead），窄屏 CSS 据此把表格转成卡片（零 JS）。
//      2–4 列事实表不动（折行可接受，见 E5）。
//   5. H2_IDS 增加「业绩验证」→ perf：3 条大师条目的第六节由此获得锚点 id
//      与 mod-perf 模块类（原来落进 mod-generic，无 id 无样式，见 E10）。
//
// 2026-10-17 长条目阅读体验（P0+P1）：
//   6. extractToc(body) / countCjk(body) / TOC_MIN_CJK：正文 CJK 字数超阈值的条目页
//      渲染页内 TOC（[...slug].astro 在 quick-cards 后的 details 块，默认关）。
//      extractToc 是 extractWhenSentence 同款的「纯函数读 body」数据通道：按文档顺序
//      收集 h2 五节（+业绩验证，按 H2_IDS）、八问复盘/四副眼镜 h3、四段 part-label p，
//      各带 {text,id,depth}。行扫描与插件转换同形（实测 124/124 条两者输出逐字一致；
//      前提：part-label p 全在顶层、无嵌套 li/引用内——已实测验证）。
//   7. PARTS 补「算例」→ worked、「常见错」→ errors（六段式后两段的同款结构块；
//      算例标记后常跟同段尾注文字如「(假设案例)」，转换只动 leading strong，尾注保留）。
//   8. 八问复盘/四副眼镜 h3 化：p 仅含单个 strong 且文字恰为二者之一 → <h3 id>，
//      文字逐字保留。实测 17 条灾难档案命中（1637 郁金香的 **八问复盘** 带尾注，
//      不是「仅含单个 strong」，不命中——降级安全）。
//   9. 逐条折叠：紧跟上述 h3 的下一个 ul/ol（跳过空白文本节点），每个 li 的首个
//      inline 子节点是 strong 且 strong 文字 ≤32 字时 → <details class="q-item">
//      <summary>strong 文字</summary>其余内容</details>，首条默认 open；任一条件
//      不满足则该 li 原样保留（降级安全，绝不丢文字）。loose 列表（八问条目间空行，
//      2008/2011/2020/2022 四条）解包单段后照常折叠——2026-10-17 补，全 204 条转换 0 降级。
//
// ⚠️ 构建期陷阱（2026-10-17 实测）：Astro 7 的内容层把渲染结果缓存在
//    node_modules/.astro/data-store.json——改本插件后，未改动的 .md 条目仍会命中
//    旧缓存、渲染出旧版 HTML（.astro/dist 都删了也照样中招，只有内容 hash 变的条目
//    会重渲）。验证插件改动必须 `rm -rf .astro dist node_modules/.astro` 后全量重建。
import { visit } from 'unist-util-visit';
import { splitSections } from './entries.mjs';

const H2_IDS = {
  怎么做: 'howto',
  说人话: 'plain',
  收益: 'gain',
  业绩验证: 'perf',
  来源: 'source',
  备注: 'notes',
};

const PARTS = {
  什么时候用: 'when',
  步骤: 'steps',
  做完你会得到: 'output',
  怎么算过关: 'pass',
  // 2026-10-17 P1：六段式后两段（算例尾注保留：转换只动 leading strong）
  算例: 'worked',
  常见错: 'errors',
};

// 2026-10-17 P1：「八问复盘 / 四副眼镜」standalone p（仅含单个 strong）→ h3。
// 固定映射而不是按文字 slug（与 H2_IDS 同思路）：TOC 与 q-item 折叠都靠这两个 id。
const H3_IDS = {
  八问复盘: 'howto-retro',
  四副眼镜: 'howto-lenses',
};

function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if (Array.isArray(node.children)) return node.children.map(textOf).join('');
  return '';
}

// 2026-10-17 P1：q-item 折叠的块级标签集——判定「li 的首个 inline 子节点」时跳过它们。
// loose 列表（条目间有空行）的 li 是 [text"\n", p, text"\n"] 形态 → 解包单段后照常折叠（2026-10-17 补）。
const QITEM_BLOCK = new Set([
  'p', 'ul', 'ol', 'table', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'details', 'section', 'div', 'figure',
]);

function foldQItems(list) {
  if (!Array.isArray(list.children)) return;
  let firstOpen = true;
  for (let i = 0; i < list.children.length; i++) {
    const li = list.children[i];
    if (li.type !== 'element' || li.tagName !== 'li') continue;
    // loose 列表（md 列表项间有空行）：li 唯一元素子节点是单段、其余为空白文本 → 解包段落，
    // 其 children 当作 li 的 inlines（2026-10-17 补：2008/2011/2020/2022 四条的八问为 loose 形态，
    // 实测 hast 为 [text"\n", p, text"\n"] 三子节点，原 length===1 判断不中）
    let kids = li.children ?? [];
    {
      const els = kids.filter((c) => c.type === 'element');
      const rest = kids.filter((c) => c.type === 'text');
      if (els.length === 1 && els[0].tagName === 'p' && rest.every((c) => !c.value.trim())) kids = els[0].children ?? [];
    }
    // 首个 inline 子节点：跳过纯空白文本（hast 的 \n 节点）与块级元素；tight 列表下首个子节点即 strong
    let fin = null;
    for (const c of kids) {
      if (c.type === 'text' && !c.value.trim()) continue;
      if (c.type === 'element' && QITEM_BLOCK.has(c.tagName)) continue;
      fin = c;
      break;
    }
    if (!fin || fin.type !== 'element' || fin.tagName !== 'strong') continue; // 降级：原样保留
    const label = textOf(fin).trim();
    if (!label || label.length > 32) continue; // 降级：标题过长，原样保留
    const idx = kids.indexOf(fin);
    list.children[i] = {
      type: 'element',
      tagName: 'details',
      properties: { class: ['q-item'], ...(firstOpen ? { open: true } : {}) }, // 首条默认 open，其余关
      children: [
        { type: 'element', tagName: 'summary', properties: {}, children: fin.children }, // strong 文字逐字进 summary
        ...kids.slice(idx + 1), // 其余内容原序保留（loose 形态即段落余文）
      ],
    };
    firstOpen = false;
  }
}

function foldAfterH3(parent) {
  if (!parent || !Array.isArray(parent.children)) return;
  for (let i = 0; i < parent.children.length; i++) {
    const n = parent.children[i];
    if (n.type !== 'element') continue;
    if (n.tagName === 'h3') {
      const id = n.properties?.id;
      if (id === 'howto-retro' || id === 'howto-lenses') {
        // 「紧跟的下一个 ul/ol」：跳过空白文本节点（markdown 空行在 hast 里是 \n 文本节点）
        let j = i + 1;
        while (j < parent.children.length && parent.children[j].type === 'text' && !textOf(parent.children[j]).trim()) j += 1;
        const next = parent.children[j];
        if (next && next.type === 'element' && (next.tagName === 'ul' || next.tagName === 'ol')) foldQItems(next);
      }
    }
    foldAfterH3(n); // 递归：1b 步把 h2 及其后续节点包进 section.mod，h3 与列表同在包裹内
  }
}

export default function entryHeadings() {
  return (tree, file) => {
    // P2-B1（02-P-22，2026-10-12）：全局 processor 命中所有 markdown，pages 集合
    // （about.md 等静态页）被连坐——h2 挂条目式 mod-* 类，将来若静态页出现与五节
    // 同名的 h2 还会被误挂稳定 id。本插件对静态页整体跳过（不是只跳 mod-* 包裹：
    // 「来源规则」这类 h2 与五节名只差几个字，部分跳过等于没隔离）。
    // 判别依据 front matter：条目 front matter 必填 chapter+layer（content.config.ts
    // 的 Zod schema 在构建期强制，122/122 条目双有），静态页 schema 只有
    // title+description。Astro 7.3 的 .md 渲染走唯一全局 renderer
    // （astro/dist/vite-plugin-markdown 单实例 createRenderer，无集合级 markdown
    // 配置），配置层拆不出「pages 专用 processor」，故在插件内判别——这是最小改法。
    // 条目页（chapter+layer 齐）走原有全部代码路径，行为逐字等价。
    const fm = file?.data?.astro?.frontmatter;
    if (!fm || typeof fm.chapter !== 'string' || typeof fm.layer !== 'string') return;

    // 1. h2 挂 id
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'h2') return;
      const label = textOf(node).trim();
      const id = H2_IDS[label];
      if (id) node.properties = { ...(node.properties ?? {}), id };
    });

    // 1b. 每一节（h2 起、到下一个 h2 前）包进 <section class="mod mod-<id>">，
    // 让「怎么做/说人话/收益/来源/备注」五个节各自成为一种视觉模块，而不是同一种正文。
    // 只加包裹节点，不改动原有节点的内容与顺序。
    if (Array.isArray(tree.children)) {
      const out = [];
      let current = null;
      for (const child of tree.children) {
        const isH2 = child.type === 'element' && child.tagName === 'h2';
        if (isH2) {
          const id = child.properties?.id;
          current = {
            type: 'element',
            tagName: 'section',
            properties: { class: ['mod', id ? `mod-${id}` : 'mod-generic'] },
            children: [child],
          };
          out.push(current);
        } else if (current) {
          current.children.push(child);
        } else {
          out.push(child); // h2 之前的导语/前言保持原位
        }
      }
      tree.children = out;
    }

    // 2. 四段式标记：p 的第一个子节点是 strong 且文字命中 → 结构化
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'p' || !Array.isArray(node.children)) return;
      const first = node.children[0];
      if (!first || first.type !== 'element' || first.tagName !== 'strong') return;
      const part = PARTS[textOf(first).trim()];
      if (!part) return;
      const label = {
        type: 'element',
        tagName: 'span',
        properties: { class: ['part-label'] },
        children: first.children,
      };
      node.children[0] = label;
      // 2026-10-17 P0：part-label p 挂稳定 id（howto-<key>）——页内 TOC 锚点，
      // 与 extractToc 同一映射。六段标记各至多一次（闸门规则 14 固定段序 +
      // 实测 124/124 条无重复），id 不撞。
      node.properties = {
        ...(node.properties ?? {}),
        class: ['howto-part', `howto-${part}`],
        id: `howto-${part}`,
      };
    });

    // 2a. 八问复盘/四副眼镜：p 仅含单个 strong 且文字命中 → h3（TOC 深潜小节 + q-item 折叠的锚点）
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'p' || !Array.isArray(node.children)) return;
      if (node.children.length !== 1) return;
      const only = node.children[0];
      if (only.type !== 'element' || only.tagName !== 'strong') return;
      const id = H3_IDS[textOf(only).trim()];
      if (!id) return;
      node.tagName = 'h3';
      node.properties = { ...(node.properties ?? {}), id };
    });

    // 2b. 逐条折叠：紧跟 howto-retro/howto-lenses h3 的下一个 ul/ol，
    //     首 inline 子节点为 strong（≤32 字）的 li → <details class="q-item">；
    //     任一条件不满足的 li 原样保留（降级安全）。详见文件头 9。
    foldAfterH3(tree);

    // 3. 表格卡片化（≥5 列）：挂 table-cards 类 + 每格 data-label。
    //    列名取自 thead 第一行；2–4 列事实表保持现状（E5：折行可接受）。
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'table') return;
      const thead = (node.children ?? []).find((c) => c.type === 'element' && c.tagName === 'thead');
      const headRow = (thead?.children ?? []).find((c) => c.type === 'element' && c.tagName === 'tr');
      const headCells = (headRow?.children ?? []).filter(
        (c) => c.type === 'element' && (c.tagName === 'th' || c.tagName === 'td'),
      );
      if (headCells.length < 5) return;
      const labels = headCells.map((c) => textOf(c).trim());
      const cls = [...(Array.isArray(node.properties?.class) ? node.properties.class : node.properties?.class ? [node.properties.class] : []), 'table-cards'];
      node.properties = { ...(node.properties ?? {}), class: cls };
      const tbody = (node.children ?? []).find((c) => c.type === 'element' && c.tagName === 'tbody');
      for (const row of tbody?.children ?? []) {
        if (row.type !== 'element' || row.tagName !== 'tr') continue;
        let i = 0;
        for (const cell of row.children ?? []) {
          if (cell.type !== 'element' || (cell.tagName !== 'td' && cell.tagName !== 'th')) continue;
          cell.properties = { ...(cell.properties ?? {}), 'data-label': labels[i] ?? '' };
          i += 1;
        }
      }
    });
  };
}

/**
 * 从正文「怎么做」节的 **什么时候用** 段提取首句（U3/E3）。
 * 速览卡用：d.when 缺失时（88/117 条）由本函数在构建期补齐，零内容改动。
 * 规则：取标记后同段文字，剥掉 markdown 记号（加粗星号、双链方括号、反引号），
 * 到第一个「；」或 60 字截断。取不到返回空串（调用方回落）。
 */
export function extractWhenSentence(body) {
  const sec = splitSections(String(body ?? '')).get('怎么做');
  if (!sec) return '';
  const m = sec.match(/\*\*什么时候用\*\*[：:]?\s*([^\n]+)/);
  if (!m) return '';
  let text = m[1]
    .replace(/\[\[([^\]|]*)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();
  const cut = text.search(/[；;]/);
  if (cut > 0 && cut <= 60) text = text.slice(0, cut);
  else if (text.length > 60) text = `${text.slice(0, 60)}…`;
  return text;
}

// ── 长条目页内 TOC（2026-10-17 P0）───────────────────────────
// 阈值：正文 CJK 字数 ≥ TOC_MIN_CJK 时 [...slug].astro 在 quick-cards 后渲染
// <details class="toc">（默认关）。短条目不渲染，零回退。
//
// TOC_MIN_CJK = 2100 的取值依据（2026-10-17 实测 124 条正文 CJK 字数直方图，
// 口径：去 frontmatter + 去代码块/行内代码，只数汉字——任务书里「2001-2005 约 9.5k /
// 2008 雷曼约 14k」是含数字标点的总字符数（实测 9921/14251），本阈值按 spec 的 CJK 口径定）：
//
//   <2k 46 条 | 2-3k 22 | 3-4k 15 | 4-5k 20 | 5-6k 7 | 6-7k 9 | 7-8k 4 | ≥8k 1（共 124）
//   最长：泡沫的共同结构 8531 / 2015-16 7406 / 2011 7305 / 2020 7235 / 2022 7145 /
//   2008 雷曼 6902 / 2001-2005 5639；最短：牛市里猪都能飞 1111 / 涨停买不进 1146。
//
//   完成判据把 T 下界钉死：③投资体系地图（3935 字）须在 TOC；④三条业绩验证
//   大师条目（巴菲特 2174 / 林奇 2283 / 钱从哪来 2687）的 perf h2 须在 TOC 里 → T ≤ 2174。
//   取 2098（证券纠纷调解，短速查）与 2174（巴菲特，最短 perf 大师条目）之间空隙里的
//   整数 2100：命中 76/124、不命中 48/124；2001-2005 与 2008 雷曼均命中，
//   别借钱炒股（1441）等典型速查条目不命中。
export const TOC_MIN_CJK = 2100;

/**
 * 正文 CJK 字数（TOC 阈值 / 深潜 chip 时长共用口径）。
 * entry.body 已不含 frontmatter；这里再剥围栏代码块与行内代码（与闸门规则 18/19
 * 同款剥法），只数汉字（CJK 基本区 + 扩展 A + 兼容区）。
 */
export function countCjk(body) {
  const b = String(body ?? '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`\n]*`/g, '');
  return (b.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
}

// TOC 收录的 part-label 只有原四段（spec 口径）；算例/常见错也挂 id，但不进 TOC。
const TOC_PARTS = {
  什么时候用: 'when',
  步骤: 'steps',
  做完你会得到: 'output',
  怎么算过关: 'pass',
};

/**
 * 按文档实际顺序收集条目页 TOC 数据：h2 五节（+业绩验证，H2_IDS 映射）、
 * 八问复盘/四副眼镜 h3、四段 part-label p，各带 {text,id,depth}。
 * 纯函数读 body（extractWhenSentence 同款数据通道），与 rehype 插件的转换同形——
 * 插件挂 id 的条件（h2 文字∈H2_IDS / p 仅含单个 strong∈H3_IDS / p 首子 strong∈PARTS）
 * 与这里的行扫描条件一一对应，实测 124/124 条输出逐字一致（含 id 与顺序）。
 */
export function extractToc(body) {
  const out = [];
  let inFence = false;
  for (const raw of String(body ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      const id = H2_IDS[h2[1].trim()];
      if (id) out.push({ text: h2[1].trim(), id, depth: 2 });
      continue;
    }
    const h3 = line.match(/^\*\*(.+?)\*\*$/);
    if (h3 && H3_IDS[h3[1].trim()]) {
      out.push({ text: h3[1].trim(), id: H3_IDS[h3[1].trim()], depth: 3 });
      continue;
    }
    for (const [label, key] of Object.entries(TOC_PARTS)) {
      if (line.startsWith(`**${label}**`)) {
        out.push({ text: label, id: `howto-${key}`, depth: 3 });
        break;
      }
    }
  }
  return out;
}
