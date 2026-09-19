# ADR 0154: 在宿主 IO 之前展示 New Task 的空目的地

- Status: Accepted
- Date: 2026-09-05
- Deciders: PI-Desktop core
- Related: D252, D305, ADR 0113, ADR 0137, E2E-011a, E2E-011d, E2E-011g

## 背景

ADR 0113 让 New Task 持久化一个持久的空会话（或复用该组最近的空
行）。渲染进程的实现是在改变可见 transcript 之前依次 await
`session.list`、`session.create`、再一次 `session.list`，然后
`session.get`。在这条链执行期间，之前的会话停留在屏幕上：冷切换
规则（ADR 0137）对打开既有会话是正确的，但对于一个全新的空目的地，
它让人感觉点击没有反应，然后聊天突然跳转。

`session.list` 的存在是为了在 `messageCount` 仍为 0 时，不把片刻前
刚发出的第一条消息误认为空槽位。渲染进程其实已经知道这种情况：
会话正在运行、有实时行，或有已提交的 Composer 草稿。

## 决策

1. **第一帧空展示。** 创建会话时，在 `session.create` 之前同步清除
   之前的 transcript 和保留窗格。空主页 Composer 就是目的地。复用
   空槽位在同一帧提交空 transcript，而不是等待 `session.get`。
2. **不刷新列表的复用。** New Task 根据内存中的会话列表加渲染进程
   信号（`runningSessions`、实时/缓存行、已提交草稿）做决定。宿主的
   `messageCount` 仍是持久的空谓词；内存信号只用于防止把刚刚开始的
   轮次当作空。
3. **从 `session.create` 提交。** 创建的摘要以 fork 子会话同样的方式
   插入侧边栏列表。新的空会话没有后续的 `session.list` 或
   `session.get`：它的 transcript 已知为空。被取代的导航仍会记录
   该行。
4. **每组一个进行中的创建。** Send 和 paste 等待同作用域的 New Task
   promise，而不是物化第二个会话。创建期间在空主页输入的按键会转移
   到新的会话 id 上。

协议、存储和宿主 RPC 不变。`session.create` 仍是持久 id 的来源。

## 后果

- New Task 不再把之前的会话留在屏幕上。
- 快速的 New Task 连击和首条消息竞态在每组内保持串行。
- 空复用仍在空窗格已经可见之后通过 `selectSession` 重新校验。
- Spec `04-ux/09-interaction-patterns.md` §1.6、
  `04-ux/08-component-spec.md` §11、E2E-011a / E2E-011d / E2E-011g；
  D305 修订的是 D252 的先刷新再选择的时序，而不是复用规则。

## 考虑过的替代方案

- 在 `session.create` 上使用客户端生成的会话 id：可以获得第一帧
  id 且没有 home-draft 区间，但需要一个附加协议字段，并且在旧宿主
  忽略它时需要重映射。
- 保留之前窗格并显示进度轨：那是针对既有 transcript 的冷切换规则，
  正是本请求要消除的卡顿。
