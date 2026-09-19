# ADR 0252：面向插件的宿主 turn 结束事件

- Status: Accepted
- Date: 2026-09-13
- Deciders: PI-Desktop core
- Related: [D422](../spec/08-meta/decisions-log.md) · [ADR 0005](0005-user-installable-plugin-system.md) · [ADR 0040](0040-plugin-resident-services-and-message-bus.md) · [ADR 0213](0213-persist-host-owned-turn-queue.md) · [ADR 0235](0235-domain-facades-and-architecture-budgets.md) · `07-plugins/03-plugin-api.md` · `07-plugins/13-plugin-permissions-matrix.md`

## 背景

驱动 GUI 的插件——通知界面、启动器、工作面板视图——已经可以观察
`workspace:changed`、`plugin:settingsChanged` 和 `session:modelChanged`，
但没有任何东西告诉它，它正在响应的宿主 turn 何时真正结束。插件退而
使用空闲定时器，而空闲定时器在两个方向上都是错的：它们会在一次长
工具调用期间触发，又会为一个片刻前就已结束的 turn 再次触发。

宿主已经拥有这个事实。一条 turn 拆除路径以 `completed`、`aborted` 或
`error` 结算由 `session.beginTurn` 创建的 turn 的持久 `session.endTurn`
行。缺失的是一个已发布的身份和一个已发布的边界：插件工具上下文声明了
`turnId`，但宿主从未填充它，因此插件无法把迟到的工具结果与请求它的
turn 关联起来。

## 决策

1. **`session:turnEnded` 是宿主事件。** 载荷为
   `{ sessionId: string; turnId: string; reason: "completed" | "aborted" | "error" }`，
   完全像 `workspace:changed` 和 `session:modelChanged` 一样投递到插件
   进程，并且（像 `workspace:changed` 一样）投递到插件面板页面和 docked
   视图。

2. **每个实际启动的 turn 一次。** 事件在 turn 拆除结束时、持久
   `session.endTurn` 尝试之后发出，且只针对由 `session.beginTurn` 创建
   的 turn：用户提交、已批准的计划执行或计划运行。从未启动的排队项不
   产生事件。公告对每个 `(sessionId, turnId)` 只认领一次，因此同一 turn
   的第二个终止事件并入第一个认领，而不是再次公告。

3. **Turn 身份是权威的。** 终结器以显式 `turnId` 调用，绝不从恰好活跃
   的 turn 推断，因此来自较早 turn 的迟到终止事件不能结算更新的 turn，
   而没有携带身份的终止事件什么也不能结算。插件工具上下文用同一个
   `turnId` 填充，从宿主原样转发。

4. **不新增权限。** 事件沿现有插件事件通道传送到每个已加载的插件，
   订阅未知事件名不会报错。

显式的非承诺：没有 ack，也没有重放。宿主每个启动的 turn 广播一次；活着
且已订阅的插件收到一次。与插件崩溃、重载或宿主退出竞态的投递不被保证，
并且收到事件不意味着该 turn 的每个在途工具都已退出——迟到的结果仍可能
到达，因此清理必须按 `turnId` 串行化或限定作用域。一个只释放自己资源的
helper 绝不能捏造宿主 turn 结束，而优雅停止保持现有的 `completed` 边界。

## 后果

- 插件根据宿主自己的终态结算 turn 作用域的 UI、通知和簿记，而不是用
  空闲定时器猜测。
- 事件界定的是 turn，而不是单个工具调用，因此插件仍必须把迟到的工具
  结果视为有效。
- 公告是来自单个终结器的一次调用，该终结器校验 turn 身份、在认领 turn
  之前不需要 `await`，并在本地拆除之后运行。三个投递面各自隔离自己的
  发送方，因此一个不可达的接收方不能压制其他接收方，失败或超时的持久
  写入也不会压制公告。
- 忽略 `turnId` 的 turn 作用域清理可能结算错误的 turn；工具上下文的
  `turnId` 现在使正确的作用域成为可能。
- 尚无任何已发布版本发出此事件：包含它的首个版本尚未发布，0.14.8 不
  包含它。依赖它的插件必须要求实际发布它的版本，绝不能假设 0.14.7 或
  0.14.8。

## 被拒绝的替代方案

### 轮询 session API 获取活跃 turn

用定时器读取 session 状态需要 `session.read`，会把插件本来看不到的对话
交给它，并且仍要把结束边界留给猜测——事件携带的不超过宿主已经拥有的
身份和原因。

### 每次调用后释放插件

在插件的 turn 结束时卸载它，会把 turn 结束绑定到一个还必须经受重载、
崩溃和退出的生命周期事件，并会丢弃插件跨 turn 持有的驻留服务和面板
状态。

### 提高空闲超时

更长的沉默阈值会更晚检测到 turn 结束，且仍无法区分「工具在思考」和
「turn 结束了」；它还会延迟 GUI 插件存在就是为了投递的那个完成信号。

## 参考

- `apps/desktop/electron/main/runtime/plans.ts` — `finishTurn`，每条终止
  路径汇集的单一拆除入口
- `apps/desktop/electron/main/runtime/session-coordination.ts` — turn
  身份、中止锁和共享忙碌检查
- `apps/desktop/electron/main/services/plugin-services.ts` — `announceTurnEnded`
- `apps/desktop/electron/main/plugin-runtime.ts` — `broadcastEvent`
