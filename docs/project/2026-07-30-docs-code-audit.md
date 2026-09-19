# 文档与代码一致性审计（2026-07-30）

## 范围与方法

本次审计覆盖 commit `5891920`（审计分支创建之前的 `main`）下 `docs/`
中的每一份 Markdown 文档：共 111 份。

| 领域 | 文档数 | 审查方法 |
|---|---:|---|
| 根文档与项目跟踪 | 3 | 链接、元数据、交付声明 |
| ADR | 38 | 索引覆盖、取代关系与实现引用 |
| Spec 根 | 7 | 基线与导航一致性 |
| 产品 | 4 | 对照打包 / 发布配置核实范围与平台声明 |
| 架构 | 4 | 对照 Electron/Rust 代码核实进程所有权与包边界 |
| 运行时 | 17 | 协议、存储、运行时、安全与 Provider 契约 |
| UX | 11 | 当前组件 / 交互引用与实现状态声明 |
| 安全 | 2 | 渲染进程、插件与更新的信任边界 |
| 交付 | 7 | 构建、测试、发布与工作流契约 |
| 插件 | 15 | Manifest、API、安装、隔离与市场契约 |
| 元数据 | 3 | 决策、基线引用与待决问题状态 |

本次审查结合了完整的静态走查（相对链接、文档索引、引用的源码路径、
版本引用和实现状态标记）与对 Electron main/preload、Rust host-core、
agent 运行时、共享协议、包清单、发布工作流和测试的源码级核查。
它不声称静态源码契约测试等同于渲染后的桌面端到端测试。

## 已核实的一致项

- 全部 111 份 Markdown 文档的相对 Markdown 链接均有效，未发现失效的
  内部目标。
- 已实现的核心拓扑仍是冻结架构：沙箱化的 Electron 渲染进程、
  Electron main/preload 桥、基于 NDJSON JSON-RPC 的 Rust host-core，
  以及 Node pi sidecar。见
  `docs/spec/02-architecture/01-architecture.md` 和
  `apps/desktop/electron/main/{host-process,agent-sidecar}.ts`。
- 实现中 SQLite 所有权仅在 Rust：`Database::open_in_dir` 创建
  `<data_dir>/pi.sqlite`，而 transcript 仍以 JSONL 形式存放在
  `<data_dir>/sessions/`（`crates/host-core/src/{db,transcripts}.rs`）。
- 当前的项目指令链、thinking 等级流转、上下文 checkpoint 压缩、
  Provider 目录所有权和会话级工作面板，都有匹配的运行时代码、ADR
  和 E2E 计划条目。
- 最近的全局搜索、设置信息架构、OS 语言环境和项目指令改动，都有
  当前的 spec/ADR 覆盖，而不只是停留在源码里。

## 发现

### P0 - 市场插件没有能力沙箱

市场可以下载并启用插件，而每个插件在 Electron `utilityProcess` 中
执行。该进程通过 Node 的 `createRequire` / 动态 `import` 直接导入
插件代码；因此插件代码可以绕过代理的 `pi.*` API，独立使用 Node
内建模块。代理层的权限检查只保护经由 `pi.*` 发起的调用，管不到
直接的 `node:fs`、`node:child_process` 或网络访问。

证据：

- `docs/spec/07-plugins/01-plugin-system.md:185-192` 记录了独立进程，
  并明确承认原始 Node 内建模块仍然可达。
- `apps/desktop/electron/main/plugin-runtime.ts:159-178` 通过
  `utilityProcess.fork` 以普通 Node 环境启动进程。
- `apps/desktop/electron/main/plugin-host-process.mjs:17-20,174-196`
  通过 Node 模块加载器导入任意的插件入口模块。
- `docs/spec/07-plugins/01-plugin-system.md:230-234` 仍然把宿主 API
  边界描述得好像它能阻止任意的子进程和文件系统访问。

影响：一个市场安装包实际上是拥有用户权限的原生代码，而不是权限
受限的插件。当前的 UI 和权限矩阵可能造成虚假的安全预期。

在扩大市场分发之前必须完成的处置：

