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
import { visit } from 'unist-util-visit';

const H2_IDS = {
  怎么做: 'howto',
  说人话: 'plain',
  收益: 'gain',
  来源: 'source',
  备注: 'notes',
};

const PARTS = {
  什么时候用: 'when',
  步骤: 'steps',
  做完你会得到: 'output',
  怎么算过关: 'pass',
};

function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if (Array.isArray(node.children)) return node.children.map(textOf).join('');
  return '';
}

export default function entryHeadings() {
  return (tree) => {
    // 1. h2 挂 id
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'h2') return;
      const label = textOf(node).trim();
      const id = H2_IDS[label];
      if (id) node.properties = { ...(node.properties ?? {}), id };
    });

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
      node.properties = { ...(node.properties ?? {}), class: ['howto-part', `howto-${part}`] };
    });
  };
}
