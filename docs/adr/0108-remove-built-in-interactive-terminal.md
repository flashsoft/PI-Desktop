# ADR 0108: 移除内置交互式终端

- Status: Accepted
- Date: 2026-08-19
- Deciders: PI-Desktop maintainers
- Related: [ADR 0019](0019-work-panel-subsystems.md) ·
  [ADR 0105](0105-files-as-a-bundled-plugin.md) ·
  [01-ui-ia](../spec/04-ux/01-ui-ia.md) ·
  [08-component-spec §5](../spec/04-ux/08-component-spec.md) ·
  [01-ipc-protocol §13a](../spec/03-runtime/01-ipc-protocol.md) ·
  E2E-058
- Supersedes in part: D249 and the interactive-terminal clauses of ADR 0019
  and ADR 0105; records D251

## 背景

工作面板此前包含一个交互式 shell，由 Electron Main 中的 PTY 和工
作面板 UI 中的终端渲染器支撑。该表面与 agent 的非交互式 `Bash`
工具是分开的，但它为桌面应用增加了一个原生模块、渲染进程依赖、
终端专用 IPC、打包规则，以及第二个 shell 生命周期。

产品不需要拥有交互式 shell 也能保持 Agent Bash 有用。需要交互式
shell 的用户可以使用其操作系统或开发环境提供的外部终端，而命令
调用和有界输出仍在会话中保持可见。

## 决策

1. 移除工作面板交互式终端。面板保留插件贡献的视图，包括捆绑的
   Files 和 Browser 视图（ADR 0170），以及由会话产物打开的
   Review/文件标签页。
2. Agent Bash 保持不变。它仍是一个权限感知的、非交互的 agent 工
   具，其命令、输出、状态、复制行为和 `IconTerminal` 呈现保留在
   transcript 中。计划刷新状态中的 `"terminal"` 等通用生命周期值
   与此无关且仍然有效。
3. 删除仅终端使用的 Electron Main 管理器、渲染进程组件和样式、
   IPC invoke/事件通道、共享终端负载类型以及终端专用测试。移除
   PTY/xterm 依赖及其构建、解包和 lockfile 配置。
4. 不用插件 PTY API 替代被移除的表面。交互式 shell 访问被刻意委
   托给外部终端，不引入新的插件权限或私有捆绑插件通道。
5. 不递增冻结的桌面协议版本。被移除的通道是桌面 IPC 新增项；
   Agent Bash、宿主 RPC 和共享生命周期协议保持不变。

## 后果

- 工作面板没有交互式 shell 标签页或终端启动器，其空状态只列出
  Browser 和作用域内的插件视图。
- 桌面打包不再携带 PTY 原生模块或终端渲染器依赖，减少了原生构
  建和发布面。
- 交互式 shell 工作流需要外部终端。Agent Bash 仍是应用内有界、
  模型指导的命令执行路径。
- 历史上的 D099/D249 记录作为历史仍然有用，但其终端实现和保留
  条款被本决策取代。

## 考虑过的替代方案

### 把 PTY 保留在宿主中

被拒绝：它为产品不再需要拥有的表面保留了第二个 shell 生命周期
和原生依赖。

### 把 PTY 移进插件

被拒绝：插件 PTY 权限会授予以用户身份的任意执行，而仅限捆绑的
通道会制造一个私有信任边界例外。

### 把 Agent Bash 变成交互式终端

被拒绝：Bash 刻意是有界的、权限感知的、归 transcript 所有的。把
它变成长生命周期的交互式会话会改变 agent 协议和安全模型，而不
是简单地移除工作面板表面。
