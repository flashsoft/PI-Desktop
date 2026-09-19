# ADR 0279: 可恢复的子代理委派

- 状态：已接受，待实现
- 日期：2026-09-17
- 决策者：PI-Desktop 核心
- 相关：[ADR 0062](0062-bounded-subagents-behind-a-task-tool.md) ·
  [ADR 0089](0089-proactive-background-subagent-delegation.md) ·
  [ADR 0119](0119-event-driven-subagent-timeouts.md) ·
  [ADR 0165](0165-withdraw-a2a-peer-stack.md) ·
  [03-runtime/02-agent-runtime.md](../spec/03-runtime/02-agent-runtime.md) §5f
- 修订：ADR 0062（`Task` 工具契约）和 ADR 0089（委派生命周期）。两者都保持
  有效——每一条现有边界仍然成立；本次只增加一个可选参数和一份簿记。
- 跟踪：#513

## 背景

ADR 0062 和 ADR 0089 构建的委派机制为每次 `Task` 调用生成一个
`SubagentRun`。每次运行以 `messages: []` 开始
（`packages/agent-runtime/src/subagent.ts`），且是一次性的。委派的转录行会
被持久化——它们携带 `parentToolCallId` 和 `agentName`，落在会话转录中——
但没有任何东西把它们读回某个委派中，而且会话运行时在重建模型上下文时会
跳过它们（`runtime.ts`，`if (m.parentToolCallId) continue;`）。

这使得每次 `Task` 调用都是冷启动，即使父代理为同一批文件两次委派同一个
子代理。第一次运行买来的上下文——它读过哪些文件、发现了什么、已经改了
什么——被丢弃，第二次运行要再付一次代价，或者更糟，基于它从未重读过的
陈旧文件版本工作。

做得更好的部件已经就位：这些行以足以完整重建的保真度被持久化（工具调用/
结果对、思考块，以及工具行上的原始 `Task` 参数），而且会话运行时已经包含
一个 `UiMessage[] → AgentMessage[]` 转换器，能产出格式良好的 provider 消息，
包括为孤立工具行合成的载体。

## 决策

为 `Task` 工具增加一个可选的 `resume` 参数。存在时，新委派将用前一次委派
重建出的上下文作为种子，而不是从空开始。

### 1. `Task` 增加 `resume?: delegationId`

解析只按 `delegationId` 进行——即 `Task` 结果已经返回、`TaskWait` 已经接受
的那个 id。第二个稳定的内部键（`delegateSessionId`）存在的唯一目的是把多次
运行串成链；它从不出现在工具参数、工具结果或 prompt 中。运行时维护一张从
活动链上发出过的每个 `delegationId` 到该链的反向映射，因此链中间的 id 也
能解析。

### 2. 可恢复的单位是链，不是记录

一条**链**是一个 `delegateSessionId` 加上属于它的有序 `Task` toolCallId 序列。
每次 `resume` 追加一个新的 toolCallId。子级转录行以 `parentToolCallId` 为键，
因此重建一条链的上下文意味着选出所有 `parentToolCallId` 在该链中且
`agentName` 匹配的行。

`DelegationRecord` 增加 `delegateSessionId`，并在延续某条链的运行上增加
`resumedFrom` 和 `modelChangedFrom`。读取跟踪挂在链上而不是记录上：注册表为
每个 `delegateSessionId` 保存一个条目，并维护从该链上每个 `delegationId` 到
它的二级索引。

### 3. 上下文重建是纯函数

一个新模块（`packages/agent-runtime/src/delegation-history.ts`）负责：

- 从会话转录中选出该链的行，
- 从第一行 `Task` 工具行的持久化参数合成最初的 `task`，作为第一条用户
  消息，
- 用委派自己的 provider/model 绑定转换为 `AgentMessage[]`（钉住的委派模型
  不是会话模型），
- 一个读取文件 / 行数的预算闸门。

