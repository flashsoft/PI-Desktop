# ADR 0044: 会话绑定的项目指令预检

- 状态： 已接受
- 日期： 2026-08-02
- 相关： [ADR 0037](0037-project-instruction-chain.md) ·
  [Agent runtime](../spec/03-runtime/02-agent-runtime.md) ·
  [日志](../spec/03-runtime/09-logging-and-observability.md)

## 背景

按路径界定作用域的指令加载在每个文件工具之前运行。解析器位于 Electron 主进
程，但它首先调用 host-core 的 `session.get` 来重新发现项目根。因此，缓慢或
拥塞的宿主会拖慢一个本来纯本地的文件操作，并使这段延迟出现在通用的宿主往
返耗时统计中。同一 prompt 内的重复读取也会重复相同的指令解析。

## 决策

1. Electron 主进程在 runtime 启动期间从宿主持有的会话记录推导项目根，并把
   它作为启动元数据传入。
2. Electron 主进程在每次 prompt 或压缩请求之前，把该根注册到 sidecar 包装
   器上。反向 `project.instructions.resolve` 请求使用此绑定；sidecar payload
   提供的任何根都会被忽略。
3. sidecar 维护一个按注册的根和目标目录为键的按 prompt 认领映射。成功的结
   果和尽力而为的回退结果都会被该 prompt 内后续的文件工具复用。该映射在下
   一个 prompt 之前清空，因此指令编辑在消息之间可见。
4. 工具计时把指令预检与 `hostRttMs` 分开报告，并带缓存命中与基础回退标记。

## 后果

- 文件工具预检不再增加一次 host-core `session.get` 往返。
- 同一目录中的重复文件工具避免了重复的解析器 IPC 与文件发现，同时保留跨
  消息的新鲜度。
- ADR 0037 的主进程收容边界保持显式：sidecar 只选择目标路径，而 Electron
  主进程持有项目根。
- 解析器超时或宿主失败仍为尽力而为，并回退到基础指令链，不会携带兄弟目录
  的指令。

## 已拒绝的备选方案

- **跨所有 prompt 缓存指令链：** 在指令文件变更后有过期规则的风险，且需要
  文件监听或 stat 失效机制。
- **信任 sidecar 发送的项目根：** 削弱会话绑定的收容边界，并让模型引导的输
  入选择扫描根。
- **保留逐文件的 `session.get`：** 在最热的文件工具预检路径上保留一个本可
  避免的宿主依赖。
