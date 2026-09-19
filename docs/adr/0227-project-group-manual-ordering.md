# ADR 0227: 项目分组手动排序

- Status: Accepted (amended by 0228)
- Date: 2026-09-11
- Amends: [ADR 0016](0016-sidebar-organization-and-multi-project-tabs.md)
- Related: [D399](../spec/08-meta/decisions-log.md) · [D402](../spec/08-meta/decisions-log.md) · [Component spec](../spec/04-ux/08-component-spec.md) · E2E-253

## Context

保留的项目分组需要一个独立于近期活动和字母名称的稳定工作顺序。现
有的侧边栏组织是渲染进程拥有的呈现状态，而项目路径、所选工作区身
份、会话所有权和工具根目录仍然是宿主拥有的。

## Decision

项目分组暴露一个悬停/焦点可见的重排抓手。抓手上的原生拖放和
ArrowUp/ArrowDown 写入以规范化项目路径为键的连续非负整数 `order`
值，并选择渲染进程本地的 `manual` 项目排序。只允许在同一个已归档/
置顶优先级桶内重排；这些优先级规则仍然排在手动顺序之前。

该交互仅涉及呈现。它不移动目录、不改变所选宿主工作区、不改变会话
排序，也不改变持久的会话项目归属。Escape 取消拖拽时不查询过期的传
输载荷数据。无效的遗留 rank 被忽略并回退到稳定的路径顺序。

## Consequences

- 用户可以跨渲染进程重启把仓库保持在一个稳定的个人顺序中。
- 渲染进程 localStorage 仍然是唯一的持久化界面；不需要 IPC、宿主
  RPC、schema 或迁移。
- 优先级边界让跨桶拖放和键盘移动成为无操作，而不是产生一个会被比
  较器立即覆盖的顺序。

## References

- `apps/desktop/src/components/Sidebar.tsx`
- `apps/desktop/src/lib/sidebar-preferences.ts`
- `apps/desktop/test/sidebar-preferences.test.mjs`
