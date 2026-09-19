# ADR 0001: 使用 Electron 作为桌面外壳

- 状态: 已接受
- 日期: 2026-07-25

## 背景

PI-Desktop 需要桌面分发、本地权限控制、会话 UI 以及系统集成能力。主要候选方案是 Electron 和 Tauri。

## 决策

采用 **Electron** 作为桌面外壳。

## 理由

1. 与已调研的 ChatGPT Desktop / WorkBuddy 技术路径接近，更容易借鉴其工程经验
2. Node 生态与 pi 的 TypeScript 运行时契合更顺畅
3. 原生模块、调试工具链和打包资源更成熟
4. 团队当前路线图明确偏向 Electron

## 后果

### 正面
- 开发速度快
- agent 运行时可以直接放在 main/node 侧
- 后续集成 pty、sqlite、自动更新更为常规

### 负面
- 相对 Tauri 包体积和内存占用更大
- 需要严格执行 Electron 安全基线

## 备选方案

- Tauri 2：更轻量，但与当前路线图不一致；不作为 MVP 基线
