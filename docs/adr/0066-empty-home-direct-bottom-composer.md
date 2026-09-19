# ADR 0066: 空首页直达底部 composer

- 状态： 已接受实现
- 日期： 2026-08-07
- 决策者： PI-Desktop 核心
- 修订： D111
- 被修订： ADR 0067（仅起始网格呈现；已被 D206 取代）

## 背景

空聊天首页在 hero 与 composer 之间放置了情境 prompt 按钮。这些控件在首个任
务之前增加了一次额外决策，并让 composer 成为可滚动内容栈的一部分。可选的
引导内容因此可能把主要的任务输入界面推离聊天区域底部。

## 决策

1. 移除原空首页情境快捷操作行及其项目打开按钮。当前界面也省略了
   ADR 0067 引入的独立开发者起始网格（D206）。
2. 把 hero 与可选引导清单保留在 `.home-scroll` 内，它是空首页内容唯一的垂
   直溢出界面。
3. 在滚动区之后的兄弟 `.home-composer-wrap` 中渲染首页 composer。包装器以
   现有内容宽度与底部间距固定在 `home-main-content` 底部，因此内容区域独立
   滚动时 composer 保持可见。
4. 保留清单现有的内联操作与消除行为。短窗口可以滚动清单，但 composer 不
   得覆盖它。

## 后果

- 空首页有一条直达的任务输入路径，以及其上方更安静的、专门构建的引导界
  面。
- composer 在空首页与 transcript 状态下都稳定在底部。
- 可选引导无需覆盖层或第二个滚动界面即可到达。
- 原 prompt 模板行、快捷操作样式与开发者起始卡片不再是渲染进程界面的一部
  分。

## 已考虑的备选方案

### 保留快捷操作行，只移动 composer

已拒绝。所要求的界面是直达任务输入；保留按钮会保留额外的决策层及其未使用
的 prompt 预填路径。

### 把 composer 保留在滚动区内，用 `margin-top: auto` 对齐

已拒绝。可选清单增长仍会移动 composer，短窗口溢出可能让主要输入变得不可
预测。

### 把首页 composer 绝对定位在滚动区之上

已拒绝。底部覆盖层会遮盖清单行，除非每个内容块都预留并跟踪 composer 变化
的多行高度。

## 参考

- `docs/spec/04-ux/01-ui-ia.md`
- `docs/spec/04-ux/07-ui-design-system.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-063, US-UI-31, US-UI-64)
- `docs/spec/08-meta/decisions-log.md` (D111, D131, D204, D206)
