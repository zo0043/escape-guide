# t34 交付报告（P2 术语归一：about.md「真实数字复算型」→「真实数据复算型」）

执行者：content-editor-2 ｜ 任务：t34 ｜ attempt：7aae58e6-3c67-46fa-842b-e4c4923ee02c
范围：仅 `src/content/pages/about.md`，1 个术语词替换（1 行内，1+/1−，0 删除行）。未 build、未 commit/push。

## grep 输出（改前/改后计数）

| 串 | 改前 | 改后 |
|---|---|---|
| 真实数字复算 | **1**（L44 六段表算例行） | **0** |
| 真实数据复算 | 0 | **1**（L44 同一行） |

- 标签本身未动：「（官方数字的复算）」改后仍 ×1（该词是条目内算例标签，与例外名「真实数据复算型」不是一回事，按任务要求保留）。
- **全库其它文件变体排查（只报告不代改）**：`docs/`、`src/`、`scripts/` 全量 grep「真实数字复算」，除 about.md 外仅命中 `docs/audit/tmp/` 下 4 个**历史审计产物**（t20-about-before.html、t20-about-after.html 渲染快照 ×2 行、t33-delivery.md 交付引文 ×3 行、t33-about-line-after.txt 行存档 ×1 行）——均为改前状态的历史证据，**保持原样不改**（改写即伪造证据链）；活跃文档（spec、条目、源码）无该变体。

## diff 摘要（改前/改后整行原文）

- 改前（t33 落盘后、t34 前）：
  `| 3 | **算例** | …算例数字不改变证据等级；真实数字复算型标注「（官方数字的复算）」并逐字引一手源（详见 docs/content-v2-spec.md 总原则第 2 条例外） |`
- 改后：
  `| 3 | **算例** | …算例数字不改变证据等级；真实数据复算型标注「（官方数字的复算）」并逐字引一手源（详见 docs/content-v2-spec.md 总原则第 2 条例外） |`
- 仅「真实数字复算型」→「真实数据复算型」一词之差；该行其余文字（含 t33 追加的 spec 交叉引用）零改动。改后整行存档：`t34-about-line-after.txt`。
- 与 spec canonical 对齐：`docs/content-v2-spec.md` 总原则第 2 条例外（t23 登记）用词为「真实数据复算型算例」，about.md 现引用方用词与定义方一致。

## 自检

`node scripts/check-content.mjs` → **exit 0**：「✅ 条目格式闸门通过：122 条全部合规」+ 6 条警告——警告名单与基线（t33 log）**逐字 diff 一致** → `docs/audit/tmp/t34-check-content.log`。
