---
title: 从这里开始
description: PI-Desktop 产品及其文档的简短导览。
---

# 从这里开始

PI-Desktop 是一个本地优先的 AI 编程 Agent 桌面客户端。它让工作区、
宿主进程、Agent 运行时和 Provider 配置保持可见、可检视，同时让日常
编程工作依然直接顺手。

## 选择一条路径

| 如果你想…… | 从这里开始 |
|---|---|
| 看看应用长什么样 | [界面截图](/guide/screenshots) |
| 了解已交付的内容 | [产品范围](/spec/01-product/01-product-scope) |
| 理解系统如何组合在一起 | [架构](/spec/02-architecture/01-architecture) |
| 追踪协议或存储边界 | [运行时 spec](/spec/03-runtime/01-ipc-protocol) |
| 构建扩展 | [插件开发](/plugin-development) |
| 理解决策为何存在 | [ADR 索引](/adr/README) |
| 验证用户可见的改动 | [E2E 测试计划](/spec/06-delivery/04-e2e-test-plan) |

## 心智模型

```text
Renderer UI  →  Electron orchestration  →  Rust host core
      ↓                    ↓                       ↓
  transcript          pi Node sidecar          SQLite + processes
```

渲染进程负责呈现。Electron 主进程协调桌面能力：窗口生命周期、IPC
路由、进程监督、更新客户端，以及插件、MCP 桥接和可选的 loopback
MCP 控制服务。Rust 宿主负责工具执行与工作区沙箱、权限网关、插件
宿主服务、RPC 和持久化。pi sidecar 负责 Agent 循环和面向 Provider
的模型工作。

## 使用本文档

文档在事实来源层面以简体中文撰写。技术标识符保持英文原样，因此搜索
和交叉引用路径保持稳定。当你知道某个术语、协议方法或决策编号时，
使用全局搜索；当你在探索某个领域时，使用侧边栏。

## 改动边界之前

1. 阅读相关 spec。
2. 查看链接的 ADR 和决策日志。
3. 当行为是用户可见或协议可见时，更新 E2E 场景。
4. 运行最窄的有效验证，并在改动中记录结果。

完整的仓库规则见 [AI 开发工作流](/spec/06-delivery/03-ai-development-workflow)
和[变更检查清单](/spec/06-delivery/05-change-checklist)。
