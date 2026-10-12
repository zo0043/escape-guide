// 条目读取与纯函数工具。
//
// ⚠️ 教训（2026-10-11 拆站时踩到）：不要在这个模块里依赖 import.meta.url 去定位内容目录。
// Astro 构建时会把本模块打包进构建输出，import.meta.url 随之改变，相对路径解析失败 →
// loadEntries() 返回空数组 → **反链静默变成 0**（页面照常渲染，不报错）。
// 因此：
//   · 构建期（remark 插件、页面反链）一律不读磁盘——索引在 astro.config 加载时就注入；
//   · 纯函数（makeIndex / computeBacklinksFrom / splitSections …）只接受普通对象数组；
//   · 只有构建前的格式闸门 scripts/check-content.mjs 读磁盘，且路径不存在时会显式报错。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { slugify, normalizeKey } from './slug.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** 定位内容目录：多候选，全都不在就显式报错（绝不静默返回空）。 */
export function resolveContentDir() {
  const candidates = [
    process.env.ESCAPE_CONTENT_DIR,
    path.resolve(process.cwd(), 'src', 'content', 'escape'),
    path.resolve(HERE, '..', 'content', 'escape'),
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
  }
  throw new Error(
    `找不到条目目录。已尝试：\n${candidates.map((c) => `  - ${c}`).join('\n')}\n` +
      `请设置 ESCAPE_CONTENT_DIR，或在项目根目录运行。`,
  );
}

const FENCE_RE = /^(?:```|~~~)/;
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** 解析一个 markdown 文件的 front matter 与正文。 */
export function parseEntryFile(file, dir) {
  const raw = fs.readFileSync(path.join(dir, file), 'utf8');
  const m = raw.match(FM_RE);
  if (!m) throw new Error(`${file}: 缺少 front matter（文件必须以 --- 包裹的 YAML 开头）`);
  const data = YAML.parse(m[1]) ?? {};
  const body = m[2] ?? '';
  return {
    file,
    basename: file.replace(/\.md$/i, ''),
    slug: slugify(data.title ?? file),
    title: data.title,
    aliases: data.aliases ?? [],
    data,
    body,
  };
}

/** 从磁盘读取全部条目（供构建前的格式闸门使用）。 */
export function loadEntries(dir = resolveContentDir()) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.md') && !/^_/.test(f));
  const entries = files.map((f) => parseEntryFile(f, dir));
  assertUniqueSlugs(entries);
  return sortEntries(entries);
}

export function assertUniqueSlugs(entries) {
  const seen = new Map();
  for (const e of entries) {
    if (seen.has(e.slug)) {
      throw new Error(`slug 冲突：${e.file} 与 ${seen.get(e.slug)} 都解析为 /${e.slug}/`);
    }
    seen.set(e.slug, e.file);
  }
}

export function sortEntries(entries) {
  return [...entries].sort(
    (a, b) =>
      String(a.data.chapter ?? '').localeCompare(String(b.data.chapter ?? ''), 'zh') ||
      (a.data.weight ?? 0) - (b.data.weight ?? 0) ||
      String(a.title ?? '').localeCompare(String(b.title ?? ''), 'zh'),
  );
}

/** 把 Astro 集合条目归一化成纯函数要的形状。 */
export function normalizeCollection(entries) {
  return entries.map((e) => ({
    slug: e.id,
    title: e.data.title,
    aliases: e.data.aliases ?? [],
    chapter: e.data.chapter,
    weight: e.data.weight,
    body: e.body ?? '',
    data: e.data,
  }));
}

/**
 * 一条条目参与「标题 / 别名」匹配的全部键（标题在前，别名等价）。
 *
 * 同时认两种条目形状，免得每个调用点各写一遍解构：
 *   · 归一化后的纯对象（normalizeCollection / loadEntries 的产物）：{ title, aliases, slug }
 *   · Astro 集合条目（getCollection('escape') 的产物）：{ data: { title, aliases }, id }
 */
function entryKeys(e) {
  const title = e?.data?.title ?? e?.title;
  const aliases = e?.data?.aliases ?? e?.aliases ?? [];
  return [title, ...aliases].filter(Boolean);
}

/** 「标题 / 别名 → slug」索引；标题与别名等价参与匹配。 */
export function makeIndex(entries) {
  const index = new Map();
  for (const e of entries) {
    for (const k of entryKeys(e)) {
      const key = normalizeKey(k);
      const prev = index.get(key);
      if (prev && prev !== e.slug) {
        throw new Error(`双链索引冲突：「${k}」同时指向 /${prev}/ 与 /${e.slug}/`);
      }
      index.set(key, e.slug);
    }
  }
  return index;
}

/**
 * 「标题 / 别名 → 条目」索引；标题与别名等价参与匹配，**返回条目本身**。
 *
 * 给页面按标题取条目用（对照表 src、首页处境路径…）。与 makeIndex 同源同口径，
 * 区别只是值是条目而不是 slug——免得页面各自 `new Map(entries.map(e => [e.data.title, e]))`，
 * 那种写法只认 title，一条别名就取不到（C6/S4 的半角/全角冒号问题正是从这儿漏进来的：
 * compare.json 有 37 行 src 用半角冒号，全角写法会被静默丢成 undefined）。
 *
 * 同样吃两种条目形状（见 entryKeys 的说明）。
 */
export function makeEntryIndex(entries) {
  const index = new Map();
  for (const e of entries) {
    const id = e?.slug ?? e?.id;
    for (const k of entryKeys(e)) {
      const key = normalizeKey(k);
      const prev = index.get(key);
      if (prev && prev.id !== id) {
        throw new Error(
          `标题/别名索引冲突：「${k}」同时指向 /${prev.id}/ 与 /${id}/`,
        );
      }
      index.set(key, e);
    }
  }
  return index;
}

/** 取出 `## 小节名` 的正文。返回 Map<sectionName, bodyText>。 */
export function splitSections(body) {
  const lines = String(body).split(/\r?\n/);
  const out = new Map();
  let current = null;
  let buf = [];
  let inFence = false;
  const flush = () => {
    if (current !== null) out.set(current, buf.join('\n').trim());
  };
  for (const line of lines) {
    if (FENCE_RE.test(line.trim())) inFence = !inFence;
    const m = !inFence && line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      current = m[1].trim();
      buf = [];
      continue;
    }
    if (current !== null) buf.push(line);
  }
  flush();
  return out;
}

