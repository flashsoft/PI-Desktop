# ADR 0229: 按住并移动项目标题以重排

- Status: Accepted
- Date: 2026-09-11
- Amends: [ADR 0228](0228-long-press-project-title-reorder.md)
- Related: [D403](../spec/08-meta/decisions-log.md) · [Component spec](../spec/04-ux/08-component-spec.md) · E2E-253

## Context

ADR 0228 移除了重排抓手，并在 400ms 静止按压之后预备拖拽。这个延
迟是移动端的长按模式。在桌面侧边栏上，它让重排比 ChatGPT、Claude
及类似产品列表更慢——在那些列表中，抓住一行并移动会立即开始拖拽。

## Decision

项目标题仍然是重排控件，没有抓手。指针消歧依据移动而非时间：

- 鼠标和触控笔：按住状态下移动 8px 即预备拖拽。没有合格移动的点击
  仍然选中项目并切换折叠。
- 触摸按压不会开始重排，因此单指平移可以滚动列表。聚焦标题上的键
  盘 ArrowUp/ArrowDown 仍然可用。
- 拖拽期间，目标分组上的强调色插入线根据指针的垂直中点显示前/后放
  置位置。Escape 取消。持久化和置顶/归档桶不变。

## Consequences

- 桌面重排与常见的侧边栏列表一致：按住、移动、放下。
- 触摸滚动不会被标题上意外的 8px 平移抢走。
- ADR 0228 中的 400ms 静止按压契约被替换。

## References

- `apps/desktop/src/components/Sidebar.tsx`
- `apps/desktop/src/lib/sidebar-project-reorder.ts`
- `apps/desktop/test/sidebar-project-reorder.test.mjs`
