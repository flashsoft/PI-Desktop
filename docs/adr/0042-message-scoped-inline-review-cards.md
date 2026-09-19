# ADR 0042: 消息作用域的内联评审卡片

- 状态： 已被 ADR 0043 取代
- 日期： 2026-08-02
- 相关： [01-ui-ia](../spec/04-ux/01-ui-ia.md) ·
  [08-component-spec](../spec/04-ux/08-component-spec.md) ·
  [09-interaction-patterns](../spec/04-ux/09-interaction-patterns.md) ·
  [E2E-057](../spec/06-delivery/04-e2e-test-plan.md)
- 取代： D140 的全局 transcript Review changes 入口

## 背景

transcript 此前在聊天底部渲染一个会话级的 Review changes 命令。该命令汇总整
个脏工作树，因此在视觉上与引发变更的 Write/Edit 行脱节，也无法告诉用户该检
查哪个文件。仅仅回答一个关于单个工具结果的局部问题，就需要打开面板标签页。

现有的 Git diff 已经是有界的、竞态安全的，并被 Review 标签页共享。重新设计
应复用这一事实来源，而不是引入第二个由渲染进程持有的 diff 或持久所有权映
射。

## 决策

1. 成功的 workspace Write/Edit 行可以在同一活动折叠区内、紧跟该行之后渲染
   一个紧凑的 `InlineReviewCard`。卡片按该工具结果返回的 workspace 路径界定
   作用域，因此无关文件和其他会话不会出现在它旁边。
2. 卡片头部显示针对新增、修改、删除、重命名和未跟踪文件的本地化文件状态，
   以及新增/删除行数合计。原生按钮就地切换对应当前 hunks 的展开状态，并带
   有 `aria-expanded` 与 `aria-controls`。
3. 失败、被拒绝、scratch、干净、非 Git 以及缺少 workspace 的结果不渲染卡片。
   后台会话的卡片始终附着在自己的 transcript 上，从不出现在当前可见的会话
   中。完整的 Review 标签页仍作为全文件、当前工作树视图保留，并继续从成功
   的 workspace 产物打开。
4. 移除会话到 workspace 的评审所有权映射。内联卡片的存在由 transcript 消
   息、活动 workspace 与共享的 workspace diff 推导；不新增任何评审专用的持
   久化或协议字段。

## 后果

- 评审入口与产生它的操作保持相邻，无需打开工作面板即可使用。
- 新增、修改、删除、重命名与未跟踪状态使用一致的状态/计数/diff 呈现。
- Review 标签页仍适合扫描所有当前文件，而卡片在会话内提供按路径界定的检
  查。
- 卡片反映其路径当前的有界工作树 diff。因此外部编辑或对同一文件的后续编
  辑会与 Review 标签页一起更新卡片；渲染进程不会虚构第二条 diff 时间线。

## 已拒绝的备选方案

- **保留一个全局 transcript 入口：** 使操作与其来源行脱节，并在单一摘要中
  暴露无关文件。
- **持久化单独的按消息 patch 流：** 复制 Git diff 这一事实来源，扩大消息协
  议，并需要针对外部编辑的新保留与失效规则。
- **每次点击卡片都打开 Review：** 为局部检查增加上下文切换，并让 transcript
  卡片依赖面板可见性。