/**
 * 抽出正文里「真的会被渲染成链接」的 [[…]] 目标名。
 * 剔除围栏代码、行内代码与反斜杠转义写法——与渲染层同口径，
 * 否则一篇讲解语法的文章里的示例会把校验打红（那属于误报）。
 */
export function extractWikilinkTargets(body) {
  let b = String(body).replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '');
  b = b.replace(/`[^`]*`/g, '');
  b = b.replace(/\\{2,}\[\[[^\]]+\]\]/g, '');
  const targets = [];
  for (const m of b.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const target = m[1].split('|')[0].split('::')[0].trim();
    if (target) targets.push(target);
  }
  return targets;
}

/** 反链：谁引用了这一条。返回 Map<slug, [{slug,title}]>。 */
export function computeBacklinksFrom(entries) {
  const index = makeIndex(entries);
  const titles = new Map(entries.map((e) => [e.slug, e.title]));
  const back = new Map(entries.map((e) => [e.slug, new Map()]));
  for (const e of entries) {
    for (const target of extractWikilinkTargets(e.body)) {
      const hit = index.get(normalizeKey(target));
      if (!hit || hit === e.slug) continue;
      back.get(hit).set(e.slug, titles.get(e.slug));
    }
  }
  const out = new Map();
  for (const [slug, refs] of back) {
    out.set(
      slug,
      [...refs.entries()]
        .map(([s, t]) => ({ slug: s, title: t }))
        .sort((a, b) => String(a.title).localeCompare(String(b.title), 'zh')),
    );
  }
  return out;
}
