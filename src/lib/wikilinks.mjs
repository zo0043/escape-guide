// 双链渲染：把正文里的 [[…]] 变成真链接。
//
// 支持旧站的全部四种写法（内容不用改）：
//   [[目标]]                显示目标名
//   [[目标|显示]]           显示自定义文字
//   [[目标::关系]]          带关系属性，显示目标名
//   [[目标::关系|显示]]     带关系属性 + 自定义文字
//
// 目标名按「标题或别名」匹配，且不区分大小写、忽略空白差异。解析不到的目标**不产生死链**，
// 而是渲染成橙色虚线的「未收录」标记——这点与旧站一致。
//
// 索引在 astro.config.mjs 加载时**注入**（详见 entries.mjs 顶部那段教训）：
// 这个插件不在运行时读磁盘，避免模块被打包后相对路径失效导致双链集体退化成「未收录」。
//
// ⚠️ C6/S4 设计决定（2026-10-12，出自 2026-10-12 整合审计 S4——
// 该审计文档未随仓库发布，规则原文已内联在本注释里）：
// 全库 50 个标题用半角冒号 `:`、50 个用全角冒号 `：`。**别名感知放在索引层，不放归一化层**——
// normalizeKey 故意不剥标点（只 trim + lowercase + 去空白），因为剥标点会把
// `1993到1994:千点到三百点` 与任何去掉冒号的同名写法混为一谈，blast radius 是全站。
// 做法是**双向补齐**别名：每个半角标题补一条全角冒号别名，每个全角标题补一条半角冒号别名
// （t10 给 39 条半角标题新增、另有 10 条原有；T2 复算现况：50 条半角标题与 50 条全角标题
// 已各自 100% 带反向别名）——两种冒号写法都解析得到，任一方向缺失都会渲染成「未收录」虚线。
// 由 makeIndex / makeEntryIndex 把 title 与 alias 等价入表。因此：
//   · 这里**不要**顺手给 target 剥标点——那会让索引层的别名形同虚设；
//   · 注入的 index 必须来自 makeIndex（astro.config.mjs）或 makeEntryIndex（页面）。
import { normalizeKey } from './slug.mjs';

const WIKILINK_RE = /\[\[([^\]\n]+)\]\]/g;

/**
 * 把双链目标名解析成 slug；解析不到返回 undefined（调用方渲染「未收录」标记）。
 *
 * 单独导出是为了能脱离 remark 直接做双向测试：半角写法与全角写法必须命中同一条目。
 * 别名感知完全来自 index——本函数只做归一化查表，不做任何标点处理。
 */
export function resolveTarget(target, index) {
  if (!target || !index) return undefined;
  return index.get(normalizeKey(target));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderWikilink(raw, index, base = '/') {
  const [leftPart, ...labelParts] = raw.split('|');
  const [targetPart, ...relParts] = leftPart.split('::');
  const target = targetPart.trim();
  const rel = relParts.join('::').trim();
  const label = (labelParts.length ? labelParts.join('|') : target).trim();
  if (!target) return escapeHtml(raw);

  const slug = resolveTarget(target, index);
  const text = escapeHtml(label);
  const relAttr = rel ? ` data-rel="${escapeHtml(rel)}"` : '';
  if (slug) {
    return `<a class="wl"${relAttr} href="${base}${encodeURIComponent(slug)}/">${text}</a>`;
  }
  return `<span class="wl wl-missing" title="未收录"${relAttr}>${text}</span>`;
}

function splitText(value, index, base) {
  const out = [];
  let last = 0;
  WIKILINK_RE.lastIndex = 0;
  let m;
  while ((m = WIKILINK_RE.exec(value)) !== null) {
    if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
    out.push({ type: 'html', value: renderWikilink(m[1], index, base) });
    last = m.index + m[0].length;
  }
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

function walk(node, index, base) {
  if (!node || !Array.isArray(node.children)) return;
  const next = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value.includes('[[')) {
      next.push(...splitText(child.value, index, base));
    } else {
      // 行内代码与代码块里的 [[…]] 是示例，必须原样保留
      if (child.type !== 'inlineCode' && child.type !== 'code') walk(child, index, base);
      next.push(child);
    }
  }
  node.children = next;
}

/**
 * 工厂：索引在配置加载时注入，base 由 astro.config.mjs 一并传入并**显式归一化**。
 * 不用 import.meta.env.BASE_URL——本模块由 astro.config.mjs（Node 上下文）导入，
 * 那里没有 Vite 注入的 env，取到 undefined 会静默生成 "undefined条目名/" 这种死链。
 */
export default function wikilinks(index, base = '/') {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return (tree) => walk(tree, index, prefix);
}
