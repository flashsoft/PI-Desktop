# ADR 0069: 让原生工具路径错误可恢复

- 状态： 已接受实现
- 日期： 2026-08-10
- 决策者： PI-Desktop 核心
- 修订： D185、D192
- 被修订： [ADR 0087](0087-line-anchored-edit-contract.md)（§2 的逐字节忠实
  `Read` 内容被行号带标签输出替换）
- 相关： [02-agent-runtime](../spec/03-runtime/02-agent-runtime.md) ·
  [03-tools-and-permissions](../spec/03-runtime/03-tools-and-permissions.md) ·
  [08-component-spec §9](../spec/04-ux/08-component-spec.md) · E2E-019e ·
  E2E-083 · E2E-095

## 背景

最近的持久会话显示模型与原生工具之间反复出现路径形态不匹配。在猜测的文件
名不存在之后，`Read` 被以目录调用；`Grep.path` 被反复给定一个显式文件，尽
管宿主只接受目录。这些是可恢复的检查错误，却被报告为通用执行失败。

transcript 让问题更糟。失败的工具行正确保留了它自己的错误，而包含它的活动
组也从任何子错误推导出终结失败。因此后来的成功搜索与最终回答可能让一个已
完成的轮次被标记为 `Failed after ...`。

## 决策

1. 保留 D185 的 Agent 核心与延迟工具边界。`Glob` 与 `Grep` 保持按需；当必
   须列出目录或文件名不确定时，每个新的 Agent prompt 必须通过 `ToolSearch`
   激活 `Glob`。
2. 执行并宣传一个可移植的路径契约：
   - `Read.path` 接受已存在的常规文本文件，绝不接受目录。
   - `Glob.path` 接受目录。
   - `Grep.path` 接受单个文件或目录树。显式文件被直接搜索，`include` 仍过
     滤其 basename。
3. 传给 `Read` 的目录返回公开的 `INVALID_ARGUMENT`，而不是 `TOOL_FAILED`。
   其结果包含 `suggestedTool: "Glob"` 与有界的 `suggestedArgs`（原始路径加
   `pattern: "**/*"`），使模型无需猜测即可纠正调用。
4. 宿主定义、runtime TypeBox schema、主 Agent 指引与 subagent 指引携带相同
   的路径语义。Subagent 没有 `ToolSearch`，因此其指引只提及定义实际可用的
   工具。
5. 工具错误在它自己的 ToolCallRow 上保持可见并自动展开。活动组只表示处理
   时长与步骤包含；它从不从子行推断终结轮次失败。终结 agent 错误、
   TurnOutcomeCard、侧边栏状态与通知仍是单一的轮次结果界面。

没有宿主协议或存储 schema 版本变更。现有工具结果已经是结构化 JSON 值，且
Grep 输入形态仍是字符串。

## 后果

- 常见的单文件 Grep 调用不再因仅目录契约而失败。
- 错误的目录 Read 收到可操作的、不可重试的纠正，而不是含糊的执行失败。
- 恢复的轮次不再看起来终结失败，而原始失败调用在展开的 transcript 中仍可
  审计。
- 延迟搜索保留 D185 实测的首请求上下文缩减；prompt 必须把逐用户 prompt 的
  激活边界显式化。

## 已考虑的备选方案

### 把 Glob 与 Grep 放回 Agent 核心

已拒绝。它反转 D185 的有界首请求上下文决定，而已观测的失败可以在不为每个
prompt 支付两个 schema 的情况下纠正。

### 当 Read 收到目录时静默执行 Glob

已拒绝。它会让审计的工具名与执行的操作不一致，并返回 Read 契约之外的结果
形态。

### 保持 Grep 仅目录

已拒绝。直接的文件路径是明确的，比遍历其父目录更便宜，也是编码 agent 工
具惯例中的常见形态。

### 轮次完结后把活动组标记为失败

已拒绝。完结不意味着每个中间工具调用都成功；专用的终结结果界面已经持有轮
次失败。
