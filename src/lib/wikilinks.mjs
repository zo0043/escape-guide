// 双链渲染：把正文里的 [[…]] 变成真链接。
//
// 支持旧站的全部四种写法（内容不用改）：
//   [[目标]]                显示目标名
//   [[目标|显示]]           显示自定义文字
//   [[目标::关系]]          带关系属性，显示目标名
//   [[目标::关系|显示]]     带关系属性 + 自定义文字
//
// 目标名按「标题或别名」匹配，且不区分大小写。解析不到的目标**不产生死链**，
// 而是渲染成橙色虚线的「未收录」标记——这点与旧站一致。
//
// 索引在 astro.config.mjs 加载时**注入**（详见 entries.mjs 顶部那段教训）：
// 这个插件不在运行时读磁盘，避免模块被打包后相对路径失效导致双链集体退化成「未收录」。
import { normalizeKey } from './slug.mjs';

const WIKILINK_RE = /\[\[([^\]\n]+)\]\]/g;

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

  const slug = index.get(normalizeKey(target));
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
