# ADR 0155: 新增智谱 / Z.AI 命名端点预设

- Status: Accepted
- Date: 2026-09-05
- Deciders: PI-Desktop core
- Updates ADR 0012, ADR 0020, and ADR 0116

## 背景

智谱 AI（Zhipu）暴露两种产品模式和两个区域：

- 标准 API 与 GLM Coding Plan
- 中国（`open.bigmodel.cn`）与国际（`api.z.ai`）

pi-ai 已经为两个 Coding Plan URL 提供了 Completions 传输（`zai`、
`zai-coding-cn`），并从这些主机检测 `thinkingFormat: "zai"`。
models.dev 已经发布全部四个端点。PI-Desktop 的添加 provider 对话框
此前是一个通用的 OpenAI 兼容表单，因此用户必须知道要粘贴哪个 URL，
而且保存的行使用 `vendorKey: "custom"`。

Issue #35 要求对 API 与 Coding Plan、中国与国际做一等配置，而不
引入新的厂商 SDK。

## 决策

在添加 provider 的 **Service** 选择器中暴露四个命名端点预设。它们
保留在既有的 OpenAI 兼容路径上：

```text
vendorKey              baseUrl
zhipuai                https://open.bigmodel.cn/api/paas/v4
zhipuai-coding-plan    https://open.bigmodel.cn/api/coding/paas/v4
zai                    https://api.z.ai/api/paas/v4
zai-coding-plan        https://api.z.ai/api/coding/paas/v4
```

选择预设会填入名称、锁定 Base URL、保持 `apiStyle:
"chat_completions"`，并持久化 models.dev 的 `vendorKey`。显示名保持
可编辑。Coding Plan 显示一行 API key 提示。这是一个紧凑的选择器，
而不是恢复的厂商卡片网格。

pi-ai 的 `zai` 传输是国际版 Coding Plan，而 models.dev 的 `zai` 是
标准 API。PI-Desktop 存储 models.dev 键加精确 URL，使目录匹配无法
混淆它们。`zai-coding-cn` 仍是 `zhipuai-coding-plan` 的别名。

当配置的 URL 或 `vendorKey` 匹配预设时，sidecar 的 Completions 模型
记录获得 `thinkingFormat: "zai"` 和 `zaiToolStream: true`。不引入新的
线上适配器、密钥表或宿主协议。

## 后果

- 中国和国际的智谱用户无需从外部文档复制 URL 即可在 API 与
  Coding Plan 之间选择。
- 目录丰富跟随所选端点，而不是通用的 custom 行。
- 通用 OpenAI 兼容配置仍是 Custom 端点选项。
- OpenCode Go 保持为 API 风格预设；智谱不会增加四个更多的 apiStyle
  值。
