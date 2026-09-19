# ADR 0101: 感知模型的图片附件传输

- Status: Accepted
- Date: 2026-08-18
- Deciders: PI-Desktop runtime and desktop UI maintainers
- Amends: D197, ADR 0059, ADR 0070
- Amended by: D361 (inline bound is 10 MB, matching MiniMax's OpenAI-compatible cap), D392 / ADR 0218 (binding image-input overrides)

## 背景

剪贴板图片可以成功实体化，但 Composer 把每个文件都降级为
`@<path>` 文本。因此支持图片输入的模型收到的是文件系统引用，而
不是图片块。能力信号必须由 pi-ai 用来序列化 provider 请求的同一
个模型目录拥有；渲染进程的发现和用户输入的模型 id 都不是充分证
据。

## 决策

1. 保持 Composer 草稿紧凑且文本化。每个文件引用保留其种类、名
   称、MIME 类型和来源路径作为结构化元数据；可见的 textarea 中绝
   不包含粘贴的二进制数据。
2. 从精确的 pi-ai 模型记录解析视觉能力。只有
   `model.input.includes("image")` 才启用图片传输。未知和自定义
   模型 id 保持走保守的非视觉路径，即使发现元数据声称 `vision`。
3. Electron 主进程仍是附件边界。它针对会话 scratch 根、会话绑定
   的项目根或内容寻址的附件根校验每个来源路径。图片存储为
   `attachments/<sha256>`，持久化的 `UiMessage` 只存储引用和元数
   据。
4. 对具备视觉能力的模型，10 MB 内联限制内的图片仅以瞬态 base64
   数据穿过 sidecar，并成为 pi-ai 的图片内容块。base64 值绝不会
   持久化到 SQLite、JSONL 或渲染进程 transcript 状态中。
5. 对非视觉模型、未知模型或超过内联限制的图片，prompt 收到安全
   的 `@path` 回退。重放的内容存储图片在该回退暴露给模型之前，
   会先被复制到会话 scratch 的 `replayed/` 目录。
6. 附加图片时 Composer 显示一条紧凑的无障碍状态行：说明所选模
   型是否能接收视觉输入。模型选择器和会话/provider 摘要暴露同一
   个权威视觉能力。

## 后果

- GPT/具备视觉能力的模型可以检查粘贴的图片，无需按模型定制的渲
  染进程实现。
- 纯文本和非视觉模型保留现有的文件工具工作流。
- 图片字节被去重，并可在重试、fork 和运行时重建后存活，而无需
  把二进制数据放进 transcript。
- 附件垃圾回收仍是后续的存储任务；引用是内容寻址的，因此可以在
  不改变消息契约的情况下添加。
- 完整视觉预览、拖拽、图片变换和 provider 特定的图片限制仍在范
  围之外。10 MB 内联阈值是应用侧的安全界限；provider 可能施加更
  严格的限制并返回其正常的 provider 错误。

## 被拒绝的替代方案

- **始终发送 `@path` 文本：** 保留非视觉行为，但无法满足视觉模
  型。
- **信任渲染进程/provider 发现标志：** 可能宣传运行时适配器无法
  序列化的能力，并使未知模型的分类变得不安全。
- **在消息中持久化 base64：** 使重载和 SQLite/JSONL 增长失去界
  限，并无谓地越过持久化边界。