`SubagentRun` 增加 `initialMessages?: AgentMessage[]`；存在时用它为
`initialState.messages` 播种，而不是 `[]`。除此之外这是一次完全正常的运行：
它占用一个 `MAX_SUBAGENT_CONCURRENCY` 槽位，继承定义的权限范围，并通过现有
的 `settleDelegation` 路径结算，拥有自己的 `delegationId`、报告和计数器。

### 4. 校验可见，绝不抛异常

`resume` 在运行开始前校验；每种失败都是模型可以据以行动的工具错误：

| 条件 | 错误 |
|---|---|
| 未知或已被驱逐的 id | `Unknown delegation "<id>"`，附带当前可恢复列表 |
| 仍在运行 | `Delegation <id> is still running`，先调用 TaskWait——恢复从不排队 |
| `stopped` / `aborted` | 不可恢复；未来的复活路径（此处不在范围内） |
| `interrupted`（应用在运行中途关闭） | 不可恢复；开始一次新委派 |
| `Task.agent` 与链的 agent 不同 | 名称不匹配，列出可用项 |
| 恢复时携带 `Task.model` | 恢复的运行不允许——换模型请开始新委派 |
| 链超出读取预算 | `Delegation <id> has read too much to resume cheaply` |
| 链能解析但没有可重放的行 | 该链被丢弃并报告为没有已记录历史；同一 id 永不再被列为可复用 |

不为"已驱逐"与"从未存在"引入新的错误码：两者解析为同一个未知 id 错误，
因为模型唯一正确的行动完全相同。

恢复保留链自己的模型绑定。链记录的 `providerId/modelId` 键优先；仅从转录
重建的链只知道 model id，会拿它与会话当前配置匹配。因此改变父代理自己的
会话模型不会让链搁浅，委派也绝不会意外换模型。如果已经没有任何东西能解析
记录的绑定，运行将按该定义当前解析到的绑定继续，并在委派的生命周期详情中
把之前的 model id 记为 `modelChangedFrom`：拒绝会让链永远搁浅，而静默切换
会把同一段对话交给另一个模型且不留痕迹。

### 5. 只有 `completed` 和 `failed` 可恢复

一次 `failed` 运行的读取和发现仍然有价值；它失败的助手行会像其他错误行
一样被转换器丢弃。`stopped` 和 `aborted` 编码了用户或父代理放弃该工作线
的决定，恢复它会违背停止的本意。`interrupted`（应用在运行仍在工作时关闭）
就此目的而言含义相同：委派从未结算，因此没有可信的东西可以继续。
（`timed_out` 是一个残留状态——ADR 0119 的超时已被 D328 撤回——就此目的
按 `failed` 处理。）

### 6. 每条链任何时候只有一条活动记录

没有排队，也没有消息追加。一条链同一时刻最多有一条正在运行的记录；链正在
运行时的 `resume` 用上面的 TaskWait 错误拒绝。这使链保持严格的一条直线，
没有分叉的继承者。

### 7. 可恢复链有界、LRU、按 agent 名称计

`MAX_RESUMABLE_CHAINS_PER_AGENT = 2`。链豁免于现有
`pruneFinishedDelegations` 的最旧优先清扫。超过上界时，在某个委派结算时驱逐
最近最少使用的整条链——注册表条目和每个反向映射条目一起。最新运行仍在工作
的链永不被驱逐：丢弃它会让正在向其中写入的委派搁浅，因此上界计的是可复用
的链，一条活动链可能暂时让该组超过上界。不需要墓碑：`delegationId` 是随机
UUID，被驱逐的 id 不可能与未来的 id 冲突。

### 8. 读取预算约束链的增长

委派没有自己的压缩机制，因此无界的链最终会溢出它自己的上下文窗口。不在
链内做裁剪，而是让累计读取量超过 `MAX_RESUMABLE_READ_LINES`（50,000）的链
静默地离开可恢复列表——该工作的下一次委派是冷启动，仍然可用。闸门在构建
可恢复列表时检查，因此在委派时刻零成本。

