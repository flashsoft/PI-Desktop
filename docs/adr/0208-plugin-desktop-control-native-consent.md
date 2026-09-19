# ADR 0208: 插件桌面控制需要原生用户同意

- Status: Accepted
- Date: 2026-09-10
- Decision: D377
- Related: ADR 0203 (local MCP control plane), D370, D372,
  [07-plugins/03-plugin-api.md](../spec/07-plugins/03-plugin-api.md),
  [07-plugins/04-plugin-security.md](../spec/07-plugins/04-plugin-security.md) §8.2,
  [07-plugins/13-plugin-permissions-matrix.md](../spec/07-plugins/13-plugin-permissions-matrix.md)

## Context

`desktop.control` 赋予插件本地 MCP 控制面所暴露的经审查操作目录：
项目、会话、Agent 和工作区操作，各自标记为 `read`、`write` 或
`dangerous`。目录和调用路径与 MCP 共享，因此只有一套权限和持久化
实现。

共享控制器对 `dangerous` 操作要求 `confirm: true`。对外部 MCP agent
来说，该标志是文档化的契约：它是 agent 的确认，而不是桌面提示
（D372）。当同一控制器从插件代码触达时，该标志由插件设置，因此持
有 `desktop.control` 的插件可以在没有人在回路的情况下删除会话、把
会话切换为 `auto` 工具审批，或解决一个待处理的工具权限。展示自己
确认卡片的对话式插件是自我监管的，而且卡片只能显示插件（或其背后
的模型）选择展示的内容。

## Decision

1. 来自插件的 `dangerous` 桌面操作需要两个答案。首先仍然要求插件的
   `confirm: true`（否则返回 `CONFIRMATION_REQUIRED`），因此未确认
   的调用永远不会到达用户。
2. 之后，Electron 主进程在附着于主窗口的原生阻塞对话框
   （`plugin-desktop-consent.ts`）中询问用户。对话框显示目录操作
   id、目录描述和有界的参数预览。它绝不显示插件或模型撰写的文本，
   因此被提示注入的 transcript 无法把 `session/delete` 重新标注为某
   种无害操作。
3. Escape、关闭和 Deny 都是拒绝（`PERMISSION_DENIED`）。答案按调用
   生效；危险操作没有“允许直到退出”。
4. 不提供对话框服务的宿主（无头或测试运行时）拒绝来自插件的每一个
   危险操作。`read` 和 `write` 操作不变。
5. 每次调用都以插件 id、操作和风险进行审计；拒绝以
   `PERMISSION_DENIED` 审计。
6. `ui.microphone` 保持为一个独立的、更窄的授权：仅音频采集，且仅在
   插件的隔离面板会话内；摄像头和其他设备权限保持拒绝。

## Consequences

- 插件发起的破坏性桌面操作获得了与插件在 manifest 范围之外访问文件
  已有的人 in-the-loop 保证（`confirmFsAccess`）相同的保障。
- MCP 契约不变：外部 agent 仍然以 `confirm: true` 确认，而桌面用户
  正是启用回环控制面的人。
- 插件作者必须预期会出现原生提示，不应承诺无人值守的危险操作。
- 由 `apps/desktop/test/plugin-desktop-control.test.mjs` 和 E2E-236
  覆盖。
