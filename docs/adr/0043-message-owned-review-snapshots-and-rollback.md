# ADR 0043: 消息持有的评审快照与受守护的回滚

- 状态： 已接受
- 日期： 2026-08-02
- 相关： [03-tools-and-permissions](../spec/03-runtime/03-tools-and-permissions.md) ·
  [04-data-storage](../spec/03-runtime/04-data-storage.md) ·
  [06-host-rpc-protocol](../spec/03-runtime/06-host-rpc-protocol.md) ·
  [08-component-spec](../spec/04-ux/08-component-spec.md) ·
  [E2E-057](../spec/06-delivery/04-e2e-test-plan.md)
- 取代： ADR 0042 的 Git 依赖型评审来源、D098 与 D179
- 修订： [ADR 0087](0087-line-anchored-edit-contract.md)（`Edit` 现在可以将一
  次移动记录为两条条目，且回滚会使该路径的会话编辑快照失效）

## 背景

此前的 Review 实现从当前 Git 工作树重建每张卡片。因此一次提交会抹掉较早工
具消息的证据，而对同一路径的后续编辑会让一条旧消息看起来在描述它从未执行
过的工作。同一模型也没有安全的方法来恢复特定消息之前的文件内容。

Review 是会话功能，所以它的证据必须属于产生它的消息，而不是一个可变的仓库
快照。

## 决策

1. 在 workspace `Write` 或 `Edit` 之前，host-core 把之前的文件字节捕获到一
   个位于 workspace 之外、按会话界定作用域的快照中。工具成功后，它把一条有
   界的 `details.review` 记录写入工具结果。记录包含快照 id、消息/工具 id、
   相对路径、操作、added/modified/deleted 状态、新增/删除计数、可展开的
   hunks、active/rolled-back 状态，以及回滚是否可逆。
2. 渲染进程只从持久化的工具消息推导 `InlineReviewCard` 和 Review 面板的按
   时间排列的历史。它从不刷新或匹配当前 Git diff。卡片始终紧跟其所属的工具
   行之后，并在提交、workspace 切换与重启后保持可见。
3. `review.rollback({sessionId, snapshotId})` 是由宿主持有的操作。写入前，
   host-core 校验当前文件哈希是否等于快照中记录的工具后哈希。不匹配返回
   `conflict` 并保持文件不变。匹配则恢复之前的字节，或删除该消息创建的文
   件，然后在工具行上持久化 `state: "rolledBack"`。
4. 快照存储是有界的并按会话持有：
   `<data_dir>/review-changes/<sessionId>/<snapshotId>/{before,meta.json}`。
   删除会话会移除它；启动时会移除已不存在会话对应的目录。fork 出的
   transcript 保留可见的 diff 证据，但将回滚标记为不可用，因为源快照属于另
   一个会话。
5. scratch 根写入、失败的工具以及没有结构化 workspace 路径的工具不创建评
   审记录。当无法保留有界的先前内容时，大型或二进制文件仍可显示状态/计数
   元数据，但省略 hunks 与回滚。

## 后果

- 工具之后提交不再让其评审数字或卡片消失。
- 每个可见的 diff 都绑定到产生它的确切消息，包括新增、删除与修改。
- 回滚是显式的、幂等的，并拒绝覆盖后来的工作。
- Review 不再承诺描述无关的 shell 变更；结构化的 Write/Edit 结果是持久的评
  审边界。
- 快照字节增加了由宿主持有的本地存储，受文件与 diff 上限约束。

## 已拒绝的备选方案

- **继续读取 Git HEAD：** 提交会抹掉证据，且无法识别后续同路径编辑对应的消
  息。
- **只存渲染进程 patch：** 渲染进程无法安全地恢复文件，且 patch 会在重启或
  会话重载时丢失。
- **无条件回滚：** 可能覆盖用户之后的编辑或外部变更，因此工具后哈希守护是
  强制性的。
