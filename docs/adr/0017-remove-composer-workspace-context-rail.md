# ADR 0017: 移除 composer 的 workspace 上下文横条

- 状态: 已接受
- 日期: 2026-07-26

## 背景

D056、D066、D067 和 D087 确立了一条依附于 composer 的横条，用于显示
当前项目、Local 环境标签和尽力而为的 Git 分支元数据。后来的视觉
细化还为该横条指定了专属的高度、间距、表面和 elevation 规则。

项目入口与 home hero、侧边栏和 Projects 目标页已有的导航重复。
Local 和 branch 是被动的标签，而且当分支检测没有产生值时，渲染
进程会显示 `main`。这使得该横条占用空间却不提供可靠或独特的控制。

## 决策

home 和 thread-docked 两种 composer 变体都绝不渲染项目、Local 或
branch 上下文外观。composer 外壳不为被移除的横条保留高度、接缝、
分隔线或 elevation。

本决策只改变展示。项目选择、活跃 workspace 持久化、会话项目绑定、
Git 分支检测、Projects 元数据和 workspace 作用域工具保持不变，
并通过其现有的非 composer 界面可用。

这取代了 D052、D055、D056、D066、D067 和 D087 中的 workspace-chip
和上下文横条部分。在基线 0.4.4 中记录为 D095。

## 后果

- Composer 在每种 workspace 状态下都是单一的提示输入界面。
- 项目选择不再有 composer 本地的快捷方式。
- 现有项目导航继续通过 home hero、侧边栏和 Projects 目标页进行。
- 分支元数据在 Projects 使用它的地方保持可见，不再有误导性的
  composer 回退显示。
- Spec 和视觉回归场景断言该横条不存在。

## 备选方案

### 保留完整的横条

否决，因为其三个值中有两个是被动的，而项目操作与现有导航重复。

### 只保留项目操作

否决，因为这会为一个已在周边外壳中可用的操作保留一块专属的
composer 界面。

### 只在一种 composer 变体中隐藏横条

否决，因为不一致的 home 和 thread 布局会保留多余的外观，并使
提示输入界面在 transcript 开始时发生位移。

## 参考

- `docs/spec/00-baseline.md`
- `docs/spec/04-ux/01-ui-ia.md`
- `docs/spec/04-ux/07-ui-design-system.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- `docs/spec/08-meta/decisions-log.md` (D095)
