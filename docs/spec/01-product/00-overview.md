# 00. 概览

## 一句话定义

**PI-Desktop** 是一个本地优先的 AI 编程 agent 桌面客户端，构建于：

- Electron 桌面外壳
- Rust 宿主后端核心
- 用于模型/agent 循环的 pi Agent Harness
- 用户可安装的插件扩展
- 独立的 MCP 服务器、Skills 与 Subagents

## 产品公式

```text
PI-Desktop =
 Electron Shell
 + React UI (English-first)
 + Rust Host Core
 + pi Agent Runtime
 + Local Tools
 + Plugin System
```

## 目标

1. 为 pi 驱动的 agent 提供稳定的桌面 UX
2. 支持多 provider 流式聊天
3. 在显式权限下执行本地工具
4. 在本地持久化会话、设置与秘密
5. 允许用户安装/开发插件
6. 以英语为默认语言，作为全球化产品交付
7. 让同一个 Agent 检查任务、提交结构化 Plan，并仅在用户单独批准之后
   才继续以 Agent 执行
8. 让同一个 Agent 协商一份已批准的 Goal 契约，然后在 Agent 模式下
   自主追求其验收标准
9. 让项目会话、导入、扩展和定时 prompt 在日常本地工作中切实可用

## 非目标（MVP）

- 远程 WebUI / Gateway 控制
- 完整 IDE 替代
- 多人协作
- 用 Rust 重写 pi
- 市场优先的分发

## 关键架构决策

| 决策 | 选择 |
|---|---|
| 桌面外壳 | Electron |
| UI | React + Vite + TypeScript |
| 默认语言 | English |
| 宿主后端 | Rust |
| Agent 引擎 | pi（`pi-ai` + `pi-agent-core`） |
| Agent 进程 | Node sidecar / 受控进程 |
| 渲染器访问 | 仅 preload IPC |
| 扩展 | 用户可安装的插件 |
| 存储 | SQLite + 安全秘密存储 |

## 最小用户闭环

1. 启动 PI-Desktop
2. 配置 provider/API key
3. 打开一个项目工作区
4. 创建会话并发送任务
5. 选择 Agent、Plan 或 Goal；可选地检查项目并提交一份
   Markdown 检查点
6. 批准或拒绝该检查点，并选择执行权限模式
7. 在需要时批准本地工具执行
8. 在转录中审阅 diff、命令输出、浏览器预览，以及工作面板中的文件
9. 重启应用；被中断的契约工作不会重放

## 质量原则

1. **引擎稳定优先** —— 先让 pi 循环正确，再谈功能扩张
2. **默认最小权限** —— 对有风险的工具/插件默认拒绝
3. **可观测性** —— 每次工具调用和失败都可追踪
4. **可替换性** —— provider/工具/存储可以演进
5. **全球化就绪** —— 早期确立英语源字符串与本地化架构

## 文档地图

- 基线：`../00-baseline.md`
- 产品范围：`01-product-scope.md`
- 架构：`../02-architecture/01-architecture.md`
- IPC：`../03-runtime/01-ipc-protocol.md`
- Agent 运行时：`../03-runtime/02-agent-runtime.md`
- 工具/权限：`../03-runtime/03-tools-and-permissions.md`
- 里程碑：`../06-delivery/01-mvp-milestones.md`
- 插件：`../07-plugins/01-plugin-system.md`