1. 禁用远程安装 / 自动启用，或者在真实隔离存在之前把它明确标注为
   不受限的代码执行。
2. 实现带允许清单运行时和操作系统级资源 / 进程限制的能力沙箱，或
   把不受信任的插件执行移入独立沙箱进程。
3. 增加对抗性测试，证明直接的 Node 文件系统、子进程和网络访问无法
   绕过已授予的权限。
4. 用一份新 ADR 记录选定的安全边界，然后一起更新插件、安全、市场
   和验收文档。

### P1 - Manifest 规范远强于实际校验

文档化的 manifest 契约要求 `schemaVersion: 1`、已知权限、安全的
相对路径、贡献点依赖和存在的 skill/panel 路径。而实际生效的校验器
只要求其中一小部分字段，并且对 manifest 路径使用未检查的 `join`
操作。

证据：

- 要求的规则：`docs/spec/07-plugins/02-plugin-manifest-schema.md:119,
  134-142`。
- SDK 校验只检查 object/id/name/version/main/schemaVersion：
  `packages/plugin-sdk/src/index.ts:141-165`。
- 宿主校验只检查非空字符串和 `path.join` 之后的存在性：
  `crates/host-core/src/plugins.rs:330-357`。
- 运行时加载重复了未检查的入口 join：
  `apps/desktop/electron/main/plugin-runtime.ts:245-260` 和
  `plugin-host-process.mjs:188-196`。

处置要求：让校验器成为权威（schema 版本相等、权限允许清单、
semver/id 语法、拒绝绝对路径或 `..` 路径、贡献点依赖检查，以及
规范化包含校验），然后为每个被拒绝的字段补负面测试。不要为了让
文档契约迁就残缺的校验器而削弱契约。

### P1 - 宿主所有权决策与实现已经漂移

冻结基线把 Electron main 描述为薄编排层、Rust 作为宿主 / 系统能力
的所有者。实践中 Electron main 拥有一大片高权限界面：PTY 生命
周期、浏览器视图、更新器、插件运行时、文件系统面板、导入器和
sidecar 监督。

证据：

- 冻结的角色划分：`docs/spec/00-baseline.md:50-53` 和
  `docs/spec/02-architecture/01-architecture.md:31-37,61-73`。
- Electron main 直接导入这些服务：
  `apps/desktop/electron/main/index.ts:51-70`。

这是可维护性和安全边界风险，而不是声称当前应用无法工作。选择并
记录一个连贯的方向：把终端 / 浏览器 / 插件宿主服务移到 Rust
host-core 契约之后，或者明确修订冻结边界，让 Electron main 成为
高权限桌面服务的所有者，而 Rust 只拥有列出的持久服务。该选择需要
一份 ADR，因为它改变了冻结的安全 / 数据边界。

### P1 - 远程市场完整性不等于来源验证

市场安装包从远程目录拉取，并用同一个目录提供的 SHA-256 值校验。
这能检测传输损坏，但在目录来源被攻陷之后无法确立发布者来源。
当前实现刻意没有强制的签名校验。

证据：

- 远程 Provider 与 `curl` 拉取记录在
  `docs/spec/07-plugins/07-plugin-marketplace.md:27-40`。
- 拉取并安装市场安装包的代码在
  `crates/host-core/src/plugins.rs:641-723,898-997`。
- 签名验证仍是计划项，见
  `docs/spec/07-plugins/08-plugin-signing-updates.md:142-156`。

处置：在签名的目录与安装包来源得到强制执行之前，保持市场明确处于
实验状态，或者改用能提供独立固定信任材料的安装包来源。这个问题
与 P0 的执行边界相互叠加。

### P2 - 插件 API、生命周期、存储和 IPC 文档混杂目标契约与已交付契约

若干插件文档暴露了并不存在的 API 或行为，同时一些当前行为没有被
准确表达。

- `pi.events.on/off` 被记录为 MVP 事件，但在
  `plugin-host-process.mjs:166-170` 中是 no-op。
