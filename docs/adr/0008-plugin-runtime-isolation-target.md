# ADR 0008: 插件运行时的目标是在独立进程中隔离

- 状态: 已接受（2026-07-29 已实现）
- 日期: 2026-07-25

## 背景

插件代码是不可信的；我们必须防止它拖垮或侵入宿主。

## 决策

目标架构：插件主体运行在**独立进程**（UtilityProcess/Child Process）中，通过 RPC 访问 Host API。

如果 MVP 进度受限，可以暂时采用更轻量的隔离方式，但不得破坏：

- 权限网关
- API 白名单
- 贡献点的统一注册
- 崩溃不致命

临时方案及其迁移计划必须在实现 ADR 中注明。

## 理由

1. 崩溃隔离
2. 权限代理更清晰
3. 后续可以加入资源限制

## 后果

### 正面
- 更好的安全性和稳定性

### 负面
- 实现和调试成本更高

## 实现（2026-07-29）

目标架构已发布；不再保留任何过渡期主进程内运行时。

- `apps/desktop/electron/main/plugin-host-process.mjs` 是每个插件的入口，
  通过 `utilityProcess.fork` 派生（每个插件一个进程，打包到
  `out/main/plugin-host-process.js`）。它接收最小化环境，因此
  宿主的 shell 环境变量和 provider 密钥永远不会到达插件代码。
- `apps/desktop/electron/main/plugin-runtime.ts` 变为代理层：它维护
  命令/工具的注册表，每个 `pi.*` 调用都以 RPC 形式到达，依次经过
  `HOST_API_ALLOWLIST`、`assertPermission`、宿主服务，最后写入
  审计日志。插件代码不持有任何宿主对象，也不能 `require` 宿主模块。
- 贡献点仅以描述符形式注册；可调用的一半留在插件进程中，通过 RPC
  回调调用并带超时（命令 30s，工具 110s，生命周期钩子 5s，加载 15s）。
- 垂死的插件进程会被收容：挂起的调用以 `PLUGIN_CRASHED` 拒绝，
  贡献被注销，面板关闭，渲染进程收到 toast 和 `pluginChanged`。
- `onUnload` 现在（在子进程中）于进程被杀掉之前运行。

已知限制，明确不在本次改动范围内：

- 插件进程是 Node 环境；权限管控覆盖 `pi.*` 接口面，
  不覆盖插件进程内原始的 `require("node:fs")`。能力沙箱
  （D009）仍是未来工作。
- 资源限制（CPU/内存）尚未强制执行。
- manifest 中声明的权限仍在加载时自动授予。
