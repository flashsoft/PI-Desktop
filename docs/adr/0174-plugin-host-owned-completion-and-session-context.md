# ADR 0174: 宿主拥有的插件补全会话上下文

- 状态：已接受
- 日期：2026-09-07
- 决策者：PI-Desktop 核心团队
- 相关：D019、D015、D018、D336、ADR 0005、ADR 0008、ADR 0121、ADR 0170、
  `07-plugins/03-plugin-api.md`、`07-plugins/13-plugin-permissions-matrix.md`

## 背景

Pi CLI 扩展可以让执行模型调用一个零参数的审查者工具。宿主将解析出的
LLM 上下文序列化，并使用用户已有的凭据对更强的审查者运行一次性补全。

PI-Desktop 插件已经可以注册工具、命令、设置和技能，但它们不能：

- 列出用户已认证的模型
- 读取当前会话的面向模型的 transcript
- 在旁路补全上花费用户的 provider 配额

自行调用 provider 的插件需要密钥（被禁止，D018）或 `net.fetch` 加粘贴
的密钥。D019 默认拒绝了会话摘要访问。Composer 的 `prompt/enhance` 已经
证明了一条宿主拥有的一次性路径，它从不把密钥交给渲染进程。

## 决策

1. **三个公开插件 API**，由新权限把关：
   - `models.list`（medium）——`pi.models.list()` 返回就绪的
     `(providerId, modelId)` 行。不含密钥。
   - `session.read`（high）——`pi.session.getLlmContext()` 返回**进行中
     工具会话**的有界、感知压缩的投影。插件不能传入会话 id；身份来自
     `plugins.execute`（与 D333 相同的规则）。
   - `agent.complete`（high）——`pi.agent.complete({ modelKey,
     thinkingLevel, system, messages, includeSessionContext })` 通过与
     agent 轮次和 prompt 增强相同的凭据解析器，以 `tools: []` 运行宿主
     拥有的一次性补全。`includeSessionContext: true` 还要求 `session.read`
     和一个进行中的工具会话。

2. **宿主拥有凭据和网络调用。** 插件进程永远不会收到 API 密钥、OAuth
   刷新令牌或短期 `ModelAuth`。补全复用 `resolveAgentRuntimeLaunch` 和
   运行时一次性辅助函数。密钥留在 Electron 主进程。

3. **会话上下文是投影，不是转储。** 子 agent 行被省略。对插件自身工具
   的进行中调用会从尾部剥离。压缩摘要取代检查点之前的历史。工具结果
   被截断。负载有上限。审计日志记录插件 id、模型键、大小和用量——
   永不记录 transcript 文本。

4. **速率和大小制动。** 每个插件每滚动 60 秒最多 8 次 `agent.complete`
   调用。系统 prompt ≤ 32 KiB。合并消息 ≤ 20 万字符。补全预算 90 秒，
   低于 110 秒的插件工具超时。

5. **`session:modelChanged` 是宿主事件**，在改变 provider、模型或思考
   级别的 `session.configure` 成功后推送。

6. **D019 被修订，而非撤回。** 会话内容在声明并授予 `session.read`
   之前保持拒绝。工具执行上下文可以在没有该权限的情况下包含
   `modelKey` / `thinkingLevel`，因为它们是会话配置而非 transcript。

7. **捆绑 Advisor 暂不发布。** 公开 API 仍对显式安装的插件可用，但
   PI-Desktop 目前不捆绑第一方审查者命令、面板、技能或 agent 工具。

不提升宿主协议或存储 schema 版本。补全是 Electron 本地的，与
`prompt/enhance` 相同。

## 后果

- 第三方插件无需持有密钥即可构建审查者/第二意见工具。
- `session.read` + `agent.complete` 是一条合法的会话外泄通道，目标是
  用户已经付费的另一个模型。安装 UI 必须展示这两个权限及其帮助文本。
- 插件工具保留 D015 前缀。Plan 和 Goal 仍然硬性拒绝插件工具。
- 一次性补全花费在插件调用上审计，不并入父级 assistant 用量芯片
  （ADR 0171）。

## 已否决的替代方案

### 在 sidecar 中加载 npm Pi CLI 扩展

sidecar 不是 Pi TUI 扩展宿主。CLI 审查者命令需要 TTY，在 RPC 下会失败。

### 让插件通过 `net.fetch` 调用 provider

这需要在插件设置中放密钥（D018）或用户粘贴的密钥，且会跳过宿主的
重试、OAuth 和审计。

### 第一方审查者工具而非插件

目前暂缓：捆绑的审查者体验暂时移除，公开宿主 API 仍对显式安装的插件
可用。

### 给插件任意 `sessionId` 参数

否决：插件将能读取每个打开的会话。进行中工具身份与 `pi.browser.*`
使用的是同一种绑定。
