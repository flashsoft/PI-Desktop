# ADR 0003: 混合运行时 —— Rust 宿主核心 + Node pi agent sidecar

- 状态: 部分被 ADR 0010 / ADR 0011 取代
- 日期: 2026-07-25
- 更新: 2026-07-25

## 背景

最初的 MVP 为简单起见，将完整的 agent 循环放在 Electron 主进程中。

新的产品约束：

1. 倾向于更强的系统化后端
2. 保留 pi Agent Harness 作为模型/agent 引擎
3. 提升长期隔离性和原生能力质量

## 原始决策

MVP 的 agent 循环放在 Electron 主进程中。

## 修订方向

采用混合模型：

- **Rust 后端宿主核心** 拥有桌面宿主服务、工具沙箱、插件宿主边界、持久化适配器和特权操作
- **Node/TypeScript pi 运行时** 仍然是 agent 循环引擎（`pi-ai` + `pi-agent-core`），以受控的 sidecar/utility 进程运行
- **Electron 主进程** 变为渲染进程 IPC 与 Rust/Node 服务之间的薄编排层

## 后果

### 正面
- 更好的原生/宿主能力基础
- 更清晰的权限边界
- 保留 pi 生态的杠杆效应

### 负面
- 集成复杂度高于纯 Node 主进程方案
- 需要 Electron/Rust/Node 之间稳定的本地 RPC