读取量从委派的只读工具行（`Read`、`Glob`、`Grep`、`BrowserPreview`）统计，
按链累计；写工具的目标不计入也不列出。

### 9. 父代理在其系统 prompt 中看到可恢复列表

每次 prompt 把当前可恢复的链组合进父代理的系统 prompt：agent 名称、委派
id、一行目标，以及该链读过的文件（上限 8 个，超出截断）。只有已结算、在
预算内的链出现——正在运行的链从不列出，因此父代理不会被诱导去恢复它。

`resume` 参数自己的 schema 描述携带"复用需要 id"这条规则；光有散文描述
不会恢复任何东西。

### 10. 仅限同一会话

`resume` 只针对当前会话的转录解析。没有跨会话寻址；在对话之间共享事实
仍然走 prompt，正如 ADR 0165 撤回对等栈时的结论。

### 11. 定义编辑在恢复时生效，并带诊断

两次委派之间编辑过的定义在恢复时按原样应用——与目录已有的"编辑在下一次
prompt 生效"语义相同——且该变更记录在委派的生命周期详情中。不存储定义
快照；快照需要新的持久化状态，并且会与现有语义矛盾。

### 12. 链索引在启动时从转录重建

链注册表在内存中，但链关系是可恢复的：`Task` 工具行连同其参数（包括
`resume`）一起被持久化。会话启动时，运行时扫描转录中的 `Task` 行，按
`resume` 链接把它们分组成链，并重建二级索引。重启不会丢失可恢复性。

两个细节让重建的链表现得像活动链。agent 名称在重建时归一化（`Explorer`
和 `explorer.md` 都指 `explorer`），因此重建的链仍能选出自己的行、仍能匹配
`Task.agent`。每次调用携带它自己的 `Task` 行记录的状态：结算投影会原地改写
该行，因此链知道它最后一次运行是 `completed` 还是 `failed`。应用在运行仍在
工作时关闭的运行从未结算：它的行仍写着 `running`，重建为 `interrupted`——
不可恢复，而不是永远保持打开。完全没记录状态的行被信任为已结算，因为本
应用写出的每一行 `Task` 行都带有状态。模型绑定本身不作为键持久化，因此
重建的链按 model id 匹配到某个已配置的绑定；两个提供同一 model id 的账户
在这一点上无法区分。

### 13. 转录把链渲染为一段连续对话

被恢复委派的卡片把整条链的行显示为连续的轮次（任务 → 回复 → 任务 → 回复），
不带特殊的"已恢复"徽标。新运行的计数器从零开始；`details.resumedFrom` 让
这个链接可审计。

## 后果

- `Task` 的参数 schema 增加一个可选字段。每个现有调用不变：省略 `resume`
  就是今天的行为。
- 委派→父代理的上下文边界不受影响。重建的行只播种委派自己的上下文；父
  代理仍然只通过 `TaskWait` 收到报告，重建父代理上下文时仍跳过
  `parentToolCallId` 行。
- 无新的存储 schema、表或事件类型。链身份、读取跟踪和模型绑定活在内存中
  的链上；`resumedFrom` 和 `modelChangedFrom` 搭载现有的生命周期详情投影。
- 恢复的运行与全新运行在计费和约束上完全相同——同样的并发槽位、同样的
  权限范围、同样的回退模型、同样的中止来源。
- 读取预算的失败模式是优雅降级为冷启动，绝不是一个损坏或超大的请求。

## 范围外（二期）

- 复活 `stopped` / `aborted` 的委派。
- 链内压缩或对旧工具结果的占位符替换。
- 在运行中的委派上做任务排队 / 追加工作。
- 跨会话恢复。
- 这些边界的用户可见设置；它们保持为代码常量。
