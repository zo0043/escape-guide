// slug 规则：复刻 Hugo `urlize` 对中文标题的行为——
// 去掉全角标点（：、，。「」（）…），保留汉字、拉丁字母、数字与连字符。
// 这样 `被上市公司坑了：三条官方索赔路径` → `被上市公司坑了三条官方索赔路径`，
// 与旧站 blog.zero43.top/escape/<同样的 slug>/ 形状一致（只少一层 escape/ 前缀）。
export function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^\p{sc=Han}a-z0-9-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 全/半角冒号统一（2026-10-18 优化波）：compare.json src 与别名桥不再依赖冒号变体
export function normalizeKey(input) {
  return String(input).trim().toLowerCase().replace(/\s+/g, '').replace(/：/g, ':');
}