- 概览文档记录了 `pi.agent.invokeSkill` 和
  `pi.agent.appendSystemHint`，但 SDK 和宿主进程中都不存在；
  `packages/plugin-sdk/src/index.ts:95-118` 才是已实现的 API 面。
- themes、entrypoints、`resizable`、富作者数据和逐工具的
  timeout/permission 元数据等 manifest 字段被描述了，但 Rust 的
  manifest 表示忽略了它们（`crates/host-core/src/plugins.rs:81-99`）。
- 插件设置由 Electron main 存储到每个插件的 `settings.json`
  （`plugin-runtime.ts:650-671`），而不是
  `docs/spec/07-plugins/11-plugin-storage-isolation.md:61-73` 所描述
  的、作为当前推荐机制的宿主 `kv` 命名空间。
- IPC 清单包含 reload、logs、open data directory 等目标端点，但没有
  对应的共享 IPC 声明。已发布的 API 必须从
  `packages/shared/src/protocol.ts` 生成，或与之对照测试。

处置：把未实现的字段 / API 标记为计划项；从单一 schema 生成公开的
插件类型与校验；并新增一个契约测试，把 manifest/API/IPC 文档示例与
已交付的 SDK 和协议对照。

### P2 - 多处产品与发布姿态已经过时

- `docs/spec/01-product/01-product-scope.md:42-60,95-103` 仍把 macOS
  描述为唯一必需平台，把 Windows/Linux 列为计划项。而基线和
  electron-builder 配置发布的是 macOS arm64、Windows x64 和 Linux
  x64 三条线。
- `docs/spec/02-architecture/02-tech-stack.md:22-26` 写的是 pnpm 10.x，
  并允许通过 Node 适配器使用 SQLite。根 `package.json` 要求
  pnpm 11.18.0，且存储由 Rust `rusqlite` 拥有。
- `docs/spec/05-security/01-security.md:78-84` 声称插件仅限本地，
  但市场会执行远程安装包安装。

本次审计中无歧义的元数据和索引修正已随附带的文档提交一并应用。
平台与安全措辞必须继续跟踪上文最终的信任边界决策。

### P3 - 元数据、导航与跟踪漂移

- 尽管 `00-baseline.md` 已是 0.4.12，`docs/README.md`、
  `docs/spec/README.md` 和 `docs/spec/08-meta/open-questions.md`
  仍引用更旧的基线版本。
- `docs/adr/README.md` 漏掉了已接受的 ADR 0036，尽管该 ADR 文件
  存在。
- `docs/project/BOARD.md` 是明确标注日期的历史快照，并不反映
  2026-07-30 的交付状态。它要么作为活看板维护，要么明确归档，
  让位于单一的当前跟踪工具。
- `docs/project/README.md` 含有简体中文段落，违反仓库的
  English-first 文档规则。

## 测试与交付路径评估

源码契约测试套件规模可观，但文档化的 E2E 计划在很大程度上是一份
以单元 / 源码测试作为部分证据的 specification。该计划本身正确地
把许多渲染后的旅程标记为 Draft 或手动。在宣布 M5 加固完成之前，
优先为以下内容补齐真实打包应用覆盖：

1. 渲染进程 / preload 权限边界；
2. 市场安装与禁用插件恢复；
3. 所有文件入口的工作区逃逸 / 符号链接行为；
4. 每个已发布平台上的更新；以及
5. 并发会话 / 权限焦点行为。

本次审计没有运行任何本地 E2E 命令，因为仓库规则禁止在没有明确
要求的情况下手动触发本地 E2E 任务。

## 随本次审计一并应用的即时文档修正

- 把过时的基线元数据更新到 0.4.12。
- 把 ADR 0036 加入 ADR 索引。
- 更正技术栈文档中的 pnpm 版本与 SQLite 所有权表述。
- 更正产品平台表与远程插件安全声明。
- 从项目跟踪链接本报告，并让该索引保持 English-first。

## 后续关卡

不要只靠改文字来关闭 P0/P1 发现。下一个实现请求必须从插件执行 /
信任决策开始，更新相关 ADR 与 specification，实现该边界，并补上
针对性的负面测试和打包应用测试。
