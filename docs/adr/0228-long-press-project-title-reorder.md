# ADR 0228: 长按项目标题以重排

- Status: Accepted (amended by 0229)
- Date: 2026-09-11
- Amends: [ADR 0227](0227-project-group-manual-ordering.md)
- Related: [D402](../spec/08-meta/decisions-log.md) · [Component spec](../spec/04-ux/08-component-spec.md) · E2E-253

## Context

ADR 0227 在悬停/焦点抓手之后添加了渲染进程本地的手动项目顺序。该
抓手占用一个前导列，在悬停之前保持隐藏，并且让重排成为标题旁边的
第二个控件——而标题本身已经用于选中和折叠分组。

## Decision

保留的项目分组不再渲染重排抓手。项目标题就是重排控件：

- 在标题上静止按压 400ms 会预备一次指针重排。在该延迟之前指针移动
  超过 8px 会取消按压，因此点击仍然激活项目并切换折叠。
- 标题预备之后，移动指针会高亮同一个置顶/已归档桶中的另一个分组；
  松开时根据指针的垂直中点插入到该分组之前或之后。Escape 取消且不
  写入顺序。
- 聚焦标题上的 ArrowUp/ArrowDown 仍然是键盘路径。
- 持久化不变：渲染进程本地侧边栏偏好中的连续规范化路径 `order` 值
  和 `projectSort: "manual"`。

标题的路径 tooltip 在按压时消失，以免遮住拖拽。会话到项目的 HTML5
拖放和原生文件夹拖放不变。

## Consequences

- 重排不再需要专用的可见手柄。
- 长按是对一个同时可点击的标题的指针消歧方式。
- 键盘用户在同一个标题按钮上保留 ArrowUp/ArrowDown。

## References

- `apps/desktop/src/components/Sidebar.tsx`
- `apps/desktop/src/lib/sidebar-project-reorder.ts`
- `apps/desktop/test/sidebar-project-reorder.test.mjs`
