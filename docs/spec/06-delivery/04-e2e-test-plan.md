# 04. E2E 测试计划

> 范围：PI-Desktop 的 MVP 验收场景以及当前已交付的产品增量
> 状态：已接受（协议/Electron 自动化已启用；完整的桌面 Playwright 仍在规划中）
> 交叉引用：[acceptance-criteria](02-acceptance-criteria.md) · [milestones](01-mvp-milestones.md) · [ai-development-workflow](03-ai-development-workflow.md) · [change-checklist](05-change-checklist.md)

---

## 1. 目标

### E2E-PLUGIN-appearance-extension-lifecycle

- **前置条件：**一个 fixture 插件声明了 `ui.theme`、`ui.settings`，以及一个
  带资源背衬的风景卡片，其中有类型化的 `--nexus-backdrop-blur` `0..20px` 变量。
- **步骤：**打开设置，通过搜索和键盘导航找到最后的 Extensions 分组，打开该条目，
  修改变量，选择/重新选择主题，重启，然后在该插件条目处于激活状态时
  禁用、重载并卸载该插件。
- **预期：**Extensions 栏绘制目标位置的宿主图标令牌
  （`palette` / Lucide Palette），而不是 Skills 的书本字形，也不是插件的 SVG。
  应用（Apply）后只有声明过的变量规则发生变化；静态的
  `plugin-asset://` URL 保持有效；重启后数值恢复；宿主渲染的卡片
  在其半透明内容背后保留风景背景，没有不透明的原生矩形，并且在
  设置打开时 Windows/Linux 的最小化/最大化控件仍可点击。非法/跨插件的值
  被拒绝。每次生命周期转换都会移除该条目并把应用带回 General。
- **状态：**已记录文档；合入 main 后运行。

- 记录 MVP 必须验证的每一项用户可见和协议可见行为。
- 提供映射到验收标准（A–H）和里程碑（M1–M6）的场景目录。
- 作为可追溯性主干：场景 ID ↔ 验收标准 ↔ 规格。
- 为在拉取请求之前合入集成的 `main` 的、携带代码的变更
  定义必需的 E2E 门禁。
- 让验证证据始终绑定到门禁运行时的提交，以及任何
  改变已落地可执行内容的后续提交。

## 2. 非目标

- 完整的 UI 驱动自动化覆盖；协议与源码契约自动化已启用，
  而更广泛的桌面套件仍在规划中。
- 通用的性能/压力测试（MVP 之后）；桌面响应性的有界回归检查
  由相关功能场景覆盖。
- 原生 Windows/Linux 发布资格认定（已发布产物存在；原生
  资格认定差距仍保留在文档中）。
- 恶意插件沙箱场景。发布者来源与商店下载边界
  现在已纳入范围（E2E-024R 至 E2E-024V）；基本的
  浏览/安装/更新流程原本已在目录中。
- 远程 Gateway / 浏览器控制仍不在范围内（ADR 0004 / 基线
  #20）；有界的本地回环 MCP 控制面由 E2E-220 覆盖。

---

## 3. 测试金字塔

```
        ╱  E2E  ╲           — few, high-value, cross-system
       ╱ Integration ╲      — IPC/RPC contracts, host↔renderer
      ╱    Unit       ╲     — per-module, fast, isolated
```

| 层级 | 范围 | 数量目标 | 工具 |
|---|---|---|---|
| **Unit** | 单个模块，无 IPC | 多 | Vitest / Rust #[test] |
| **Integration** | IPC 契约、host↔renderer、host↔sidecar | 中等 | Vitest + IPC mocks 或真实 Electron |
| **E2E** | 贯穿桌面应用的完整用户旅程 | 100+ 功能场景 + US-UI 视觉目录 | 现阶段为协议冒烟 + Electron 探针；之后为 Playwright |

**策略**：记录所有 E2E 场景；当变更风险使其必要时，随代码一同
添加或更新单元/集成测试；对每个携带代码的拉取请求使用
有选择的、高价值的 E2E 套件。低层测试定位正确性问题，而 E2E
验证跨进程运行时行为；低层测试通过并不豁免相应的 E2E 门禁。

---

## 4. 工具意图

| 工具 | 用途 | 状态 |
|---|---|---|
| **Vitest** | 单元 + 集成（TS 侧） | 已启用（`pnpm test`，shared 包） |
| **Rust #[test]** | host-core 单元测试 | 已启用（`cargo test -p host-core`） |
| **协议冒烟** | Host RPC + 工具 + 插件的无头验证 | 已启用（`test:e2e`，22 项检查） |
| **Electron 探针** | 启动桥接、会话列表响应性与崩溃监督 | 已启用（`test:e2e:boot`、`test:e2e:supervision`） |
| **Playwright** | 完整的 UI 驱动旅程 | 规划中（M5 之后） |

> 决策：协议冒烟与 Electron 探针是已启用的验证资产；
> 更广泛的桌面旅程仍按场景特定处理，当其所需平台
> 不可用时必须记录为受环境限制。

---

## 5. 环境要求

| 要求 | 详情 |
|---|---|
| 平台 | macOS arm64 和 Intel x64、Windows x64 和 Linux x64 发布目标（D126/D285） |
| 配置目录 | 干净的 `~/.pi-desktop` 配置目录（无先前配置） |
| Fixtures | 示例项目目录（`examples/fixtures/sample-project/`） |
| 示例插件 | 从本地路径加载的 `examples/plugins/hello` |
| Provider | 至少一个带有效密钥的 provider（测试账号） |
| 显示 | 可无头运行的 Electron 或真实显示器 |

---

## 6. 场景模板

每个场景按以下格式记录：

```markdown
### E2E-<ID>: <title>

- **Preconditions**: what must be true before steps start
- **Steps**: ordered list of user / system actions
- **Expected**: observable outcome that proves correctness
- **Specs linked**: relevant spec file(s)
- **Acceptance criterion**: which A–H letter(s) this verifies
- **Milestone**: M1–M6 target
- **Status**: Draft | Documented | Partially automated | Automated | Passed
```

---

## E2E 主集成分支验证

每个携带代码的变更，必须在承载该变更的、已集成的本地 `main` 上，
于请求分支推送并打开拉取请求之前，通过与其回归面相关的
E2E 套件。携带代码的变更包括 Renderer、Electron Main、Preload、
Agent Runtime、Rust host-core、会话、转录、计划（plans）、插件、
MCP、权限、provider/model 运行时、持久化、进程生命周期、
打包/运行时启动，以及影响应用执行的构建或 CI 行为。
仅文档的变更在不改变可执行行为时豁免。

从最新的、已集成的本地 `main` 检出与提交运行所选套件。
在请求分支上运行的 E2E 属于探索性质，不满足本门禁。

以根 `package.json` 作为可执行命令的唯一事实来源。
最低选择为：

- 跨切面运行时、host 或 IPC：`pnpm test:e2e`。
- Electron 启动、preload 或窗口生命周期：`pnpm test:e2e` 和
  `pnpm test:e2e:boot`。
- 会话列表刷新或模型能力查询：`pnpm test:e2e` 和
  `pnpm test:e2e:boot`，包括合成大列表响应性检查。
- 设置/输入框/插件搜索主题表面：`pnpm build:js` 之后运行
  `pnpm test:e2e:theme-surfaces`。
- 输入框剪贴板表示与文本插入：`pnpm test:e2e:composer-paste`。
- 输入框斜杠菜单名称/描述布局：`pnpm build:js` 之后运行
  `pnpm test:e2e:composer-autocomplete`。
- 转录渲染边界与跨部分委派显示：`pnpm test:e2e:transcript`。
- Plan host/运行时行为：`pnpm test:e2e` 和 `pnpm test:e2e:plan`。
- Plan UI 行为：`pnpm test:e2e:plan` 和 `pnpm test:e2e:plan-ui`。
- Host 监督、崩溃恢复或重启行为：`pnpm test:e2e` 和
  `pnpm test:e2e:supervision`。
- 子代理生命周期：`pnpm test:e2e` 和 `pnpm test:e2e:subagents`。
- 导入扩展的依赖安装或注册表边界变更：`pnpm test:e2e:plugin-import-deps`。
- 受信任扩展或插件扩展变更：`pnpm test:e2e:trusted-extensions`。
- 会话协作 / Session Orchestrator：`pnpm test:e2e:collaboration`。
- 完成通知静默或静默回合契约（D193 / D446）：`pnpm test:e2e:session-completion`。
- 跨越多个表面的变更使用所有适用套件的并集。

`pnpm test:e2e` 是用于 host RPC、IPC、代理执行、插件、
持久化集成与共享运行时契约的默认跨系统冒烟套件。某个必需套件
因缺少显示器、平台、凭据、硬件资源或其他环境能力而无法运行时，
必须记录为 `NOT RUN`，并附原因、替代验证方式与剩余风险。
拉取请求仍可带着该记录打开，以便变更能在具备能力的环境中
验证，但门禁并未满足，交付在该套件于承载该变更的
集成 `main` 上通过之前保持未完成。

要求的结果必须适用于门禁运行时的可执行提交，任何
改变已落地可执行内容的后续提交都要求重跑受影响的套件
（落地修复、冲突解决，或评审期间新增的提交）。否则已记录的
结果保持有效。报告每条命令、结果、被测提交以及任何相关的
环境限制；绝不要声称一个未执行的套件已通过。

## E2E 失败策略

一个失败的必需 E2E 会阻塞分支推送、拉取请求以及宣布集成
交付完成，直到该失败被归类为实现回归、测试回归、环境失败
或已知的易抖动基础设施。修复产品或测试缺陷，并针对集成的
`main` 重跑受影响的套件。不要删除场景、弱化断言，或添加
会掩盖确定性失败的重试。当某场景在所需平台上未自动化时，
保持其状态为已记录文档，并标明仍需要的平台验证。

## 7. MVP 场景目录

### 运行时资源治理

#### E2E-097: 工具突发量有界且在 host 重启后恢复

- **前置条件**：host-core 健康；一个会话拥有工作区；
  监督探针可以终止 host 进程。
- **步骤**：1) 派发一个超出 host 工具预算的突发负载，其中包含
  读取类工具和 shell 命令。2) 在突发运行期间观察 `app.health`。
  3) 在活跃调用期间终止 host-core。4) 等待一次受监督的
  重启。5) 允许持久化 outbox 冲刷。
- **预期**：活跃的 shell 进程数绝不超过配置的全局上限和
  每会话上限。超出部分的工作返回 `HOST_OVERLOADED`，或在
  有界队列中等待。只运行一个重启循环；陈旧代际（generation）的调用
  以 `HOST_UNAVAILABLE` 快速失败；不会发出反复的
  `ERR_STREAM_DESTROYED` 持久化风暴。同一突发期间临时的 OS
  线程压力不会通过其 stdio 控制路径终止 host-core；host 保持在同一
  代际，容量错误保持结构化。已完成的 assistant/tool 消息
  在恢复后只持久化一次。
- **关联规格**：`03-runtime/06-host-rpc-protocol.md`、
  `03-runtime/07-process-model.md`、`03-runtime/08-error-codes.md`、
  `03-runtime/09-logging-and-observability.md`、ADR 0051
- **验收标准**：A（运行时健康）、C（工具执行与恢复）
- **里程碑**：M5
- **状态**：已记录文档；自动化待做

### 发布与打包

#### E2E-192: Linux 发布会产出 system-Electron 的 ASAR 资产

- **前置条件**：`vX.Y.Z` 标签与 `apps/desktop/package.json` 匹配；
  Linux x64 发布 runner 可以完成 `dist:linux`，并且有可用于
  重打包验证的系统 Electron。
- **步骤**：1) 运行标签发布工作流。2) 检查已发布的 GitHub
  Release 资产。3) 确认带版本号的
  `PI-Desktop-X.Y.Z-linux-x64.asar` 资产存在。4) 将该归档放入
  目标 Electron 资源布局中（连同目标包的原生 host
  与其他资源），然后用 `electron <archive>.asar` 启动它。
- **预期**：该 ASAR 从
  `linux-unpacked/resources/app.asar` 逐字节复制而来，与 Linux
  AppImage、deb、rpm 一同上传，并且系统 Electron 无需
  捆绑的 Electron 可执行文件即可打开 PI-Desktop 应用归档。
- **关联规格**：`06-delivery/06-release-runbook.md`、`03-runtime/07-process-model.md`
- **验收标准**：质量（发布产物与打包兼容性）
- **里程碑**：M6+
- **状态**：已记录文档；产物导出已有单元覆盖，原生 system-Electron
  重打包仍需 runner 验证

#### E2E-200: Linux RPM 保留 Wayland 桌面标识

- **前置条件**：Linux x64 打包验证运行或标签发布可以
  在 Ubuntu 22.04 上完成；有一台干净的 Fedora 44 KDE/Wayland
  机器可用于安装与启动。
- **步骤**：1) 构建 Linux 目标并用 `rpm -qip` 和
  `rpm -qpl` 检查 RPM。2) 确认包内包含应用归档、
  host-core、`pi-desktop.desktop` 以及 512px 的 `pi-desktop` 图标。3) 确认
  该 RPM 没有全局的 `/usr/lib/.build-id` 链接。4) 在
  Fedora KDE/Wayland 机器上安装该 RPM 并从其桌面入口
  启动 PI-Desktop。5) 检查任务栏分组与已安装的桌面入口。
- **预期**：x64 RPM 以文档记录的名称产出，并随发布产物
  一同上传。其桌面入口包含 `Icon=pi-desktop` 和
  `StartupWMClass=pi-desktop`；运行中的 Wayland 窗口与
  PI-Desktop 启动器归为一组，并显示其图标而非通用 Electron 图标。
  该包对更新保持 notify-and-link 方式，且捆绑的 Electron
  二进制不会创建全局的 build-id 链接。
- **关联规格**：`01-product/01-product-scope.md`、
  `04-ux/09-interaction-patterns.md`、`06-delivery/06-release-runbook.md`
- **验收标准**：质量（发布打包与桌面集成）
- **里程碑**：M6+
- **状态**：单元/源码契约已覆盖（`auto-update.test.mjs`、
  `development-branding.test.mjs`、`ci-workflow.test.mjs`）；Fedora KDE/Wayland
  安装仍需 runner 验证

#### E2E-196a: 未签名的 macOS 调试通道

- **前置条件**：Release 工作流被手动派发且参数为
  `sign_macos: false`；Windows 与 Linux 发布凭据不受影响。
  此路径绝不能用于发布 GitHub Release 标签。
- **步骤**：1) 以 `sign_macos: false` 派发 Release 工作流。2)
  确认两种 macOS 架构都在没有证书 secrets 的情况下完成普通的
  DMG/ZIP 打包。3) 检查产物与工作流步骤。
- **预期**：macOS DMG/ZIP 产物在没有
  Developer ID 签名或公证的情况下产出并上传，并使用显式的
  `-arm64` 和 `-x64` 文件名标记来标识其原生架构；macOS staple 与
  Gatekeeper 检查被显式跳过。Windows/Linux 产物以及合并后的
  updater feed 仍正常发布。此例外不满足 E2E-196c。
- **关联规格**：`06-delivery/06-release-runbook.md`
- **验收标准**：质量（调试打包）
- **里程碑**：M6+
- **状态**：可选开启的调试通道；标签发布必须满足 E2E-196c。

#### E2E-196b: 未签名的 macOS 包提供首次启动指引

- **前置条件**：一次默认的未签名 macOS 发布已为至少一种
  原生架构产出 DMG 和 ZIP 产物；一个测试 macOS 账号可以
  把应用复制到 `/Applications` 或 `~/Applications`。
- **步骤**：1) 打开 DMG 并检查其根目录与布局。2) 确认
  应用与 Applications 链接构成主行，且 `If app won't open, read this.txt` 是
  唯一的次要项目。3) 确认 DMG 中没有命令辅助工具。4) 在不
  解包应用内容的情况下检查 ZIP 根目录，确认其中同时有
  `PI-Desktop-macOS-opening-help.txt` 和可执行的
  `PI-Desktop-macOS-open.command`。5) 阅读该说明，把应用移到
  `/Applications`，然后双击 ZIP 辅助工具。
- **预期**：DMG 包含品牌化的 720×500 背景、应用、
  Applications 链接，以及显示为
  `If app won't open, read this.txt` 的纯文本打开说明；它不包含也不暴露命令辅助工具。
  ZIP 在其根目录包含该辅助工具和同一份说明。说明中包含
  `xattr -r -d com.apple.quarantine /Applications/PI-Desktop.app`，解释
  该兜底方式仅用于受信任的未签名产物、当 macOS 报告
  应用已损坏或无法打开时使用，并说明已签名/公证的构建
  不需要它。ZIP 辅助工具只搜索 `/Applications/PI-Desktop.app` 和
  `~/Applications/PI-Desktop.app`，仅在存在时移除 `com.apple.quarantine`，
  并在没有 `sudo` 或任意路径参数的情况下打开应用。它
  在修改属性前验证 `CFBundleIdentifier=net.aiuo.pi-desktop`。
  该指引不会声称未签名产物已通过 Gatekeeper
  资格认定。
- **关联规格**：`06-delivery/06-release-runbook.md`、
  `05-security/01-security.md`
- **验收标准**：质量、安全
- **里程碑**：M6+
- **状态**：由 `packaging-footprint.test.mjs` 自动化；原生归档
  检查仍需发布 runner 验证

#### E2E-196c: macOS 标签产物无需绕过隔离即可通过 Gatekeeper

- **前置条件**：推送了与 `apps/desktop/package.json` 匹配的
  `vX.Y.Z` 标签，或以 `sign_macos: true`
  （默认）派发 Release 工作流；GitHub Actions 配置了 `CSC_LINK`、
  `CSC_KEY_PASSWORD`、`APPLE_ID`、
  `APPLE_APP_SPECIFIC_PASSWORD` 和 `APPLE_TEAM_ID` secrets；
  两种原生 macOS runner 都可用。
- **步骤**：1) 运行标签工作流。2) 对每种 macOS 架构，用
  `codesign -dv --verbose=4` 检查解包后的应用，并确认签名机构为
  `Developer ID Application: XingYu Liu (DUV63RKYTW)`。3) 对应用（包括
  `Contents/Resources/bin/pi-desktop-host-core`）运行
  `codesign --verify --deep --strict --verbose=2`、
  `spctl --assess --type execute --verbose=4` 和 `xcrun stapler validate`。
  4) 确认工作流的 DMG 步骤报告的 Apple 公证状态为
  `Accepted`，然后对相应的 DMG 运行 `xcrun stapler validate`。
  5) 在干净的 macOS 配置环境下载该 DMG，把应用移到
  `/Applications`，并在不清除 `com.apple.quarantine` 的情况下打开它。
- **预期**：每个 macOS 应用都通过签名完整性检查，Gatekeeper 报告
  `source=Notarized Developer ID`，且应用与 DMG 都包含有效的已 stapled
  票据。DMG 有自己独立的提交：从未提交过的 DMG
  没有票据，会在 `stapler staple` 时以错误 65 失败，因此标签构建绝不能
  进入该状态。应用正常打开；不需要任何 `xattr` 移除隔离
  命令或“安全性与隐私”的覆盖操作。缺失的 secrets、
  被拒绝的提交，或耗尽的 staple 重试都会使任务失败。
- **关联规格**：`06-delivery/06-release-runbook.md`、
  `05-security/01-security.md`、ADR 0289
- **验收标准**：质量、安全
- **里程碑**：M6+
- **状态**：工作流脚本/单元已覆盖；每次发布都需要干净机器旅程
  （仅在此表面变更时、于具备能力的环境中运行）

#### E2E-212: GitHub Release 启动 CNB 镜像流水线

- **前置条件**：仓库 secret `CNB_MIRROR_TOKEN` 已在
  `vastsa/PI-Desktop` 上配置；位于 `aixk/Pi-Desktop` 的 CNB 流水线
  监听 `api_trigger_mirror`；存在一个带已上传产物的
  GitHub Release 标签，例如 `vX.Y.Z`。
- **步骤**：1) 发布或编辑该 GitHub Release，或以同一标签
  派发 `mirror-to-cnb.yml`。2) 检查 Actions 日志中解析出的标签
  以及发往 `api.cnb.cool` 的 POST。3) 确认 CNB 流水线
  以 `MIRROR_TAGS` 等于该标签启动。
- **预期**：该任务只在 `vastsa/PI-Desktop` 上运行。手动派发
  若没有 `vX.Y.Z` 标签，会在调用 CNB 之前失败。缺失
  `CNB_MIRROR_TOKEN` 时以失败关闭（fail closed）。JSON 请求体
  用 `jq` 构建（而不是 YAML 字符串插值）。GitHub Release 产物
  与 updater feeds 保持不变；CNB 只是同一标签的镜像。
- **关联规格**：`06-delivery/06-release-runbook.md`
- **验收标准**：质量（发布镜像）
- **里程碑**：M6+
- **状态**：源码契约已覆盖（`ci-workflow.test.mjs`）；真实的 CNB
  启动仍需运维验证（仅在此表面变更时、于具备能力的环境中运行）

### 启动与健康检查

#### E2E-001: 应用启动并显示主窗口

- **前置条件**：macOS arm64 或 Intel x64；无先前的 `~/.pi-desktop` 配置。对于
  开发通道，工作区包的构建产物缺失或比
  其 TypeScript 源码更旧。
- **步骤**：1) 启动 PI-Desktop。开发通道中使用 `pnpm dev`。
  2) 观察主窗口出现。
- **预期**：开发模式启动会在 host-core 与 Electron 启动之前
  重建所有工作区依赖。窗口先显示品牌化的启动画面
  （bootstrap 运行期间），然后以当前语言目录用英文
  呈现主外壳；无编译错误、无菜单缺失的运行时错误、无崩溃；
  版本信息可见。关键生命周期与错误记录被写入
  分类日志。GitHub 自动更新在 `ensureWindow` 之后才会启动，
  且挂起的 feed 不会让 updater 状态在 Chromium 约 60 秒超时内
  一直停留在 `checking`。
- **关联规格**：`03-runtime/07-process-model.md`、`04-ux/01-ui-ia.md`、
  `03-runtime/09-logging-and-observability.md`
- **验收标准**：A（应用启动）
- **里程碑**：M1
- **状态**：部分自动化（`runtime-build-contract.test.mjs` 覆盖
  依赖构建契约；`update-timeout.test.mjs` 和
  `auto-update.test.mjs` 覆盖有界自动检查契约；Electron 窗口
  启动仍为 Draft）

#### E2E-002: IPC 桥接可用

- **前置条件**：应用正在运行。
- **步骤**：1) 触发一个调用 preload IPC 的动作（例如版本查询）。2) 在渲染进程中观察结果。
- **预期**：Main↔renderer IPC 返回预期数据；无错误。打包后的
  main 与 plugin-panel 沙箱 preload 都是自包含的，不需要
  额外的本地 runtime chunk。
- **关联规格**：`03-runtime/01-ipc-protocol.md`
- **验收标准**：A（桥接正常）
- **里程碑**：M1
- **状态**：已自动化（`scripts/e2e-electron-boot.mjs` —— 沙箱 preload 桥接 + IPC 往返）

#### E2E-003: Rust host 健康检查响应

- **前置条件**：应用正在运行；Rust host-core sidecar 已启动。
- **步骤**：1) Electron 以协议版本 11 握手。2) 调用 host
  健康检查 RPC。3) 用不匹配的更旧与更新协议 fixture
  重复启动。
- **预期**：协议 v11 的 host 返回 `ok` 且握手被记录。
  除 v11 之外的任何版本，无论更旧还是更新，都会在
  对话表面变为可交互之前被拒绝，因此 Plan 审批/状态事件与
  上下文检查点不会被静默丢失。
- **关联规格**：`03-runtime/05-host-core-rust.md`、`03-runtime/06-host-rpc-protocol.md`
- **验收标准**：A（桥接正常）
- **里程碑**：M1
- **状态**：已自动化（协议冒烟）

#### E2E-004: 首次运行的内联检查清单出现

- **前置条件**：全新配置目录（无 `~/.pi-desktop`）。
- **步骤**：1) 在全新配置环境启动应用。2) 观察引导检查清单。
- **预期**：显示内联检查清单；provider/密钥条目打开设置
  → Agent，可选的插件条目打开应用外壳的 Plugins
  目的地。
- **关联规格**：`04-ux/05-onboarding.md`
- **验收标准**：A（首次运行检查清单）
- **里程碑**：M2
- **状态**：已自动化（协议冒烟：host 引导状态；UI 检查清单为手动）

### Provider 与密钥

#### E2E-169: 默认模型选择器选择一个已配置的模型

- **前置条件**：存在两个可运行的 provider；其中一个 provider 至少有两个已配置的模型绑定。
- **步骤**：打开设置 → Model configuration → Change default model，然后在该 provider 下选择第二个模型。
- **预期**：Defaults 卡片以紧凑的设置行呈现，在 Default model 标签下方
  显示 provider 名称和精确的模型 ID；其低调的
  Change 操作不会重复当前值。选择器按 provider 对
  模型级条目分组，标记精确的当前模型，且新建的
  会话继承该精确模型及其所属 provider。
  按 provider 或模型搜索在本地过滤，结果列表滚动时不会移动设置卡片，无匹配的查询显示空状态。
- **关联规格**：`03-runtime/13-model-catalog-and-selection.md`
- **验收标准**：B（模型选择）
- **里程碑**：M6
- **状态**：已记录文档；自动化待做


#### E2E-005: 添加 provider 并保存 API 密钥

- **前置条件**：应用运行中；未配置任何 provider；models.dev 快照随构建一同发布。
- **步骤**：1) 打开设置 → Model configuration 并选择 Add provider。2) 确认该对话框是一个单一表单，没有步骤条或 Next/Back 按钮。第一个控件是 Service——一个可搜索菜单（Choose a service、Custom endpoint，然后是来自 models.dev 的扁平厂商列表，包括 Xiaomi），而不是原生下拉框、按地区分组或厂商卡片网格。打开它，输入以在客户端过滤，然后选择 **Custom endpoint**。确认 Name 和 Base URL 出现在同一行，URL 下方没有辅助说明段落（只有占位符），API Key 和 API format 在下一行并排出现（而不是藏在 Advanced 后面），并且聚焦的字段连同其 2px 强调色描边完全保持在对话框内，包括在窄于 1040px 的窗口中。3) 为一个发布 `/models` 路由的服务输入名称和 base URL，然后粘贴 API 密钥。4) 确认模型区填充的是该服务返回的模型，而不是其厂商发布的全部模型；确认该部署未托管的模型不会出现。5) 在过滤框中输入，确认列表在客户端收窄且每次按键都不发网络请求。6) 确认每一行对目录已知的模型显示来自 models.dev 的上下文/输出信息，其紧凑文本跟踪发布值而不是更粗糙的四舍五入值（1,050,000 的窗口显示为 `1.05M`，绝不显示 `1.1M`），且目录中无匹配的模型仍以通用默认值列出。7) 用复选框选择两个模型。8) 在某个已选行上展开 Advanced，覆盖其限制并切换 thinking chips；确认每个数值字段都有一组五个常用值的预设阶梯 chip，点击 chip 写入该值，仍可手动编辑，非预设值时阶梯保持未选中。确认标签和可选提示位于一个紧凑的分组控件上方，且在正常对话框宽度下不会把选项挤到第二行；确认七个规范级别全部可用，已知推理模型的已发布级别初始为选中，非推理或未知行显示同样的 chips 但未选中并带手动覆盖提示；在该行启用一个级别并确认另一行不受影响。9) 打开表单级 Advanced，确认 API format 存在但已预先推导。10) 添加一个该服务未返回的自由形式模型 ID；确认它以 128,000 / 8,192 / 无 thinking 的默认值被添加，然后在端点支持时启用一个 thinking 级别；确认以不同大小写重复添加同一 ID 会被拒绝为已添加。11) 保存。
- **预期**：先询问服务本身，models.dev 只用于丰富答案并为已知模型填充默认值。设置选择器始终提供七个规范 thinking 级别，而 Composer 之后渲染同一模型绑定中保存的显式级别；为空或仅 `off` 的绑定解析为 `off`。模型发现有约 600 ms 的去抖，在该窗口结束前不会标记加载中，且来自较早按键的慢响应绝不会替换更新的列表；命名添加路径的发现会等待 API 密钥，而未保存的自定义 provider 在保存前就用已输入的 base URL（以及密钥，如有）进行探测。预设阶梯覆盖常见的上下文/输出限制，同时保留手动编辑的值。限制文本通过一个共享的紧凑格式化器渲染，因此相邻的发布窗口仍可区分（`1M` / `1.05M` / `1.1M`），且紧凑限制值绝不高于其发布值。Custom endpoint 把 API format 放在密钥旁边，并省略 Base URL 的辅助文案；命名端点不显示 format。把同一个自定义表单指向不可达或未授权的 URL，确认左侧面板显示分类后的错误（而不是原始 JSON/HTML 转储，也不是第二个“没有模型”的空状态）；带有来自稍后编辑的缓存行时，同样的错误以列表上方的一行横幅显示。把第二个 provider 指向没有 `/models` 路由的 base URL，确认列表回退到目录、被标注为来自 models.dev 而非该服务，并且仍可保存。provider 以一行显示其主机、模型数量和密钥徽标；密钥被安全存储（不在明文配置中）；`models` 包含两个绑定，且 `models[0]` 保持为该 provider 的默认模型。
- **关联规格**：`03-runtime/11-provider-model-system.md`、`03-runtime/12-provider-config-schema.md`、`03-runtime/13-model-catalog-and-selection.md`、`03-runtime/14-secrets-storage.md`、`04-ux/06-settings-ia.md`
- **验收标准**：B（多模型 provider 配置、保存密钥）
- **里程碑**：M2
- **状态**：手动 UI + 自动化协议冒烟（provider 创建 + 密钥，无明文回显）

#### E2E-PROVIDER-configured-models-search: 已选面板的搜索收窄已配置列表

- **前置条件**：应用运行中；已保存一个带至少三个模型绑定的 provider，其中一个绑定带别名，另一个的目录显示名与其 id 不同。
- **步骤**：1) 打开设置 → Model configuration 并编辑该 provider。2) 在右侧面板标题旁的搜索框中输入某个模型 id 的一部分，确认已配置列表随输入收窄，而标题旁的计数仍报告每一个已配置模型。3) 用别名搜索另一行，再用其目录显示名搜索，确认两者都能找到它们所代表的绑定。4) 输入一个无匹配的查询，确认右侧面板显示其自己的空状态，而不是“尚未选择任何模型”的那个。5) 在该查询仍在输入框中时，在左侧已发现列表中勾选一个模型，确认它在视野内被添加——只有当过滤器会把它隐藏时输入框才会被清空——然后勾选一个 id 与该查询匹配的模型，确认过滤器保留。6) 清除过滤器，移除所有已配置模型，确认输入框最终为空，而不是在一个现已禁用的框里残留查询。7) 保存。
- **预期**：右侧面板的搜索在客户端过滤已配置列表，无 host 往返，按模型 id、其别名和目录显示名进行大小写不敏感匹配。计数徽标始终报告每一个已配置模型，因此过滤后的视图绝不会被误认为是一个提供更少模型的 provider。在过滤器激活时添加的模型绝不会添加到视野之外：当新行会被隐藏时输入框被清空，当仍能显示所添加内容时保留；被清空的列表会丢弃查询，因此没有过滤器会残留在禁用的输入框中。
- **关联规格**：`04-ux/08-component-spec.md`、`03-runtime/13-model-catalog-and-selection.md`
- **验收标准**：B（多模型 provider 配置）
- **里程碑**：M2
- **状态**：已记录文档；UI 自动化待做

#### E2E-005A: 编辑 provider 模型绑定并迁移遗留模型

- **前置条件**：已保存一个带两个模型绑定的 provider；存在一个只有遗留 `default_model_id` 而没有 `config_json.models` 的 fixture provider 行；另有一个 fixture 行携带未知或遗留的 `apiStyle` 字符串。
- **步骤**：1) 重新打开已保存的 provider；确认单一表单打开时立即绘制其缓存的模型列表，且 API 密钥字段说明未更改的密钥会被保留。2) 确认实时探测随后无需重新输入密钥即刷新该列表，因为会复用已存储的密钥。3) 确认两个既有绑定仍被选中并带勾选标记，其限制、thinking chips 和默认值完好。4) 启用一个 fixture 目录未发布的级别，编辑某一行的限制并保存。5) 重新打开 fixture provider，确认其遗留模型以一个已选行出现，具有 128,000 上下文、8,192 最大输出，且七个 thinking 选项全部可用但未选中。6) 重新打开未知样式的 fixture，确认编辑器以选中 Chat Completions 的方式渲染，而不是错误边界；保存它并确认修复后的样式被持久化。7) 在不更改模型的情况下保存 fixture provider。8) 把编辑过的 provider 设为全局默认，重新打开它，移除其第一个模型使另一个绑定成为首位，然后保存。9) 让服务下线或吊销密钥，重新打开该 provider，确认缓存行保持可见，并显示紧凑的分类发现错误，而不是空列表或原始 host 转储。
- **预期**：编辑绝不丢弃未修改的绑定。显式启用的级别即使目录未发布也保持已保存，因此 Composer 读取同一绑定而不是静默收窄它；模型发现不可用的绑定保持其已存储级别不被触碰。遗留读取物化出一个绑定而不丢失旧的模型 ID；随后的写入存储 `config_json.models`，并为旧读取方保持 `defaultModelId` 等于第一个绑定。未知或遗留的 `apiStyle` 被视为兼容性输入：编辑器回退到 Chat Completions、保持可用，并在保存时修复已存储的值。当被编辑的 provider 是全局默认且其第一个模型发生变化时，`settings.defaultModelId` 会重新同步到新的首位绑定。失败的实时探测降级为缓存列表加紧凑的分类错误，绝不变成空白选择器或原始 HTTP/JSON 转储，且目录回退绝不会写入模型缓存。
- **关联规格**：`03-runtime/11-provider-model-system.md`、`03-runtime/12-provider-config-schema.md`、`03-runtime/13-model-catalog-and-selection.md`、ADR 0114
- **验收标准**：F（provider 持久化与迁移）
- **里程碑**：M2
- **状态**：host 迁移已有单元覆盖；UI 旅程为手动

#### E2E-005K: 在线路上保留显式的扩展 thinking 级别

- **前置条件**：某 provider 有一个已选模型绑定，启用了推理
  并显式选择了 `xhigh`/`max`；目录省略了这些适配器映射
  或将其标记为不支持；一个确定性的 OpenAI 兼容
  捕获 fixture 记录请求 JSON。
- **步骤**：1) 在分开的回合中分别选择 `high`、`xhigh` 和 `max`。2) 在
  fixture 边界捕获每个请求体。
- **预期**：三个请求分别包含 `reasoning_effort: "high"`、
  `reasoning_effort: "xhigh"` 和 `reasoning_effort: "max"`。
  当目录发布了非 null 的线路映射时，该映射保持生效；
  对一个显式启用的扩展级别而言，缺失或为 null 的映射
  不会把它静默降级为 `high`。
- **关联规格**：`03-runtime/11-provider-model-system.md`、
  `03-runtime/12-provider-config-schema.md`、
  `03-runtime/13-model-catalog-and-selection.md`
- **验收标准**：B（模型配置）、F（运行时 provider 请求）
- **里程碑**：M2
- **状态**：已有单元覆盖；确定性 provider fixture 待做

#### E2E-005B: 配置固定的 OpenCode Go API 风格预设

- **前置条件**：应用运行中；未配置 OpenCode Go provider；
  OpenCode Go 端点可用，并有测试 API 密钥。
- **步骤**：1) 打开设置 → Model configuration 并打开添加 provider
  对话框。2) 在 Service 中选择 **OpenCode Go**。3) 确认 Name 和 Base URL
  不在通用路径上，输入 API 密钥，等待模型发现。
  4) 选择一个已发现的模型并保存该 provider。5) 重新打开该 provider
  并把 Service 切换为 Custom endpoint。
- **预期**：选择该预设后显示 Service + API 密钥、
  `opencode.ai/zen/go/v1` 的主机摘要，并聚焦 API 密钥字段。发现
  请求 `https://opencode.ai/zen/go/v1/models`，携带
  `Authorization: Bearer <key>`；保存的行持久化
  `apiStyle: "opencode_go"`，密钥通过 secret store 存储。
  重新打开时保留固定标识。切换到 Custom endpoint 会显示
  可编辑的 Name 和 Base URL。
- **关联规格**：`03-runtime/11-provider-model-system.md`、
  `03-runtime/12-provider-config-schema.md`、`04-ux/06-settings-ia.md`、
  ADR 0116
- **验收标准**：B（模型配置与密钥存储）、安全
- **里程碑**：M2
- **状态**：已有单元覆盖（表单与发现契约）；渲染 UI 场景为 Draft

#### E2E-205: OpenCode Go 请求携带稳定的会话头

- **前置条件**：已配置一个 OpenCode Go provider；一个确定性
  fixture 或捕获代理记录出站 HTTP 头。另配置了一个通用的
  OpenAI 兼容 provider。
- **步骤**：1) 在一个会话中对 OpenCode Go 启动一个 Agent 回合。2)
  捕获该 provider 请求头。3) 在同一
  会话中发送后续消息。4) 对同一 provider 运行提示词增强和一次插件
  `agent.complete` 单发调用。5) 在同一会话中运行 `/compact` 并捕获
  摘要请求。6) 对通用的
  OpenAI 兼容 provider 重复一个回合。
- **预期**：每个 OpenCode Go LLM 请求都包含
  `x-opencode-session`，其值等于会话 id（无会话时为一个稳定的
  每次调用 id），还包含 `x-opencode-client: pi-desktop`，以及标识
  PI-Desktop 的 `User-Agent`。后续回合复用相同的会话头，
  压缩摘要请求也是如此——否则 harness 会在完全没有
  头的情况下发送它。通用的 OpenAI 兼容 provider 不会收到
  这些头。网关不会
  返回 `MissingSessionID`，且 `/compact` 不会以 400 失败。
- **关联规格**：`03-runtime/02-agent-runtime.md`、
  `03-runtime/11-provider-model-system.md`、
  `03-runtime/12-provider-config-schema.md`、ADR 0116
- **验收标准**：B（模型配置）、F（运行时 provider 请求）
- **里程碑**：M2
- **状态**：已有单元覆盖（头合并、单发流选项，以及
  压缩摘要请求）

#### E2E-005E: 模型级线路 API 优先于 provider 风格

- **前置条件**：已配置一个 OpenCode Go provider；一个确定性
  fixture 在 `/responses` 上提供 `muse-spark-1.3-contributor`，并在
  `/chat/completions` 上对其返回 500。另一个通用 provider 在
  `/chat/completions` 上提供相同的模型 id。
- **步骤**：1) 在 OpenCode Go provider 上选择该 muse 模型并发送
  一个回合。2) 捕获出站请求路径。3) 用相同模型 id
  对通用 provider 重复。
- **预期**：OpenCode Go 回合发往 `/responses`（模型级的
  `api: "openai-responses"` 固定胜出）；通用回合仍发往
  `/chat/completions`。重放的历史携带已解析的 API。
- **关联规格**：`03-runtime/11-provider-model-system.md`、
  `03-runtime/12-provider-config-schema.md`、ADR 0116
- **验收标准**：F（运行时 provider 请求）
- **里程碑**：M2
- **状态**：已有单元覆盖（绑定解析与端点断言）

#### E2E-005C: OpenAI 兼容的 system 角色回退

- **前置条件**：一个确定性的 OpenAI 兼容 Chat Completions
  fixture 暴露一个支持推理的模型，并拒绝 `role: "developer"`，
  而要求 `role: "system"`。
- **步骤**：1) 配置该 fixture provider 并选择其推理模型。
  2) 用非空系统提示启动一个 Agent 回合。3) 在 fixture 边界捕获 JSON
  请求体。4) 用一个显式设置 `compat.supportsDeveloperRole: true`
  的模型记录重复。
- **预期**：第一个请求包含以
  `role: "system"` 发送的系统提示，且回合成功。显式的模型覆盖
  只把第二个请求改为 `role: "developer"`；默认值保持
  模型作用域，不影响其他 provider 适配器。
- **关联规格**：`03-runtime/11-provider-model-system.md`、
  `03-runtime/12-provider-config-schema.md`
- **验收标准**：B（OpenAI 兼容 provider 互操作性）
- **里程碑**：M2
- **状态**：已有单元覆盖（包括 #30 GLM 网关回归）；确定性 provider fixture 待做

#### E2E-206: 带 `/v1` base URL 的 Anthropic Messages 端点

- **前置条件**：一个确定性的 Anthropic Messages fixture 暴露
  `GET /v1/models` 和 `POST /v1/messages`；已配置的自定义端点以
  `/v1` 结尾并返回一个模型，例如 `glm-5.3`。
- **步骤**：1) 打开设置 → Model configuration 并添加一个 Custom endpoint。
  2) 输入以 `/v1` 结尾的 fixture URL，选择 Anthropic Messages，
  等待模型发现。3) 选择已发现的模型并保存。4) 启动
  一个 Agent 回合并捕获 fixture 请求路径。
- **预期**：发现对 `/v1/models` 成功，Agent 回合
  对 `/v1/messages` 成功。运行时不会把请求发送到
  重复的 `/v1/v1/messages` 路径；不带 `/v1` 的已配置
  Anthropic 根路径保持等价。
- **关联规格**：`03-runtime/11-provider-model-system.md`、
  `03-runtime/12-provider-config-schema.md`
- **验收标准**：B（自定义 provider 互操作性）、C（聊天与流）
- **里程碑**：M2
- **状态**：已有单元覆盖；确定性 provider fixture 待做

#### E2E-005F: 自定义端点输入护栏

- **前置条件**：应用运行中；添加 provider 对话框已打开且
  选择了 Custom endpoint。
- **步骤**：1) 输入一个以 `/v1/messages` 结尾的有效网关 URL，然后离开
  Base URL 字段。2) 确认该字段保留以
  `/v1` 结尾的服务 base URL，且其辅助说明标识将被作为目标的
  API 路径。3) 把该值替换为 `ftp://gateway.example.com`，然后离开字段。
  4) 再次输入有效 URL 并确认模型发现可以运行；粘贴一个完整的
  `/models` 路径并离开字段。
- **预期**：完整的操作路径在失焦时被归一化为服务根路径，
  且不改变已选的 API 风格。非 http(s) 的 URL 显示
  内联、可访问的错误，不启动发现，并保持 Save 禁用。
  有效 URL 恢复发现；`/models` 后缀也会在
  请求发出前被移除。长 URL 字段在宽对话框中占整行，并在
  响应式断点处与其他凭据整齐堆叠。
- **关联规格**：`04-ux/06-settings-ia.md`、
  `03-runtime/12-provider-config-schema.md`
- **验收标准**：B（自定义 provider 配置）
- **里程碑**：M2
- **状态**：已有单元覆盖；渲染 UI 场景待做

#### E2E-005G: 每 provider 自定义 HTTP 头

- **前置条件**：一个 API 密钥型 AI 服务（包括一个 OpenCode Go 行）和
  一个已登录的厂商（OAuth）账号；一个捕获代理记录出站 HTTP
  头，包括 Codex 和 Anthropic 适配器。
- **步骤**：1) 打开该 AI 服务并点击右上角的 Advanced settings
  操作。确认打开一个独立的模态框且不改变主表单布局，
  且其头部关闭操作是唯一的关闭控件（无底部操作
  行）。用 common-header 预设添加 User-Agent，然后导入一个
  包含 `X-Gateway: alpha` 且头数量足以超过五个可见行的 JSON 对象。
  以 JSON 复制这些头，确认剪贴板是美化打印的持久化
  记录（空名称被省略，后写胜出）并带本地化成功反馈。
  确认头列表在模态框内滚动，而下方的模型
  面板保持其工作区，关闭模态框，然后保存。2) 启动一个 Agent
  回合、一次后续消息、提示词增强和一次插件单发调用。3) 在保存
  第二次更改前从表单刷新 `/models`，确认未保存的头被发送。4) 清空各行并保存；确认适配器
  默认值恢复。5) 编辑 OAuth 账号的 Advanced 头，保存，然后
  运行一个会刷新访问令牌的回合。6) 对 OpenCode Go
  重复并确认 `x-opencode-session` 仍然存在。7) 对
  Codex/Anthropic OAuth 推理重复。8) 尝试 `Authorization` 和 CR/LF
  值；保存被拒绝。
- **预期**：非空自定义头是该行出站 HTTP（回合、子代理、单发、发现、连接测试、
  OAuth 刷新）的最后写入者。清空则恢复 pi-ai / `claude-cli` / OpenCode 默认值。
  Advanced 最多保持五个头行可见，额外的行在其
  自有有界区域内滚动，因此不会压缩或隐藏模型面板。Escape 和外部点击
  在 Advanced 模态框打开时只关闭它。预设添加预期的
  User-Agent 值，Copy JSON 序列化与该行保存时相同的 `pairsToRecord` 映射，
  JSON 导入接受两种受支持的对象形态，且
  大小写不敏感的重复键被合并而不是重复。
  工具栏操作在窄对话框断点处换行而不是溢出。
  OpenCode 仍发送
  `x-opencode-session` 和 `x-opencode-client`。Codex
  和 Anthropic 尽管有适配器的最后写入，仍发送自定义 User-Agent。
  首次 OAuth 登录不收集头。保留键和 CR/LF 被
  拒绝。Advanced 是一个紧凑的键/值编辑器，而不是孤零零的 User-Agent
  字段。
- **关联规格**：`03-runtime/12-provider-config-schema.md`、
  `03-runtime/11-provider-model-system.md`、`03-runtime/02-agent-runtime.md`、
  `04-ux/06-settings-ia.md`、ADR 0178
- **验收标准**：B（模型配置）、F（运行时 provider 请求）
- **里程碑**：M2
- **状态**：已有单元覆盖（host 持久化、fetch 包装器、发现、
  表单 Advanced）；渲染 UI 场景待做

#### E2E-005J: GitHub Copilot OAuth 请求携带原生 IDE 头

- **前置条件**：一个已登录的 GitHub Copilot OAuth 账号，带一个已选
  模型；一个确定性捕获代理记录模型请求头。
- **步骤**：1) 对该账号启动一个 Agent 回合并捕获请求
  头。2) 在 assistant 响应后发送后续消息并捕获
  下一个请求。3) 当所选模型支持视觉时，带图片附件
  重复。4) 设置一个与某个
  Copilot 默认头同名的已保存自定义头，再发送一个回合。
- **预期**：每个 Copilot 模型请求都包含固定的 pi-ai
  传输标识头 `Editor-Version`、`Editor-Plugin-Version` 和
  `Copilot-Integration-Id`。用户主导的请求 `X-Initiator` 为 `user`，
  续接请求为 `agent`；`Openai-Intent` 为 `conversation-edits`，且
  图片请求包含 `Copilot-Vision-Request: true`。该 OAuth 行
  为账号绑定保留其本地 provider id，且已保存的自定义头仍是
  最终覆盖。
- **关联规格**：`03-runtime/11-provider-model-system.md`、
  `03-runtime/12-provider-config-schema.md`、ADR 0095
- **验收标准**：B（模型配置）、F（运行时 provider 请求）
- **里程碑**：M2
- **状态**：已有单元覆盖（行作用域模型头与请求上下文
  头）；真实 Copilot 账号旅程待做

#### E2E-005H: 从长服务列表中选择每一个可见模型

- **前置条件**：应用运行中；添加 provider 或编辑 provider 对话框已
  打开，所对的服务（或厂商账号）返回一个长模型列表，
  其中至少包括一个 id 不匹配后续搜索的模型。
- **步骤**：1) 等待左侧面板列出该服务的模型。确认
  列表头部在面板标题旁显示一个复选框，未选择任何
  行时为未选中。2) 勾选该头部复选框。确认每个列出的行都被
  勾选，且右侧面板为每行列出一个已选绑定，并保留任何
  已配置的高级覆盖。3) 取消勾选一行，然后确认
  头部复选框变为半选状态。再次勾选并确认其余
  可见行被选中且不重复已选行。4) 输入一个
  匹配子集的过滤器。取消勾选头部复选框并确认只有
  匹配的已选行消失；被过滤器隐藏的模型留在
  右侧。5) 再次勾选头部复选框并确认只有匹配的
  行被加回。清除过滤器并确认先前隐藏的
  已选模型仍然存在。6) 保存。
- **预期**：一个头部复选框选择或清除当前可见
  列表。搜索过滤器收窄“全部”所指的行。在过滤器之外
  已选择的模型保持选中。新添加的行采用已发布的限制和
  thinking 级别；既有绑定不被重建。厂商账号编辑器中
  存在同一控件，因为两个对话框渲染的是共享选择器。
- **关联规格**：`03-runtime/13-model-catalog-and-selection.md`、
  `04-ux/06-settings-ia.md`、`04-ux/08-component-spec.md`
- **验收标准**：B（多模型 provider 配置）
- **里程碑**：M2
- **状态**：已有单元覆盖（共享选择器源码契约）；渲染 UI
  场景待做

#### E2E-005I: 从选择器头部获取服务模型列表

- **前置条件**：添加 provider 或编辑 provider 对话框已打开，
  所对的服务（或厂商账号）可达且发布 `/models` 列表。
- **步骤**：1) 确认左侧面板头部在标题旁显示 Fetch list 操作，
  在有效端点就绪前为禁用。2) 输入一个有效
  端点。确认 Fetch list 在 600 ms 去抖等待期间即变为可用。
  立即点击它；确认它不等待该窗口，在探测进行中显示
  加载标签，然后显示行。3) 再次点击 Fetch list。
  确认它保持当前行在屏幕上，并用
  实时结果替换它们。4) 让服务下线并点击 Fetch list；确认
  分类错误出现且先前的行保留。5) 恢复
  服务，点击 Fetch list，确认实时列表返回。6) 在
  厂商账号编辑器中重复。
- **预期**：该头部操作立即探测服务，包括
  在 URL 变为有效后的编辑去抖期间。凭据编辑时的自动发现
  不变。两种凭据类型都有同一控件，因为两个对话框
  渲染的是共享选择器。
- **关联规格**：`03-runtime/13-model-catalog-and-selection.md`、
  `04-ux/06-settings-ia.md`、`04-ux/08-component-spec.md`
- **验收标准**：B（多模型 provider 配置）
- **里程碑**：M2
- **状态**：已有单元覆盖（发现 hook + 选择器源码契约）；渲染
  UI 场景待做

#### E2E-005D: 配置智谱 / Z.AI 命名端点预设

- **前置条件**：应用运行中；未配置智谱 provider；models.dev
  快照随构建发布，包含 `zhipuai`、`zhipuai-coding-plan`、`zai` 和
  `zai-coding-plan`。
- **步骤**：1) 打开设置 → Model configuration 并打开添加 provider
  对话框。2) 打开 Service，输入以过滤，选择 **Zhipu AI Coding Plan**。
  确认在输入 API 密钥之前模型发现不会启动。3) 确认
  通用路径是 Service + API 密钥加主机摘要，输入 API 密钥，
  等待模型发现。4) 选择一个已发现的模型并保存。5) 重新打开
  该 provider，把 Service 切换为 **Z.AI**，再切换为 **Custom endpoint**。
- **预期**：Coding Plan 显示 Service + API 密钥、
  `open.bigmodel.cn/api/coding/paas/v4` 的主机摘要，并聚焦 API 密钥字段。Name
  和 API format 不在通用路径上。保存的行持久化
  `vendorKey: "zhipuai-coding-plan"`、`apiStyle: "chat_completions"` 和
  精确的 Coding Plan URL。切换到 Z.AI 会把主机摘要替换为
  `api.z.ai/api/paas/v4` 和 `vendorKey: "zai"`。切换到 Custom endpoint
  会显示可编辑的 Name 和 Base URL，没有步骤条或厂商卡片网格。
  之后对智谱 URL 的 Agent 回合发送的是带智谱 thinking
  （`thinkingFormat: "zai"`）的 Completions，而不是 OpenAI 的 `developer` 角色。
- **关联规格**：`03-runtime/11-provider-model-system.md`、
  `03-runtime/12-provider-config-schema.md`、`04-ux/06-settings-ia.md`、
  ADR 0155
- **验收标准**：B（模型配置与密钥存储）
- **里程碑**：M2
- **状态**：已有单元覆盖（预设匹配、目录别名、Completions
  兼容）；渲染 UI 场景为 Draft

#### E2E-248: Responses 回合无需等待服务器关闭连接即可完成

- **前置条件**：已配置一个其模型固定 `api: "openai-responses"` 的 provider（或
  `apiStyle: "responses"` 的 provider）；该端点
  前面有一个在最后一个 SSE 事件之后仍保持 HTTP 连接
  打开的代理（本地反向代理，或一个从不发送 FIN 的桩服务器）。
- **步骤**：1) 用该模型启动一个会话并发送一个短提示。2)
  捕获 SSE 帧并确认服务器发出了
  `response.completed`，带 `status: "completed"` 和用量。3) 保持
  桩/代理连接打开而不发送 TCP FIN。4) 观察
  assistant 回合状态并发送后续提示。
- **预期**：回合在 `response.completed` 定稿后立即
  完成：用量被记录，`stopReason` 为 `stop`，客户端停止
  消费该流（底层请求被中止），而不是
  阻塞在空闲连接上。输入框立即变为空闲，
  后续回合正常开始。当服务器从不关闭连接时，
  流绝不能挂起。
- **关联规格**：`03-runtime/11-provider-model-system.md`（§16.1）
- **验收标准**：B（provider Responses 兼容性）
- **里程碑**：M2
- **状态**：已有单元覆盖（流处理器通过 pi-ai 补丁在终止
  事件时结束）；真实代理场景为 Draft

#### E2E-005E: DeepSeek thinking 重放在聚合端点上包含 reasoning_content

- **前置条件**：一个 base URL 不是 `deepseek.com` 的
  OpenAI 兼容 provider，配置了一个 DeepSeek 家族模型 id
  （例如 SiliconFlow `deepseek-ai/DeepSeek-V3.2`）并启用了 thinking。
- **步骤**：1) 以 thinking 模式启动一个会话。2) 完成数个回合，
  其中至少包括一个不产生 thinking 文本的 assistant 回复。
  3) 再发送一个提示，使历史被重放到该 provider。
- **预期**：后续的 Completions 请求在每条 assistant 消息上
  包含一个 reasoning 字段。官方 `api.deepseek.com` 行对
  没有 thinking 的回合可以使用 `\"\"`。非官方的 DeepSeek 家族中转
  在可用时使用真实保留的 thinking，否则使用 ADR 0256 中
  文档记录的非空占位符——绝不在压缩之后出现静默的空字符串。
  请求不会仅因为模型 id 包含 `\"deepseek\"` 就把
  `thinkingFormat` 切换为 `\"deepseek\"`。官方 `api.deepseek.com` 行
  保留 pi-ai 基于 URL 的 DeepSeek `thinkingFormat`。
- **关联规格**：`03-runtime/11-provider-model-system.md`、
  `03-runtime/12-provider-config-schema.md`
- **验收标准**：B（provider Completions 兼容性）
- **里程碑**：M2
- **状态**：已有单元覆盖（兼容注入 + convertMessages 空/非空填充 +
  压缩保留推理的线路证明）；真实 OpenCode / 聚合方
  验证延后；渲染 UI 场景待做

#### E2E-006: 密钥在重启后保留

- **前置条件**：已配置 provider + 密钥。
- **步骤**：1) 退出应用。2) 重新启动。3) 打开设置 → Agent → Providers。
- **预期**：provider 仍列出；密钥可用（无需重新输入）。
- **关联规格**：`03-runtime/14-secrets-storage.md`
- **验收标准**：B（密钥在重启后保留）
- **里程碑**：M2
- **状态**：Draft

#### E2E-007: 无 provider 的阻塞提示

- **前置条件**：应用运行中；未配置任何 provider。
- **步骤**：1) 尝试开始一次聊天。
- **预期**：显示清晰的阻塞提示，说明必须配置 provider。
- **关联规格**：`04-ux/06-settings-ia.md`
- **验收标准**：B（阻塞提示）
- **里程碑**：M2
- **状态**：Draft

### 会话流与中止

#### E2E-008: 新建会话并发送消息

- **前置条件**：已配置 provider。
- **步骤**：1) 创建新会话。2) 输入一条消息。3) 发送。
- **预期**：转录在发送后立即、在第一个 assistant 或工具事件之前，
  显示一个紧凑的本地化 `Working…` 状态。它让位于
  具体的 thinking/工具/回答反馈，或者在没有转录行
  能解释延迟时标识运行时报告的模型等待/重试。
  回合结束时它消失。
  会话顶栏只保留任务标题和窗口操作；不会
  添加单独的运行状态指示器。
- **关联规格**：`03-runtime/02-agent-runtime.md`、`03-runtime/10-session-state-machine.md`
- **验收标准**：C（新建会话、发送消息）
- **里程碑**：M2
- **状态**：已自动化（协议冒烟，真实模型通道；需要 PI_DESKTOP_TEST_API_KEY）

#### E2E-008d: 输入框 Enter 发送与修饰键发送

- **前置条件**：已配置 provider；已打开一个会话。
- **步骤**：1) 保持 Enter 发送启用。输入草稿并按 Enter。
  2) 在设置中禁用 Enter 发送。3) 输入第二个草稿并按
  Cmd/Ctrl+Enter。4) 在第三个草稿中按 Enter 和 Shift+Enter。
- **预期**：步骤 1 发送。设置关闭后，Cmd/Ctrl+Enter 发送；
  单独的 Enter 和 Shift+Enter 插入换行而不发送。IME 组合
  和打开的自动补全菜单仍优先于发送。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/08-component-spec.md` §11.5、
  `04-ux/09-interaction-patterns.md` §1.2
- **验收标准**：C（输入框发送）
- **里程碑**：M2
- **状态**：源码级回归（`composer-ime.test.mjs`）；完整 UI
  键盘旅程仍为 Draft。协议冒烟不派发按键事件。

#### E2E-008e: Host 语音转写与朗读

- **前置条件**：已打开一个会话。未绑定 `AppSettings.speech` 角色。
- **步骤**：1) 在未绑定时用临时 wav 调用 `speech/transcribe`。2)
  通过 host 设置写入持久化一个 ASR 绑定（`openai_audio` / whisper）和一个 TTS 绑定。
  3) 转写该 wav 并把返回的文本插入草稿。4) 合成该草稿。
- **预期**：未绑定的角色以 `SPEECH_NOT_CONFIGURED` 失败，且绝不调用
  provider。转写返回文本。合成写入会话临时区的音频并
  返回有界的 data URL；音频字节绝不进入渲染进程。Whisper/TTS
  绝不出现在聊天模型选择器中。
- **关联规格**：`03-runtime/20-speech.md`、`04-ux/06-settings-ia.md`
- **验收标准**：C（语音）
- **里程碑**：M2
- **状态**：源码级回归（`speech-capability.test.mjs`、
  `plugin-speech-adapter.test.mjs`）；不存在渲染进程入口，且真实
  provider 旅程仍为 Draft。

#### E2E-008a: 首回合工具按需加载

- **前置条件**：Agent 模式；已配置 provider；`BrowserPreview` 或一个
  已启用的插件工具可用；请求捕获可以检查第一个和
  后续 provider 负载。
- **步骤**：1) 创建一个全新会话并发送一个简单提示。2) 检查
  第一个 provider 请求的工具列表。3) 让代理创建或编辑一个
  HTML 页面并观察工具活动。4) 在
  预览任务完成后开始第二个用户提示。
- **预期**：第一个请求只包含模式核心工具（Agent：
  `Read`/`Bash`/`Edit`/`Write`；Chat：`Read`/`Glob`/`Grep`）
  和本地 `ToolSearch`；延迟的 schema
  只由一个有界的 `# On-demand tools` 目录表示。代理在需要
  该能力时、在 `BrowserPreview`（或所选插件/`Skill` 工具）之前调用
  `ToolSearch`，且匹配的 schema 在
  下一个模型回合可用。对于用户可见的 HTML 交付物，在创建或
  第一次有意义的视觉编辑之后调用一次 `BrowserPreview`，然后在
  页面细化过程中通过实时重载复用。生成的、仅测试用和
  非视觉的 HTML 文件不触发预览调用。在第二个提示时，
  仍在有效上下文中的成功激活标记可以在第一个请求中恢复
  匹配的延迟 schema；失败的、被中断的和
  缺少结果的行不会。目录和模式变更也会阻止恢复。
  恢复不授予任何 host 权限或工作区越权。
- **关联规格**：`03-runtime/02-agent-runtime.md` §7.1、
  `03-runtime/03-tools-and-permissions.md` §2.1、ADR 0048、ADR 0225、
  `08-meta/decisions-log.md`（D185、D400）
- **验收标准**：C（首回合与流）+ E（工具执行）
- **里程碑**：M5
- **状态**：已有单元覆盖（`agent-runtime` 延迟工具测试）；真实模型
  请求捕获与完整 Electron 旅程待做

#### E2E-008b: 内置 Browser 插件的界面框架与 CDP

- **前置条件**：带内置插件的打包或检出构建；带
  工作区 HTML 文件的 Agent 会话；Plan 会话可用。
- **步骤**：1) 确认 Plugins 列出 `pi.browser`，已启用，不可卸载。
  2) 打开工作面板并从插件视图启动 Browser。3) 让
  代理预览一个工作区 HTML 文件（`BrowserPreview`），然后通过
  ToolSearch 的 `cdp` / `Browser` 快照。4) 切换到 Plan 并调用插件的
  Browser 工具。5) 禁用 `pi.browser`。6) 调用 `BrowserPreview` 并点击一个 http(s)
  转录链接。7) 从第三方或测试调用方通过
  `pi.browser.cdp` 发送 `Network.getAllCookies`。
- **预期**：启动器没有 host Browser 行。预览打开插件
  视图并实时重载该文件。插件工具 `plugin_pi_browser_Browser`
  在 ToolSearch 之后可以快照。Plan 拒绝插件工具
  （`PLUGIN_DISABLED_IN_PLAN`），而 `BrowserPreview` 仍可调用。禁用
  会隐藏视图和工具；`BrowserPreview` 报错；http(s) 芯片使用
  `openExternal`。Cookie CDP 被拒绝。Guest 边界保持在插件
  视图内。
- **关联规格**：ADR 0170、D333、`07-plugins/03-plugin-api.md`、
  `03-runtime/03-tools-and-permissions.md`
- **验收标准**：E（插件视图 + 工具）+ 安全白名单
- **里程碑**：M5
- **状态**：已有单元覆盖（`bundled-plugins`、`browser-cdp`、
  `browser-preview-tool`）；完整 Electron 旅程待做

#### E2E-008c: 静默区间解释正在进行的工作

- **前置条件**：一个确定性 provider fixture 可以延迟首个
  响应、返回一次带有界退避的可重试失败，且一个会话
  可以启动一个完成时机由 fixture 控制的委派任务。
- **步骤**：1) 发送一个提示，并在 provider 的第一个 assistant
  事件之前按住它。2) 观察转录状态行。3) 释放一次可重试失败
  并在退避期间检查该行。4) 启动一个委派任务并等待
  父级收敛到它。5) 释放 fixture 让回合结束。
- **预期**：状态行命名该静默区间——`Starting…`、
  `Waiting for model`、`Preparing next request…`、`Compacting context…`、
  `Recovering empty response…`、`Retrying model request`，或 `Waiting for`
  加某个具名子代理及其最新的粗粒度动作——并带与
  活跃阶段匹配的单调递增已用时间。多子代理等待列出每个
  运行中的目标。它使用与 `Working…` 相同的紧凑内联样式，
  绝不添加重复的进度卡片，并在 assistant 输出或终止
  事件到达时清除。Stop 操作全程保持可用。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/02-agent-runtime.md`、`04-ux/09-interaction-patterns.md`、
  ADR 0175、ADR 0198
- **验收标准**：C（聊天流）、质量（反馈与可访问性）
- **里程碑**：M5
- **状态**：Draft（确定性 fixture 待做）

#### E2E-009: 流式 token 在 UI 中可见

- **前置条件**：会话活跃；消息已发送。
- **步骤**：1) 请求一个同时包含 Markdown、行内/展示数学公式
  （同时使用美元符号（`$…$` / `$$…$$`）和 TeX 方括号（`\\(…\\)` /
  `\\[…\\]`）定界符）的长回答。2) 在 assistant 响应流式输出时观察。3) 让
  回答完成并检查渲染进程控制台。
- **预期**：运行时块通过增量
  Markdown 渲染器渐进出现，最终响应完整。四种数学定界符
  形式都用 KaTeX 渲染，`\\[…\\]` 使用展示布局。渲染器
  不会启动第二个动画帧打字机循环，不会抛出 React 错误 185，也不会
  在 CSP 下拒绝 Vite 内联的 KaTeX 字体。
- **关联规格**：`03-runtime/02-agent-runtime.md`、
  `04-ux/08-component-spec.md`、`04-ux/09-interaction-patterns.md`、
  `05-security/01-security.md`
- **验收标准**：C（流式输出）、质量
- **里程碑**：M2
- **状态**：部分自动化（协议真实模型流、`renderer-stream-safety.test.mjs`
  中的渲染器源码回归，以及 `latex-math.test.mjs` 中的数学定界符渲染；
  完整 UI 观察仍为 Draft）

#### E2E-010: 中止生成

- **前置条件**：一个会话既能产生故意延迟的首个
  token，也能产生流式响应。
- **步骤**：1) 发送普通文本，并在 assistant 文本、thinking 或
  工具行开始之前停止。2) 确认用户行被撤销且文本回到
  输入框。3) 再次发送，等待部分输出，然后在
  流式过程中停止。4) 观察转录和输入框。
- **预期**：未获回答的发送被撤销，其草稿恢复。
  流式发送停止时保留其部分响应，没有草稿
  恢复，也没有重复的用户回合。会话保持可用。
- **关联规格**：`03-runtime/02-agent-runtime.md`
- **验收标准**：C（中止）
- **里程碑**：M2
- **状态**：Draft

#### E2E-171: 流式回复在退出、崩溃与停止后存活

- **前置条件**：一个转录超过一个渲染进程
  页面（超过 100 条消息）的会话，以及一个在首个工具调用
  之前流式回复至少十秒的模型。
- **步骤**：1) 发送一个提示，让回复流式输出约 5 秒。2) 在
  流式中途退出应用（Cmd+Q / 托盘 Quit），重新启动并打开该会话。3) 重复
  发送，然后在流式中途杀死 agent sidecar 进程并观察
  转录。4) 重复发送，在流式中途按 Stop，然后从
  侧边栏重新打开该会话，检查 `sessions/<id>.jsonl` 和
  `sessions/<id>.inflight.json`。5) 重复发送并让它正常完成。
- **预期**：2) 会话显示用户提示，随后是截至退出前
  至多 1.5 秒的流式文本，作为一个 `aborted` 回合下的
  `aborted` assistant 行；会话中更早的内容不缺失也不截断。3)
  流式行带着其文本就地落定到 `aborted`，重载后同一行
  仍然存在，且不残留 `.inflight.json`。4) 部分
  回复在 Stop 后立即、以及重新打开后可见；转录
  文件未被重写（其更早的行逐字节相同），且
  检查点文件在被中止的最终行落地后消失。5) 完成的
  回复每个 assistant 片段恰好一行，没有 `aborted` 重复行，也没有
  检查点文件。退出时尚未离开 outbox 的已完成
  回复在重启后仍然存在（若从检查点恢复则提升为
  `complete`，或在第一个 `session.get` 之前从 outbox 排出）。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、`03-runtime/07-process-model.md`、
  `03-runtime/01-ipc-protocol.md`
- **验收标准**：C（中止）、F（持久化）
- **里程碑**：M2
- **状态**：Draft

#### E2E-SESSION-outbox-duplicate-id-does-not-drop-history

- **前置条件**：两个会话的 provider 工具行复用同一个
  `toolCallId` 作为 `messages.id`（例如 `call_421522`）。第一个会话
  已持久化该 id。第二个会话随后运行数个回合，使
  assistant/工具行排在冲突的追加之后。
- **步骤**：1) 在会话 A 中以 id `call_421522` 完成一次工具调用。
  2) 在会话 B 中运行相同的 provider 工具 id，然后继续聊天
  数个回合。3) 退出并重新打开。4) 打开两个会话。
- **预期**：会话 A 仍保留其原始工具行。会话 B 在
  重新打开后保留其后续回合；冲突的工具行存储在
  `{sessionB}:{call_421522}`（或等价的重映射 id）下。持久化
  outbox 为空，且没有停留在 `UNIQUE constraint failed:
  messages.id` 的暂停状态。两个会话后续的 assistant/工具行
  都不缺失。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、ADR 0041、D444
- **验收标准**：F（持久化）
- **里程碑**：M2
- **状态**：已有单元覆盖（`append_message_remaps_ids_owned_by_another_session`、
  `persistence-outbox.test.mjs`）；桌面旅程待做

#### E2E-SESSION-outbox-poison-does-not-drop-history

- **前置条件**：一个会话协作的投递回合正在运行。用户
  用 Alt+Enter 进行引导（内容与投递不匹配）。来自此会话或
  另一个会话的后续 assistant 和工具行排在该追加之后。
  可选地，outbox 中已存在一个来自旧 host 的
  `PERMISSION_DENIED:` 队头。
- **步骤**：1) 启动一个协作投递回合。2) 用 Alt+Enter 发送一个引导
  提示。3) 让该回合产生 assistant/工具行，如方便的话
  也包括另一个会话中的。4) 退出并重新打开。5) 打开受影响的会话。
- **预期**：引导内容持久化为不带
  `session_message` 来源的普通用户行。投递的用户行仍具有
  host 派生的来源。后续 assistant/工具行在重新打开后存活。
  outbox 为空，且没有停留在 `PERMISSION_DENIED:` 的暂停状态。
  一个 `PLUGIN_PERMISSION_DENIED` 队头仍会暂停而不是排出。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、ADR 0041、ADR 0239、
  ADR active-turn-steering、D597
- **验收标准**：F（持久化）
- **里程碑**：M2
- **状态**：已有单元覆盖（`steering_input_persists_without_inheriting_delivery_origin`、
  `persistence-outbox.test.mjs`）；桌面旅程待做

#### E2E-011: 在项目会话与临时会话之间切换

- **前置条件**：存在一个保留的项目会话和一个无路径的临时
  （Temporary）会话。两者的转录都超过一个视口，且有不同的最终
  记录。
- **步骤**：1) 从侧边栏的精确路径分组打开项目会话。2)
  滚动到较早的记录并确认跳转到最新控件出现。
  3) 打开临时会话并观察其首个绘制帧。4) 在前两次转录
  读取被延迟时，快速在项目 → 临时 → 项目之间切换，
  观察哪一行响应、哪个目的地提交。5)
  悬停/聚焦临时会话，再次切换到它以使用暖缓存，然后
  在启用减弱动态效果时重复。6) 观察聊天内容与工作区
  框架。
- **预期**：侧边栏不包含“最近”聚合；保留的项目
  有按作用域划分的分组，无路径会话留在 Temporary 下；每个
  转录正确加载；选择临时会话会清除项目上下文，
  且不继承任何工作区访问权；两个会话都保持持久化。每个会话
  首次激活时在转录底部绘制其独特的最终
  记录，而不会先暴露转录顶部、另一个会话的滚动位置
  或陈旧的跳转到最新控件。最新点击的行立即
  响应，其转录请求不等待被取代的读取；只有最终的
  项目/会话/工作面板元组提交。冷切换时，当前
  可见面板在目的地提交前继续在细进度条下
  显示自己的会话，输入框保持其已落定的首页/停靠
  形态但处于惰性，使任何提示都无法到达正在离开的会话；
  任何时候都没有转录被变暗。暖回访立即
  以其自身内容和滚动位置展现保留的面板，然后
  就地重新验证而无可见变化。减弱动态效果保持进度条
  静止，并保持相同目的地，不发生骨架屏重挂载
  或穿越历史的动画。
- **关联规格**：`03-runtime/10-session-state-machine.md`、
  `04-ux/01-ui-ia.md`、`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`
- **验收标准**：C（切换会话）
- **里程碑**：M2
- **状态**：源码级回归已覆盖；完整视觉场景为 Draft

#### E2E-207: 通过有界转录窗口打开大型与长会话

- **前置条件**：一个会话包含一条至少有 50 MB 文本
  或工具输出的消息，以及足以跨越数个转录
  页面的更多消息；第二个会话包含一段普通的
  长对话。
- **步骤**：1) 从侧边栏打开每个会话，同时记录首个
  可见转录帧与渲染进程响应性。2) 滚动到
  转录顶部。3) 在会话被
  缓存后重复打开/关闭循环。4) 检查该会话
  读取窗口的 host 请求/响应或测试 fixture。
- **预期**：打开时绘制最新的有界页面，而不把
  完整的 50 MB 值传输到渲染进程。大值被可见地标记
  为显示截断，而转录与面向模型的读取保持
  无损。到达顶部时增量加载更早的页面并保持
  视口位置；最后一页报告没有更早的历史。重新打开长
  会话复用有界缓存，不会在最新消息可用之前
  同步构造每一个历史行。编辑、删除、
  修订和 Stop 操作在任何重写之前重新水合完整转录，
  因此更早的消息绝不会因为只有一个窗口可见而丢失。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/04-data-storage.md`、`03-runtime/06-host-rpc-protocol.md`、
  ADR 0120
- **验收标准**：C（会话打开与滚动）、F（持久化）、质量
- **里程碑**：M5
- **状态**：源码级回归已覆盖；完整大 fixture Electron
  旅程为 Draft

#### E2E-011a: 在另一个会话仍在流式输出时新建会话

- **前置条件**：已配置 provider；会话 A 正在流式输出一个长
  响应（输入框显示停止/中止控件）。
- **步骤**：1) 在 A 仍在流式时，点击 New task / New chat。2)
  观察新会话的输入框。3) 在 A 于后台
  继续流式时输入一个提示并发送。4) 让 A 完成并再次观察
  新会话的输入框。
- **预期**：先前的流式转录在第一帧就离开屏幕。
  新会话立即显示空白首页和空闲的
  Send 控件（绝不出现卡住的停止/中止控件），其文本域已启用；
  提示正常发送并流式输出，同时 A 在
  后台继续运行。当 A 结束时，其跨会话的 `agent_end`
  不改变新会话的输入框状态，它保持空闲并带 Send 控件。
- **关联规格**：`04-ux/08-component-spec.md`（§11.4）、
  `04-ux/09-interaction-patterns.md`（§1.6、§11）
- **验收标准**：C（会话隔离、聊天与流）
- **里程碑**：M2
- **状态**：已有单元覆盖（`composer-send-state.test.mjs`）；完整 UI 场景为 Draft

#### E2E-011b: 从保留的项目分组创建新会话

- **前置条件**：已配置 provider；侧边栏中至少有一个
  保留的项目可见；当前对话可以是空闲或流式中。
- **步骤**：1) 点击项目分组的 New session 控件。2) 等待
  项目对话加载。3) 输入一个提示并检查 Send 控件。
  4) 不再次点击 New session 直接发送。
- **预期**：项目激活作为一次渲染进程导航流程提交。
  复用与否由内存中的列表加渲染进程空信号
  （`messageCount`、实时行、运行标志、已提交草稿）决定，而不是阻塞的
  `session.list`。如果最新会话为空，第一帧即选中
  既有行；如果非空，空白首页立即替换先前的
  转录，并从 `session.create` 创建一个持久的空会话。
  目的地一旦被选中，输入框立即变为可编辑且 Send 控件
  启用；更早项目的后台回合不能让它保持禁用。
  在槽位为空时重复点击会选中同一行且不创建重复项。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `04-ux/09-interaction-patterns.md`（§1.6）、`04-ux/08-component-spec.md`（§11.4）
- **验收标准**：C（项目会话创建与发送就绪）
- **里程碑**：M2
- **状态**：源码级回归已覆盖（`app-store-sidebar.test.mjs`）；
  完整 UI 场景为 Draft

#### E2E-011c: 会话作用域的输入框草稿

- **前置条件**：已配置 provider；存在会话 A 和 B；A 有
  转录，因此使用停靠输入框；B 是空会话，因此使用
  首页输入框；输入框可见且两个会话都空闲。
- **步骤**：1) 选择 A，输入一个提示但不发送。2) 切换到 B
  并检查输入框。3) 在 B 中输入一个不同的提示，然后切换回
  A。4) 创建一个新会话并检查其输入框。5) 回到 B，
  然后删除 B；重访其余会话以及首页输入框（如果
  可用）。6) 在 A 中输入，打开设置（或 Plugins），然后回到聊天。
  7) 在 A 中有未发送草稿时隐藏应用窗口再显示。
- **预期**：B 初始显示空输入框，A 恢复其原始
  未发送提示，新会话以空白开始而不是继承 A 或
  B。每个会话在空白首页 ↔ 停靠重挂载之间只保留
  自己的草稿（包括文件引用芯片）。删除 B 会移除其缓存草稿。如果
  一个提示在其请求进行中发出且用户切换了
  会话，成功完成只清除提交方会话的草稿，
  绝不清除目的地的输入框。A 中的草稿在
  设置/Plugins 往返之后、以及窗口隐藏再
  显示之后仍然存在（D301）。
- **关联规格**：`04-ux/09-interaction-patterns.md`
- **验收标准**：C（会话隔离与输入框输入）
- **里程碑**：M2
- **状态**：源码级回归已覆盖
  （`composer-draft-cache.test.mjs`）；完整 UI 场景为 Draft

#### E2E-011d: New Task 立即创建持久的空槽位

- **前置条件**：已配置 provider；至少存在一个真实会话，
  使侧边栏历史非空。
- **步骤**：1) 在一个保留项目内和临时作用域中，从侧边栏、
  顶栏或 Cmd/Ctrl+N 调用 New Task。2) 检查侧边栏
  历史与输入框。3) 快速点击同一分组的 New Task 控件
  数次。4) 输入一条消息并发送。5) 再次检查侧边栏历史
  并在另一个项目分组中重复。
- **预期**：当分组最新会话非空时，空白首页
  在第一帧替换先前的转录，然后从 `session.create` 持久化
  一个新行（没有阻塞的 `session.list` /
  `session.get` 往返），并在首次发送前被选中。一旦该行
  成为该分组最新的空会话，重复点击会选中它（或
  在已选中时什么都不做），且不创建重复。发送更新
  同一行的标题与消息数；项目分组与临时分组保持
  独立的槽位。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `04-ux/08-component-spec.md`（§11）、`04-ux/01-ui-ia.md`（§5）
- **验收标准**：C（历史完整性与分组作用域创建）
- **里程碑**：M2
- **状态**：源码级回归已覆盖
  （`app-store-sidebar.test.mjs`、`composer-send-state.test.mjs`、
  `session-create.test.mjs`）；完整 UI 场景为 Draft

#### E2E-011e: 空会话复用仅限最新会话

- **前置条件**：一个项目分组包含一个较旧的空会话和一个
  较新的有消息会话；另有一个独立项目和 Temporary 分组
  可用。
- **步骤**：1) 在第一个项目分组中点击 New Task。2) 确认
  即使较旧的空会话仍然存在，也创建了新行。3) 在发送前再次点击
  New Task。4) 在第二个项目和 Temporary 分组中重复。
- **预期**：第一次点击创建一个新的持久行，因为只考虑
  最新会话而它是非空的。第二次点击复用
  刚创建的空行。较旧的空行保持不动，而
  其他每个分组都有自己独立的空槽位决策。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、`04-ux/01-ui-ia.md`、
  `04-ux/08-component-spec.md`
- **验收标准**：C（会话创建与分组）、F（持久化）
- **里程碑**：M2
- **状态**：源码级回归已覆盖；完整 UI 场景为 Draft

#### E2E-012b: 项目记忆只在其项目内持久化

- **前置条件**：应用运行中，有两个保留项目和一个已配置的
  provider。
- **步骤**：1) 打开第一个项目的行菜单并选择 Project memory。2)
  添加一张记忆卡片，输入标题和项目特定的备注，然后保存。3)
  重新打开编辑器，编辑该备注，添加第二张卡片，移除第一张卡片，
  并保存。4) 在第一个项目中开始或继续一次聊天，验证
  下一个运行时把已保存条目作为派生上下文接收。5) 切换到
  第二个项目并开始聊天。6) 回到第一个项目并重新打开
  编辑器。
- **预期**：重新打开后编辑器加载已保存的卡片。第一个
  项目的运行时把它们的可读投影作为带标签的
  用户上下文块接收；第二个项目的运行时不接收。既有的
  遗留纯文本记忆以一张无标题卡片打开。空记忆是合法的，
  移除所有卡片会清除投影，保存替换先前的值，
  超过 32 KiB 的内容被拒绝且不做部分保存。创建
  对话框的记忆提示简洁，不暗示记忆
  跨项目共享。
- **关联规格**：`03-runtime/01-ipc-protocol.md`（§9）、
  `03-runtime/04-data-storage.md`（§4.1）、
  `03-runtime/06-host-rpc-protocol.md`（Projects）、
  `04-ux/06-settings-ia.md`（Project archive）、
  `04-ux/08-component-spec.md`（Sidebar interactions）
- **验收标准**：C（聊天/流）、D（项目 UI）、F（持久化）、本地化
- **里程碑**：M5
- **状态**：单元/源码已覆盖；完整 provider/UI 旅程为 Draft

#### E2E-011f: 运行中发送按会话排队提示并支持 Send now

- **前置条件**：已配置 provider；会话 A 能产生一个
  至少带一个已完成工具批次的延迟响应；会话 B 存在且
  空闲。
- **步骤**：1) 在 A 中发送一个长时间运行的提示。2) 在 A 运行时，
  验证输入框恰好有一个提交按钮：草稿为空时是 Stop
  （`aria-label=\"Stop generating\"`），不存在 Send 按钮；输入草稿
  后验证同一槽位变为 Send（`aria-label=\"Send\"`），不存在
  Stop 按钮。再发送两个提示并检查
  输入框上方的队列。3) 移除第二个排队行并切换到 B。4)
  在 B 中发送一个提示，然后在任一运行完成前回到 A。5)
  对 A 剩余的排队行选择 Send now，然后对第二行选择
  Send now。6) 观察 A 经过当前工具/回复边界，
  然后是下一个回合。7) 在 A 中再启动一次运行，清空草稿
  以露出单个 Stop 按钮，按 Stop，并检查队列。8) 用两个排队
  提示重复，让活跃回合在不使用 Send now 的情况下完成，并把
  其 host `session.endTurn` 响应延迟到 `agent_end` 投递
  之后。释放定稿并观察两个后续消息经过各自的回合边界。
  再用 provider 错误和立即中止重复。9) 在有等待行时，
  使用上移和下移，确认持久化的顺序随之变化。10)
  在输入框有文本时编辑一个等待行，然后在输入框为空时
  编辑。
- **预期**：单一提交槽位在每种状态下恰好包含一个按钮：
  空闲且为空时是禁用的 Send；运行中且有内容时是启用的
  Send（会把提示入队）；运行中且草稿为空时是 Stop。
  A 的两个提示按 FIFO 顺序出现，被移除的行绝不发送，
  且 B 的队列保持独立。Send now 请求优雅停止：
  当前批次以正常的 `agent_end`/已完成回合结束，然后
  被提升的行按其被提升的顺序、在任何等待行之前投递，
  且没有 `AGENT_BUSY`：第一行启动回合，其余的作为
  相邻的用户消息加入它，因此模型对整个块只回答一次。
  remove 后，其 Send now 按钮显示为已决定；提升是
  单向的。上移/下移只交换等待行，绝不跨越被提升
  块，且持久化。输入非空时编辑被拒绝并显示可见
  消息，否则移除该行并把其文本连同
  文件引用芯片还回输入框。立即 Stop 中止当前回复
  并保留 A 的排队行；
  切换会话保留两个队列。正常完成、provider
  失败和中止都会在持久定稿释放会话后自动
  恢复排队发送。定稿待决时没有排队提示启动；
  每个后续回合按 FIFO 顺序恰好启动一次，无需
  再次点击或切换会话。重复的终止处理不会重复派发。
  其他会话的队列保持不变，在定稿待决时退出
  会保留排队工作而不启动另一个回合。
- **关联规格**：`03-runtime/01-ipc-protocol.md`（§5.6）、
  `04-ux/08-component-spec.md`（§11）、
  `04-ux/09-interaction-patterns.md`（§3.4）、ADR 0118、ADR 0213、ADR 0265
- **验收标准**：C（聊天、流与会话隔离）、质量
- **里程碑**：M6+
- **状态**：源码级回归与确定性桌面定稿 /
  Agent Host 集成已覆盖（`queued-turn-finalization.test.mjs`）；
  提升、重排和编辑契约在源码级覆盖
  （`composer-send-state.test.mjs`）；完整 UI 场景为 Draft

#### E2E-QUEUE-promote-orders-delivery-by-click: 两次 Send now 点击按点击顺序投递

- **前置条件**：已配置 provider；会话 A 正在运行一个
  至少带一个已完成工具批次的回合；有三个提示排在它之后。
  第一个排队行。3) 确认被提升块按第三 → 第一排序，
  两行都锁定其移动/编辑/移除操作，且剩余行
  仍可编辑。4) 让边界过去并观察转录。
- **预期**：第一次点击最先投递，第二次点击第二——
  点击顺序即投递顺序，不是“最后点击胜出”，也不是原始
  队列顺序。两行在一个回合中作为相邻的用户消息出现，
  模型只回答一次；队列不再列出任何一个被提升行。两个
  被提升行都显示为已决定，不能被编辑、移除或
  重排。等待行保留其操作，且不在任何一个被提升行
  之前投递。
- **关联规格**：`03-runtime/01-ipc-protocol.md`（§5.6）、
  `04-ux/08-component-spec.md`（§11）、ADR 0265
- **验收标准**：C（聊天、流）
- **里程碑**：M6+
- **状态**：Draft；排序与相邻投递由
  `turn_queue`、`turn-queue` 和 `agent-host` 单元测试覆盖
- **关联规格**：`03-runtime/01-ipc-protocol.md`（§5.6）、
  `04-ux/08-component-spec.md`（§11）、ADR 0265
- **验收标准**：C（聊天、流）
- **里程碑**：M6+
- **状态**：Draft；底层排序由 `turn_queue`、
  `turn-queue` 和 `agent-host` 单元测试覆盖

#### E2E-QUEUE-reorder-moves-plain-neighbours: 上移/下移重排等待队列

- **前置条件**：已配置 provider；一个回合正在运行，至少有三个
  提示排队，且没有被提升行。
- **步骤**：1) 把第三行上移两次并确认它变为第一。2) 把
  第一行上移一次并确认没有移动。3) 提升一行，然后尝试
  把相邻的等待行移过它。4) 重载渲染进程并检查
  队列顺序。
- **预期**：每次移动把该行与其相邻的等待邻居交换，
  Host 持久化新顺序，因此重载后重现它。等待块
  边界与被提升块不可移动：块边缘的移动是
  无操作，绝不到达 Host，且任何移动都不改变被提升行的位置。
- **关联规格**：`03-runtime/01-ipc-protocol.md`（§5.6）、ADR 0265
- **验收标准**：C（聊天）、F（持久化）
- **里程碑**：M6+
- **状态**：Draft；host 侧重排由 `turn_queue` 单元测试覆盖

#### E2E-QUEUE-edit-restores-draft-only-when-input-empty: 编辑恢复排队草稿

- **前置条件**：已配置 provider；一个回合正在运行，有一个携带
  文本和文件引用芯片的排队提示；输入框为空。
- **步骤**：1) 输入一个草稿，然后在该排队行上选择编辑。2) 清空
  输入框并再次选择编辑。3) 确认队列不再列出该行，
  且输入框持有该行的文本和它的文件引用芯片。4) 发送它
  并把转录与原始排队提示比较。
- **预期**：输入非空（或有附件芯片）时，编辑被
  拒绝并显示可见消息，该行保持排队。输入为空
  时该行离开队列，Host 不再列出它，输入框持有
  精确文本加上原始文件引用芯片——而不是
  Host 收到的序列化提示。重新发送产生与
  该排队行本会产生的相同提示。
- **关联规格**：`04-ux/08-component-spec.md`（§11）、ADR 0265
- **验收标准**：C（聊天、流）
- **里程碑**：M6+
- **状态**：Draft；输入框侧契约由
  `composer-send-state.test.mjs` 覆盖

#### E2E-011g: New Task 不把先前的转录留在屏幕上

- **前置条件**：已配置 provider；会话 A 有可见的转录
  （空闲或流式中）；分组最新会话非空。
- **步骤**：1) 点击 New Task（侧边栏、顶栏或 Cmd/Ctrl+N）。2)
  在下一帧观察聊天表面，早于新侧边栏行被要求
  存在之前。3) 在该间隔期间在输入框中输入。4) 等待新
  行出现并发送。
- **预期**：A 的转录在第一帧消失（空白首页、空闲
  Send）。输入框不停留在 A 的草稿上。`session.create` 之后
  同一空会话被选中，等待期间输入的任何文本都属于
  该会话，发送不创建第二行。发送前重复 New Task
  复用该行。在空白目的地可见之前不会要求 host
  执行 `session.list` 或 `session.get`。
- **关联规格**：`04-ux/09-interaction-patterns.md`（§1.6）、
  `04-ux/08-component-spec.md`（§11）、ADR 0154
- **验收标准**：C（会话创建）、质量
- **里程碑**：M2
- **状态**：源码级回归已覆盖（`session-create.test.mjs`、
  `session-switch-performance.test.mjs`）；完整 UI 场景为 Draft

### 会话顶栏

#### E2E-087: 会话顶栏在聊天路由上渲染

- **前置条件**：已配置 provider；至少存在一个会话。
- **步骤**：1) 打开聊天路由。2) 检查会话区域顶部
  46px 的栏。3) 确认它显示简洁的会话/任务标题和
  New task / Search 操作按钮；确认
  侧边栏切换按钮**仅在侧边栏折叠时**出现（展开时，
  该控件归侧边栏所有）。4) 切换到 Pull requests、Scheduled、
  Plugins 或 Settings 路由并检查同一顶部区域。
- **预期**：每个路由自有的顶部区域使用相同的 `--ds-toolbar-height`
  （46px）、bg-primary 表面和底部边框；Windows/Linux 在右侧
  预留相同的 120px 原生控件带。在聊天路由上，
  会话顶栏只渲染其标题和操作；没有模型
  或 Agent|Plan|Goal 模式控件。
  输入框左侧的芯片拥有活跃会话的 Agent/Plan/Goal 切换，
  输入框右侧的组合芯片拥有模型与推理选择。
  任务标题是唯一可见的标题文本，上限为 10 个字符
  并以省略号截断；项目作用域通过其工具提示可见。侧边栏
  切换按钮仅在折叠状态出现（不与
  侧边栏的控件重复）。在其他每个路由上渲染无边框拖拽
  带（没有聊天顶栏控件），同时保留相同的
  表面与对齐。该栏可拖动以移动窗口；交互式
  控件不触发窗口拖拽。
  macOS 仅在侧边栏折叠时在左侧留出 88px 给红绿灯按钮
  （全屏时为 8px）；Windows/Linux 在右侧留出 120px 给
  原生窗口控件。
- **关联规格**：`04-ux/08-component-spec.md`（§2 Topbar）
- **验收标准**：C（发送/UI）、质量
- **里程碑**：M2
- **状态**：Draft

#### E2E-087a: 目的地页面头部在 macOS 上避开标题栏带

- **前置条件**：macOS 构建；至少安装了一个插件。
- **步骤**：1) 在窗口默认大小时打开 Plugins 路由。
  2) 检查页面顶部：“Plugins”标题行、其主要操作、
  以及溢出菜单按钮。3) 把页面滚动到顶部并确认没有
  页面内容隐藏在 46px 栏带之后。4) 在 Scheduled 和
  Pull requests 路由上重复。5) 打开一个插件的详情面板并检查其头部。
- **预期**：页面头部在 macOS 上完全渲染在无边框拖拽带
  之下，与 Windows/Linux 上已有的行为一致：标题行不被裁剪，
  Installed / Marketplace 分段控件和搜索字段位于其
  预期偏移处，而不是窗口顶边。`.page-frame` 在
  darwin、win32 和 linux 上同样预留
  `--ds-toolbar-height` 加 8px 缓冲。
  插件详情面板堆叠在该栏带之上（`z-index: 60`），其自有头部
  保持在顶边，其关闭按钮选择退出拖拽
  矩形。
- **关联规格**：`04-ux/08-component-spec.md`（§2.3 Layout）
- **验收标准**：C（UI）、质量
- **里程碑**：M2
- **状态**：源码级回归已覆盖
  （`apps/desktop/test/plugins-page-style.test.mjs`）；完整 UI 场景为 Draft

#### E2E-088: 输入框 Agent/Plan/Goal 芯片更新会话

- **前置条件**：聊天路由活跃；已选中一个会话。
- **步骤**：1) 点击输入框左侧的模式芯片进入 Plan。2)
  发送一个通常需要 Write/Edit 的提示并观察行为。3)
  点击同一输入框芯片回到 Agent。4) 开始一个回合，并尝试在
  运行中或有待决 Plan 审批可见时切换模式。
- **预期**：输入框芯片更新活跃会话的 `mode`（Plan 和
  Goal 硬拒绝 Write/Edit 和插件工具，而 Bash 遵循所选
  权限模式；Agent 按权限设置允许其正常工具）。
  存在回合或活跃的待决审批时芯片被禁用，
  会话回到空闲/规划中后重新启用。不渲染顶栏模式控件。
- **关联规格**：`04-ux/08-component-spec.md`（§2、§11）、
  `03-runtime/03-tools-and-permissions.md`（§10）、
  `03-runtime/04-data-storage.md`（§8）
- **验收标准**：C、E
- **里程碑**：M2
- **状态**：Draft

#### E2E-088a: 输入框配置控件在项目/会话初始化中存活

- **前置条件**：已配置 provider；新项目或新会话流程
  可见，而目的地的 `activeSessionId` 仍在解析中。
- **步骤**：1) 在空白/首页过渡期间检查输入框的模式、
  模型 × 推理和权限控件。2) 点击模式控件并
  确认它前进到下一个模式。3) 打开组合芯片，进入
  Reasoning level 子菜单，选择一个受支持的级别。4) 打开权限
  模式并选择 Auto。5) 在导航完成后检查目的地会话。
- **预期**：没有任何空闲配置触发器仅因
  目的地会话尚未投影而被禁用。New Task 已经
  选中或创建了持久的空行，第一个
  配置动作应用于该会话而无需等待消息；
  不需要第二次点击。运行中的回合和待决审批仍
  禁用这些控件。在该过渡背后，聊天区域遵循
  冷切换规则：当前可见面板在目的地提交前
  继续显示自己的会话，唯一的等待提示是细
  进度条，没有任何东西变暗，提示提交保持惰性，
  直到可见面板成为活跃会话，因此提示无法到达
  正在离开的会话。
  在 zh-CN/zh-TW 中，输入框权限菜单把 Accept edits 选项
  渲染为 `允许编辑` / `允許編輯` 并保持在一行内。
- **关联规格**：`04-ux/08-component-spec.md`（§11）、
  `04-ux/09-interaction-patterns.md`（§5A）、ADR 0137
- **验收标准**：C（新项目/会话输入框）
- **里程碑**：M2
- **状态**：Draft

#### E2E-088b: 输入框占位提示跟随页面与会话上下文

- **前置条件**：英文与 zh-CN 语言环境可用；已配置
  provider；至少一个 Skill 处于活跃；空白首页和两个
  对话都可以打开。
- **步骤**：1) 在空白首页记录欢迎占位文案，并等待超过
  4 秒确认它不变。2) 打开对话 A，记录
  其提示文案，输入并清空文本，聚焦并失焦文本域，然后等待；
  确认文案不变。3) 切换到对话 B 再回到
  A，记录每次提示变化。4) 在首页与对话之间
  切换并检查命令/文件与键盘提示。5) 输入 `/` 并检查
  斜杠菜单。包括带长英文/CJK 描述的 Skill、短/无
  描述的、带独立标题/参数提示的，以及一个特别长的斜杠
  名称；也在 `@` 模式下检查一个长文件名。在 1040px 与 1680px
  视口宽度、320px 与 640px 输入框宽度下重复。6) 切换到 zh-CN
  并重复上下文切换检查。
- **预期**：初始渲染的上下文以其欢迎文案开始，并在
  页面/会话上下文变化前保持稳定。每次上下文切换以
  不透明度淡入前进到下一条本地化的命令/文件或键盘提示；
  不发生定时器驱动的变化。键盘提示包含 Shift+Enter 和
  提交提示，命令/文件提示包含 `/` 和 `@`。斜杠菜单仍包含
  `/new`、`/compact`、`/agent-mode`、`/plan-mode` 和 `/goal-mode`，
  随后是底部的 Skills 分组。选择 Skill 插入其斜杠 id；
  发送后保持已输入的命令芯片可见，且模型在回答前
  用该 id 调用 `Skill`。zh-CN 显示对应的本地化文案，
  包括 `Shift+Enter for newline · Use Send to submit`。
  长描述只使用命令名称与
  提示之后剩余的空间，因此短名称保持完全可见。描述与
  超长名称在行内省略截断，不发生横向溢出；文件名保留
  可用的行宽。名称高亮与保留输入焦点时的点击接受
  保持完好。
- **关联规格**：`04-ux/08-component-spec.md`（§11）、
  `04-ux/04-builtin-commands.md`（§7–8）
- **验收标准**：C（发送/UI）、本地化、质量
- **里程碑**：M2
- **状态**：源码已覆盖（`composer-placeholder-context.test.mjs`）；
  斜杠菜单布局在 `pnpm build:js` 之后由
  `pnpm test:e2e:composer-autocomplete` 覆盖（真实 React/Chromium 与
  生产 CSS，确定性命令 fixture；不需要 provider）。完整
  provider/会话场景为 Draft；分支上的运行不替代集成后 E2E

#### E2E-089: 输入框模型菜单向上打开并切换模型

- **前置条件**：聊天路由活跃；已配置 provider。
- **步骤**：1) 点击输入框右侧的模型 × 推理芯片。2) 确认
  菜单从底部输入框向上打开。3) 进入 Model，选择一个不同的
  provider/模型，回到根菜单。4) 进入 Reasoning level 并选择一个
  受支持的级别。5) 从命令面板或应用菜单打开设置。
- **预期**：触发器使用 Bot 图标，同时保留当前模型
  和推理标签。根菜单只显示 Model 和 Reasoning level 条目。
  Model 子菜单列出已启用的可运行 provider，且只列出
  每个 provider 已保存的模型绑定，每个模型行在其 provider
  标题下可见地缩进。缓存的或新发现的模型可以为
  这些绑定提供显示名与元数据，但未配置的发现结果不出现；
  发现不可用时已配置的 ID 仍可用。Reasoning
  level 子菜单只列出所选模型的已发布级别。选择
  更新活跃会话的模型/推理配置而不关闭菜单；
  设置从命令面板/菜单打开。输入框模型触发器对
  长 ID 省略截断。每个选项只显示一个显示名，
  悬停长选项时其完整显示名出现在工具提示中，
  不改变菜单布局，也不添加可见的模型 ID。
- **关联规格**：`04-ux/08-component-spec.md`（§11，model menu）、
  `03-runtime/13-model-catalog-and-selection.md`
- **验收标准**：C
- **里程碑**：M2
- **状态**：Draft

#### E2E-COMPOSER-narrow-controls: 输入框控件适配窄聊天列

- **前置条件**：聊天路由活跃；已选择一个已配置的模型；
  输入框以空白首页和会话停靠两种变体渲染。
- **步骤**：1) 把输入框容器设为 560px 并检查组合的
  模型 × 推理触发器。2) 设为 480px，然后 450px。3) 在每个宽度下
  检查模式、权限、上下文、增强和 Send/Stop 控件；
  从窄触发器打开模型菜单；在另一种
  输入框变体中重复视觉检查。
- **预期**：工具栏保持为一个不换行的行，不溢出
  其容器。560px 时推理标签和分隔符首先让位；
  480px 时模型标签进一步收窄；在 450px 下限时组合的
  模型 × 推理触发器是一个 32px 纯图标控件。完整选择
  仍可通过触发器的菜单、工具提示和可访问名称获得。
  模式与权限标签保持单行并省略截断，上下文
  环与操作控件保留可用的点击目标，单一的 Send/Stop
  槽位保持可达。首页与会话停靠输入框一致。
- **关联规格**：`04-ux/08-component-spec.md`（§11）
- **验收标准**：C（发送/UI）、质量
- **里程碑**：M2
- **状态**：已在任务候选 `737435248ebd32e0b2a406f93b7b245784bc4289`
  （基线 `cea6e02c`）上自动化：`pnpm test:e2e:layout` 167/167，
  包括 450px 模型芯片断言；`pnpm test:e2e:composer-autocomplete` 和
  `pnpm test:e2e:composer-paste` 通过。源码由
  `composer-responsive.test.mjs` 覆盖。

#### E2E-090: 转录底部预留跟随停靠输入框高度

- **前置条件**：聊天路由活跃；一个会话的转录
  超过一个视口，使最后一条消息位于停靠输入框附近。
- **步骤**：1) 把转录滚动到最新消息。2) 测量
  最后一条消息与停靠输入框顶部之间的垂直间隙。
  3) 在输入框中输入数行使草稿变为多行。4)
  重新测量间隙，确认最后一条消息仍完整可见于
  输入框上方（不被遮挡）。5) 把草稿收回到单行，
  确认间隙缩回紧凑的约 16px 预留。
- **预期**：最后一条消息紧贴输入框上方（间隙小且
  一致），而不是远在它下方；预留通过
  `--composer-dock-height` 跟随输入框的真实高度，因此更高的
  多行草稿把转录向上推而不是盖住它。跳转到最新按钮
  和缩略图在每个草稿高度下都锚定在输入框正上方。
- **关联规格**：`04-ux/08-component-spec.md`（§4.3 MainChat layout）
- **验收标准**：C（发送/UI）、质量
- **里程碑**：M2
- **状态**：Draft

#### E2E-144: 发送提示使转录保持在最新回合

- **前置条件**：聊天路由活跃；所选会话包含足够
  溢出转录视口的历史；转录位于最新
  消息处或已向上滚动。
- **步骤**：1) 从视口底部发送一个提示。2) 从首个发送
  状态起，经过持久化的用户消息事件和第一条流式行，
  观察转录。3) 用多行草稿重复，使
  草稿清除时输入框收缩；并在发送前手动
  向上滚动后再重复。
- **预期**：发送立即隐藏跳转控件，并在
  布局阶段重新钉住转录。历史行只随着
  新回合的加入向上移动；视口绝不闪到对话
  顶部，新用户回合与流式响应保持
  在底部可见。发送后的输入框收缩与指示器
  布局钳制绝不释放跟随模式（回合流式期间
  不出现“↓ Scroll to bottom”按钮，除非用户确实
  用输入设备滚动了）。
- **关联规格**：`04-ux/08-component-spec.md`（§4.3、§4.4）、
  `04-ux/09-interaction-patterns.md`（§9.1、§10.4）
- **验收标准**：C（发送/UI）、质量
- **里程碑**：M2
- **状态**：Draft

### 工作区打开

#### E2E-012: 打开一个项目目录

- **前置条件**：应用运行中；未打开任何项目。
- **步骤**：1) 通过 UI 打开项目目录。2) 选择一个本地文件夹。
- **预期**：显示项目路径；工具路径相对于项目根解析。
- **关联规格**：`03-runtime/15-workspace-ignore-rules.md`
- **验收标准**：D（打开项目、显示路径）
- **里程碑**：M3
- **状态**：Draft

#### E2E-012a: 从多个文件夹创建命名项目

- **前置条件**：应用运行中；未打开项目对话框；至少有
  两个本地文件夹可用，包括一个名称或路径较长的。
- **步骤**：
  1. 从设置 → Project archive 或侧边栏 Projects 标题
     调用 Add project，并检查空白对话框。
  2. 输入项目名称并用文件夹选择器添加两个文件夹。确认
     两行都渲染，且第一行标记为 Primary。
  3. 移除一行，检查计数，再把它加回来。
  4. 在浅色与深色主题下检查空白与已填充状态，包括
     窄窗口与减弱动态效果设置。
  5. 用 Tab 和 Shift+Tab 遍历各控件。用 Escape 关闭，然后
     重新打开并通过点击外部关闭；每次关闭后检查焦点。
  6. 重新打开，输入名称，添加文件夹，创建项目。检查
     进行中的控件，以及产生的活跃主工作区和
     一个带两个根的分组项目条目。
  7. 在该分组中启动一个会话，让代理用
     附加根的绝对路径读取一个文件；然后尝试一个无关的外部路径。
- **预期**：对话框捕获焦点，空闲时以 Escape 或外部点击
  关闭，并保持名称与所选文件夹可见且无横向
  溢出。原生选择器允许一次选择多个目录。
  移除一个文件夹会更新计数，且绝不移除另一行。在
  名称和一个文件夹都具备之前 Create 被禁用。创建时一个
  逻辑项目分组获得输入的显示名；其主文件夹
  成为活跃工作区，每个所选文件夹都保留为分组
  根。Project archive 显示一个分组行，其会话、共享
  指令和共享记忆使用该分组标识。Read/Glob/Grep/
  Write/Edit 只有在 host 规范化包含性检查之后才能使用显式
  指定的附加根；无关的外部路径仍走正常
  权限流程。
  对话框在创建进行中不可用，并在关闭后把焦点还给
  调用它的控件。该表面遵循外壳的中性灰色
  主题，最大宽度 480px，18px 令牌化圆角，共享对话框
  高度层级，以及全局紧凑字阶。标题使用对话框级
  标题字号，名称字段使用正文/输入字号，标签/元数据
  保持较小的全局字阶。头部与操作行使用共享的
  18px 对话框边距；各区块使用 16px 间距。它显示一个
  Create project 标题、一个不带重复占位文案的已填名称字段、
  一个紧凑的本地来源芯片，和一个柔和填充的 Add folder
  操作。它不添加关于记忆或多选的解释性
  文案。工作区区块保持当前的本地文件夹选择行为，
  同时对未来的远程来源保持中立。不出现外描边、区块分隔线、
  底部分隔线或虚线选择器边框。间距提供区块
  层次；长名称与路径保持容纳，滚动内容绝不
  遮住固定的操作行。两种主题都保持文本可读、键盘
  焦点可见；减弱动态效果抑制控件过渡动画。来源芯片
  是未来远程项目来源的扩展点；当前流程
  保持仅本地。
- **关联规格**：`03-runtime/01-ipc-protocol.md`（§9）、
  `04-ux/06-settings-ia.md`（Project archive）、
  `04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md`（§3.5）
- **验收标准**：C（项目创建 UI）、D（多文件夹项目设置）、
  可访问性、本地化
- **里程碑**：M3
- **状态**：源码级回归已覆盖；完整 UI 场景为 Draft

#### E2E-013: 只读工具在项目中工作

- **前置条件**：项目目录已打开。
- **步骤**：1) 让代理读取项目中的一个文件。2) 观察结果。
- **预期**：`Read` 在项目作用域内立即返回。Agent 模式下，
  代理在使用 `Glob` 或 `Grep` 之前通过 `ToolSearch` 激活它；
  Plan 从第一个请求起就保持其读取/搜索核心可用。所有结果
  保持在项目作用域内。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`
- **验收标准**：E（Read/Glob/Grep 可用）、D（工具基于项目）
- **里程碑**：M3
- **状态**：已自动化（协议冒烟：示例项目中的 Read + Glob）

### 权限允许 / 拒绝 / 超时

#### E2E-014: Write/Edit/Bash 触发权限卡片

- **前置条件**：Agent 模式；项目已打开。
- **步骤**：1) 让代理写一个文件。2) 观察权限卡片。
- **预期**：权限卡片内联出现在发起它的转录中，
  带工具名、工作区、参数预览、倒计时和允许/拒绝
  选项。它不创建遮罩或模态框，也不覆盖另一个会话。
- **关联规格**：`04-ux/03-permission-ux.md`、`03-runtime/03-tools-and-permissions.md`
- **验收标准**：E（Write/Edit/Bash 触发确认）
- **里程碑**：M3
- **状态**：Draft

#### E2E-015: 被拒绝的权限阻止执行

- **前置条件**：权限卡片已显示。
- **步骤**：1) 在权限卡片上点击拒绝。2) 观察代理响应。
- **预期**：工具未执行；代理收到被拒绝的结果；没有文件被更改。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`
- **验收标准**：E（拒绝 → 不执行）
- **里程碑**：M3
- **状态**：Draft

#### E2E-016: 被允许的权限执行工具

- **前置条件**：权限卡片已显示。
- **步骤**：1) 在权限卡片上点击允许。2) 观察代理响应与 UI。
- **预期**：工具已执行；结果返回给模型并显示在 UI 中；文件被修改。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`
- **验收标准**：E（允许 → 返回结果）
- **里程碑**：M3
- **状态**：Draft

#### E2E-017: 权限超时默认为拒绝

- **前置条件**：权限卡片已显示；用户无操作。
- **步骤**：1) 不响应权限卡片等待 120 秒。2) 观察结果。
- **预期**：超时后权限自动拒绝；工具未执行。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`
- **验收标准**：E（超时 → 拒绝）
- **里程碑**：M3
- **状态**：Draft

#### E2E-018: Plan 拒绝工作区变更与插件工具

- **前置条件**：Plan 模式活跃，选择了 Auto，且已注册一个插件代理工具。
- **步骤**：1) 让 Agent 调用 Write、Edit 和插件工具。2) 让它
  运行一个创建标记文件的 Bash 命令。3) 在选择 Ask 的情况下
  重复该 Bash 调用并检查权限卡片。
- **预期**：Write、Edit 和插件工具不可见，直接
  尝试返回 `WRITE_DISABLED_IN_PLAN`、`EDIT_DISABLED_IN_PLAN` 或
  `PLUGIN_DISABLED_IN_PLAN`；这些工具不更改任何文件。Bash
  在 Auto 下无需确认即可运行且可能产生变更；在 Ask 下它
  等待普通的权限卡片。不存在 Chat 模式的错误或命令。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`
- **验收标准**：E（Plan 策略）
- **里程碑**：M3
- **状态**：已记录文档（M6；E2E 执行待做）

#### E2E-019: 工作区外路径遵循权限模式

- **前置条件**：Agent 或 Plan 模式；项目已打开；一个可读文件
  存在于会话项目与临时根之外。
- **步骤**：1) 选择 Ask，让代理 `Read` 该外部文件，
  观察内联权限卡片。2) 拒绝一次并验证没有内容
  返回。3) 重复并允许一次；验证工具结果携带
  `root: \"external\"` 和规范化的绝对路径。4) 切换到 Auto 并
  用 `Grep` 或 `Glob` 重复；验证不出现卡片且有界结果
  返回。5) 用 Accept edits 重复；验证外部读取/搜索仍
  请求权限。
- **预期**：显式的外部路径绝不在用户做出
  决定之前硬失败。Ask 和 Accept edits 请求权限；Auto 直接
  执行。拒绝、超时或取消返回 `TOOL_DENIED` 且不执行任何操作。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`、
  `03-runtime/15-workspace-ignore-rules.md`、`04-ux/03-permission-ux.md`
- **验收标准**：E（工作区外权限策略）
- **里程碑**：M3
- **状态**：已自动化（host-core 协议/单元覆盖；桌面旅程待做）

#### E2E-019e: 有界搜索参数跨平台保持可移植

- **前置条件**：Agent 或 Plan 模式；项目已打开；host 工具目录
  在 macOS、Linux 或 Windows 上可用。
- **步骤**：1) 在延迟加载时激活 `Glob`/`Grep` 并检查其 schema。
  2) 用工作区相对的 `path`、`include`、`headLimit` 和
  `outputMode: \"filesWithMatches\"` 或 `\"count\"` 搜索，先用一个目录，
  再用一个显式文件。3) 用目录调用 `Read` 并跟随其
  结构化 Glob 建议。4) 选择平台原生 shell
  重复，不改变工具参数。
- **预期**：schema 在每个平台上暴露相同的有界
  搜索控件；`Read` 声明仅文件输入，`Glob` 声明目录输入，
  `Grep` 接受文件或目录。`filesWithMatches` 被接受为
  规范输出模式。对目录的 Read 返回 `INVALID_ARGUMENT`，带
  `suggestedTool=Glob` 和有界参数；纠正后的调用成功。搜索
  结果在项目内使用工作区相对路径，仅对
  已批准的外部位置使用绝对路径。不需要 shell 特定的路径语法，
  工作区相对路径用 `/` 作为平台分隔符，而
  POSIX 文件名中的字面反斜杠保持原样，超大结果
  保持有界。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`、
  `03-runtime/16-tool-result-limits.md`、ADR 0057、ADR 0069
- **验收标准**：E（有界跨平台搜索）
- **里程碑**：M5
- **状态**：已有单元覆盖（host-core 与 agent-runtime）；真实多平台
  协议捕获待做。Windows 上的工作区相对路径预期由
  `relative_display` 覆盖，它必须用解析器自己的拼写
  （`simple_canonicalize`）规范化工作区根——std
  `Path::canonicalize` 在那里保留 `\\\\?\\` 前缀，会静默地把
  每个标签降级为绝对路径。

#### E2E-019a: 临时目录写入不进入工作区（D114）

- **前置条件**：Agent 模式；项目已打开；会话已启动。
- **步骤**：1) 让代理产生一个临时/中间文件（例如一次性脚本）。2) 观察它写到哪里，以及是否出现权限卡片。3) 检查 `git status` 和工作面板状态。4) 删除该会话并检查 `<data_dir>/scratch/`。
- **预期**：文件落在 `<data_dir>/scratch/<sessionId>/` 下且不出现权限卡片；项目的 `git status` 保持干净；临时写入不打开任何文件或 Review 产物标签页；删除会话会移除临时目录。
- **关联规格**：`03-runtime/03-tools-and-permissions.md §4b`、`03-runtime/04-data-storage.md`
- **验收标准**：E（临时文件与工作区隔离）
- **里程碑**：M5
- **状态**：部分自动化（host-core 单元测试：双根解析、临时写入/读取、PI_SCRATCH_DIR、清扫）

#### E2E-019b: 临时目录包含性与工作区防御一致（D114）

- **前置条件**：Agent 模式；项目已打开。
- **步骤**：1) 尝试用 `..` 从临时根穿越进行 Write。2) 尝试通过在临时区内埋入的指向外部的符号链接进行 Write。3) 在 Plan 中尝试相同的 Write 调用。
- **预期**：两种逃逸都返回 `PATH_OUTSIDE_WORKSPACE`；Plan 在
  任何临时路径能使 Write 可用之前返回
  `WRITE_DISABLED_IN_PLAN`。
- **关联规格**：`03-runtime/03-tools-and-permissions.md §4b`
- **验收标准**：E（临时根不可逃逸）
- **里程碑**：M5
- **状态**：已自动化（host-core 单元测试）

#### E2E-019c: 权限模式管辖高风险审批（D115/D132）

- **前置条件**：Agent 模式；项目已打开；全局默认 `ask`。
- **步骤**：1) 用新继承的会话且全局默认为 Ask every time，打开输入框菜单——预期 Ask every time 被选中，且没有全局默认/继承标签——然后让 Agent 写一个工作区文件，预期出现权限卡片。2) 把会话芯片切换为 Accept edits；重复——预期 Write/Edit 不出现卡片，但 Bash 仍出现卡片。3) 切换到 Auto——预期 Bash 也不出现卡片。4) 在设置中把全局默认设为 Accept edits 后创建另一个继承会话——预期输入框芯片和菜单选择直接显示 Accept edits，且 Write/Edit 自动允许。5) 在 Auto 下把会话切换到 Plan，再切换到 Goal——预期 Write/Edit/插件被拒绝，但 Bash 无需确认即被允许。
- **预期**：生效模式 = 会话覆盖 → 全局默认 → ask；Plan 和 Goal 对 Write/Edit/插件的硬拒绝高于一切模式，而它们的 Bash 遵循所选模式；输入框芯片和菜单始终显示生效模式，不带默认/继承来源。
- **关联规格**：`03-runtime/03-tools-and-permissions.md §6`、`03-runtime/04-data-storage.md`、`08-meta/decisions-log.md`（D115/D132）
- **验收标准**：E（权限模式在 host 侧解析并执行）
- **里程碑**：M5
- **状态**：部分自动化（host-core 单元测试：判定矩阵、Plan 策略优先级、ask 下的会话授权；渲染器源码测试：仅生效模式的输入框选项与选择）

#### E2E-019d: Bash 工具看到用户的登录 shell 工具链（D181）

- **前置条件**：Agent 模式；项目已打开；OS 用户有一个登录 shell
  （macOS 上默认），其 profile 导出至少一个不在应用
  最小 GUI PATH 上的工具（例如 nvm/Homebrew）。
- **步骤**：1) 让代理打印 `$PATH` 并运行工具链检查，如
  `command -v node && node -v`。2) 与同一用户在全新终端中
  显示的 PATH 比较。3) 可选地临时移除 `~/.bash_profile`，
  并在一台只有 `.zshrc` 初始化工具链的机器上重复。
- **预期**：Bash 工具能解析用户自己的登录 shell
  导出的工具（nvm、pnpm、Homebrew），尽管命令通过 bash 运行；
  探测到的登录 PATH 是生效子进程 PATH 的子集（bash profile 可能
  前置/去重）。缺失或卡死的用户 shell 降级为 host PATH，
  而不使工具失败。
- **关联规格**：`03-runtime/03-tools-and-permissions.md §5`、`08-meta/decisions-log.md`（D181）、ADR 0045
- **验收标准**：E（Bash 工具中可见用户工具链）
- **里程碑**：M5
- **状态**：已自动化（host-core 单元测试：登录 PATH 探测 + 子进程 PATH 注入）

### 会话持久化

#### E2E-020: 会话在重启后存活

- **前置条件**：存在带消息历史的会话。
- **步骤**：1) 退出应用。2) 重新启动。3) 打开会话列表。
- **预期**：先前的会话出现；消息可恢复。
- **关联规格**：`03-runtime/04-data-storage.md`、`03-runtime/10-session-state-machine.md`
- **验收标准**：F（会话在重启后存活）
- **里程碑**：M2
- **状态**：已自动化（协议冒烟：host 级持久化；完整重启通道为手动）

#### E2E-021: 删除会话生效

- **前置条件**：会话存在。
- **步骤**：1) 删除一个会话。2) 观察会话列表。
- **预期**：会话从列表中移除；数据消失。
- **关联规格**：`03-runtime/04-data-storage.md`
- **验收标准**：F（删除会话）
- **里程碑**：M2
- **状态**：Draft

#### E2E-021a: 重命名会话标题持久化且不改变活动状态

- **前置条件**：存在一个项目作用域会话和一个无路径会话；
  至少一个会话有转录历史，且一个仍是默认
  标题。
- **步骤**：1) 打开侧边栏会话溢出菜单，或右键会话
  行并选择 Rename。2) 输入一个带首尾空白的标题并
  保存。3) 在侧边栏、顶栏、Project archive 和
  Search 中验证该标题。4) 重启应用并再次验证标题。5) 尝试空的
  和超过 80 个 Unicode 码位的标题。6) 在
  默认标题会话中发送第一个提示。
- **预期**：保存的标题被去除首尾空白，显示在当前的每一个
  会话摘要表面上，并在重启后持久化。会话保持
  在同一项目或 Temporary 分组，其转录/消息数与
  最近活动排序不变，历史通知标题
  快照也不变。空值与超长值被拒绝。自定义
  标题不被首个提示的自动标题替换；仍是默认标题的会话
  继续获得自动标题。在其首个回合之后，默认
  会话先显示提示回退标题，然后在 provider 返回时
  采用简洁的后台 LLM 摘要。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/04-data-storage.md`、`03-runtime/06-host-rpc-protocol.md`、
  `04-ux/01-ui-ia.md`、`04-ux/08-component-spec.md`、ADR 0143
- **验收标准**：F（会话元数据持久化）、质量（本地化任务
  管理）
- **里程碑**：M2
- **状态**：Draft（仅在此表面变更时、于具备能力的环境中运行）

#### E2E-021b: 开发者模式复制会话 id 并打开会话临时目录

- **前置条件**：开发者模式已启用。存在一个会话，包括一个
  临时目录尚未创建的会话。
- **步骤**：1) 打开一个对话溢出菜单。2) 确认 Copy conversation
  ID 和 Open session path 出现在 Create branch 之后、Delete 之前，
  且 Copy session path 不存在。3) 选择 Copy conversation ID 并粘贴
  剪贴板。4) 选择 Open session path。5) 禁用开发者模式并
  重新打开该菜单。
- **预期**：剪贴板包含精确的会话 id。系统文件
  管理器打开 `<data_dir>/scratch/<sessionId>/`，若该目录
  缺失则创建它。渲染进程不发送文件系统路径；Main 只
  为该会话 id 打开解析出的临时目录。开发者模式
  关闭时两个操作都不存在。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `04-ux/08-component-spec.md`、`04-ux/06-settings-ia.md`
- **验收标准**：C（会话）、质量（开发者工具）
- **里程碑**：M2
- **状态**：已有单元覆盖（`session-scratch-path.test.mjs`）；桌面旅程
  Draft（仅在此表面变更时、于具备能力的环境中运行）

#### E2E-036: 本地化的导入分组初始为折叠

- **前置条件**：受支持的本地代理存储包含跨至少两个项目路径和两个来源的可导入会话，包括一个没有项目路径的会话；应用可以分别以英文系统语言环境和简体中文系统语言环境各启动一次。
- **步骤**：1) 以英文启动并打开设置 → Import。2) 扫描会话。3) 检查初始的来源分组。4) 展开一个分组并选择一个会话。5) 把 Group by 改为 Project path。6) 切回 Source。7) 在以简体中文系统语言环境启动后重复该流程。
- **预期**：Source/来源是初始分组；扫描后以及任一分组方式变更后所有分组都是折叠的；项目路径模式显示精确的项目路径，以及末尾的 No project/未关联项目分组；展开一个分组时其他分组保持折叠；所选会话在分组方式变化间保持选中；计数、日期、选择标签、可访问名称和导入结果都使用当前语言环境，没有原始键或未解析的双大括号占位符。超过扫描阈值的 Codex 归档在审阅时其未知消息数可以显示为破折号，但它仍可选择，且后续导入会转换完整转录。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/02-i18n-english-first.md`、`04-ux/08-component-spec.md`
- **验收标准**：F（会话导入审阅）
- **里程碑**：M2
- **状态**：Draft

#### E2E-037: 导入创建持久的项目条目

- **前置条件**：导入候选包含路径 A 的两个会话、路径 B 的一个会话，以及一个没有项目路径的会话；两个项目都不是活跃工作区。
- **步骤**：1) 导入所有候选。2) 打开设置 → Project archive。3) 检查并展开路径 A 和 B。4) 回到首页并检查 Temporary sessions。5) 重复导入。
- **预期**：Project archive 中 A 和 B 各恰好有一个持久行；匹配的已导入会话出现在其精确项目行下；无路径会话只出现在 Temporary sessions 下；活跃工作区不变；重复导入既不复制会话也不复制项目行；不在磁盘上创建缺失的文件系统路径。
- **关联规格**：`03-runtime/04-data-storage.md`、`04-ux/01-ui-ia.md`、`04-ux/08-component-spec.md`
- **验收标准**：F（会话/项目持久化）
- **里程碑**：M2
- **状态**：Draft
#### E2E-038：设置承载项目归档目的地

- **前置条件**：应用已运行，至少配置了一个 provider、一个受支持的本地会话存储、一个已保留的项目和一个已归档的项目。
- **步骤**：1）打开设置。2）查看完整的设置导航栏。3）打开 Basics，在其 Appearance 卡片中使用可搜索的主题选择器更改主题。4）打开 全局 AI，查看 Permissions 和 Defaults 卡片，包括 Command shell 行；确认 Context management 没有设置卡片。5）打开 Shortcuts，查看 Keyboard shortcuts 卡片。6）打开 Instructions 并保存全局指令。7）打开 Model configuration，查看 provider 工作台。8）依次打开 Import、Project archive 和 Info。9）在设置中搜索 "project" 或 "archive"。10）在 Project archive 中，将每个分组条的计数与其渲染的行进行对比。11）将排序控件从 Recent 切换为 Name。12）搜索一个已知的会话标题，确认其所属项目被选中且检查器列出匹配的会话，然后展示超过八个会话；用清除控件清除搜索。13）打开检查器菜单，分别用 Escape 和点击外部将其关闭。14）恢复已归档的项目，然后激活它。15）返回应用外壳并打开 Plugins。
- **预期结果**：导航栏恰好依次包含 Basics、全局 AI/AI、Shortcuts、Instructions、Model configuration、Import、Project archive 和 Info，各自带有语义化的 Lucide 图标（Sliders / Sparkles / Keyboard / FileText / Bot / Download / Archive / Info）。平面目录在四个柔和、不可交互的分组标题下进行视觉分组——Basics、AI 和 Shortcuts 归为 Personal / 个人；Instructions 和 Model configuration 归为 Agent / 智能体；Import 和 Project archive 归为 Workspace / 工作区；Info 归为 About / 关于——分组之间以留白分隔、无分割线；搜索时目标结果保持扁平，并连同其标题一起隐藏空分组。Appearance 仍位于 Basics，而 Permissions、Defaults 和 Command shell 行位于 全局 AI 之下；可用的已选中 shell 由选择器表示，不再有重复的 Configured 状态，而 default、fallback 和无生效 shell 的状态保持显式；Context management 没有设置卡片；Keyboard shortcuts 和全局指令各有独立的目的地；Developer 位于 Info 之下；Project archive 展示活跃、已关闭和已归档的持久行，且无可见性开关，将它们归入始终可见的 Pinned / All projects / Archived 分组条（D168/D267/D455），在单列工作台中显示各分区的计数。该目的地不渲染 hero 块，也不渲染页面级计数行：简介只有一行安静的描述文字，且每个分组条的计数与其渲染的行一致；点击某行会在不离开设置的情况下选中该行；按 Name 排序会在每个分区内重排行而不隐藏任何行；搜索匹配项目字段和会话标题并报告匹配数；会话标题结果会选中其所属项目，在检查器中按最近活动列出会话并显示相对更新时间，并以每批八个的方式展示历史；清除搜索会恢复完整索引。检查器菜单可通过 Escape 和点击外部关闭。引导完成和后台刷新不会让设置或扩展返回聊天主页；只有在显式导航操作后目的地才会改变。Restore 保持归档页打开，激活则带着已恢复的项目返回聊天，且该项目保留在侧边栏中；主页侧边栏和全局页面结果中没有独立的 Projects 目的地；设置搜索能找到 Project archive；Plugins 仍是独立的应用外壳目的地。
- **关联规格**：`04-ux/06-settings-ia.md`、`04-ux/01-ui-ia.md`、`03-runtime/11-provider-model-system.md`
- **验收**：B（模型配置）、F（会话导入）
- **里程碑**：M4
- **状态**：单元测试已覆盖（`settings-project-archive.test.mjs`、`project-archive.test.mjs`、`sidebar-navigation.test.mjs`）；渲染场景为 Draft

#### E2E-091：Appearance 卡片提供可搜索的主题和语言选择器

- **前置条件**：应用运行于 macOS；测试装置可覆盖英语、
  简体中文、繁体中文、土耳其语、德语、西班牙语、法语
  和韩语的系统区域设置。
- **步骤**：
  1）打开 Settings → General。
  2）在 Appearance 卡片中打开 Theme 选择器。确认 System、Light 和
     Dark 固定在顶部；选择 Dark，确认触发器显示 Dark
     且 UI 切换为深色。
  3）选择 Light，确认 UI 切换为浅色。
  4）在 Language 行中打开可搜索的选择器。确认 Auto 固定
     在顶部并显示检测到的本地名称，且 English、简体中文、
     繁體中文、Türkçe、Deutsch、Español、Français 和 한국어 均以本地名称列出。当操作系统区域设置为简体中文时，
     选择 Auto 会应用简体中文；
     当选择繁体中文时，Auto 会应用繁体中文。
  5）依次选择 English、简体中文、繁體中文、Türkçe、Deutsch、Español、Français
     和 한국어，确认外壳界面无需重载即可切换到各区域语言。
     确认 `zh-Hant` 和 `zh-HK` 解析为繁體中文，`de-DE` 解析为
     Deutsch，`es-MX` 解析为 Español，`fr-CA` 解析为 Français，`ko-KR` 解析为 한국어。
  6）在语言搜索框中输入本地名称或英文名称，确认
     不匹配的区域选项消失。在主题搜索框中输入主题名称，
     确认不匹配的选项消失。
- **预期结果**：Theme 和 Language 是可搜索的选择器行（不是卡片网格，
  也不是原生 select）；每个关闭状态的触发器按当前标签的尺寸显示，
  受设置控件列宽上限约束，不会溢出行。Theme 列出 System、Light 和 Dark，
  然后是分隔线之后的任何插件主题。Auto 通过
  主进程（`app.getLocale()`）解析操作系统区域设置，经由沙箱化的
  preload 桥安全传递，并在菜单中内联显示检测到的本地名称；
  zh-TW、土耳其语、德语、西班牙语、法语和韩语均为完整的外壳
  文案目录，包括发布说明文案；切换选项会即时更新实时 UI，
  无需重载。
- **关联规格**：`04-ux/06-settings-ia.md`、`04-ux/02-i18n-english-first.md`
- **验收**：A（核心外壳）、H（本地化）
- **里程碑**：M4
- **状态**：已记录

#### E2E-091a：主题切换保持 Windows 无边框窗口背景一致

- **前置条件**：应用以窗口模式运行于 Windows，操作系统处于浅色模式。
- **步骤**：1）在 Settings → General → Appearance 中选择 Dark。2）在外壳稳定过程中以及折叠/展开侧边栏时，检查左下、右下角和缩放宽边缘。3）选择 Light 并重复。4）切换操作系统颜色偏好并选择 System；待应用解析出系统主题后重复。
- **预期结果**：原生 BrowserWindow 背景跟随解析后的应用主题（深色为 `#181818`，浅色为 `#ffffff`），因此在主题切换或外壳动画期间，无边框渲染区域周围不会出现白色条带。macOS 的透明 vibrancy 行为保持不变。
- **关联规格**：`04-ux/06-settings-ia.md`、`02-architecture/01-architecture.md`
- **验收**：A（核心外壳）
- **里程碑**：M5
- **状态**：已记录；原生 Windows 验证待完成

#### E2E-SETTINGS-ai-tab-pickers-use-in-app-menus

- **前置条件**：应用已运行，宿主报告至少一个已配置的命令 shell，以及至少一个在此平台上不可用的目录 shell。
- **步骤**：1）打开 Settings → General，打开 Theme 和 Language 选择器；注意其药丸形触发器和打开的浮层。2）打开 全局 AI。3）打开 Permissions 卡片的权限模式控件，依次选择 ask、accept-edits 和 auto。4）打开 Defaults 卡片的 Command shell 控件；查看不可用条目并选择一个可用的 shell。5）分别用 Escape 和点击外部关闭每个打开的菜单。6）关闭设置，重新打开，并读取这两行。
- **预期结果**：两行都打开与 Appearance 选择器相同的锚定菜单浮层——应用自绘的框架，带有共享的圆角、elevation、边框和主题令牌，当前选项带勾选标记，并有悬停/键盘高亮——而绝不使用平台绘制的 `<select>` 弹窗。关闭状态的触发器按当前标签的尺寸显示，受设置控件列宽上限约束。不可用的 shell 保持列出并带其后缀，不可选择，也不能成为当前值。Escape 和点击外部会关闭菜单并将焦点恢复到触发器；方向键在可选项之间循环移动。所选的权限模式和命令 shell 在关闭并重新打开设置后仍然保持，且所选 shell 仍是唯一的已配置状态指示。
- **关联规格**：`04-ux/06-settings-ia.md`、`04-ux/09-interaction-patterns.md`
- **验收**：A（核心外壳）
- **里程碑**：M4
- **状态**：已记录

#### E2E-039：设置标题栏拖拽可移动窗口

- **前置条件**：应用以窗口模式运行于 macOS，设置已打开。
- **步骤**：1）记录窗口位置。2）拖拽设置导航栏上方的 46px 空白条带。3）拖拽内容窗格上方的同一区域。4）使用返回、搜索、Project archive 和导航控件。5）在浅色和深色主题下，分别采样导航栏上方和内容窗格上方顶行的颜色。
- **预期结果**：任一顶部条带的拖拽都会移动原生窗口；返回、搜索和导航保持可交互，且绝不会触发窗口拖拽。导航栏上方的顶行与导航栏表面一致（浅色 `#f4f4f4` / 深色 `#000`），内容窗格上方的顶行与主表面一致，因此该条带绝不会在导航栏上方渲染出不匹配的颜色。
- **关联规格**：`04-ux/06-settings-ia.md`、`04-ux/01-ui-ia.md`
- **验收**：质量（关键操作体验精致）
- **里程碑**：M5
- **状态**：Draft

#### E2E-043：设置内容跟随窗口宽度

- **前置条件**：应用以窗口模式运行于 macOS，设置已打开。
- **步骤**：1）在默认窗口宽度下打开 Basics，记录内容卡片宽度。2）将窗口扩展到 1600px 宽。3）打开 Model configuration、Import 和 Project archive。4）将窗口缩小到受支持的 1040px 最小宽度。
- **预期结果**：在每个测试宽度下，右侧内容卡片随可用窗格扩展和收缩；275px 导航栏和窗格边距保持稳定；控件保持可见，无裁切，无横向页面滚动。
- **关联规格**：`04-ux/06-settings-ia.md`、`04-ux/07-ui-design-system.md`
- **验收**：质量（关键操作体验精致）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`settings-responsive-layout.test.mjs`）；场景已记录

#### E2E-040：Codex 风格的工具活动在转录重载后保持
- **前置条件**：provider 已配置；项目已打开；会话可运行一个
  成功的工具和一个失败或被中止的工具。
- **步骤**：1）运行有代表性的 read、search、edit 和 command 工具。2）
  在轮次进行中，查看最新的处理分组及其最新的
  工具/思考行。3）确认分组标题保留其本地化的
  处理标签、已用时间和步骤计数，而实时活动
  保留在行内或专用的运行状态指示中。4）等待完成并查看
  已稳定的转录。5）
  手动展开一个已完成的分组和行，然后复制其输出。6）在
  后续轮次流式输出时，手动折叠其活跃分组，并验证
  新的流更新不会重新展开它。7）点击某展开行旁的
  竖线，然后用键盘聚焦并激活处理分组的
  竖线。8）重载会话并展开恢复后的分组。
- **预期结果**：最新的活跃分组自动打开，使过程列表
  可见，但工具调用详情（包括失败工具的详情）保持
  折叠。最新的思考步骤
  在流式输出时自动展开；更早的分组和行保持折叠。
  标题显示其本地化的处理标签、已用时间和步骤计数，
  不附带额外的状态胶囊。当轮次稳定时，自动的
  思考折叠区会关闭，而被用户触碰过的分组或行保持
  其选择的状态。用户展开的工具调用保持其详情标题和
  内容与工具行对齐，而不是引入额外的水平
  缩进；折叠栏在正文旁保持可用。展开的调用使用
  透明的语义化活动行，带动作图标、自然语言动词、
  等宽字体的主要参数和安静的折叠控件。处理分组使用
  完整的助手列宽度，因此短标签或短负载不会把
  展开的详情收缩成内容尺寸的碎片。每个展开内容的竖线
  都是其所属折叠区的指针及键盘可聚焦折叠控件。
  嵌套展开在限高的滚动区域中先显示输出、后显示原始输入。实时
  部分输出就地更新。重载后的行保留工具名称、
  参数、结果和状态。
- **关联规格**：`04-ux/01-ui-ia.md`、
  `04-ux/07-ui-design-system.md`、`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`
- **验收**：C（聊天流）、E（工具）、F（持久化）
- **里程碑**：M3
- **状态**：Draft

#### E2E-041：会话缩略地图导航长转录

- **前置条件**：一个会话包含足够多的用户和助手轮次，
  可滚动超出一个视口并密集填充缩略地图，其中包括一次
  围绕工具活动以多个助手片段发出的 AI 回复；另
  一个会话有至少两个符合条件的轮次标记，但仍
  可容纳在一个视口内。
- **步骤**：1）打开长会话。2）滚动浏览转录并
  观察活跃的缩略地图标记。3）悬停某个标记并查看其预览。
  4）用键盘焦点到达另一个标记。5）激活某个标记。6）打开
  符合条件轮次标记少于两个的会话。7）打开
  仍能容纳在一个视口内的多消息会话。8）将长会话
  窗口调高直到内容不再溢出，然后再调矮。9）在
  较矮的窗口高度下，查看并激活靠近缩略地图
  垂直边界的第一个和最后一个标记，包括从标题栏一侧。
- **预期结果**：导航栏为每个可见的用户轮次和每次
  AI 回复各包含一个标记。两条用户消息之间的多个助手
  片段共享单个标记和合并的限高预览，而仅含工具的行
  不创建标记，也不拆分回复。靠近上三分之一阅读
  锚点的标记暴露 `aria-current`；悬停和聚焦显示相同的本地化发送者
  和预览；附近的标记水平放大而不移动堆栈；
  激活会平滑滚动到该回复中第一条有内容的消息；
  当符合条件的标记少于两个**或**内容不溢出
  一个视口时，导航栏不显示；调整大小后一旦恢复溢出，
  导航栏会重新出现。密集的标记保持在 46px 标题栏与停靠
  输入框之间无遮挡的跨度内居中，均匀压缩，
  且保持可交互而不进入原生窗口拖拽区域。
  空主页和停靠输入框使用相同的水平宽度包络，
  缩略地图出现时输入框不会收缩。
- **关联规格**：`04-ux/08-component-spec.md`
- **验收**：C（聊天流）、质量（键盘与长线程导航）
- **里程碑**：M3
- **状态**：Draft

#### E2E-042：v7 之前的存储通过破坏性重置归档；转录存于会话文件

- **前置条件**：一个夹具数据目录包含一个 `pi.sqlite`，其
  `PRAGMA user_version` 在 1 到 6 之间（D119 之前的内容存于数据库的 schema），
  并带有有代表性的数据行。
- **步骤**：1）针对该夹具启动 host-core。2）创建一个会话并
  通过 host RPC 追加消息。3）停止并重启 host-core。4）通过
  RPC 重载该会话并检查数据目录。
- **预期结果**：host-core 将旧文件重命名为恰好一个
  `pi.sqlite.v6.bak`，引导一个全新的 schema-v7 数据库（仅索引
  `messages`），写入 `sessions/<id>.jsonl`（一行会话头加
  每条消息一行），重启后从文件重载转录
  且逻辑结果一致，删除会话会同时移除
  索引行和会话文件。任何 Electron 持有的持久化文件都不是
  权威来源。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、ADR 0014
- **验收**：F（持久化）、H（重置失败可诊断）
- **里程碑**：M2
- **状态**：单元测试已覆盖（`db::tests::archives_pre_v7_database_and_starts_fresh`、
  `sessions::tests::transcript_survives_reopen_from_file`、
  `sessions::tests::delete_session_removes_transcript_files`）；完整夹具
  场景为 Draft

#### E2E-252：会话和文件夹跨项目拖放

- **前置条件**：侧边栏打开了两个项目；其中一个持有一个空闲
  会话，且某处有一个会话正在运行一个轮次。
- **步骤**：1）将空闲会话行拖到另一个项目分组上并放下。
  2）重新打开该会话并读取其转录。3）尝试拖动
  正在运行的会话，并单独打开其会话菜单。4）将一个文件夹
  放到项目列表上。5）将一个文件夹放到输入框上。
- **预期结果**：被拖动的空闲会话列在目标项目下，其
  转录、附件和任务保持不变，且移动在重启后依然保留，
  因为会话的项目归属已被持久化。正在运行的会话
  不可拖动，其上下文菜单没有项目移动列表，在
  轮次开始后发出的移动请求会作为 busy 被拒绝，而不是重新绑定 agent。
  将文件夹放到项目列表上会添加或切换到该项目，
  而不会创建重复行；非文件夹的放下会解释需要
  文件夹。将文件夹放到输入框上会提供显式选择，
  且绝不附加目录内容："Open as project" 打开项目，
  "Reference folder" 插入字面路径。被拖动的行以降低的
  不透明度绘制，符合条件的分组显示强调色轮廓。
- **关联规格**：`04-ux/09-interaction-patterns.md` §8、
  `03-runtime/06-host-rpc-protocol.md`（session.moveProject）
- **验收**：D（项目归属与工作区切换）、质量
  （拖放反馈与键盘替代）
- **里程碑**：M5
- **状态**：已记录；源代码契约已覆盖
  （`session-project-move.test.mjs`）；自动化待完成

### 插件加载 / 命令 / 禁用

#### E2E-022：加载本地插件

- **前置条件**：应用已运行；本地路径有可用示例插件。
- **步骤**：1）从侧边栏底部的 Plugins 图标打开 Extensions。2）从头部溢出菜单中选择 Load local plugin。3）用行开关启用它。
- **预期结果**：插件加载；manifest 校验通过；贡献已注册；该行出现在 Active 下并带 Local 标签。
- **关联规格**：`07-plugins/01-plugin-system.md`、`07-plugins/05-plugin-lifecycle.md`
- **验收**：G（加载本地插件）
- **里程碑**：M4
- **状态**：已自动化（协议冒烟：plugins.loadDev）

#### E2E-022A：从模板创建插件

- **前置条件**：应用已运行；有一个可用的空文件夹。
- **步骤**：1）打开 Extensions。2）在头部溢出菜单中选择 New plugin from template（或使用空状态按钮）。3）依次选取四个模板中的每一个并阅读其描述。4）选择文件夹。5）在第二次尝试时取消文件夹选择器。
- **预期结果**：选择器恰好列出 `panel-basic`、`agent-tool-basic`、`skill-pack`、`full-demo`，每个均以当前语言命名和描述；选择文件夹会写入模板文件，将插件作为开发插件加载，刷新列表，然后将该文件夹作为活跃项目打开——应用落在聊天页，以新文件夹为工作区，它出现在侧边栏项目列表中，toast 显示 "<name> created, loaded, and opened for development"；插件的贡献立即可用，且内置的插件开发 skill 在新工作区中处于活跃状态。该 skill 教授当前的全局 `pi` API（`onLoad()` 加 `pi.commands.register`）和固定的 `window.pluginBridge` 边界，不教授已废弃的 `onLoad(pi)` / `pi.registerCommand` 形式。取消文件夹选择器不改变任何内容，也不报告错误。
- **关联规格**：`07-plugins/10-plugin-devex.md`、`../../plugin-development.md`、ADR 0039
- **验收**：G（从模板创建插件）
- **里程碑**：Post-MVP
- **状态**：部分自动化（`apps/desktop/test/plugin-template-action.test.mjs`：通道、模板 id 与 devkit 的一致性、语言覆盖、取消选择的顺序、项目激活）；UI 走查已记录

#### E2E-022B：开发插件热重载

- **前置条件**：一个从本地文件夹加载并已启用的插件。
- **步骤**：1）编辑 `main.js` 更改命令标题并保存。2）一次保存多个文件。3）引入一个语法错误并保存。4）修复错误并保存。5）在 `manifest.json` 中新增一项权限并保存。6）打开开发插件卡片的 More actions 菜单并选择 Reload。7）再次编辑并重启应用。
- **预期结果**：单次编辑会重载插件而无需重新选择文件夹，命令面板显示新标题；一次保存批量只产生一次重载，而 `dist/` 或 `node_modules/` 下的写入不产生重载；语法错误会报告重载失败而不使应用崩溃，修复后的保存会恢复插件；新增权限会以 `PERMISSION_DENIED` 拒绝自动重载，而显式 Reload 操作会加载已注册的文件夹、刷新权限上限并报告成功；之后的编辑使用刷新后的上限，重启后该文件夹仍被监视。
- **关联规格**：`07-plugins/10-plugin-devex.md` §7、`07-plugins/13-plugin-permissions-matrix.md`、ADR 0039、ADR 0075
- **验收**：G（热重载）、D（权限不能在未经审查的情况下扩大）
- **里程碑**：Post-MVP
- **状态**：部分自动化（`apps/desktop/test/plugin-hot-reload.test.mjs`：防抖、忽略列表、权限上限、恢复、拆卸）；手动编辑循环已记录

#### E2E-022C：检查、打包、安装闭环

- **前置条件**：一个已脚手架化的插件目录。
- **步骤**：1）`pnpm pi-plugin check <dir>`。2）删除 `main` 指定的文件并再次运行 `check`。3）恢复该文件，声明 `contributes.skills` 而不带 `agent.prompt.inject`，再次运行 `check`。4）`pnpm pi-plugin pack <dir>`。5）从插件页面安装生成的 `.piplug`。6）让 agent 对同一目录运行 `PluginCheck` 和 `PluginPack`。
- **预期结果**：已脚手架化的插件检查通过，并报告其文件数和大小；缺失的 `main` 是阻断 `pack` 的错误；无效 skills 的情况是警告且不阻断；`pack` 写入 `dist/<id>-<version>.piplug`，仅含 store 条目，并打印其 sha256；该包通过正常的权限审查安装并出现在 Active 下；agent 工具给出相同的判定，并拒绝会话工作区之外的任何目录。
- **关联规格**：`07-plugins/10-plugin-devex.md` §5–§6、`07-plugins/06-plugin-packaging.md`、ADR 0039
- **验收**：G（本地打包闭环）
- **里程碑**：Post-MVP
- **状态**：部分自动化（`packages/plugin-devkit` vitest：每个模板的 scaffold→check→pack、store 方法头、每条检查规则）；安装步骤已记录

#### E2E-023：插件命令出现在全局搜索中并可执行

- **前置条件**：插件已加载并启用。
- **步骤**：1）打开全局搜索（Cmd/Ctrl+K 或 Cmd/Ctrl+Shift+P）。2）在 Commands 分区找到插件命令。3）执行。
- **预期结果**：命令出现在全局搜索结果中；执行产生预期结果。
- **关联规格**：`07-plugins/09-plugin-command-palette.md`
- **验收**：G（插件命令出现并执行）
- **里程碑**：M4
- **状态**：Draft

#### E2E-024：插件注册并调用 agent 工具

- **前置条件**：插件已加载；插件声明了一个 agent 工具。
- **步骤**：1）让 agent 使用该插件的工具。2）如有需要，观察权限卡片。3）允许。
- **预期结果**：工具以强制前缀注册（`plugin_<id>_<name>`）；调用成功。
- **关联规格**：`07-plugins/03-plugin-api.md`、`07-plugins/13-plugin-permissions-matrix.md`
- **验收**：G（插件 agent 工具）
- **里程碑**：M4
- **状态**：已自动化（协议冒烟：host->runner->host 分发往返；通过 PluginRuntime 进行应用内 JS 执行）

#### E2E-024G：市场详情页显示 README、权限和版本

- **前置条件**：官方市场目录可用。
- **步骤**：1）打开 Extensions → Marketplace。2）打开 `demo.workspace-summary` 的详情。3）查看 README / 按风险分组的权限 / 版本行。4）选择一个版本并在权限审查后安装。5）用 Escape 和点击遮罩关闭详情页。
- **预期结果**：详情页通过 `market.getDetail` 加载；README、安全说明和按风险划分的权限解释正常渲染；所选版本驱动吸底的安装操作；Escape 和遮罩都会关闭详情页，而不关闭其下方的权限对话框。
- **关联规格**：`07-plugins/07-plugin-marketplace.md`
- **验收**：G（市场详情 UX）
- **状态**：已记录

#### E2E-024F：刷新官方远程市场仓库

- **前置条件**：可访问 GitHub 原始内容的网络。
- **步骤**：1）打开 Extensions → Marketplace。2）使用头部的 Refresh marketplace 操作。3）确认来源行指向 `vastsa/pi-desktop-plugins`。
- **预期结果**：目录从远程官方仓库刷新；卡片网格更新；获取失败时离线回退仍然有效。
- **关联规格**：`07-plugins/07-plugin-marketplace.md`
- **验收**：G（远程市场来源）
- **状态**：已记录 / host-core 单元测试已覆盖

#### E2E-024P：切换市场目录来源

- **前置条件**：可访问 `plugins.aiuo.net`、`raw.githubusercontent.com` 和 `cnb.cool` 的网络。
- **步骤**：1）在干净配置文件中打开 Extensions → Marketplace，确认来源行显示 Official channel。2）依次切换到 GitHub backup、CNB backup、带 URL 的 Custom，然后切回 Official channel。3）每次切换后，确认目录在同一界面中刷新。4）从官方渠道安装一个插件，再从 CNB backup 安装一个。5）选择 Custom URL 并使用空值。
- **预期结果**：全新配置文件默认打开官方渠道，其目录来自 `plugins.aiuo.net/catalog.json`；四个选项按顺序标注为 Official channel / GitHub backup / CNB backup / Custom；切换会触发刷新并报告新的插件数量；来源选择器仍是唯一的来源状态控件，没有多余的 provider 解释或活跃来源状态行；官方安装通过平台解析，而 CNB 安装从镜像下载并通过与之前相同的 shasum 校验，因此两条备份路径保持不变；切回某个来源会复用其缓存快照而不是删除它，且绝不往返网络；安装记录注明插件来自哪个渠道；选择空值的 Custom URL 会回退到官方默认值，而不是空端点。
- **关联规格**：`07-plugins/07-plugin-marketplace.md` §2
- **验收**：G（远程市场来源）
- **状态**：已记录 / host-core 单元测试已覆盖

#### E2E-024Z：Windows 本地化 curl 诊断保持可读

- **前置条件**：Windows x64 宿主。官方目录请求被强制
  失败并返回本地化的非 UTF-8 curl/Schannel 诊断信息
  （测试 PATH 中的一个确定性伪 curl 可输出 GBK 编码的
  stderr 并以 35 退出）。
- **步骤**：1）选择 Extensions → Marketplace，以 GitHub（官方）为
  来源。2）刷新市场。3）查看错误 toast。4）切换到
  CNB 镜像并再次刷新。
- **预期结果**：失败的请求仍是 `PLUGIN_NETWORK` 失败，
  并保留可读的本地化诊断信息，不含 Unicode 替换
  字符；切换到镜像后可以正常刷新目录。
- **关联规格**：`07-plugins/07-plugin-marketplace.md`、
  `03-runtime/07-process-model.md`
- **验收**：G（远程市场来源）
- **状态**：已记录 / host-core 单元测试已覆盖；Windows 渲染验证待完成

#### E2E-024B：带权限审查的市场安装

- **前置条件**：应用已运行；官方市场目录可用。
- **步骤**：1）打开 Extensions → Marketplace。2）安装 `demo.workspace-notes`。3）阅读按风险分级的权限对话框。4）接受高风险权限。
- **预期结果**：在任何下载之前，权限按 High / Medium / Low 分组并附通俗解释；宿主在下载前立即刷新市场元数据，因此过期的 UI 缓存不会把旧校验和与当前包配对；插件从市场包安装，校验和已验证，权限已授予，面板/工具可用；已安装标签页和按风险分组的行反映新插件，无需单独的概览卡片行。
- **关联规格**：`07-plugins/07-plugin-marketplace.md`、`07-plugins/13-plugin-permissions-matrix.md`
- **验收**：G（市场安装 + 权限审查）
- **状态**：已记录 / host-core 由单元测试 + 协议方法覆盖

#### E2E-024R：从未变更的分发来源安装中心发布的插件

- **前置条件**：一个从分发仓库提供的 `schemaVersion: 2` 目录，其中一个插件带有来源信息和已批准的审查结论，其包位于 `packages/` 下。第二个夹具声明了 `artifactBaseUrl`，用于镜像/企业场景。
- **步骤**：1）保持市场来源为默认。2）打开某插件的详情页。3）阅读 Source 分区。4）安装所选版本。5）切换到 CNB 镜像并重复安装。6）对声明了 base 的夹具重复。
- **预期结果**：查看中心发布的插件不需要更改设置或更新客户端，因为目录 URL 未变；相对的包 URL 基于目录所在路径解析，因此 GitHub 从 `raw.githubusercontent.com` 提供，镜像从 `cnb.cool` 提供，校验和相同；存在声明的 `artifactBaseUrl` 时优先采用；详情页在安装前显示来源仓库、commit 和构建者；安装记录保留发布者、信任层级和来源锁定。
- **关联规格**：`07-plugins/07-plugin-marketplace.md`、`07-plugins/15-plugin-center.md`
- **验收**：G（发布者自有来源分发）
- **状态**：已记录 / host-core 由单元测试覆盖

#### E2E-024S：包宿主白名单拒绝不受信任的下载

- **前置条件**：一个目录夹具，其版本 URL 指向白名单之外的宿主，另加一个内嵌凭据的和一个使用纯 HTTP 的。
- **步骤**：1）刷新市场。2）查看插件卡片和详情页。3）尝试安装。4）用包位于其自身宿主上的私有目录重复。
- **预期结果**：对于白名单外的 URL，该行不提供安装操作；尝试安装会在任何请求离开本机之前以 `PLUGIN_MARKET_UNTRUSTED_HOST` 失败，并指明被拒绝的宿主；带凭据的 URL 和非 loopback 的纯 HTTP 以同样方式被拒绝；私有目录仍可从提供它的宿主提供包，而不为第三方宿主扩大白名单。
- **关联规格**：`07-plugins/07-plugin-marketplace.md`、`07-plugins/04-plugin-security.md`
- **验收**：G（市场下载边界）
- **状态**：已记录 / host-core 由单元测试覆盖

#### E2E-024T：已撤下的版本不被提供、不被安装、也不被隐藏

- **前置条件**：一个目录，其最新版本被标记为 `yanked` 并带原因，一个较旧版本处于在线状态，且被撤下的版本已在本地安装。
- **步骤**：1）打开该插件的详情页。2）查看版本历史。3）选择被撤下的版本。4）运行 Check for updates。5）运行 Apply automatic updates。6）查看已安装行。
- **预期结果**：所提供的最新版本是最新的非 yanked 版本；被撤下的版本保留在历史中，带其原因和删除线版本号；选择它会禁用安装操作并显示已撤下文案，而不是尚未发布文案；显式安装它会以 `PLUGIN_MARKET_YANKED` 和原因失败；当最新在线版本不比已安装版本新时不提供更新，因此降级绝不会被呈现为更新；已安装行被标记为需要注意，插件继续运行。
- **关联规格**：`07-plugins/08-plugin-signing-updates.md`
- **验收**：G（事件响应传导）
- **状态**：已记录 / host-core 由单元测试覆盖

#### E2E-024U：信任层级和宿主版本约束由客户端执行

- **前置条件**：一个声称 `trust: "verified"` 的自定义来源目录、一个带无法识别层级的目录，以及一个 `minPiDesktop` 高于当前运行宿主的版本。
- **步骤**：1）将市场指向自定义来源。2）查看卡片和详情页徽标。3）尝试安装锁定到更新宿主的版本。4）用范围表达式而非版本号的 `minPiDesktop` 重复。
- **预期结果**：来自非官方来源的 `verified` 声称渲染为 community 且无盾牌；无法识别的层级渲染为 unknown；需要更新宿主的版本不被提供，显式安装会以 `PLUGIN_HOST_TOO_OLD` 失败并指明两个版本号；无法解析的约束被忽略，而不是使插件无法安装。
- **关联规格**：`07-plugins/07-plugin-marketplace.md`、`07-plugins/15-plugin-center.md`
- **验收**：G（信任呈现）
- **状态**：已记录 / host-core 由单元测试覆盖

#### E2E-024V：发布者用 pi-plugin publish 锁定版本

- **前置条件**：一个位于 git 仓库内的插件目录，带有 https 或 ssh 的 origin 远程。
- **步骤**：1）在有未提交更改时运行 `pi-plugin publish`。2）提交并打标签，然后重跑。3）在无标签的 commit 上重跑。4）用含凭据的远程重跑。5）将生成的注册条目送入中心的目录构建和客户端预检。
- **预期结果**：脏工作树被拒绝，使提交的 commit 描述已打包的字节；干净的运行会将包、其 sha256、规范仓库 URL、标签 ref、解析出的 commit 和插件子目录写入提交负载；无标签的 commit 被接受但带警告；含凭据的远程被拒绝；生成的目录通过客户端所搭载的同一预检。
- **关联规格**：`07-plugins/10-plugin-devex.md`、`07-plugins/15-plugin-center.md`
- **验收**：G（发布者工具）
- **状态**：已记录 / devkit 由单元测试覆盖

#### E2E-024C：插件包安装与自动更新路径

- **前置条件**：市场目录有更新版本或本地 `.piplug`。
- **步骤**：1）从头部溢出菜单安装包。2）从行溢出菜单启用自动更新。3）在市场缓慢或不可用时重新打开 Extensions，确认 Installed 界面和 Marketplace 标签页保持可用。4）确认已安装列表从本地目录刷新更新元数据。5）运行 Check for updates，然后运行 Apply automatic updates。
- **预期结果**：Extensions 界面在其静默的仅缓存检查期间不等待远程请求；该行移动到 Updates available，更新横幅报告数量；即使目录版本数组不是最新在前，也会选择最高语义版本；显式检查获取当前目录，离线时使用缓存目录；新版本新增的权限在审查对话框中标记为 New；自动更新仅在权限差异为空或已预先授予时应用。
- **关联规格**：`07-plugins/06-plugin-packaging.md`、`07-plugins/08-plugin-signing-updates.md`
- **验收**：G（包安装 + 更新策略）
- **状态**：已记录

#### E2E-024Q：市场更新诊断与发布数据门禁

- **前置条件**：一个目录夹具包含一个已安装的 `0.5.0` 插件、一个
  `0.5.1` 版本，以及未排序的版本条目或故意缺失的
  包元数据。
- **步骤**：1）记录插件 ID、已安装版本、显示的最新
  版本、目录 URL 和本地缓存路径。2）获取实时/夹具目录
  并检查确切条目。3）单独检查已安装注册表。
  4）运行 `pnpm check:marketplace -- --url <catalog> --plugin <id>`。5）针对
  该夹具运行更新检查。
- **预期结果**：在改动代码之前，故障被归类为目录数据、获取/缓存、
  宿主比较、IPC 传导或渲染呈现；预检报告每一个缺失的校验和、URL、包大小或
  权限字段；不完整的发布可以被展示用于发现，但
  不可安装；无论目录排序如何，有效的 `0.5.1` 都会被检测到；
  最终修复包含针对已诊断边界的回归测试。
- **关联规格**：`07-plugins/07-plugin-marketplace.md`、
  `07-plugins/08-plugin-signing-updates.md`、
  `06-delivery/03-ai-development-workflow.md`
- **验收**：G（市场更新诊断）
- **状态**：已记录 / 预检脚本

#### E2E-024H：已安装插件呈现状态、风险和故障

- **前置条件**：至少一个已启用插件、一个已禁用插件，以及一个加载失败的插件。
- **步骤**：1）在插件变更事件成批到达时打开 Extensions → Installed。2）读取标签页和分组计数。3）确认失败的插件位于 Needs attention 下并带其错误信息。4）按作者和按权限搜索。5）清除搜索。
- **预期结果**：页面在宿主瞬时背压期间保持可用：相同的插件和扩展注册表刷新会被合并，面向渲染进程的 RPC 调用在暴露错误之前以有界退避重试显式的 `HOST_OVERLOADED` 响应。行按 Needs attention / Updates available / Active / Turned off 分组并带计数；`status: "error" | "load_error"` 内联渲染错误信息而不是沉默；每行默认为两行式的名称/id/版本摘要，而 Details 折叠区揭示按风险着色的权限徽章、能力和常驻服务状态；单个作用域触发器打开带解释的 Off / This project / Everywhere 选项和项目选择器；行图标操作暴露悬停/聚焦标签；结果计数反映过滤后的子集，清除后恢复所有分组。
- **关联规格**：`04-ux/01-ui-ia.md`、`07-plugins/13-plugin-permissions-matrix.md`
- **验收**：G（已安装插件管理）
- **状态**：已记录

#### E2E-024D：隔离的插件面板宿主桥

- **前置条件**：启用了 `ui.panel` 的插件。
- **步骤**：1）将应用语言设为英语，打开一个 manifest 声明了本地化 `ui.title.en` 和 `ui.title.zh-CN` 的面板；确认原生窗口/启动器标识保持可用，且无宿主渲染的标题。2）将应用语言设为简体中文并重新打开面板；确认面板内容仍由插件持有。3）在面板保持打开时，将应用语言切换为韩语，确认实时的 `appearance:changed` 事件更新面板控件、安全区域提醒和无障碍标签，而无需重新打开。4）在 macOS、Windows 和 Linux 上打开面板；确认相同的无边框 46px 拖拽条带、完全包含在该条带内的固定右上角胶囊，以及恰好三个无障碍控件。5）在每个平台上演练最小化、最大化、还原、关闭、键盘焦点、浅色/深色主题、页面自定义的浅色/深色背景和减弱动态效果。6）渲染一个插件自有的标题栏/工具栏；验证 fixed/sticky UI 使用 `--pi-plugin-titlebar-height`，其交互控件使用 `no-drag`，且顶部 46px 内胶囊之外的点击被当作窗口拖拽。7）在 Windows 经典滚动条下，滚动一个内容溢出的面板并检查右边缘。8）打开一个开发插件，确认本地化提醒说明顶部 46px 在胶囊之外不可点击。9）重新打开一个已最小化的面板。10）调用面板桥 API（`ui.showToast`、带授权的 fs/net 可选能力）。11）从胶囊关闭面板，以及通过禁用或卸载插件关闭面板。
- **预期结果**：面板在其沙箱化窗口/分区中运行；三个平台都使用同一套宿主持有的无边框窗口框架契约，无原生红绿灯按钮、无宿主渲染标题、无应用菜单；顶部拖拽条带恰好 46px，最小化胶囊固定在右上角且不超出它。胶囊包含最小化/最大化或还原/关闭，跟随插件页面的表面/文字颜色，且绝不把黑色表面强加到浅色页面上。标记为 `pi-plugin-chrome` 的 v2 页面使用 `--pi-plugin-titlebar-height`，并直接从 46px 条带下方开始自己的内容，无叠加的重复占位；旧版页面保留兼容偏移。面板的稳定滚动条槽仅限于其实际内容滚动容器；Windows 不会在页面表面之外显示第二个根级空侧栏。插件持有其标题和工具栏；宿主拖拽条保持可用，拦截胶囊之外的点击，且仅开发面板显示该提醒。重新打开会恢复现有面板；在面板保持打开时切换到韩语会就地更新宿主胶囊、提醒和无障碍标签；桥调用仍受权限检查，面板关闭时宿主保持稳定。关闭面板不得抛出主进程 `TypeError: Object has been destroyed` 或显示未捕获异常对话框。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、`04-ux/07-ui-design-system.md`、`07-plugins/01-plugin-system.md`、`07-plugins/03-plugin-api.md`、`07-plugins/04-plugin-security.md`、`07-plugins/12-plugin-ipc-and-host-services.md`、ADR 0081、ADR 0082、ADR 0092、ADR 0093
- **验收**：G（隔离面板）
- **状态**：已记录

#### E2E-024AA：插件自有 UI 跟随宿主语言

- **前置条件**：一个已加载的插件带有面板或设置目的地，且插件进程已订阅 `pi.events.on("appearance:changed")`。
- **步骤**：1）调用 `pi.app.getLocale` / `app.getAppearance`，确认标签与 Settings → language 一致。2）在插件保持加载时切换应用语言。3）确认生成的 `contributes.settings` 标题仍是作者语言的字符串。4）确认插件进程和任何已打开的面板收到带新 `locale` 的 `appearance:changed`，并重设自己的文案样式。
- **预期结果**：宿主只发布语言。插件自有文案无需重载即可改变。生成的设置页不解析 `{ en, "zh-CN" }` 映射。宿主持有的标识仍遵循 `manifest.i18n`（ADR 0267）。
- **关联规格**：`07-plugins/03-plugin-api.md`、`07-plugins/02-plugin-manifest-schema.md`、`04-ux/02-i18n-english-first.md`、ADR 0280
- **验收**：G（插件 i18n）
- **状态**：部分自动化（`apps/desktop/test/plugin-settings.test.mjs`、`plugin-work-panel-views.test.mjs`）；UI 走查已记录


#### E2E-024Y：大文件插件读取与拖入文件授权保持宿主门禁

- **前置条件**：一个测试插件声明了 `fs.read`；工作区包含一个
  可读的日志和一个受保护的凭据夹具；插件面板已打开。
- **步骤**：1）选择一个目录并打开一个大日志。2）确认初始分页、
  搜索、跟随和文件增长轮询通过 `fs.stat` 和有界的
  `fs.readRange` 完成。3）将一个普通文件拖入面板并打开它。4）拖入
  第二个文件，或用第一个授权伪造绝对路径重试。5）
  重载/卸载插件并用旧授权重试。
- **预期结果**：目录读取保持相对于所选根目录，并经过
  权限/审计检查。范围读取拒绝非法值和超过
  8 MiB 的长度，在 EOF 返回空字节数组，并保留总大小。真实的
  拖放创建单文件、只读、仅内存的授权；拖入的文件使用
  相同的分页/搜索/跟随引擎，而其他路径、受保护路径
  和卸载后的授权以 `PERMISSION_DENIED` 或 `NOT_FOUND` 失败关闭。
  不使用渲染进程 worker 或原始的插件 `node:fs` 路径。
- **关联规格**：`07-plugins/03-plugin-api.md`、
  `07-plugins/04-plugin-security.md`、`07-plugins/12-plugin-ipc-and-host-services.md`、
  `07-plugins/13-plugin-permissions-matrix.md`、ADR 0190
- **验收**：安全 + G（插件宿主服务）
- **状态**：单元/集成测试已覆盖；真实拖动手势仍需手动验证

#### E2E-024E：高风险插件 API 需要授权

- **前置条件**：Notes 插件已安装并获得显式授权。
- **步骤**：1）通过插件运行时或面板桥调用 `fs.writeText` / `net.fetch` / `shell.openExternal`。2）撤销一项权限并重试。
- **预期结果**：已授权的调用成功并带审计；已撤销/未声明的调用以 `PERMISSION_DENIED` 失败，且不使应用崩溃。
- **关联规格**：`07-plugins/13-plugin-permissions-matrix.md`、`07-plugins/04-plugin-security.md`
- **验收**：安全 + G
- **状态**：已记录

#### E2E-024W：插件剪贴板历史捕获有界的文本和图像

- **前置条件**：应用正在运行；一个测试插件声明并被授予
  `clipboard.read`；输入框可接收一次文本粘贴和一次图像粘贴。
- **步骤**：1）向输入框粘贴文本、向输入框粘贴图像，
  然后调用 `pi.clipboard.getHistory()`。2）再次调用并修改
  返回的图像字节。3）连续粘贴相同文本并调用该 API。
  4）让应用空闲且操作系统剪贴板上有一张图像，验证不发生
  剪贴板采样。5）撤销 `clipboard.read` 并再次调用。
  6）加入超过文本/图像上限和早于保留窗口的夹具。
- **预期结果**：结果按最新在前排列，文本和图像条目
  交错，带 ISO 时间戳、PNG 字节和图像尺寸；修改
  结果不会修改宿主状态。连续重复项以刷新的时间戳
  折叠。超过单条上限的条目和过期条目
  不出现，宿主的总量/单条上限得到执行。粘贴只记录
  该事件已读取的内容；宿主不重读操作系统
  剪贴板，也不在空闲时采样。该 API 复用 `clipboard.read` 授权，
  被拒绝的调用以 `PERMISSION_DENIED` 失败，成功的调用发出一条
  包含返回条目数的审计记录。
- **关联规格**：`07-plugins/03-plugin-api.md`、
  `07-plugins/04-plugin-security.md`、
  `07-plugins/13-plugin-permissions-matrix.md`、ADR 0115
- **验收**：G（插件剪贴板历史）+ 安全
- **状态**：单元测试已覆盖（`clipboard-history.test.mjs`）；Electron 剪贴板
  捕获仍需手动验证

#### E2E-024I：插件 skills 到达 agent 并按需加载

- **前置条件**：`examples/plugins/hello` 已启用并被授予 `agent.prompt.inject`；另有一份不带该权限的 manifest 副本可用；一个工作区是插件目录，另一个不是。
- **步骤**：1）开始一个会话并问 agent 它有哪些 skills。2）让它遵循 Hello 演示 skill，使其调用 `Skill` 工具。3）编辑 skill 文档并重复第 2 步。4）禁用插件并开始新轮次。5）加载不带 `agent.prompt.inject` 的变体并重复第 1 步。6）声明一个超过单 skill 上限的文档。7）依次打开两个工作区。
- **预期结果**：目录列出 skill id、名称和截断的描述但不含正文，位于内置 skills 之后、项目指令链之前；`Skill` 的 schema 仅在请求时通过 `ToolSearch` 加载，且无需重启即可读取编辑后的文件；禁用插件会重建运行时，使该 skill 从下一轮消失；不带该权限的变体正常加载且不贡献 skills；超限文档被跳过并记录一条审计行，而不是被截断塞进 prompt；内置的 `plugin-development` skill 在插件工作区中被编入目录，在另一个工作区中缺席，而 `PluginCheck` 在两个工作区中都列于有界的按需工具目录中。
- **关联规格**：`07-plugins/02-plugin-manifest-schema.md`、`07-plugins/04-plugin-security.md` §7.1、`07-plugins/10-plugin-devex.md`、ADR 0039、ADR 0037、D174
- **验收**：G（skill 激活）+ E（工具与权限）+ D（高风险权限门禁）
- **状态**：单元测试已覆盖（`plugin-skills.test.mjs`、agent-runtime prompt/digest 测试）；面向 agent 的场景为 Draft

#### E2E-024J：插件主题生效并在撤回时回退

- **前置条件**：`examples/plugins/hello` 已启用并被授予 `ui.theme`；一个 CSS 使用 `@import` 或远程 `url()` 的插件可用于拒绝场景，另加它的一个只在注释中提及这些令牌的变体；第三个变体的主题声明了图像资源和 `windowAppearance` 背景，分带与不带 `ui.window.appearance` 两种情况。
- **步骤**：1）打开 Settings → General → Theme 并选择 `Hello Midnight`。2）重启应用。3）禁用提供方插件。4）重新启用它，然后卸载它。5）加载带不安全 CSS 的插件。6）加载仅注释变体。7）在 Windows/Linux 和 macOS 上选择资源变体的主题，并检查从该插件打开的面板。8）移除 `ui.window.appearance` 后取消选择其主题。
- **预期结果**：插件主题与内置主题一起出现在选择器中并立即生效；该选择以 `plugin:demo.hello:midnight` 的形式在重启后保留；禁用或卸载提供方会回退到 `system` 而不是无样式外壳；不安全 CSS 在加载时被拒绝，原因被记录且不注入 `<style>` 元素；仅注释的样式表正常加载并贡献其主题，因为清理器只检查浏览器会应用的 CSS；声明的资源通过 `plugin-asset:` 在外壳和插件自身面板中绘制，未声明的引用被拒绝并记录原因，声明的背景在 Windows/Linux 上为原生窗口着色且在 macOS 上绝不发送，取消选择主题或撤销授权会使窗口恢复宿主背景；整个外壳跟随主题，包括工作面板列、其头部以及浏览器/文件查看器条带，它们都读取 `--ds-bg-dock` / `--ds-bg-dock-raised` 而非字面量。
- **关联规格**：`07-plugins/04-plugin-security.md` §3.1、`04-ux/07-ui-design-system.md`、D175
- **验收**：G（主题贡献）+ 安全
- **状态**：单元测试已覆盖（`plugin-themes.test.mjs`、`theme-css` SDK 测试）；视觉场景为 Draft

#### E2E-PLUGIN-runtime-theme-apis

- **前置条件**：一个带 `ui.theme` 的插件，可驱动 `pi.app.setTheme` 和 `pi.themes.upsert` / `remove`（面板或命令）。Settings → General 显示可搜索的主题选择器。
- **步骤**：1）从插件 UI 用新主题 id 和独特的 CSS 调用 `themes.upsert`。2）确认该主题无需重载/禁用即出现在设置中。3）调用 `app.setTheme` 选择它。4）在其处于活跃状态时，用不同的 CSS 再次调用 `themes.upsert`。5）对一个非活跃主题调用 `themes.remove`。6）用未知 id 调用 `app.setTheme`。7）再 upsert 第九个主题（旧硬上限为 8）。
- **预期结果**：新主题被列出，并通过与设置相同的路径立即生效；实时 CSS 编辑无需重载插件即可重设外壳样式；remove 移除选择器行且事件刷新列表；未知 id 以 `INVALID_ARGUMENT` 拒绝且偏好保持不变；第九个主题被接受。`settingsChanged` 到达渲染进程 store；`appearance:changed` 到达已打开的面板。
- **关联规格**：`07-plugins/03-plugin-api.md`、`07-plugins/12-plugin-ipc-and-host-services.md`、`07-plugins/13-plugin-permissions-matrix.md`、ADR 0260、D417
- **验收**：G（主题贡献）+ 安全
- **状态**：单元测试已覆盖（`plugin-themes.test.mjs`）；交互场景为 Draft

#### E2E-PLUGIN-sidebar-gradient-token

- **前置条件**：一个插件主题，将 `--ds-bg-sidebar` 设为纯色，将 `--ds-bg-sidebar-image` 设为 `linear-gradient(...)`；Windows/Linux 和 macOS 外壳。
- **步骤**：1）选择该主题。2）查看侧边栏底板和导航栏。3）确认边框/玻璃色调仍从颜色令牌解析。4）切回内置主题。
- **预期结果**：渐变在所有平台上作为 `background-image` 绘制在颜色底板之上；macOS 光泽仍叠加在图像层上；边框和 `color-mix` 消费方不受影响；清除令牌恢复朴素的侧边栏。
- **关联规格**：`04-ux/07-ui-design-system.md`、ADR 0260、D417
- **验收**：视觉 / 平台
- **状态**：CSS 单元契约见 `plugin-themes.test.mjs`；视觉场景为 Draft

#### E2E-024K：插件 MCP 服务器工具到达 agent

- **前置条件**：一个插件声明一个 `stdio` 和一个非 loopback HTTP MCP 服务器，针对受信任的本地网络桩；`mcp.server.local` 和 `mcp.server.remote` 已授予；HTTP 宿主列于 `net.domains`；一个设置键持有桩凭据。
- **步骤**：1）启用插件并确认尚无服务器进程启动。2）让 agent 调用一个已发现的工具。3）检查桩收到的环境变量/请求头。4）让桩的一次调用失败、一次超时。5）让 stdio 桩的目录超过旧的 64 工具上限并重新发现。6）禁用插件。
- **预期结果**：服务器在首次使用时惰性连接；工具以 `plugin_demo_*_<serverId>_<tool>` 形式出现，`risk: "medium"`，每次调用有审计；stdio 子进程只收到声明的 `env` 值加 PATH/临时目录/区域设置，绝不收到宿主 provider 密钥；非 loopback HTTP 端点仅因其宿主已声明才被接受，其未加密传输在审查中可见；重定向到未声明的宿主在第二个请求发出前被阻止；失败和超时返回工具错误而不使插件或宿主崩溃；大于旧 64 工具上限的目录完整到达，而违反单服务器防护（数量、分页、游标、遍历时间）的服务器被拒绝，而不是贡献其目录的前缀；禁用会断开两个服务器。
- **关联规格**：`07-plugins/02-plugin-manifest-schema.md`、`07-plugins/04-plugin-security.md` §8.1、ADR 0038、ADR 0142、D176、D281、D452
- **验收**：G（MCP 桥）+ E（工具与权限）+ 安全
- **状态**：单元测试已覆盖（`plugin-mcp.test.mjs` stdio + HTTP 桩）；面向 agent 的场景为 Draft

#### E2E-024L：常驻插件服务受监督且可见

- **前置条件**：`examples/plugins/hello` 已启用并被授予 `background.service`。
- **步骤**：1）打开 Extensions → Installed，展开插件行上的 Details，读取 `Greeter heartbeat` 徽章。2）杀掉插件的 utility 进程并观察徽章。3）反复杀掉直到超过重启上限。4）禁用并重新启用插件。5）撤销 `background.service` 并重载。
- **预期结果**：Details 折叠区暴露一个徽章，加载后报告 `running`；杀掉后显示 `failed`，然后再次显示 `running`，重启计数递增且尝试之间有退避；超过五次尝试后插件保持 `failed` 并停止重试；手动禁用/启用取消挂起的计时器并重置计数；没有该权限时服务绝不启动，且跳过被审计。
- **关联规格**：`07-plugins/05-plugin-lifecycle.md` §3.1、ADR 0040、D177
- **验收**：G（常驻服务）
- **状态**：单元测试已覆盖（`plugin-services.test.mjs` 监督 + 退避）；手动杀进程场景为 Draft

#### E2E-024M：总线消息仅按声明跨插件传递

- **前置条件**：两个插件已启用——一个发布 `demo.*` 主题，一个订阅 `demo.**`——`bus.publish` / `bus.subscribe` 已授予。
- **步骤**：1）运行发布方的命令并观察订阅方。2）发布一个不在 `contributes.bus.publish` 中的主题。3）订阅一个不在 `contributes.bus.subscribe` 中的模式。4）发布超过 64KB 的负载并在 10 秒内超过 100 次发布。5）卸载订阅方并再次发布。
- **预期结果**：订阅方收到 `{ topic, from, payload, at }`，发布方绝不收到自己的消息；未声明的发布和订阅都以 `PERMISSION_DENIED` 失败，并有指明主题的审计行；超大负载和速率突发分别以 `LIMIT_EXCEEDED` / `RATE_LIMITED` 失败；向已离开的订阅方发布会成功，扇出更小且无宿主错误。
- **关联规格**：`07-plugins/02-plugin-manifest-schema.md` §5.1、`07-plugins/04-plugin-security.md` §5.1、ADR 0040、D178
- **验收**：G（消息总线）+ 安全
- **状态**：单元测试已覆盖（`plugin-bus.test.mjs` 投递、过滤、上限）；双插件手动场景为 Draft

#### E2E-024N：Extensions 页面密度与主题可读的操作

- **前置条件**：应用已运行，至少有一个已安装扩展和一个
  可用的市场操作；深色和浅色主题均可用。
- **步骤**：1）在深色主题下打开 Extensions。2）在 Windows/Linux 上，确认
  紧凑的两层式头部在原生窗口控件条带下方呈现扩展标志/标题和上下文
  操作栏，然后确认 Installed 和 Marketplace 标签页是仅有的标签页，且两者都能到达内容，
  没有四卡片数字概览条带或解释性的头部/分区
  段落。3）确认已安装行起始
  为安静的两行摘要，然后在一行上展开 Details 并查看其
  能力、服务状态和权限。4）使用紧凑的作用域
  控件及其带解释的作用域菜单、上下文主操作，以及
  次级更新/操作按钮。5）
  切换到浅色主题并重复。6）用键盘聚焦 Details 折叠区、
  作用域状态和每个操作。
- **预期结果**：四个数字概览卡片不存在；头部使用
  安静的 24px 扩展标志、18px 标题、克制的 30px 操作控件，以及
  可见的键盘焦点环；标签页计数、
  已安装分组计数和任何更新提醒在其
  相关界面中保持可用。页面头部、分区头部、空状态和更新
  提醒使用紧凑的标签和操作；特定于决策的解释保留
  在折叠区、详情和对话框中。已安装行保持默认高度较低，而
  折叠区暴露完整的次级信息。作用域触发器
  与行操作栏保持对齐，其菜单解释每个状态，图标
  操作在静止时保持可见，并在悬停和聚焦时显示标签。
  主按钮和次按钮在
  两个主题中都保持可见的语义化表面、文字、边框、悬停状态和焦点
  环，且键盘焦点不依赖指针悬停。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/07-ui-design-system.md`、
  `07-plugins/07-plugin-marketplace.md`、ADR 0058、D196
- **验收**：G（Extensions 页面）+ 质量
- **状态**：单元测试已覆盖（`extensions-page.test.mjs`、
  `plugins-page-style.test.mjs`）；视觉场景为 Draft

#### E2E-024O：市场隐藏仅用于开发的示例插件

- **前置条件**：应用已运行；官方目录包含
  开发夹具 `demo.hello` 或 `demo.workspace-summary`，以及至少
  一个产品插件。
- **步骤**：1）以空搜索打开 Extensions → Marketplace。2）依次搜索
  `Hello`、`Workspace Notes` 和 `Workspace Summary`。3）查看
  类别过滤器和结果卡片。4）打开 Installed，验证
  已安装的示例仍可管理。
- **预期结果**：ID 以 `demo.` 开头的条目绝不出现在
  市场卡片、类别或搜索结果中；产品插件仍可被
  发现。已安装的示例仍列在 Installed 下，
  以便可以禁用或卸载，而不是成为不受管理的运行时。
- **关联规格**：`07-plugins/07-plugin-marketplace.md`、
  `04-ux/01-ui-ia.md`
- **验收**：G（Extensions 页面）+ 质量
- **状态**：单元测试已覆盖（`extensions-page.test.mjs`）；视觉场景为 Draft

#### E2E-025：禁用插件移除其贡献

- **前置条件**：插件已启用且贡献可见。
- **步骤**：1）在 Extensions 页面禁用插件。2）检查全局搜索和 agent 工具。
- **预期结果**：命令和工具消失；无残留贡献。
- **关联规格**：`07-plugins/05-plugin-lifecycle.md`
- **验收**：G（禁用移除贡献）
- **里程碑**：M4
- **状态**：已自动化（协议冒烟：禁用清除 enabled 标志；全局搜索移除为手动验证）

#### E2E-026：插件错误不使应用崩溃

- **前置条件**：插件已加载。
- **步骤**：1）触发插件抛出错误的场景。2）观察应用行为。
- **预期结果**：应用保持运行；错误被捕获并报告；无崩溃。
- **关联规格**：`07-plugins/04-plugin-security.md`
- **验收**：G（插件错误 → 不崩溃）
- **里程碑**：M4
- **状态**：Draft

#### E2E-024X：页面文案在两种语言中保持简洁

- **前置条件**：应用已运行，英语和简体中文可用；project archive、Scheduled、Pull requests、Extensions 和 Agent capability 目的地均可到达。
- **步骤**：1）以英语打开每个目的地，查看其头部、工具栏、空状态和主操作。2）切换到简体中文并重复。3）触发一个权限、校验、破坏性操作或 provider 错误状态。
- **预期结果**：页面头部不把标题重复为解释性副标题；空状态使用简洁的标题和操作，仅在需要上下文或必要的下一步时才有正文。设置和能力页面省略仅解释显而易见控件的文字。权限、安全、校验、破坏性操作、键盘、作用域和错误详情在两种语言中保持可见。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/07-ui-design-system.md`
- **验收**：质量（简洁的页面文案）
- **状态**：单元测试已覆盖（`packages/i18n/test/user-facing-copy.test.mjs`）；视觉场景为 Draft

### 安全 —— 无秘密泄漏

#### E2E-027：正常流程中秘密不进入日志

- **前置条件**：provider 已配置 API key。
- **步骤**：1）执行一次聊天会话。2）检查日志文件。
- **预期结果**：正常流程中任何日志输出都不含 API key / token。
- **关联规格**：`05-security/01-security.md`、`03-runtime/09-logging-and-observability.md`
- **验收**：H（秘密不在日志中）
- **里程碑**：M2
- **状态**：已自动化（协议冒烟：provider 列表不携带秘密材料）

#### E2E-028：渲染进程无 Node 集成

- **前置条件**：应用已运行。
- **步骤**：1）检查渲染进程标志。
- **预期结果**：`nodeIntegration: false`；`contextIsolation: true`；preload 是唯一桥梁。
- **关联规格**：`05-security/01-security.md`
- **验收**：安全（渲染进程无 Node）
- **里程碑**：M1
- **状态**：Draft

#### E2E-029：白名单外的 IPC 无法调用

- **前置条件**：应用已运行。
- **步骤**：1）尝试从渲染进程调用不在白名单上的 IPC 方法。
- **预期结果**：调用被阻止；无数据返回；报错或无响应。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、`05-security/01-security.md`
- **验收**：安全（IPC 白名单强制执行）
- **里程碑**：M1
- **状态**：Draft

#### E2E-030：插件无法读取 API key

- **前置条件**：插件已加载；provider 已配置。
- **步骤**：1）插件尝试通过任何 API 访问 provider 秘密。2）观察结果。
- **预期结果**：访问被拒绝；无秘密数据返回给插件。
- **关联规格**：`07-plugins/04-plugin-security.md`、`03-runtime/14-secrets-storage.md`
- **验收**：安全（插件无法读取 API key）
- **里程碑**：M4
- **状态**：Draft

#### E2E-031：错误码稳定且可读

- **前置条件**：应用通过常规桌面开发
  命令启动；provider 已配置。
- **步骤**：1）选择或输入一个 provider 拒绝的模型 ID。2）发送
  一个 prompt。3）查看助手错误消息及其详情折叠区。4）
  切换会话并重载失败的会话。5）用无效的
  provider 密钥重复。
- **预期结果**：运行停止，转录包含一条持久的
  `role=assistant`、`status=error` 消息，而不是 toast、浮动横幅
  或空白行。它显示本地化的摘要和稳定的
  `MODEL_NOT_CONFIGURED` 或 `PROVIDER_UNAUTHORIZED` 错误码。详情暴露
  脱敏后的 provider 响应以及 provider/模型 ID，且可复制；不出现
  API key 或 Authorization 值。配置失败链接到
  设置，可重试的失败提供 Retry，输入框恢复可用，
  重载保留错误消息。开发启动执行
  由当前运行时代码重新构建的 sidecar。
- **关联规格**：`03-runtime/02-agent-runtime.md`、
  `03-runtime/07-process-model.md`、`03-runtime/08-error-codes.md`
- **验收**：C（失败的聊天正常收尾）、H（错误暴露稳定错误码）
- **里程碑**：M2
- **状态**：单元测试已覆盖（agent-runtime 错误消息/脱敏、宿主
  持久化、桌面转录契约和 predev 构建契约）；完整
  Electron UI 场景为 Draft

### 加固（M5）

#### E2E-032：后端崩溃触发受监督的重启

- **前置条件**：应用已运行；host-core 和 sidecar 健康。
- **步骤**：1）从外部杀掉 host-core（或 sidecar）进程。2）观察应用行为。
- **预期结果**：进行中的 RPC 快速失败（不长时间挂起）；`hostStatus` 显示降级然后恢复；子进程以退避重启；2 分钟内 3 次重启失败后应用保持降级并显示可见的致命状态。在主窗口关闭的情况下重复杀进程：崩溃仍被记录（含子进程最后的 stderr 行），子进程仍重启，且不出现未处理的 renderer-send 错误——监督独立于存活窗口。
- **关联规格**：`03-runtime/07-process-model.md`
- **验收**：质量（主路径不崩溃）
- **里程碑**：M5
- **状态**：已自动化（`scripts/e2e-supervision.mjs`——SIGKILL host-core，断言重启 + 健康 RPC）

#### E2E-033：窗口边界跨重启持久化

- **前置条件**：应用以默认窗口大小运行。
- **步骤**：1）调整/移动窗口到独特的常规边界 A（≥1040×700），在 600ms 保存防抖结束前先最大化，退出并重新启动。2）还原，调整/移动到独特的边界 B，在防抖结束前退出，再次重新启动。
- **预期结果**：每次重启恢复最新的常规边界（先是 A，后是 B），包括在最大化时或有挂起保存时退出的情况。最大化/全屏几何绝不存为常规边界；无效/过小的已存边界回退到 1200×800 默认值。
- **关联规格**：`04-ux/09-interaction-patterns.md`
- **验收**：质量（关键操作体验精致）
- **里程碑**：M5
- **状态**：已记录

#### E2E-034：NDJSON 日志文件被写入并脱敏

- **前置条件**：全新配置文件；provider 已配置；已完成一个聊天轮次。
- **步骤**：1）运行一个带工具调用的 prompt。2）打开 `~/.pi-desktop/logs/`。3）检查 `app/`、`host/` 和 `agent/` 下的分类文件。
- **预期结果**：NDJSON 记录存在，带 `ts/level/channel/category/event/message`；一次正常的工具调用产生一条携带 `sessionId`/`toolCallId`、安全工具元数据和有界结果/耗时信息的完成或失败记录；被中断的工具可通过同一 id 追踪；不出现 API key、authorization 值、原始命令输出或本地绝对路径；每个分类文件在 5 MB 时轮转；生命周期、权限、工具、provider、插件、持久化、更新器和错误记录保持可用，且不创建专门的计时分类文件。
- **关联规格**：`03-runtime/09-logging-and-observability.md`
- **验收**：H（诊断）
- **里程碑**：M5
- **状态**：已记录

#### E2E-194：损坏的 stdout 不使主进程崩溃

- **前置条件**：打包或开发版应用；会话可发送 prompt。
- **步骤**：1）以 stdout/stderr 为已关闭管道的方式启动（从桌面入口
  启动 Linux AppImage，或关闭 stdout 读取端）。2）发送一条聊天消息。
  3）确认主进程保持运行，且未捕获异常对话框
  不出现。4）退出并重新启动。
- **预期结果**：不出现 Electron "A JavaScript error occurred in the main process"
  对话框（来自 `Logger.log` 的 `Error: write EPIPE`）。NDJSON 分类日志
  仍收到 prompt 记录。重新启动仍能到达本地宿主服务，
  而不是因之前主进程崩溃导致的致命 "Can't reach the local service" / “无法连接本地服务”
  状态。
- **关联规格**：`03-runtime/09-logging-and-observability.md`、
  `03-runtime/07-process-model.md`
- **验收**：H（诊断）、质量（主路径不崩溃）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`logger-routing.test.mjs`）；打包 AppImage
  旅程已记录

#### E2E-RUNTIME-non-ascii-http-header-does-not-show-main-exception-dialog

- **前置条件**：打包或开发版应用运行在系统
  HTTP 代理或网关注入非 Latin-1 响应头的机器上（例如
  以 U+661F 开头的值），或者一个测试通过 Electron `net`
  投递相同的 `TypeError: Cannot convert argument to a ByteString`。
- **步骤**：1）启动应用，使自动更新检查或模型发现发出
  主进程 `net.fetch` / Electron-updater 请求。2）确认原生
  异常对话框不出现。3）不做任何关闭操作；等待后续的
  更新器或发现请求。4）打开 `~/.pi-desktop/logs/app/runtime.log`。
- **预期结果**：不出现 Electron "A JavaScript error occurred in the main process"
  对话框。应用保持运行且不退出。`runtime.log` 包含一条
  带 `code: "NON_ASCII_HTTP_HEADER"` 和 `recoverable: true` 的
  错误记录。后续的主进程 HTTP 请求不会重新打开原生对话框。
- **关联规格**：`03-runtime/07-process-model.md`、
  `03-runtime/09-logging-and-observability.md`
- **验收**：H（诊断）、质量（主路径不崩溃）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`main-process-errors.test.mjs`）；打包 Windows
  代理旅程已记录

#### E2E-195：低于 2.35 的 Linux glibc 指明受支持的发行版

- **前置条件**：Linux x64 打包应用；机器 glibc 低于
  2.35（例如 Ubuntu 20.04 / Debian 11 / Fedora 35），或者测试将
  `process.report` 加倍为 `2.31`。
- **步骤**：1）启动 AppImage、deb 或 rpm。2）观察主窗口和
  致命横幅。3）确认 host-core 不会循环重启。
- **预期结果**：Electron 仍然打开。没有未捕获的 `write EPIPE`
  对话框。致命横幅说明该构建需要 glibc 2.35 或更新，并指明
  Ubuntu 22.04、Debian 12 和 Fedora 36+。重启监督不空转。
  符号需要 glibc 2.39 的 host-core 二进制无法通过
  `scripts/check-linux-host-glibc.mjs`。
- **关联规格**：`03-runtime/07-process-model.md`、
  `01-product/01-product-scope.md`、`06-delivery/06-release-runbook.md`
- **验收**：H（诊断）、质量（主路径不崩溃）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`linux-glibc.test.mjs`）；打包发行版旅程
  已记录

#### E2E-035：Bash 工具使用生效的目录 shell

- **前置条件**：工作区已打开；agent 模式。
- **步骤**：1）选择一个可用的目录 shell 并运行 `Bash`（例如 `echo ok`）。2）使已持久化的选择不可用，并在运行下一轮前检查生效目录。3）用上一轮快照运行。
- **预期结果**：未变更的 `Bash` 协议调用使用所选的目录条目。之后不可用的持久化选择回退到第一个可用的平台 shell 并标记目录回退；上一轮快照被 `COMMAND_SHELL_CHANGED` 作为过期拒绝，而不是静默更换 shell。不发生部分执行；E2E-113 覆盖过期身份路径。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`、`03-runtime/06-host-rpc-protocol.md`、`03-runtime/08-error-codes.md`、ADR 0054
- **验收**：H（错误暴露稳定错误码）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`tools::shell::tests`）；场景已记录

#### E2E-044：开发启动使用 PI-Desktop Dock 品牌

- **前置条件**：macOS 开发检出，带规范的 `build/icon_1024.png`。
- **步骤**：1）运行 `pnpm dev`。2）查看正在运行应用的 Dock 图标。
- **预期结果**：Dock 显示 PI-Desktop 品牌图标，而不是 Electron 默认图标；打包构建继续使用 `build/icon.icns`。
- **关联规格**：`06-delivery/06-release-runbook.md`
- **验收**：质量（开发外壳与发布品牌一致）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`development-branding.test.mjs`）；视觉场景已记录

#### E2E-045：全局文本选择保留编辑与复制

- **前置条件**：应用已运行，聊天转录包含一条用户
  消息、一条带代码块的助手 Markdown 回复，以及一个展开的
  工具结果。
- **步骤**：1）拖选侧边栏/标题栏框架和按钮标签。2）
  拖选用户/助手正文、代码和工具输出。3）聚焦
  输入框和一个设置/搜索输入框，然后使用 `Cmd/Ctrl+A` 并替换
  所选文本。4）复制所选转录和代码文本。
- **预期结果**：框架不会留下意外的文本选择；消息
  正文、代码、工具输入/输出和可编辑控件保持可选择、
  可复制；原生编辑快捷键、focus-visible 焦点环和窗口拖拽
  行为保持完整。
- **关联规格**：`04-ux/07-ui-design-system.md`、
  `04-ux/09-interaction-patterns.md`
- **验收**：质量（关键操作体验精致）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`user-select.test.mjs`）；场景已记录

#### E2E-046：PI-Desktop 渲染进程品牌与输入框图标边界

- **前置条件**：应用在英语和 zh-CN 两种语言下运行，
  有空主页和停靠转录可用。
- **步骤**：1）查看展开和折叠状态的侧边栏。2）查看
  空主页 hero 和停靠输入框。3）观察八帧吉祥物 GIF
  原地循环，将指针移到其上，确认其节奏和
  几何不变。启用减弱动态效果，确认显示静止的
  第一帧。4）聚焦底部的 Settings 和 Plugins 图标，然后聚焦每个
  项目/临时会话创建控件。5）打开 Settings 和输入框
  输入区。
- **预期结果**：可见的外壳标识为 `PI-Desktop`；空主页 hero
  渲染与主题匹配的 100px `HomeMascotLogo` GIF，带短暂停顿
  和循环挥手。指针悬停不改变节奏或几何，
  减弱动态效果显示匹配的静止第一帧。
  展开/折叠的
  侧边栏通过 `BrandLogo` 渲染派生的 `src/assets/brand/logo-*.png` 资源，
  停靠输入框的 prompt 行没有前置
  品牌图标或预留图标槽位，其文字直接与输入
  边距对齐。右侧输入框工具栏依次显示 Bot 模型 × 推理徽章、
  独立的 prompt 增强 Sparkles 按钮，以及唯一的提交
  槽位。底部 Settings 和 Plugins 操作是紧凑的图标按钮；
  Plugins 紧挨 Settings 右侧，并暴露本地化的
  无障碍名称。每个按作用域划分的会话创建控件使用专用的
  message-plus 图标，带本地化标签和无障碍名称。`Codex` 仅作为
  外部导入来源标签或非运行时的设计参考文字保持可见。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md`、`04-ux/09-interaction-patterns.md`、
  `08-meta/decisions-log.md`（D094/D160/D293）、
  `../../adr/0031-icon-free-composer-prompt-row.md`、
  `../../adr/0152-eight-frame-empty-home-mascot-gif.md`
- **验收**：质量（品牌一致性与关键操作体验精致）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`renderer-branding.test.mjs`）；场景已记录

#### E2E-047：保留、折叠、切换和关闭多个项目标签页

- **前置条件**：项目 A 和 B 各至少有一个持久会话；
  两个路径均未归档；还存在一个临时会话。
- **步骤**：1）从 Settings → Project archive 打开项目 A。2）在不关闭
  A 的情况下打开项目 B。3）依次点击 A 目录行的 chevron、文件夹、标签和尾部
  折叠热区来折叠/展开它；用 B 的目录行
  激活并折叠 B；验证 `+` 和溢出菜单不会切换 B。4）悬停并
  键盘聚焦 A 的项目标题，确认暴露完整路径；打开
  A 的项目溢出菜单或右键菜单并选择 Open folder；确认
  会话溢出菜单不再提供 Open folder。5）选择 A 的会话。
  6）关闭 B。7）重启应用。8）从 Settings → Project archive 重新打开 B。
- **预期结果**：A 和 B 在
  紧凑连续列表中渲染为独立的精确路径侧边栏分组，每个目录折叠区只有一个键盘停靠点；
  A 行内每个非操作点只切换 A，项目激活由
  目录行而非其溢出菜单负责，项目操作在
  悬停/聚焦时出现且不移动标签，项目标题的悬停/聚焦路径
  在内容尺寸的提示框中显示 A 的完整绝对路径（长路径在
  420px 上限内换行），Open folder 仅为项目菜单操作并在系统
  文件管理器中打开 A，折叠状态跨重启保留；
  激活某个分组或其会话会
  清除之前可见的转录，更新所选工作区和
  会话绑定，然后只加载所选项目的会话；
  临时会话保持独立；关闭 B 只移除其保留的标签页，
  既不删除其项目行也不删除会话；重新打开 B 恢复相同的
  会话且无重复。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`、ADR 0016
- **验收**：C（切换会话）、D（工作区）、F（本地呈现
  持久化）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`sidebar-preferences.test.mjs` 覆盖保留路径
  和折叠持久化）；完整 UI 场景为 Draft

#### E2E-047b：侧边栏会话悬停卡片呈现丰富元数据

- **前置条件**：一个保留的项目至少有两个会话，其中
  一个记录了 git 分支；还存在一个临时/草稿会话。
- **步骤**：1）悬停保留项目下的一个会话行并等待
  卡片出现；在同一行上用键盘焦点重复。2）从外部更改
  活跃项目的 Git 分支，然后切换到同一目录中的另一个
  会话并悬停其行；等待卡片。3）
  将指针移到另一个会话行而不离开侧边栏；等待。
  4）悬停一个临时/草稿会话行。5）将侧边栏调窄到
  320px 以下；再次悬停。6）在卡片可见时右键点击
  一个会话行并打开其上下文菜单。7）在卡片
  显示时滚动侧边栏主体。
- **预期结果**：卡片在 500ms 停留后出现，在
  指针快速掠过时绝不出现，指针变化时重新指向
  最新悬停的行。每张卡片显示：本地化的会话标题、
  模式/权限徽章、实时状态、已知时可读的模型显示名、
  项目名（草稿行显示 "Temporary" / "临时对话"），
  同一行上还有最新的 Git 分支，以及按当前语言
  格式化、不含秒的行 `Updated` 时间戳。普通
  会话不显示 Local 任务徽章、会话 UUID、单独的 Provider
  标签或带状态勾选的时间戳。刷新分支
  不会激活项目或更改所选会话。会话
  行没有原生 `title` 提示；悬停卡片是唯一的完整标题
  呈现面。卡片绝不加宽超过 320px，绝不导致其下方的行
  横向滚动，并在调整大小、滚动或打开
  上下文菜单时立即消失。
- **关联规格**：`04-ux/09-interaction-patterns.md §9.1b`
- **验收**：F（本地呈现）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`sidebar-navigation.test.mjs` 和
  `app-store-sidebar.test.mjs` 覆盖会话悬停卡片、分支刷新和
  原生行 `title` 的缺失）；完整 UI 场景为 Draft

#### E2E-048：置顶、归档、恢复和排序项目/会话行

- **前置条件**：两个保留的项目包含标题和创建/更新时间戳各不相同的
  会话；归档视图初始为禁用。
- **步骤**：1）查看静止状态的 Sessions 和 Projects 标题操作。2）
  悬停每个标题并用键盘聚焦每个操作，确认控件
  在不移动标签的情况下显现。3）查看 `Sessions` 工具栏并验证
  Sort 位于 New Chat 之前。4）打开 Sort 并查看其位置，
  然后依次选择 Recently updated、Created date、Oldest first 和 Name。
  5）置顶一个项目和一个会话。6）归档另一个会话
  和项目。7）启用 Show archived 并恢复两者。8）重启应用。
  9）通过独立的 Delete 操作删除一个可丢弃的会话。
- **预期结果**：分区创建和排序控件在静止时视觉上安静，
  在工具栏悬停或键盘聚焦时显现；项目 `+` 和溢出操作
  遵循相同规则且不移动标签。Sort 位于
  Sessions 工具栏中 New Chat 之前；排序菜单保持内容尺寸，向触发器
  右侧打开而不左翻，
  会话/项目/分区主体级菜单使用相同的右侧规则并带
  窄视口宽度上限。置顶行在每种所选次级排序下都位于
  未置顶行之前；在侧边栏中，置顶的项目行用实心强调色
  Star 替换 Folder，未置顶行保留 Folder。每种排序
  产生文档记录的稳定顺序；归档行从默认视图消失但
  保留转录/项目记录，并在 Show archived 中重新出现；恢复
  将它们带回所选顺序；归档活跃行会选中一个可见的
  非归档回退项，或创建文档记录的空回退项，而不是
  留下隐藏的活跃上下文；置顶/归档/排序选择跨重启保留；只有
  Delete 删除可丢弃的持久会话。旧的 `manual` 偏好
  安全加载，不暴露或暗示拖拽重排工作流。
- **关联规格**：`03-runtime/04-data-storage.md`、`04-ux/01-ui-ia.md`、
  `04-ux/08-component-spec.md`、`04-ux/09-interaction-patterns.md`
- **验收**：C（会话组织）、F（持久化）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`sidebar-preferences.test.mjs` 覆盖元数据、
  过滤和排序行为）；完整 UI 场景为 Draft

#### E2E-048b：编辑逻辑项目名称和文件夹根

- **前置条件**：一个保留的逻辑项目在侧边栏和
  Settings → Project archive 中可见；它有一个主文件夹和一个
  附加文件夹。
- **步骤**：1）在侧边栏中打开项目的溢出菜单并选择
  Edit project。2）更改名称，移除附加文件夹，并用
  原生文件夹选择器再次添加它。3）确认 Primary 行不可
  移除。4）保存并查看侧边栏行、Project archive 根和
  活跃工作区。5）重启应用并再次查看该分组。
- **预期结果**：两个项目菜单都提供 Edit project。编辑器保持
  焦点不逃逸，修剪名称，限制为 80 个 Unicode 字符，保留
  Primary 文件夹为第一行，并更新根计数而不移除
  其他行。保存持久化一个带调整后根的逻辑分组；
  名称跨重启保留，而归一化路径、工作区标识、会话
  和磁盘上的文件夹保持不变。带既有聊天的根被拒绝，
  而不是使这些聊天成为孤儿。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`
- **验收**：D（工作区标识）、F（本地呈现持久化）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`project-edit.test.mjs`、
  `sidebar-preferences.test.mjs`）；渲染场景为 Draft

#### E2E-048A：项目会话列表在最近十行后折叠

- **前置条件**：一个保留的项目包含超过十个
  更新时间戳各不相同的持久会话；侧边栏使用默认的
  Recently updated 排序；另一个保留的项目有十个或更少会话。
- **步骤**：1）查看大项目的会话行并计数。2）
  选择 **Load N more…** 控件。3）将排序切换为 Name，并在
  展开前查看同一分组。4）重启应用并再次查看该分组。
- **预期结果**：该分组默认恰好显示十个会话行，外加一个
  **Load N more…** 控件（N = 剩余会话数），样式与
  按时间分组的溢出一致；这十行是活跃排序
  顺序中的前几行，因此置顶行绝不会被推到未置顶行之后，
  Name 排序按字母折叠前十之后的一切；选择 Load more
  展开完整的按时间分组列表（Yesterday/Previous 7 days/Previous 14
  days/Older 标题按适用情况出现）且该控件消失；
  展开按分组进行并在重启时重置（不持久化）；十个或更少
  会话的项目不显示折叠控件。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/09-interaction-patterns.md`
- **验收**：C（会话组织）
- **里程碑**：M5
- **状态**：场景已记录

#### E2E-049：后台会话保持其来源工作区

- **前置条件**：项目 A 和 B 已保留；各包含一个 Agent 模式的会话；
  两个工作区包含同名相对路径但内容不同的标记文件。
- **步骤**：1）在会话 A 中开始一个读取标记并执行
  权限门禁长时工具的轮次。2）在 A 运行时，激活项目
  B 并打开会话 B。3）读取 B 的标记并仅在 B 中允许一个工具。4）等待
  两个轮次完成。5）打开一个临时会话并尝试
  需要工作区的工具。
- **预期结果**：切换标签页不中止任一轮次；A 的工具 cwd/路径沙箱
  保持为项目 A，B 的保持为项目 B；A 的事件和授权绝不
  出现在 B 的转录/会话中；每个侧边栏行报告自己的
  运行中/已完成状态；临时会话不继承任何项目并
  收到 `WORKSPACE_REQUIRED`；返回 A 恢复 A 的已完成
  转录。
- **关联规格**：`02-architecture/01-architecture.md`、
  `03-runtime/02-agent-runtime.md`、`03-runtime/03-tools-and-permissions.md`、
  `03-runtime/06-host-rpc-protocol.md`、
  `03-runtime/10-session-state-machine.md`、ADR 0016
- **验收**：C（并行会话）、D（工作区）、E（工具/权限
  隔离）、安全（工作区边界）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`rpc::tests` 覆盖项目绑定、临时和
  缺失会话的工作区解析）；完整多轮 UI 场景为 Draft

#### E2E-050：输入框模型 × 推理菜单遵循精确能力

- **前置条件**：一个已编目的推理模型、一个非推理模型，
  以及一个未知的自由形式模型 id。
- **步骤**：1）打开输入框的模型 × 推理徽章。2）确认根
  只包含带当前值的 Model 和 Reasoning level 条目。3）打开
  Model，搜索一个模型，并从一个 provider 分组中选择模型。4）确认
  菜单在根部保持打开，然后打开 Reasoning level 并选择多个
  受支持的级别。5）用非推理 provider 和未知
  自由形式模型 id 重复；演练 Escape、外部点击、Up/Down、Enter 和 Left。
- **预期结果**：徽章位于右侧工具栏，带 Bot 图标，位于
  独立的 prompt 增强 Sparkles 操作和 Send/Abort 之前；Off 省略
  级别文字。单个锚定菜单用
  就地返回行和子菜单替换其根，绝不打开标签页或第二个弹层，
  且总是重新打开在根部。Model 搜索过滤粘性 provider 分组；
  推理行来自所选模型的显式绑定级别，按
  规范顺序排列，使用单选语义和尾部勾选，并显示
  当前模型支持说明。选择任一值立即更新
  徽章和根值，清除模型过滤，并保持菜单打开。
  非推理或未知模型从 `off` 开始，但显式的 Settings
  绑定可使其配置的级别可用；发现机制绝不自动提升它。
  刷新发现的模型数据不能覆盖绑定。
  在第一条消息创建会话之前，输入框使用
  其模型菜单中选择的精确模型，而不是 provider 的默认
  模型；实体化之后，同一精确模型能力仍然
  生效。
- **关联规格**：`03-runtime/11-provider-model-system.md`、
  `03-runtime/12-provider-config-schema.md`、
  `03-runtime/13-model-catalog-and-selection.md`、ADR 0018、ADR 0027
- **验收**：B（模型配置）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`thinking-ui.test.mjs`、`composer-model-thinking-menu.test.mjs`、agent-runtime 能力测试）；完整 UI 场景为 Draft

#### E2E-051：思考级别随会话持久化

- **前置条件**：一个支持推理的会话处于空闲。
- **步骤**：1）选择 `high`。2）在不改变
  思考级别的情况下更改 Plan/Goal/Agent 模式。3）重启应用并重新打开会话。4）切换到
  另一个会话再切回。
- **预期结果**：每次配置更新都发送完整的会话配置；
  `high` 在权限模式变更、会话切换、宿主重载和
  应用重启后保留。
  v2 数据库将同一字段迁移为 `off`，且不丢失转录。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、`04-ux/08-component-spec.md`、ADR 0018
- **验收**：F（持久化）
- **里程碑**：M5
- **状态**：单元测试已覆盖（宿主 schema/会话测试、`thinking-ui.test.mjs`）；完整重启场景为 Draft

#### E2E-052：思考级别到达 pi 请求

- **前置条件**：带检测手段的推理能力 provider，级别集合稀疏，
  带请求捕获；一个会话配置在间隙之上和之下。
- **步骤**：1）选择每个启用的级别并运行一个 prompt。2）植入一个
  目录未发布的显式绑定级别并再次运行。3）用
  pi 编目的非推理模型重复，先无启用级别，然后
  在显式 Settings 选择加入之后。
- **预期结果**：主进程使用会话的实际模型 id 解析能力；
  输入框、主进程、sidecar 和 pi 在绑定的启用集合上使用相同的
  先向上/后向下钳制，不与目录求交。pi 收到生效级别，
  空或仅 `off` 的绑定收到 `off`，显式选择加入的端点收到
  配置的级别。模型特定的请求语义（包括自适应思考和
  `off` 是否可表达）与锁定的 pi 记录一致，无需桌面端
  重写。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/02-agent-runtime.md`、`03-runtime/13-model-catalog-and-selection.md`、ADR 0018、ADR 0027
- **验收**：B（模型配置）、C（聊天与流）
- **里程碑**：M5
- **状态**：单元测试已覆盖（agent-runtime prompt/钳制测试）；集成场景为 Draft

#### E2E-053：思考与答案分开流式输出

- **前置条件**：provider 在答案增量之前和之间发出思考
  增量。
- **步骤**：1）在浅色和深色主题下各开始一个轮次。2）观察
  仅思考阶段。3）让答案完成。4）切换折叠区，
  测试键盘焦点，启用减弱动态效果，并使用 Copy answer。
- **预期结果**：转录在仅思考流式输出期间打开；最新的
  Thinking 折叠区打开并更新，没有空答案气泡或
  重复的 Working 指示。如果用户折叠或展开它，该选择
  在后续思考增量和完成过程中保持权威。该
  折叠区使用转录表面、主题令牌、Sparkles/chevron
  触发器和左侧竖线，而不是内嵌卡片；折叠的内容脱离
  焦点遍历，减弱动态效果禁用运行中标记的脉冲和
  过渡。最终答案 markdown 单独渲染；Copy answer 不含
  思考文本。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `04-ux/07-ui-design-system.md`、`04-ux/08-component-spec.md`、ADR 0018
- **验收**：C（聊天与流）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`thinking-ui.test.mjs`、agent-runtime 事件测试）；完整流式场景为 Draft

#### E2E-054：已存思考无损重载

- **前置条件**：一条已完成的助手消息同时包含推理和
  最终答案块；另一条只包含推理。
- **步骤**：1）完成两个轮次。2）重启宿主/应用。3）重新打开
  会话。4）检查搜索结果和答案复制。
- **预期结果**：宿主在重载/导入/替换往返后返回相同的分离
  `thinking` 和 `content` 值；两条消息都保持
  可见；搜索和答案复制排除推理。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、`04-ux/08-component-spec.md`、ADR 0018
- **验收**：C（聊天与流）、F（持久化）
- **里程碑**：M5
- **状态**：单元测试已覆盖（宿主消息/导入测试、`thinking-ui.test.mjs`）；完整重载场景为 Draft

#### E2E-055：不支持的 provider 切换安全钳制

- **前置条件**：会话位于 `max` 级别的推理 provider 上；目标
  provider 包括非推理和稀疏级别变体。
- **步骤**：1）切换到非推理 provider。2）运行一个轮次。3）在
  先前级别附近切换到稀疏变体。4）发送缺少能力或思考字段的
  畸形/旧版负载。
- **预期结果**：非推理持久化并发送 `off`；稀疏变体在各处选择
  相同的最近级别；缺失字段安全回退；
  畸形思考不渲染，且绝不污染答案内容。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/13-model-catalog-and-selection.md`、`04-ux/08-component-spec.md`、ADR 0018
- **验收**：B（模型配置）、C（聊天与流）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`thinking-ui.test.mjs`、宿主校验测试）；完整 UI 场景为 Draft

#### E2E-056：工作面板外壳停靠与持久化

- **前置条件**：应用以任意工作区状态运行。
- **步骤**：1）重新启动并查看标题栏和应用菜单；确认
  面板初始为关闭，且存在一个固定在视口的工作面板开关
  （无会话时禁用）。按 Cmd/Ctrl+J 或点击开关，查看
  无资源的 New 启动器，然后再按/点击一次确认它
  折叠面板且不创建或删除标签页；第三次按下必须恢复相同的
  上下文。2）打开两个不同的文件产物、再次打开同一个第一个文件、
  一个 URL 预览和一个已完成的 Bash 行。3）验证头部是标签列表：
  打开足够多的标签页使其溢出，确认只有标签条滚动且 `+`
  触发器保持可见，激活滚动出视野的标签页，并用
  悬停/聚焦的 `×` 和中键点击关闭标签页。4）点击 `+` 两次并验证每次点击
  创建并激活一个独立的 New 启动器标签页。确认启动器主体
  包含 Review 以及每个在范围内的插件视图各恰好一次，作为可点击行；
  没有工作面板下拉或弹层。从一个 New 标签页点击 Browser 并
  确认该标签页打开原生插件界面且不改变其边界。
  5）关闭
  活跃的中间和边缘标签页并验证相邻标签被选中。关闭最后一个
  标签页并确认面板在 New 启动器上保持打开。6）使用
  视口固定的工作面板开关并触发另一个产物。7）在会话 A 中，
  让面板保持打开，带多个
  标签页和一个 Browser 资源；切换到会话 B，创建不同的标签页集合，
  然后在 A 和 B 之间反复切换，并选择一个没有活跃
  会话的项目。在不可见会话中生成一个后台产物。
  7）在其边界内向左和向右拖动内部左边缘手柄；验证
  按下指针不会跳动分隔线或调整原生窗口大小，用 Escape 取消一次
  手势，然后聚焦手柄并演练 Arrow/Shift+Arrow/Home/End。
  在 Browser 活跃时提交一个不同的面板宽度，双击分隔线并
  确认恢复默认 360px 宽度（或当它更小时的实时预算），
  然后再次提交一个不同的宽度。8）记录 MainChat 宽度
  和原生边界，同时执行打开、重复同一打开动作、调整
  面板大小、折叠、重新打开和关闭最后一个资源。在 Windows 上
  观察整个无边框窗口的同时重复折叠。9）在面板打开时，
  从每个原生边缘调整应用大小，确认只有应用
  边界改变；面板保持其渲染进程提交的宽度。从
  左边缘调整，并在切换侧边栏后重复。10）在小工作区上打开、
  调整大小和折叠，然后在最大化和全屏时重复。11）
  在显示器之间移动常规窗口并更改活跃显示器的
  工作区几何。12）发送有效和畸形的预留负载（
  包括正值），确认兼容接缝绝不改变
  原生边界。13）重新启动。
- **预期结果**：启动时不显示面板、欢迎选择器或固定工具按钮。
  窗口右上角的视口固定开关是 Cmd/Ctrl+J 的指针
  等价物；仍然没有应用菜单启动器。
  Cmd/Ctrl+J 以提交的宽度打开活跃会话的面板，
  不创建资源标签页，再次按下折叠它并保留该上下文；
  没有活跃会话或设置打开时快捷键不起作用。每个产物原子地打开
  停靠的第三列并创建或激活一个资源；文件资源以路径为键，
  重复资源去重。打开、折叠和
  关闭以有界的不透明度/滑动动画化面板的宽度/flex 分配，
  因此 MainChat 连续重排，无动画前跳动。
  打开面板、折叠它或提交分隔线调整都会在不产生
  原生窗口跳动的情况下更新呈现。头部是横向
  可滚动的标签列表，标签页稳定在 `92px–180px`，间距可见，`+`
  固定；标签保持可读而不是缩成一团，只有
  标签条滚动，活跃标签页滚动进入视野，关闭时先选中
  右邻再选左邻。New 启动器标签页将 Review 和在范围内的插件
  视图暴露为主体按钮，没有弹层遮挡或移动面板。点击
  启动器行将该 New 标签页替换为目的地，或激活其
  现有单例。关闭最后一个标签页让面板在 New 上保持打开。折叠
  保留运行时标签页但隐藏面板，直到另一个产物重新打开它。
  宽度遵循共享的三列预算，无固定像素上限，
  并通过面板分隔条预览其当前/最小/最大值。
  内部分隔线向辅助技术暴露面板宽度并支持
  文档记录的键盘步进。按下指针保留起始宽度，
  移动连续跟随指针，且仅当目标改变时释放才提交一次。
  Escape 或取消恢复按下时的宽度，
  双击在实时边界内恢复 360px 默认值。
  Browser 预览不拦截进行中的分隔线拖拽。
  A 和 B 各自独立恢复其运行时打开状态、有序标签页、活跃
  标签页和 Browser 资源；选择没有活跃会话的项目
  隐藏面板，且没有相对资源跨越会话/工作区上下文。
  后台产物只更新其保留的上下文，绝不改变
  可见面板或原生窗口几何。在退出动画之前，原生
  Browser 预览从窗口分离；折叠不产生陈旧的预览
  帧。重新启动后只恢复 `{width}`；每个会话的打开状态、
  标签页、活跃标签页和 Browser 资源重置。面板在打开时
  精确保持其提交的宽度，侧边栏或原生窗口变化不改变
  该首选面板宽度。兼容预留接缝对每个有效请求返回
  `{requested: 0, reserved: 0}`，包括正值的旧版值，
  且绝不改变原生边界。畸形负载以
  `INVALID_ARGUMENT` 失败且绝不强制转换。原先的上下文面板覆盖层
  不再存在。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、`04-ux/01-ui-ia.md`、
  `04-ux/07-ui-design-system.md`、`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`、ADR 0068、ADR 0151、ADR 0195、D207、D292、
  D357
- **验收**：F（持久化）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`work-panel-resize.test.mjs`、
  `work-panel-window.test.mjs`、`work-panel-presentation.test.mjs`、
  `work-panel.test.mjs`）；完整 UI 场景为 Draft

#### E2E-057：消息持有的审查历史在提交后保留并安全回滚

- **前置条件**：一个项目绑定的 Agent 会话，工作区可写；
  不要求 Git 仓库。
- **步骤**：1）让活跃 agent 在会话 A 中编辑一个现有文件并创建一个新
  文件。2）展开活动分组，直接在相应工具行之后查看每张审查卡片；
  验证每张卡片初始为折叠，其新增/修改状态和 +/− 计数显示在
  头部，然后展开它验证确切的 hunk。3）在应用外提交这些文件，
  关闭并重新打开 Review 面板，然后重载会话 A。
  4）验证相同的卡片
  和计数保留，因为它们来自转录消息。5）使用
  卡片的回滚操作，验证创建的文件被移除或之前的
  文件字节被恢复。6）在应用外再次编辑该文件并重试
  回滚；查看冲突结果并验证之后的字节保留。7）
  切换到会话 B 和一个后台项目会话，然后返回 A。8）
  用失败、被拒绝和草稿写入重复。
- **预期结果**：每次成功的工作区 Write/Edit 创建一条消息持有的
  审查记录和一张相邻的键盘可访问卡片；卡片绝不是
  底部/全局条目。完成不打开任何东西：面板保持
  用户留下的显示内容，Review 仅在用户打开后出现。
  每张审查卡片（内联的和 Review 标签页中的）
  默认折叠，按需展开。Review 标签页按时间顺序列出 A 的
  已记录变更，独立于 Git 状态、仓库
  存在与否、提交状态、焦点刷新
  或工作区切换。新增、修改和删除状态以及行
  增删和 hunk 在有有界证据时显示。
  成功的回滚将卡片更新为 Rolled back 并跨重启保留。
  工具后的文件变更返回 Conflict 且不覆盖它。失败、
  被拒绝和草稿写入不创建卡片；会话 B 不能继承 A 的
  记录。二进制或超大快照显示有界元数据，并在
  之前字节未保留时禁用回滚。
- **关联规格**：`03-runtime/01-ipc-protocol.md` §13a、
  `03-runtime/03-tools-and-permissions.md` §4c、
  `04-ux/08-component-spec.md` §5、ADR 0043
- **验收**：D（工作区）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`chat-review-entry.test.mjs`）；完整 UI 场景为 Draft

#### E2E-058：内置交互式终端不存在

- **前置条件**：一个工作区已打开，且 Agent 已完成一次 Bash
  工具调用。
- **步骤**：1）用 Cmd/Ctrl+J 打开工作面板，查看空
  状态和上下文菜单。2）确认没有 Terminal 标签页、启动器行、
  终端专属面板文案或终端 IPC 接口。3）确认
  已完成的 Bash 行仍显示其命令、输出、状态和复制操作，
  且其 `IconTerminal` 呈现保持可用。4）验证
  交互式 shell 在用户的外部终端中打开，而不是
  工作面板。5）构建/打包桌面应用并检查依赖和
  解包资源列表。
- **预期结果**：工作面板提供 Browser 和在范围内的插件视图，以及
  转录打开的 Review/文件资源；不创建 PTY，也无法打开
  终端标签页。Agent Bash 保持非交互并完整显示在
  转录中。交互式 shell 工作由外部
  终端执行。桌面打包没有 PTY/xterm 依赖、终端专属
  IPC 或原生终端负载，而通用的生命周期 `terminal` 值
  继续有效。
- **关联规格**：`02-architecture/02-tech-stack.md`、
  `03-runtime/01-ipc-protocol.md` §13a、`04-ux/08-component-spec.md` §5、
  ADR 0108
- **验收**：D（工作区）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`work-panel.test.mjs`、`packaging-footprint.test.mjs`）；
  完整 UI 场景为 Draft

#### E2E-059：内嵌浏览器预览隔离与覆盖层

- **前置条件**：本地开发服务器正在运行；存在 URL 或 BrowserPreview 产物。
- **步骤**：1）激活产物，输入不带协议的 `localhost:<port>` 并提交。
  2）导航站内链接；使用后退/前进/重载/停止。3）触发一个
  `window.open` 弹窗和一个请求权限的页面（例如通知
  提示）。4）打开全局搜索，然后打开 Settings。返回聊天
  并触发一个内联工具权限卡片。5）切换到另一个面板标签页
  再切回；关闭面板。6）使用 open-external。
- **预期结果**：无协议的输入归一化为 http；导航状态（URL 栏、
  后退/前进可用性、加载指示）与页面同步。弹窗仅在
  URL 可解析为 http(s) 或 mailto 时在默认浏览器中打开（绝不在应用内）；
  `file:`、`javascript:` 和自定义协议被拒绝。权限
  请求被拒绝；非 http(s) 导航被阻止，根内
  `file:` 同级除外。预览在每个阻塞性覆盖层下和
  卸载期间隐藏，之后以正确边界重新出现。内联权限
  卡片不隐藏或重新挂载预览；调整大小/拖拽保持原生视图
  可见并与占位矩形对齐，无黑色闪烁。打开
  工作面板上下文下拉菜单会移到原生视图旁；视图保持
  其完整表面矩形，插件主体不下移。
  Open-external 在默认浏览器中打开 http(s) 页面，根内
  文件预览通过 `openPath` 打开。视图使用隔离的 persist 分区
  （不与应用外壳发生会话泄漏）。
- **关联规格**：`03-runtime/01-ipc-protocol.md` §13a、ADR 0019、ADR 0168
- **验收**：质量、安全
- **里程碑**：M5
- **状态**：Draft（手动）

#### E2E-060：Files 标签页浏览保持在工作区内

- **前置条件**：工作区带有嵌套源码、大文件
  （>512KB）、图像和二进制文件的文件产物。
- **步骤**：1）激活每个文件产物，验证头部切换器中
  以路径为键的独立资源；浏览目录树，展开嵌套文件夹。
  2）打开一个源码
  文件、图像、二进制文件和大文件。3）使用 reveal-in-Finder。
  4）通过 devtools IPC 尝试穿越读取（`../outside`）。5）切换
  工作区。
- **预期结果**：目录惰性列出，文件夹在前，`.git` /
  `node_modules` / 构建输出被隐藏；文本以语法高亮
  渲染（上限 5000 行），图像内联预览，二进制和超大文件
  显示回退，reveal 仍可用。穿越尝试以
  `INVALID_ARGUMENT` 被拒绝；无工作区 → 空状态；切换
  工作区重置目录树和查看器。
- **关联规格**：`03-runtime/01-ipc-protocol.md` §13a、ADR 0019、
  `03-runtime/15-workspace-ignore-rules.md`
- **验收**：D（工作区）、安全
- **里程碑**：M5
- **状态**：单元测试已覆盖（`fs-panel-guard.test.mjs`）；完整 UI 场景为 Draft

---

#### E2E-059a：转录消息底板遵循 WorkBuddy 密度

- **前置条件**：一个会话包含至少一条短用户 prompt、一条
  较长用户 prompt 和一条已完成的助手答案；浅色和深色主题
  可用。
- **步骤**：1）在深色主题下打开会话。2）查看静止和悬停状态的
  用户行和助手行。3）开始一个流式助手答案。4）切换
  到浅色主题并重复。5）用键盘聚焦复制控件。
- **预期结果**：用户轮次右对齐，主题中性的柔和底板，
  上限约 560px，由各主题的主文字墨色派生而非强调
  色，带细边框；助手答案在 720px 内容带中保持
  透明全宽正文，包括流式输出期间——无左侧栏
  也无整轮 `--ds-tile`（D323）。tile 只属于
  子 agent/委派卡片（D319）。行距更密（~10px）。复制徽章
  静止时隐藏，悬停/内部聚焦时出现，并在
  用户轮次下保持右对齐。两个主题在用户底板上都保持
  可读对比度。
- **关联规格**：`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md` §8.3 / §8.4、`04-ux/10-workbuddy-benchmark-ux.md`、
  decisions-log D101、D323
- **验收**：C（聊天流）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`transcript-style.test.mjs`）；完整视觉场景为 Draft

#### E2E-060b：框架全局使用中性灰强调色

- **前置条件**：应用在深色和浅色主题下运行；插件页面和
  一个带 markdown 链接/引用块的聊天可用。
- **步骤**：1）查看焦点环、主按钮、开关、选中的
  会话环、插件市场主 CTA。2）打开一个带
  链接和引用块的助手答案。3）切换主题并重新检查。
- **预期结果**：不再有蓝色品牌强调色。交互强调色、markdown
  链接/竖线和插件主操作通过中性灰
  强调令牌解析（深色为 `white/gray`，浅色为深墨色）。插件
  已安装/市场 UI（标签页、搜索、卡片、权限弹窗和主/
  次按钮）只使用 `--ds-*` 令牌，任一主题中都
  没有蓝灰色回退；深色模式下按钮表面和墨色保持可见。语义
  成功/警告/错误颜色不变。
- **关联规格**：`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md`
- **验收**：质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`neutral-accent.test.mjs`、
  `plugins-page-style.test.mjs`）；视觉场景为 Draft

#### E2E-060c：助手 markdown 正文层级与代码框架

- **前置条件**：一条已完成的助手答案，包含标题、
  引用块、GFM 表格、带语言标签的围栏代码块、行内
  代码、任务列表和远程图像链接；浅色和深色主题可用。
- **步骤**：1）在深色主题下打开会话并滚动答案。2）
  悬停代码块复制控件和表格行。3）展开一个
  包含 markdown 的思考折叠区。4）切换到浅色主题并重新检查
  行内代码、引用块竖线和代码卡片的对比度。
- **预期结果**：答案正文使用 `.prose-chat` 层级（h1–h6 梯度、
  强调色渲染的引用块、细线边框的行内代码、斑马纹/悬停的表格
  外壳、带等宽语言标签的内嵌代码卡片）。宽 GFM 表格
  保持在转录列内：表头和单元格换行而不溢出。
  思考正文保持
  次级/更小，且不并入答案。两个主题都保持
  可读对比度；复制仍复制原始围栏文本。
- **关联规格**：`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md` §8.7
- **验收**：C（聊天流）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`user-select.test.mjs`、`thinking-ui.test.mjs`、
  `markdown-prose-style.test.mjs`）；完整视觉场景为 Draft

#### E2E-061：用户消息纯文本布局在换行和重载后保持

- **前置条件**：provider 已配置；输入框可通过
  Shift+Enter 接受多行输入（或 Enter 发送已禁用）。
- **步骤**：1）编写一个三行 prompt，含两个硬换行和一个
  编码路径比用户底板更宽的 URL。2）发送。3）查看转录中的用户
  气泡。4）复制用户消息并粘贴到外部
  编辑器。5）重载会话。
- **预期结果**：用户底板显示三个独立行（不折叠成
  单一段落）。链接的 URL 在底板内换行而不横向
  溢出，且每个续行与
  第一行保持逻辑起始对齐而不是居中。复制的文本保留原始
  换行。重载后相同的换行保留。
- **关联规格**：`04-ux/08-component-spec.md`
- **验收**：C（聊天流）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`transcript-style.test.mjs`）；完整视觉场景为 Draft

#### E2E-060d：助手元信息徽章、紧凑上下文摘要与重试操作

- **前置条件**：一条已完成的助手消息包含 modelId 和 token
  用量；另一条已完成的助手消息有内容但无用量。所选
  模型发布了 1m 级上下文窗口，而其 provider
  绑定仍包含旧的 128k 通用种子。
- **步骤**：1）打开会话。2）确认已完成的轮次在答案下显示
  模型徽章且无上下文检查器。3）悬停输入框
  工具栏的检查器触发器，确认面板保持关闭，然后点击它。
  4）查看剩余 token 加百分比标题、已用/窗口计数、
  无框的轮次/速度数值、一条内联 provider 用量摘要和一条
  聚合工具用量摘要，无重复的标题分隔线，无内部
  分区细线。5）在面板打开时滚动转录并调整窗口大小。
  在面板保持打开时切换侧边栏和工作面板并调整大小。6）将
  指针移离面板，然后通过再次点击触发器、
  点击外部和按 Escape 将其关闭。7）在
  浏览器预览产物上打开工作面板，打开
  上下文检查器，确认摘要保持在会话窗格内：
  完全可见、避开面板列，并在
  窄窗格中变窄而不是被裁切。8）在空闲时点击该轮次的 Retry。9）确认
  无用量的会话仍在已完成轮次上提供 Retry，且不显示
  输入框检查器。
- **预期结果**：存在模型 id 时，模型徽章出现在已完成的
  助手答案下。紧凑的 Context 检查器在存在任何用量后
  出现在输入框右工具栏、模型选择器左侧，并始终
  镜像最新的带用量助手轮次。触发器显示圆环
  加剩余容量百分比（无 Context 标签）和空间不足
  警告/错误状态；点击或键盘激活切换同一紧凑
  摘要，而仅指针悬停绝不打开或关闭它。打开的面板
  在指针离开后保持，并在第二次触发器激活、
  外部点击或 Escape 时关闭，焦点返回触发器。provider
  数值保持精确，工具数值通过 `~` 聚合总量保持
  可见的近似性，不渲染每个工具的列表、来源徽章、进度条
  或解释性估算段落。占用量、轮次总量和
  provider 缓存/输入/输出/推理/命中率取自最新的带用量
  助手消息，而不是工具循环的总和，因此缓存读取与
  上下文窗口保持同一量级。缓存命中率
  在缺少缓存读取元数据时省略，而不是推断。已发布的 1m 级
  上限（例如 `gpt-5.6-luna` 为 1,050,000 token）显示，而不是
  128k；同一生效窗口被 agent 运行时使用，非默认的
  Advanced 覆盖保持生效。生成速率保持为已完成轮次
  数值，流式输出期间不更新；Retry
  重发最近的先前用户 prompt，轮次运行时禁用；
  通过 portal 渲染的面板保持在会话窗格内，因此工作
  面板的原生浏览器或插件界面绝不能覆盖它，在
  窄窗格中变窄而不是越过该边缘，并在
  滚动或调整大小后跟随触发器；Copy 仍排除思考文本。
- **关联规格**：`04-ux/08-component-spec.md`、
  `04-ux/10-workbuddy-benchmark-ux.md`、`03-runtime/01-ipc-protocol.md`
- **验收**：C（聊天流）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`transcript-style.test.mjs`、
  `context-usage.test.mjs`、`latest-turn-context.test.mjs`、运行时
  用量映射）；完整场景为 Draft

#### E2E-061a：Regenerate 就地替换当前轮次

- **前置条件**：一个会话包含 用户 A → 助手 A → 用户 B → 助手 B。
- **步骤**：1）悬停助手 A 并点击 Regenerate。2）等待新
  轮次完成。3）重载会话。
- **预期结果**：转录在重做开始前截去助手 A / 用户 B / 助手 B；
  只剩用户 A 加新的助手/工具尾部。
  重新生成的答案不会把旧分支留在它上方。重载只保留
  截断后的分支。
- **关联规格**：`04-ux/08-component-spec.md`、
  `03-runtime/01-ipc-protocol.md`、`03-runtime/04-data-storage.md`
- **验收**：C（聊天流）、F（持久化）
- **里程碑**：M5
- **状态**：单元测试已覆盖（store/main 截断接线测试）；完整场景为 Draft

#### E2E-062：Regenerate 历史翻页器恢复先前变体

- **前置条件**：一个会话中某个助手答案至少重新生成过一次。
- **步骤**：1）在已完成的助手轮次上点击 Retry/Regenerate。2）
  在替换轮次开始时和完成后观察可见的根用户气泡。3）切换到先前的变体。4）再次向前
  切换。5）重载会话。
- **预期结果**：根用户气泡保持可见，并在该行被悬停或
  聚焦时在其操作工具栏内显示 `current / total` 翻页器；
  工具栏（包括翻页器）默认隐藏。Retry 不
  移动选择器，也不使其脱离该气泡。切换就地恢复
  归档的助手/工具分支。重载保留活跃变体
  和完整修订集。
- **关联规格**：`04-ux/08-component-spec.md`、`03-runtime/04-data-storage.md`
- **验收**：C（聊天流）、F（持久化）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`sessions::tests::save_and_activate_message_revision`、schema v4 迁移）；完整场景为 Draft

#### E2E-063：空主页保持主要任务界面聚焦

- **前置条件**：应用在空聊天主页（无转录）上运行，浅色
  和深色主题；窗口可调整为 ~1200×690 和 ~900×640。
- **步骤**：1）打开空主页。2）确认 hero 包含安静的 logo、
  本地化标题和简短的支持行。3）确认不渲染开发者入门
  卡片或上下文快捷操作行。4）关闭引导并
  再次查看。5）在另一主题中重复。6）调整到较矮高度，
  必要时滚动内容区域。
- **预期结果**：默认空状态保持 hero 和底部输入框为
  视觉锚点，可选引导是唯一的附加内容。
  关闭清单不留下空白占位。输入框保持在
  底部，不遮挡 hero 或清单，矮窗口中每个
  内容块都可通过滚动到达。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md`、`08-meta/decisions-log.md`（D111/D131/D204/D206）
- **验收**：质量（布局完整性）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`home-empty-layout.test.mjs`）；完整 UI 场景为 Draft

#### E2E-094：活跃轮次保持转录下方界面干净

- **前置条件**：一个确定性 agent 可为持久会话发出思考、
  工具开始/结束、流式答案、权限和终止事件；第二个
  会话可在后台运行。
- **步骤**：1）在可见会话中开始一个轮次。2）在 agent
  思考、使用工具和流式输出答案时观察转录。3）触发
  一个权限请求并查看审批卡片。4）在第一个会话继续时
  切换到第二个会话。5）完成后返回第一个会话。
- **预期结果**：轮次活跃期间，转录下方不出现通用的
  Understanding、Working、Checking 或完成卡片。助手和
  工具行保持内联；紧凑的运行状态行仅在它
  解释一个没有自己转录行的安静间隔时才可出现（provider
  等待/重试、压缩、静默轮次恢复、下一次
  请求前的间隙，或委派工作等待）。只有实际的权限请求
  渲染可操作的卡片。
  后台活动绝不改变可见会话、转录、输入框
  焦点或项目。
- **关联规格**：`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`、`03-runtime/10-session-state-machine.md`
- **验收**：C（聊天流）、质量（交互与无障碍）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`active-turn-surface.test.mjs`）；完整 UI 场景为 Draft

#### E2E-095：终止性失败暴露恢复路径且无成功卡片

- **前置条件**：一个确定性 provider 可用 `Glob` 从失败的
  目录 `Read` 中恢复，用一个工作区编辑完成一个轮次，并用
  可重试错误使另一个轮次失败；会话有可见的输入框。
- **步骤**：1）运行 失败-Read 后 成功-Glob 的恢复轮次并
  查看其活动分组。2）完成工作区编辑轮次。3）确认
  不出现成功结果卡片，并查看紧接变更工具行之后的
  内联审查卡片。4）展开内联卡片并验证
  其 hunk。5）提交
  编辑过的文件并确认记录的卡片保留，然后使用一次
  回滚。6）触发可重试的失败。7）查看失败卡片，然后
  选择 Retry。8）开始另一个新 prompt 并查看旧卡片。
- **预期结果**：恢复的轮次让失败的 Read 在自己的行上保持可见，
  将所属分组标记为已处理，完成其会话结果，且
  不显示失败卡片。完成以转录和内联审查卡片
  作为证据，不添加 "Task complete" 卡片。文件状态、计数
  和 hunk 在提交后保留在相邻卡片上，受保护的回滚
  恢复工具前状态。失败表明已有工作保留，
  暴露 Retry 和 Continue，且重试保留最新的 prompt。新轮次
  清除先前的失败卡片；中止不产生失败结果文案。
- **关联规格**：`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`、`03-runtime/10-session-state-machine.md`、
  ADR 0069
- **验收**：C（聊天流）、质量（完成与恢复）
- **里程碑**：M5
- **状态**：单元测试已覆盖（`assistant-turns.test.mjs`、
  `interaction-performance.test.mjs`、`turn-outcome-card.test.mjs`）；完整 UI
  场景为 Draft

#### E2E-064：持久通知收件箱记录任务终止结果

- **前置条件**：存在两个持久会话；一个确定性 provider 可
  完成一个轮次、以稳定错误码使一个轮次失败、中止一个
  轮次；通知收件箱初始为空。
- **步骤**：1）聚焦并查看会话 A，然后在 A 中完成一个轮次。2）在
  仍聚焦 A 时，使后台会话 B 的一个轮次失败。3）取消窗口
  焦点并在 A 中完成另一个轮次。4）中止第四个轮次。5）重复每个
  终止 RPC。6）确认主标题栏没有铃铛，然后打开
  展开侧边栏底部的铃铛，并在 All 和 Unread 之间切换。7）将一行
  标记为已读，确认其会话没有终止侧边栏标记，然后
  关闭/重新打开弹层并重启应用。8）从其带终止标记的
  侧边栏行选择另一个会话。9）生成一个带 205 个
  合格终止轮次的宿主夹具。10）使用 Mark all read，然后 Clear。
- **预期结果**：A 可见且为当前的完成不创建行或终止侧边栏标记。恰好存在两行，
  最新在前：未聚焦的 A 完成和后台 B 失败，
  带本地化标签、快照的会话标题和 B 的稳定错误码。
  中止/重复的终止调用不创建行。原先的底部 Help 快捷键
  不存在；32px 底部铃铛及其向上打开的弹层替代了它。
  徽章和 Unread 显示精确的未读数，打开弹层不会隐式
  将行标记已读。已读状态和两条
  记录跨重启保留。选择行将其标记已读并激活其绑定的
  项目/会话。夹具恰好保留最新的 200 行。Mark all
  保留行且未读数为零。选择另一个会话清除其
  终止侧边栏标记并将其任务通知标记已读；两个标记
  在刷新或重启后都不再出现。Clear 只清空收件箱，
  会话、轮次和转录保持完整。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、`03-runtime/01-ipc-protocol.md`、
  `04-ux/07-ui-design-system.md`、`04-ux/08-component-spec.md`、
  `08-meta/decisions-log.md`（D117/D130）
- **验收**：C（轮次完成）、F（持久化）、质量
- **里程碑**：M5
- **状态**：Draft

#### E2E-065：原生任务通知仅在未聚焦时发出并激活会话

- **前置条件**：支持原生通知；会话 A 和 B
  存在；主窗口可聚焦、取消聚焦、隐藏和最小化。
  Windows 运行使用 NSIS 安装的应用或标准开发命令。
- **步骤**：1）保持应用聚焦在 A 上并在 A 中完成一个轮次。2）在
  仍聚焦 A 时，在 B 中完成一个轮次。3）在 A 仍为当前会话时
  取消应用聚焦，并在 A 中完成另一个轮次。4）让 A 的通知进入
  操作系统通知中心，然后点击它。5）
  最小化应用，使另一个轮次失败，并点击其原生通知。6）
  取消应用聚焦并中止一个轮次。7）在原生投递被
  操作系统抑制的情况下重复。8）在 Windows 上，检查原生通知的归属、
  通知设置入口、任务栏分组、已安装可执行文件和开始
  菜单快捷方式。
- **预期结果**：聚焦且为当前的 A 既不创建收件箱行、终止侧边栏标记，也不创建原生横幅。
  聚焦的后台 B 创建收件箱行而无原生横幅。未聚焦的
  当前 A 和最小化时的失败各创建一条持久行和一条
  本地化原生通知。点击会恢复、显示并聚焦
  主窗口，然后激活匹配的会话，包括在
  通知已进入 Windows 操作中心之后；没有任何事件打开错误的
  当前选中会话。中止两个界面都不显示。操作系统抑制不会
  丢失持久行，也不显示误导性的应用错误。每个被检查的
  Windows 系统界面都标识为 `PI-Desktop`；不暴露
  原生 Electron 默认应用名或标识。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `04-ux/07-ui-design-system.md`、`04-ux/09-interaction-patterns.md`、
  `08-meta/decisions-log.md`（D117/D141）
- **验收**：C（轮次完成）、质量
- **里程碑**：M5
- **状态**：源代码契约已覆盖（`notification-contract.test.mjs`）；打包
  Windows 操作中心激活仍需 runner 验证；完整 UI 场景为 Draft

#### E2E-066：provider 模型目录在重启和离线刷新后保留

- **前置条件**：一个已保存的 provider 匹配 models.dev 的 provider/API URL，
  且至少有两个目录模型；一个确定性夹具可使
  `https://models.dev/api.json` 不可用，也可使 provider
  发现端点不可用。
- **步骤**：1）打开 provider 模型选择器，确认 models.dev 模型
  名称、限制、能力徽章和来源标签出现。2）检查
  网络夹具，确认 provider API key 绝不发送给 models.dev。
  3）退出并重启应用。4）断开 models.dev 和 provider
  端点。5）打开输入框模型菜单并等待刷新回退。
  6）只重连 provider 端点，带一个自定义模型，然后重新打开
  选择器。7）预热一个已知和一个未知模型的查找，然后
  用更改过的元数据和先前未知的模型刷新目录夹具。
  8）在使该目录刷新失败后重复。
- **预期结果**：首次打开选择器渲染配置/provider 缓存，
  而不是从空列表开始。重启时，使用随附的 models.dev
  发布快照，无需网络访问。失败的 Settings 刷新
  保留该内存快照；自定义 provider 随后仅对
  models.dev 中不存在的 ID 回退到其端点，最后回退到配置的
  绑定。离线刷新保留每个缓存/配置的条目。
  成功的 provider 发现可将归一化 ID 持久化到 Rust 持有的 SQLite，
  但不能替换 models.dev 元数据或用户定义的绑定。
  成功的目录刷新同时替换缓存命中和缓存未命中；
  失败的刷新保留先前结果。编辑模型绑定或
  更改默认 provider/模型无需重启应用即生效。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/12-provider-config-schema.md`、
  `03-runtime/13-model-catalog-and-selection.md`、`04-ux/08-component-spec.md`
- **验收**：B（模型配置）、F（持久化）、质量、安全
- **里程碑**：M5
- **状态**：单元测试已覆盖（`providers::tests`、`model-cache.test.mjs`、
  `models-dev-catalog.test.mjs`）；完整重启/离线 UI 场景为 Draft

#### E2E-080：Models.dev 元数据与通用未知模型

- **前置条件**：models.dev 夹具中存在一个带
  限制、模态和推理选项的 provider/模型。第二个夹具包含一个
  provider 发现但 models.dev 中不存在的模型 ID。
- **步骤**：1）打开 provider 模型选择器并选择夹具模型。
  2）确认其 models.dev 名称、上下文/输出限制、能力徽章、
  模态、成本字段和思考级别。3）开始一个短轮次并
  检查 sidecar 模型快照/请求元数据。4）使用 Settings → Model
  configuration 强制刷新 models.dev，确认新记录
  可见，且不更改随附文件、不写入用户缓存。5）用
  models.dev 中不存在的 ID 重复。
- **预期结果**：匹配的 models.dev 记录是权威的，包括其
  `limit`、`modalities`、`reasoning_options`、`tool_call`、
  `structured_output`、日期和成本字段；不向
  目录发送任何 provider 秘密。当供应商/API 身份明确无歧义时，
  带供应商前缀的记录匹配配置模型 ID 省略前缀的 provider。
  支持 PDF 的模型在其模态元数据中显示 PDF；PDF 附件保持为
  有界的文件引用，直到所选传输暴露原生 PDF 块。
  provider 发现或显式配置但 models.dev 中不存在的 ID 仍可
  以通用纯文本、非推理形态运行；pi-ai 只提供
  所选的线路适配器、OAuth 流程和账户模型可用性。
  ChatGPT Plus/Pro 或 GitHub Copilot 账户列出
  锁定 pi-ai 0.85.1 目录中的 `gpt-6-astra`；models.dev 随后
  提供其发布的元数据。
- **关联规格**：`02-architecture/02-tech-stack.md`、
  `03-runtime/11-provider-model-system.md`、
  `03-runtime/13-model-catalog-and-selection.md`、ADR 0134
- **验收**：B（模型配置）、C（会话与流）、安全
- **里程碑**：M5
- **状态**：单元测试已覆盖（`model-capabilities.test.ts`、
  `models-dev-catalog.test.mjs`）；完整 UI 场景为 Draft


#### E2E-067：平台应用菜单与窗口框架

- **前置条件**：原生 macOS、Windows 和 Linux runner；已构建的桌面
  应用；英语和 zh-CN 语言可用。Windows/Linux 测试装置可在启动前设置
  `PI_DESKTOP_START_MAXIMIZED=1`，使主进程在渲染进程挂载前最大化隐藏的
  原生窗口。
- **步骤**：1）在 macOS 上，分别启动 `pnpm dev` 和打包构建。确认
  应用菜单标题是 PI-Desktop，打开 About PI-Desktop，并检查
  其名称、版本和图标。然后打开每个系统菜单并调用 New Task、Open
  Project、Settings、全局搜索、侧边栏切换、编辑、
  缩放/全屏、Window、Help、Logs 和 Check for Updates 操作。验证
  更新状态报告当前夹具版本已是最新。
  2）在 Windows/Linux 上，确认窗口内不出现 File/Edit/View/Window/Help 菜单栏，
  左侧导航占据回收的标题栏空间。验证 F10 和 Shift+F10 不被外壳框架消耗；
  演练 New Task、Open Project、Settings、关闭窗口、缩放、全屏、
  全局搜索（Cmd/Ctrl+K 和 Cmd/Ctrl+Shift+P）、侧边栏和标准编辑快捷键。从
  Settings -> Info 调用 Check for Updates，结果与上述状态相同。
  3）关闭 macOS 窗口，立即调用两个原生菜单
  命令，并在替代窗口加载后确认渲染进程就绪。
  验证每个命令只有一个窗口和一次投递。4）在 Windows/Linux 上，从
  主聊天、Settings 和打开的工作面板重复。在工作面板
  打开时，确认视口固定的开关和原生窗口控件保持在
  窗口右边缘、位于面板头部之上，资源切换和
  关闭操作在其左侧的面板菜单中保持可用，且
  原生窗口控件本身仍接受悬停和点击——点击
  控件不得移动窗口。在
  主聊天中发送第一条用户消息，确认其完整气泡起始于
  46px 标题栏控件条带之下。打开 Extensions 页面并确认其头部
  操作，以及详情页的关闭按钮，也起始于该条带之下
  并接受自己的点击而不是移动窗口。点击每个右侧控件的中心以及
  顶部、底部和
  面向标题栏的边缘，以最小化、最大化、
  还原和关闭窗口。5）在
  原生窗口已最大化时启动渲染进程，并检查
  初始查询到的字形/状态。6）在窗口存在时和关闭后尝试未知的
  菜单/窗口 IPC 操作。7）在各自的
  原生 runner 上从干净的发布宿主目录构建每个目标。在 Windows 上，检查
  已安装应用的任务栏按钮和开始菜单快捷方式图标。
- **预期结果**：macOS 开发和打包启动都显示 PI-Desktop 为
  原生应用标识，About 面板使用规范的
  PI-Desktop 图标；两个界面都不暴露 Electron 默认名称或图标。
  macOS 遵循原生菜单约定和快捷键。
  Windows/Linux 窗口内不显示应用菜单；导航和
  右侧控件不与拖拽区域冲突，键盘快捷键
  保持可用，且非 Settings 路由上存在
  视口固定的工作面板开关（不是应用菜单命令）。面板
  打开时，原生控件条带和该开关覆盖在面板头部之上；
  头部在条带之前结束其盒区域，因此资源标签页和关闭控件避开
  开关，窗口控件和资源关闭都不位于拖拽
  矩形之下。Check for Updates
  从 macOS 系统菜单和 Settings 界面调用白名单内的更新命令，
  并显示已是最新状态。替代窗口
  命令等待渲染进程就绪，而不
  创建重复窗口或丢失事件。Main、Settings 或工作面板的
  拖拽矩形都不与保留的控件区重叠。120px 控件条带在
  浅色和深色主题中都是不透明的 `bg-primary` 表面，并有 8px
  视觉缓冲将其与相邻的工作面板操作隔开，因此目的地
  内容绝不透过它渗出。窗口控件在其完整的
  46px 高热区内保持可点击，匹配原生状态，并
  有无障碍名称；第一条用户或助手转录行绝不
  绘制在它们之下，Extensions 页面头部操作和
  插件详情页关闭按钮也不会。标题栏和右侧控件条带
  共享一条连续的 1px `border-subtle` 分隔线；控件条带的
  前缘分隔线使用同一令牌，其底边不会
  消失在窗口按钮之下。未知操作失败关闭。已安装的 Windows
  任务栏按钮和开始菜单快捷方式使用 PI-Desktop 图标，绝不使用
  Electron 默认图标。每个包包含目标原生的宿主二进制
  （`.exe` 仅在 Windows 上）。在 Windows/Linux 上通过此场景证明
  外壳就绪，而非首次发布资格。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `04-ux/01-ui-ia.md`、`04-ux/02-i18n-english-first.md`、
  `04-ux/07-ui-design-system.md`、`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`、`06-delivery/06-release-runbook.md`、
  `08-meta/decisions-log.md`（D118、D121、D129、D357）
- **验收**：A（应用启动）、质量
- **里程碑**：macOS 上为 M5；Windows/Linux 上为 post-MVP 发布资格
- **状态**：单元测试已覆盖（`window-menu.test.mjs`、
  `development-branding.test.mjs`）；Electron 启动探针覆盖
  平台桥、原生菜单安装，以及 Windows/Linux 上的
  渲染前最大化夹具；原生视觉场景为 Draft

#### E2E-143：关闭行为只询问一次且保持可配置（D230）

- **前置条件**：Windows/Linux 运行，数据目录干净（无
  `close-behavior.json`）；主窗口可见；Settings → General
  可到达。macOS 排除在外：它保留原生 Dock 生命周期。
- **步骤**：1）在偏好未设置时，点击关闭按钮（或按
  关闭窗口快捷键）并回答提示：Cancel 保持窗口
  打开且偏好不设置；Close to tray 隐藏窗口、显示
  托盘图标，应用保持运行（进行中的轮次保持活跃）；Quit
  退出应用。2）重跑每个选择，验证它在
  完整重启后被记住，且一旦存在选择就不再出现第二次提示。
  3）在设置为 `tray` 时，点击托盘图标：窗口
  恢复、显示并聚焦；托盘上下文菜单提供 Open 和 Quit，
  Quit 退出应用。4）在 Settings → General 中，在 Close to
  tray / Quit app 之间切换，验证下一次关闭遵循新
  选择，D216 托盘图标在两种情况下都保持常驻，未设置的
  偏好不显示任何选择，且搜索能匹配
  该行。5）在存储了 `quit` 时，重启并关闭窗口：即使
  托盘图标存在，应用也退出。6）在任意设置下，于
  Windows/Linux 上使用渲染进程的最小化控件，验证原生任务栏
  条目保持可用并恢复同一窗口；在 macOS 上验证其
  原生最小化仍隐藏到托盘。Windows 任务栏开关
  由 E2E-124 单独覆盖。7）对
  `pi-desktop/window/closeBehavior/set` 调用未知值和 `"ask"`，
  验证它们失败关闭，并验证该通道在 macOS 上被直接拒绝。
- **预期结果**：首次关闭在每个未设置状态下恰好提示一次，
  Cancel 绝不持久化选择。托盘模式保持应用存活，
  带本地化的提示/菜单且无数据丢失；切换到 Quit app 后
  托盘图标保持原位，因为 close-to-tray 和 macOS 最小化仍需要
  恢复入口。偏好跨重启保留，并被
  窗口控件关闭按钮和关闭快捷键共同遵守，存储的 `quit`
  通过有序的 `before-quit` 关机退出，而不是依赖
  `window-all-closed`。Windows/Linux 渲染进程最小化保持任务栏原生；
  macOS 原生最小化保持托盘常驻；边界看门狗绝不
  强制恢复已最小化或托盘隐藏的窗口。自动化启动探针
  （`app.quit`）退出时不提示。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `04-ux/01-ui-ia.md`、`04-ux/09-interaction-patterns.md`、
  `08-meta/decisions-log.md`（D216、D230、D256）、ADR 0078、ADR 0090、
  ADR 0123
- **验收**：A（应用启动）、质量
- **里程碑**：Windows/Linux 上为 M5（发布资格）
- **状态**：Draft

#### E2E-204：显式退出在关机前确认（D363）

- **前置条件**：一个正常的交互式会话正在运行（不是启动、
  监督或捕获探针）。主窗口可以可见或托盘隐藏。
- **步骤**：1）从托盘菜单选择 Quit，或按 Cmd+Q /
  应用菜单的 Quit 项。2）取消原生警告，确认
  窗口、托盘、host-core 和 sidecar 保持。3）重复并确认 Quit；
  确认有序关机运行。4）在 Windows/Linux 上关闭行为
  未设置时，关闭窗口并在 D230 对话框上选择 Quit；确认没有
  第二个警告。5）以 `PI_DESKTOP_BOOT_PROBE=1`（及
  监督/捕获的等价物）启动，确认 `app.quit()` 退出而无
  对话框。6）在打包的 Windows NSIS 或 Linux AppImage 安装上，下载
  更新并选择 Restart to update；确认退出警告绝不出现，
  安装程序完成升级并重新启动。
- **预期结果**：意外的显式退出可取消。已经在关闭行为
  对话框上选择了 Quit 的用户不会被再次询问。自动化
  使用的探针绝不阻塞在该警告上。应用内更新重启也绝不
  被推迟到警告之后：平台安装程序在
  `app.quit()` 之前启动，且一旦应用存活超过其等待窗口就中止，因此
  更新触发的退出必须立即运行有序关机——用户
  已经通过选择该操作承诺了重启。
- **关联规格**：`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`、`08-meta/decisions-log.md`（D216、D230、
  D363）、ADR 0022
- **验收**：A（应用启动）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`close-behavior-tray.test.mjs` 断言
  探针和更新重启豁免；`auto-update.test.mjs` 断言
  安装锁存在 `quitAndInstall` 之前设置）；原生对话框旅程为 Draft
  （仅在此界面变化时于有能力的环境中运行）

#### E2E-067A：预发布安装发现更新的稳定版本（D120）

- **前置条件**：打包构建，其内嵌版本是预发布版本，如
  `0.2.0-rc.6`；GitHub Releases 的最新稳定标签更新（例如
  `0.2.2`），且已发布 `latest*.yml` feed。
- **步骤**：1）启动打包的预发布安装。2）等待
  自动检查，或从应用菜单 / Settings → Info 调用 Check for Updates。
- **预期结果**：更新状态报告 `available`（手动平台），或
  对打包的 macOS、Windows NSIS 和 Linux AppImage 走完应用内下载流程，
  `availableVersion` 等于更新的稳定标签。
  Windows portable 运行（`PORTABLE_EXECUTABLE_FILE`）保持
  手动通知加链接路径，且不得下载或运行 NSIS 安装程序。
  客户端不得仅因为没有更新版本共享同一 `rc` 预发布通道
  就报告已是最新。
- **关联规格**：`04-ux/09-interaction-patterns.md`、
  `05-security/01-security.md`、`08-meta/decisions-log.md`（D120）、
  ADR 0022
- **验收**：A（应用启动）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`auto-update.test.mjs` 断言
  `allowPrerelease = false`）；打包发现场景为 Draft

#### E2E-067B：随发布语言的更新说明与完整更新日志对话框（D164/D345/D349）

- **前置条件**：随发布的 `packages/shared` CHANGELOG 包含对齐的
  `en`、`zh-CN`、`zh-TW` 和 `ko` 稳定历史；产品语言可
  切换。
  对于紧凑更新路径，使用带已编目 `availableVersion` 的
  打包或夹具更新器状态。
- **步骤**：1）在无可用更新时，打开 Settings → Info 并打开 Release
  notes。2）查看完整历史、当前版本标记、滚动，
  以及通过关闭控件、Escape 和背板的关闭行为。3）强制或等待
  更新发现，使状态为手动 `available`、应用内 `downloading`
  或 `downloaded`；查看常驻横幅和 Settings Updates 行，然后
  重新打开 Release notes。4）将 UI 语言切换为 zh-CN，再 zh-TW，再 ko，
  并在不调用新检查的情况下重新查看。5）用目录中
  不存在的版本重复紧凑更新路径。
- **预期结果**：`UpdateState.releaseNotes` 是由主进程从
  随发布语言目录中选取的纯多行产品亮点——绝不是
  渲染进程提供的 URL。两个界面在说明存在时显示
  本地化的 "What's new" 块，不存在时隐藏。语言切换为同一版本
  刷新说明。Release notes 操作在每种更新器状态下都保持可用，
  并打开本地化的、最新在前的模态框，包含每个
  随发布的稳定条目，存在时标识当前版本和可用版本。
  模态框困住焦点，关闭后恢复焦点，且不暴露
  新的 IPC 域或 feed 配置。
- **关联规格**：`04-ux/06-settings-ia.md`、`04-ux/09-interaction-patterns.md`、
  `05-security/01-security.md`、`06-delivery/06-release-runbook.md`、
  `08-meta/decisions-log.md`（D164）、ADR 0022
- **验收**：A（应用启动）、质量
- **里程碑**：M5
- **状态**：单元测试已覆盖（`auto-update.test.mjs`、`changelog.test.ts`）；
  打包 UI 场景为 Draft

#### E2E-067C：发布版本界面预检阻止未对齐的标签（D260）

- **前置条件**：当前稳定版本处的干净工作树。尚未为候选版本
  创建发布标签。
- **步骤**：1）在对齐的树上运行 `node scripts/check-release-docs.mjs`。
  2）每次回归一个界面——从 `en` 移除最新的更新日志条目，
  再从 `zh-CN` 移除，然后更改亮点计数使各语言不一致，
  再将 `docs/package.json` 设为旧版本，再让 README
  保留先前的 `<major>.<minor>.x` 发布行——并在每次之后重跑
  预检。3）在一个界面仍回归的情况下运行
  `node scripts/release.mjs <next-version> --tag`。4）恢复每个界面，
  重跑预检，并重复发布命令。
- **预期结果**：对齐的树报告对齐并以 0 退出。每个回归
  按名称报告，带违规文件和预期版本，并以
  非零退出。存在回归界面时，`release.mjs` 会提升文件版本，
  但既不创建发布 commit 也不创建标签，并说明文档检查
  失败。恢复后预检通过，发布命令
  继续提交和打标签。`--skip-docs-check` 仅绕过该检查，
  并记录为非发布用途。
- **关联规格**：`06-delivery/06-release-runbook.md` §4.1、
  `06-delivery/05-change-checklist.md`、`06-delivery/03-ai-development-workflow.md`、
  `08-meta/decisions-log.md`（D164、D260）
- **验收**：质量（发布流程）
- **里程碑**：M5
- **状态**：脚本已覆盖（`scripts/check-release-docs.mjs`）；手动发布
  演练为 Draft

#### E2E-068: 将一段会话分叉为独立会话

- **前置条件**：一个空闲的项目会话包含用户、助手、
  思考与工具历史，且至少有一个重新生成变体。另一个
  源会话正在运行。一个临时会话和两个已保留的项目工作区
  各自含有不同的同名标记文件。空闲源会话
  持有一个会话级工具授权。
- **步骤**：1) 用键盘打开空闲会话的溢出菜单。2)
  选择创建分支。3) 在子会话中追加一条提示词并更改模型/模式。
  4) 切换可见工作区，回到子会话并读取标记。
  5) 触发此前已授权的工具并验证会请求确认。
  6) 重新打开源会话。7) 重启应用并检查两个会话。8) 打开
  运行中会话的溢出菜单。9) 分叉临时会话
  并调用一个需要工作区的工具。
- **预期结果**：一个本地化的分支标题出现在同一项目分组中，
  并被激活且聚焦到输入框。其可见的活动转录与持久化的
  项目/提供商/模型/模式/思考/权限配置与
  源快照一致，但重新生成分页器历史不存在。子会话的消息与
  后续配置更改不影响源会话；两者都能在重启后存活。
  运行中的源会话上的该操作被禁用。不会复制任何轮次、通知、产物、
  权限授予、修订或临时文件。
  标记在子会话继承的项目下解析；临时会话的子会话
  仍无路径，并返回 `WORKSPACE_REQUIRED`。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/04-data-storage.md`、`03-runtime/06-host-rpc-protocol.md`、
  `04-ux/01-ui-ia.md`、`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`
- **验收**：C（会话）、D（工作区）、F（持久化）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`sessions::tests::fork_session_clones_active_transcript_and_configuration`、
  `session-fork.test.mjs`）；完整重启 UI 场景为草稿

#### E2E-071: 分叉一条助手回复而不改变其来源

- **前置条件**：一个空闲会话包含两轮已完成的用户/助手
  交互，且第二条助手回复带有缓存令牌用量元数据。
- **步骤**：1) 悬停第一条助手回复并检查其工具栏。2)
  点击分叉。3) 确认被激活的子会话在该回复处结束，并追加一条
  提示词。4) 重新打开源会话并检查。5) 向子会话追加一条提示词，
  重启，然后检查源会话与子会话。6) 在源会话运行时重复上述操作。
- **预期结果**：已完成助手消息的工具栏只包含复制、分叉和
  重新生成——没有删除也没有编辑（D137 已将编辑移到用户轮次）。源会话
  轮次进行中时分叉被禁用。它会激活一个独立标题的会话，
  其历史在所选回复处截止；后续的源会话轮次不存在。
  源文本、版本历史、令牌元数据、后续轮次、运行时与缓存
  状态保持不变。继续子会话只影响该子会话，
  并从其自身重映射后的转录重新播种。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/04-data-storage.md`、`03-runtime/06-host-rpc-protocol.md`、
  `04-ux/08-component-spec.md`、`08-meta/decisions-log.md`（D134、D137）
- **验收**：C（聊天流/会话）、F（持久化）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`sessions::tests::message_scoped_fork_stops_at_selected_assistant_response`、
  `session-fork.test.mjs`、`transcript-style.test.mjs`）；完整重启 UI 场景为草稿

#### E2E-071b: 分叉会话在首个 AI 轮次完成后保留消息

- **前置条件**：一个已完成的会话，至少有两轮用户/助手
  交互。会话历史窗口特性已启用（有界加载）。
- **步骤**：1) 从侧边栏溢出菜单分叉该会话。2) 在
  分叉会话中发送一条新提示词并等待 AI 回复完成。
  3) 在 agent_end 触发后观察转录。4) 点击侧边栏中的分叉会话
  条目（重新选择）。5) 重启应用并重新打开该分叉。
- **预期结果**：agent_end 之后，所有分叉消息加上新的用户
  提示词和 AI 回复仍然可见。从侧边栏重新选择该会话
  显示相同的消息（不会闪现空状态）。重启后消息仍然
  持久存在。会话历史窗口为 `{ messageStart: 0, hasMoreBefore: false }`。
- **关联规格**：`03-runtime/04-data-storage.md`、`04-ux/01-ui-ia.md`
- **验收**：C（聊天流）、F（持久化）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`session-fork.test.mjs`
  `fork actions commit the child through one durable helper`）；UI 场景为草稿

#### E2E-071c: 分叉过程中发生的导航不会丢失分支

- **前置条件**：一个已完成的会话，包含若干轮交互，
  且侧边栏中至少还有一个其他会话。
- **步骤**：1) 在源会话上开始“从此处分支”。2) 在分叉
  请求尚未完成时，立即点击侧边栏中的另一个会话（或
  按下历史后退快捷键）。3) 等待两者都稳定。4) 检查
  侧边栏。5) 打开该分支并滚动其转录。
- **预期结果**：后发生的导航赢得视图，而该分支仍
  以其标题列在侧边栏中，无需手动刷新。打开它时会
  从缓存显示完整复制的转录。没有任何内容丢失，
  且重复分叉也不会出现重复的分支行。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、`03-runtime/04-data-storage.md`
- **验收**：C（聊天流）、F（持久化）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`session-fork.test.mjs`
  `a fork is recorded even when a newer navigation took over`）；UI 场景为草稿

#### E2E-071d: 打开长会话保持响应并显示其最新轮次

- **前置条件**：一个会话，其转录远长于
  渲染器页面大小（数百条消息，包括大型工具结果）。
- **步骤**：1) 从侧边栏打开该长会话。2) 观察首个
  绘制帧和滚动位置。3) 滚动到顶部边缘以分页加载更早
  历史，反复进行，直到到达第一条消息。4) 切换到另一个
  会话再切回，记录返回时的帧和偏移。5) 向上滚动一个
  可度量的距离，切走，再切回。6) 发送一条新提示词并
  让其完成。
- **预期结果**：会话在其最新轮次处打开，不出现空白
  帧或历史顶部帧，且随着会话增长，打开它不会有
  可见的变慢。每次加载更早页面都在前方插入，而不移动
  用户正在阅读的消息。向前翻页能到达真正的第一条消息，
  既不跳过也不重复。重新选择时从保留的面板绘制：返回后的第一帧
  就是离开时的那一帧，处于相同的滚动位置，无变暗、无
  空白或骨架帧，也不重建各行。用户曾向上滚动过的面板
  会回到那个度量过的偏移而不是底部，而保持钉住的面板
  会重新锚定到底部。新轮次正常追加。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、ADR 0137
- **验收**：C（聊天流）、F（持久化）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`transcripts::tests::layout_window_reads_only_the_requested_tail`、
  `sessions::tests::bounded_reads_use_physical_line_positions_not_the_dedup_counter`）；
  UI 场景为草稿

#### E2E-SESSION-list-refresh-keeps-desktop-responsive: 大规模会话列表刷新保持 Electron 响应

- **前置条件**：一个构建好的 Electron 桌面端、内置的 models.dev 目录，
  以及一个没有配置任何提供商的全新临时配置文件。探针使用
  的只是一个合成的 `authKind: none` 提供商，且从不启动 Agent 轮次。
- **步骤**：1) 通过 Rust Host API 创建 800 个空的持久会话，
  分布在至多十三个已知模型 ID 上。2) 夹具创建完成后，
  通过渲染器 preload 桥并发请求八份会话列表。
  3) 在这些读取期间测量 Electron 主进程定时器间隔和
  渲染器到主进程的版本 IPC 延迟。4) 比对所有返回的会话 ID 与能力字段。
- **预期结果**：每份列表都包含全部夹具会话，模型与
  能力字段稳定。主进程保持响应：没有任何测得的定时器间隔或版本
  IPC 往返达到一秒。探针记录各次列表/心跳
  耗时以及主进程的最大间隔。常规的沙箱启动、平台
  窗口和菜单断言仍然通过。配置文件在事后丢弃；
  现有用户配置文件和正在运行的桌面进程不受影响。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/13-model-catalog-and-selection.md`、ADR 0134
- **验收**：C（会话）、质量
- **里程碑**：M6+
- **状态**：已自动化（`scripts/e2e-electron-boot.mjs`，经
  `pnpm test:e2e:boot`，使用现有的 `PI_DESKTOP_BOOT_PROBE` 入口点）。

#### E2E-071e: 从向前翻页后的转录重新生成时替换正确的轮次

- **前置条件**：一个足够长的会话，打开它只加载一个有界
  窗口，且该窗口之上有若干轮已完成的交互。
- **步骤**：1) 打开该会话并向前翻页加载更早历史，
  直到某个更早的用户轮次可见。2) 重新生成该轮次（或编辑并重新发送它）。3) 等待
  新答案。4) 用修订分页器走回原始版本。5) 重新打开
  该会话。
- **预期结果**：恰好只有所选轮次及其答案尾部被替换；没有
  无关的更早或更晚交互被截断或归档。分页器
  恢复原始尾部。重新打开后，转录与此前
  显示的一致，没有缺失消息。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、`03-runtime/04-data-storage.md`
- **验收**：C（聊天流）、F（持久化）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`transcript-truncation.test.ts`、
  `transcript-style.test.mjs`）；UI 场景为草稿

#### E2E-071f: 长转录滚动与小地图悬停保持流畅

- **前置条件**：一个包含数百条消息的会话，包括大型
  工具结果和至少一个代码块，使小地图轨道显示密集的
  刻度线堆叠。
- **步骤**：1) 打开该会话。2) 连续滚动整个
  转录，上下往返。3) 让光标沿小地图轨道缓慢从
  顶部扫到底部再返回。4) 悬停一条刻度线直到其预览弹出层出现，然后
  点击它。5) 调整窗口大小并重复轨道扫动。6) 输入一段多行
  长草稿使输入框变高，然后再次扫动轨道。7) 切换到
  另一个会话再切回。
- **预期结果**：滚动保持稳定帧率，遍历更多历史时不会
  逐渐变慢。轨道扫动平滑放大刻度线，
  且刻度线数量增长时不会退化；放大时刻度线堆叠绝不
  在垂直方向移动。弹出层指明正确的轮次，点击
  会滚动到该轮次。窗口调整大小后，
  以及输入框在多行草稿下
  变高后，放大仍然根据刻度线的新
  位置而非旧位置跟踪光标。返回该会话时显示其
  保留面板，位置与离开时一致，不重建更早
  历史，也不变暗。反复来回切换时，转录文本
  在首个绘制帧之后绝不跳动或上下滚动。向上滚动
  的所选位置在后续切换中保持，而不会被拉回底部。
- **关联规格**：`04-ux/08-component-spec.md`、ADR 0137
- **验收**：C（聊天流）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`interaction-performance.test.mjs`
  `minimap hover magnification never measures geometry per dash`、
  `session switch bounds the first transcript commit instead of rebuilding it`、
  `session-switch hydration expands without moving the transcript`、
  `minimap re-measures dash centers when the rail's own box changes`）；
  UI 场景为草稿

#### E2E-071g: 保留的会话面板数量有界并逐出最旧者

- **前置条件**：至少五个转录各不相同的会话，每个
  都长于一个视口，从而可以用滚动位置和最后一条记录
  无歧义地识别每个会话。
- **步骤**：1) 按顺序打开会话 A、B、C，每个都向上滚动
  一个可度量的距离。2) 切回 A，再切到 B，确认各自回到其
  自己的偏移。3) 打开 D，再打开 E，使 A 和 B 超出保留预算。
  4) 返回 A。5) 返回 E，再返回 D，确认它们仍然是热的。6)
  将整轮循环再重复一次，观察是否有卡住的进度条、错误
  提示条或空白聊天区。
- **预期结果**：只有可见面板和最近访问的两个面板被
  保留；访问超出该预算会逐出最旧的面板。热返回
  立即绘制保留的帧和偏移。返回已被逐出的
  会话时行为与冷打开完全一致：可见面板
  在细进度条下停留在自己的会话上，输入框在
  目标会话提交前处于惰性状态，然后目标会话在其最新轮次处绘制，无
  错误、无空白帧，也不恢复逐出前的偏移。任何时刻都没有
  变暗，隐藏面板保持不可交互且不在
  无障碍树中，反复循环既不会泄漏出数量不断增长的
  已挂载转录，也不会让某个面板显示另一个会话的行。
- **关联规格**：`04-ux/08-component-spec.md` §1.6 / §3.5 / §7、
  `04-ux/09-interaction-patterns.md` §5、ADR 0130、ADR 0137
- **验收**：C（切换会话）、质量
- **里程碑**：M5
- **状态**：草稿

#### E2E-071h: 在响应仍在流式输出时重新打开会话

- **前置条件**：会话 A 已有完整转录，并正在生成一条
  较长的助手响应；至少还有一个其他会话可用。
- **步骤**：1) 在 A 流式输出时打开另一个会话。2) 等待足够长的
  时间，让 A 发出若干助手或工具更新但尚未完成。3) 在
  响应结束前再次打开 A。4) 继续观察 A 直到轮次
  完成。5) 再切走并切回一次。
- **预期结果**：A 的保留/实时面板被展示出来，无空白、骨架、
  变暗或历史顶部闪现。第一帧包含点击前内存中
  可用的最新助手/工具尾部。延迟到达的持久详情
  响应可以补充已完成的行，但它绝不会用较旧的转录
  替换部分回复；后续流式更新从同一行继续，且
  完成的答案不会重复。A 的后台事件不会改变
  另一个会话的转录、输入框、工作区或焦点。
- **关联规格**：`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`、ADR 0137
- **验收**：C（聊天流）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`session-transcript.test.mjs`、
  `session-switch-performance.test.mjs`）；UI 场景为草稿

#### E2E-073: 纯图标消息工具栏与编辑用户提示词

- **前置条件**：一个空闲会话包含两轮已完成的用户/助手
  交互；其中一个用户轮次是以斜杠模板调用形式发送的。
- **步骤**：1) 悬停一个已完成的助手行和一个用户行，然后悬停并
  键盘聚焦每个操作图标。2) 在第一条用户提示词上选择编辑。3)
  按 Escape，重新打开编辑，不修改提示词直接重试。4) 重新打开编辑，
  修改文本，并用 Cmd/Ctrl+Enter 重试。5) 新答案完成后，
  使用 `current / total` 分页器返回原始交互，
  再向前翻回。6) 重新加载会话。7) 在斜杠命令
  轮次上选择编辑并检查预填的文本。8) 开始另一条响应，
  在其流式输出期间和完成后检查其助手工具栏。9) 在轮次运行中
  尝试编辑。
- **预期结果**：每个工具栏图标只显示其图形符号，标签
  在悬停和键盘聚焦时以完全可见的工具提示形式出现在图标
  上方 8px 处（#74）；当工具提示与
  侧边栏边缘重叠时仍完整绘制，绝不被侧边栏背景遮挡；没有
  图标渲染说明文字。点击某个操作会立即消除其工具提示；它不会
  在操作保持聚焦时继续可见。助手响应
  流式输出期间，其工具栏省略
  复制；响应结束后，助手工具栏提供复制、分叉、
  重新生成。用户工具栏提供分页器（存在变体时）、复制、
  编辑、删除。编辑将提示词气泡替换为一个更宽的、与输入框风格一致的
  内联编辑板，填充 `--ds-tile-deep`（无外部阴影，内嵌
  聚焦环），使浅色板在白色面板上保持可辨且
  辉光不被裁剪，并提供重试与取消控件；Escape 或取消会将气泡
  恢复原样。重试会从该提示词处截断转录并流式生成新
  答案，无论文本是否改变，并在用户轮次上留下一个 `current / total` 分页器，
  它能将原始提示词连同其完整答案尾部原地
  恢复——且在重新加载后依然存活。斜杠轮次预填已输入的 `/command` 形式，
  并在重试时重新展开模板。轮次运行中编辑被禁用。
- **关联规格**：`04-ux/08-component-spec.md`、
  `03-runtime/01-ipc-protocol.md`、`03-runtime/04-data-storage.md`、
  `08-meta/decisions-log.md`（D137、D274）
- **验收**：C（聊天流）、F（持久化）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`transcript-style.test.mjs`）；完整 UI 场景为草稿

#### E2E-069: 平台特定的侧边栏头部行为

- **前置条件**：PI-Desktop 已打开，侧边栏处于展开状态，
  且有一个聊天会话处于活动状态。
- **步骤**：1) 在 macOS 窗口模式下打开扩展。2) 检查展开的
  侧边栏标题栏。3) 确认没有可见的 PI-Desktop 标志/标题，
  且“折叠侧边栏”出现在交通灯按钮的右侧。4) 进入
  全屏并检查同一行。5) 在 Windows/Linux 上，确认品牌
  保持可见；用指针激活它，然后用键盘聚焦并
  按 Enter/Space。
- **预期结果**：macOS 使用一个 46px 行，左侧为原生交通灯、
  一个可用的拖拽区域，右侧为一个无障碍的折叠按钮；
  在窗口和全屏模式下都不出现 Logo/Home 品牌。
  全局搜索保留在会话顶栏、快捷键和应用菜单中，
  而不是侧边栏头部。Windows/Linux 在 15px 外壳名称旁渲染
  规范的 20px 标志；完整的品牌具有本地化的 Home 无障碍名称、
  可见的悬停/聚焦反馈，并能使主面板返回聊天，
  而不清除活动会话或工作区。标志本身是主题感知的：
  浅色模式显示 `src/assets/brand/logo-light.png`，
  深色模式显示 `src/assets/brand/logo-dark.png`，并随
  `data-theme` 实时切换（无需重新加载）。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md`
- **验收**：质量
- **里程碑**：M5
- **状态**：单测覆盖（`renderer-branding.test.mjs`、
  `sidebar-navigation.test.mjs`）；渲染交互场景为草稿

#### E2E-098: 侧边栏折叠与展开以停靠过渡动画呈现

- **前置条件**：PI-Desktop 已打开，侧边栏处于展开状态，
  且有一个活动的聊天会话；`prefers-reduced-motion` 已关闭。
- **步骤**：1) 点击展开侧边栏头部中的“折叠侧边栏”（或按下
  侧边栏切换快捷键）。2) 观察折叠过程中的侧边栏。3) 确认
  主面板扩展，且折叠后的标题栏现在显示一个展开控件。
  4) 在折叠状态下再次按下侧边栏切换快捷键：每次
  按下必须在折叠与展开之间严格交替，因此第二次按下
  会重新展开侧边栏（回归：绝不能再次折叠）。5) 通过快捷键
  再折叠并重新展开一次，然后用指针控件重复完整往返。
  6) 在 Windows/Linux 上重复。
- **预期结果**：折叠播放 `sidebar-out` 关键帧（不透明度 + ≤8px 滑动
  加上宽度/flex 分配），期间 aside 保持在树中，
  动画结束后才卸载；主面板连续填充释放的空间。
  展开播放 `sidebar-in` 关键帧，
  且控件回到展开的头部。在 Windows 上，退出过程中停靠栏保持
  不透明（`sidebar-out-windows`），与工作面板停靠行为一致。
  动画之前没有布局跳动，且焦点可预期地回到侧边栏/展开
  控件。
- **关联规格**：`04-ux/08-component-spec.md`、`04-ux/07-ui-design-system.md`
- **验收**：质量
- **里程碑**：M5
- **状态**：单测覆盖（`sidebar-collapse-animation.test.mjs`）；渲染
  交互场景为草稿

#### E2E-208: 折叠的侧边栏不会强制聊天内容带变为 640px

- **前置条件**：PI-Desktop 已打开，有一个活动的聊天会话，
  视口宽度足以容纳默认的 760px 聊天内容带；已关闭
  减弱动效；用户没有调整过内容带宽度。
- **步骤**：1) 在侧边栏展开时，记录居中的转录或空主页
  输入框内容带的宽度。2) 折叠侧边栏。3) 在停靠过渡运行期间
  和稳定之后检查同一内容带。
  4) 展开侧边栏并检查返回过渡。
- **预期结果**：外侧主面板填充侧边栏释放的空间。
  居中的聊天内容带保持其首选的 760px 上限（若
  面板更窄则为 `min(available, preferred)`）。它不会跳到
  640px。转录、空主页堆叠和输入框共享这一包络。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md`、ADR 0277、D439
- **验收**：质量
- **里程碑**：M5
- **状态**：单测覆盖（`sidebar-collapse-animation.test.mjs`、
  `chat-content-width.test.mjs`）；渲染交互场景为草稿

#### E2E-CHAT-content-width-handles: 双侧边缘手柄调整居中聊天内容带宽度

- **前置条件**：PI-Desktop 打开在聊天页（空主页或一个转录），
  视口宽度大于 760px。减弱动效已关闭。
- **步骤**：1) 确认静止状态下没有可见的分隔条。2) 悬停左侧
  内容边缘，确认出现一小段浅色胶囊，然后是右边缘。3) 向外拖动
  右手柄，确认两侧边缘都移动、输入框跟随，
  且拖动时两个胶囊略微变长。4) 打开工作面板或
  展开侧边栏，直到面板比新偏好宽度更窄；内容带
  在不出现横向滚动的情况下压缩。5) 关闭面板/折叠
  侧边栏，确认偏好宽度恢复。6) 双击某个手柄
  恢复 760px。7) 在聚焦的手柄上用方向键重复。
- **预期结果**：默认 760px。拖动下限 560px（或面板更小时取面板宽度）。
  用户气泡保持紧凑。手柄保持键盘可访问
  （`role="separator"`）。偏好持久化为 `chatContentMaxWidth`。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/08-component-spec.md`、
  ADR 0277、D439
- **验收**：C（会话）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`chat-content-width.test.mjs`、
  `packages/shared/src/chat-content-width.test.ts`）；渲染场景为草稿

#### E2E-UI-tooltip-never-outlives-its-trigger: 主题化工具提示总会消退

- **前置条件**：PI-Desktop 打开在一个至少有一个消息
  工具栏的会话上，侧边栏有两个已保留的项目，
  且窗口可以失去焦点（另一个应用程序或一个系统对话框）。
- **步骤**：1) 悬停一个纯图标操作并等待其工具提示。2) 在
  工具提示可见时，将指针直接移出窗口（不点击），
  然后再移回。3) 悬停一个操作，然后让指针快速扫过
  一排相邻操作。4) 悬停一个操作，然后触发侧边栏
  重新排序或项目展开/折叠，使其所在行在 DOM 中移动。5) 悬停一个
  操作，然后按 Escape。6) 悬停一个操作，切换到另一个应用程序，
  再返回 PI-Desktop。7) 对项目路径工具提示
  （较长的绝对路径）、会话行的溢出控件和消息工具栏
  图标重复步骤 1。
- **预期结果**：每个工具提示在其延迟后出现（300ms，项目路径为
  500ms），并在指针离开时消退。没有工具提示在其
  触发元素卸载、窗口失焦、文档隐藏或 Escape 之后存活，
  也没有在指针完全离开窗口后仍然残留。扫过相邻
  操作时任意时刻至多显示一个工具提示。保持同一行
  元素的移动（列表重排、展开/折叠）会保留工具提示而不是
  让它闪烁；被 React 真正卸载并替换的行则会丢弃它。
  靠近顶部边缘时的 placement。
- **关联规格**：`04-ux/09-interaction-patterns.md §6.4`
- **验收**：质量
- **里程碑**：M5
- **状态**：单测覆盖（`icon-tooltip.test.mjs` 源码契约）；渲染
  指针/Escape/失焦验证为草稿

#### E2E-UI-topbar-session-context: 分支与打开位置控件

- **前置条件**：PI-Desktop 打开在一个工作区为
  git 仓库的会话上，且机器上至少安装了一个目录中的应用编辑器。
- **步骤**：1) 点击分支徽章并粘贴到别处。2) 点击
  打开位置主按钮，确认目录在首选应用中打开。3) 打开
  下拉箭头菜单，选择另一个应用，确认目录
  在该应用中打开。4) 再次点击主按钮，确认新选的
  应用现在成为默认。5) 打开一个无项目的临时聊天，
  确认该控件组隐藏或回退到工作区根。6) 打开一个
  非 git 目录中的会话，确认分支徽章隐藏，
  而打开位置仍然保留。
- **预期结果**：分支徽章复制分支名并显示短暂的对勾
  反馈。菜单按目录顺序恰好列出检测到的目录应用。
  每个打开动作都落在会话的有效目录中，
  绝不是渲染器提供的路径。所选应用跨点击和重启持久。
- **关联规格**：`04-ux/08-component-spec.md §2.7`
- **验收**：质量
- **里程碑**：M5
- **状态**：单测覆盖（`open-location.test.mjs`、
  `session-context.test.mjs`）；渲染指针验证为草稿

#### E2E-UI-row-actions-do-not-swallow-the-row-click: 隐藏的行内操作处于惰性

- **前置条件**：PI-Desktop 已打开，有两个已保留的项目，
  每个至少有三个会话，且有一个活动的会话。
- **步骤**：1) 不悬停，直接点击一个空闲会话行右侧
  溢出控件将出现位置的槽沟，记录打开了哪个
  会话。2) 在一个空闲项目标题行上重复。3) 悬停一行
  并在第一次点击时激活显现出的溢出控件。4) 用 Tab 遍历
  侧边栏，直到某个行内操作获得焦点并激活它。5) 用模拟的
  粗指针/触摸设备重复步骤 1。6) 在指针停留在某行上
  且其操作已显现时，将焦点切到另一个应用程序，
  然后不移动指针返回。
- **预期结果**：空闲槽沟属于该行——在那里的第一次点击
  打开该会话（项目标题行的槽沟会激活并切换该分组），
  而不是打开一个不可见的菜单，且粗指针永远不会遇到
  隐藏的控件。悬停显现的控件仍在第一次点击时打开其菜单，
  键盘聚焦会显现它并保持可操作。窗口失焦时，
  该行（以及项目标题区块）移除其悬停着色并隐藏已显现的
  操作；将指针移回该行会重新启用它。
- **关联规格**：`04-ux/09-interaction-patterns.md §9.1c`
- **验收**：质量
- **里程碑**：M5
- **状态**：源码契约与样式断言覆盖了隐藏/显现的
  `pointer-events` 状态与失焦释放
  （`sidebar-navigation.test.mjs`）；渲染指针/触摸验证为草稿
- **验收**：质量
- **里程碑**：M5
- **状态**：单测覆盖（`sidebar-navigation.test.mjs`、
  `interaction-polish.test.mjs`）；渲染指针/触摸验证为草稿

#### E2E-070: 原生下拉菜单在整个应用中跟随 Windows 主题

- **前置条件**：PI-Desktop 运行在 Windows 上，
  浅色与深色主题均可用。
- **步骤**：1) 在浅色主题下，打开剩余的原生下拉框（定时任务
  表单），并确认“常规”、“全局 AI”、“模型配置”和
  “导入”上的设置选择器以应用内菜单而非平台 `<select>` 弹窗打开。2)
  在深色主题下重复每个剩余的原生列表。3) 在不重启应用的情况下
  切换主题后打开每个列表。
- **预期结果**：设置中的紧凑选择器使用共享的锚定菜单。每个
  剩余的闭合原生触发器和打开的原生选项列表都使用
  当前主题可读的前景/背景配对。没有深色主题列表
  回退到浅色文字配浅色 Windows 表面，没有浅色主题列表
  使用深色主题墨色，且更改主题会更新后续的打开。
  设置之外的原生下拉框也有同样的结果。
- **关联规格**：`04-ux/06-settings-ia.md`、
  `04-ux/07-ui-design-system.md`
- **验收**：质量（跨平台主题可读性）
- **里程碑**：M5
- **状态**：单测覆盖（`settings-general.test.mjs`）；Windows 渲染
  场景为草稿

#### E2E-071i: 长会话在稳定遮罩下打开且发送即时清空

- **前置条件**：一个包含数百条消息的会话，其中有代码
  块和工具结果；已配置模型；让宿主变慢（例如一个
  被节流的 sidecar 或一个大型待处理工具输出），使一次
  提示词往返明显长于一帧。
- **步骤**：1) 从主页面打开该长会话并记录
  首个绘制帧。2) 等待转录出现。3) 在其历史页
  正在重新验证时离开并重新打开同一会话。4) 输入
  一段多行提示词使输入框变高，然后按 Enter。5) 在宿主
  仍然繁忙时，在已清空的输入框上再次按 Enter。6) 让宿主
  拒绝一次发送（例如禁用该模型的提供商），并带着
  新草稿按 Enter。7) 打开一个少于十五条消息的会话。
- **预期结果**：长会话的第一帧是输入框下方一个不透明的、
  用户行与助手行交替的骨架；在历史展开或行高
  稳定的那些帧中没有任何转录文本可见，
  且骨架在大约 600ms 内淡出到一个已经
  定位在最新轮次的转录上。各行在揭示之后
  绝不上下来回移动。多行草稿变高时，最新轮次
  随输入框一起上移，而不是消失在它后面。重新验证期间重新打开
  以及重复的更早页响应，让每个消息 id 恰好保留一行，
  包括已存在的用户行。按 Enter 会清空输入框，
  并在同一帧把用户行显示在转录底部，
  早于宿主的应答；当宿主回显到达时，该行不重复也不跳动。
  在空输入框上的第二次 Enter 什么也不做，也不排队重复项。
  发送被拒绝时，用户行消失，草稿
  回到输入框中，光标位于其末尾。短会话不显示
  骨架。
- **关联规格**：`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`、`08-meta/decisions-log.md`（D287、D288）
- **验收**：C（聊天流）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`transcript-settle.test.mjs`、
  `composer-send-state.test.mjs` `send clears the composer before the round
  trip and restores a rejected draft (D287)` 和 `the user row is inserted
  before the host round trip and echoed under the same id (D288)`、
  `session-transcript.test.mjs`（`repeated transcript rows keep one position and
  the latest value`））；UI 场景为草稿

#### E2E-072: 键盘快捷键映射持久化且保持无冲突

- **前置条件**：应用在 macOS 和一个 Windows/Linux 目标上运行，
  设置已打开；没有存储任何自定义快捷键覆盖。
- **步骤**：1) 打开“设置 → 快捷键”并检查键盘快捷键。2) 将
  搜索改为一个未使用的修饰键组合。3) 调用新组合键，
  然后调用旧组合键。4) 尝试把该组合键分配给命令快捷键
  （现在通过全局搜索打开）。5) 尝试一个裸字母和一个保留的
  编辑组合键。6) 禁用搜索，确认其行显示为未绑定。7) 确认
  默认和自定义的搜索组合键都不再触发搜索，然后重启并检查
  它仍然处于禁用状态。8) 单独恢复搜索并确认其默认值
  恢复；选择恢复默认，确认所有行都回到默认值。9) 在
  macOS 上，在每次保存/重置后检查相应的原生应用菜单加速键。
  10) 在 Windows 上禁用插件启动器，并确认其
  旧的全局绑定、聚焦回退和 Alt+Space 宿主回退全部
  失效。11) 单独按下并松开 Ctrl/Command，确认一个 IME 候选，
  并按住后退/前进组合键足够长的时间以产生重复触发。
  12) 在主窗口聚焦时，按下窗口可见性组合键
  `Alt + Shift + W`，确认窗口隐藏到托盘，
  没有关闭行为提示，且应用仍在运行；在另一个
  应用程序中再次按下它，确认窗口返回并获得焦点。
  13) 给一个配置文件预置一个已存储的自定义 `closeWindow` 绑定，
  给另一个预置一个自定义 `summonWindow` 绑定；确认每个配置文件
  在重启后都在单一的切换行上保留该绑定，
  且 `Cmd/Ctrl + Shift + W` 不注册任何内容。
- **预期结果**：各操作按导航、Agent 和窗口分组，
  键位标签平台原生化；录制时有可见焦点且 `Escape` 取消；
  自定义搜索组合键立即生效，替换旧组合键，
  跨重启存活，并更新 macOS 菜单；重复、无修饰键和
  保留的分配显示内联错误，且不改变任一操作；
  未绑定显示为本地化的显式状态，不参与任何冲突，
  不分发旧组合键或默认组合键，跨重启持久，移除
  macOS 加速键，并禁用 Windows 启动器的各回退层；
  单独重置与全局重置都恢复共享默认值；键盘快捷键是
  独立的设置目的地。仅修饰键和 IME 的 keydown 不分发任何内容，
  按住的历史组合键每次物理按下只遍历一次。
  窗口可见性键是 `Alt + Shift + W` 上的单一切换——可见且聚焦的
  窗口隐藏到托盘，其他任何状态则显示并聚焦——且它绝不
  进入关闭路径，因此不会引发关闭行为提示、也绝不退出；
  它是全局注册的，并刻意避开 `Cmd/Ctrl + W`（macOS 将其用于
  自己的关闭窗口命令）；已退役的 `Cmd/Ctrl + Shift + W`
  组合键不注册任何内容，而已存储的 `closeWindow`/`summonWindow`
  覆盖会折叠进该切换（D438、D439）。
- **关联规格**：`04-ux/06-settings-ia.md`、`04-ux/07-ui-design-system.md`、
  `03-runtime/01-ipc-protocol.md`
- **验收**：F（设置持久化）、质量（键盘无障碍）
- **里程碑**：M5
- **状态**：单测覆盖（`keyboard-shortcuts.test.ts`、
  `settings-keyboard-shortcuts.test.mjs`、`window-toggle-shortcut.test.mjs`、
  宿主设置 RPC 测试）；渲染场景为草稿

#### E2E-073a: 开发者模式把控开发者工具控制台

- **前置条件**：应用在 macOS 和一个 Windows/Linux 目标上运行；
  持久化设置中开发者模式不存在或为 false，
  且“设置 -> 信息”已打开。
- **步骤**：1) 通过设置搜索找到开发者卡片。2) 确认
  “打开控制台”操作被禁用，并尝试 F12 以及平台备用
  快捷键。3) 启用开发者模式，并从设置中打开控制台。
  4) 关闭它，再用 F12 重新打开；在 Windows/Linux 上用
  Ctrl+Shift+I 重复，并在 macOS 上检查并调用“视图”菜单中的
  开发者工具项。5) 重启应用并调用一个已启用的入口点。6) 在
  控制台打开时禁用开发者模式。7) 在禁用状态下
  直接尝试控制台 IPC。
- **预期结果**：任何被禁用的入口点都不能打开开发者工具，
  且 macOS 省略“视图”菜单项。启用该持久化开关会解锁本地化的
  设置操作和适用的平台快捷键；重启后每个入口都切换同一个
  窗口控制台。禁用该开关会关闭控制台、
  禁用设置操作、移除 macOS 菜单项，并使直接的
  IPC 请求以失败关闭方式被拒绝。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `04-ux/06-settings-ia.md`、`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`
- **验收**：F（设置持久化）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`settings-general.test.mjs`、
  `window-menu.test.mjs`）；原生交互场景为草稿

#### E2E-074: 并发会话事件与权限绝不窃取焦点

- **前置条件**：会话 A 和 B 处于 Agent 模式且可以
  并发运行；A 可见，且其输入框中有一份草稿。
- **步骤**：1) 在 A 和 B 中启动轮次，然后返回 A。2) 让 B 发出流式
  消息、工具活动、完成事件和一个权限请求。3) 确认 A
  保持可见，并继续编辑其草稿。4) 也在 A 中触发一个权限
  请求。5) 显式打开 B，只处理 B 的请求，然后
  返回 A 并处理 A 的请求。6) 在会话
  详情以相反完成顺序加载时，快速选择 A 然后 B。7) 在 B 加载时，
  处理 A 的 Write/Edit 请求，使其工具完成记录一张内联审查卡片，
  然后让 B 在 A 可见时发出一个
  BrowserPreview 产物。分别切回每个会话。
- **预期结果**：B 的后台事件只更新 B 的行和保留状态；
  它们不改变 A 的活动会话/项目/页面、转录、草稿、滚动位置
  或键盘焦点，也不出现全局模态框。打开 B 只揭示 B 的
  内联卡片及其原始倒计时。两个请求保持独立
  可操作，处理 B 不会清除 A。最后的快速选择停留
  在 B 上，即使 A 较早的加载更晚完成。只有显式通知或
  会话激活可以导航。A 的批准后审查卡片只保留在
  A 中，不在 B 中出现瞬时的打开/关闭闪现；B 的 BrowserPreview 携带 B 的
  会话身份，只更新 B 保留的 Browser 资源，且绝不打开、
  导航、聚焦或调整 A 的面板大小。显式返回任一会话
  都会恢复其自身的打开状态、标签页、活动标签页和 Browser 资源。
- **关联规格**：`04-ux/01-ui-ia.md`、`04-ux/03-permission-ux.md`、
  `04-ux/08-component-spec.md`、`04-ux/09-interaction-patterns.md`
- **验收**：C（会话隔离）、E（权限隔离）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`permission-inline.test.mjs` 覆盖作用域状态、
  内联渲染契约、绝对倒计时和最新选择防护；
  `work-panel.test.mjs` 与 `browser-preview-tool.test.mjs` 覆盖会话作用域的
  产物保留与路由）；完整 UI 场景为草稿

#### E2E-075: 侧边栏分区右键菜单创建会话与项目
- **状态**：手动
- **优先级**：P1
- **覆盖**：A、C、D / US-UI-57
- **前置条件**：应用正在运行，展开的主页侧边栏可见。
- **步骤**：
  1. 右键点击 `Sessions` 标题标签（不是某个会话行）。
  2. 选择唯一的创建项。
  3. 右键点击独立会话列表中的空白区域。
  4. 右键点击 `Projects` 标题标签。
  5. 选择唯一的创建项，然后取消或完成项目选择器。
  6. 右键点击项目列表中的空白区域（在任何项目分组之外）。
- **预期结果**：
  - 会话右键菜单应用临时分组空会话复用规则，
    并聚焦输入框；在任何消息之前即可见一个新的持久行。
  - 项目右键菜单打开与标题上的文件夹加号控件
    相同的“创建项目”对话框。
  - 现有的行右键菜单和标题图标按钮保持可用；
    分区菜单保持单项，并与其他侧边栏菜单主题一致。
  - 分区、会话行和项目行的右键菜单在空间允许时在指针
    右侧打开，并在右边缘处保持完全位于
    视口内。
  - Escape 和外部点击会关闭菜单且不创建任何内容。

#### E2E-076: 启动闪屏出现后让位于主外壳
- **状态**：部分自动化（`startup-splash-motion.test.mjs` 覆盖闪屏标记、动效令牌、减弱动效和目录键；`macos-sidebar-vibrancy.test.mjs` 覆盖 darwin 玻璃闪屏与外壳交叉淡入；完整窗口时序仍为草稿）
- **优先级**：P1
- **覆盖**：A、质量 / US-UI 外壳打磨
- **前置条件**：应用启动路径可用（开发或打包）。
- **步骤**：
  1. 启动 PI-Desktop。
  2. 在引导完成前观察首个绘制的渲染器表面。
  3. 等待会话/设置引导完成。
  4. 在可用时以系统 `prefers-reduced-motion: reduce` 重复。
  5. 在 macOS 上，在外壳出现后将闪屏表面与侧边栏玻璃对比。
- **预期结果**：
  - 就绪前：全窗口闪屏，含品牌标志、外壳名称、标语和无障碍的启动状态（`data-testid="startup-splash"`）。
  - 就绪后：闪屏以短淡出退出（减弱动效下立即退出），主外壳（或设置页面）在下方可交互。
  - 在 macOS 上，闪屏使用与侧边栏在原生 `sidebar`  vibrancy 上相同的玻璃色调与光泽；已挂载的外壳保持隐藏，直到闪屏退出淡出，然后交叉淡入。其他平台保持不透明的 `--ds-bg-primary` 填充。
  - 不出现朴素无品牌的居中“Starting…”文字作为唯一的启动 UI。
  - 覆盖层/对话框进入动效使用共享令牌；减弱动效保留状态变化，但不带装饰性时长。
  - 如果在设置读取仍在进行时某个非设置的引导请求失败，
    打开设置仍渲染已加载的控件。如果
    设置请求本身失败，当前分区显示加载/失败
    状态和重试操作，而不是空白内容面板；在
    本地服务恢复后重试会恢复控件，且不离开设置。
- **关联规格**：`04-ux/07-ui-design-system.md` §8、`04-ux/02-i18n-english-first.md`、decisions-log D146 / D304 / D348
- **验收**：A（应用启动）、质量
- **里程碑**：M5
#### E2E-099: 品牌标志跟随当前主题
- **状态**：草稿
- **优先级**：P3
- **覆盖**：质量 / US-UI 外壳打磨
- **前置条件**：应用正在运行；主题可在浅色与深色（及跟随系统）之间切换，无需重启。
- **步骤**：
  1. 在浅色模式下，打开应用外壳、一个空聊天主页和展开的侧边栏（Windows/Linux）或启动闪屏。
  2. 检查侧边栏和启动闪屏中渲染的 `BrandLogo` 来源，
     并检查空主页 hero 中的浅色八帧 `HomeMascotLogo` GIF。
     悬停吉祥物，验证其节奏不变。
  3. 将主题切换为深色（设置 → 基础 → 外观，或系统外观变化）。
  4. 不重新加载，重新检查相同的表面。
  5. 切回浅色并重新检查。
- **预期结果**：
  - 浅色与深色模式在侧边栏和启动闪屏中实时渲染
    `src/assets/brand/logo-light.png` /
    `src/assets/brand/logo-dark.png`，无需窗口重新加载。
  - 空主页 hero 渲染当前主题的 100px 八帧吉祥物 GIF
    （`home-mascot-light.gif` / `home-mascot-dark.gif`），带有
    短暂的静止停顿和循环挥手。切换主题实时交换这一对图，
    无需窗口重新加载。指针悬停不改变节奏；
    减弱动效下对应的静止首帧保持可见。
  - 尺寸跨主题变化保持稳定（侧边栏 20px、hero 100px、闪屏
    64px），且标志保持装饰性，没有点击、键盘或焦点
    行为。
- **关联规格**：`04-ux/08-component-spec.md` §3.7、`04-ux/07-ui-design-system.md`
- **验收**：质量
- **里程碑**：M5
#### E2E-077: 主题感知的文本选择与 CJK 分区标签

- **状态**：部分自动化（`user-select.test.mjs`、`interaction-polish.test.mjs`）
- **优先级**：P2
- **覆盖**：A、质量 / US-UI 外壳打磨
- **前置条件**：应用正在运行，至少有一个可选择的转录或输入框；语言可切换为 `zh-CN`。
- **步骤**：
  1. 在转录消息或输入框内选择文本。
  2. 检查英文状态下侧边栏 Sessions/Projects 分区标签。
  3. 将应用语言切换为 `zh-CN`，重新检查相同标签。
  4. 悬停跳到最新（可见时）、停止、搜索行和个人资料菜单项。
- **预期结果**：
  - 选择高亮使用中性的 text-primary 浅色洗刷（而非浏览器默认蓝色）。
  - 光标/表单强调色保持在单色令牌梯度上。
  - 英文分区标签可使用大写 + 宽字距；`zh-CN` 标签使用正常字距，不强制大写。
  - 列出的界面控件通过共享动效令牌缓动背景/颜色变化。
- **关联规格**：`04-ux/07-ui-design-system.md`、`04-ux/08-component-spec.md`
- **验收**：D147
- **里程碑**：M5
- **状态说明**：CSS 契约为源码级覆盖；视觉选择着色仍为手动。

#### E2E-078: 工作面板与设置的浅色表面打磨

- **状态**：部分自动化（`surface-polish.test.mjs`）
- **优先级**：P2
- **覆盖**：D、质量 / US-UI 外壳打磨
- **前置条件**：应用正在运行；主题可切换为浅色；可以打开一个工作面板标签页。
- **步骤**：
  1. 切换到浅色主题。
  2. 打开设置，检查表单字段、开关、分段控件和快捷键键帽。
  3. 在聊天会话旁打开工作面板（审查 / 文件 / 浏览器）。
  4. 悬停文件树行或 diff 头部；聚焦浏览器 URL 字段。
  5. 打开一个确认/提供商对话框，检查遮罩。
  6. 在浅色与深色调色板中，检查设置侧栏、搜索、选中
     项、开启状态的旋钮、输入框外壳、插件/能力搜索、代码
     卡片的头部带、Mermaid 画布、工具输出、输入框占位符
     和禁用的发送图标、对话框遮罩和权限背板，以及
     停靠提问卡片及其选项行。应用自定义表面变量，
     键盘聚焦两个搜索框，然后移除自定义主题。
- **预期结果**：
  - 工作面板主体呈现为安静的 `#fafafa` 内嵌纸面，配以白色头部带。
  - 设置字段、浏览器 URL、分段轨道和快捷键键帽使用浅色内嵌填充；聚焦的字段以中性环提升。
  - 开关的开启状态在接近黑色的轨道上保持白色旋钮。
  - 文件树/diff/调整大小上的悬停填充以共享动效令牌缓动，且分隔条的 2px 线在悬停或拖动时为 50% 强调色色调，因此绝不会在深色板上画出一条实心白色细线；键盘聚焦保持完整强调色。
  - 浅色对话框遮罩比深色的 45% 面纱更柔和（约 28% 墨色）。
  - 停靠提问卡片在两种调色板中都绘制输入框板——浅色
    `#ffffff` 带输入框阴影，深色 96% `#212121`——且其选项行
    是内嵌的 `--ds-tile-deep` 填充，无凸起阴影。自定义
    `--ds-bg-composer` / `--ds-tile-deep` 会重绘两者，移除它
    则恢复内置着色。
  - 工具输出保持其级联：浅色在错误输出和普通工具块上
    绘制相同的更浅区块，而深色显示错误色调并
    让普通块保持透明。
  - 自定义变量重绘相应的填充、键帽墨色和搜索
    聚焦状态；移除它们会恢复内置的 8 位 RGBA 着色和
    现有的阴影/聚焦环。正文墨色混合跟随 `--ds-text-primary`，
    且 `one-dark-pro` / `one-light` Shiki 底板及其墨色
    按设计跟随 Shiki 主题。本批次不更改插件 API。
- **关联规格**：`04-ux/07-ui-design-system.md`、`04-ux/08-component-spec.md`
- **验收**：D148
- **里程碑**：M5
- **状态说明**：`pnpm test:e2e:theme-surfaces` 以真实 Chromium、生产 CSS
  和确定性 DOM 夹具演练这些普通填充、
  聚焦状态和内置恢复；不覆盖插件安装/生命周期。
  分支运行不能替代集成后 E2E。此场景中的其他表面
  保留手动视觉检查。

#### E2E-079: 面向用户的目录文案（英文与中文）

- **状态**：部分自动化（`packages/i18n/test/user-facing-copy.test.mjs`、`catalogs.test.mjs`）
- **优先级**：P2
- **覆盖**：A、质量 / US-UI 文案
- **前置条件**：应用正在运行；语言可在英文与 zh-CN 之间切换。
- **步骤**：
  1. 检查空主页提示、侧边栏临时聊天分区和状态/连接提示条。
  2. 打开“设置 → AI 提供商”和市场刷新操作。
  3. 将应用语言切换为 zh-CN，重新检查相同表面。
- **预期结果**：
  - 文案用平实的产品语言（AI 提供商、项目、市场、已连接/受限）解释结果，而不是宿主/后端/仓库术语。
  - 英文与 zh-CN 目录保持相同的键和插值变量。
  - 崩溃界面和空主页标题在两种语言环境中都保持由目录提供。
- **关联规格**：`04-ux/02-i18n-english-first.md`
- **验收**：D149
- **里程碑**：M5
- **状态说明**：目录契约为源码级覆盖；视觉措辞审查仍为手动。

#### E2E-081: 发送重新钉住转录并跳到底部

- **前置条件**：长转录超出一个视口；已配置提供商。
- **步骤**：
  1. 从钉住的底部开始，用触控板向上滚动一个
     较小的初始距离；观察第一次移动和
     跳到最新控件。
  2. 在输入框中输入一条新提示词并发送。
  3. 在轮次开始和流式输出时观察转录位置。
  4. 在流式输出期间再次用触控板小幅向上滚动，
     等待更多内容，然后点击跳到最新。
- **预期结果**：
  - 第一次向上移动立即解除跟随模式且保持稳定；
    在待处理的流或尺寸变化跟随帧完成时，
    它不会弹回、反转方向或振荡。
  - 新的流式内容不会移动手动定位的视口，且
    跳到最新在跟随模式解除后立即出现。
  - 发送时，转录重新钉住、隐藏跳到最新，并跳到底部，使新用户消息（及后续流）可见。
  - 钉住状态下流式输出持续跟随。
  - 流式输出中途手动滚动会暂停跟随并再次显示跳到最新；点击它恢复跟随。
- **关联规格**：`04-ux/08-component-spec.md`、`04-ux/09-interaction-patterns.md`
- **验收**：C（聊天流）、质量 / D151
- **里程碑**：M5
- **状态**：部分自动化（`apps/desktop/test/transcript-scroll.test.mjs`）；
  完整触控板交互仍为草稿

#### E2E-082: 新推理会话默认使用绑定的思考等级

- **前置条件**：应用默认提供商/模型解析为具备推理能力，
  并发布一个稀疏的思考等级集合，其存储的绑定默认值
  不是最强的启用等级；第二个默认模型不具备推理能力。
- **步骤**：
  1. 将具备推理能力的模型设为应用默认，并创建一个新会话。
  2. 检查输入框的模型 × 推理组合图标，以及发送给宿主的
     会话配置。
  3. 选择一个更低的等级或关闭，离开该会话，再重新打开它。
  4. 将不具备推理能力的模型设为默认，再创建另一个新会话。
- **预期结果**：
  - 第一个新会话持久化并显示绑定存储的默认
    思考等级（被钳制到启用集合内），即使提供商
    返回的稀疏等级顺序错乱。它不会仅仅因为模型
    支持推理就跳到最强的启用等级。
  - 重新打开第一个会话会保留用户之后的显式选择。
  - 不具备推理能力的会话从 `off` 开始；其组合图标保留 Bot
    图标、省略等级文本，且其推理子菜单只暴露“关闭”。缺失
    能力元数据时同样回退到 `off`。
- **关联规格**：`03-runtime/13-model-catalog-and-selection.md`、
  `04-ux/08-component-spec.md`、ADR 0018、D303
- **验收**：B（模型配置）、F（持久化）、质量
- **里程碑**：M5
- **状态**：部分自动化（`thinking-levels.test.ts`、
  `thinking-ui.test.mjs`）；完整 UI 场景为草稿

#### E2E-083: 长流式轮次保持外壳交互响应

- **前置条件**：已配置提供商；一个活动会话有足够的用户、
  助手和工具行，足以溢出若干视口；工作面板可以
  打开；正常与减弱动效偏好都可用。
- **步骤**：
  1. 开始一条发出频繁流式更新的长助手响应。
  2. 在其流式输出期间，悬停并聚焦侧边栏行、在输入框
     启用时输入、打开/折叠工作面板，并将转录滚离
     最新位置再滚回。
  3. 在整个流式过程中观察小地图、已完成的历史行、
     输入框表面和外壳界面。
  4. 导航到插件或设置再返回，然后在减弱动效下重复。
- **预期结果**：
  - 当前助手行渐进揭示内容，钉住的跟随
    保持在最新位置，无可见振荡。
  - 可替换的消息/工具片段被合并到下一次绘制，
    而终态、权限、规划和错误状态保持即时。
  - 失败的工具行保持错误色调且可局部展开，
    但绝不会把包含它的活动分组标记为终态失败。
    分组只报告处理时长；轮次终态样式来自
    终态 Agent 结果表面。
  - 侧边栏、输入框、已完成的消息/活动行、工作面板、
    标题栏和全局覆盖层不会因每个令牌更新而
    可见地重绘或失去指针/键盘响应性。
  - 已完成历史保持在其稳定的渲染边界内，而活动尾部变化；
    历史保持可选择、可复制，并在小地图中锚定，
    不会为每个令牌作为 React 子树重建。
  - 在同一活动轮次内，未变化的非委派活动分组
    不会仅仅因为文本更新重建了轮次级委派映射而重新渲染。
    工具内容变化仍会渲染；后续的 TaskWait 结果会更新
    原 Task 分组的终态与完成时长。
  - 按下并松开标准、图标、侧边栏、发送、停止和消息
    操作控件时，使用一次缓动变换而不是突变缩放；
    活动流式标签保持其可读文字，而其紧凑状态
    标记以 1 秒或更慢的周期脉动；加载骨架保持其脉动。
  - 小地图溢出和活动标记状态在流式内容
    改变高度时保持正确，无标记抖动。
  - 目的地、面板、焦点、按下、跳转和错误反馈使用
    一次短促有界的过渡；输入框不会在转录上留下模糊拖尾。
  - 初始外壳不会急切求值次要目的地模块；
    首次导航可显示一个紧凑的本地化加载指示器，
    然后在本地代码块解析后保持正常的页面交互。
  - 减弱动效保留每个状态变化，并使用即时的
    程序化滚动与接近零的过渡时长。
- **关联规格**：`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md`、`04-ux/09-interaction-patterns.md`
- **验收**：C（聊天流）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`interaction-performance.test.mjs`）；通过
  `pnpm test:e2e:transcript` 的自动化 React/Chromium 渲染回归（无需
  提供商凭据；需要已安装的 Electron 和图形会话，或 Linux 上的
  Xvfb）。它挂载生产转录组件，在 100 个已完成分组下
  统计 20 次文本更新中的 ActivityGroup 渲染次数，
  检查变化的工具内容，并检查跨部分的 Task 终态/
  计时更新。该页面链接应用构建的样式表，
  下面的运行时状态场景会据此测量真实几何；
  完整的提供商流式输出与外壳响应性仍为草稿。

#### E2E-CHAT-runtime-status-keeps-row-position

- **前置条件**：一个活动会话，其转录高于
  会话视口，尾部由一个已完成的工具行占据；面板
  已构建（`pnpm build:js`）且 Electron 已安装。
- **步骤**：
  1. 挂载生产 `ChatTranscript`，使用固定消息，尾部
     由一个已完成的活动分组占据，且会话正在运行。
  2. 在没有任何运行时活动报告时，记录内容高度、滚动器的
     滚动高度/偏移，以及第一个和最后一个已渲染行的位置。
  3. 仅将会话的运行时活动切换为等待模型阶段；
     让布局稳定。
  4. 再次清除运行时活动并让布局稳定。
  5. 结束轮次（`isRunning` 为 false）并检查尾部。
- **预期结果**：
  - 等待行占据预留的状态通道：内容高度、滚动高度、
    滚动偏移，以及每个已渲染行的位置在状态出现时
    和清除后都保持不变（误差 0.01px 以内）。
  - 空通道保持预留且不可见——无背景、边框或
    阴影——在深色与浅色主题中都如此。
  - 状态行保持其实时区域语义（`role="status"`、`aria-live="polite"`），
    而空通道不携带任何待播报的文本。
  - 空闲的已完成转录完全不渲染状态通道，
    因此其布局不变。
- **关联规格**：`04-ux/08-component-spec.md`
- **验收**：C（聊天流）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`active-turn-surface.test.mjs`），并通过
  `pnpm test:e2e:transcript` 的自动化 React/Chromium 几何回归
  （`scripts/e2e/transcript-render.tsx`，无需提供商凭据；
  需要已安装的 Electron 和图形会话，或 Linux 上的
  Xvfb）。移除预留通道时，该场景会以 40.125px 的
  内容高度差和 40px 的行移动失败（issue #323）。

#### E2E-STREAM-long-turn-keeps-realtime

- **前置条件**：已配置提供商；一个 Agent 会话可以运行一个
  包含思考、工具和至少一个子 Agent 的长自治轮次。
- **步骤**：
  1. 开始一个长 Agent 任务，以较高的上游令牌速率
     流式输出思考与回答文本，并经过多个工具回合。
  2. 观察同一轮次中后续较短思考/回答块的流式
     延迟，包括一个嵌套子 Agent。
  3. 停止该轮次，在同一会话中发送一条新提示词，
     并比较新轮次的流式延迟。
  4. 确认仍在运行的轮次中的历史活动行不会
     因尾部令牌更新而闪烁或重建。
- **预期结果**：
  - 上游 200+ tok/s 的流保持视觉同步（允许按显示
    刷新率合批；不允许积压不断增长）。
  - 同一长轮次中后续的短块不会越来越慢。
  - 不需要通过停止加新提示词来恢复速度。
  - 父级与子 Agent 的流都保持实时。
  - `message_end` 之后的转录文本与流式内容一致。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/02-agent-runtime.md`、ADR 0242、D412、issue #299
- **验收**：C（聊天流）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`message-stream.test.ts`、
  `stream-coalescer.test.ts`、`streaming-benchmark.test.ts`、
  `assistant-turns.test.mjs`）；渲染长轮次场景为草稿

#### E2E-084: 长工具循环在提供商上下文上限前压缩

- **前置条件**：已配置提供商，已知 pi-ai 的上下文/输出
  上限；夹具可以产生重复的工具轮次和大型的、已被截顶
  的工具结果而不结束 Agent 运行。自动保护始终开启
  且没有任何设置项。
- **步骤**：
  1. 开始一个工具循环会增长超过硬预算的 Agent 任务。
  2. 让至少三个 `turn_end` 事件在 `agent_end` 之前发生；
     观察输入框/会话控件、处理行、转录和提示条。
  3. 继续直到一个检查点被安装，然后让任务完成。
  4. 发送更多提示词，直到第二个检查点被安装。
  5. 重复硬边界轮次，这次在已压缩范围内带有多个
     并行的截顶工具结果。
  6. 重启应用，重新打开会话，发送一条依赖于
     已总结旧工作的后续提示词，同时验证已完成的提示词
     不会作为裸的历史用户消息被重放。
  7. 用一个返回一次 Bedrock 的
     `prompt is too long: N tokens > M maximum` 的提供商夹具重复。
  8. 运行一个模型在远低于硬预算时调用 `new_context` 的轮次。
  9. 在空闲时手动调用 `/compact`。
- **预期结果**：
  - 每个 `turn_end` 都会在下一次提供商请求之前被评估，
    且绝不会把整个任务标记为空闲；输入框/配置控件保持
    禁用，直到 `agent_end`、`error` 或仅手动的
    `compaction_end`。运行中的后续助手轮次通过
    `prepareNextTurn` 压缩（pi 0.84.4+ 在终止轮次上跳过该
    钩子）；新的用户提示词仍在首次提供商请求前压缩。
  - 每次成功的压缩都向转录恰好添加一条分隔线行，
    位于该检查点覆盖的最后一条消息之后，
    并恰好弹出一个警告提示条。两个检查点产生两行，
    按序排列，且任何一行都不替换或隐藏消息。
  - `new_context` 调用显示为一条普通的工具活动行，
    立即返回，且检查点在随后的轮次边界创建，
    而不是在轮次中途。
  - 在检查点之后打开上下文用量检查器时，显示一行
    压缩次数和最新摘要的令牌估计；在任何
    检查点之前该行不存在。
  - 上下文用量指示器在悬停和键盘聚焦时暴露相同的
    本地化剩余上下文摘要，且其工具提示在
    主页/停靠输入框上方保持可见、不被裁剪。
  - 在硬边界处，下一次模型请求之前创建一个
    持久检查点。完整可见转录不变，且继续的
    任务保持在模型感知的安全预算之下。
  - 检查点之后的下一次提供商请求不包含边界之前的
    任何助手或工具消息——只有摘要，以及（当活动轮次
    仍在继续时）其最新的用户消息（可能携带
    检查点截断标记）。已完成轮次的检查点的
    保留尾部为空。请求中不存在没有其结果的
    工具调用，且展开原始转录行仍显示其完整的
    持久化结果。
  - 重启恢复摘要和记录的活动/已完成保留
    模式，且每条更早的压缩行仍被绘制。
    在检查点边界之前的重新生成/分叉会专门丢弃该记录；
    锚定在幸存消息上的记录被保留/重映射。
  - 精确的提供商溢出只从模型上下文中
    移除失败的助手消息，在压缩后重试一次，
    且在第二次溢出时不再循环。
  - 如果自动摘要生成失败，则追加一个持久的
    保留尾部回退检查点，运行保持活动，并弹出一条
    解释较旧模型上下文已被削减的警告；该检查点的
    转录行写作“summary generation failed · recent context retained”，
    绝不写作 `summary ≈N tokens`（ADR 0282）。在该回退之前，
    摘要请求对瞬时提供商失败以 2s/4s/8s 退避最多重试三次，
    停止会取消退避，确定性失败不重试，
    且序列化提示词超过窗口的输入会再发送一次，
    其中工具结果被截为短前缀，而不是跳过
    模型。如果回退持久化或安全预算防护失败，
    则发出一次 `CONTEXT_COMPACTION_FAILED`。
  - 如果后续提示词越过硬预算时最新检查点
    已经是转录的叶子，运行时会从完整转录
    重建一个更小的尾部，并沿用现有摘要，
    而不是报告没有新上下文可压缩。
  - 预算提醒在每个检查点窗口内各至多出现一次，
    绝不出现在转录中，也绝不出现在持久化的系统提示词中。
  - 空闲时的 `/compact` 会成功，并在压缩警告之上
    显示它自己的信息提示条，因为这是用户主动要求的。
    压缩失败通过 `CONTEXT_COMPACTION_FAILED` 只浮现一次，
    没有重复的错误提示条。
  - 设置中没有上下文管理卡片，设置搜索
    也不返回任何压缩相关行。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/02-agent-runtime.md`、`03-runtime/03-tools-and-permissions.md`、
  `03-runtime/04-data-storage.md`、`03-runtime/06-host-rpc-protocol.md`、
  `04-ux/06-settings-ia.md`、`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`、ADR 0030、ADR 0049、ADR 0061、ADR 0064、
  ADR 0136、D158、D203、D275
- **验收**：C（聊天/流）、F（持久化）、质量
- **里程碑**：M5
- **状态**：部分自动化（`runtime.test.ts`、
  `context-compaction.test.mjs`、`assistant-turns.test.mjs`、host-core
  转录/会话单元测试）；完整提供商/UI 旅程为草稿

#### E2E-AGENTS-001: 项目指令链配置 Agent 会话

- **前置条件**：一个项目包含根 `AGENTS.md`、嵌套的
  `packages/api/AGENTS.md`，且已配置提供商。
- **步骤**：
  1. 开始一个 Agent 模式会话，并提交一个被根
     指令覆盖的任务。
  2. 让 Agent 读取或编辑 `packages/api/handler.ts`。
  3. 添加 `packages/api/AGENTS.override.md`，然后让 Agent 访问
     该目录中的另一个文件。
  4. 在会话空闲时编辑根指令，然后提交一个
     后续任务。
- **预期结果**：初始运行时收到根指令链。在文件
  工具执行之前，嵌套指令被追加到其根来源之后，
  因而优先级更高。在同一目录中，`AGENTS.override.md` 优先于
  `AGENTS.md`；`CLAUDE.md` 和 `.claude/CLAUDE.md` 是回退名称。空闲时的
  后续任务使用变更后的根内容，而不是复用先前的运行时。
  空、不可读、超大和根目录之外的指令文件不会阻塞
  轮次；合并后的 UTF-8 内容上限为 32 KiB。如果路径特定
  解析超过其两秒截止期限或宿主不可用，
  文件工具使用基础指令链继续，且不保留同级的
  其他目录规则。同一提示词期间同目录的重复文件工具
  复用一次路径解析声明；下一个提示词重新解析，
  从而能观察到变更的指令文件。解析器使用
  运行时启动时传入的会话绑定项目根，
  不发出逐文件的 `session.get` RPC。
- **关联规格**：`03-runtime/02-agent-runtime.md`
- **验收**：C（聊天/流）、F（持久化）
- **里程碑**：M5
- **状态**：部分自动化（`project-instructions.test.ts`、
  `runtime.test.ts`）；完整
  提供商/UI 旅程为草稿

#### E2E-AGENTS-002: 全局设置与项目菜单管理指令文件

- **前置条件**：PI-Desktop 正在运行；可以打开一个项目。
- **步骤**：
  1. 在没有活动项目时打开“设置 -> 指令”，并保存全局
     内容。
  2. 开始一个新的 Agent 会话，验证其指令上下文包含
     全局来源。
  3. 打开项目视图，使用某项目的更多菜单编辑并保存其
     显示的 `AGENTS.md`。
  4. 在一个新的或空闲的会话中提交一条提示词。
- **预期结果**：全局编辑器只针对 `~/.pi/agent/AGENTS.md`。
  项目编辑器只能从已知项目的项目视图更多菜单进入，
  且只针对该项目根目录的 `AGENTS.md`。两个编辑器都显示
  其解析后的路径，保留输入的文本，并通过专用
  IPC 而非通用文件写入 API 保存。全局内容在下一个运行时中
  先于项目内容；已保存的项目内容跟在其后，
  并在冲突时优先。项目编辑器是视口级对话框。
- **关联规格**：`03-runtime/02-agent-runtime.md`、ADR 0037
- **验收**：C（聊天/流）、D（工作区）、F（持久化）
- **里程碑**：M5
- **状态**：单测覆盖（`project-instructions.test.ts`）；UI 旅程为草稿

#### E2E-085: 展开的侧边栏排版保持列表内容紧凑

- **前置条件**：展开的侧边栏至少包含一个独立
  会话、一个带会话的已保留项目，以及一个空项目分组；
  浅色与深色主题可用。
- **步骤**：
  1. 以默认窗口宽度打开应用，检查会话标题、
     项目/分组标题、空状态文案、分区标签，以及底部的
     设置、插件和通知图标。
  2. 在浅色与深色主题之间切换，然后将窗口收窄到
     支持的最小展开侧边栏宽度。
  3. 将侧边栏层级与 14px 聊天正文文字对比，并检查
     过长的会话/项目名称。
- **预期结果**：
  - 底部操作图标使用共享的 32px 命中目标和紧凑的 14px 图标
    尺寸；插件紧跟在设置右侧。
  - 会话标题、项目/分组标题和空状态文案使用 `--text-md`
    （13px）；分区标签和次要元数据保持 `--text-sm`（12px）。
  - 层级在两种主题中都保持可读，行距保持紧凑，
    约为 28–32px，且长标签截断而不引起外壳重排。
- **关联规格**：`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md`、D161
- **验收**：质量
- **里程碑**：M5
- **状态**：单测覆盖（`sidebar-navigation.test.mjs`）；渲染视觉
  场景为草稿

#### E2E-086: 助手 Mermaid 代码围栏安全渲染且不阻塞流

- **前置条件**：提供商可以流式输出包含一个
  有效 Mermaid 流程图、一个无效 Mermaid 围栏和普通围栏代码的
  助手回答；浅色与深色主题可用。
- **步骤**：
  1. 缓慢流式输出一个有效的 `mermaid` 围栏，
     在闭合围栏到达前后观察它。
  2. 将已完成的图表滚入视口，切换源码，复制源码，
     并在浅色与深色主题之间切换。
  3. 向上滚动使转录跟随暂停，然后将另一个已完成的
     图表移到视口附近。
  4. 渲染无效和超过 20,000 字符的 Mermaid 源码，以及试图
     使用 HTML 标签、外部图片、链接或 Mermaid 配置覆盖的载荷。
  5. 展开包含 `mermaid` 围栏的思考内容。
- **预期结果**：
  - 部分流保持为普通的源码代码块；只有完整
    的回答围栏才开始渲染，且只在视口附近。普通代码
    围栏和思考中的 Mermaid 围栏保留其源码呈现。
  - 图表使用有界的卡片外观，保持在转录宽度内，
    切换主题时没有陈旧颜色，并暴露键盘可访问的
    图表/源码和复制控件。复制返回原始围栏源码。
  - 图表高度变化让钉住的转录保持在底部，
    但在用户向上滚动后绝不恢复跟随。
  - 无效、超大或不安全的输入不能让助手轮次失败、执行链接、
    加载嵌入媒体、注入外来 HTML 或削弱严格设置；
    渲染不可用时回退为可读可复制的源码。
- **关联规格**：`04-ux/08-component-spec.md` §8.7、
  `04-ux/09-interaction-patterns.md` §2、`05-security/01-security.md` §2、D165
- **验收**：C（聊天与流）、安全、质量
- **里程碑**：M5
- **状态**：单测覆盖（`mermaid-rendering.test.mjs`）；渲染安全和
  视觉场景为草稿

#### E2E-092: 打包运行时自包含且无重复依赖

- **前置条件**：从干净的发布主机目录构建的原生 macOS arm64
  与 Intel x64、Windows x64 和 Linux x64 安装包；
  干净的应用配置文件；
  英文与 zh-CN 可用；外部网络访问可禁用而
  回环保持可用；一个确定性的回环 OpenAI 兼容
  夹具提供商返回代码、KaTeX、Mermaid 和一条 Bash 命令。
- **步骤**：
  1. 在每个原生运行器上记录每种压缩产物格式，
     以及未打包应用、ASAR、Electron 运行时、语言包
     和未打包原生文件的体积。
  2. 检查 ASAR 与资源清单中的 sidecar、宿主、生产
     模块、源码映射、测试/示例/声明、Chromium 语言包
     和原生预构建目标。
  3. 在每个 macOS 安装包上，对应用可执行文件和
     `Resources/bin/pi-desktop-host-core` 运行 `file`（或 `lipo -info`）；
     确认 arm64 与 x86_64 安装包只包含其声明的架构，
     且 Rust 宿主与 Electron 应用匹配。确认共享的
     `apps/desktop/package.json` macOS 配置产出名为
     `PI-Desktop-X.Y.Z-arm64.dmg` 和 `PI-Desktop-X.Y.Z-arm64-mac.zip` 的
     arm64 资产，Intel 资产使用 `PI-Desktop-X.Y.Z-x64.dmg` 和
     `PI-Desktop-X.Y.Z-x64-mac.zip`；确认发布目录同时具有 DMG 与
     ZIP 产物，以及一个合并的 `latest-mac.yml` 源，其 URL
     和校验和与生成的资产匹配。
  4. 检查渲染器产物的体积控制：产出的 JS 已压缩、
     不存在 `.woff` 或 `.ttf` 文件、KaTeX `woff2` 字重保留，
     且品牌标志是渲染器尺寸的 `assets/brand/logo-*.png`，
     而不是 1024px 安装器图标。
  5. 配置回环夹具提供商，禁用外部出站，
     并从干净配置启动。在英文与简体中文之间切换，
     请求确定性响应，渲染常见
     JavaScript/TypeScript、Python、Rust、shell、Mermaid
     和未知语言围栏，以及 KaTeX 和一个 Mermaid 图表，
     运行 Bash 夹具，并验证宿主与 Agent sidecar 健康。
  6. 确认排版和品牌在裁剪后的字体回退下存活：KaTeX 数学公式
     以其自身字重渲染，界面和助手输出中的中文文本在每种
     内置字体选择下都保持可读，且侧边栏与启动闪屏标志
     在 HiDPI 显示器上清晰渲染。
- **预期结果**：每个 macOS 安装包恰好包含一个内置 Agent sidecar、
  一个与其声明架构匹配的 Rust 宿主，以及仅配置的
  Chromium 语言包。发布产物包含两种原生 macOS
  架构、DMG/ZIP 产物和一个合并的更新器源。每个 macOS
  DMG 和 ZIP 携带其标准的 `-arm64` 或 `-x64` 架构标记，
  且发布产物中不残留通用 macOS DMG、ZIP 或 blockmap。
  按架构划分的更新器元数据指向这些名称，无冲突。
  渲染器依赖
  通过 Vite 产物存在，而不是重复的原始
  `node_modules`；依赖源码映射、测试、示例、声明、
  第二份 agent-runtime 树，以及可可靠排除的非目标原生资产
  都不存在。精选的 Shiki 语法在本地高亮，
  未知围栏保持为可读的纯文本。渲染器发布压缩后的代码块，
  不携带遗留的 `woff`/`truetype` 载荷，保留每个 KaTeX `woff2`
  字重，且只导入渲染器尺寸的品牌标志；数学公式、
  每种内置字体下的中文文本，以及界面标志都正确渲染。
  离线外壳可启动，且所有夹具能力使用本地打包资产；
  提供商/更新网络故障不阻塞启动。
- **关联规格**：`02-architecture/01-architecture.md`、
  `02-architecture/02-tech-stack.md`、`03-runtime/07-process-model.md`、
  `04-ux/02-i18n-english-first.md`、`05-security/01-security.md`、
  `06-delivery/06-release-runbook.md`、D008
- **验收**：A（应用启动）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`packaging-footprint.test.mjs` 校验静态
  依赖与构建器配置）；原生清单与打包离线
  启动为草稿

#### E2E-093: 变更类工具串行执行并从陈旧编辑上下文中恢复

- **前置条件**：一个项目绑定的 Agent 会话拥有可写工作区；
  提供商夹具可以在一个工具批次中发出两个同会话的
  `Write`/`Edit` 调用；第二个编辑可以被赋予陈旧的 `tag`；
  一条 Bash 命令可以返回非零退出码和诊断信息。
- **步骤**：
  1. 开始一个为同一会话发出两个变更的任务，
     同时发出独立的读/搜索调用。
  2. 在第一个变更执行期间，检查关键工具结果和转录。
  3. 强制第二个 `Edit` 携带一个不再能对文件做哈希的
     `tag`，锚点无法被恢复重映射，然后让 Agent
     重新读取该文件并基于当前内容重试。
  4. 运行一条以非零退出的 Bash 命令，检查其
     工具结果和内联状态。
  5. 用范围重叠的 `ops` 载荷重复。
  6. 如果任务使用宣称工作区之外的专用 worktree，
     验证其受防护的 Bash 编辑和产生的 `git diff`。
- **预期结果**：
  - 读/搜索调用可以重叠，但同一会话同一时间只有
    一个 `Write`/`Edit` 执行；排队的变更在等待时
    不占用另一个全局变更槽位。
  - 陈旧 tag 的编辑失败且不改变文件，返回
    携带实时 tag 和锚点处当前内容的
    `EDIT_TAG_MISMATCH`；范围重叠的载荷在任何写入之前
    以 `EDIT_RANGE_INVALID` 失败。
  - 非零 Bash 命令被标记为失败，同时保留其退出码、
    stdout 和 stderr 供 Agent 与诊断使用。
  - 重试执行一次全新读取并作用于当前文件；当
    该路径用完其恢复宽限后，第三次计入的同路径失败
    ——或第三次失败的 shell 补丁命令——返回一个终止性
    工具结果和一条可见的 `MUTATION_RETRY_BUDGET_EXHAUSTED` 行，
    停止变更工作流，且不反复修改旧的补丁产物
    或其 hunk 头。
  - 最终文件恰好包含预期的更改，且 diff/审查数据中
    不含部分或交错的变更。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`、
  `03-runtime/06-host-rpc-protocol.md`、`03-runtime/08-error-codes.md`
- **验收**：E（工具与权限）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`tool_budget.rs`、`tools/mod.rs`、
  `agent-runtime/runtime.test.ts`）；完整提供商/UI 旅程为草稿

#### E2E-096: 原地恢复瞬时提供商流故障

- **前置条件**：一个项目绑定的 Agent 会话使用一个确定性的
  提供商夹具：发出部分助手流，终止一次，然后在下一次
  请求时成功；第二个夹具可以连续终止十一次；第三个夹具
  在一次尝试的响应头之前返回 `OpenAI API error (502)`、
  在下一次尝试的流式中途返回；第四个夹具连续返回十一个
  502；第五个夹具返回带 `Retry-After` 的 503；第六个夹具
  在流前返回一次不透明的 400/422，并在省略输出上限字段时
  成功；该夹具支持 Chat Completions 与 Responses 两种载荷，
  以及在不透明故障之后中止。
- **步骤**：
  1. 用终止一次的夹具开始一个 Agent 轮次，
     观察部分助手响应。
  2. 等待有界重试，并在恢复后检查转录、
     会话状态和终态诊断。
  3. 用终止十一次的夹具重复，检查终态错误
     消息/事件及其诊断细节。
  4. 运行混合阶段 502 夹具，检查响应头之前和
     流式中途两种 502 的请求计数与终态诊断。
  5. 运行持续十一个 502 的夹具并检查终态错误。
  6. 运行 503 `Retry-After` 夹具并检查观察到的等待。
  7. 用两种 API 风格运行不透明 400/422 夹具，
     检查两个请求载荷、请求计数和终态诊断。
  8. 在第一个不透明 400/422 失败后立即中止，
     检查没有修复请求被启动。
  9. 重新加载会话，验证只有已完成的响应或
     单一的终态失败助手消息保持持久。
- **预期结果**：
  - `terminated` 被归类为 `STREAM_FAILED`，上游网关
    `502`/`503`/`504` 被归类为可重试的 `PROVIDER_ERROR`。
  - 非 429 的瞬时故障共享一个有界预算：首次尝试之后
    十次重试，共十一次提供商尝试，由请求
    建立与流式交付共享。每次重试等待一个可中止的
    有界退避，从模型上下文中移除失败的助手消息，
    且不产生重复的助手气泡或终态错误通知。
  - 流式中途的 502 会被重试，而不是立即浮现。
    混合阶段夹具在两个阶段间共用一个计数器，
    总共进行十一次尝试，而不是每个阶段各重试一次。
    没有 `Retry-After` 头时观察到的等待为 1、2、4 秒，
    之后每次重试均为 8 秒，两个阶段完全一致。
  - 只有失败的请求被重放：会话、其转录和任何
    已完成的工具调用在每次重试中都不受影响。
  - 恢复的轮次发出一个终态生命周期，并保持同一个
    可见助手消息 id。其终态诊断保留有界重试的
    结果与尝试次数。
  - 第十一次终止发出一个终态 `STREAM_FAILED` 助手错误
    和生命周期事件；持续的 502 夹具发出一个终态
    `PROVIDER_ERROR`。两者都携带 `retryAttempt: 10`。
    可用的细节包括阶段、流计时和提供商状态，
    不含凭据，也不含不受限的提供商响应体。
  - 503 夹具等待服务器的 `Retry-After`，而不是客户端
    退避。非 429 的服务器与回退等待上限为 8 秒。
  - 带有 `(no body)` 标记的流前 400/422 会得到一次静默的
    修复请求，其中 `max_tokens`、`max_completion_tokens` 和
    `max_output_tokens` 被移除。调用方的载荷重写保持生效，
    修复不消耗瞬时重试预算或退避，且
    Chat Completions 与 Responses 夹具都在第二次请求时完成。
    第二次不透明失败仍为终态。
  - 如果轮次在第一次不透明失败后被中止，修复请求
    不会启动，结果为 `aborted`。
  - 流式中途的 HTTP 429 由 E2E-149 独立的十次重试路径覆盖；
    两个预算互不消耗。
  - 认证、模型选择、上下文和描述性的
    格式错误请求故障不进入任一提供商重放路径。
    不透明空响应体 400/422 的情形是上述有界修复
    例外。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/02-agent-runtime.md`、`03-runtime/08-error-codes.md`、
  `08-meta/decisions-log.md`（D186、D259、D378）、ADR 0050、ADR 0128、ADR 0206
- **验收**：C（聊天与流）、F（持久化）、H（诊断）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`agent-errors.test.ts`、`provider-retry.test.ts`、
  `runtime.test.ts`、`subagent.test.ts`）；完整提供商/UI 旅程为草稿

#### E2E-149: 原地静默恢复提供商速率限制（429）

- **前置条件**：一个项目绑定的 Agent 会话使用确定性的
  提供商夹具：一个建立时 HTTP 429 和一个流式中途 HTTP 429。
  每个夹具可以在重试后成功，也可以连续返回十一个 429
  响应。夹具覆盖 `retry-after-ms`、`retry-after` 秒数和
  HTTP-date 头，并支持在等待期间中止。一个内置子 Agent
  使用具有相同响应的夹具。
- **步骤**：
  1. 用下一次请求会成功的建立时 429 夹具开始一个 Agent 轮次。
  2. 用下一次请求会成功的流式中途 429 夹具重复。
  3. 检查两次恢复的转录、生命周期事件、请求计数
     和终态诊断。
  4. 用连续十一个 429 响应重复，然后检查终态
     助手错误和诊断细节。
  5. 启动子 Agent 夹具，然后重复持续十一个 429 的情形。
  6. 开始另一个 429 轮次并在等待期间中止；
     检查没有后续提供商请求或终态重试被启动。
  7. 用认证、模型选择、格式错误请求和
     上下文错误夹具重复。
- **预期结果**：
  - 每个 429 在建立和开始后的恢复中都被归类为
    可重试的 `PROVIDER_RATE_LIMITED`，包括当捕获的 HTTP
    状态为 429 而响应体省略速率限制措辞时。诊断保留
    `providerStatus: 429`。
  - 建立与流式中途的失败共享一个预算：首次尝试之后
    十次重试。因此持续的夹具总共进行十一次提供商
    尝试，绝不通过嵌套的 pi-ai 重试放大尝试次数，
    也不发出中间的助手错误、生命周期 `error`、
    `turn_end` 或 `agent_end`。
  - 恢复的尝试从模型上下文中移除失败的助手消息，
    并复用其可见的助手消息 id。转录有一个助手
    气泡和一个终态生命周期；有界重试诊断保留
    阶段、延迟和尝试次数。
  - 延迟优先级为 `retry-after-ms`、`retry-after` 秒数、
    HTTP-date，然后是带正抖动的指数退避。服务器与
    回退等待上限为 30 秒，且等待可中止。
  - 预算耗尽时发出一个终态 `PROVIDER_RATE_LIMITED` 助手错误
    和生命周期事件，携带 `retryAttempt: 10` 和
    `providerStatus: 429`；在十一次提供商尝试之后不发生
    第十一次重试。结构化的助手错误卡片保持为唯一的失败表面，
    暴露一个本地化的**继续**操作，不提供**重新生成**操作；
    通用的 TurnOutcomeCard 被省略。激活**继续**会将本地化的
    续写提示词（`Continue the user's unfinished task.` / `继续用户未完成的任务`）
    追加到同一会话，并开始下一个轮次，
    而不丢弃失败的轮次。
  - 子 Agent 使用相同的十次重试预算和一个可见的子气泡；
    其最终报告只在预算耗尽后才为失败，
    中间的 429 绝不成为父级可见的错误报告。
  - 在退避期间中止会取消待处理的定时器，
    且不启动后续提供商请求。认证、模型选择、
    格式错误请求和上下文夹具不进行任何自动重试。
  - 429 预算与 E2E-096 中的非 429 瞬时预算相互独立。
    429 不消耗瞬时重试，502 也不消耗 429
    重试。
- **关联规格**：`03-runtime/02-agent-runtime.md`（D245、D378）、
  `03-runtime/08-error-codes.md`、`08-meta/decisions-log.md`（D245、D378）、
  ADR 0091、ADR 0206
- **验收**：C（聊天与流）、H（诊断）、质量
- **里程碑**：M5
- **状态**：单测覆盖（`provider-retry.test.ts`、`runtime.test.ts`、
  `subagent.test.ts`）；完整提供商/UI 旅程为草稿

## 7A. M6 计划与外壳场景

#### E2E-104: 遗留契约值迁移到 schema v11

- **前置条件**：schema-v8 夹具包含带有遗留 `chat` 值的会话、
  应用默认值和定时记录，以及转录和权限；
  schema-v7 与 schema-v9 夹具覆盖两条受防护的入口路径。
- **步骤**：1) 启动 host-core 并允许受防护的迁移（v7 先
  到达 v8）。2) 检查会话、设置、定时模式、
  `plan_approvals` 字段/索引，以及精确可读的 v8/v9 备份。3)
  重启并检查相同记录。4) 用损坏的应用设置、
  损坏的定时配置、非法的顶层运行模式，以及未知
  或平台错误的默认 shell 重复。5) 用一个平台合法但
  被标记为暂时不可用的持久化 shell，以及嵌套的扩展 `mode` 字段重复。
- **预期结果**：每个遗留模式都变为 `plan`，Agent 保持为新会话和
  新任务的默认值，转录/权限存活，`plan_approvals` 保留
  审批数据并具有产物/执行字段，v8→v11 在其 WAL
  检查点和 v8 备份之后是一个原子事务，v9 和 v10 创建
  可读备份，且迁移失败让源 schema 保持
  权威。每个损坏或
  非法的夹具都在 schema 提升之前失败关闭。暂时
  不可用的平台合法 shell 保持持久化，供运行时回退使用，
  且嵌套的扩展模式保持不变。
- **关联规格**：`00-baseline.md`、`03-runtime/04-data-storage.md`、
  `03-runtime/01-ipc-protocol.md`、`04-ux/06-settings-ia.md`、ADR 0053
- **验收**：F（持久化）、H（诊断）
- **里程碑**：M6
- **状态**：已自动化（2026-08-05 通过）：host-core 139/139，
  包括 15 个聚焦的数据库测试，覆盖 schema-v7→v8→v11、
  v8→v11、v9→v11 和 v10→v11 受防护路径、
  精确可读备份、失败关闭回滚、重启、转录、设置、
  定时模式、审批字段和索引测试

#### E2E-105: Plan 策略保持宿主权威

- **前置条件**：一个项目绑定的会话在 Plan 中空闲，具备
  BrowserPreview、一个插件工具，以及一个伪造的 `requestedMode = "agent"` 夹具。
- **步骤**：1) 检查可见的 Plan 工具。2) 使用 Read/Glob/Grep 和
  BrowserPreview。3) 尝试通过宿主以每种权限模式
  使用 Write、Edit、插件和未知工具。4) 在
  Ask、接受编辑和 Auto 下运行 Bash。
- **预期结果**：无论伪造的模式、授权或 Auto 如何，
  Plan 都拒绝 Write/Edit/插件/未知工具；Bash 遵循所选的
  权限模式。运行时保持为单个 pi Agent，且所有拒绝都被审计。
- **关联规格**：`03-runtime/02-agent-runtime.md`、
  `03-runtime/03-tools-and-permissions.md`、`03-runtime/05-host-core-rust.md`、
  `03-runtime/06-host-rpc-protocol.md`、`05-security/01-security.md`、ADR 0053
- **验收**：E（工具与权限）、安全
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：`test:e2e:plan` 加上
  host-core 权限/策略与 agent-runtime 工具组合测试

#### E2E-106: SubmitPlan 被拒绝后回到可编辑规划并重新提交新产物

- **前置条件**：一个项目绑定的会话在 Plan 中空闲，
  已配置提供商；`.pi/plan/` 不存在或为空，
  且工作区允许宿主创建产物。
- **步骤**：1) 让 Agent 以固定的标题、Markdown 和
  问题调用 `SubmitPlan`。2) 逐字节检查新的
  `.pi/plan/*.md` 文件和 `plan_approvals` 行。3) 检查卡片的
  标题和产物打开器；确认问题/描述、有效期/截止时间和
  状态都不存在，且只提供批准和拒绝。4) 打开
  审批模式菜单，选择 Auto，并验证下一次审批
  默认为 Auto。5) 拒绝该提案。6) 确认持久模式为
  Plan，实时状态为可编辑的 `planning`，审批门已清除，
  且后续提示词被接受。7) 让 Agent 修订并在该新轮次中
  以完整快照再次调用一次 `SubmitPlan`。8) 以记住的 Auto 模式批准第二个提案。
- **预期结果**：宿主将提交的精确 Markdown 字节保存在一个
  新的唯一产物中，记录其相对路径/哈希/大小以及结构化的
  标题/问题，且绝不让渲染器或 sidecar 写入或替换它。
  由标题派生的产物文件名可从标题辨认，包括
  非 ASCII 标题字符。卡片显示标题并打开产物；
  不要求内联的问题/Markdown/哈希/大小，也不要求
  有效期/截止时间指示器。所选审批模式在本地记住，
  供下一次审批使用。
  拒绝对第一行是终态的，持久模式保持 Plan，
  并将实时状态恢复为可编辑规划。后续提示词/重新提交
  创建第二个完整的 Markdown 快照和一个不同的
  `.pi/plan/*.md` 产物；第一个产物的字节保持不变。
  以记住的 Auto 模式批准第二个提案，仍会将同一个 Agent 切换为 Agent 并将执行排队。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/02-agent-runtime.md`、`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、`04-ux/03-permission-ux.md`、
  `04-ux/08-component-spec.md`、`05-security/01-security.md`、ADR 0053
- **验收**：C（会话/流）、E（权限）、F（持久化）
- **里程碑**：M6
- **状态**：已自动化（2026-08-05 通过）：`test:e2e:plan` 验证
  宿主产物/审批生命周期。可选的实时 `test:e2e:plan-ui` 用例
  需要环境提供的 OpenAI 兼容提供商；使用模型
  `gpt-5.6-luna` 的授权运行以 6/6 通过，控制台诊断为零。
  它使用了真实受控的输入框与发送，实时 Agent 调用了
  `EnterPlanMode` 然后 `SubmitPlan`，正常渲染的 Ask 审批
  通过 preload/主进程解决，批准的执行发出了精确的持久
  标记，且一个私有的、环境门控的 WeakMap 检查证明了
  批准前后是同一个 `DesktopAgentRuntime` 对象。
  主进程/宿主/sidecar 的 PID 保持稳定；凭据从未进入
  CDP 或输出。默认的无密钥运行保持 5/5，实时用例被显式跳过。

#### E2E-CHAT-opaque-floating-decision-and-retry-surfaces: Plan 审批与重试悬停保持不透明

- **状态**：已自动化（`apps/desktop/test/plan-mode-source-contract.test.mjs`、`apps/desktop/test/active-turn-surface.test.mjs`）
- **优先级**：P2
- **覆盖**：C、质量 / 浮动输入框与重试表面
- **前置条件**：渲染器 CSS 是 `apps/desktop/src/styles` 下的生产源码。
- **步骤**：
  1. 检查输入框停靠样式中的 `.plan-approval-bar`。
  2. 检查转录样式中的 `.run-activity-error-popover.message-error`。
  3. 在实时会话中悬停或聚焦一个正在重试的活动轮次行。
- **预期结果**：
  - Plan/Goal 审批栏用 `--ds-bg-composer` 配 `--ds-shadow-composer` 绘制，而不是文档流内的 `--ds-tile` 洗刷，因此它在透明的输入框停靠区之上保持为可读的板。
  - 重试悬停工具提示在 `--ds-bg-elevated-opaque` 之上混合错误色调，因此转录文本不会透出来。
- **关联规格**：`04-ux/03-permission-ux.md`、`04-ux/08-component-spec.md`
- **验收**：C、质量
- **里程碑**：M6
- **状态说明**：源码契约断言这些 CSS 令牌。实时悬停仍是视觉检查。

#### E2E-107: Plan 审批使用单一的 30 分钟绝对有效期

- **前置条件**：存在一个待处理的 Plan 请求，时钟可控。
- **步骤**：1) 记录 `createdAt` 和 `expiresAt`。2) 重新加载渲染器
  并重新打开该请求。3) 将时间推进到截止时间且不处理。4)
  在过期后尝试批准。
- **预期结果**：宿主存活期间，渲染器重新加载只水合
  仍待处理的行，且显示的倒计时保留原始绝对
  截止时间；已拒绝、已过期、已批准/已完成和
  已中断的终态卡片不参与重新加载水合。过期记录
  `expired`，会话保持 Plan，返回 `PLAN_APPROVAL_TIMEOUT`，
  并拒绝迟到的响应，且不改变模式或权限。
- **关联规格**：`03-runtime/06-host-rpc-protocol.md`、
  `03-runtime/08-error-codes.md`、`03-runtime/10-session-state-machine.md`、
  `04-ux/03-permission-ux.md`、ADR 0053
- **验收**：E（权限）、H（诊断）、安全
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：`test:e2e:plan-ui` 覆盖
  待处理的渲染器重新加载；`test:e2e:plan` 和确定性的
  host-core 迟到过期测试覆盖绝对截止时间、超时持久化和
  失败关闭解决。不声称任何终态卡片的重新加载水合。

#### E2E-108: 启动屏障中断待处理的 Plan 工作

- **前置条件**：一个 Plan 请求处于待处理状态，带有存活的
  审批等待者和正在运行的规划轮次；宿主和渲染器可以独立重启。
- **步骤**：1) 重新加载渲染器并列出存活请求。2) 在处理之前
  重启宿主/应用。3) 在启动后检查 `plan_approvals` 行、轮次
  和会话。4) 提交重启前的响应。
- **预期结果**：宿主存活期间的渲染器重新加载保留
  仍待处理的行和原始截止时间。完整的宿主/应用重启
  在 RPC 服务之前事务性地将待处理行和轮次标记为
  中断/中止，会话保持 Plan，并对旧响应返回
  `PLAN_APPROVAL_STALE`。不恢复任何可操作的陈旧卡片或执行，
  且不要求 UI 在重启后呈现中断的终态快照。
  不持久化或发送任何进程纪元字段。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、`03-runtime/07-process-model.md`、
  `03-runtime/10-session-state-machine.md`、`04-ux/08-component-spec.md`、ADR 0053
- **验收**：F（持久化）、H（诊断）、安全
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：`test:e2e:plan` 执行真实的
  宿主重启，host-core 恢复测试验证中断的持久状态；
  待处理的渲染器重新加载断言由 E2E-107 的 UI 通道覆盖。

#### E2E-109: 已批准的 Plan 执行在重启后不重放

- **前置条件**：一个 Plan 请求已在 Ask 下被批准，
  并分别在 `queued` 和 `running` 状态下各被捕获一次。
- **步骤**：1) 在每种状态下重启宿主。2) 在启动后检查
  `plan_approvals.execution_state` 和轮次记录。3) 观察
  提供商/工具调用和会话模式。4) 显式开始一个新的
  用户轮次。
- **预期结果**：排队/运行中的执行字段变为 `interrupted`，
  相关轮次中止，不重放任何提供商/工具调用，
  且会话保持 Agent，因为批准已经提交。新轮次只在
  用户开始后才会被接受；重启后不要求任何中断的
  终态卡片或陈旧操作。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、`03-runtime/07-process-model.md`、
  `03-runtime/10-session-state-machine.md`、ADR 0053
- **验收**：C（会话/流）、F（持久化）、H（诊断）、安全
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：`test:e2e:plan` 重启真实的
  排队与已认领执行，并验证不重放以及 Agent 保留

#### E2E-110: 定时的 Plan 在任何工作之前被拒绝

- **前置条件**：一个定时任务是 Plan 且无人值守运行器
  可用；提供商、产物和队列写入可以被观察。
- **步骤**：1) 通过无人值守路径触发该任务。2) 检查
  提供商轨迹、`.pi/plan/` 和 `plan_approvals` 表。3) 将
  任务/会话显式切换为 Agent 并再次运行。
- **预期结果**：Plan 在提供商、产物、审批或队列工作之前
  被拒绝，返回 `PLAN_REQUIRES_INTERACTIVE_SESSION`；不发生后台
  自动批准。显式选择 Agent 则允许正常的无人值守策略。
- **关联规格**：`03-runtime/04-data-storage.md`、
  `03-runtime/08-error-codes.md`、`04-ux/01-ui-ia.md`、ADR 0053
- **验收**：F（持久化）、H（诊断）、安全
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：`test:e2e:plan` 验证 Plan
  在副作用之前被拒绝，以及显式 Agent 执行独立于
  全局默认值

#### E2E-111: 活动轮次、待处理审批与配置边界被强制执行

- **前置条件**：一个会话有一个活动的 Agent 轮次，另一个会话
  空闲；一个 Plan 运行可以被置于待处理/排队/运行中。
- **步骤**：1) 在活动轮次期间尝试第二个提示词、
  模式/提供商/模型/权限/shell 配置更改，以及第二次
  Plan 提交。2) 让轮次变为待处理审批，
  并重复提示词和配置尝试。3) 拒绝该审批。
  4) 提交一个后续提示词，让 Agent 创建一个
  修订的 Plan 快照。5) 在会话处于可编辑规划后重复配置。
- **预期结果**：当轮次或活动的待处理审批存在时，
  活动轮次/配置更改、提示词和第二次 Plan 提交
  以 `AGENT_BUSY`/`CONFLICT` 失败；只有发起会话被阻塞。
  拒绝将持久会话恢复为 Plan、将实时状态恢复为规划，
  清除审批门，并允许后续提示词/新产物。
  终态提案快照在当前渲染器生命周期内不禁用输入、
  输入框模式图标或模型选择。空闲/规划状态下的
  配置成功，且不泄漏任何跨会话事件或工作区根。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/02-agent-runtime.md`、`03-runtime/06-host-rpc-protocol.md`、
  `03-runtime/10-session-state-machine.md`、`04-ux/08-component-spec.md`、ADR 0053
- **验收**：C（会话/流）、E（权限）、质量
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：`test:e2e:plan` 验证宿主
  边界，`test:e2e:plan-ui` 验证仅待处理门控，以及当前
  渲染器生命周期内可编辑的被拒绝/终态状态

#### E2E-111a: 已暂存的模式切换不会在轮次中途移动实时规划指示器

- **前置条件**：一个项目绑定的会话正在运行一个 Agent 轮次，
  已配置提供商；渲染器显示工作指示器，
  且没有 `Plan / planning` 指示器。
- **步骤**：1) 在 Agent 轮次仍在运行时，将输入框模式
  图标从 Agent 切换为 Plan。2) 在轮次结束前
  检查转录状态区。3) 让轮次到达其终态事件。
  4) 在空闲时再次检查状态区，然后发送一条新提示词。
- **预期结果**：已暂存的 Plan 选择立即更新图标，
  但实时规划指示器在途中的 Agent 轮次运行期间保持不显示；
  直到新提示词在暂存模式下开始时，它才显示
  `Plan / planning`，且输入框图标在实时状态投射出
  `planning` 之前不脉动。终态事件冲刷配置后，
  会话是持久的 Plan，处于可编辑规划状态，
  发送的提示词在流前槽位浮现 `Plan / planning` 指示器，
  同时图标脉动。一旦有了工具或答案，
  转录的规划行让位，图标脉动保持为实时提示。
- **关联规格**：`03-runtime/02-agent-runtime.md`、
  `03-runtime/10-session-state-machine.md`、`04-ux/08-component-spec.md`
- **验收**：C（会话/流）、质量
- **里程碑**：M6
- **状态**：草稿

#### E2E-112: 可选择的 shell 目录持久化默认项

- **前置条件**：宿主有一个可用的平台目录条目，夹具可以
  让一个已持久化的选择变得不可用，且一个项目绑定的
  Agent 会话空闲。Windows 通道演练多选排序。
- **步骤**：1) 检查目录中平台合法的 ID
  `windows-powershell`、`windows-pwsh`、`cmd`、`git-bash` 和 `bash`。2) 验证设置
  拒绝不可用或平台错误的 ID。3) 选择一个可用的 shell
  并持久化 `defaultCommandShell`。4) 让该持久化选择不可用，
  重启，并验证目录选择第一个可用的平台 shell
  且带 `fallback: true`。5) 执行不变的 `Bash` 工具。
- **预期结果**：设置只持久化合法且稳定的 shell ID；
  不可用条目保持不可用并附带指引，之后不可用的
  持久化选择使用有意设计的第一个可用回退。
  宿主调用生效的 shell，而工具/协议名称保持 `Bash`，
  且 shell 选择遵循空闲配置边界。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/03-tools-and-permissions.md`、`03-runtime/06-host-rpc-protocol.md`、
  `04-ux/06-settings-ia.md`、`04-ux/08-component-spec.md`、ADR 0054
- **验收**：B（模型/配置）、E（工具/权限）、F（持久化）
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：`test:e2e:plan` 验证目录、
  校验、持久化和重启；确定性的 host-core 目录
  测试验证存储的 shell 不可用时的第一个可用回退

#### E2E-113: 陈旧的 shell 身份失败关闭

- **前置条件**：一个 Bash 轮次有一个钉住的有效 shell
  ID/方言；夹具可以在启动前改变有效的目录选择。
- **步骤**：1) 改变有效的 shell ID 或方言。2) 用旧的
  预期 ID 执行 Bash。3) 检查进程创建、回退尝试、
  审计和 UI 错误。4) 启动一个新轮次并重试。
- **预期结果**：第一次调用返回 `COMMAND_SHELL_CHANGED`，不启动
  任何进程，且在轮次钉住后不更换 shell。审计记录
  所选的 ID 和方言。后续运行需要新轮次的快照。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`、
  `03-runtime/05-host-core-rust.md`、`03-runtime/06-host-rpc-protocol.md`、
  `03-runtime/08-error-codes.md`、`05-security/01-security.md`、ADR 0054
- **验收**：E（工具/权限）、H（诊断）、安全
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：`test:e2e:plan` 验证
  标记创建前的陈旧方言拒绝，以及 host-core 的陈旧 ID/方言测试

#### E2E-114: Bash 独立流式输出 stdout 与 stderr

- **前置条件**：一个选定的 shell 可用，且一个确定性的
  命令写入交错的 stdout 与 stderr 块。
- **步骤**：1) 通过 `Bash` 执行该命令。2) 观察宿主/RPC/UI
  输出事件。3) 检查最终的有界结果和转录行。
- **预期结果**：stdout 与 stderr 保持分离、按工具调用排序，
  并在进程运行期间可见。最终输出保留截断元数据；
  没有块跨越会话或轮次，且 Bash 协议名称不变。
- **关联规格**：`03-runtime/06-host-rpc-protocol.md`、
  `03-runtime/09-logging-and-observability.md`、
  `03-runtime/16-tool-result-limits.md`、`04-ux/09-interaction-patterns.md`、ADR 0054
- **验收**：C（流）、E（工具）、质量
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：`test:e2e:plan` 验证
  独立的 stdout/stderr 通知和最终工具身份；
  宿主/运行时流测试覆盖有界累积和会话隔离

#### E2E-115: Bash 超时使用 60 秒及有界覆盖

- **前置条件**：一个选定的 shell 可以运行超过 60 秒的
  命令；宿主时钟可观察。
- **步骤**：1) 不带超时覆盖运行。2) 观察 60 秒的
  截止点。3) 用范围内的覆盖运行，包括超过 300
  秒的值。4) 提交零、负值和超过 21,600 秒的覆盖。
- **预期结果**：缺失的超时使用恰好 60 秒，并在进程树关闭后
  返回 `TOOL_TIMEOUT`。范围内的值在 1–21,600 秒内有效；
  超出范围的值校验失败，且绝不启动进程。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`、
  `03-runtime/06-host-rpc-protocol.md`、`03-runtime/08-error-codes.md`、
  `03-runtime/16-tool-result-limits.md`、`05-security/01-security.md`、ADR 0054、
  ADR 0167
- **验收**：E（工具）、H（诊断）、安全
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：长超时的 `test:e2e:plan`
  测得无覆盖超时为 60,024 ms，并验证了范围内及
  非法边界，且没有延迟的标记写入

#### E2E-116: Bash 中止关闭完整进程树

- **前置条件**：一条 Bash 命令启动一个发出延迟输出的
  子进程和孙进程；发起会话正在运行。
- **步骤**：1) 启动该命令。2) 中止活动轮次。3) 在关闭宽限
  之后检查进程后代、输出事件、审计和轮次状态。
- **预期结果**：进程组/作业树被终止，没有后代残留，
  不再有后续输出到达，轮次返回 `TURN_ABORTED`，
  且工作区不被自动回滚。
- **关联规格**：`03-runtime/03-tools-and-permissions.md`、
  `03-runtime/07-process-model.md`、`03-runtime/08-error-codes.md`、
  `03-runtime/16-tool-result-limits.md`、`05-security/01-security.md`、ADR 0054
- **验收**：C（中止）、E（工具）、H（诊断）、安全
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：`test:e2e:plan` 中止一个真实的
  后代进程树并验证没有迟到的标记/输出；
  host-core 测试验证取消注册表清理

#### E2E-117: Agent/Plan/Goal UX 与语言环境中不含 Chat 控件

- **前置条件**：应用可以在英文与 zh-CN 下运行，
  有一个空闲会话、Plan 产物夹具、shell 设置，
  以及全局搜索的命令分区可用。
- **步骤**：1) 在英文下检查 Agent/Plan/Goal、权限、
  产物审批和 shell 控件。2) 进入 Plan，在渲染器
  保持存活期间检查规划/审批/队列/终态。3) 批准并拒绝一个
  提案，确认审批表面在宿主确认后消失。
  4) 检查命令分区，确认它恰好包含
  `builtin.session.new`、`builtin.agent.compact` 和三个
  `builtin.mode.*` 命令，且内置 `/` 组中只有 `/new`、
  `/compact`、`/agent-mode`、`/plan-mode` 和 `/goal-mode`。
  确认已移除的命令 ID 和 `newChat` / `openProject` /
  `openSettings` 分发别名都不存在。使用 `/plan-mode` /
  `/agent-mode` 斜杠别名切换当前空闲会话，
  确认输入框图标立即变化。在任一别名之后的同一草稿中
  输入提示词并发送；确认模式已变化，
  且提示词保留为可见的用户轮次。单独发送一个别名，
  确认它保持为本地模式切换，不创建空的转录轮次。
  如果提示词分发失败，确认完整草稿保持可编辑。
  5) 在终态提案后重新加载，检查会话，
  同时断言 Electron 主进程与宿主的进程身份未变化。
  6) 在 zh-CN 下重复。7) 在可见命令中搜索已移除的
  Chat 模式和请求修改控件。宿主/应用重启恢复由 E2E-108 和 E2E-109 单独演练。
- **预期结果**：Agent 是默认值；输入框左侧的图标是
  当前会话唯一的 Agent/Plan/Goal 控件；Plan 和 Goal 显示
  Ask/接受编辑/Auto、已提交的标题、产物打开器、
  记住的审批模式、仅批准/拒绝、shell 目录/回退状态，
  以及本地化的失败关闭状态。不暴露
  Chat 模式、`/chat-mode`、请求修改操作、
  内联 Markdown/哈希/大小要求，或陈旧的可操作队列；
  终态检查点元数据只在当前渲染器生命周期内
  保持不可操作，而输入框审批表面在宿主确认的
  解决后被移除。
  渲染器重新加载不水合已拒绝、已过期、
  已批准/已完成或已中断的终态卡片。宿主/应用重启
  不重放工作、不恢复陈旧操作，且不要求 UI
  呈现中断的终态快照；`page = "chat"` 保持为内部路由。
- **关联规格**：`01-product/01-product-scope.md`、`04-ux/01-ui-ia.md`、
  `04-ux/04-builtin-commands.md`、`04-ux/03-permission-ux.md`、
  `04-ux/06-settings-ia.md`、`04-ux/08-component-spec.md`、
  `04-ux/02-i18n-english-first.md`、ADR 0053、ADR 0054
- **验收**：C（会话）、质量
- **里程碑**：M6
- **状态**：已自动化（2026-08-04 通过）：原始 CDP 的
  `test:e2e:plan-ui` 使用环境门控的 Electron 主进程探针
  针对现有宿主，断言 Electron/宿主 PID 稳定，
  覆盖待处理恢复、实时终态控件、渲染器重新加载后
  被拒绝和已批准/已完成终态卡片的缺失、EN/zh-CN，
  以及 1280×800 / 900×700 渲染。E2E-108/E2E-109 覆盖宿主重启中断、陈旧操作拒绝和不重放。

#### E2E-118: 重新生成的轮次在分支归档后保留其最终答案

- **前置条件**：一个项目绑定的 Agent 会话，其转录已有
  一轮已完成的交互；提供商流式输出一个多工具轮次，
  长到足以让最终助手消息通过持久化 outbox 落盘；
  对 `<data_dir>/sessions/<id>.jsonl`、
  `<id>.revisions.jsonl` 和 `messages` 索引有读取权限。
- **步骤**：1) 重新生成助手回答，使根用户轮次携带
  `revisionCount` / `activeRevision`，且修订 1 被归档。
  2) 让重跑完成一个以工具调用后跟最终助手
  消息结束的轮次。3) 在 `agent_end` 之后立即检查
  转录文件、`messages` 行和归档的修订载荷。
  4) 重新加载会话。5) 将根气泡翻回修订 1，再向前翻回。
- **预期结果**：最终助手消息存在于转录文件中、
  索引中，并作为归档分支的最后一条消息。
  轮次的每条消息都保留其所属的 `turn_id`。
  根携带 `revisionCount = 2` 和 `activeRevision = 2`，
  重新加载显示完整轮次，翻页完整地恢复每个分支。
  轮次完成路径上不发生任何 `session.replaceMessages` 调用。
- **关联规格**：`03-runtime/04-data-storage.md` §4.9/§7、
  `03-runtime/06-host-rpc-protocol.md` §4、ADR 0041、ADR 0060
- **验收**：C（会话）、F（持久化）、H（诊断）、质量
- **里程碑**：M6
- **状态**：由 host-core 单元测试覆盖（2026-08-06）：
  `save_active_branch_revision_keeps_a_message_appended_after_its_read`
  在读取之后追加一条消息的情况下归档，并断言转录、
  归档载荷和索引 `(seq, turn_id)` 行；
  `replace_messages_preserves_owning_turn_ids` 覆盖其余的
  重写调用方。UI 翻页仍为手动。

#### E2E-246: 重试大型会话时截断而不使用全转录 RPC


- **前置条件**：一个 Agent 会话，其实时转录有数千条
  消息（大到一行 `session.replaceMessages` JSON-RPC 会
  超过数十 MB），最后一个用户轮次已完成或已失败。
- **步骤**：1) 重试或重新生成最后一条用户提示词。
  2) 检查宿主 RPC 流量、`turns.status`、实时 jsonl
  和 `message_revisions`。3) 如果第一次尝试仍在屏幕上显示为运行中，立即再次重试。
- **预期结果**：Electron 主进程只以 `fromMessageId`
  调用 `session.truncateFrom`——不调用 `session.replaceMessages`，
  也不对被丢弃的数组调用 `session.saveRevision`。
  保留的前缀绝不出现在 NDJSON 请求中。
  遗留的运行中轮次在 `beginTurn` 之前变为 `aborted`。
  被丢弃的尾部被归档（刷新已标记的变体，
  或新建一个非活动变体）。截断进行中再次重试
  不会再发送一份完整转录。UI 错误不是 `host RPC timeout: session.replaceMessages`。
- **关联规格**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/04-data-storage.md` §4.9/§7、
  `03-runtime/06-host-rpc-protocol.md` §4、ADR 0216、D390
- **验收**：C（会话）、F（持久化）、质量
- **里程碑**：M6
- **状态**：由 host-core 单元测试覆盖（2026-09-10）：
  `truncate_from_drops_the_tail_and_archives_the_discarded_branch`、
  `truncate_from_rejects_an_unknown_message`、
  `truncate_from_refreshes_the_stamped_revision`、
  `truncate_from_rpc_cuts_without_shipping_the_kept_prefix`。
  桌面旅程仍为草稿。

#### E2E-247: Windows host-core 在 stdin EOF 后退出，超大 RPC 立即失败

- **前置条件**：Windows host-core 已安装 Alt+Space 键盘钩子；
  一个 NDJSON 行超过 64 MiB 的 JSON-RPC 请求。
- **步骤**：1) 向运行中的 host-core 发送 stdin EOF。
  2) 从 Electron 调用一个字符串化载荷超过 64 MiB 的宿主方法。3) 如果仍有行到达 host-core，
  检查 `LIMIT_EXCEEDED` 回复的 id。
- **预期结果**：stdin EOF 之后，host-core 退出，
  不等待 130 秒。Windows 键盘钩子不会保持
  stdout 写入器存活。Electron 在 `stdin.write` 之前
  以 `LIMIT_EXCEEDED` 拒绝超大调用。
  宿主侧的超大回复使用从前缀窥探到的请求 id，而不是 `null`。UI 错误不是 `host RPC timeout`。
- **关联规格**：`03-runtime/07-process-model.md`、
  `03-runtime/06-host-rpc-protocol.md` §7、ADR 0217、D391
- **验收**：质量
- **里程碑**：M6
- **状态**：由单元与源码契约测试覆盖（2026-09-11）：
  `start_does_not_keep_the_stdout_channel_open`、
  `peek_jsonrpc_id_reads_a_string_id_from_a_truncated_prefix`、
  `apps/desktop/test/windows-host-runtime.test.mjs`（弱发送器）、
  `apps/desktop/test/rpc-lifecycle-contract.test.mjs`（客户端预检）、
  `packages/shared/src/rpc-limits.test.ts`。桌面旅程仍为草稿。

#### E2E-119: 并行子 Agent 汇报而不进入父级上下文

- **前置条件**：一个项目绑定的 Agent 会话，用户主目录包含
  `~/.agents/subagents/scout.md`（只读，无 `tools` 键）、
  `~/.agents/subagents/fixer.md`（`tools: Read, Edit`）、
  `~/.agents/subagents/pinned.md`（`model:` 指向第二个
  已配置的提供商）和 `~/.agents/subagents/broken.md`（缺少 `name`）；
  一个其流可以被驱动为在一条助手消息中发出两个 `Task` 调用的提供商；权限模式为 `ask`，使委派的 `Edit` 被门控；
  对 `<data_dir>/sessions/<id>.jsonl` 和 `messages` 索引有读取权限。
- **步骤**：
  1. 提示一个轮次，让助手在一条消息中发出两个 `Task`
     调用——`scout` 和 `pinned`。在两者运行期间和
     各自结束后观察委派卡片；折叠它，然后展开每个节点。
  2. 提示一个其助手消息发出单个 `Task` 调用——`scout`
     ——的轮次，并将其呈现与步骤 1 对比。
  3. 提示一个两个 `fixer` 委派各自编辑不同文件的轮次，
     并只回答第一张权限卡片。
  4. 回答第二张卡片，然后提示第三个轮次，让两个 `fixer`
     委派编辑**同一个**文件。
  5. 开始一次扇出，在一张卡片在屏幕上、另一张
     排队时按停止。
  6. 提示一个指定 `broken` 的 `Task` 调用，然后一个指定
     不存在的 Agent，再然后一个其定义钉住未配置提供商的。
  7. 将会话切换到 Plan，再切换到 Goal，检查工具目录。
  8. 重新加载会话，重新展开委派卡片和每个 `Task`
     节点。
- **预期结果**：
  - 步骤 1 中的两个委派并发运行，且 `pinned` 在其自己的
    提供商/模型上流式输出，而父级保持会话的。
  - 步骤 1 中的两个 `Task` 调用组成一张全宽委派卡片。
    活动期间它展开一次，其头部更新子 Agent 数和已结束数；
    结束后它保留用户的展开选择，并报告聚合的
    成功、警告或问题状态以及耗时。
  - 步骤 2 中单独的 `Task` 绘制同样的卡片，只有一个委派节点——
    相同的根、连接线、结果、运行时和步数——而绝不是紧凑的
    单行工具行（D265）。其聚合行针对一个子 Agent 措辞，
    因此没有任何语言环境显示“1 个 Subagents”或“Subagents working”。
  - 展开的卡片显示一个主 Agent 根，按父行顺序连接到
    `scout` 和 `pinned`，委派之间没有虚构的边。
    每个节点显示其 Agent、简短描述、明确结果、
    时长和步数。展开节点恰好显示一次简报、
    报告，以及 `status`/`turns`/`toolCalls`。
    委派行只出现在该节点内，绝不出现在轮次流或小地图中。
  - 如果父级在那些 `Task` 调用之后继续工作——思考、
    `Read`、`Grep` 或一个生命周期行——该工作是一个
    独立的处理分组，而不是委派卡片内的行（D319）。
    卡片的区块、“Subagent working”头部和拓扑画布只包含 `Task` 节点。
  - 父级的下一次请求包含报告，且**不**包含委派消息或
    工具行；但这些行仍然存在于转录文件和
    索引中，带有 `meta.parentToolCallId` 和 `meta.agentName`。
  - 只有队首的权限卡片被渲染；它指明请求的委派和
    排在其后的等待数量。回答它会揭示下一张卡片，
    且任何一个回答都不会解决另一个请求。
  - `scout` 完全不能调用 `Edit` 或 `Write`；`fixer` 可以。
    步骤 4 中的同文件编辑按确定的顺序应用，且互不丢失对方的写入。
  - 停止会拒绝已显示和已排队的请求，两个委派都在
    各自的 `Task` 节点内以文本和图标显示为 `aborted`——
    父级轮次只结束一次，聚合卡片以警告结束。
  - `broken` 不在目录中，并带有一条启动诊断，
    会话保留其另外三个委派；未知 Agent 和无法解析的
    模型钉住各自以指明原因的 `Task` 工具错误失败，
    不回退到会话提供商，也不导致轮次失败。
  - `Task` 在 Plan 和 Goal 中不在目录里。
  - 重新加载后卡片默认折叠；重新展开时，
    节点顺序、归属、结果和嵌套内容与实时显示时
    完全一致。
- **关联规格**：`03-runtime/02-agent-runtime.md` §5f/§7.2b/§8、
  `03-runtime/03-tools-and-permissions.md` §10.2、
  `03-runtime/04-data-storage.md` §4.7a、`04-ux/03-permission-ux.md` §6a、
  `04-ux/08-component-spec.md` §9.9、ADR 0062、decisions-log D201、D265、D319
- **验收**：C（会话）、E（工具与权限）、F（持久化）、
  安全、质量
- **里程碑**：M6
- **状态**：由单元测试覆盖（2026-08-06）：`packages/shared`
  `subagent-definition.test.ts` 和 `packages/agent-runtime`
  `subagent-definitions.test.ts`（frontmatter、工具过滤、
  畸形文档、全局用户遮蔽内置、遗留 `maxTurns` 被忽略）；
  `subagent.test.ts`（报告限界、中止、事件归属、提示词框架）和 `path-lock.test.ts`
  （同路径排序、并发上限）；桌面端
  `permission-inline.test.mjs`（队列顺序、按 id 匹配移除、
  工具调用移除、中止拒绝队列、卡片文案）、
  `subagent-wiring.test.mjs`（主进程发现与模型钉住）和
  `subagent-transcript.test.mjs` + `assistant-turns.test.mjs`
  （嵌套、单次报告打印、记忆化、接纳单独委派的
  卡片门控，以及两种语言环境中数量感知的聚合文案），加上
  `subagent-topology.test.mjs`（委派检测、结构化结果和
  聚合计数）。完整的多提供商扇出和渲染拓扑
  交互仍为手动。

#### E2E-SUBAGENT-legacy-turn-limit-frontmatter-is-ignored

- **前置条件**：Agent 模式。一个用户文档
  `~/.agents/subagents/legacy-worker.md`，其 frontmatter 在合法的
  `description` 和 `tools` 旁边声明了 `maxTurns: 2`；第二个文档把同一个键
  拼写为 `max-turns: 2`；第三个则完全不提它。
- **步骤**：1) 打开 Settings → Subagents，确认 Built-in 与 Global 分组中的
  每一行都连同其工具授权一起渲染，并且页面或编辑器 Advanced 折叠区中的任何
  位置都不存在轮次上限字段。2) 委派给 `legacy-worker`，让它执行超过两个
  工具调用轮次。3) 通过设置 API 读回该文档，再以原始文件方式读一次。
  4) 在该行上打开编辑器，不做任何修改直接保存，然后重新读取该文件。
- **预期结果**：两种拼写都能作为合法定义加载。被声明的键与任何其他未识别的
  frontmatter 键一样被完全忽略：没有解析错误，没有点名它的警告或诊断，定义
  仍然可解析，文件也不会被重写。被委派者永远不会在两个轮次时被停止，也永远
  不会报告 `truncated`；它只会在完成时或被 `TaskStop` 时结束。应用中的任何
  界面，以及任何语言环境的 `chat.subagentStatus` 文案，都不会报告轮次上限或
  “Turn limit reached”状态。
- **关联规范**：`03-runtime/02-agent-runtime.md` §5f、
  `04-ux/06-settings-ia.md` §7、ADR 0253、decisions-log D423
- **验收**：C（会话）、质量
- **里程碑**：M6
- **状态**：草稿 —— 单测已覆盖 `packages/shared`、
  `packages/agent-runtime`，以及 host-core 的 `user_subagents` 回归测试；
  完整 UI 旅程需要有相应能力的环境。

#### E2E-SUBAGENT-inherit-parent-tools

- **前置条件**：Agent 模式。一个用户文档
  `~/.agents/subagents/worker.md`，带有 `tools: inherit`（无可指派的额外项），
  父级目录中至少有一个插件或 MCP 工具，以及一个非空的 Skill 目录。
  内置 `explorer` 仍保持其白名单不变。
- **步骤**：
  1. 确认 Settings → Agent → Subagents 列出了 `worker`，且 Edit 显示
     Inherit parent tools 为开启。不改动 tools 直接保存，再重新打开该文件。
  2. 向 `worker` 委派 `Task`，任务说明中需要一个 Skill id 和一个父级已有的
     插件工具。
  3. 在同一会话中向内置 `explorer` 委派 `Task`。
  4. 确认 `worker` 不能调用 `Task`、`ToolSearch`、`asktool` 或
     `new_context`。
- **预期结果**：
  - 第 1 步对 `tools: inherit` 完成往返；文档不会从 `agents.active` 中消失，
    保存也不会把它改写成 `Read, Glob, Grep`。
  - `worker` 获得 Skill、插件/MCP 工具，以及父级内置工具减去拒绝清单。它的
    系统提示词列出这些名称，包含 `# Skills` 目录，并且当父级目录包含
    Bash/Edit/Write 时声明它可以修改文件。
  - `explorer` 仍只有 `Read, Glob, Grep, Bash`，且不能调用 Skill。
  - `worker` 的 Task 目录行显示为 `(tools: inherit)`。
- **关联规范**：`03-runtime/03-tools-and-permissions.md` §10.2、
  `03-runtime/02-agent-runtime.md` §5f/§7.2b、ADR 0246、issue #215
- **验收**：E（工具与权限）、安全
- **里程碑**：M6+
- **状态**：已由 `test:e2e:subagents`（host-core 创建/读取/落盘/激活/loader 继承往返）和 `test:e2e:subagent-models`（真实 sidecar/本地传输的 Task 派生、继承的 Skill/插件目录减去拒绝清单，以及内置 explorer 的隔离）自动化覆盖。单测覆盖仍保留在 `packages/shared`、`packages/agent-runtime` 和 host-core `user_subagents`；UI 继承复选框旅程仍为草稿。必需套件：`test:e2e`、`test:e2e:subagents`、`test:e2e:subagent-models`。

#### E2E-145：工具结果以结构化块读取，绝不以 JSON 呈现

- **前置条件**：一个绑定项目的 Agent 会话，本轮已允许相应权限；安装了一个
  结果为任意记录的插件工具；工作区中存在一个足以触发 host 截断的大文件。
- **步骤**：
  1. 运行一轮：读取一个源文件、glob 一个目录、grep 一个 token、再以
     `outputMode: filesWithMatches` 和 `count` grep 一次、编辑一个工作区
     文件、编辑一个 scratch 根目录文件、运行一个失败的 shell 命令，并调用
     该插件工具。
  2. 检查每个折叠的活动行，然后在浅色和深色主题下展开所有行。
  3. 点击一个 Glob 路径和一个 Grep 命中标题。
  4. 触发一个高风险工具，使内联权限卡片出现。
  5. 读取一个被截断的文件，并复制每一个块。
- **预期结果**：
  - 没有任何展开行显示转义后的 JSON，也没有任何载荷出现两次。
  - Read/Write 显示高亮内容；Bash 将命令、输出和带错误色调的 stderr 显示为
    独立的块，空通道被省略；Glob 显示路径列表；Grep 在 `content` 模式下按
    文件分组显示带行号的命中，在 `filesWithMatches` 下显示路径列表，在
    `count` 下显示每个文件的总数；失败的命令带有一个 `exit 1` chip。
  - Read 行的折叠 chip 把返回的窗口显示为
    `{lineCount},L{offset+1}-L{offset+lineCount}`（例如
    `50,L16-L65`），绝不显示 `fileBytes`；缺少有效窗口元数据的 Read 结果
    没有大小 chip。Write 继续显示其字节大小 chip。
  - 每个 Glob/Grep 路径列表行都是起始对齐、字符间距自然；字形不会被拉伸
    分布到整个块宽度上。
  - 工作区编辑不显示内联 diff（由它的 ReviewChangeCard 负责）；scratch 编辑
    显示紧凑的 diff 和一个 `scratch` chip。
  - 插件结果渲染为标签/值字段和带标签的块，而不是一团数据。
  - 点击路径会在工作面板中打开它；工作区根之外的路径不可点击。
  - 权限卡片的参数预览使用相同的块。
  - host 截断标记保持可见，出现 `truncated` chip，host 的 `notice` 作为中性
    备注渲染在它所限定的块下方，被截断的列表报告被隐藏的剩余部分，复制得到
    完整载荷。
- **关联规范**：`04-ux/08-component-spec.md` §9、§10.2、
  `08-meta/decisions-log.md`（D192）
- **验收**：C（聊天与流式）、E（工具与权限）、质量
- **里程碑**：M5
- **状态**：单测已覆盖（`tool-presentation.test.mjs`、
  `transcript-style.test.mjs`）；完整 UI 旅程为草稿

#### E2E-146：不产生可见文本的一轮会重跑一次

- **前置条件**：一个绑定项目的 Agent 会话使用确定性的 provider 夹具，该夹具
  让一轮在没有任何工具调用、没有任何文本的情况下结束——一次带有 reasoning
  内容，一次什么都没有；第二个夹具运行让首轮和重跑都以这种方式结束。
- **步骤**：
  1. 用仅 reasoning 的夹具启动一个 Agent 轮次，在 runtime 恢复期间观察
     转录。
  2. 之后检查转录、会话状态和终端诊断。
  3. 用“什么都没有”的夹具重复。
  4. 用“两次静默”的夹具重复，并检查终端错误消息、其详情折叠区和操作按钮。
  5. 点击错误的重试操作。
  6. 重新加载会话，验证哪些内容被持久保留。
- **预期结果**：
  - 恢复的轮次保持同一个可见的 assistant 消息 id，发出一个终态生命周期，且
    不显示错误。用户只看到答案。
  - 空的 assistant 消息在重跑前从模型上下文中移除，因此 provider 永远不会
    连续收到两条 assistant 消息，它也永远不会被追加到持久化转录中。
  - 终端诊断能识别空响应恢复以及重跑的结果。
  - 第二次静默发出一个终态可重试的 `EMPTY_MODEL_RESPONSE` assistant 错误和
    生命周期事件；消息点名两次尝试，重试操作会重新发送上一条提示词。
  - 因请求工具而导致文本为空的轮次不受影响，已中止或已失败的轮次同样不受
    影响。
  - 每条提示词只发生一次重跑，包括同一提示词内发生上下文溢出恢复之后。
- **关联规范**：`03-runtime/02-agent-runtime.md` §5e、§7、
  `03-runtime/08-error-codes.md` §3.2、`08-meta/decisions-log.md`（D193）
- **验收**：C（聊天与流式）、F（持久化）、H（诊断）、质量
- **里程碑**：M5
- **状态**：单测已覆盖（`runtime.test.ts`）；完整 provider/UI 旅程为草稿

#### E2E-146a：已批准的 Plan/Goal 进度文本会继续一次

- **前置条件**：一个绑定项目的会话拥有已批准的 Plan 或 Goal，以及一个确定性
  provider 夹具。一个夹具以简短的前瞻性进度文本结束且没有工具调用；第二个
  以正常的最终报告结束；
- **步骤**：
  1. 用“仅进度”夹具启动已批准的执行，在 runtime 恢复期间检查转录。
  2. 在继续执行完成后，检查模型请求上下文、生命周期事件和可见的消息 id。
  3. 用“正常最终报告”夹具重复。
  4. 再次使用进度夹具，但让继续执行发出一个真实的工具调用，然后检查工具
     结果和最终报告。
- **预期结果**：
  - 进度文本保留在同一条 assistant 气泡中，并且恰好引发一次继续执行。
    provider 收到的 user/执行上下文末尾不带先前的 assistant 消息，继续执行
    携带进度提示（nudge）。
  - 首次尝试的 `agent_start`、`turn_start`、`turn_end` 和 `agent_end` 被抑制；
    UI 可见的是复用的气泡 id 和一个终态生命周期。nudge 在运行后被移除。
  - 继续执行中的工具调用走普通的自主循环；它不会创建重复的 assistant 气泡
    或生命周期。
  - 正常的最终报告（包括在静默轮次恢复之后得到的报告）不会引发不必要的
    进度继续。普通 Agent 文本回答保持不变。
- **关联规范**：`03-runtime/02-agent-runtime.md` §5e/§5e.1/§7、
  `03-runtime/08-error-codes.md` §3.2
- **验收**：C（聊天与流式）、F（持久化）、H（诊断）、质量
- **里程碑**：M5
- **状态**：单测已覆盖（`runtime.test.ts`、`progress-turn.test.ts`）；完整
  provider/UI 旅程为草稿

#### E2E-147：受限搜索保持在其预算内，且 agent 会同步叙述

- **前置条件**：一个绑定项目的 Agent 会话；工作区包含一个数 MB 的源文件、
  一个带 `.map` 同级文件的压缩 bundle（单行、数 MB 长）、一个二进制文件，
  以及一个被 `.gitignore` 排除的依赖树。
- **步骤**：
  1. 检查 `tools.list` 中的 `Read`、`Glob` 和 `Grep`。
  2. 读取那个数 MB 的文件，然后从报告的下一个偏移量再读一次。
  3. Grep 一个会命中压缩 bundle 及其 `.map` 的 token。
  4. 用 `path` 指向被忽略的依赖树再 grep 同一个 token，然后用 `include`
     收窄到一种扩展名，再分别用 `outputMode: filesWithMatches` 和 `count`。
  5. 用一个宽泛模式 Glob，再带 `path` 和 `limit` Glob。
  6. 读取该二进制文件。
  7. 运行一个 stdout 输出远超 shell 预算的 shell 命令，再运行一个在 stderr
     打印进度噪声后失败的命令，并打开每个标记中指定的溢出（spill）文件。
  8. 提出一个需要多批工具调用的问题，观察批次之间的转录。
- **预期结果**：
  - 每个描述都携带其参数和真实的上限数值。
  - 没有任何单个工具结果超出其预算：Read/Glob/Grep 为 128 KB，Bash 为
    96 KB。Read 报告 `offset`、`lineCount`、`fileBytes` 和下一偏移量的
    `notice`；第二次读取无重叠地继续；`totalLines` 从第一次读取起就始终
    报告，让模型一开始就知道文件规模。填满的默认窗口或请求的窗口即使文件
    还有后续内容也报告 `truncated: false`。
  - 任何文件大小都不会被拒绝。来自 bundle 和 `.map` 的行在 16,384 字符处被
    裁剪，裁剪计数出现在 `notice` 中，因此单独一行无法占满整个结果。
  - 显式 `path` 可以深入被忽略的依赖树；不带它时同样的搜索从那里返回空。
    `include`、`outputMode` 和 `headLimit` 各自收窄载荷，结果按最近修改在前
    排序。当 `rg` 在 PATH 上时 Grep 使用它且仍符合该契约；当它缺失或以退出
    码 2 退出时，Grep 回退到进程内实现（D315）。
  - 读取二进制文件以 `TOOL_BINARY_CONTENT` 失败，且没有二进制内容到达模型；
    Grep 则静默跳过它。
  - Bash stdout 保留其头部，stderr 保留其尾部，两个标记都指明哪一端被保留
    以及溢出文件路径，且每个溢出文件打开后都是更完整的输出。
  - agent 用用户所使用的语言回答，在每批工具调用之前用一句话说明它正在做
    什么，任何两批之间都不会没有新的可见文本，并以一个自包含的结果收尾。
- **关联规范**：`03-runtime/16-tool-result-limits.md`、
  `03-runtime/02-agent-runtime.md` §7、`08-meta/decisions-log.md`（D194、D306、D315）
- **验收**：C（聊天与流式）、E（工具与权限）、质量
- **里程碑**：M5
- **状态**：单测已覆盖（host-core `tools` 测试、`runtime.test.ts` 提示词
  断言）；完整 provider/UI 旅程为草稿

#### E2E-100：粘贴导入的 MCP server 能运行，且只在其作用域内生效

- **前置条件**：磁盘上有两个项目，`~/work/api` 和 `~/personal/site`。
  PATH 上有一个本地 stdio MCP server。每个项目各有一个 Agent 会话。
- **步骤**：
  1. Extensions → MCP → Import from JSON。粘贴一个包含三个 server 的
     `mcpServers` 文档：一个合法的 stdio 条目、一个位于可信 LAN 地址（例如
     `http://192.168.1.20:8080/mcp`）且不带 `type` 的远程 HTTP 条目，以及
     一个没有 `command` 的 stdio 条目。
  2. 确认导入，然后打开导入的 stdio server 并点击 Test connection。
  3. 保持该 server 为 **Everywhere**，在每个项目中让 agent 列出其可用工具。
  4. 把该 server 设为 **These projects**，只勾选 `~/work/api`。
  5. 在每个项目中再问一次。
  6. 在仍开着的 `~/personal/site` 会话中——它是在 server 为全局时组装的——
     让 agent 按名称调用该 server 的一个工具。
  7. 编辑该 server 的 `env` 并保存；在 `~/work/api` 中再问一次。
  8. 重命名该 server 并重新设置作用域；再问一次。
  9. 把该 server 的命令指向一个不存在的二进制文件，保存，然后打开一个新
     会话。
  10. 恢复合法命令并 Test connection。通过 `ToolSearch` 激活一个工具，
      然后在两次调用之间终止 stub server 进程。在现有会话中不再搜索直接
      调用同一个工具。
  11. 用重启后省略该工具的 stub 重复，以及在恢复前 server 被禁用或被移出
      作用域的情况。再尝试断连后的并发调用，以及恢复握手失败的 server。
- **预期结果**：
  - 已激活的工具在传输层重启后无需第二次搜索即可工作；并发调用共享一次
    握手。新的 server 列表仍必须广播该工具。已移除的工具和非活跃的 server
    会被拒绝而不执行调用；非活跃的 server 不会被重新连接。恢复失败返回
    `UNAVAILABLE`，且在编辑或 Test connection 之前不会触发重复的握手尝试。
    失败的工具执行绝不会被重放。
  - 两个 server 被导入；第三个被列为已跳过，原因是“a stdio server
     requires command”。LAN HTTP 条目作为 `http` 落库且 url 保持完整，
    编辑器显示未加密连接警告。
  - Test 报告已连接并列出它发现的工具名称，该行的图标从连接中变为就绪。
  - 在全局作用域期间，两个会话都能看到 `mcp_<serverId>_<tool>` 名称。
  - 收窄后只有 `~/work/api` 会话能看到它们；摘要 chip 显示“1 project”并
    点名该项目。
  - 第 6 步的过期调用以 `TOOL_NOT_FOUND` 和“not active for this session”
    失败——作用域在派发时生效，而不仅仅在目录中。
  - `env` 编辑会断开连接：下一次组装或调用会重新握手，且工具行为反映新值。
    第 8 步的重命名不会重连任何东西。
  - 损坏的命令记录为 `failed` 并附带消息，不贡献任何工具，且在随后的会话
    组装时不会被重新拨号；按 Test 会重试它。
- **关联规范**：`07-plugins/01-plugin-system.md` §12、
  `03-runtime/01-ipc-protocol.md` §12a、`08-meta/decisions-log.md`（D192、D193）
- **验收**：E（工具与权限）、质量
- **里程碑**：M5
- **状态**：单测已覆盖（`apps/desktop/test/user-mcp.test.mjs`、
  `packages/shared/src/mcp-import.test.ts`、host-core `mcp_servers` 测试）；
  完整 UI 旅程为草稿

#### E2E-100B：远程 HTTP MCP server 的 OAuth 2.1 授权与令牌生命周期

- **前置条件**：一个配置为要求 OAuth 2.1 认证（RFC 9728 发现与 PKCE S256）的
  HTTP MCP server 端点。
- **步骤**：
  1. 打开 Settings > Agent > MCP。添加一个 HTTP MCP server URL。
  2. 该 server 状态显示为 `Authorization required`。
  3. 点击 `Authorize`。Main 在 `127.0.0.1` 上启动回环监听，携带 RFC 8707
     `resource` 打开外部浏览器访问授权端点。
  4. 在浏览器中完成登录，重定向到 `http://127.0.0.1:<port>/callback`。
  5. 回环回调校验 state/code，用 PKCE verifier 完成令牌交换，把令牌保存到
     加密机密 `secret:mcp:<id>:oauth`，渲染转义后的成功页面，并发出 `done`
     事件。
  6. Settings UI 把状态更新为 `Ready` 并显示发现的工具，展示本地化成功
     toast，并显示 `OAuth` 徽标。
  7. 当访问令牌过期时，`UserMcpRuntime` 透明地使用刷新令牌获取新的访问
     令牌，无需用户介入。
  8. 通过 `mcp.transfer` 移动该 server 时，OAuth 令牌机密会在目标 ID 下被
     保留并重新键控。
- **关联规范**：`03-runtime/01-ipc-protocol.md`、ADR 0283、ADR 0142
- **验收**：E（工具与权限）、安全
- **里程碑**：M5
- **状态**：单测已覆盖（`apps/desktop/test/mcp-oauth.test.mjs`、`apps/desktop/test/user-mcp.test.mjs`）；完整 UI 旅程为草稿

#### E2E-101：用户 Skill 只写一次，并按项目限定作用域

- **前置条件**：磁盘上有两个项目。每个项目各有一个 Agent 会话。
- **步骤**：
  1. Extensions → Skills → New。以空描述保存。
  2. 填写描述，编写正文，并保存。
  3. 在每个项目中让 agent 按名称使用该 skill。
  4. 把该 skill 设为 **These projects** 且只勾选第一个项目，然后把它切到
     Off，再切回 **These projects**。
  5. 在每个项目中再问一次。
  6. 在第一个项目的会话中，把该 skill 收窄到*第二个*项目，然后立即让
     agent 调用它。
  7. 粘贴一个超过 128 KB 的正文。
  8. 把应用语言切换为中文，重新查看上述每个界面。
- **预期结果**：
  - 不带描述的保存会被拒绝，并给出点名该字段的消息：描述是唯一进入
    提示词的部分。
  - 基础提示词携带 skill 的 id、名称和修剪后的描述，而不带其正文；正文只
    通过 `Skill` 工具到达。
  - 切到 Off 再切回会恢复已勾选的项目，无需重新勾选。
  - 收窄后只有被限定项目的会话能调用它；另一个得到“not enabled for this
    project”。
  - 第 6 步在已打开的会话中同样失败——作用域在加载正文时重新读取，而不是
    信任列出它的目录。
  - 字节计数器在 128 KB 上限前给出警告，超过上限的保存被拒绝。
  - 每个标签、空状态、错误和计数都以中文渲染，计数在 0、1 和多个时读起来
    都自然。
- **关联规范**：`07-plugins/01-plugin-system.md` §12.3、
  `03-runtime/01-ipc-protocol.md` §12b、`08-meta/decisions-log.md`（D174、D192、
  D194）
- **验收**：E（工具与权限）、质量
- **里程碑**：M5
- **状态**：单测已覆盖（host-core `user_skills` 测试、
  `apps/desktop/test/extensions-page.test.mjs`）；完整 UI 旅程为草稿

#### E2E-102：Composer 文件与图片粘贴保留结构化附件元数据

- **前置条件**：应用正在运行，某个项目中有一个 Agent 会话，且有一个可用的
  主页 Composer。OS 剪贴板在多次独立的粘贴尝试中分别包含：一段不超过所配置
  大粘贴阈值的文本片段、一个或多个本地文件（包括一个文件名带空格的文件），
  以及一张图片。记录应用数据目录和会话 id。
- **步骤**：
  1. 在配置的阈值内粘贴纯文本，确认其为可编辑文本。复制一段 Word 选区
     （文本加生成的图像表示）；确认文本优先，包括多行/CRLF、空白/尾随行、
     字面 `<>&` 和引号、跨行/附件 chip 的选区替换、光标位置以及原生
     撤销/重做。
     在阈值之上重复，确认出现的是 TXT chip 而不是图片。
     粘贴一个带伴随文件名文本的真实原生图片文件，确认它仍是图片附件。
  2. 粘贴一个本地文件，然后粘贴多个文件，包括带空格名称的文件。
  3. 从 OS 截图/剪贴板提供方粘贴一张图片。
  4. 发送前检查草稿：确认每个物化条目都是可移除的叶子名 chip，且没有任何
     scratch 绝对路径占据文本框。悬停/聚焦 chip 查看其完整路径，移除一个，
     然后发送提示词并检查会话消息的附件元数据。
  5. 检查 `<data_dir>/scratch/<sessionId>/pasted/`，把保存的字节与源
     文件/图片对比。检查项目的 `git status`。
  6. 删除该会话，确认其 scratch 目录和粘贴的文件都被移除。
- **预期结果**：
  - 在配置阈值内的纯文本粘贴保持原生行为，不经过文件桥接。超大文本行为由
    E2E-102g 覆盖。
  - 每个文件/图片以经过清理、带 UUID 的唯一名称保存在会话 scratch 根下，
    而其 chip 只显示清理后的原始叶子名。重复的叶子名保持为独立引用。
  - 派发的提示词通过现有路径引用流程携带普通文件，并以结构化附件携带粘贴
    的文件/图片；持久化的用户消息包含引用和元数据，绝不包含二进制字节。
    agent 可以用其常规文件工具读取物化的文件。
  - 主页粘贴在写入前创建或复用一个持久会话。工作区保持干净，不创建工作区
    产物行。
  - 删除会话会把粘贴的文件与其余 scratch 一起移除。
- **关联规范**：`04-ux/08-component-spec.md` §11.7–11.8、
  `03-runtime/01-ipc-protocol.md` §13c、
  `03-runtime/03-tools-and-permissions.md` §4b、
  `03-runtime/04-data-storage.md`、`08-meta/decisions-log.md`（D197、D209、
  D243、D392）、ADR 0059、ADR 0070、ADR 0101、ADR 0218
- **验收**：C（会话与流式）、E（工具与权限）、
  F（持久化）、质量
- **里程碑**：M5
- **状态**：单测已覆盖（`composer-paste-files.test.mjs`、
  `composer-clipboard.test.mjs`）；`pnpm test:e2e:composer-paste` 挂载真实的
  ComposerInput、草稿/粘贴 hooks、生产 CSS 和沙箱 preload。它派发携带合成
  混合数据和原生 File 对象的 Chromium ClipboardEvent，驱动真实的 scratch
  写入器并比较保存的字节。需要桌面构建、已安装的 Electron 和图形会话
  （Linux 上为 Xvfb）。它不修改 OS 剪贴板，也不自动化 Word；Word/平台旅程
  和完整 provider 派发仍为手动。分支上的运行是合并前证据；需按合并后 E2E
  策略从集成后的 main 重新运行。

#### E2E-102h：Composer 选择器把文件导入会话 scratch

- **前置条件**：应用正在运行，有一个主页或 Agent Composer 和一个持久会话。
  原生选择器可以选中活跃工作区之外的一个文本文件和一张图片。
- **步骤**：1) 点击 Composer 的 `+` 按钮；确认它直接打开原生文件选择器，
  没有中间的类型选择菜单。2) 选中两个夹具。3) 检查草稿 chip，并发送一个
  让 agent 读取文本夹具并识别图片标记的提示词。4) 检查渲染进程请求、会话
  转录和会话 scratch 目录。
- **预期结果**：原生选择器返回一个短期有效的一次性令牌，绝不返回源绝对
  路径，选中项在进入草稿前被复制到
  `<data_dir>/scratch/<sessionId>/pasted/`。应用根据每个选中项的
  MIME/扩展名元数据进行分类，因此同一个选择器同时处理普通文件和图片。
  chip 显示清理后的叶子名，而提示词附件只引用复制后的路径；工作区不发生
  变化。agent 可以对文本夹具调用 `Read`，具备视觉能力的模型会把图片作为
  图像块接收。持久消息只保留元数据和引用，绝不保留源绝对路径或二进制
  字节。文件选择器不提供目录选择；缺失的文件、过期/重放的令牌和超大文件
  都返回可见的 IPC 错误且不写入任何内容。
- **关联规范**：`03-runtime/01-ipc-protocol.md` §13c、
  `03-runtime/04-data-storage.md`、`04-ux/08-component-spec.md` §11.7–11.8、
  ADR 0059、ADR 0101、ADR 0218
- **验收**：B（模型配置）、C（会话与流式）、E（工具与
  权限）、F（持久化）、安全、质量
- **里程碑**：M5
- **状态**：单测已覆盖（`apps/desktop/test/composer-paste-files.test.mjs`）；
  provider/UI 旅程为草稿（仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-102i：Composer 接受原生文件和文件夹拖放

- **前置条件**：应用正在运行，有一个 Agent 会话和可见的 Composer。OS 文件
  管理器提供一个普通文件、一个文件夹和一个混合多选；把光标放在非空草稿的
  中间。
- **步骤**：1) 把普通文件拖到 Composer 上方并观察目标描边，然后放下。
  2) 把文件夹拖进同一草稿。3) 在光标位于已有文本之间时，用混合的文件/
  文件夹选区重复。4) 检查草稿，移除文件 chip，并发送提示词。5) 检查保存的
  scratch 文件和持久化的用户消息。
- **预期结果**：文件系统拖入悬停会阻止浏览器默认行为，并在不发生布局移动
  的情况下标记整个 Composer 外壳。普通文件通过现有的有界会话 scratch 桥接
  保存，并显示为可移除的叶子名 chip；文件夹不会被读取、复制或遍历，其完整
  原生路径以 `@<path>/` 字面目录引用的形式出现在光标处。混合拖放保持 OS
  顺序、保留周围文本，并在异步文件保存后恢复光标。发送保持文件现有的附件
  元数据/路径行为，文件夹路径作为提示词文本；不创建任何工作区文件。
- **关联规范**：`04-ux/08-component-spec.md` §11.5–11.8、
  `04-ux/09-interaction-patterns.md` §8.2/§8a.2、
  `03-runtime/01-ipc-protocol.md` §13c、ADR 0059、ADR 0070、ADR 0222
- **验收**：C（会话与流式）、F（持久化）、质量
- **里程碑**：M5
- **状态**：单测已覆盖（`apps/desktop/test/composer-drag-drop.test.mjs`）；
  完整桌面手势旅程为草稿（仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-102a：Composer 文件引用结果使用紧凑的叶子名

- **前置条件**：应用正在运行，某个工作区中有一个 Agent 会话，工作区包含
  嵌套文件、不同目录中的同名叶子文件，以及一个名称带空格的目录。
- **步骤**：1) 输入 `@` 并过滤到嵌套条目和重名条目。2) 检查可见行，然后
  悬停查看完整路径的工具提示并检查其无障碍名称。3) 用 Enter 接受一个文件，
  确认一个叶子名 chip 留在草稿中的光标处，而 `@` token 和完整路径保持隐藏。
  用 Tab 或点击接受第二个文件。接受一个目录结果并继续深入到其子文件。
  4) 发送完成的引用并检查持久化的用户消息。
- **预期结果**：
  - 每个结果始终只渲染其叶子名；目录保留结尾的 `/`，且没有父路径占用
    横向行空间。
  - 工具提示和无障碍名称保留完整相对路径，因此同名叶子文件仍可区分。
  - 对文件按 Enter/Tab/点击会把 `@` token 替换为留在草稿中的内联 chip；
    该键不会触发发送。接受文件时 chip 背后保留原始完整的 `entry.path`；
    接受目录时保留字面路径续写。派发时，发送并持久化的提示词包含每个完整
    路径并沿用现有的空格引号处理，agent 可以正常读取两个被选文件。
- **关联规范**：`04-ux/08-component-spec.md` §11.8、
  `04-ux/09-interaction-patterns.md` §8a、`03-runtime/01-ipc-protocol.md` §13c、
  `08-meta/decisions-log.md`（D124、D209、D362）、ADR 0024、ADR 0070
- **验收**：C（会话与流式）、质量
- **里程碑**：M5
- **状态**：单测已覆盖
  （`apps/desktop/test/composer-file-reference-display.test.mjs`）；完整 UI
  旅程为草稿（仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-102b：未应答的 Stop 恢复紧凑的文件引用草稿

- **前置条件**：一个 Agent 会话可以延迟其首个 assistant 事件。草稿包含普通
  文本、一个工作区引用、两个叶子名重复的粘贴引用，以及一个带空格的规范
  路径。
- **步骤**：1) 发送混合草稿，并在 assistant 文本、思考或任何工具行开始
  之前停止。2) 检查恢复的 Composer 和转录。3) 再次发送恢复的草稿并检查
  持久化的用户消息。4) 重复，允许部分 assistant 输出开始，然后停止。
- **预期结果**：
  - 未应答的 Stop 移除刚发送的用户行，并以稳定顺序恢复原始普通文本加
    叶子名 chip。
  - 相对路径和 scratch 绝对路径绝不出现在恢复的文本框中；重复的标签保持
    为可区分的引用。
  - 重新发送时，每个精确的规范路径只序列化一次，并沿用现有的空格引号
    处理。
  - 回复开始后的 Stop 保留部分中止的转录，且不恢复、不重复文本或 chip。
  - scratch 字节仍处于现有的会话生命周期之下。
- **关联规范**：`04-ux/08-component-spec.md` §11.5/§11.8、
  `04-ux/09-interaction-patterns.md` §3.2/§8a.2、
  `03-runtime/10-session-state-machine.md`、`08-meta/decisions-log.md`（D209）、
  ADR 0070
- **验收**：C（会话与流式）、F（持久化）、质量
- **里程碑**：M5
- **状态**：单测已覆盖
  （`composer-file-reference-display.test.mjs`、`transcript-style.test.mjs`）；
  完整 UI 旅程为草稿（仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-102c：具备视觉能力的模型把粘贴的图片作为图像输入接收

- **前置条件**：一个确定性的、具备视觉能力的 models.dev 模型，其解析后的
  记录包含 `modalities.input: ["text", "image"]`；一个 Agent 会话；一张粘贴的
  PNG 和一条文本提示词。捕获渲染进程请求、main 到 sidecar 的载荷、provider
  请求、持久转录以及 `<data_dir>/attachments/`。
- **步骤**：
  1. 选择具备视觉能力的模型，把 PNG 粘贴进 Composer。
  2. 确认 PNG 在文本框上方显示为可移除的图片 chip，且不渲染单独的解释性
     视觉状态行。
  3. 发送一个让模型识别一个可见细节的提示词。
  4. 完成后检查 provider 请求和持久会话消息。
  5. 重新加载会话，并就同一张图片追问。
- **预期结果**：
  - 模型选择器/会话能力状态来自精确的 models.dev 记录，Composer 把图片显示
    为可移除的 chip，且没有单独的解释性状态行。如果远程刷新失败，随发布
    捆绑的快照在该进程内仍是权威来源。
  - Main 写入一个内容寻址的图片 blob，并给 sidecar 发送一个临时图片附件；
    provider 适配器发出图像内容块/data URL，而不仅仅是 `@<scratch-path>`
    文本。
  - 持久消息包含 `kind`、显示用 `name`、MIME/大小和 `attachments/<sha256>`
    引用，但没有 base64 或图片字节。
  - 重新加载后，历史水合从有界的附件根恢复图像块，追问仍带有图像上下文。
- **关联规范**：`03-runtime/01-ipc-protocol.md` §5.1/§13c、
  `03-runtime/02-agent-runtime.md` §5c、
  `03-runtime/04-data-storage.md`、`03-runtime/13-model-catalog-and-selection.md`
  §11.2、`04-ux/08-component-spec.md` §11.7–11.8、
  `08-meta/decisions-log.md`（D243）、ADR 0101
- **验收**：B（模型配置）、C（会话与流式）、F（持久化）、
  质量、安全
- **里程碑**：M5
- **状态**：单测已覆盖（`model-capabilities.test.ts`、host-core 附件
  往返）；provider/UI 旅程为草稿（仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-102d：非视觉模型和超大图片使用路径回退

- **前置条件**：一个已知的不具备视觉能力的模型和一个已知具备视觉能力的
  模型；一个 Agent 会话；一张普通 PNG 和一张确定性的、刚好超过 10 MB 内联
  上限的图片。
- **步骤**：
  1. 选择非视觉模型，粘贴普通 PNG，检查 Composer 的可移除图片 chip。
  2. 发送提示词并检查 sidecar/provider 请求。
  3. 选择视觉模型，粘贴超大图片并发送。
  4. 在销毁/重建 runtime 后重试每一轮。
- **预期结果**：
  - Composer 把粘贴的图片显示为可移除的 chip，没有单独的视觉状态解释。
    两种情况都显示安全的 `@path` 回退，且没有图像块/base64 载荷。
  - 非视觉请求引用会话 scratch 文件；超大图片的视觉请求引用安全路径，同时
    图片仍可供常规文件工具使用。
  - 重试和 runtime 重建在需要时使用内容寻址的图片引用和会话 `replayed/`
    路径；不会产生重复的二进制 blob。
  - 转录仍存储附件元数据/引用，UI 不会声称图片已以视觉方式发送。
- **关联规范**：`03-runtime/01-ipc-protocol.md` §5.1、
  `03-runtime/03-tools-and-permissions.md` §4b、
  `03-runtime/02-agent-runtime.md` §5c、
  `03-runtime/04-data-storage.md`、ADR 0101
- **验收**：B（模型配置）、C（会话与流式）、E（工具与
  权限）、F（持久化）、安全
- **里程碑**：M5
- **状态**：草稿（仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-102e：未知模型 id 在视觉传输上失败即关闭

- **前置条件**：一个不在 pi-ai 目录中的自定义 provider/模型 id，一份把它
  错误标记为 `vision` 的发现数据，没有显式的 `supportsImages` 绑定覆盖，
  以及一张粘贴的 PNG。
- **步骤**：
  1. 刷新 provider 模型列表并选择发现的自定义 id。
  2. 粘贴 PNG，检查模型选择器和 Composer 图片 chip。
  3. 发送提示词并检查 sidecar/provider 载荷。
- **预期结果**：
  - 未知模型可作为通用文本模型运行，但不会被发现/缓存元数据提升为
    `vision`。
  - Composer 保留图片 chip，不渲染依赖模型的状态消息，provider 不会收到
    图像块或 base64 值；安全的文件路径仍可用。
  - 持久附件引用仍被记录，以便之后某个已知的视觉模型能正确重放该图片。
- **关联规范**：`03-runtime/11-provider-model-system.md` §6.2/§11、
  `03-runtime/13-model-catalog-and-selection.md` §11.2、
  `04-ux/08-component-spec.md` §11.8、ADR 0101、ADR 0218
- **验收**：B（模型配置）、C（会话与流式）、E（工具与
  权限）、安全
- **里程碑**：M5
- **状态**：单测已覆盖（`model-capabilities.test.ts`）；provider/UI 旅程为
  草稿（仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-102f：超大图片引用不阻塞会话启动

- **前置条件**：一个项目包含一张大于 10 MB 内联上限的图片；已选择一个已知
  具备视觉能力的模型；会话拥有合法的 provider 和工作区。
- **步骤**：1. 从 Composer 引用该超大图片并发送提示词。2. 在准备附件期间
  观察轮次生命周期。3. 销毁/重建 runtime，并就图片发送追问。4. 检查会话
  转录、内容寻址的附件 blob 和会话 `replayed/` 路径。
- **预期结果**：会话接受提示词并到达 provider，不会挂起 Electron 主进程或
  使 sidecar 崩溃。Main 对图片进行哈希和复制，而不构造整个文件的内存缓冲。
  provider 收到安全的 `@path` 回退，而不是超大的图像块/base64 载荷。runtime
  重建把存储的 blob 复制到 scratch 回退路径，而不把整个 blob 读入内存。
  持久消息只保留附件元数据和内容寻址引用。
- **关联规范**：`03-runtime/01-ipc-protocol.md` §5.1、
  `03-runtime/02-agent-runtime.md` §5、`03-runtime/04-data-storage.md`、
  ADR 0101
- **验收**：C（会话与流式）、E（工具与权限）、
  F（持久化）、质量
- **里程碑**：M5
- **状态**：单测已覆盖；完整 UI 旅程为草稿（仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-102g：大文本粘贴变成内联的会话 scratch 引用

- **前置条件**：应用正在运行，某个项目中有一个 Agent 会话，且有一个可用的
  主页 Composer。大粘贴阈值先保持默认值，之后改为一个小的测试值。记录应用
  数据目录、会话 id 和一个多行 Unicode 文本夹具。
- **步骤**：
  1. 打开 Settings → AI → Defaults，确认大粘贴阈值为 600。把它设为一个
     确定性的较小值，保存，然后回到 Composer。
  2. 粘贴恰好等于阈值的文本，确认原生文本框行为；在草稿的开头、中间和
     末尾粘贴比阈值多一个字符的文本，包括多行和 Unicode 内容。
  3. 每次超大粘贴后检查草稿：确认精确的前缀和后缀保持不变，一个生成的
     `pasted-text-*.txt` chip 出现在原选区处，编辑器中不包含 scratch 绝对
     路径，且 Composer 在传输期间正确报告其忙/错误状态。
  4. 点击生成的 TXT chip，再用键盘焦点加 Enter 和 Space 重复。确认精确的
     UTF-8 内容在 chip 位置替换它，文本可编辑，光标落在其后，后续发送使用
     编辑后的文本。读取未完成时切换草稿或移除 chip，确认过期的响应不会
     改变当前草稿。
  5. 检查会话 `scratch/<sessionId>/pasted/` 文件字节，发送仍含一个 chip 的
     混合草稿，检查渲染进程请求、持久化的用户消息和 agent 可读路径。在
     发送缓存的草稿前切换项目和会话，然后移除 chip 并确认它不再被派发。
  6. 删除所属会话，确认其临时粘贴文件被移除。
- **预期结果**：
  - 阈值作为 AI 默认值持久化，在旧设置上默认为 600，且只接受 1 到
    1,000,000 的整数值。
  - 阈值及以下的文本保持原生行为。超过阈值的文本逐字节以 UTF-8
    `text/plain` 保存到所属会话 scratch 的 `pasted/` 目录下，不改动项目，
    也不创建产物。
  - 由哨兵支撑的 TXT chip 插入在精确的粘贴选区处，包括多行草稿的中间。
    点击或按 Enter / Space 会把它展开为可编辑的精确文本并移除其引用；之后
    的编辑才是派发所发送的内容。失败、二进制、图片或超大的读取会让 chip
    和映射保持完整。
  - 任何剩余的 chip 都恰好一次就地解析为其规范路径；它既不会以 basename
    追加，也不会作为附件重复。移除 chip 即移除该映射。
  - 会话切换、项目切换、未应答 Stop 恢复和会话删除都遵循现有的会话所有权
    与清理规则。
- **关联规范**：`04-ux/06-settings-ia.md`、
  `04-ux/07-ui-design-system.md` §8.1、`04-ux/08-component-spec.md` §11.7–11.8、
  `04-ux/09-interaction-patterns.md` §8a、
  `03-runtime/01-ipc-protocol.md` §8、
  `03-runtime/04-data-storage.md` §7、`08-meta/decisions-log.md`（D262）、
  ADR 0059、ADR 0070、ADR 0131
- **验收**：C（会话与流式）、E（工具与权限）、
  F（持久化）、质量
- **里程碑**：M5
- **状态**：单测已覆盖（`composer-trigger.test.ts`、
  `apps/desktop/test/composer-paste-files.test.mjs`）；完整 UI 旅程为草稿
  （仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-103：Settings 的 Agent 页面管理以文件为载体的能力

- **前置条件**：应用正在运行，已注册两个项目 A 和 B，且每个项目都有一个
  可用的 Agent 会话。夹具只使用 `~/.agents/skills`、`~/.agents/servers`、
  `~/.agents/subagents` 和两个项目的 `.agents` 目录；不存在任何 `.pi` 能力
  目录。
- **步骤**：
  1. 打开 Settings > Agent，验证 Skills、MCP 和 Subagents 是三个独立的
     导航目的地。打开 Extensions，验证只有 Installed 和 Marketplace 两个
     标签页。
  2. 打开 Skills。确认一个工具栏位于一个面板上方，面板显示一个以
     `~/.agents/skills` 为根的全局分组头和一个以项目 A 的 `.agents/skills`
     为根的项目分组头，两者在自然页面高度内以单列排布，且项目选择器会
     改变所选项目。确认 Skills 工具栏与 MCP 具有相同的单一主操作形态和
     简洁的 New 标签；层级特定的 Import 操作在每个 Skills 分组头中可用。
     首次绘制时确认出现骨架行；之后的刷新确认已在屏幕上的行保留，列表
     只是变暗。
  3. 使用层级过滤器和搜索框。确认 All / Global / Project 携带与渲染行
     一致的计数，选中某个层级会隐藏另一组但不隐藏工具栏或其操作，搜索会
     同时收窄两组及其计数，清空搜索会恢复所有行，且无匹配的搜索会报告
     该情况并建议放宽过滤。
  4. 在选中项目 A 时关闭一个全局 skill。确认开关立即翻转且列表不会退回
     骨架行，该行变暗，toast 点名该 skill，请求在途期间其他所有行保持
     可交互，且全局文档保持不变。切到项目 B，确认该全局 skill 在那里仍是
     启用状态。强制 host 拒绝，确认开关回到先前位置。
  5. 从页面创建一个 skill。过滤器为 Global 时确认主操作点名全局目的地，
     且新文档落在 `~/.agents/skills`；过滤器为 Project 时确认它点名项目并
     落在项目 A。选中 Project 但未选择项目时，确认该尝试会报告问题而不是
     静默失败。编辑新 skill，保存，确认正文往返一致。
  6. 从项目 skill 的溢出菜单选择 Reveal，确认揭示的是项目文件，而不是
     同 id 的全局文件。选择 Remove，确认第一次按下只是武装并重新标记该
     菜单项，第二次按下才删除，关闭菜单会解除武装。
  7. 在 A 中放一个同名项目 skill 并禁用它。确认生效的 runtime 目录不会
     回退到全局 skill；项目记录先遮蔽，过滤在其后发生。
  8. 使用 Import 操作恰好选择一个 Markdown 文件。确认它被物理复制到
     过滤器指向的层级、立即出现，且同一次选择器调用不能再选第二个文件。
  9. 打开 MCP。添加一个项目 server 和一个全局 server，编辑项目 server，
     并从行的溢出菜单测试一个现有连接。确认弹窗在编辑时锁定 id，拒绝
     同层级的重复 id 或标签，并通过行徽标和 toast 报告就绪或失败。通过
     同样的两次按下菜单操作删除一个 server，确认其文件已消失。
  10. 在应用外删除一个 skill 或 MCP 文件，重新加载其页面，确认该行消失
      且其本地状态没有孤立条目。确认删除全局文件也会移除其项目覆盖。
  11. 打开 Subagents。确认它是一个以 `~/.agents/subagents` 为根的仅全局
      面板，没有层级过滤器、没有项目选择器、没有项目级控件。确认 Built-in
      分组列出五个随产品发布的默认值（`explorer`、`code-reviewer`、
      `test-runner`、`fixer`、`ui-designer`），即使用户目录为空，每个都带
      Built-in 徽标、其工具授权和启用开关，但没有 reveal 或 delete。确认
      Global 分组头携带全局层级标签和条目计数，用户自有行的
      创建/编辑/删除/揭示都能从页面完成，留空输出上限会写入一个没有
      `maxTokens` 的定义，且空的用户目录仍会把 `settings.subagentsEmpty`
      解析为 Global 分组下的本地化空状态文案，而不是显示原始翻译键。
      打开 New subagent，确认 Model 字段是一个与 Composer 相同的、按
      provider 分组的已配置可运行模型选择器，带有 inherit-session 选项，
      而不是自由输入的 `provider/model` 输入框。固定一个已配置的模型，
      保存，确认文档的 `model:` frontmatter 为
      `vendorKey-or-name/modelId`。当两个已配置 provider 共享通用键或
      厂商键时，确认每个 provider 仍是独立分组，且其模型固定使用唯一的
      显示名（名称也冲突时使用 provider id）。编辑一个固定模型已不再
      配置的定义，确认该固定值保持选中而不是跳回 inherit。
  12. 把窗口收窄到工具栏的堆叠断点。确认分段控件铺满宽度，搜索移到其
      下方，操作左对齐换行，分组头不再显示解析路径，且页面不出现横向
      溢出。使用不能悬停的指针时，确认行的编辑和溢出控件无需悬停即可见。
- **预期结果**：
  - 三个 Settings 页面都不使用标签页切换能力，空态和填充态都按自然页面
    高度排布，支持深色和浅色主题，并以安静的页面专属描述加上（在相关处）
    项目优先于全局的作用域文案开头。每个页面都是一个工具栏加一个面板：
    工具栏携带带实时计数的层级过滤器、一个带清除控件的搜索框、项目选择器
    和主操作；面板用分组头划分层级，分组头点名层级、其解析的 `.agents`
    路径和本地化计数。行使用安静的能力图标、层级徽标加本地化的
    来源/传输徽标、描述和常驻的启用开关；编辑和溢出菜单在行被悬停、聚焦
    或菜单打开前保持安静，并在悬停不可用时始终可见。骨架行只在首次绘制
    出现，之后的刷新让已在屏幕上的行变暗并通告刷新，忙状态限定在有在途
    请求的行内，计数对辅助技术可见。空状态在面板内居中、无装饰边框，
    在 chip 包装器中显示 host 的 Lucide 图标（而不是带内边距的裸 SVG），
    并提供页面的主操作，且不引入任何能力专属的色彩系统。
  - 三种能力的创建、编辑和删除都无需离开 Settings。新能力落在过滤器指向
    的层级，破坏性操作需要两次按下同一个被重新标记的菜单项，揭示项目级
    skill 打开的是该项目的文件而不是共享其 id 的全局文件。Subagents 编辑器
    的 Model 字段是按组排列的已配置可运行模型选择器加 inherit-session，
    而不是自由输入的 id；保存写入 `vendorKey-or-name/modelId`（别名冲突时
    使用唯一的 provider 名或 id），未配置的既有固定值保持选中。Advanced
    折叠区还携带被委派者自己的输出上限：它初始为空，显示模型默认值的
    占位符而不是“无限制”占位符，数值通过文档的 `maxTokens` frontmatter
    往返回到字段——而清空它会移除该键，使被委派者重新跟随模型。
  - 能力文件只包含配置/frontmatter；启用状态持久化在应用本地的
    `agent-capabilities` 状态文件中。
  - 项目记录按 id 或名称遮蔽全局记录，即使被禁用也如此，且下一次 runtime
    激活反映与 UI 相同的结果。
  - 物理导入是单文件且按层级限定的，磁盘删除通过扫描移除，而不是表示为
    待处理行。
- **关联规范**：`03-runtime/01-ipc-protocol.md` §12a–§12d、
  `03-runtime/02-agent-runtime.md` §5f、
  `03-runtime/13-model-catalog-and-selection.md` §2（Subagent 编辑器）、
  `04-ux/01-ui-ia.md` §3.5–§3.6、
  `04-ux/06-settings-ia.md` §2（Agent 能力目的地）、§4.21–§4.25、
  `07-plugins/01-plugin-system.md` §12.2–§12.3、
  `08-meta/decisions-log.md`（D193、D194、D202、D257）、ADR 0112、ADR 0126
- **验收**：D（工作区）、E（工具与权限）、F（持久化）、
  质量
- **里程碑**：M6+
- **状态**：源码/单测已由
  `apps/desktop/test/agent-capability-settings.test.mjs`、
  `apps/desktop/test/extensions-page.test.mjs`、
  `apps/desktop/test/subagent-models.test.mjs`、
  `apps/desktop/test/subagent-output-limit.test.mjs`（输出上限从编辑器草稿
  经 host-core 到构建的被委派模型的路径）以及 host-core 能力测试覆盖；
  完整的原生选择器、渲染弹窗、项目切换和 runtime 旅程仍为草稿
  （仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-CAPABILITY-move-across-levels：MCP server 和 skill 在全局与项目 `.agents` 层级之间移动

- **前置条件**：应用针对一个一次性的全局 `.agents` 根运行（隔离的 HOME，
  或直接驱动裸 host 时使用 `PI_DESKTOP_AGENTS_DIR`）。项目 A 和 B 已注册。
  全局根拥有 `~/.agents/servers/echo.json`（id `echo`，标签 `Echo`）、
  `~/.agents/skills/review.md`（frontmatter 名称 `Review`），除此之外没有
  其他使用下文名称的内容。项目 A 不拥有 `echo` server 和 `review` skill，
  并拥有 `<project A>/.agents/skills/with-resources/`，其中包含
  `SKILL.md` 以及 `scripts/run.sh` 和 `templates/report.md`。MCP 和 Skills
  页面显示 Settings IA 规范中描述的项目选择器。
- **步骤**：
  1. 在选中项目 A 的情况下打开 Settings > Agent > MCP。禁用全局 `echo`
     行，然后选择 Move into A。确认该行离开全局分组、出现在项目 A 下，
     并在那里保持禁用。
  2. 确认 `~/.agents/servers/echo.json` 不再存在，而
     `<project A>/.agents/servers/echo.json` 存在且逐字节相同。读取
     `<data>/agent-capabilities/mcp.json`，确认它没有全局 `echo` 条目，
     也没有旧 id 的项目 A 覆盖，且项目 A 的条目携带禁用值。
  3. 再次创建一个新的全局 `echo` server（id `echo`，标签 `Echo`）。在选中
     项目 A 时选择 Move into A，确认到达的行为 `echo-2`、标签为 `Echo (2)`，
     项目 A 原有的 `echo.json` 与移动前逐字节相同，且两个项目行都列出。
  4. 在选中项目 A 时打开 Skills。创建一个项目 `review.md`，其 frontmatter
     携带 `name: Review`、一个描述和一个额外的自定义字段，外加正文；禁用
     它，然后选择 Move to Global。确认它在全局显示为 `review-2`、到达时为
     禁用状态，且全局 `review.md` 保持不变。
  5. 把移动后的文档与项目原件做 diff：只有 frontmatter 的 `name` 行不同
     （`name: Review (2)`）；描述、自定义字段、空行、行尾符和每一个正文字节
     都完全相同。
  6. 把项目 A 的 `with-resources` skill 移到 Global。确认
     `<project A>/.agents/skills/with-resources/` 已消失，而
     `~/.agents/skills/with-resources/` 以相同字节持有 `SKILL.md`、
     `scripts/run.sh` 和 `templates/report.md`，且 Skill 工具仍能解析该
     文档的资源。
  7. 重新加载全局和项目页面。确认移动的行在重新加载后保持其启用状态，
     项目 B 不列出任何项目 A 的能力，且移入全局的 `review-2` 以其移动后的
     值应用于项目 B。
  8. 在工具栏中清空项目选择。确认剩余的全局行不再提供 Move into
     <project>，项目分组改为要求选择项目；重新选择项目 B，确认该操作
     恢复。
  9. 用 `from` 和 `to` 指向同一目录驱动 `mcp.transfer` 和
     `skills.transfer`，确认响应返回当前记录且两个目录都不变化。
- **预期结果**：
  - 移动会重新安置文档：目标目录获得文件，来源层级不再列出该条目，且不
    留下副本。
  - 启用状态跟随文档。为项目 A 禁用的全局行到达项目 A 时仍是禁用；项目行
    到达全局时以其可见值作为新的全局默认值。来源层级不为旧 id 保留任何
    状态条目——包括项目覆盖。
  - 目标冲突通过只重命名冲突的名称解决：id 冲突给到达的 id 加 `-2`/`-3`
    后缀，不区分大小写的显示名/标签冲突给显示名加 ` (2)`/` (3)` 后缀，
    既有条目绝不会被覆盖或合并。重命名 skill 只改写 frontmatter 的 `name`
    行，保留其他所有字节。
  - 目录形态的 skill 与其同级资源作为一个整体移动，且两个目标指向同一
    目录的传输是无操作。
  - 没有选中项目时移动操作不可用并给出明确说明，且没有任何能力文件或
    状态条目变化。
- **关联规范**：`03-runtime/06-host-rpc-protocol.md` §4（Agent
  能力）、`03-runtime/01-ipc-protocol.md` §12a–§12b、
  `04-ux/06-settings-ia.md` §2（Agent 能力目的地）、ADR 0112、
  ADR 0269
- **验收**：E（工具与权限）、F（持久化）、质量
- **里程碑**：M6+
- **状态**：host 已覆盖（`pnpm test:e2e:capability-move` 针对真实 host-core
  和隔离的全局根驱动 Electron main 所调用的同一 RPC 面，断言磁盘上的文档
  和状态文件；host-core 注册表/状态测试覆盖重命名、扫描派生的 id 和目录
  资源；源码契约由
  `apps/desktop/test/agent-capability-settings.test.mjs` 锚定）。渲染的
  Settings 旅程——行菜单、开关、toast——仍为草稿。

#### E2E-120：全局插件启动器、下一轮编辑与被停止的吞吐

- **前置条件**：安装并启用一个中文显示名为 `无限画布` 的面板插件，以及
  第二个面板插件（例如 `邮件助手`）。配置一个流式足够慢、可以停止部分
  回答的 provider。在 macOS 和 Windows 上各运行一次。
- **步骤**：
  1. 在 PI-Desktop 完成启动后立即使其不聚焦，并在另一个应用拥有前台
     窗口时按 macOS 的 Option+Space 或 Windows 的 Alt+Space。确认首次调用
     迅速在指针所在显示器上揭示一个完全渲染、居中的启动器，没有空白的
     初始化帧，也没有原生的关闭、最小化、最大化、调整大小或任务栏控件。
     确认 Windows 不会显示活动应用的系统菜单。
  2. 分别搜索 `无限`、`wuxianhuabu` 和 `wxhb`。一次用 Up/Down 加 Enter，
     一次用点击；确认打开现有的插件面板。确认中文输入法候选的 Enter 不会
     打开结果。
  3. 以空查询再次打开启动器，确认第 2 步打开的插件是第一个结果。打开另
     一个面板插件，再重新打开启动器，确认两个插件按打开时间的倒序出现。
     重启应用，确认相同的最近使用顺序在重启后保留。
  4. 开始一个 Agent 回答。在它流式输出时输入下一份草稿并更改 Thinking、
     权限模式和 Agent/Plan/Goal。确认每个选择都可编辑，Stop 保持存在，
     且 Send 无法派发。
  5. 在部分输出后停止。确认部分回答保留，排队的配置只在终止后才持久化，
     且下一轮使用最终选择而不是任何中间选择。
  6. 检查被停止回答的会话统计，重新加载会话，再次检查。
- **预期结果**：
  - 早期预热在后端启动完成前开始，把 BrowserWindow 和渲染进程加载从首次
    快捷键的可见路径中移除。在 macOS 上，面板只激活一次，没有第二次
    应用/窗口栈跳转，因此揭示不会明显卡顿。启动器搜索只返回已启用、就绪
    的面板插件，每次调用都以空的、聚焦的查询开始，并按跨重启的最近使用
    历史排序；输入查询时仍按相关性优先排序。Escape 和焦点丢失会隐藏它而
    不关闭主应用。
  - 任何运行中的轮次都观察不到暂存的模式/模型/思考/权限变更，且不能并发
    发送第二条提示词。
  - 在流式输出期间更改 Thinking 时，所选模型的已启用级别保持可见。子菜单
    绝不会塌缩为仅 Off，包括对继承应用默认模型的未固定会话。
  - 被停止的吞吐在重新加载前后都存在。provider 提供了精确输出用量时使用
    它；否则 UI 把持久化的四码点估计标注为近似值。
- **关联规范**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/02-agent-runtime.md` §5b/§9、
  `04-ux/07-ui-design-system.md` §8.2–8.3、
  `04-ux/08-component-spec.md` §11、
  `04-ux/09-interaction-patterns.md` §1/§3、D211、D212、D219、ADR 0072、
  ADR 0073
- **验收**：C（会话与流式）、F（持久化）、G（插件）、
  质量
- **里程碑**：M6
- **状态**：单测/源码契约已覆盖；完整跨平台 UI 旅程为草稿
  （仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-121：Goal 批准恢复自主的验收标准执行

- **前置条件**：一个绑定项目的会话已配置 provider 并在 Agent 模式下空闲；
  工作区允许 host 产物创建，且没有先前的测试 goal 产物。
- **步骤**：1) 把会话切到 Goal，让 Agent 调用 `EnterGoalMode`，然后调用
  `SubmitGoal(title, markdown, question)`。2) 检查新 `.pi/goal/*.md` 产物
  中的精确 Markdown 字节和对应的 `plan_approvals` 行。3) 确认共享的审批
  卡片只暴露 Approve/Reject，且 Goal 拒绝 Write/Edit/插件工具，而 Bash 遵循
  所选的权限模式。4) 以 Ask 批准，观察同一个 Agent 在 Agent 模式下恢复。
  5) 检查最终响应是否逐条验收标准验证或给出明确边界，然后重新加载会话。
- **预期结果**：Goal 使用 Plan 的审批管线，没有第二个规划器；产物不可变，
  行记录 `kind = goal`、路径、哈希、大小和执行状态。批准是独立的用户决定，
  把会话转换到 Agent，并只在批准后才开始自主工作。转录在重新加载后仍可
  查阅，任何定时/无人值守的 Goal 运行都不能绕过审批边界。
- **关联规范**：`03-runtime/02-agent-runtime.md`、
  `03-runtime/03-tools-and-permissions.md`、`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、`03-runtime/10-session-state-machine.md`、
  `04-ux/01-ui-ia.md`、`04-ux/08-component-spec.md`、D198
- **验收**：C（会话与流式）、E（工具与权限）、
  F（持久化）、H（诊断）、安全
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖（`packages/agent-runtime` 和 host-core 的
  Goal 测试）；完整 UI 旅程为草稿（仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-122：插件请求并投递原生通知

- **前置条件**：一个已安装的插件声明并被授予 `notify`；桌面平台支持
  Electron 原生通知；OS 通知权限处于初始或此前被拒绝的状态。
- **步骤**：1) 从插件进程调用 `getNotificationPermission()`。2) 调用
  `requestNotificationPermission()` 并观察原生权限/探测结果。3) 调用
  `showNativeNotification({ title, body })`。4) 用缺少 `notify` 的插件重复，
  并在不支持原生通知的平台上重复。
- **预期结果**：首个状态为 `unknown`、`denied` 或 `unsupported`；请求返回
  尽力而为的 `granted`、`denied` 或 `unsupported` 结果；被授予的插件进行
  原生投递时收到 `{ shown: true, permission: "granted" }`，而被拒绝/不支持
  的投递返回 `shown: false` 且不使插件崩溃。缺少 `notify` 以
  `PERMISSION_DENIED` 失败。点击已投递的原生插件通知会恢复并聚焦主窗口，
  但原生插件通知不会新增持久任务收件箱行，也不会激活聊天会话。
- **关联规范**：`07-plugins/01-plugin-system.md`、
  `07-plugins/03-plugin-api.md`、`07-plugins/13-plugin-permissions-matrix.md`、
  ADR 0074
- **验收**：E（工具与权限）、G（插件）、安全、质量
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖；完整跨平台 OS 权限旅程为草稿
  （仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-148：插件设置与本地快捷键可编辑

- **前置条件**：一个已启用的插件声明字符串、布尔、JSON 和 `shortcut` 设置；
  该快捷键指向一个已声明的插件命令。
- **步骤**：1) 打开 Plugins 并打开插件设置界面。2) 更改一个普通字段和该
  快捷键，然后保存。3) 重新加载插件列表，在应用窗口聚焦时按新快捷键。
  4) 尝试一个保留的应用快捷键，并在插件被移出当前项目作用域后重复。
- **预期结果**：控件从清单生成，值持久化在插件私有的设置文件中，且
  `plugin:settingsChanged` 被投递。新快捷键只在聚焦的应用窗口和匹配的激活
  作用域内调用插件命令。保留/冲突的绑定被拒绝；不注册任何 OS 全局快捷键。
- **关联规范**：`07-plugins/02-plugin-manifest-schema.md`、
  `07-plugins/03-plugin-api.md`、`07-plugins/11-plugin-storage-isolation.md`、
  ADR 0159
- **验收**：F（持久化）、G（插件）、安全、质量
- **里程碑**：M6+
- **状态**：源码契约和聚焦的集成覆盖；完整桌面旅程为草稿
  （仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-OAUTH-anthropic-rate-limit-retry：有界令牌重试保护账户

- **前置条件**：一个本地 HTTP 夹具只拦截 Anthropic 的令牌 URL；生产 pi-ai
  流程和 Desktop `VendorOAuth` 使用内存中的 Host RPC 夹具运行。不使用真实
  账户、浏览器授权或远程端点。
- **步骤**：运行 `pnpm test:e2e:oauth-retry`。覆盖交换和刷新中的
  429 → 成功、重复 429、秒/日期/畸形/超预算的 `Retry-After`、无效授权
  （包括在 429 之后）、5xx、socket 断连、无效成功 JSON、请求/正文/等待期间
  的取消，以及更早的调用方截止时间。并发解析同一账户，并在刷新失败后重试。
- **预期结果**：至多三个请求共享一个截止时间和原始信号；任何重试都不早于
  服务端提示。只有显式 429 会重试；授权拒绝和含糊的失败会停止。请求授权
  字段和自定义头保持不变。失败的刷新保留旧凭证并释放其锁；并发解析只
  轮换/写入一次。失败/取消的登录只移除它新建的行。HTTP/令牌 JSON 错误不
  包含令牌正文金丝雀值、URL 或内嵌堆栈，并提供恢复指引，而不声称每个
  429 都会消耗 code。现有网络错误诊断保持不变。
- **关联规范**：`03-runtime/11-provider-model-system.md` §8a；ADR 0095。
- **验收**：B（厂商账户）、安全、质量。
- **状态**：全部 20 个本地 HTTP 场景针对已安装的补丁通过；现有 20 个
  登录/会话回归也通过。这是一个合并前的传输与编排集成测试，不是实时
  OAuth、可视化 UI 或 Host 持久化验证。集成后 main E2E 未运行。

#### E2E-151：多个厂商账户在登录、使用和移除全程保持隔离

- **前置条件**：一个启动时运行 `registerBunOAuthFlows()` 的构建，以及至少
  一个 PKCE 厂商（Anthropic）和一个设备码厂商（xAI 或 GitHub Copilot）的
  真实订阅。两个厂商都还不存在任何 provider 行。
- **步骤**：1) 打开 Settings -> Model configuration，确认 Vendor accounts
  卡片初始为空，打开 Add account——选择器列出每个
  `models.getProviders().filter(p => p.auth.oauth)` 厂商，包括已有账户的
  厂商；已有账户时，确认其行使用与 AI services 相同的单级列表界面，且
  Add account 与 Add provider 的主按钮处理一致。2) 选择 Anthropic 并完成
  浏览器登录；确认出现一个已连接账户行和一个 OAuth provider 行。3) 再次
  使用 Add account，再次选择 Anthropic，用不同账户完成第二次登录；确认
  两个账户行和两个 provider id。4) 编辑第一个账户，更改其显示名，选择
  多个目录/自定义模型，为一个模型配置上下文窗口、最大输出令牌和思考级别，
  然后保存；确认该行只显示一次账户标签，Defaults 选择器反映编辑后的模型，
  且每个选项只显示一个 provider 名称，不附加账户标签或模型 ID。保存前，
  聚焦默认模型字段，确认认证建议以应用风格的列表打开，模型 ID/显示名
  对齐，输入可过滤，ArrowDown/ArrowUp 加 Enter 选择选项，Escape 关闭它，
  且固定列表以 portal 形式浮在对话框上方，不改变对话框高度，也不被对话框
  溢出裁剪。确认仍可输入自定义模型 ID。按 Test connection，确认结果解析
  的是编辑后的账户。打开 Composer 模型菜单，确认编辑后的账户标签用作
  OAuth provider 分组标题，而配置的模型别名显示在其模型行上。5) 分别解析
  并使用每个账户，包括模型发现和每个账户一个流式轮次。6) 在第二个厂商上
  开始设备码登录，然后在对话框轮询时按 Cancel；确认没有留下行或凭证。
  7) 移除第一个 Anthropic 账户，确认其 provider 行和 OAuth 机密已消失，
  而第二个 Anthropic 账户仍可用。8) 如果被移除的账户是默认项，确认
  Defaults 指向另一个就绪的 provider 或显示无默认。9) 在 sidecar 和渲染
  进程日志中 grep 令牌材料。
- **预期结果**：每次成功登录创建一个独立的行，带有 `authKind: "oauth"`、
  `hasSecret` 和 `hasOauth` 均为 true、一个非机密的账户标签，以及从该账户
  自己的目录填充的 `baseUrl`/`apiStyle`/`defaultModelId`。每行有自己的
  `secret:provider:<providerId>:oauth` 引用和行级 pi-ai 集合；解析一个账户
  绝不会返回另一个账户的令牌。模型列表是认证后的目录（Copilot 账户只列出
  其订阅包含的内容），而不是 `/models` 探测。匹配的 models.dev 元数据为
  每个新登录的绑定提供限制、模态和思考级别；models.dev 中缺失的 ID 使用
  保守的通用纯文本/非推理形态。账户编辑器只更新非机密的标签/模型字段和
  完整的逐模型绑定，Test connection 解析的正是该账户。两个轮次都在没有
  粘贴密钥的情况下运行，并复用同一个预热 runtime——启动载荷携带
  `apiKey: ""`，每个请求通过 `provider.resolveAuth` 解析认证，Electron
  main 在本地应答它，并对未绑定的 provider id 以 `PROVIDER_NOT_BOUND`
  拒绝。Cancel 中止本地回调服务器/设备码轮询，不留下行和凭证。连接测试
  通过解析认证而非用密钥探测来证明账户。Remove account 委托给
  `providers.delete`，恰好清除该行的两个机密引用和元数据。没有任何日志、
  事件或 IPC 载荷包含访问令牌、刷新令牌或授权码。
- **关联规范**：`03-runtime/11-provider-model-system.md` §8a、
  `03-runtime/12-provider-config-schema.md` §3、
  `03-runtime/14-secrets-storage.md` §10、
  `03-runtime/01-ipc-protocol.md` §8、`04-ux/06-settings-ia.md`、
  `08-meta/decisions-log.md`（D237/D240）、ADR 0095、ADR 0098
- **验收**：B（模型配置）、C（会话与流式）、F（持久化）、
  安全、质量
- **里程碑**：M6+
- **状态**：`packages/agent-runtime`（认证解析与 runtime 复用）和 host-core
  机密引用测试有单测覆盖；完整桌面旅程为草稿，需要真实厂商账户
  （仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-197：GitHub Copilot 接受默认 Enterprise 域名

- **前置条件**：一个注册了 GitHub Copilot OAuth 流程的构建；设备码登录
  可以到达 GitHub 端点。
- **步骤**：1) 打开 Settings -> Model configuration -> Add account，选择
  GitHub Copilot。2) 将 Enterprise URL/域名字段留空。3) 确认 Continue 可用
  并提交空值。4) 完成设备码登录并检查生成的账户行。
- **预期结果**：空文本提示以空字符串提交，provider 使用 github.com，设备码
  流程正常完成。为空时，机密和手动输入代码的提示保持禁用。不渲染或记录
  任何 OAuth 令牌或设备凭证。
- **关联规范**：`04-ux/06-settings-ia.md`、
  `04-ux/08-component-spec.md` §19、`03-runtime/12-provider-config-schema.md`
  §3、`08-meta/decisions-log.md`（D237/D240）
- **验收**：B（模型配置）、安全、质量
- **里程碑**：M6+
- **状态**：单测已覆盖（`apps/desktop/test/oauth-login-prompt.test.mjs`）；
  真实设备码旅程为草稿（仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-152：插件贡献一个工作面板视图

- **前置条件**：一个开发插件声明 `ui.view`，并有一个 `contributes.views`
  条目，其 `entry` 是一个调用 `window.pluginBridge.invoke("ui.showToast", …)`
  的小型 HTML 页面。打开两个项目，插件的激活作用域限定在第一个项目。
- **步骤**：
  1. 以开发插件方式加载该插件。确认 Plugins 页面显示 work-panel-views
     能力徽标。
  2. 按 `Cmd/Ctrl + J` 揭示工作面板，然后点击 `+` 创建 New 启动器标签页。
     确认固定的 `+` 触发器、最大化控件和视口固定的工作面板开关解析为
     一个按钮组——4px 的控件间距，最大化与开关之间没有分隔线——而 `+`
     触发器和开关保持为独立、不重叠的命中区域，视觉间距超过 24px。确认
     启动器列出内置的 Review 行和插件视图的本地化标题与图标（清单命名了
     未知 token 时显示字母方块）。
  3. 激活插件行。确认插件页面渲染在面板主体内，没有窗口控件胶囊，也没有
     预留的 46px 条带，且其按钮能到达 host toast。
  4. 拖动面板内分隔条并调整会话区大小。确认页面跟随面板矩形，无滞后或
     撕裂，然后拖动窗口外侧右边缘，确认面板宽度变化而基础聊天宽度保持
     固定。
  5. 打开全局搜索，然后打开 Settings。确认每个遮罩打开期间页面被隐藏，
     关闭后返回。
  6. 再次点击 `+`，然后从新启动器选择同一个视图。确认它返回活动页面——
     相同的滚动位置、不重新加载——而不是堆叠第二个标签页。
  7. 切换到第二个项目。确认该视图从 New 启动器和无标签页入口列表中消失。
  8. 切回，重新打开该视图，然后禁用插件。确认标签页关闭且视图的渲染
     进程退出（Activity Monitor / Task Manager）。
  9. 重新启用，重新打开，然后编辑磁盘上插件的 HTML 触发开发重载。确认
     视图重新加载而不是变空白。
- **预期结果**：插件视图可达、隔离、定位正确，并受插件生命周期和激活
  作用域约束。面板保持为文档流中的内部列；其渲染进程拥有的分隔条调整
  面板大小，原生窗口边缘绝不改变该目标。阻塞遮罩打开时它绝不渲染，也
  绝不获得窗口控件。
- **关联规范**：`07-plugins/02-plugin-manifest-schema.md` §4/§5、
  `07-plugins/13-plugin-permissions-matrix.md` §2、
  `04-ux/08-component-spec.md` §5、ADR 0104、ADR 0092
- **验收**：G（插件）、安全、质量
- **里程碑**：M6+
- **状态**：单测覆盖于
  `apps/desktop/test/plugin-work-panel-views.test.mjs`（寻址、启动器分组、
  隔离对等、作用域过滤、生命周期拆除）、`packages/plugin-sdk` 和 host-core
  清单校验；桌面旅程为草稿（仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-153：随产品打包的文件管理器取代内置 Files 工具

- **前置条件**：一个打包构建（使 `resources/plugins` 被复制到 asar 之外），
  以及一个包含嵌套目录、`node_modules`、`.env`、一个二进制文件、一张
  图片、一个 CSV 和一个 Markdown 文件的项目。该项目是一个分组，其第二个
  文件夹注册为另一个根（ADR 0249）。
- **步骤**：
  1. 打开 Plugins 页面。确认 **File Manager** 列为捆绑插件、已启用、显示
     work-panel-views 能力，且不提供 Uninstall 操作。
  2. 揭示工作面板，点击 `+` 创建 New 启动器标签页。确认其行包含 Review
     以及插件贡献的 File Manager 和 Browser 视图。触发一次 agent 编辑，
     确认面板不会自行打开：只有用户选择其行之后，Review 才出现在 Open
     resources 下。
  3. 打开 File Manager 视图。确认树列出项目、懒加载展开目录，并省略
     `node_modules`、`.git` 和 `.env`。把视图左上角的文件夹控件切到项目
     的第二个文件夹，确认树跟随它而应用可见的工作区不跟随，然后切回
     项目的主文件夹。
  4. 右键一个文件，确认提供 **Open with default app** 和 **Show in
     folder** 且可用；右键一个目录，确认不提供它们，因为 host 拒绝对
     目录执行该操作。
  5. 打开一个文本文件，编辑并保存。确认磁盘上的文件已改变且编辑器保留
     保存的内容。在应用外修改同一文件，再次编辑保存，确认报告冲突而不是
     覆盖外部修改。点击二进制文件，确认它报告为不支持而不是打印替换
     字符；打开图片、CSV 和 Markdown 文件，确认各自得到专属查看器。把
     应用切到简体中文，确认树、查看器和上下文菜单都已本地化。切换项目，
     确认树无需等待轮询即更新。
  6. 点击会话中的项目文件路径。确认它在此视图中打开到该文件——聊天点击
     现在优先于 host 的 `file:` 标签页选择文件视图。
  7. 禁用 File Manager 插件。确认视图从菜单和面板中消失，且点击会话文件
     路径回退到 Open resources 下的 host `file:<path>` 标签页。
  8. 重新启用，然后重启应用。确认启用状态和树恢复，且注册表没有新增
     重复行。
- **预期结果**：一个面板界面完全运行在公开的插件贡献通道上，可被用户
  禁用、不可被卸载，并能跨越重启。其 host 中介的操作遵守声明的
  `fs.read` 作用域，其自身的读写保持在它正在浏览的那一个项目文件夹的
  沙箱内（ADR 0241、ADR 0263）。
- **关联规范**：`07-plugins/03-plugin-api.md` §3、
  `07-plugins/13-plugin-permissions-matrix.md` §2、
  `04-ux/08-component-spec.md` §5、ADR 0104、ADR 0109、ADR 0111、
  ADR 0169、ADR 0241、ADR 0249、ADR 0263
- **验收**：G（插件）、D（工作区）、安全、质量
- **里程碑**：M6+
- **状态**：单测覆盖于 `apps/desktop/test/bundled-plugins.test.mjs`
  （清单契约、仅公共桥接页面、打包校验和）、
  `apps/desktop/test/plugin-fs-scope.test.mjs`（`fs.openDefault` 和
  `fs.reveal` 守卫）、`apps/desktop/test/plugin-work-panel-views.test.mjs`
  （停靠视图事件广播），以及 host-core 的
  `bundled_plugins_refresh_from_disk_but_keep_user_state`；打包旅程为草稿
  （仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-PLUGIN-file-view-collapse-persists

- **前置条件**：捆绑的 File Manager 视图打开在一个包含嵌套文件夹和一个
  文本文件的项目上，且工作面板宽度足够容纳双栏布局。
- **步骤**：
  1. 把文件列表与内容窗格之间的分隔条拖到非默认宽度，然后仅用键盘激活
     工具栏最左侧的开关（Tab 到它，再按 Enter 或 Space）。
  2. 点击会话中的一个文件引用。
  3. 再次激活同一个开关。
  4. 折叠文件列表，然后关闭并重新打开该视图，最后重启应用。
  5. 手动展开文件列表，点击另一个聊天文件引用。
- **预期结果**：该开关隐藏视图自己的左侧文件列表，把全宽让给内容窗格，
  且它始终可通过键盘到达，其无障碍名称在 `Hide file list` 和
  `Show file list` 之间切换。聊天点击后的打开请求显示所请求的文件，其祖先
  文件夹展开而文件列表折叠，无论视图此前已打开还是由该点击打开。再次展开
  会恢复之前拖动的分栏宽度以及展开的文件夹和选中的文件，而不是默认分栏
  或项目根。折叠状态被持久化：它在关闭重开视图和完整应用重启后保留，且
  手动展开保持到下一次 host 打开请求再次折叠它为止。
- **关联规范**：`07-plugins/02-plugin-manifest-schema.md` §4/§5、
  `04-ux/08-component-spec.md` §5.2.2、ADR 0104、ADR 0241、ADR 0262
- **验收**：G（插件）、质量
- **里程碑**：M6+
- **状态**：该捆绑包的清单、入口页面和上游校验和已被单测覆盖
  （`apps/desktop/test/bundled-plugins.test.mjs`）；插件侧旅程为草稿
  （仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-PLUGIN-file-view-switches-folder-per-project

- **前置条件**：一个项目分组，其两个文件夹各自持有一个另一个文件夹没有
  的文本文件；另有一个单文件夹项目。工作面板打开在捆绑的 File Manager
  视图上，正在浏览第一个项目的主文件夹。
- **步骤**：
  1. 把视图左上角的文件夹控件切到项目的第二个文件夹。确认树、文件名
     搜索和打开/保存都跟随它。
  2. 在只有第二个文件夹持有的文本文件中保存一处编辑。
  3. 关闭并重新打开视图，然后重启应用。确认正在浏览的仍是第二个文件夹。
  4. 切到另一个项目再切回。确认每个项目记住自己的文件夹。
  5. 点击一个解析到项目第二个文件夹的聊天引用，再点击一个解析到主
     文件夹的。
  6. 在选中第二个文件夹时，在树中搜索只有主文件夹才有的文件名，并尝试
     打开第二个文件夹内的一个 `.env` 和一个指向其外部的符号链接或
     junction。7) 在选中第二个文件夹时，右键只有该文件夹持有的文本文件，
     使用 **Open with default app**，再使用 **Show in folder**；切到主
     文件夹，对只有*它*持有的文件做同样操作。8) 回到第二个文件夹，对
     一个两个文件夹都含有的同名文件使用同样两个操作。
- **预期结果**：
  - 该控件按分组顺序列出项目的文件夹，主文件夹在前，并点名正在浏览的
    那个；树、搜索和编辑都在那一个文件夹内工作，单文件夹项目只提供其
    唯一文件夹。
  - 切换文件夹只改变此视图浏览的内容：应用可见的工作区、agent 的工具
    根、会话的主路径、项目指令和项目记忆都不变（ADR 0263）。
  - 选择按项目记忆：在关闭重开视图和完整应用重启后保留，另一个项目保持
    自己的文件夹。
  - 两个聊天引用都在此视图中打开到它们点名的文件——包括来自第二个文件
    夹的那个，就在那个文件夹中——不出现 host 的 `file:` 标签页。
  - 选中的文件夹是沙箱，而不是整个分组：文件名搜索够不到只有另一个项目
    文件夹持有的文件，凭证路径和符号链接/junction 逃逸仍被拒绝
    （ADR 0241）。
  - 两个系统操作到达的是被点击的文件、位于正在浏览的文件夹中：只有第二
    个文件夹持有的文件打开或揭示的是它真实自身，而不是报告“not found”，
    两个文件夹同名的文件打开的是第二个文件夹的副本，而不是主文件夹的
    （ADR 0264）。
- **关联规范**：`07-plugins/03-plugin-api.md` §3、
  `04-ux/08-component-spec.md` §5.2.2、ADR 0241、ADR 0249、ADR 0263、ADR 0264
- **验收**：G（插件）、安全、质量
- **里程碑**：M6+
- **状态**：host 侧的解析与寻址已被单测覆盖
  （`apps/desktop/test/chat-ref-resolve.test.mjs`、
  `apps/desktop/test/transcript-file-chips.test.mjs`）；插件侧旅程为草稿
  （仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-PLUGIN-bundled-plugin-keeps-a-marketplace-update

- **前置条件**：一个构建附带一个捆绑插件，其市场条目提供更新的版本；
  数据目录允许用户安装。
- **步骤**：
  1. 打开 Plugins 页面。确认该插件列为捆绑且已启用，且不提供 Uninstall
     操作。
  2. 从市场更新它。确认该行变为目录版本，且仍不提供 Uninstall 操作。
  3. 重启应用。确认更新后的版本仍是已安装版本、插件仍启用，且注册表
     恰好只有它的一行。
  4. 禁用该插件，再次重启，确认它在更新后的版本上保持禁用。
- **预期结果**：捆绑意味着默认且不可移除，而不是冻结。用户的更新比协调
  随包副本的那次启动更持久；附带严格更新版本的应用仍然胜出；不比现有
  新的目录版本绝不会作为更新提供。
- **关联规范**：`07-plugins/07-plugin-marketplace.md`、ADR 0104、ADR 0241
- **验收**：G（插件）、质量
- **里程碑**：M6+
- **状态**：单测覆盖于 host-core 的
  `a_bundled_plugin_keeps_the_update_the_user_installed`、
  `a_newer_shipped_version_replaces_an_older_user_install`、
  `a_plugin_a_build_stops_shipping_is_no_longer_bundled` 和
  `market_entry_offers_an_update_only_when_the_catalog_is_newer`；打包旅程
  为草稿

#### E2E-154：新增模型使用 models.dev 元数据，未知 ID 使用通用形态

- **前置条件**：一个自定义 provider 对话框匹配一个 models.dev provider/API
  URL，并暴露至少两条带限制、模态和推理选项的模型记录。一个确定性夹具
  还暴露一个 provider 发现但不在 models.dev 中的 ID。
- **步骤**：
  1. 从 models.dev 列表选择两个模型，检查它们的名称、上下文/输出限制、
     能力徽标、来源标签和思考 chip。2. 保存 provider 并启动会话；确认请求
     保持 provider 配置的基础 URL/API 风格。3. 强制 Settings 目录刷新，
     确认它重新拉取 models.dev，而不改变捆绑的发布文件，也不写用户缓存。
     4. 添加一个不在 models.dev 中的 ID，检查其通用回退卡片。
- **预期结果**：models.dev 字段预填已知模型绑定，并仍是唯一的元数据来源。
  provider 密钥绝不包含在固定的 models.dev 请求中。provider 发现仍仅用于
  提供自定义/账户专属 ID；这些 ID 获得通用的纯文本、非推理默认值。pi-ai
  提供所选传输和 OAuth/账户可用性，而不是模型元数据。
- **关联规范**：`03-runtime/11-provider-model-system.md` §6.2、
  `03-runtime/13-model-catalog-and-selection.md` §11.1–§12、ADR 0134
- **验收**：B（模型配置）、C（会话与流式）、安全
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖；完整 provider 对话框旅程为草稿
  （仅在此界面发生变化时于有相应能力的环境中运行）

#### E2E-NAV-plugins-button-goes-back：Plugins 页脚按钮复用导航历史

- **前置条件**：一个隔离的 profile 有一个已命名的会话和可见消息。不需要
  模型凭证或外部市场访问。
- **步骤**：1) 选中会话，输入一份未发送的草稿，从页脚进入 Plugins，再
  点击同一个按钮。2) 重新打开 Plugins，在 Installed 中输入搜索，返回后
  重新打开。3) 在导航夹具中，从 `pulls`、`scheduled` 和 Settings 重复；
  测试一条在进入 Plugins 前同时包含 Scheduled 和 Settings 的历史。4) 先
  执行 Forward，再点击 Plugins 按钮。5) 在没有任何历史条目时打开 Plugins
  并点击它。
- **预期结果**：第二次点击恰好执行一次现有的 Back 操作；它不会追加返回
  条目，也不会跳过 Settings。聊天历史条目使用现有的会话选择/加载行为。
  返回后会话和未发送草稿保持可用。如果 Back 不可用，该按钮打开聊天。其
  按下状态反映 Plugins 是否活跃。插件浏览标签页、搜索字段和分类在路由
  卸载后保留；对话框和监听器被释放而不是被隐藏保留。Settings 导航不变。
- **关联规范**：`04-ux/01-ui-ia.md` §2/§5、`04-ux/08-component-spec.md` §3
- **验收**：C（会话导航）、G（插件浏览）、质量
- **里程碑**：M6+
- **状态**：实际的页脚处理器/历史切片和浏览状态回归测试已通过。对重建
  的基于历史版本的 macOS 真实 UI 验证通过了两个打开/返回循环：相同的两条
  会话消息和未发送草稿保留，按钮在返回时清除其活跃状态，重新打开保留
  Installed 搜索过滤。非聊天历史条目、Forward 和无历史回退由测试覆盖，
  而非原生 UI。布局旅程也第二次激活页脚按钮并断言前一个目的地；它在
  来自集成 main `d6ffaa3b` 的 37/37 项检查中通过。不需要外部市场或真实
  模型。

#### E2E-PROVIDER-custom-form-excludes-account-formats：让账户 API 远离新的自定义服务

- **前置条件**：隔离 profile，英文和简体中文。使用 Codex 和 Pi 账户格式
  播种非 OAuth 的旧行，包括一个 OpenAI 预设 URL；使用合成模型，不使用
  真实凭证。
- **步骤**：1) 添加一个 Custom service 并检查其格式选项。2) 编辑每个旧行
  并不做修改保存，然后显式选择 Responses 并保存。3) 复制每个原始旧行，
  检查当前格式和说明提示，等待超过发现去抖时间，然后取消。4) 再次复制，
  选择 Anthropic Messages 并保存。5) 检查保存的载荷和未改变的源行。
- **预期结果**：新自定义选项是四种通用协议；Codex 和 Pi 通过厂商账户获得，
  不作为新的 API 密钥选项。旧行编辑保留格式、名称、URL 和认证，除非显式
  更改。复制的账户格式可见但不能被新选中；在显式选择受支持项之前，保存
  和发现都被阻止。说明文案已本地化。Cancel 不执行创建；合法副本绝不使用
  源 id 或凭证。具名的 OpenCode Go 和 OAuth 账户流程保持不变。
- **自动化**：`pnpm test:e2e:provider-api-style` 在 Electron/Chromium 中以
  打桩的 API 边界渲染生产 React 表单，并检查精确的创建、更新和发现载荷。
  这不验证 Host 存储或实时 OAuth。
- **关联规范**：`03-runtime/12-provider-config-schema.md`、ADR 0095。
- **验收**：B（模型配置）、安全。
- **状态**：辅助/复制回归已通过。分支上的 Electron/React 场景在英文和简体
  中文下通过：六个场景组、四次创建和八次更新，均通过打桩的 API。Host
  持久化、实时 OAuth/模型调用和视觉布局未被覆盖。集成后 main E2E 未运行。

#### E2E-PROVIDER-copy-config-without-credentials：把配置复制成独立的 provider

- **前置条件**：Settings 包含一个普通 provider，带有已保存的 API 密钥、
  自定义头和两个模型绑定（别名、限制、思考级别和模态覆盖各不相同）；还
  存在一个 OAuth 账户。记录源配置和全局默认 provider/模型。使用确定性
  端点捕获发现请求，不使用真实机密。
- **步骤**：1) 复制该普通 provider。2) 确认自定义服务草稿保留名称、URL、
  API 格式和模型绑定，而密钥和自定义头为空，且显示一条省略说明。3) 更改
  API 格式、一个模型别名/限制及其思考级别；取消。4) 确认 provider 数量、
  源数据和全局默认值不变。5) 再次复制，先在输入新密钥前触发发现，再用
  一个不同的夹具密钥。6) 以不同的名称和改过的 API 格式保存。7) 重新打开
  两个 provider 并编辑副本。8) 检查 OAuth 账户行没有 Copy。9) 在草稿构造
  夹具中添加未知的源/模型字段，验证它们不被复制。10) 复制一个 OpenCode
  Go provider，确认其具名服务和固定格式被保留，然后选择 Custom service
  并挑选另一种普通 API 格式。
- **预期结果**：Cancel 不创建 provider 或机密。草稿模型对象和思考数组不
  与源共享引用。发现和连接测试不使用源 provider id 或已存凭证；认证发现
  只使用新的草稿密钥。Copy 绝不读取机密存储。Save 通过现有创建路径创建
  一个独立的 provider，具有独立的模型绑定和凭证，而源和全局默认值保持
  不变。自定义头和未知字段被省略，即使它们含有类似凭证的值。OAuth 账户
  不能通过此操作复制。
- **关联规范**：`03-runtime/12-provider-config-schema.md`、
  `03-runtime/14-secrets-storage.md`
- **验收**：B（模型配置）、F（独立持久化）、安全
- **里程碑**：M2
- **状态**：真实 Host/辅助夹具验证了独立创建、编辑、删除、源凭证/默认值
  保留和重启持久化。在隔离的无机密 profile 上的实际 UI 验证确认取消后仍
  只有一个 provider；保存一份把 Responses 改为 Anthropic Messages 且名称/
  别名已改的副本会创建第二个 provider，而不改变全局默认值。重新打开两行
  确认源保留了 Responses 和其原始别名，副本保留了 Anthropic Messages 和
  其编辑后的别名。携带凭证的网络发现、外部模型调用和 OpenCode Go UI 变体
  未被覆盖。

#### E2E-PLUGIN-global-shortcut-owns-only-its-own-command

- **前置条件**：两个本地夹具插件安装在一个隔离 profile 中。插件 A 声明
  `keyboard.globalShortcut`、带一个命令的 `contributes.commands`，以及把
  `Alt+Shift+V` 映射到它的 `contributes.globalShortcuts`。插件 B 声明相同
  权限，并在 A 持有 `Alt+Shift+V` 时请求它。另有一个应用可用于跨应用按键。
- **步骤**：1) 安装并加载 A，通过 `listGlobalShortcuts` 确认加速器被持有。
  2) 聚焦另一个应用，按 `Alt+Shift+V`，确认 A 的命令运行；没有跨应用输入
  可用时，通过 host 的测试接缝驱动已注册的处理器。3) 尝试一个 `command`
  属于另一个插件的快捷键。4) 尝试 B 注册 `Alt+Shift+V` 并检查应答。5)
  禁用并卸载 A，确认加速器释放且 B 可以取得它；在终止 A 的 runtime（崩溃）
  后和 A 的面板关闭时重复。6) 尝试应用自己的启动器加速器 `Alt+Space`、
  `Alt+Shift+W` 窗口开关、一个保留绑定如 `Mod+C`、一个无效加速器，以及
  一个插件的第九个快捷键。
- **预期结果**：该加速器只运行 A 自己的命令；`command` 未由该插件注册的
  快捷键以 `INVALID_ARGUMENT` 拒绝。B 收到拒绝（`registered: false`，代码
  `SHORTCUT_CONFLICT`），且在 A 持有期间不保留任何加速器。host 自己的
  `Alt+Space` 启动器和 `Alt+Shift+W` 窗口开关快捷键以及 OS 保留绑定以
  `SHORTCUT_CONFLICT` 或 `SHORTCUT_UNAVAILABLE` 拒绝；无效加速器以
  `INVALID_ACCELERATOR` 拒绝，每个插件的第九个快捷键以 `LIMIT_EXCEEDED`
  拒绝。禁用、卸载或崩溃一个插件会释放它持有的每个加速器，之后另一个
  插件可以取得它，应用退出释放所有快捷键。审计记录每次注册/注销尝试的
  插件 id 和结果，绝不记录按键内容。
- **关联规范**：`07-plugins/03-plugin-api.md`、
  `07-plugins/04-plugin-security.md`、
  `07-plugins/13-plugin-permissions-matrix.md`、ADR 0257
- **验收**：G（插件）、安全、质量
- **里程碑**：M6+
- **状态**：注册表、host 接线和清单校验已被单测覆盖
  （`apps/desktop/test/plugin-shortcuts.test.mjs`、
  `packages/plugin-sdk/src/index.test.ts`、
  `crates/host-core/src/plugins/tests.rs`）；跨应用按键旅程为草稿，需要有
  相应能力的桌面环境。

#### E2E-PLUGIN-permission-gate-for-real-time-capabilities

- **前置条件**：一个清单可在两次运行之间更改的夹具插件，以及一个用户可
  重新授予权限的数据目录。
- **步骤**：1) 安装一个要求 `keyboard.globalShortcut` 的构建，检查安装
  对话框。2) 加载一个未声明该权限就调用
  `pi.keyboard.listGlobalShortcuts()` 的插件。3) 声明但不授予该权限，然后
  调用同一 API。4) 授予该权限并再次调用同一 API。5) 在插件已加载时撤销
  该权限并按加速器。6) 对 `audio.capture.background`、
  `audio.playback.background` 和 `net.websocket` 重复步骤 2–5。
- **预期结果**：未声明和已声明但未授予的调用以 `PERMISSION_DENIED` 拒绝
  并记录审计条目，因此未授予的能力失败即关闭，而不是降级。授予后同一
  调用被允许——对 `net.websocket` 而言是一个能通过门禁的连接——而可调
  用的音频方法应答带代码的 `UNSUPPORTED`，因为 host 还没有设备后端，审计
  为 `{ api: "audio.<method>", ok: false, errorCode: "UNSUPPORTED" }`，
  绝不是静默成功。在插件已加载时撤销权限会立即停止加速器，host 释放它。
  这四个权限带着各自的风险等级（`audio.capture.background` 和
  `net.websocket` 为高，`audio.playback.background` 和
  `keyboard.globalShortcut` 为中）和本地化文案出现在安装对话框和插件详情
  页中，按风险降序排列。
- **关联规范**：`07-plugins/04-plugin-security.md`、
  `07-plugins/13-plugin-permissions-matrix.md`、ADR 0257
- **验收**：G（插件）、安全
- **里程碑**：M6+
- **状态**：门禁和校验器行为已被单测覆盖
  （`packages/plugin-sdk/src/index.test.ts`、
  `packages/plugin-devkit/src/check.test.ts`、
  `crates/host-core/src/plugins/tests.rs`）；对话框旅程为草稿。

#### E2E-PLUGIN-background-audio-and-realtime-connection

- **前置条件**：一个语音助手夹具插件，持有 `background.service`、
  `audio.capture.background`、`audio.playback.background`、
  `keyboard.globalShortcut`、`net.websocket` 和 `desktop.control`，配有
  模拟音频后端和一个本地模拟 WebSocket 服务器，因此 CI 不需要真实麦克风。
- **步骤**：1) 在没有打开面板的情况下加载插件，确认其后台服务启动。2)
  注册按键通话加速器。3) 打开输入设备并接收 PCM 帧。4) 连接模拟服务器
  并发送 PCM。5) 接收响应音频并播放。6) 用 `stopOutput` 中断播放。7) 调用
  `pi.desktop.invoke({ operation: "session/create" })`，然后调用
  `agent/prompt`。8) 卸载插件。
- **预期结果**：音频帧在有界缓冲下流动，队列不会无限增长，`stopOutput`
  立即清空排队音频。向 `manifest.net.domains` 之外主机的出站被拒绝。卸载
  时麦克风、音频输出、socket 和加速器全部释放，没有孤立的进程、监听器
  或定时器。`session/delete` 类的危险桌面操作即使插件传 `confirm: true`
  仍要求 host 的原生确认。
- **关联规范**：`07-plugins/03-plugin-api.md`、
  `07-plugins/04-plugin-security.md`、
  `07-plugins/12-plugin-ipc-and-host-services.md`、ADR 0257
- **验收**：G（插件）、安全、质量
- **里程碑**：M6+
- **状态**：部分实现——socket 一半已实现并由
  `apps/desktop/test/plugin-websocket.test.mjs`（白名单、界限、生命周期）
  单测覆盖；后台音频一半应答带代码的 `UNSUPPORTED`，因为 host 还没有设备
  后端，所以此场景在音频落地前保持草稿。

## 8. 可追溯性矩阵

| 验收 | 场景 |
|---|---|
| A / C — Unicode stdio 分帧 | E2E-RPC-unicode-separators |
| C / G / 质量 — 插件导航 | E2E-NAV-plugins-button-goes-back |
| C / D / 质量 — 侧栏行状态 | E2E-LAYOUT-sidebar-row-states |
| A / C / 质量 — 侧栏材质与设置返回 | E2E-LAYOUT-sidebar-settings |
| B / F / 安全 — Provider 复制 | E2E-PROVIDER-copy-config-without-credentials |
| B / F / 质量 — 已选模型顺序 | E2E-MODEL-selected-order-persists |
| A — 应用启动 | E2E-001, E2E-002, E2E-003, E2E-004, E2E-067, E2E-076, E2E-079, E2E-092, E2E-097, E2E-143, E2E-150, E2E-168, E2E-204 |
| A / C / F / 质量 — 托盘会话导航 | E2E-TRAY-bounded-session-navigation |
| B — 模型配置 | E2E-005, E2E-006, E2E-007, E2E-038, E2E-050, E2E-052, E2E-055, E2E-066, E2E-080, E2E-082, E2E-102c, E2E-102d, E2E-102e, E2E-151, E2E-154, E2E-163, E2E-166, E2E-172, E2E-174, E2E-197, E2E-005G, E2E-005J, E2E-199, E2E-201, E2E-202, E2E-203, E2E-205, E2E-206, E2E-209 |
| C — 会话与流式 | E2E-008, E2E-008d, E2E-008e, E2E-008a, E2E-009, E2E-010, E2E-011, E2E-011a, E2E-011b, E2E-011d, E2E-011e, E2E-011g, E2E-031, E2E-040, E2E-047, E2E-048, E2E-048A, E2E-049, E2E-052, E2E-053, E2E-054, E2E-055, E2E-059, E2E-059a, E2E-060c, E2E-060d, E2E-061, E2E-061a, E2E-062, E2E-064, E2E-065, E2E-068, E2E-071, E2E-073, E2E-074, E2E-075, E2E-081, E2E-083, E2E-084, E2E-086, E2E-087, E2E-088, E2E-088b, E2E-089, E2E-090, E2E-COMPOSER-narrow-controls, E2E-094, E2E-095, E2E-096, E2E-097, E2E-098, E2E-099, E2E-102, E2E-102a, E2E-102b, E2E-102c, E2E-102d, E2E-102g, E2E-106, E2E-109, E2E-111, E2E-114, E2E-116, E2E-117, E2E-118, E2E-119, E2E-120, E2E-121, E2E-218, E2E-259, E2E-219, E2E-AGENTS-001, E2E-142, E2E-144, E2E-145, E2E-146, E2E-146a, E2E-147, E2E-151, E2E-154, E2E-155, E2E-158, E2E-159, E2E-161, E2E-162, E2E-166, E2E-172, E2E-173, E2E-174, E2E-177, E2E-178, E2E-179, E2E-180, E2E-182, E2E-183, E2E-187, E2E-198, E2E-199, E2E-202, E2E-203, E2E-207, E2E-208, E2E-CHAT-content-width-handles, E2E-250, E2E-102i, E2E-PLUGIN-session-orchestrator-real-workers, E2E-SUBAGENT-settlement-updates-before-parent-poll, E2E-SUBAGENT-resume-a-settled-delegation |
| D — 工作区 | E2E-012, E2E-013, E2E-022B, E2E-024I, E2E-047, E2E-049, E2E-057, E2E-058, E2E-060, E2E-068, E2E-075, E2E-078, E2E-153, E2E-158, E2E-182, E2E-187, E2E-252 |
| D — 工作区（项目排序） | E2E-253 |
| E — 工具与权限 | E2E-008a, E2E-014, E2E-015, E2E-016, E2E-017, E2E-018, E2E-019, E2E-024I, E2E-024K, E2E-040, E2E-049, E2E-074, E2E-093, E2E-097, E2E-099, E2E-100, E2E-101, E2E-102, E2E-102d, E2E-102e, E2E-102g, E2E-103, E2E-105, E2E-106, E2E-107, E2E-111, E2E-112, E2E-113, E2E-114, E2E-115, E2E-116, E2E-119, E2E-121, E2E-122, E2E-142, E2E-145, E2E-147, E2E-155, E2E-158, E2E-166, E2E-181, E2E-PLUGIN-imported-pi-package-skills |
| F — 持久化 | E2E-020, E2E-021, E2E-021a, E2E-036, E2E-037, E2E-038, E2E-040, E2E-042, E2E-047, E2E-048, E2E-051, E2E-054, E2E-056, E2E-061, E2E-062, E2E-064, E2E-066, E2E-068, E2E-071, E2E-072, E2E-073, E2E-082, E2E-084, E2E-096, E2E-098, E2E-102, E2E-102b, E2E-102c, E2E-102d, E2E-102g, E2E-102i, E2E-103, E2E-AGENTS-001, E2E-061a, E2E-073a, E2E-104, E2E-106, E2E-107, E2E-108, E2E-109, E2E-110, E2E-112, E2E-118, E2E-119, E2E-120, E2E-121, E2E-123, E2E-142, E2E-146, E2E-146a, E2E-148, E2E-151, E2E-158, E2E-160, E2E-168, E2E-171, E2E-177, E2E-178, E2E-183, E2E-186, E2E-005J, E2E-PLUGIN-session-orchestrator-real-workers |
| F — 持久化（项目排序） | E2E-251 |
| G — 插件 | E2E-022, E2E-022A, E2E-022B, E2E-022C, E2E-023, E2E-024, E2E-024B, E2E-024C, E2E-024D, E2E-024AA, E2E-024E, E2E-024W, E2E-024F, E2E-024G, E2E-024H, E2E-024I, E2E-024J, E2E-024K, E2E-024L, E2E-024M, E2E-024N, E2E-024O, E2E-024P, E2E-025, E2E-026, E2E-105, E2E-117, E2E-120, E2E-122, E2E-123, E2E-024Q, E2E-148, E2E-152, E2E-153, E2E-PLUGIN-imported-pi-package-skills, E2E-PLUGIN-imported-pi-package-wrapper, E2E-PLUGIN-import-extension-installs-dependencies, E2E-PLUGIN-import-extension-reports-missing-dependency, E2E-PLUGIN-global-shortcut-owns-only-its-own-command, E2E-PLUGIN-permission-gate-for-real-time-capabilities, E2E-PLUGIN-background-audio-and-realtime-connection, E2E-PLUGIN-fs-root-follows-the-calling-session |
| H — 诊断 | E2E-027, E2E-031, E2E-034, E2E-042, E2E-096, E2E-098, E2E-104, E2E-107, E2E-108, E2E-109, E2E-110, E2E-113, E2E-115, E2E-116, E2E-118, E2E-121, E2E-146, E2E-146a, E2E-155, E2E-159, E2E-176, E2E-194, E2E-195 |
| 安全 | E2E-028, E2E-029, E2E-030, E2E-024J, E2E-024K, E2E-024M, E2E-049, E2E-068, E2E-086, E2E-102c, E2E-102d, E2E-102e, E2E-105, E2E-106, E2E-107, E2E-108, E2E-109, E2E-110, E2E-112, E2E-113, E2E-115, E2E-116, E2E-117, E2E-119, E2E-121, E2E-122, E2E-123, E2E-142, E2E-148, E2E-151, E2E-153, E2E-158, E2E-187, E2E-196c, E2E-196b, E2E-196, E2E-PLUGIN-fs-root-follows-the-calling-session |
| 质量 | E2E-032, E2E-033, E2E-039, E2E-043, E2E-044, E2E-045, E2E-046, E2E-047, E2E-048, E2E-048A, E2E-049, E2E-050, E2E-053, E2E-055, E2E-056, E2E-057, E2E-058, E2E-059, E2E-060, E2E-061, E2E-062, E2E-063, E2E-064, E2E-065, E2E-066, E2E-067, E2E-068, E2E-069, E2E-070, E2E-071, E2E-072, E2E-073, E2E-074, E2E-075, E2E-076, E2E-077, E2E-078, E2E-079, E2E-080, E2E-081, E2E-082, E2E-083, E2E-084, E2E-085, E2E-086, E2E-092, E2E-093, E2E-094, E2E-095, E2E-096, E2E-097, E2E-098, E2E-099, E2E-100, E2E-101, E2E-102, E2E-102a, E2E-102b, E2E-102c, E2E-102d, E2E-102e, E2E-103, E2E-AGENTS-001, E2E-021a, E2E-024N, E2E-059a, E2E-060b, E2E-060c, E2E-061a, E2E-073a, E2E-111, E2E-114, E2E-117, E2E-118, E2E-119, E2E-120, E2E-122, E2E-123, E2E-142, E2E-143, E2E-144, E2E-145, E2E-146, E2E-147, E2E-148, E2E-150, E2E-151, E2E-153, E2E-155, E2E-158, E2E-159, E2E-160, E2E-161, E2E-162, E2E-163, E2E-168, E2E-172, E2E-173, E2E-174, E2E-011g, E2E-176, E2E-177, E2E-178, E2E-179, E2E-180, E2E-181, E2E-182, E2E-183, E2E-186, E2E-187, E2E-194, E2E-195, E2E-196a, E2E-196b, E2E-196c, E2E-198, E2E-199, E2E-200, E2E-196, E2E-201, E2E-204, E2E-202, E2E-203, E2E-205, E2E-206, E2E-207, E2E-208, E2E-209, E2E-210, E2E-218, E2E-259, E2E-219, E2E-250, E2E-252, E2E-102i, E2E-SUBAGENT-settlement-updates-before-parent-poll, E2E-PLUGIN-imported-pi-package-skills, E2E-PLUGIN-fs-root-follows-the-calling-session, E2E-SUBAGENT-resume-a-settled-delegation |
| 质量（项目排序） | E2E-253 |
| C — 会话与流式（IME 斜杠别名） | E2E-255 |
| E — 工具与权限（Skill 驻留） | E2E-254 |
| 质量（Skill 驻留与 IME 斜杠别名） | E2E-254, E2E-255 |
| C — 会话与流式（导入可见性） | E2E-257 |
| F — 持久化（导入可见性） | E2E-257 |
| G — 插件（导入可见性） | E2E-257 |
| 质量（导入可见性） | E2E-257 |
| G — 插件（Session Orchestrator） | E2E-PLUGIN-session-orchestrator-real-workers |
| 安全（Session Orchestrator） | E2E-PLUGIN-session-orchestrator-real-workers |
| 质量（Session Orchestrator） | E2E-PLUGIN-session-orchestrator-real-workers |
| C — 会话与流式（会话列表响应性） | E2E-SESSION-list-refresh-keeps-desktop-responsive |
| 质量（会话列表响应性） | E2E-SESSION-list-refresh-keeps-desktop-responsive |
| 安全（导入扩展依赖） | E2E-PLUGIN-import-extension-installs-dependencies, E2E-PLUGIN-import-extension-reports-missing-dependency |
| 质量（导入扩展依赖） | E2E-PLUGIN-import-extension-installs-dependencies, E2E-PLUGIN-import-extension-reports-missing-dependency |
| C — 会话与流式（独立会话通信） | E2E-SESSION-independent-top-level-communication |
| D — 插件安全（独立会话通信） | E2E-SESSION-independent-top-level-communication |
| G — 插件（独立会话通信） | E2E-SESSION-independent-top-level-communication |
| 质量（独立会话通信） | E2E-SESSION-independent-top-level-communication, E2E-SESSION-hover-card-model-and-links |
| C — 会话与流式（悬停卡片模型与链接） | E2E-SESSION-hover-card-model-and-links |
| C — 会话与流式（聊天文件引用） | E2E-CHAT-shorthand-file-ref-opens-the-matching-file, E2E-CHAT-file-ref-opens-the-surface-that-owns-it |
| G — 插件（聊天文件引用） | E2E-CHAT-file-ref-opens-the-surface-that-owns-it, E2E-PLUGIN-file-view-collapse-persists |
| 质量（聊天文件引用） | E2E-CHAT-shorthand-file-ref-opens-the-matching-file, E2E-CHAT-file-ref-opens-the-surface-that-owns-it, E2E-PLUGIN-file-view-collapse-persists |
| G — 插件（项目文件夹根） | E2E-PLUGIN-file-view-switches-folder-per-project |
| 安全（项目文件夹根） | E2E-PLUGIN-file-view-switches-folder-per-project |
| 质量（项目文件夹根） | E2E-PLUGIN-file-view-switches-folder-per-project |
| D — 工作区（项目删除） | E2E-PROJECT-delete-removes-project-and-owned-sessions |
| F — 持久化（项目删除） | E2E-PROJECT-delete-removes-project-and-owned-sessions |
| 质量（项目删除） | E2E-PROJECT-delete-removes-project-and-owned-sessions |
| 质量（两次点击删除） | E2E-SESSION-two-click-delete-arms-first |
| 安全（插件实时能力） | E2E-PLUGIN-global-shortcut-owns-only-its-own-command, E2E-PLUGIN-permission-gate-for-real-time-capabilities, E2E-PLUGIN-background-audio-and-realtime-connection |
| C — 会话与流式（折叠区阅读位置） | E2E-CHAT-disclosure-toggle-keeps-reading-position |
| E — 工具与权限（折叠区阅读位置） | E2E-CHAT-disclosure-toggle-keeps-reading-position |
| E — 工具与权限（能力层级移动） | E2E-CAPABILITY-move-across-levels |
| F — 持久化（能力层级移动） | E2E-CAPABILITY-move-across-levels |
| 质量（能力层级移动） | E2E-CAPABILITY-move-across-levels |

| 里程碑 | 场景 |
|---|---|
| M1 | E2E-001, E2E-002, E2E-003, E2E-028, E2E-029 |
| M2 | E2E-004, E2E-005, E2E-006, E2E-007, E2E-008, E2E-008d, E2E-008e, E2E-009, E2E-010, E2E-011, E2E-011a, E2E-011b, E2E-011d, E2E-011e, E2E-011g, E2E-020, E2E-021, E2E-021a, E2E-027, E2E-031, E2E-036, E2E-037, E2E-042, E2E-087, E2E-088, E2E-088b, E2E-089, E2E-090, E2E-COMPOSER-narrow-controls, E2E-144, E2E-005J, E2E-201, E2E-202, E2E-207, E2E-206 |
| M3 | E2E-012, E2E-013, E2E-014, E2E-015, E2E-016, E2E-017, E2E-018, E2E-019, E2E-040 |
| M4 | E2E-022, E2E-023, E2E-024, E2E-025, E2E-026, E2E-030, E2E-038 |
| M5 | E2E-008a, E2E-032, E2E-033, E2E-034, E2E-039, E2E-043, E2E-044, E2E-045, E2E-046, E2E-047, E2E-048, E2E-048A, E2E-049, E2E-050, E2E-051, E2E-052, E2E-053, E2E-054, E2E-055, E2E-056, E2E-057, E2E-058, E2E-059, E2E-060, E2E-061, E2E-062, E2E-063, E2E-064, E2E-065, E2E-066, E2E-067, E2E-068, E2E-069, E2E-070, E2E-071, E2E-072, E2E-073, E2E-074, E2E-075, E2E-076, E2E-077, E2E-078, E2E-079, E2E-080, E2E-081, E2E-082, E2E-083, E2E-084, E2E-085, E2E-086, E2E-092, E2E-093, E2E-096, E2E-097, E2E-098, E2E-099, E2E-100, E2E-101, E2E-102, E2E-102a, E2E-102b, E2E-102c, E2E-102d, E2E-102e, E2E-AGENTS-001, E2E-059a, E2E-060b, E2E-060c, E2E-061a, E2E-073a, E2E-094, E2E-095, E2E-143, E2E-145, E2E-146, E2E-146a, E2E-147, E2E-177, E2E-178, E2E-180, E2E-181, E2E-182, E2E-183, E2E-186, E2E-187, E2E-194, E2E-195, E2E-204, E2E-208, E2E-CHAT-content-width-handles, E2E-250, E2E-252, E2E-102i |
| M5（项目排序） | E2E-253 |
| M2（IME 斜杠别名） | E2E-255 |
| M5（Skill 驻留） | E2E-254 |
| M6 | E2E-104, E2E-105, E2E-106, E2E-107, E2E-108, E2E-109, E2E-110, E2E-111, E2E-112, E2E-113, E2E-114, E2E-115, E2E-116, E2E-117, E2E-118, E2E-119, E2E-120, E2E-103, E2E-172 |
| M6+ | E2E-121, E2E-122, E2E-148, E2E-150, E2E-151, E2E-154, E2E-155, E2E-158, E2E-159, E2E-160, E2E-161, E2E-162, E2E-163, E2E-166, E2E-168, E2E-173, E2E-174, E2E-176, E2E-179, E2E-196a, E2E-196b, E2E-196c, E2E-198, E2E-199, E2E-200, E2E-202, E2E-203, E2E-205, E2E-209, E2E-210, E2E-212, E2E-213, E2E-214, E2E-215, E2E-216, E2E-217, E2E-218, E2E-259, E2E-219, E2E-257, E2E-SUBAGENT-settlement-updates-before-parent-poll, E2E-PLUGIN-fs-root-follows-the-calling-session, E2E-SUBAGENT-resume-a-settled-delegation |
| M6+（Session Orchestrator） | E2E-PLUGIN-session-orchestrator-real-workers |
| M6+（已选模型顺序） | E2E-MODEL-selected-order-persists |
| M6+（会话列表响应性） | E2E-SESSION-list-refresh-keeps-desktop-responsive |
| M6+（独立会话通信） | E2E-SESSION-independent-top-level-communication, E2E-SESSION-hover-card-model-and-links |
| M5（聊天文件引用） | E2E-CHAT-shorthand-file-ref-opens-the-matching-file, E2E-CHAT-file-ref-opens-the-surface-that-owns-it |
| M6+（聊天文件引用） | E2E-PLUGIN-file-view-collapse-persists |
| M6+（项目文件夹根） | E2E-PLUGIN-file-view-switches-folder-per-project |
| MVP 之后 | E2E-022A, E2E-022B, E2E-022C, E2E-024I, E2E-024J, E2E-024K, E2E-024L, E2E-024M（插件路线图 R2/R3/R6） |
| 基线之后的本地自动化 | E2E-220 |
| MVP 之后远程控制 | E2E-221, E2E-222, E2E-223, E2E-224, E2E-225, E2E-226, E2E-227, E2E-228, E2E-229, E2E-230, E2E-231, E2E-232 |
| 受信扩展（R7 v1） | E2E-241, E2E-242, E2E-TRUSTED-EXTENSION-custom-agent-stream-and-binding, E2E-243, E2E-244, E2E-245, E2E-PLUGIN-imported-pi-package-skills, E2E-PLUGIN-import-extension-installs-dependencies, E2E-PLUGIN-import-extension-reports-missing-dependency, E2E-PLUGIN-declared-provider-appears-in-the-native-provider-list |
| M6+（项目删除） | E2E-PROJECT-delete-removes-project-and-owned-sessions |
| M6+（两次点击删除） | E2E-SESSION-two-click-delete-arms-first |
| C — 会话与流式（模型回退） | E2E-SUBAGENT-ordered-model-fallback-preserves-work |
| 质量（模型回退隔离） | E2E-SUBAGENT-ordered-model-fallback-preserves-work |
| C — 会话与流式（旧版子代理轮次上限） | E2E-SUBAGENT-legacy-turn-limit-frontmatter-is-ignored |
| 质量（旧版子代理轮次上限） | E2E-SUBAGENT-legacy-turn-limit-frontmatter-is-ignored |
| M6+（折叠区阅读位置） | E2E-CHAT-disclosure-toggle-keeps-reading-position |
| M6+（能力层级移动） | E2E-CAPABILITY-move-across-levels |
| E — 工具与权限（内置子代理默认值） | E2E-SUBAGENT-settings-lists-builtin-defaults |
| 质量（内置子代理默认值） | E2E-SUBAGENT-settings-lists-builtin-defaults |
| C — 会话与流式（不透明浮层） | E2E-CHAT-opaque-floating-decision-and-retry-surfaces |
| 质量（不透明浮层） | E2E-CHAT-opaque-floating-decision-and-retry-surfaces |
| M6（不透明浮层） | E2E-CHAT-opaque-floating-decision-and-retry-surfaces |
| B — 模型配置（目录窗口来源） | E2E-MODEL-catalog-window-correction-reaches-saved-bindings |
| F — 持久化（目录窗口来源） | E2E-MODEL-catalog-window-correction-reaches-saved-bindings |
| 质量（目录窗口来源） | E2E-MODEL-catalog-window-correction-reaches-saved-bindings |
| M6+（目录窗口来源） | E2E-MODEL-catalog-window-correction-reaches-saved-bindings |

`US-UI-*` 视觉场景（§UI 外壳视觉场景）追溯到
[decisions-log §D](../08-meta/decisions-log.md) 中的 Codex 对齐决策，
而不是 A–H 验收标准；它们的黄金来源是截图套件。

发布产物路径由 E2E-192、E2E-196a、E2E-196b、E2E-196c 和 E2E-200 覆盖
（质量，M6+）。

---

## 9. AI 必须如何更新本文档

当新增或更改影响用户可见或协议可见行为的功能时：

1. **新增场景**：使用 §6 的模板。分配下一个可用的 ID
   （`E2E-<N>`）。被 ADR 0268 退役的 ID 绝不复用。
2. **建立链接**：把它链接到相关的验收标准（A–H）和里程碑（M1–M6，
   当前产品增量用 M6+）。
3. **设置状态**：除非已有自动化测试，否则设为 `Draft`。
4. **更新可追溯性矩阵**：见 §8。
5. **提交**：把此次更新作为变更的一部分提交（依据
   [ai-development-workflow](03-ai-development-workflow.md) R3）。

---

## 10. 未来自动化映射

当 E2E 自动化实现后（M5 之后）：

- 每个 `Draft` 场景 → 一个 Playwright 测试文件。
- 场景 ID 成为测试用例名：`e2e-001-app-launches`。
- 夹具和测试数据路径定义在 `tests/e2e/fixtures/` 目录中。
- CI 门禁：所有 E2E 场景必须在发布前通过。

自动化章节将在工具决策定稿后由未来的 ADR 扩充。

---

## 11. 验收标准

本测试计划规范在以下条件满足时视为通过：

- [ ] 所有 MVP 验收标准（A–H）至少有一个 E2E 场景。
- [ ] 所有安全验收项至少有一个 E2E 场景。
- [ ] 每个场景至少链接一份规范文档。
- [ ] 可追溯性矩阵完整（场景 ↔ 验收 ↔ 里程碑）。
- [ ] 场景模板已定义且所有条目遵循它。
- [ ] AI 更新规则已记录，并与工作流规范交叉链接。
- [ ] 环境要求与基线一致（原生 macOS arm64/Intel x64、干净 profile）。

## UI 外壳视觉场景

### US-UI-01 与 Codex 对齐的外壳框架
- 在 macOS 深色主题下打开桌面应用。
- 预期主界面为炭黑色（`#181818`），左侧栏带有当前项目和 Temporary
  会话分组，以及一个浮动的底部 Composer，带模式/模型控件，无工作区
  边栏。
- 预期没有蓝灰色营销风格框架；主发送控件是圆形反色按钮。

### US-UI-02 空会话主视觉
- 打开或创建一个零消息的会话。
- 预期居中的主视觉文案“What can I help you build?”，配一行简短的
  弱化辅助文案，没有开发者 starter 卡片。可选的项目名在工作区打开时
  保持为点状下划线操作。

### US-UI-03 侧栏目的地
- 预期展开的主页侧栏显示 Sessions 和 Projects，没有独立的 Plugins、
  Pull requests 或 Scheduled 行。
- 点击侧栏页脚中紧邻 Settings 右侧的插头形 Plugins 图标，预期它用
  专属页面替换主面板。
- 打开 Settings → Project archive，用它打开、切换和关闭一个本地文件夹
  工作区。

### US-UI-04 无工作区上下文的 Composer
- 在 git 工作区打开时，Composer 不在提示词界面上方显示项目、Local 或
  分支标签。
- 运行模式选择器在 Agent、Plan 和 Goal 之间切换；两种契约模式都保留
  权限模式 chip 并解释其 Bash 权衡。

### US-UI-05 语言环境框架
- 在 zh-CN 系统语言环境下，侧栏标签以中文渲染（项目 / 临时会话），
  没有拉取请求或已安排条目。页脚插头形 Plugins 图标暴露本地化的
  无障碍名称 插件。
- 空会话主视觉和辅助文案为本地化中文文案；项目名在工作区打开时保持
  点状下划线操作。
- Composer 省略 本地 工作区标签，显示 Agent/Plan/Goal 和当前模型 ID；
  两种语言环境都暴露 Plan 和 Goal 的审批文案。

### US-UI-06 会话自动标题
- 创建一个新任务并发送第一条提示词，例如“同步代码”。
- 预期其项目或临时会话行立即显示规范化提示词回退标题，然后在第一轮
  后采用简洁的 LLM 摘要。
- 在摘要前后重启，确认当前标题保留；从会话菜单重命名一个任务，如果它
  仍在用默认标题则发送第一条提示词。预期自定义标签保持不变，而默认
  标题的任务获得正常的第一提示词标题。

### US-UI-08 仅快捷键的目的地历史
- 依次导航 Settings → Project archive → 一个项目会话 → Plugins。
- 预期展开的侧栏和主标题栏中没有后退/前进按钮。
- 按 `Cmd/Ctrl+[` 和 `Cmd/Ctrl+]`；预期它们遍历该历史。

### US-UI-09 分组会话标题回填
- 打开一个先前显示“New task”/“New chat”但已有第一条用户消息的旧
  会话。
- 预期其作用域内侧栏行在会话列表加载后显示截断的首条用户消息标题。

### US-UI-11 空草稿复用
- 点击 New task 两次。
- 预期当前项目或 Temporary 分组中只有一个空的“New task”草稿，且主页
  主视觉保持可见。其他作用域中的空草稿不被复用。

### US-UI-12 无工作区边栏的 Composer
- 在空主页、项目主页和会话中，预期 Composer 上方没有项目 / Local /
  分支上下文边栏。
- 提示词外壳保持为一个不间断的圆角界面，没有预留的边栏高度、附加的
  上唇边、边栏阴影、底部接缝或分隔线。

### US-UI-13 浅色主题外壳对齐
- 在浅色 macOS 外观下把主题设为 system/light。
- 预期侧栏 `#f3f3f3`、主区 `#ffffff`、文本 `#1a1c1f`、白色浮动
  Composer，以及带项目下划线的主页主视觉。
- 侧栏项目/会话标签、页脚 Settings/Plugins/通知图标、当前项目标识、
  会话标题和 Composer 控件必须保持浅色背景上的深色可读（≥4.5:1）。
  浅色侧栏上绝不使用白色/半透明文本。
- macOS 红绿灯行让右侧的 Collapse sidebar 在浅色框架下保持可读，不
  渲染 Logo/Home 品牌。

### US-UI-14 语义化框架令牌
- 不重启地切换主题 system → light → dark。
- 外壳框架（侧栏项、Composer runtime 控件、图标按钮）在两种主题下都
  遵循语义化 `--ds-text-*` / `--ds-bg-*` 令牌；浅色界面上没有硬编码的
  白色（`gray-0`）文本。

### US-UI-15 Codex 密度 + elevation
- 侧栏行使用紧凑的 ~28–32px 行距，采用 US-UI-69 的 12–14px 层级和
  8px 水平内边距（Codex `radius-token-row` 10px）。
- 浮动 Composer 使用 Codex elevation-prominent：0.5px 描边 + 柔和的
  3px/20px 阴影（而非沉重的 10–30px 投影）。
- 空主视觉标题为 28px / 34px 行高，字重 400。
- 如果 Stage Manager 折叠窗口，窗口恢复 ≥1000×700（目标 1200×800）。

### US-UI-16 侧栏页脚工具布局
- 在浅色/深色主页外壳上，侧栏页脚是一条透明的工具带，没有分隔线。
  Settings、Plugins 和通知操作分组在左侧，构建/版本 chip 右对齐。
- 通知 Bell 保持在左侧操作组中可见，带未读徽标，并在页脚上方向上打开
  收件箱；主标题栏没有重复的 Bell。
- 点击构建/版本 chip 在当前为最新时检查更新，在有可用更新时打开
  Settings → Info。
- 红绿灯位于 Codex `{x:16,y:16}`，工具栏 46px；展开的 macOS 侧栏在同
  一行右侧放置 Collapse sidebar，没有 Logo/Home 品牌或后退/前进按钮。

### US-UI-17 PI-Desktop 主页主视觉 logo
- 在空聊天主页，100px 的 `HomeMascotLogo` GIF 渲染在标题上方，是一个
  八帧挥手吉祥物，带短暂的静止停顿。浅色和深色主题各用专属的 GIF 和
  静态 PNG。
- 指针悬停不改变节奏或几何；减少动态效果时显示对应的静态首帧。
  吉祥物保持装饰性。
- 标题为 28px / 字重 400；活跃项目名使用点状下划线（1px，偏移 4px）。
- Composer 在附件或 appshot 载荷端到端到达 pi 之前不渲染对应控件。

### US-UI-18 Composer 没有无效操作
- 在聊天主页和停靠会话中，检查每一个 Composer 控件。
- 预期在 pi runtime 尚不支持这些载荷时没有文件、照片或 appshot 控件。
  精确的推理能力模型在 Agent / Plan / Goal 的紧邻右侧暴露当前 Thinking
  级别；不支持的模型不显示触发器。未知的兼容模型可以从模型菜单显式
  启用思考，更改会更新持久会话。
- 预期 Composer 中没有项目、Local 或分支上下文标签。
- 每个可见的 Composer 控件要么改变活跃会话、打开其菜单，要么提交/
  中止当前轮次。

### US-UI-19 永久 Stage Manager 边界恢复（仅 macOS）
- 在启用 Stage Manager 的 macOS 上，缩小 PI 窗口或使其失焦，直到宽度
  < 1040 或高度 < 700。
- 预期外壳重新断言类似 Codex 的占用（~1200×800，最小 1040×700），并
  在仍被折叠时持续恢复（不只是启动后前 20 秒）。
- 恢复看门狗仅限 macOS（D447）。在 Windows/Linux 上它必须完全不运行：
  应用绝不能在未被请求时重新分层或提升自己窗口。聚焦另一个窗口，确认
  PI-Desktop 留在其后而不是跳回栈顶，且堆叠检查
  （`xprop -root _NET_CLIENT_LIST_STACKING`）绝不显示它周期性地回到
  顶部。

### US-UI-20 深色浮动 Composer 盒
- 在聊天主页切到深色主题。
- 预期主区 `#181818`、侧栏 `#000000`，浮动 Composer 底板为
  elevated-primary（`#212121f5` / gray-800 96%），带 elevation-prominent
  描边 + 柔和浮起，使盒子在主界面上清晰可辨。

### US-UI-21 Composer 模型菜单配置 pi
- 用 provider A/model A 创建会话，然后打开 Composer 右侧的 模型 ×
  推理 菜单。
- 预期顶栏只显示任务标题和窗口操作。Composer 右侧的 模型 × 推理 chip
  显示 provider A/model A 和当前推理级别。其菜单起始只有 Model 和
  Reasoning level 两项；Model 打开可搜索的 provider 分组列表，
  Reasoning level 在同一弹层中打开按能力过滤的单选列表。
- 在可搜索的 provider 分组列表中，预期每个 provider 标题是视觉上的
  父级：其 `--text-md` 处理比缩进模型行的常规字重 `--text-sm` 处理更
  强。在 zh-CN 下，标题不得强制大写或加宽拉丁字距。
- 选择 provider B/model B，发送提示词，预期 main 到 sidecar 的
  `agent.prompt` 载荷和 pi runtime 在该会话使用 B。
- 切走再切回；预期 B 及其被钳制的推理级别保持选中。选择模型或推理
  级别会返回根菜单而不关闭 Composer 菜单；外部点击和 Escape 关闭它。
  轮次运行期间，除非有待审批门控，预期组合控件仅对下一轮配置可用。

### US-UI-22 Profile 页脚菜单
- 在侧栏页脚点击 `Custom` / `Local profile` 触发器。
- 预期一个 280px 的不透明浮起菜单位于页脚上方 8px。它在非交互头部
  重复本地身份，然后依次显示分隔线和 Settings、Logs、Theme 操作。
- 方向键在三个操作间循环；Home/End 跳到边界。Escape 关闭菜单并恢复
  触发器焦点。外部指针按下会关闭它而不窃取目标焦点。
- Settings 导航到设置页，Logs 打开本地日志，Theme 在关闭菜单后循环
  切换当前主题。

### US-UI-23 Project archive 索引
- 打开 Settings → Project archive。
- 预期 Settings 标题“Project archive”加上单一工作台构图
  （D168/D267）：一行只携带页面描述的安静引导行，没有主视觉块、渐变
  横幅或页面级计数；一个工具栏带 Recent / Name 排序分段控件、搜索框、
  其清除控件、实时匹配计数和主操作“Add project”；一个面板，其分区
  以面板内标题条依次排列 Pinned、All projects、Archived，每个存在的
  标题条显示其标签和行数。完全没有项目时，面板显示一个安静的空状态，
  带自己的主操作。
- 预期每行携带一个彩色图标、带 Active / Open / 已固定 / Archived 标签
  的项目名、一行包含缩短等宽路径、分支和会话数的元信息、相对的最后
  活跃时间，以及悬停显示的 New task 和行菜单操作。普通行用 Folder
  图标；已固定行用实心 Star 图标并保留已固定文本标签。Archived 行保持
  列出并弱化，而不是隐藏。
- 展开一个非活跃项目并打开其一个会话；预期应用先激活该项目再选中
  会话，使工作区工具和会话作用域使用同一项目。
- 把排序切到 Name，预期行在每个分区内重排且不隐藏任何行；清空搜索，
  预期恢复完整索引。

### US-UI-24 Settings 全页外壳
- 打开 Settings（页脚 profile → Settings）。
- 预期**全页** Codex 设置（无应用侧栏/导航）。左栏依次有 Back to
  app、搜索，以及恰好 Basics / 全局 AI / Shortcuts / Model
  configuration / Import / Project archive / Info；内容面板显示分区
  标题和目的地的设置或归档内容。
- 返回应用外壳，预期 Plugins 仍是独立的侧栏页脚目的地。
- 在左栏或内容面板上拖动空的 46px 顶部条带；原生窗口移动，而 Back、
  搜索和导航保持可点击。

### US-UI-27 深色目的地页面
- 强制深色主题，打开 Plugins 和 Settings → Project archive。
- 预期黑色侧栏、主区 `#181818`，目的地卡片/行在浮起的深色底板上
  可读（不是平坦的同质灰）。

### US-UI-28 主页空态 Composer 关联
- 在空聊天主页（浅色 + 深色），预期主视觉、可选的入门清单和主页
  Composer 在一个可滚动的垂直流中（D111/D204/D206），没有大片空隙
  或 starter 卡片层。
- Composer 保持为独立底板，没有附加的工作区边栏。
- 开始一段转录会恢复底部停靠的 Composer，带淡入遮罩。

### US-UI-29 浅色 Composer 底板可读性
- 在浅色主题空主页，白色 Composer 外壳使用一种均匀的实色填充，没有
  内部渐变或背景图。
- 外壳仍通过细描边和克制的柔和阴影在 `#ffffff` 主界面上呈现为浮起
  的盒子。
- 工具栏控件和占位文案保持可读（不是纯白叠白）。

### US-UI-30 Composer 占位文案
- 空主页和会话 Composer 以其本地化欢迎文案开始：
  `chat.placeholderHome` / `chat.placeholder`。
- 所选指引在页面/会话上下文变化前保持不变；切换上下文后进阶为本地化
  的 `/`/`@` 命令/文件指引和键盘提示
  `Shift+Enter for newline · Use Send to submit`，带透明度淡入。
- 等待、聚焦、编辑、清空或输入法组合都不改变文案。
- 占位文字在浅色和深色浮动底板上都可读。

### US-UI-31 主页空态垂直堆叠（D111/D204/D206）
- 给定空聊天主页，当窗口约 1200×690 时，主视觉和可选入门清单渲染在
  居中的可滚动内容堆叠中，位于底部预留的主页 Composer 上方（不是
  双向生长的绝对定位 portal 区域）。
- 没有 starter 卡片或绝对定位覆盖层；入门清单保持可操作，Composer
  直接可用。

### US-UI-32 深色浮动盒 elevation
- 给定深色主题空主页，当 Composer 外壳绘制时，它在 `#181818` 上使用
  elevated-primary `#212121`，带与浅色完全一致的 elevation-prominent
  描边 + 浮起（没有更重的自定义深色阴影）。

### US-UI-33 按作用域分组的侧栏会话分组
- 主页侧栏没有 Recents 聚合。
- 它为每个保留的项目路径显示一个可独立折叠的分组头（嵌套其会话），
  并为无路径会话显示一个 `Temporary sessions` / `临时会话` 分组头。
- 项目和 Temporary 分组头暴露紧凑的作用域专属 `+` 控件；项目/会话
  溢出菜单暴露固定/归档操作；导航行行距保持 ~32px，会话行行距
  ~28–31px。

### US-UI-34 主页没有开发者起始卡片（D206）
- 在空聊天主页（浅色 + 深色）上，hero 与输入框之间不渲染任何开发者起始网格、卡片或
  上下文快捷操作行。
- 任务入口直接起始于底部输入框，而存在时可选的新手引导清单仍然可用。

### US-UI-35 空输入框面板密度
- 空主页的输入框紧凑且由内容驱动，适配空草稿或单行草稿；不再保留原先固定的
  ~148px 空面板高度。

### US-UI-36 Hero Y 轴位置 + 夜间面板浮起
- 在 ~1200×690 的浅色主页上，hero 构成一个居中块；主页滚动区域不会裁剪其顶部，
  也不会与底部输入框重叠，且不渲染起始网格。
- 深色主页输入框面板呈现为 elevated-primary `#212121f5`，在 `#181818` 上带有突出的浮起
  效果（而非同平面的扁平样式）。
- 浅色输入框渲染为一个不间断的实心表面，没有上下文栏，也没有独立的顶部浮起。
- 模型徽标显示当前激活的模型 ID；其菜单仅包含可运行的供应商/模型选项和 Agent。
- 占位文本和审批徽标在浅色和深色面板上都保持清晰可读。

### US-UI-39 主页标记 + hero 标题视觉观感
- 空主页的 PI-Desktop 标记可见（而不是几乎不可见）；描边密度保持可读，无装饰性残影效果。
- 带项目的空主页标题使用可读的项目标签 span（短基名可能显示为 `PI-Desktop` 以保持视觉一致）。

### US-UI-40 主页内容宽度 vs rem 根
- 在 1200×690 浅色空主页上，输入框面板外宽度为 ~744–760px（而非 ~640px）。
- 主页建议网格与输入框面板占据同一内容列。

### US-UI-41 深色 hero + 夜间面板可读性
- 深色空主页 hero 标题文字为深底浅色（`--ds-text-primary` / 接近白色），而非硬编码
  `#1a1c1f`。
- 夜间输入框面板为 elevated-primary `#212121f5`，置于主背景 `#181818` 上并带有突出的浮起
  效果；浅色主题不会被强制套用夜间面板填充色。

### US-UI-42 浅色分区会话创建控件
- 在浅色侧边栏上，Sessions 和 Projects 分区创建控件保持仅图标样式，带有语义化
  悬停着色；不渲染独立的 New task 行。

### US-UI-43 空主页面板 Y 轴 + 夜间 elevated-primary
- 在 ~1200×690 浅色主题下打开空主页。
- 输入框面板底部对齐且由内容驱动：空草稿或单行草稿使用紧凑外壳，而非固定的
  ~140px 最小高度；表面保持均匀实心，没有装饰性着色。
- 切换到深色主题：夜间面板为 elevated-primary（`#212121f5` / gray-800 96%），
  具有同样克制的浮起效果，无内部渐变。


### US-UI-44 设置紧凑目录 + 合并分区
- 在 ~1200×690 的浅色主题下打开设置。
- 整页外壳：导航栏 ~260px，背景 `#f3f3f3`，主区域 `#fff`；搜索胶囊位于
  导航栏顶部；Back to app 固定在导航栏底部，并在主外壳侧边栏页脚图标行上
  垂直居中；General 激活胶囊带图标。
- 导航栏顺序恰为 General / 常规、AI、Shortcuts / 快捷键、
  Instructions / 指令、Models / 模型、Skills / 技能、MCP、
  Subagents / 子智能体、Import / 导入、Projects / 项目、以及 Info / 信息；
  各行分组在浅色的 Preferences / 偏好、Agent / 智能体、
  Workspace / 工作区、System / 系统标题之下，没有分隔线、
  重复入口或占位行。所选页面保留其描述性标题，例如
  Model configuration 或 Project archive。
- General 内容：大标题和一个 **Appearance** 卡片，其中系统/浅色/深色控件可用。
  全局 AI 包含 Permissions、Defaults 以及 Command shell 行；Context management
  没有设置卡片。Shortcuts 包含 Keyboard shortcuts 卡片。
  文件打开目标、语言覆盖、菜单栏行为和底部面板行为在有宿主端实现之前
  不会出现。
- Model configuration 包含默认模型选择器、带添加/编辑对话框的独立厂商账号管理，
  以及带添加供应商对话框的卡片式 AI 服务管理。Defaults 卡片复用其他设置行的
  紧凑几何结构："Default model" 标签位于 provider - model id 行上方，
  低调的 Change 操作与当前值分开。Change 打开一个锚定到它的浮动列表框：
  卡片高度从不变化，模型级列表按供应商分组，并在配置的模型超出其有限
  高度时滚动；靠近视口底部时它会向上翻转到触发器上方，不会被设置面板
  裁剪；Escape、外部按压或将触发器滚出视口都会将其关闭，且焦点返回
  Change。
- 插件加载/启用/禁用/卸载仍可从应用外壳独立的 Extensions 入口访问；其
  Marketplace 标签页也拥有官方/镜像/自定义目录源选择器，因此设置中没有
  重复的 Extensions 入口。
- 深色：导航栏 `#000`，主区域 `#181818`，卡片浮起色 `#212121`。

### US-UI-38 输入框省略工作区上下文
- 在空主页、项目主页以及开始对话记录之后，输入框从不渲染项目 / Local /
  分支胶囊。
- 工作区身份通过主页 hero 或侧边栏保持可见，而不是在提示框上方重复显示。

### US-UI-37 空草稿行 + 自适应大小
- 空输入框提示行不显示前导品牌图标，并保留可见的占位文字颜色（不是空白
  白洞/夜洞）。
- 自动调整大小永远不会将空 textarea 收缩到 ~28px 以下。
- 禁用的发送控件在浅色主题上是实心灰色芯片（`#8e8e90`），全不透明度配白色箭头。
- 深色夜间面板保持 elevated-primary `#212121f5`，在 `#181818` 上具有可读的浮起效果。

### US-UI-31b（已被取代）
- 已被 US-UI-31 主页空态纵向堆叠（D111）取代。

### US-UI-45 缩略图出现时输入框宽度保持稳定
- 打开空主页并记录输入框面板宽度。打开一个适合一个视口的短对话记录，
  然后增长它直到左边缘的对话缩略图出现。
- 空主页和停靠输入框面板使用相同的水平边距和最大内容宽度。它们的外壳、
  textarea、占位文本对齐、工具栏内边距、最小输入高度、主题填充和阴影在
  视觉上完全一致；只有父级位置和局部欢迎文案不同。缩略图保持在对话记录
  左边缘的流外位置，不会挤压或调整输入框大小。
- 当对话记录内容首次溢出时，两侧已经预留了原生滚动条槽位，因此对话记录和
  输入框保持同一水平中心，而不是向左跳动。

### US-UI-46 带项目的主页输入框外观
- 在空主页（无对话记录）上打开一个项目。
- 预期没有附加到面板上的工作区控件；没有遗留的草稿标记，占位文本使用
  PI-Desktop 文案。
- 模型徽标显示激活的模型 ID；页脚使用圆形本地用户图标、两行
  Custom / Local 身份资料、展开箭头，以及独立的 Help → Settings Info 控件。

### US-UI-47 Projects 索引对齐
- 打开 Settings → Project archive。
- 预期出现设置分区标题、搜索胶囊、Add project 按钮，以及包含归档行的完整
  持久化项目列表。
- 行可展开显示最近任务；激活项目或其任一会话使用 `setProject` 而不通过
  对话框重新选择，并保持会话/工作区上下文同步。侧边栏的置顶、归档和关闭
  元数据保留在渲染器本地；只有行菜单中显式的 Delete project 操作才会移除
  一个持久化的 Project-archive 行，并且会连带移除该项目的会话（ADR 0251）。


### US-UI-48 主页起始图标和标签不存在（D206）
- 在空主页上，浅色或深色主题均不渲染任何开发者起始图标面板、标题/描述
  或起始卡片图标。
- hero、可选新手引导清单和底部输入框仍然是仅有的空主页任务入口界面。


### US-UI-49 分区侧边栏行外观
- 悬停或选中一个项目或临时会话行。
- 预期出现克制的标题行，带有激活/悬停背景和紧凑的置顶/归档溢出操作
  （而不是 Recents 聚合）。
- 多个保留的项目分组可以同时可见；会话保留在精确路径分组下，而已关闭
  项目的会话仍可在 Settings → Project archive 中找到。


### US-UI-50 目标页标题字号
- 打开 Settings → Project archive 和 Plugins。
- 预期出现与 Codex 目标/索引页一致的大号分区标题（~28px）。
- 深色主页的分区会话创建控件保持低调的图标操作，没有独立的 New task 行。

### US-UI-52 设置金色外观指标（D070）
- 在 ~1200×690 下打开设置浅色 Basics。
- 预期 ~275px `#f4f4f4` 导航栏，单个激活的 Basics 胶囊，Back + 搜索。
- 预期主题选择器可用，无惰性开关或打开目标行。
- 预期出现 Permissions + Basics + Appearance 浮起卡片；Agent、
  Import 和 Info 是仅有的其他入口。
- 在 1040px、1200px 和 1600px 宽度之间调整大小；内容卡片在每种尺寸下填满
  可用的右侧面板，不改变导航栏，也不引入水平滚动。

### US-UI-53 设置深色外壳（D070）
- 深色主题设置 Basics：黑色导航栏、浮起卡片、蓝色开启开关，Back 返回聊天。
- 行描述使用主题感知的次要文字颜色，并在 `#212121` 卡片表面上保持清晰可读；
  不得退化为低对比度的浅色文字。

### US-UI-54 Toast 变体 + 生命周期（D085）
- 触发一个成功 toast（保存供应商）、一个错误 toast（使用无效密钥运行）
  和一个来自测试插件的信息 toast。
- 预期在浮起面板上出现顶部居中的堆栈，带有着色变体图标（绿色 ✓ / 红色 ! /
  信息）和每张卡片的 X 关闭按钮；最新的从顶部居中锚点进入，把较旧的卡片向下推。
- 成功/信息 toast 约 4 秒自动消失，错误约 8 秒；悬停卡片暂停其倒计时；
  X 立即将其移除。
- 当堆栈与无边框标题栏区域重叠时，悬停仍然暂停倒计时，且每个 X 保持可点击，
  而不是拖动窗口。
- 重复同一操作会重启现有 toast 而不是堆叠重复项；堆栈永不超过 4 个。
- Toast 消息文本可选中：在卡片上拖动只高亮其消息文本，且 `Cmd/Ctrl+C` 复制它，
  而卡片图标及其 X 关闭控件不提供选中。
- 捕获场景 `pi-toasts-light` / `pi-toasts-dark` 展示两种主题下的堆栈。

### US-UI-55 输入框 textarea 增长（D089）
- 在主页和对话停靠输入框中，空草稿或单行草稿显示一行可见文本。
- 输入或粘贴两到七个可视行；textarea 随换行内容增长，无需手动调整大小。
- 添加第八个可视行；textarea 保持在七个可见行并内部滚动，而不是进一步
  增大输入框。
- 删除回一行或提交草稿；textarea 收缩回单行默认值。
- 在打开大型工作区并过滤 `@` 文件菜单时，持续输入文本；光标跟得上打字，
  没有可见卡顿，菜单行顺序不变。增长到七行、超过第七行后内部滚动，以及
  删除或提交时收缩的行为如上所述（D264）。

### US-UI-56 Codex 对话记录工具活动
- 在浅色和深色主题中，工具调用使用透明的紧凑活动行，而不是浮起卡片或
  彩色成功侧边条。
- 历史上的连续调用出现在默认折叠的处理分组内。在实时回合期间，最新分组
  自动打开，使其过程列表可见，但工具调用详情保持折叠。最新的思考步骤
  自动打开；回合结束时，只有该自动思考展开会关闭。用户触碰过的分组或行
  保持其选定状态。
- 其活动头部显示 `Processing · {elapsed}` 和本地化的当前操作/阶段胶囊，
  例如 `Editing`、`Thinking` 或 `Waiting for model`；完成后的头部显示
  `Processed for {elapsed}`，外加本地化的步骤计数。
- 行显示语义化 15–16px 图标、进行时/过去时操作、省略号截断的等宽参数提示、
  低调的展开箭头，以及本地化的运行中/错误/被拒绝状态。
- Fork 家族工具显示 GitFork 分支图标，而不是通用工具图标。
- 展开已完成的调用时，输出显示在输入之前。两个区块都可以独立复制，
  且有内部滚动的高度上限。
- 重新加载会话后保留操作标签和参数提示，而不是退化为通用的 `Tool`。
- 运行一个回合，使其产生助手文本、调用多个工具，然后继续输出更多助手文本。
  在流式期间和会话重新加载后，预期整个用户回合只有一个助手 article，
  片段和活动按原始顺序排列，但只有一个尾随的模型/用量行和一组
  Copy/Fork/Retry 工具栏。Copy 按顺序包含所有助手文本片段。

### US-UI-57 多项目侧边栏分组
- 打开项目 A 和 B，两者都不关闭。
- 预期 `Projects` 上方有一个 `Sessions` 标题，包含无路径会话以及新会话和
  排序操作。独立会话超过五个时，预期出现一个五行高、可滚动查看所有剩余
  行但不再继续增高的列表。
- 右键点击 `Sessions` 标题或空白独立列表区域，预期出现一个单项目创建菜单，
  用于创建/复用无路径临时会话。
- 预期随后的 `Projects` 标题保留其新建项目文件夹操作，每个保留项目一个
  路径键控分组，且恰好一个分组上带有激活状态标记。其列表消耗剩余高度
  并独立滚动。相邻项目分组呈现为紧凑连续的树，没有分离的卡片间距。
- 右键点击 `Projects` 标题或空白项目列表区域，预期出现一个单项目创建菜单，
  打开与 folder-plus 操作相同的项目选择器。
- 预期项目和会话列表在侧边栏主体内滚动，不会被页脚遮挡；侧边栏 Collapse
  保留在侧边栏头部。当工作面板打开时，预期其唯一的折叠控件是固定在窗口
  右上角的切换按钮，而不是工作面板内容头部中的箭头。
- 点击 A 的目录标签将其折叠，从箭头区域将其展开，然后激活 B 再返回 A。
  只有 A 的子行折叠；项目 `+` 和溢出操作不会切换它；激活项目、顶栏路径
  和对话记录一起切换；输入框保持不含工作区身份外观。
- 关闭 B，再从 Settings → Project archive 重新打开它。关闭只移除侧边栏
  标签页；持久化项目/会话行仍然可用。

### US-UI-58 侧边栏整理操作
- 打开一个项目和一个会话溢出菜单。
- 预期出现本地化的 Pin/Unpin、Archive/Restore 以及（对会话）Delete 操作，
  并支持键盘可达的菜单语义。
- 从独立的 `Sessions` 标题打开排序菜单，置顶一个项目/会话，并逐一选择
  面向用户的排序模式（Recently updated、Created date、Oldest first、Name）。
  置顶项目保持在 Projects 最前；置顶会话在 Sessions 和 Projects 上方的
  全局 Pinned 分区中出现一次，遵循所选会话排序且无日期标题。
- 归档一行，确认其默认不可见，启用 Show archived，再将其恢复。对话记录
  和项目绑定保持不变。
- 遗留的 `manual` 偏好加载时不提供拖拽重排的操作入口。

### E2E-SIDEBAR-global-pinned-conversations

- 准备数据：项目 A 中一个旧的置顶会话、一个今天的未置顶会话和另外十一个
  普通行，折叠项目 B 中一个置顶会话，已关闭项目 C 中一个置顶会话，以及一个
  置顶的 Temporary 会话。
- 预期在 Sessions 和 Projects 上方出现一个 Pinned 分区，包含全部四个置顶项
  及其项目名称或 Temporary 空间标签。置顶项没有日期标题，也不会在普通历史
  中第二次出现。A 最初仍显示十个普通行，其余行在 Load more 之后。
- 跨午夜变更日期并逐一选择会话排序。置顶项保持在历史上方；排序只改变
  其内部顺序。选择 B 或 C 的置顶项会激活其原会话和项目；选择 Temporary
  置顶项会清除工作区上下文。运行中和未读状态保持可见。
- 通过键盘菜单置顶和取消置顶。行立即移动，焦点跟随其溢出控件；如果该行
  现在被折叠或属于已关闭项目，焦点返回到 Sessions 排序控件。取消最后一个
  置顶项后，预期不会出现空的 Pinned 分区。
- 归档一个置顶项和一个置顶会话所在的项目。两者默认都消失；
  Show archived 会显示它们，Restore 保留置顶状态。删除一个置顶会话，
  预期不会留下残留行。重新加载后，预期保存的置顶项会恢复。
- 置顶项多到溢出时，在 Pinned 内滚动，确认在最小支持窗口尺寸下，
  浅色/深色主题中 Sessions、Projects 和页脚仍然可达。现有悬停卡片、
  上下文菜单、拖放和项目置顶保持其正常行为。

### E2E-PROJECT-delete-removes-project-and-owned-sessions

- **前置条件**：三个持久化项目 A、B 和 C，每个至少有一个带对话记录的会话；
  A 已归档并保留为侧边栏标签页；B 是当前激活工作区；C 是一个已存储的
  双文件夹项目分组的根。
- **步骤**：打开 Settings → Project archive，打开 A 的行菜单，选择 Delete
  project，并在对话框中确认。然后在 B 为当前激活工作区时，从侧边栏项目菜单
  对 B 重复相同操作：第一次点击使该项进入待确认状态，只有第二次点击才会
  移除 B。然后对 C 尝试相同操作，再对一个宿主端已不存在的路径尝试，
  最后在第四个项目 D 的某个任务仍在运行时对 D 尝试。
- **预期**：对话框注明项目名称，说明该项目及其会话连同对话记录将被永久移除，
  且磁盘上的文件夹不会被删除；确认之前不删除任何内容，处于待确认状态的
  菜单项若不再操作会自行解除待确认且不删除任何内容。
  确认后，持久化项目行、该项目的会话、其对话记录、scratch 和 review 文件
  以及其持久化项目记忆都会被删除，而磁盘上的文件夹保持不动。被删除的项目
  立即从 Settings → Project archive 和侧边栏消失，重新加载后也不出现：
  没有保留的标签页、最近项目条目、会话派生行，也没有残留的置顶、归档
  或顺序偏好。其他每个项目的会话和对话记录都不受影响。当被删除的项目是
  当前激活工作区时，工作区回退到另一个已打开项目或 Temporary，且下次启动
  不会重新打开被删除的路径。文件夹在磁盘上已被移动或删除的项目仍可移除。
  删除 C 会被拒绝并给出消息，分组保持不变；宿主端没有持久化行的路径仍会
  从归档和侧边栏中移除，且不报缺失项目错误。在任务运行时删除 D 会打开
  确认对话框，而不是一条随 toast 消失的警告；对话框注明正在运行的会话，
  其确认按钮文案表示将停止它们，取消则不删除任何内容，确认会先精确停止
  这些回合，然后删除 D（参见
  E2E-PROJECT-delete-running-sessions-are-named-and-stopped）。
- **关联规范**：`03-runtime/06-host-rpc-protocol.md` §Projects、
  `03-runtime/04-data-storage.md`、`04-ux/08-component-spec.md` §3.9、ADR 0251
- **验收标准**：D（工作区）、F（持久化）、Quality
- **里程碑**：M6+
- **状态**：部分自动化 —— `pnpm test:e2e` 覆盖宿主契约
  （项目行、所属会话、磁盘上的对话记录和 scratch、项目记忆、与其他项目的
  隔离、运行中任务拒绝、分组根拒绝以及幂等的未知路径），
  `pnpm test:e2e:boot` 通过沙箱化 preload 往返 `pi-desktop/project/remove`；
  Settings 归档 → 对话框 → 侧边栏旅程仍为 Draft

### E2E-PROJECT-delete-running-sessions-are-named-and-stopped

- **前置条件**：一个持久化项目 D，其一个会话的回合仍在流式输出，且可从
  侧边栏项目菜单和 Settings → Project archive 两处访问。
- **步骤**：从每个入口打开 D 的行菜单，在不停止回合的情况下选择 Delete
  project。预期出现带有运行中会话行和"停止并删除"确认标签的确认对话框；
  按 Cancel，预期没有任何变化。再次打开对话框并确认。
- **预期**：菜单从不用裸警告替代对话框，因此在任务运行时该操作保持可达。
  对话框始终注明项目、其会话数量以及不会被触碰的文件夹；回合进行中时
  还会注明仍有多少会话在运行，其确认按钮文案表示将停止它们，且该行仅在
  渲染时加入对话框的 `aria-describedby`。取消不删除任何内容，回合继续
  流式输出。确认会先精确停止列出的会话，然后才移除项目、其会话、其对话
  记录及其持久化记忆，保留磁盘上的文件夹。在对话框打开与确认之间开始的
  回合仍会被宿主端拒绝，对话框以 `project.deleteRunningBlocked` 报告该
  拒绝且不删除任何内容。
- **关联规范**：`03-runtime/06-host-rpc-protocol.md` §Projects、
  `04-ux/08-component-spec.md` §3.9、ADR 0251、D421、D431
- **验收标准**：D（工作区）、Quality
- **里程碑**：M6+
- **状态**：部分自动化 —— `apps/desktop/test/project-delete.test.mjs`
  固定了两个菜单都能带着项目实时运行中的会话 id 到达对话框、对话框的
  运行中会话行和"停止并删除"标签、在 `deleteProject` 之前运行的中止循环、
  `CONFLICT` 回退，以及每个已发布目录中的新文案；端到端旅程仍为 Draft

### E2E-SESSION-two-click-delete-arms-first

- **前置条件**：一个项目包含一个空闲会话和一个运行中会话，两者都可从
  侧边栏会话菜单、侧边栏项目菜单和 Projects 索引访问。
- **步骤**：打开空闲会话的会话菜单，按一次 Delete，让该项保持待确认状态
  直到待确认过期，然后再按一次以确认移除。对项目行分别从侧边栏菜单和
  Projects 索引重复此操作。
- **预期**：第一次按下不删除任何内容，仅将该项重新标记为
  `nav.deleteTaskConfirm` / `project.deleteMenuConfirm`（"Delete?" / "确认删除？"）
  并设置 `data-armed="true"`；菜单保持打开，外部按压、Escape 或过期会
  解除待确认且不删除任何内容。只有第二次按下才会移除会话及其对话记录和
  行；只有对项目行的第二次按下才会移除空闲项目。会话和项目永不共享同一
  待确认状态。删除回合正在进行中的项目仍会打开注明这些会话并停止它们的
  对话框（参见
  E2E-PROJECT-delete-running-sessions-are-named-and-stopped）。
- **关联规范**：`04-ux/09-interaction-patterns.md` §1.6、D421、D431、D441
- **验收标准**：Quality
- **里程碑**：M6+
- **状态**：部分自动化 —— `apps/desktop/test/two-step-delete.test.mjs`
  固定了共享的待确认状态及其过期、每个已发布目录中的两种标签，以及
  第一次按下仅进入待确认状态；端到端旅程仍为 Draft
### US-UI-59 会话根定的后台工具
- 在项目 A 中开始一个可见回合，在其运行时切换到项目 B，并检查两个
  侧边栏状态指示器。
- 预期 A 的回合在后台继续，B 的输入框/上下文只显示 B，A 的工具输出/产物
  保持根定于 A，不会在 B 上打开或激活工作面板标签页。
- 打开一个 Temporary 会话并调用需要工作区的工具；预期得到正常的
  `WORKSPACE_REQUIRED` 结果，而不是从 B 继承工作区。


### US-UI-60 WorkBuddy 对话记录面板（D101）
- 在浅色和深色主题中打开一个混合对话记录。
- 预期出现右对齐的紧凑用户面板、透明的全宽助手正文、更密的行距，以及
  每个回合下方仅悬停可见的复制芯片。
- 助手回答流式输出时，预期与已完成回合相同的透明全宽正文——没有左侧
  边条，也没有整回合磁贴。磁贴只属于子智能体/委派卡片（D319、D323）。


### US-UI-60b 助手 markdown 正文重设计
- 打开一个包含标题、表格、代码围栏、引用块和任务列表的助手回答。
- 预期在两种主题中呈现改进后的 `.prose-chat` 层级和内嵌代码外观。
- 展开思考 markdown，确认其在视觉上保持从属于回答。


### US-UI-60c 紧凑助手错误卡片
- 在浅色和深色主题的对话记录中触发一个可重试的供应商/模型故障。
- 预期助手错误使用克制的内联表面，带细的错误侧边条。本地化摘要、稳定
  错误码和详情展开共享一个紧凑头部；卡片不渲染第二个底部操作行。
- 确认详情在首次渲染时保持展开，保留已脱敏的供应商响应和供应商/模型 ID，
  并暴露一个带无障碍标签/工具提示的仅图标复制控件。在窄窗口中，头部
  操作换行而不产生水平溢出。
- 预期紧凑助手错误卡片本身在详情展开旁暴露一个本地化的 **Continue** 操作。
  点击它，预期应用将本地化的继续提示（`Continue the current task` / `继续当前任务`）
  追加到同一会话并开始下一回合，且不截断失败的回合。
- 对于终止性的 `PROVIDER_RATE_LIMITED`（包括 HTTP 429），预期结构化助手
  错误卡片仍是唯一的故障界面：它恰好暴露一个本地化的 **Continue** 操作，
  不提供 **Regenerate** 操作，且省略通用的 TurnOutcomeCard。
- 点击 **Continue**，预期应用将本地化的继续提示（`Continue the user's unfinished task.` /
  `继续用户未完成的任务`）追加到同一会话并开始下一回合，且不截断失败的回合。

### US-UI-61 助手上下文摘要 + 重试（D103、D184、D244、D347）
- 完成一个报告用量的助手回合。
- 预期回答下方出现模型徽标，输入框工具栏中出现紧凑的 Context 检查器，
  位于模型选择器左侧。触发器显示剩余容量环和百分比；点击它（或从键盘
  激活）显示剩余 token 加百分比、已用/窗口计数、两个无框的回合/速度值、
  一行内联的精确供应商用量摘要，以及一行聚合的工具用量摘要（含类型、
  调用次数和近似 token）。不显示每工具行、条形图、徽标、解释性估算
  文案和内部区块分隔线。
- 悬停触发器不改变任何状态；打开的面板在第二次激活、外部点击或
  Escape 时关闭。
- 面板打开时滚动或调整大小；预期 body 级覆盖层翻转、收敛并保持完全可见，
  而不是被输入框或对话记录裁剪。
- 悬停操作行并点击 Retry；最近的前一个用户提示被重新发送。


### US-UI-62 原位重新生成（D105）
- 在多回合对话记录上重新生成一个较早的助手回答。
- 预期后续回合消失，所选用户提示原位重新运行，不会堆叠提示的第二份副本。


### US-UI-63 重新生成历史分页器（D109）
- 将同一个助手回答重新生成两次。
- 每次重试后，悬停或聚焦根用户气泡，预期其操作工具栏暴露 `1/N` 分页器，
  用于恢复较早的变体。


### US-UI-64 空主页无输入框重叠（D111/D204/D206）
- 在 ~1200×690 和更矮的高度（~900×640）打开空主页。
- 预期 hero 和可选新手引导清单位于可滚动内容区域，主页输入框在底部
  可见地预留位置，且没有起始卡片。
- 矮窗口滚动内容区域，而不是把输入框叠在引导清单上；引导清单不存在时，
  不留空白占位。


### US-UI-65 持久化通知收件箱（D117/D130）
- 验证聚焦中的当前会话完成时收件箱不变，然后通过后台/未聚焦的已完成和
  失败任务行填充收件箱，包括一个长会话标题。在默认和窄支持宽度下、浅色/
  深色主题中检查展开的侧边栏页脚和弹出层。
- 预期标题栏没有铃铛，原 Help 位置有一个稳定的 32px 页脚铃铛，
  不重叠的 `1`–`99` / `99+` 徽标，
  360px 或更窄的紧凑列表，本地化的类型/会话/时间/错误内容，以及
  文字/图标/未读点的明确语义，没有嵌套卡片或被裁剪的文本。
- 切换 All/Unread；使用 Tab、方向键、Home/End、Enter/Space、Escape 和
  外部点击。焦点顺序保持可预测，行激活打开正确的会话，Escape 将焦点
  恢复到铃铛。
- Mark all read 和 Clear 暴露图标工具提示/无障碍名称，禁用和空状态
  保持可理解，减弱动效模式使弹出层即时变化，而不抑制焦点或未读状态。

### US-UI-66 应用更新通知布局
- 在停靠输入框可见的会话中，于浅色和深色主题、默认和最小支持窗口尺寸下
  演练手动 `available`、应用内 `downloading` 和 `downloaded` 更新夹具。
  将输入框草稿增长到最大可见高度。
- 预期在主面板右上角安全区、标题栏下方出现一条紧凑的更新通知。它从不
  与输入框相交（包括草稿增长期间），也不遮挡已打开的工作面板。
- 预期有稳定的更新图标/标题/消息层级、`downloading` 的确定性进度条、
  适用的 View release 或 Restart to update 操作，以及一个带无障碍名称的
  24px 关闭控件。关闭一个状态阶段不会抑制同一版本的后续阶段。
- 当夹具包含 `releaseNotes` 时，预期在横幅和 Settings → Info Updates 行的
  状态消息下方出现 "What's new" 区块，使用产品 UI 语言（EN 或 zh-CN）。
  无 notes 的夹具省略该区块。切换语言会重新解析同一版本的 notes，
  无需新的检查。

### US-UI-67 可区分的侧边栏任务状态指示器（D135）
- 在浅色和深色主题中，保持会话 B 选中，同时会话 A 依次经历进行中、
  已完成、新的进行中回合、失败和中止状态。在启用减弱动效时重复，
  并检查键盘焦点。
- 预期 A 在进行中显示橙色呼吸圆点，完成时显示绿色对勾，失败时显示红色
  圆圈警示。开始新回合会清除 A 之前的终态标记；中止不留下已完成或
  失败标记。
- 预期选中的空闲 B 显示静态的强调蓝色描边圆环和激活行背景。如果选中的
  B 开始工作，其橙色进行中圆点优先显示，直到回合结束；其最新终态结果
  在选中期间隐藏在选中圆环之后。
- 每个指示器通过其无障碍名称和工具提示暴露本地化的 In progress /
  Selected / Completed / Failed 文本。减弱动效使橙色圆点变为静态，
  不改变其颜色或含义。行高、标题截断、置顶图标、悬停操作和焦点环
  在两种主题中保持稳定。
- 打开一个带已完成或失败标记的会话，预期该终态标记立即清除，同时其
  持久化任务通知变为已读。刷新通知并重启应用；已确认的标记不得复现。
  从收件箱标记为已读的终态通知同样不产生侧边栏终态标记。

### US-UI-68 会话作用域内联权限和产物（D138/D142）
- 并发运行两个会话，保持 A 可见，同时 B 到达工具审批请求。在默认和窄
  宽度下检查浅色/深色主题。
- 预期 A 中不出现遮罩、模态框、页面/会话切换、工作面板隐藏、对话记录
  替换或输入框焦点变化。B 保留其待处理状态。
- 显式打开 B，预期在 B 的最新活动之后出现一个内联权限卡片，带有可读的
  风险、参数、工作区、倒计时和可换行的操作控件。切走再切回保留绝对
  截止时间。
- 让 A 和 B 同时待处理，分别独立解决，确认任一操作都不会移除或改变
  另一张卡片。
- 解决 A 的 Write/Edit 权限并在完成前切换到 B。预期 B 中没有瞬态 Review
  面板，也没有面板/窗口闪烁；返回 A 时恢复 A 先前的面板选择，其对话记录
  中带有内联 review 卡片——编辑没有打开标签页——同时 B 的标签页和
  Browser 资源保持不变。

### US-UI-69 侧边栏字体平衡（D144/D161）
- 在默认和最小支持宽度下，浅色和深色主题中打开展开的侧边栏，至少有一个
  会话、一个项目分组和本地资料页脚可见。
- 预期 Plugins、页脚资料名称和资料菜单操作以正文外观字号渲染
  （`--text-base` / 14px）。
- 预期会话/对话标题、项目/分组标题和空状态文案为 `--text-md` / 13px，
  大写分区标签（`SESSIONS` / `PROJECTS`）为 `--text-sm` / 12px——主要
  列表内容永不低于 `--text-md`。
- 确认行距保持紧凑（≈28–32px），标题仍然干净截断，折叠的图标栏控件
  保持清晰可读且外壳不重排。

### US-UI-70 在可编辑字段上禁用文本纠正（D145）
- 在浅色和深色中打开空主页、停靠对话记录、Settings 搜索、Plugins 市场
  搜索、Projects 归档搜索、全局搜索（现在包含命令）、供应商模型组合框、
  消息编辑 textarea 和工作面板浏览器 URL 栏。
- 预期每个文本 `input`/`textarea` 暴露 `spellcheck="false"`（React
  `spellCheck={false}`）以及 `autocorrect="off"` 和 `autocapitalize="off"`。
- 预期输入代码风格的 token、路径、模型 id 或 URL 时没有红色拼写下划线；
  复选框和非文本控件保持不变。

### US-UI-71 输入框运行时芯片的下伸字符（D150）
- 打开空主页和一个停靠对话，使用包含下伸字符的模型 ID
  （例如 `gpt`、`gemini`，或任何含 `g`/`y`/`p`/`q`/`j` 的 id）。
- 在浅色和深色中检查 Agent/Plan/Goal、Thinking（存在时）、权限模式和
  模型芯片。
- 预期每个芯片标签显示完整字形墨水——`g`/`y`/`p` 的底部不被 28px 胶囊
  裁剪——而长模型 ID 仍在水平方向省略号截断。
- **关联规范**：`04-ux/07-ui-design-system.md` §8.2、`04-ux/08-component-spec.md` §11.5、decisions-log D150
- **里程碑**：M5
- **状态**：部分自动化（渲染器源码测试：芯片行高 + 无 leading-none）

### US-UI-72 受 Apple 启发的全局圆角层级（D210）
- 在默认支持的桌面尺寸下，浅色和深色主题中打开空主页、已填充的对话记录、
  Settings、Plugins、Project archive、一个菜单和一个对话框。
- 预期固定圆角遵循全局 4/6/8/10/12/14/16/18/20/24px 阶梯，
  视觉上更大或更浮起的表面获得更大的半径。
- 标准紧凑和中等按钮及字段保持圆角矩形，而非胶囊形。胶囊、分段选择、
  状态标签、进度轨道、开关、等宽圆形图标控件和圆点保留其明确的
  胶囊或圆形形状。
- 当圆角子元素贴着圆角父元素角落时，预期半径与中间的内边距呈同心关系。
  全宽侧边栏、标题栏和工作面板边缘保持直角，而不是变成浮动卡片。
- 调整到最小支持窗口并检查靠近各边缘的菜单/对话框。圆角表面不得裁剪
  文本、焦点环、操作或可滚动内容。
- **关联规范**：`04-ux/07-ui-design-system.md` §6.2、ADR 0071
- **里程碑**：M5
- **状态**：部分自动化（半径令牌和共享控件源码测试）

### US-UI-73 输入框模式选择器宽度稳定
- 在英文和 zh-CN 中打开空主页和一个停靠对话。
- 多次切换输入框模式芯片 Agent/Plan/Goal。
- 预期模式芯片保持一个按最长内置标签定宽的固定宽度（英文 "Agent" /
  zh-CN "智能体"）；相邻的 Thinking 和权限控件、发送按钮和输入框外壳
  不移动也不调整大小。
- 在 Goal 中，预期权限芯片以相同几何保持可见，显示 Full auto / 全自动，
  并保持禁用且不打开权限菜单。Plan/Goal 审批卡片仍是独立的
  执行策略控件。
- **关联规范**：`04-ux/08-component-spec.md` §11.3
- **里程碑**：M5
- **状态**：部分自动化（渲染器样式/源码契约）

### US-UI-74 macOS 原生侧边栏 vibrancy
- 在 macOS 上分别以浅色和深色外观打开桌面应用，侧边栏展开，然后演练
  现有的折叠/展开路径。
- 预期主窗口使用原生 `sidebar` vibrancy，在 `.sidebar` 和任何渲染的
  `.sidebar-rail` 后面带一层薄的主题着色：材质跟随应用主题
  （`nativeTheme.themeSource`），深色外壳保持在深色底板上，浅色外壳保持
  在浅色底板上。桌面内容透过材质仍可感知，表面带有从上到下的光泽，
  而非扁平填充。停靠栏没有接缝或细线——玻璃与不透明主面板平齐相接，
  两个面板之间没有硬性分隔线。切换语言或其他非主题设置不会重建玻璃。
  禁用或卸载所选插件主题会将原生外观恢复到 `system`。
- 预期 `.main-pane`、`.main-titlebar` 和 `.conversation-topbar` 保持实心
  主题表面，没有整窗透明或强烈的人工模糊/卡片处理。侧边栏折叠/展开、
  调整大小、红绿灯按钮位置和可拖/不可拖命中区域保持不变。
- **关联规范**：`04-ux/08-component-spec.md` §1.7、§3.4；decisions-log D304 / D348
- **里程碑**：M6
- **状态**：部分自动化（`macos-sidebar-vibrancy.test.mjs` 源码契约）；原生视觉验证为 Draft

### US-UI-75 浅色消息编辑面板
- 在浅色和深色主题中打开一个已填充的对话记录，并在用户提示上选择 Edit。
- 预期内联编辑器是一个 `--ds-composer-radius` 圆角的 `--ds-tile-deep` 面板，
  没有外阴影和细描边。在浅色主题上，8% 墨色覆盖必须与 `#ffffff` 聊天
  表面明显区分；输入框光晕不得出现，也不得在面板边缘被裁剪。页脚中的
  Retry 和 Cancel 保持清晰可读。
- 聚焦 textarea 会在面板内部绘制一个内嵌 2px 强调色环；
  Escape 或 Cancel 恢复气泡。

#### E2E-123：asktool 收集多个答案并返回跳过的占位符

- **前置条件**：Agent、Plan 或 Goal 模式；已配置供应商；一个带活动对话
  记录的会话。
- **步骤**：1）让代理调用 `asktool`，包含一个单选问题、一个多选问题，
  各带一个选项列表。2）确认每张卡片显示固定的自定义输入选项。3）回答
  第一个问题，点击 Next，在多选问题上选择两个答案。4）不输入文本就跳过
  最后一个问题。5）检查已完成的工具行和下一个模型响应。
- **预期**：一次只显示一个问题；小指示器在输入框审批区域（与 Plan 和
  Goal 审批使用同一停靠位置）显示已回答、当前和已跳过状态。请求没有
  倒计时。问题文本和选项以紧凑卡片正文字号渲染（`--text-md`，比周围
  聊天正文低一级），与同一停靠区域中的权限卡片尺度一致。卡片外壳使用
  细侧边条（2px 强调色，14px × 16px 内边距）。选项行和操作按钮使用应用
  的紧凑控件密度（30px 行、15px 标记、8px 行间距、紧凑按钮），卡片保持
  宽松的内部节奏（12/14px 指示器边距、`--leading-normal` 问题行高）。
  问题的选项列表限定在可用视口高度内；当夹具包含足够多的选项而溢出时，
  只有该列表滚动，问题头部、自定义答案输入和 Skip / Next / Submit 操作
  保持可达。滚动列表不会移动会话页面或隐藏操作行。工具输出按
  `question：answer` 排序，多个答案之间用 `、`，问题之间用 `\n---\n`，
  跳过的问题保留 `question：`。全部拒绝会为每个问题产生空占位符，
  并且仍然完成工具调用。
- **关联规范**：`03-runtime/17-asktool-questions.md`、
  `04-ux/11-asktool-question-card.md`、ADR 0077
- **验收**：E（交互式工具输出）、C（内联卡片）
- **里程碑**：M5
- **状态**：Draft（单测覆盖已启用；桌面旅程待办）

#### E2E-124：窗口控件最小化到任务栏并关闭到所选目标

- **前置条件**：在 macOS、Windows 和 Linux 上构建的桌面应用；英文和
  zh-CN 语言环境可用；一个正常的主窗口已打开。
- **步骤**：1）在 Windows 上，保持聚焦的主窗口可见并点击其任务栏按钮；
  确认它最小化且 PI-Desktop 任务栏条目保留。再次点击同一任务栏按钮，
  确认窗口恢复并聚焦。用另一个应用遮挡该窗口，点击 PI-Desktop 任务栏
  条目，确认它回到前台且不进入托盘。2）在
- macOS 上，点击红绿灯最小化控件，确认它将窗口隐藏到托盘。在
  Windows/Linux 上，使用渲染器最小化控件，确认原生任务栏条目仍然可用；
  再次点击它，确认同一窗口恢复并聚焦。3）选择 Close to tray 并关闭
  Windows/Linux 窗口；确认它离开任务栏并可由托盘图标恢复。选择 Quit
  并重复；确认进程退出。
  4）打开托盘菜单并选择 Show，然后用 Quit 重复。5）在 zh-CN 中重复，
  并在窗口隐藏到托盘时调用 macOS 应用激活。
- **预期**：Windows 原生任务栏切换和 Windows/Linux 渲染器最小化控件
  保留任务栏条目，并通过原生最小化/恢复往返；点击被遮挡窗口的任务栏
  条目会将其带到前台。Close to tray 是唯一隐藏窗口的 Windows/Linux 关闭
  路径，而 Quit 直接退出。在 macOS 上，菜单栏图标是一个可读的透明单色
  PI 标记，没有圆角应用磁贴，原生最小化保持驻留托盘。Show/单击/双击/
  应用激活会恢复现有窗口；本地化菜单包含 Show PI-Desktop 和 Quit
  PI-Desktop。Quit 运行正常关闭序列，不留下孤立的宿主、sidecar 或托盘
  进程。
- **关联规范**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/07-process-model.md`、
  `04-ux/08-component-spec.md`、`04-ux/09-interaction-patterns.md`、
  `08-meta/decisions-log.md`（D216、D230、D252、D256）、ADR 0078、ADR 0090、
  ADR 0117、ADR 0123
- **验收**：A（应用生命周期）、Quality
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖；原生跨平台托盘旅程为
  Draft（仅在此界面变更时于具备能力的环境中运行）

#### E2E-150：二次启动时浮现正在运行的应用而不是启动新实例

- **前置条件**：在 macOS、Windows 和 Linux 上构建的桌面应用，使用默认
  数据目录安装；已有一个实例在运行，其侧边栏中至少有一个会话。
- **步骤**：1）从平台常规入口再次启动应用（开始菜单/桌面快捷方式、
  `.AppImage`、macOS 上的 `open -n`），观察窗口和进程列表。2）将窗口
  最小化到托盘，然后再次启动。3）在关闭行为为 `tray` 的 Windows/Linux
  上，关闭窗口，然后再次启动。4）应用运行时，启动一个设置了
  `PI_DESKTOP_DATA_DIR` 指向空目录的构建。5）退出应用，确认没有进程
  残留，然后再启动一次。
- **预期**：步骤 1–3 从不创建第二个窗口、托盘图标、host-core、
  agent sidecar 或日志文件：现有窗口被恢复并聚焦，重复进程退出，
  运行实例的会话列表、进行中的回合和 `pi.sqlite` 都不受影响。步骤 4
  作为独立实例针对其自己的数据目录正常启动。步骤 5 启动一个干净的单
  实例，证明锁在退出时被释放，不会留下陈旧的阻塞。
- **关联规范**：`03-runtime/07-process-model.md`、
  `08-meta/decisions-log.md`（D236、D002）、ADR 0094
- **验收**：A（应用生命周期）、Quality
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖；原生跨平台重启旅程为
  Draft（仅在此界面变更时于具备能力的环境中运行）

#### E2E-125：单语言中文 VitePress 文档保持可用

- **前置条件**：文档依赖已安装，VitePress 预览服务器正在从仓库运行。
- **步骤**：1）在 1440×900 打开 `/`，验证中文落地页、系统地图、
  按意图阅读旅程、参考书架、全局搜索和 Guide/Specs/ADRs 导航。
  2）打开 `/spec/03-runtime/01-ipc-protocol`，验证正文为中文、代码
  标识符保持英文原文。3）搜索并打开一个匹配结果。4）在 390×844
  的浅色和深色模式下重复首页和一个长表格密集规范页。
- **预期**：落地页与所有规范页无断链或页面级水平溢出。落地页和
  阅读列在其可用布局中视觉居中；移动端 hero 先呈现文本，再呈现
  系统视觉图。搜索返回本地结果。移动端导航开合时不移动或遮挡
  页面。代码块和表格通过容器内滚动保持可读，主题对比度清晰。
  在 Vercel 上直接刷新 `/spec/README`、
  `/spec/03-runtime/01-ipc-protocol`、`/adr/README`；每条路由都通过
  文档记录的 `cleanUrls` 配置解析，而不是返回 404。

> 注：本站自 2026-09-19 起为单语言中文站（仓库文档改为中文 primary），
> 原双语对照与 `/zh-CN/` 路由检查项随之移除。

- **关联规范**：`02-architecture/04-documentation-site.md`、ADR 0079
- **验收**：Quality、文档可发现性、响应式布局
- **里程碑**：M6+
- **状态**：此文档重设计的浏览器渲染桌面/移动端验证已获授权；远程
  部署刷新检查仍为 Draft。

#### E2E-126：Appearance 卡片选择全局 UI 字体

- **前置条件**：应用在 macOS 上运行，装有一个与捆绑字体族不同的系统字体
  （例如 PingFang SC）；干净的 `~/.pi-desktop` 配置。
- **步骤**：
  1）打开 Settings → Basics，确认 Appearance 卡片在 Theme 和 Language
     下方显示一个 Font 行，触发器标签为 "System default"。
  2）打开 Font 选择器，确认它列出 System default、带许可证标注的捆绑
     开放许可字体族（Geist、Inter、Noto Sans SC、LXGW WenKai）以及
     已安装的系统字体族；确认搜索输入过滤字体族且当前选择显示对勾徽标；
     确认菜单作为浮动层在卡片上方打开（不被裁剪或挤压在卡片内），且在
     卡片靠近窗口底边时保持可读；安装字体族很多时，确认列表打开时无
     输入卡顿并立即滚动（只渲染可见行，带 overscan 缓冲）。
  3）选择 Geist，确认触发器标签和整个 UI 无需重载即以 Geist 重新渲染，
     包括中文文本的 CJK 回退渲染。
  4）选择一个已安装的系统字体族，确认 UI 切换到它；重新打开选择器后
     该字体族保持选中。
  5）重启应用，重新打开 Settings，确认所选字体仍然应用
     （持久化的 `AppSettings.fontFamily`）。
  6）选择 System default，确认 UI 立即返回内置令牌栈；重启并重新打开
     Settings，确认默认值仍然应用（覆盖被清除，持久化为空的
     `AppSettings.fontFamily`）。
- **预期**：Font 行是一个可搜索的选择器，其触发器以对应字形预览当前
  字体族；选项为 System default、捆绑的 OFL 字体族和由 Electron 主进程
  通过 `pi-desktop/app/systemFonts` 枚举的已安装系统字体族（缓存 60 秒，
  排除 `.` 前缀的隐藏字体族）；选择作为 CSS 栈持久化到
  `AppSettings.fontFamily` 并实时覆盖 `--font-sans`；中文文本通过 CJK
  回退层保持可读；菜单是 body 级浮动层，永不被设置卡片裁剪；选项列表
  以固定行高和 overscan 缓冲做窗口化，DOM 中只保留可见切片，使打开、
  滚动和输入无论安装多少字体族都保持响应；System default 通过持久化空
  栈来清除覆盖。
- **关联规范**：`04-ux/06-settings-ia.md`、`04-ux/07-ui-design-system.md`、
  `03-runtime/01-ipc-protocol.md`、ADR 0083
- **验收**：A（核心外壳）、H（本地化）
- **里程碑**：M5+
- **状态**：已记录

#### E2E-193：Appearance 卡片设置全局字号比例

- **前置条件**：应用以干净的 `~/.pi-desktop` 配置运行，且打开了一个
  显示对话记录文本、输入框和侧边栏的会话。
- **步骤**：
  1）打开 Settings → General，确认 Appearance 卡片在 Font 下方显示一个
     Font size 行，选中 Grande 且滑块在 100%。
  2）选择 Venti。确认聊天对话记录、输入框、设置标签、侧边栏会话标题
     和 Lucide 外观图标都无需重载即放大，保持其相对梯级，且控件显示
     115%。
  3）将滑块拖到 125%。确认 Trenta 被选中，且每个 `--text-*` 表面和图标
     进一步增大。确认 UI 从不显示 px 字段。
  4）使用 Zoom In，然后 Reset Zoom。确认窗口缩放仍然缩放外观，且重置后
     字号比例保持 125%。
  5）重启应用，确认 125% 比例仍然应用（`AppSettings.fontScale` = 1.25）。
  6）选择 Grande。确认整个 UI 立即返回 100%；重启并确认默认值保持。
- **预期**：Font size 是星巴克式杯型预设 Tall / Grande / Venti / Trenta
  外加 80%–150%、步进 2.5% 的百分比滑块。选择持久化为
  `AppSettings.fontScale`（缺省表示 1）并设置 `--font-scale`，乘以每个
  `--text-*` 令牌和共享 Lucide 图标。窗口 Zoom In/Out/Reset 保持独立。
  无效值被拒绝或收敛。不需要协议或模式版本升级。
- **关联规范**：`04-ux/06-settings-ia.md`、`04-ux/07-ui-design-system.md`、
  ADR 0180、D343
- **验收**：A（核心外壳）、B（设置）、H（本地化）
- **里程碑**：M5+
- **状态**：单测已覆盖（`packages/shared/src/font-size.test.ts`、
  `apps/desktop/test/settings-font-size.test.mjs`）；完整 UI 旅程为 Draft
  （仅在此界面变更时于具备能力的环境中运行）

#### E2E-127：macOS 保持应用在 Dock 和 Cmd+Tab 中

- **前置条件**：在 macOS 上构建的桌面应用；插件启动器快捷键
  （Option+Space）已注册；至少两个 Space 和另一个全屏运行的应用。
- **步骤**：
  1）不打开启动器直接启动应用，确认它出现在 Dock 和 Cmd+Tab 切换器中
     （`lsappinfo list` 报告 `type="Foreground"`，而非 `type="UIElement"`）。
  2）按 Option+Space，确认启动器面板聚焦出现且输入框可输入，关闭它，
     确认应用仍在 Cmd+Tab 中。
  3）将主窗口设为全屏，按 Option+Space，确认面板浮在其上方。
  4）切换到第二个常规 Space，确认 Option+Space 在该处显示面板。
  5）将主窗口最小化到托盘，切换到另一个应用，然后 Cmd+Tab 回到
     PI-Desktop，确认窗口聚焦返回；用 Dock 点击和托盘 Show 项重复。
  6）主窗口隐藏时按 Option+Space，确认只出现启动器——主窗口保持隐藏，
     直到被恢复。
- **预期**：进程从不采用 accessory 激活策略，因此 Dock 和 Cmd+Tab 存在
  在启动器预热和每次启动器调用后都保留；启动器保持可聚焦，覆盖所有
  常规 Space 和应用自己的全屏窗口（覆盖另一个应用的全屏 Space 超出范围，
  此时改为激活 PI-Desktop）；从 Cmd+Tab、App Exposé、Dock 或托盘的激活
  会恢复隐藏到托盘的窗口，而启动器和插件面板的激活使其保持隐藏。
- **关联规范**：`03-runtime/07-process-model.md`、ADR 0086、ADR 0078、
  ADR 0080
- **验收**：A（核心外壳）
- **里程碑**：M5+
- **状态**：已记录

#### E2E-128：无资源的已展开工作面板提供可用视图

- **前置条件**：应用运行，打开了一个项目和一个活动会话，该会话没有产生
  任何文件、URL 或 review 产物，因此会话的工作面板上下文没有标签页。
- **步骤**：
  1）按 `Cmd/Ctrl + J`，确认面板出现，其空白正文显示标题 "New" 以及
     Review 和 Browser/范围内插件视图行——而不是标题栏下方的空白区域。
  2）Tab 进入可用行，确认每行获得可见焦点环，且悬停行只显示背景填充。
  3）激活 Browser 或插件视图，确认其单例标签页被创建并选中；空白正文
     及其视图列表消失。
  4）点击 `+` 创建一个 New 启动器标签页，从其正文激活同一视图，确认它
     选中现有标签页而不是创建第二个。
  5）关闭视图标签页，确认当它是最后一个标签页时面板保持打开在 New
     启动器上；再次按 `Cmd/Ctrl + J`，确认它隐藏。
  6）在中文以及浅色和深色主题中重复步骤 1，并在 244px 面板最小宽度下
     确认文案换行而不是被裁剪。
- **预期**：`Cmd/Ctrl + J` 展开面板而不创建标签页，New 启动器列出与其
  `+` 创建的
  页面相同的 Review/插件视图条目；行创建或选中该单例视图。每次 `+` 点击创建
  一个独立的可关闭 New 标签页。关闭最后一个标签页后面板保持打开在 New 上。
  无标签页的空白正文不作为 `tabpanel` 暴露；显式 New 标签页被标记为
  tabpanel。其行是 `role="group"` 中标记为 Tools 的按钮。面板空状态共享
  应用的空状态比例，"open a project" 状态中没有操作按钮。
- **关联规范**：`04-ux/08-component-spec.md` §5.2、§5.2.1、§5.3、§5.4、§5.5、
  `04-ux/07-ui-design-system.md`、ADR 0108
- **验收**：A（核心外壳）、H（本地化）
- **里程碑**：M5+
- **状态**：已记录


#### E2E-129：运行行只显示一次命令并从头部复制

- **前置条件**：应用运行，打开了一个项目和一个已产生至少三个命令行的
  会话：一个成功并有输出，一个失败且同时有输出和错误，一个仍在运行。
- **步骤**：
  1）保持运行行折叠，同时它产生输出，确认该行保持紧凑的单行状态；
     然后在命令仍在运行时点击其展开控件，确认当前输出立即出现。
  1a）让命令持续运行到输出超出输出区域的可见高度，确认输出留在其限高
  滚动区域内，而不是把对话记录挤出视口。确认后续输出在行保持打开时
  原位替换同一正文。
  1b）展开成功的行，确认正文以纯文本显示命令输出——没有 `Output` 标题、
     没有带边框的卡片、没有逐块复制按钮——且命令不在正文内重复，也没有
     参数列表取而代之。
  2）确认每行头部在摘要右侧陈述其结果：`Done`、`Failed`、`Denied` 或
     `Working…`，各带匹配颜色的圆点，且运行行显示脉冲圆点而不是行
     转圈。
  2a）运行一个以非零退出的命令（在失败套件上运行 `pnpm test`，或
     `false`），确认该行读作 `Failed` 并带错误圆点且自行展开，即使工具
     调用已完成。确认退出码芯片与文字结果一致。
  2b）中断一个长命令使 shell 被杀死且无退出码，确认该行读作 `Failed`
     而不是 `Done`。
  3）悬停成功的行，确认复制按钮和箭头出现在摘要与行右边缘之间；移开
     指针，确认两者淡出而状态标签保持可见。
  4）激活复制按钮，确认剪贴板中持有命令发出时的原样——多行命令保留
     其换行，不同于头部的单行摘要——且按钮在恢复空闲图标前确认复制。
  5）确认悬停填充覆盖整个头部，包括复制按钮和箭头，且无可展开内容的
     行完全没有填充。
  6）Tab 遍历该行，确认头部是唯一切换正文的停靠点，复制按钮可达并
     获得可见焦点环（聚焦时显现），箭头永不是 Tab 停靠点。
  7）用屏幕阅读器展开和折叠该行，确认结果只播报一次，而不是两次。
  8）让代理运行一个需要审批的命令，确认权限卡片仍显示它正在询问的
     命令。
  9）启用"减弱动效"，确认运行圆点保持静止且复制按钮无淡入地出现。
  10）在中文以及浅色和深色主题中重复步骤 1–3。
- **预期**：每行命令恰好出现一次，位于头部，旁边是原样复制它的复制
  控件和不依赖圆点颜色的文字结果。结果报告命令实际做了什么——非零
  或缺失退出码读作 `Failed`，无论工具调用自身状态如何——无可报告
  内容的行不声称任何结果而不是谎称 `Done`。运行行默认折叠，执行期间
  展开它会在 stdout 通道中显示累积的 `details.output` 流。正文将实时
  输出保留在限高的内部滚动区域内并原位更新，不重渲染无关行；完成时
  的 `details.stdout` 值优先于任何较早的部分快照。展开的正文只持有
  命令打印的内容（裸文本），未打印任何内容的命令展开为空，而不是
  回退到其参数。
  审批卡片不受影响，因为它们没有自己的头部。
- **关联规范**：`04-ux/08-component-spec.md` §9.2、§9.3、§9.5、§9.10
- **验收**：E（工具与权限）、H（本地化）
- **里程碑**：M5+
- **状态**：已记录

#### E2E-130：Read 铸造标签，Edit 无需重新读取即可消费

- **前置条件**：一个绑定项目的 Agent 会话，拥有可写工作区和一个至少
  300 行的源文件。供应商夹具可以发出精确的 `Edit` 负载。
- **步骤**：
  1. 不带 `offset` 对文件执行 `Read`，记录 `[path#TAG]` 头、`tag` 字段
     和返回行上的 `N:` 前缀。
  2. 用该 `tag` 发出 `Edit`，带一个 `PUT N.=M:`，其正文替换读取窗口内
     的两行。
  3. 确认成功的结果报告新的 `tag`，然后用返回的 tag 发出第二个
     `Edit`，带 `PUT >$:` 追加，中间没有任何 `Read`。
  4. 在 `offset` 处 `Read` 一个 200 行窗口，然后使用该窗口读取的 tag
     `Edit` 窗口内的一行。
  5. 重新打开磁盘上的文件，逐字节与预期内容比较。
- **预期**：头部 tag 是整个文件的 tag，而不是窗口的，因此窗口读取能
  正确锚定；行号是绝对的，不受 `offset` 影响。两次编辑都应用，第二次
  无需任何重新读取，每次成功都返回写入后的 tag。磁盘上的文件与预期
  内容完全一致，保留其原始行尾和 BOM 状态。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §3、§4.2、§5、
  §6、§9、`03-runtime/16-tool-result-limits.md` §5、ADR 0087
- **验收**：E（工具与权限）
- **里程碑**：M5+
- **状态**：已记录

#### E2E-131：对从未显示过的行的编辑被拒绝且重试成功

- **前置条件**：一个只读取了 400 行文件的第 1–50 行的会话。
  第二个夹具文件有一行超过 16,384 个字符。
- **步骤**：
  1. 用正确的 `tag` 发出 `Edit`，带 `PUT 300.=301:` 操作。
  2. 检查错误码，确认消息内联了第 300 和 301 行的当前内容。
  3. 原样重试相同的 `Edit` 负载，包括相同的 `tag`。
  4. 用正确的 tag 发出 `Edit`，带跨越 56 个未显示行的 `PUT 5.=60:` 操作，
     并检查揭示内容。
  5. 原样重试该相同负载。
  6. `Read` 第二个夹具，确认长行被截断并在 `notice` 中计数，然后
     `Edit` 该截断行。
- **预期**：步骤 1 以 `EDIT_LINES_UNSEEN` 失败且文件不变。
  步骤 3 应用成功，因为完整的揭示已将这些行合并到会话的溯源中。
  步骤 4 失败，揭示被截断到 40 行并提示重新读取该范围；步骤 5 再次
  失败——截断的揭示不合并任何内容，因此防护无法通过低于上限的切片
  绕过。步骤 6 以 `EDIT_LINES_UNSEEN` 失败：截断的行从未被显示过。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §4.3、§9.1、
  §11、§12、`03-runtime/16-tool-result-limits.md` §2、ADR 0087
- **验收**：E（工具与权限）、Quality
- **里程碑**：M5+
- **状态**：已记录

#### E2E-132：间隙插入、删除和多操作负载针对同一快照应用

- **前置条件**：一个已读取的文件，其内容逐行已知。
- **步骤**：
  1. 发出一个 `Edit`，在单个 `ops` 负载中组合 `PUT <1:`、`PUT >40:`、
     `CUT 12.=14` 和 `PUT 80.=80:`。
  2. 将结果与针对原始行号计算的同样四处变更比较。
  3. 在同一文件上发出 `PUT >$:`，确认追加落在最后一行之后且恰好有一个
     结尾换行符。
  4. 发出一个 `ops` 负载，其正文行以字面 `-` 开头（写作 `+- item`），
     以及一个以字面 `+` 开头（写作 `++ item`）。
  5. 发出一个 `Edit`，其 `PUT` 正文与该范围的当前内容完全一致。
- **预期**：每个锚点索引带标签的快照，因此没有操作会使另一个操作移位，
  组合结果等于四处独立变更。`+-` 和 `++` 写入单个前导 `-` 和 `+`。
  步骤 5 返回 `EDIT_NO_CHANGE` 而不是报告成功写入了无内容，且不留下
  review 记录。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §7.2、§7.3、
  §7.4、§8.1、§9.3、ADR 0087
- **验收**：E（工具与权限）
- **里程碑**：M5+
- **状态**：已记录

#### E2E-133：块操作解析、回显其跨度，并在无法确定时拒绝而非猜测

- **前置条件**：受支持语法中的读取夹具（一个带装饰/属性函数的 Rust
  文件）、一个带嵌套标题的 Markdown 文件，以及一个受支持语法列表之外
  语言的文件。
- **步骤**：
  1. 在声明上方带有 `#[attribute]` 行的函数的 `fn` 行上锚定发出
     `PUT N*:`，并检查回显的 `{anchorLine, start, end, op}`。
  2. 锚定在属性行上重复，比较回显的跨度。
  3. 在同一起始行上发出 `PUT >N*:`，确认插入落在块最后一行之后，
     使用同级缩进。
  4. 在孤立的 `}` 结束符上锚定发出 `CUT N*`。
  5. 在 Markdown 夹具的 `##` 标题上发出 `PUT N*:`，确认跨度延伸到
     下一个同级或更高级标题，而不是下一个更深的标题。
  6. 在不支持语言的文件中发出 `PUT N*:`。
  7. 在 Rust 夹具中引入语法错误，重新读取，然后发出块操作。
- **预期**：步骤 1 的跨度从 `fn` 行开始且排除属性；步骤 2 包含两者——
  差异在回显中可见，模型无需推断。步骤 4、6 和 7 以
  `EDIT_BLOCK_UNRESOLVED` 失败，消息中指明普通范围的替代方案；
  均不近似猜测跨度。范围和间隙操作在不支持的语言中仍可用。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §8.2、§11、
  §12、ADR 0087 §4
- **验收**：E（工具与权限）、Quality
- **里程碑**：M5+
- **状态**：已记录

#### E2E-134：寄存器在调用内和跨调用移动代码

- **前置条件**：同一会话中的两个已读取文件。
- **步骤**：
  1. 在一个 `Edit` 中发出 `CUT 20.=30`，随后发出不带寄存器标签的
     `PUT <5 `，确认行在文件内移动。
  2. 在一个 `Edit` 中发出两个不带标签的 `CUT` 操作，随后发出一次
     不带标签的粘贴。
  3. 在第一个文件上发出 `CUT 40* @fn`，然后在单独的 `Edit` 调用中对
     第二个文件发出 `PUT <10 @fn`。
  4. 对从未设置过的寄存器发出 `PUT <10 @missing`。
  5. 发出带正文行的 `PUT 10.=12 @fn`。
  6. 在未执行任何捕获的新 `Edit` 调用中发出不带标签的 `PUT <1 `。
  7. 删除源文件，然后在后续调用中再次粘贴 `@fn`。
- **预期**：步骤 1 作为一次移动应用，没有重复或孤立的行。
  步骤 2 以 `EDIT_REGISTER_AMBIGUOUS` 失败，而不是使用最近的捕获。
  步骤 3 跨两次调用完成跨文件移动，每次调用有自己的权限门、review
  记录和产物行。步骤 4 和 6 以 `EDIT_REGISTER_EMPTY` 失败——匿名
  寄存器没有在此前的调用中存活。步骤 5 以 `EDIT_PARSE_FAILED` 失败。
  步骤 7 仍然粘贴成功：寄存器持有捕获的内容，而不是实时引用。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §7.5、§8.3、
  §11、§13.2、ADR 0087 §5
- **验收**：E（工具与权限）
- **里程碑**：M5+
- **状态**：已记录

#### E2E-135：漂移文件在可证明重映射时恢复，不可证明时失败

- **前置条件**：一个已记录 tag 的已读取文件。外部进程可以在读取与
  编辑之间修改该文件。
- **步骤**：
  1. 从会话外部在编辑目标上方插入 10 行无关内容，然后带着陈旧的
     `tag` 发出原始 `Edit`。
  2. 检查成功结果上的警告，确认变更落在移位后的位置，而不是原始
     行号。
  3. 用修改锚定行之一的变更重复。
  4. 用在多操作负载的两个锚点*之间*插入行的变更重复，使锚点将移动
     不同的偏移量。
  5. 用其捕获的内部行被外部编辑过的 `CUT` 重复。
  6. 在会话本身已写入该文件两次之后，用第一次写入的 tag 重复。
  7. 用一行重复的锚定行重复，其一个相邻上下文行匹配而另一个不匹配。
- **预期**：步骤 1 应用成功，带行重映射加外部变更警告。
  步骤 3、4、5 和 7 以 `EDIT_TAG_MISMATCH` 关闭式失败并返回当前内容；
  均不写入。步骤 6 应用成功，带会话链警告而不是外部变更警告，因为
  纠正建议不同。任何恢复路径都不会把带标签快照的内容覆盖到实时
  文件上。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §9、§10、§11、
  ADR 0087 §6
- **验收**：E（工具与权限）、Quality
- **里程碑**：M5+
- **状态**：已记录

#### E2E-136：陈旧 tag 对头尾插入仍然适用

- **前置条件**：一个已记录 tag 的已读取文件，外加一个外部写入者。
- **步骤**：
  1. 外部修改文件中部，然后带陈旧 tag 发出 `PUT >$:`。
  2. 用 `PUT <1:` 和同一陈旧 tag 重复。
  3. 用混合 `PUT >$:` 和锚定 `PUT 50.=50:` 的负载重复。
  4. 发出一个 `tag` 格式良好但本会话从未为该路径记录的 `Edit`。
  5. 发出一个 `tag` 不是四位十六进制数字的 `Edit`。
- **预期**：步骤 1 和 2 应用成功并带漂移警告，因为两个锚点都不会
  被内容漂移移动。步骤 3 不走位置稳定路径：它进入恢复，恢复失败则
  进入 `EDIT_TAG_MISMATCH`。步骤 4 返回 `EDIT_TAG_UNKNOWN`，步骤 5
  返回 `EDIT_TAG_REQUIRED`；均不报告为通用的 `TOOL_FAILED`。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §9、§11、
  `03-runtime/08-error-codes.md` §3.4
- **验收**：E（工具与权限）
- **里程碑**：M5+
- **状态**：已记录

#### E2E-137：边界修复修正差一错误并拒绝平局

- **前置条件**：一个带嵌套闭合定界符的已读取源文件。
- **步骤**：
  1. 发出一个 `PUT N.=M:`，其范围包含一个正文未重述的尾随 `}`，
     并检查结果及其警告。
  2. 发出一个 `PUT N.=M:`，其正文重述了紧邻范围之外的一行。
  3. 构造一个负载，使两个不同的修复文本在最小修复成本上平局。
  4. 针对一个已经无法解析的文件发出负载，确认修复不会仅凭解析成功
     的证据保留某行。
- **预期**：步骤 1 和 2 应用成功，警告中明确说明修复了什么，因此
  不可能发生静默的结构变更。步骤 3 返回 `EDIT_REPAIR_AMBIGUOUS`
  而不是做出选择；步骤 4 不虚构保留。任何情况下，文件要么包含警告
  中描述的修复结果，要么保持不动。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §8.4、§11、
  ADR 0087
- **验收**：E（工具与权限）、Quality
- **里程碑**：M5+
- **状态**：已记录

#### E2E-138：移动、删除和回滚保持 review 证据诚实

- **前置条件**：一个绑定项目的会话，Review 可见，且工作区根内有一个
  已读取文件。
- **步骤**：
  1. 发出一个 `Edit`，在同一 `ops` 负载中带一个 `PUT` 操作加 `MV DEST`。
  2. 检查工具调用的 review 记录和 Review 面板行。
  3. 回滚变更，确认源和目标都返回调用前状态。
  4. 发出带 `REM` 的 `Edit`，然后回滚。
  5. 回滚后，用会话在回滚前持有的 tag 发出 `Edit`。
  6. 对一个不存在但其基名和 tag 与本会话记录的恰好一个文件匹配的路径
     发出 `Edit`，并检查警告。
  7. 用共享该基名和 tag 的两个已记录候选重复步骤 6。
- **预期**：步骤 1 在一个工具调用下记录源删除和目标创建；步骤 3 同时
  恢复两者或都不恢复。步骤 4 的回滚恢复捕获的字节，以完整摘要而非
  16 位 tag 做哈希防护。步骤 5 失败，而不是针对回滚替换的内容编辑。
  步骤 6 带警告重新绑定到真实文件，写权限门针对重绑定后的路径评估；
  步骤 7 拒绝而不是挑选一个。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §9.2、§13.1、
  `03-runtime/03-tools-and-permissions.md` §4c、ADR 0043、ADR 0087
- **验收**：E（工具与权限）、Quality
- **里程碑**：M5+
- **状态**：已记录

#### E2E-139：快照溯源按会话隔离且有界

- **前置条件**：一个支持子智能体的会话（§5f）、同一工作区上的第二个
  会话，以及一个文件数超过快照存储路径上限的夹具。
- **步骤**：
  1. 在父会话中读取一个文件，然后让委派用父会话的 tag 对该文件执行
     `Edit`，而不先读取。
  2. 在会话 A 中读取一个文件，然后从会话 B 发出相同的 `Edit` 负载。
  3. 读取超过存储保留量的不同路径，然后用其原始 tag 编辑最早读取的
     路径。
  4. 在读取之间内容变化的情况下读取同一路径五次，然后用第一次读取的
     tag 编辑。
  5. 读取一个文件，然后在不同 offset 处再读取同一未变文件两次，
     确认一个 tag 覆盖全部三个窗口。
  6. 重启应用，然后用重启前的 tag 发出 `Edit`。
  7. 通过一个保存钩子会重新格式化的路径写入文件，然后用该写入返回的
     tag 执行 `Edit`。
- **预期**：步骤 1 和 2 失败——溯源按读取者隔离，没有会话会把自己的
  tag 交给另一个会话。步骤 3、4 和 6 以 `EDIT_TAG_UNKNOWN` 失败并
  指示重新读取，绝不发生错误写入。步骤 5 在三个窗口的并集内任何位置
  应用成功，无需第四次读取。步骤 7 应用成功，因为记录的 tag 描述实际
  落盘的字节，漂移以一行警告报告，而不是整个文件的 diff。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §4.2、§4.4、
  §5.4、§13.5、`03-runtime/02-agent-runtime.md` §5f、ADR 0087 §3
- **验收**：E（工具与权限）、Quality
- **里程碑**：M5+
- **状态**：已记录

#### E2E-140：可恢复的编辑失败在防护计满三次之前各有一次重试

- **前置条件**：一个已读取一个文件的会话，以及一种让文件在调用之间
  在磁盘上漂移的方法。
- **步骤**：
  1. 让文件漂移，然后用现在陈旧的 tag 发出 `Edit`，其锚点无法重映射，
     因此以 `EDIT_TAG_MISMATCH` 失败。
  2. 重新读取，然后锚定在会话从未显示过的行上发出 `Edit`，因此以
     `EDIT_LINES_UNSEEN` 失败并带截断的揭示。
  3. 在同一路径上发出一个操作头格式错误的 `Edit`。
  4. 发出第二个操作头格式错误的 `Edit`。
  5. 发出第三个操作头格式错误的 `Edit`。
- **预期**：步骤 1 和 2 返回各自的错误码，不带 `terminate` 提示——
  每个可恢复的错误码在该路径上消耗其单次宽限，回合继续，代理可以
  根据错误给出的信息行动。步骤 3 和 4 计为第 1、2 次尝试，仍不终止。
  步骤 5 终止。在步骤 5 之前任意位置插入一次成功的 `Edit` 会重置
  计数，因此随后的失败重新计为第 1 次尝试。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §9.3、§11、
  `03-runtime/03-tools-and-permissions.md` §4d、ADR 0087、ADR 0207
- **验收**：E（工具与权限）、Quality
- **里程碑**：M5+
- **状态**：已记录

#### E2E-141：重试预算耗尽以可见、可重试的行结束回合

- **前置条件**：一个会话，其中对某路径的 `Edit` 每次都以不可恢复的
  错误码失败。
- **步骤**：
  1. 在一个提示内对同一路径发出三次失败的 `Edit` 调用。
  2. 在代理循环停止后观察对话记录。
  3. 在同一会话中发送后续提示。
  4. 用三次失败的 `apply_patch` shell 命令代替 `Edit` 重复。
- **预期**：第三次调用携带终止提示且循环停止，但回合并非仅仅完成：
  对话记录以一行带 `MUTATION_RETRY_BUDGET_EXHAUSTED` 的助手错误行
  结束，标记为可重试，注明路径和下一步动作，且同一错误码作为错误
  事件到达。当最后的错误是 `EDIT_PARSE_FAILED` 时，该行的恢复提示
  解释语法修正——例如带正文的 `PUT 48.=48` 必须写成
  `PUT 48.=48:`——而不是让代理仅为修复格式错误的负载而重新读取。
  回合记录为失败而不是无最终消息地完成。步骤 3 正常进行——防护
  计数器按提示隔离。步骤 4 产生 `details.kind` 为 `patch-command`
  的相同行。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §9.3、
  `03-runtime/03-tools-and-permissions.md` §4d、
  `03-runtime/08-error-codes.md` §3.3、ADR 0087
- **验收**：E（工具与权限）、C（聊天与流）
- **里程碑**：M5+
- **状态**：已记录
#### E2E-156：Edit 工具在 CRLF 行尾的文件上成功

- **前置条件**：工作区包含一个 Windows 风格 CRLF（`\r\n`）行尾的
  文件。
- **步骤**：
  1. 用 Read 显示文件内容并记录整个文件的 `tag`。
  2. 用该 `tag` 发出 Edit，带一个 `PUT N.=N:`，其正文使用仅 LF 行尾
     （模型从 Read 输出中总是这样产生）。
  3. 编辑后检查磁盘上的文件。
- **预期**：Edit 成功并返回新的 `tag`。写入的文件全程保留 CRLF 行尾——
  修改和未修改的行都如此。不发生 `MUTATION_RETRY_BUDGET_EXHAUSTED`
  错误。
- **关联规范**：`03-runtime/18-line-anchored-edit-contract.md` §3.1、
  `03-runtime/03-tools-and-permissions.md`
- **验收**：E（工具与权限）
- **里程碑**：M5
- **状态**：已记录

#### E2E-142：后台委派通过 TaskWait 汇聚并遵守权限范围

- **前置条件**：一个绑定项目的 Agent 会话，其权限模式可在 `ask`、
  `accept-edits` 和 `auto` 之间切换，供应商的流可被驱动；五个内置
  子智能体（`explorer`、`code-reviewer`、`test-runner`、`fixer`、
  `ui-designer`）和一个全局 `~/.agents/subagents/readonly.md` 定义。
  内置子智能体使用默认的 `permission: inherit` 行为。
- **步骤**：
  1. 发起一个回合，助手在一条助手消息中发出两个 `Task` 调用——
     一个方向的 `explorer` 和另一个方向的第二个 `explorer`——然后
     不结束回合，继续自己的工具调用并以 `TaskWait` 汇聚。
  2. 确认父级的可见文本在 `Task` 与 `TaskWait` 之间持续流式输出
     （没有死回合），两个 `Task` 行构成一张打开一次的委派卡片，
     且 `TaskWait` 的行显示两份报告。
  3. 会话处于 `ask` 时，发起一个委派给 `fixer` 并带多文件规格的回合。
     确认其 `Write`/`Edit`、`Bash` 和外部路径调用各自渲染一张注明
     `fixer` 的卡片。将会话切换到 `accept-edits`，确认只有工作区内
     的 `Write`/`Edit` 被自动允许。切换到 `auto`，确认同一委派的
     `Write`/`Edit`、`Bash` 和外部 `Glob`/`Write` 调用全部无需第二张
     授权卡片即完成。
  4. 发起一个启动三个委派然后以 `mode: "any"`、`minCompleted: 1`
     调用 `TaskWait` 的回合；确认第一个完成时它立即返回，且仍在运行
     的委派继续运行。
  5. 发起一个启动一个委派然后不带 `TaskWait`/`TaskStop` 就结束回合的
     回合；确认委派在运行结束时被停止，其节点读作 `aborted`，且下一
     回合的模型上下文不包含委派行。
  6. 在一个回合中发起十个 `Task` 调用再加一个；确认第十一个作为工具
     错误失败并注明 10 委派上限，且 `TaskStop` 释放一个槽位使第十一
     个委派可以启动。
  7. 重新加载会话；确认委派卡片、其节点和 `TaskWait` 行持久化并以
     折叠状态重新渲染，且 `TaskWait` 按 id 重读已结束委派的报告而不
     重新运行它。
  8. 发起一个回合，代理启动两个 Task 调用，然后在调用 TaskWait 之前
     发出可见文本（使 Task 和 TaskWait 落在不同的活动部分）；确认
     TaskWait 返回后拓扑卡片在两个节点上显示 "completed" 状态，而不是
     卡在 "running"，且每个节点显示从委派生命周期时间戳（而不是即时
     的 `Task` 启动调用）推导的非零运行时长。
  9. 编辑 `~/.agents/subagents/readonly.md` 声明 `permission: auto` 并
     重新加载目录；确认该定义仍加载但带有警告，且其委派仍在会话的
     有效模式下解析（工作区内的 `Write` 仍弹出权限卡片）。
  10. 发起一个回合，启动一个委派，让 `TaskWait` 超时而节点仍显示
      running，然后调用 `TaskStop`；确认拓扑节点和 `TaskStop` 行都
      读作 `stopped`（而非 `running`）。结束回合并重新加载会话；
      确认卡片不标记为工作中，且不再继续累计耗时。
- **预期**：`Task` 立即返回 `delegationId` 且父级继续工作；`TaskWait`
  以每委派的报告和状态汇聚；`TaskList`/`TaskStop` 驱动生命周期；
  `TaskStop` 结果和已结束的回合从不留下活跃的"Subagent working"
  卡片；内置 `fixer` 继承所选会话权限模式，因此 `auto` 也覆盖显式
  外部路径而无重复授权提示，而 `ask` 和 `accept-edits` 保留其审批
  边界；全局定义声明的范围被丢弃；每会话 10 个的运行上限被强制执行；
  没有委派活得比其回合更久；重新加载的对话记录保留其委派拓扑。
- **关联规范**：`03-runtime/02-agent-runtime.md` §5f/§5f.1/§7.1、
  `03-runtime/03-tools-and-permissions.md` §10.2、`08-meta/decisions-log.md`
  （D242 修订 D231）、ADR 0089 和 ADR 0100
- **验收**：C（会话）、E（工具与权限）、F（持久化）、Security、Quality
- **里程碑**：M6+
- **状态**：Draft（`packages/agent-runtime` `runtime.test.ts` 子智能体套件
  和 host-core `rpc/mod.rs` 委派范围测试已有单测覆盖；桌面旅程待办）

#### E2E-162 / E2E-173：委派工作流滚动

- **状态**：已被 E2E-198 中的单滚动实时过程行为取代。

#### E2E-199：子智能体编辑器提供预设模板和受供应商约束的模型选择器

- **前置条件**：一个绑定项目的 Agent 会话。设置中至少存在一个已配置、
  可运行且带模型绑定的供应商。`~/.agents/subagents` 目录为空。内置
  子智能体存在，但没有项目子智能体文件覆盖它们。
- **步骤**：
  1. 打开 Settings → Agent → Subagents，点击 **New subagent**，确认
     表单打开并带一行紧凑名称芯片的 "Start from template"（Explorer、
     Code reviewer、Test runner、Fixer，外加一个空白芯片）。芯片只
     显示名称；所选芯片的一行说明在该行下方出现一次。确认没有长
     副标题、没有逐芯片的 Apply 标签，且 Advanced 初始折叠。确认
     带连字符的 id（`code-reviewer`、`test-runner`）渲染目录名称，
     而不是 `presetCode-reviewerName` 之类的原始键。在正常桌面宽度下，
     确认名称/描述/选择控件呈现为紧凑的填充凹槽，提示编辑器是唯一
     的高字段，Save/Cancel 操作在视觉上保持从属于表单。聚焦一个字段，
     确认其强调色环保持可见且没有永久分隔线。
  2. 不触碰任何字段，点击 **Explorer** 芯片。确认表单被预填：名称
     `Explorer`、来自内置的描述、`Read / Glob / Grep / Bash` 工具
     授权，以及完整的 Explorer 系统提示。展开 Advanced，确认模型
     字段不变（仍为 inherit）。
  3. 重新打开表单，点击 **Fixer**，确认授权扩展为
     `Read / Glob / Grep / Edit / Write / Bash` 和 Fixer 正文。
     变更提示行出现在工具行下方。展开 Advanced，确认输出上限
     初始为空。
  4. 展开 Advanced。打开模型选择器。确认选择器列出每个已配置、
     可运行供应商的每个模型，按供应商名称分组。选择一个，确认
     草稿的 `model` 字段变为 `<vendorKey-or-name>/<modelId>`（与
     运行时解析器在 `BUILTIN_SUBAGENT_DOCUMENTS` 中接受的格式一致）。
  4a. 配置一个显示名称带空格的自定义端点（例如 **My Gateway**）。
     确认选择器提供它，选中它，确认表单以 `<display name>/<modelId>`
     的固定值保存且保存按钮可用。选择器和草稿校验对于什么可保存
     必须永不分歧。
  5. 确认选择器不提供 **Custom (provider/model)…** 条目，字段不渲染
     自由文本输入，因此模型 id 只能来自已配置的目录。将选择器切换为
     **Inherit session model**，保存，确认草稿的 `model` 字段为空，
     sidecar 回退到会话模型。
  5a. 在打开的模型菜单中，确认列表在菜单内滚动，永不超出窗口边缘，
     且在过滤字段中输入会缩小行范围（包括按供应商名称）。确认菜单
     不是操作系统绘制的 select 弹窗：它留在表单自己的层内。
  6. 禁用每个提供模型的供应商。重新打开编辑器，展开 Advanced，
     确认模型字段渲染带操作按钮的空状态而不是自由文本输入，且该
     操作打开 Models。
  7. 将语言环境切换为简体中文。确认预设芯片渲染翻译后的名称
     （`探索者`、`代码审查员`、`测试执行者`、`修复者`、`空白开始`），
     且选择器标签（`沿用当前会话的模型`、`前往模型设置`）正常解析；
     两种语言环境中都不出现原始 i18n 键。
- **预期**：编辑器只提供用户已配置的模型，因此选择器是设置模型的
  唯一途径，每个保存的固定值都可解析。不接受自由文本模型 id。
  当没有供应商提供可运行模型时，字段解释这一点并链接到 Models，
  而不是让用户输入运行时无法解析的 id。选择预设会整体覆盖草稿
  （描述、工具、正文），但从不静默清除用户的其他选择（模型、
  思考级别、范围）。
- **关联规范**：`04-ux/06-settings-ia.md` §7、
  `03-runtime/13-model-catalog-and-selection.md` §11、
  `03-runtime/11-provider-model-system.md` §6.4、
  ADR 0062、ADR 0089
- **验收**：B（模型配置）、C（会话与流）、Quality
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖
  （`packages/shared/src/subagent-presets.test.ts`、
  `apps/desktop/test/subagent-editor-presets.test.mjs`）；完整 UI 旅程为
  Draft（仅在此界面变更时于具备能力的环境中运行）

#### E2E-SUBAGENT-settings-lists-builtin-defaults

- **前置条件**：一个运行中的应用。`~/.agents/subagents` 为空。五个
  随附的内置子智能体存在，均未关闭，且没有用户文档遮蔽它们。
- **步骤**：
  1. 打开 Settings → Agent → Subagents。确认 Built-in 分组列出
     `explorer`、`code-reviewer`、`test-runner`、`fixer` 和
     `ui-designer`，带有本地化名称、`Task(<handle>)` 文案、工具授权、
     Built-in 徽标、**Copy as mine** 和处于开启位置的启用开关。
     确认这些行都没有 Reveal 或 Delete。
  2. 确认 Global 分组仍显示本地化的 `settings.subagentsEmpty` 文案
     和 New subagent 操作。
  3. 从 `fixer` 的 Built-in 行将其关闭。确认该行随开关关闭而变暗，
     toast 注明其名称，`~/.agents/subagents` 中不出现任何内容，
     且该行保持列出，因为该开关是重新开启的途径。
  4. 在 `fixer` 关闭时发送提示。确认 Task 目录不提供它而其他四个
     保留，然后重新开启，确认下一个提示再次提供它。
  5. 在 explorer 上选择 **Copy as mine**。确认创建表单打开并从该
     定义预填（名称、描述、工具、正文），选中的是 Explorer 模板
     芯片而不是 Blank。保存。确认 explorer 现在只以用户拥有的
     Global 行出现并从 Built-in 中省略，且下一个提示的 Task 目录
     使用用户文档。
  6. 禁用用户 explorer 并重新加载页面。确认用户行处于关闭状态，
     且 explorer 重新出现在 Built-in 下（禁用的用户文档不会到达
     加载器，因此随附的定义再次生效）。
- **预期**：设置显示代理实际可以委派的默认值，且每一个都可以从
  自己的行关闭。内置激活是应用本地状态而不是文档，因此关闭的
  默认值保留其行；复制内置仍是调整它的途径，Reveal 和 Delete
  仍是仅限用户拥有行的文件级操作。
- **关联规范**：`04-ux/06-settings-ia.md` §2、`03-runtime/01-ipc-protocol.md`
  §12c、`03-runtime/02-agent-runtime.md` §5f、ADR 0062、ADR 0063、ADR 0270
- **验收**：E（工具与权限）、Quality
- **里程碑**：M6+
- **状态**：源码/单测已覆盖（`apps/desktop/test/agent-capability-settings.test.mjs`、
  `apps/desktop/test/subagent-wiring.test.mjs`、
  `packages/agent-runtime/src/subagent-definitions.test.ts`、
  `packages/shared/src/subagent-presets.test.ts`）；完整 UI 旅程为 Draft
  （仅在此界面变更时于具备能力的环境中运行）

#### E2E-198：子智能体任务打开实时会话过程

- **前置条件**：一个绑定项目的 Agent 会话，带模拟供应商流，其中一个
  `explorer` 委派有 Task 描述，并随时间发出思考、工具和回答行。
  工作面板初始关闭。
- **步骤**：1）必要时展开活动分组，点击 `explorer` 拓扑节点。2）再次
  点击选中的 `explorer` 节点，确认右侧停靠关闭，然后再点击一次重新
  打开。3）在委派流式输出时观察右侧停靠。4）向上滚动任务/过程会话，
  然后返回最新输出。5）切换会话并返回原会话。6）让一个委派启动然后
  失败，打开其节点，阅读停靠底部；对一个已完成的委派和一个仍在运行
  的委派重复。
- **预期**：右侧停靠显示粘性身份头部（左侧为头像、名称和模型说明；
  同一行尾部为状态胶囊和耗时，不换行）、Task 调用的描述作为 Task
  分区标签下的全宽内嵌分组卡片，上限四行，更长任务带内联
  Show more / Show less 控件，以及委派的实时思考/工具/回答过程在
  Activity 分区下、使用与主会话相同行组件的一条低调垂直时间线上。
  选中的拓扑节点是整行切换，没有额外的展开箭头：第一次点击打开
  停靠，第二次点击关闭它。新行无需重载即出现，并在钉住时跟随
  底部。面板有一个正文滚动条；过程不创建嵌套滚动条或第二张浮起
  卡片。在最小支持面板宽度下，长命令、路径和工具摘要保持在停靠内，
  不产生页面水平溢出。真实的向上手势暂停跟随并暴露跳转到最新。
  对话记录保持相同高度并保留自己的滚动状态。切换会话隐藏选择，
  返回时从不显示另一个会话的任务。
  在步骤 6 中，启动后失败的委派以错误卡片而非裸 `Failed` 胶囊关闭
  停靠：本地化摘要（运行时报告了已知错误码时为注册的
  `errors.<code>` 句子，否则为本地化的 `chat.subagentStatus.*` 结果）、
  稳定错误码、Show details / Hide details 展开后的原始供应商消息，
  以及一个复制控件。详情折叠时展开控件保持可达，已完成或仍在运行
  的委派完全不显示卡片。
- **关联规范**：`04-ux/08-component-spec.md` §5.7、
  `04-ux/09-interaction-patterns.md` §9.1
- **验收**：C（会话）、Quality
- **里程碑**：M6+
- **状态**：已记录；桌面旅程待办。失败卡片的数据源在
  `subagent-topology.test.mjs` 中有单测：从 `TaskWait` `delegations[]`
  和 `TaskStop` `stopped[]` 读取的已结束委派的
  `error: { code, message }`、生命周期行排序、无错误的条目，以及在
  父级轮询之前携带失败的终止 Task 快照。

#### E2E-SUBAGENT-settlement-updates-before-parent-poll

- **前置条件**：一个带两个并行委派的 Agent 会话；一个可以完成而另一个
  继续，且父级不轮询生命周期工具。
- **步骤**：1）启动两个委派并打开第一个委派的详情停靠。2）可选地让
  TaskList 报告两者都在运行。3）在父级回合保持活跃时只完成第一个
  委派。4）切换会话并返回，然后在回合结束后重新加载历史。5）用失败
  和被停止的委派，以及在其 Task 结果到达之前完成的委派重复。
- **预期**：已结束的节点立即停止旋转，其状态为 completed（绿色）或
  实际的失败/停止结果，且其耗时停止增长。同级保持运行；聚合读作
  两个中已结束一个。打开的停靠以相同状态和失败详情更新。陈旧的
  running TaskList 快照无法撤销结束状态。重新加载保留实际的终止
  结果和原始 Task 身份、参数及用量。
- **关联规范**：`03-runtime/02-agent-runtime.md` §Subagents、
  `04-ux/08-component-spec.md` 委派拓扑
- **验收标准**：C、Quality
- **里程碑**：M6+
- **状态**：运行时事件顺序和渲染器投影回归已自动化；桌面旅程已记录。
  必需套件：`test:e2e`、`test:e2e:subagents`。

#### E2E-SUBAGENT-resume-a-settled-delegation

- **前置条件**：一个在确定性本地传输上的 Agent 会话，可以完成、失败、
  停止和按要求保持委派打开。两个用户定义
  `~/.agents/subagents/scout.md`（只读）和
  `~/.agents/subagents/fixer.md`；一个结论易于按文件和行定位的工作区
  文件 `src/report.ts`；以及一个可从配置中移除的定义模型绑定。父级
  目录提供 `Task`、`TaskWait`、`TaskList` 和 `TaskStop`。
- **步骤**：
  1. 委派 `scout` 一份简报，要求结尾必须注明一个结论及其文件和行号，
     让它以 `completed` 结束。记下 Task 结果返回的 `delegationId`。
  2. 发送一个回合，将该 id 作为 `Task.resume` 传入，要求同一结论
     外加第一次运行从未到达的第二处出现。展开委派卡片，然后检查
     父级自己收到了什么。
  3. 发送一个只说 "reuse what the scout already found" 的回合，不带
     `resume` 值。
  4. 启动一个长时间运行的 `scout` 委派，并在其工作时为其调用
     `Task.resume`；然后在另一条链的恢复运行仍在工作时，再次为该链
     调用 `Task.resume`。
  5. `TaskStop` 一个委派，中止第二个，在第三个仍在工作时关闭应用。
     重启后，按 `TaskWait` 报告为这三个 id 各自调用 `Task.resume`。
  6. 让一个委派在一次成功读取后失败，然后为其调用 `Task.resume`。
  7. 发送一个同时携带 `resume` 和 `model` 的 `Task` 调用。
  8. 从配置中移除该链记录的模型，然后 `Task.resume` 该链，阅读其
     委派生命周期详情和卡片。
  9. 结束两条 `scout` 链，`resume` 较旧的一条，为同一定义结束第三条
     链，阅读下一个提示提供的可复用列表；然后让一条链保持运行，
     同时该定义的另外两条链结束。
  10. 在一条链中累积超过 50,000 行只读工具输出，然后用其 id 调用
      `Task.resume`。
  11. 恢复一条 `scout` 链，同时将 `Task.agent` 依次拼写为 `Explorer`、
      `explorer.md`，然后是另一个定义的名称。
  12. 让一条链读取超过八个文件，在同一会话中再发送两个提示，比较
      每个提示组成的可复用列表。
  13. 重启应用，在不改变任何其他内容的情况下，`Task.resume` 一条
      重启前的 `completed` 链。
  14. 从一个能解析某条链但不再持有其任何委派行的夹具会话中，用该
      id 调用 `Task.resume`。
- **预期**：
  - 步骤 2 从链恢复：新运行以先前结论的精确文件和行作答，其行中
    没有对该文件的全新完整读取。`Task` 返回新的 `delegationId`，
    父级自己的上下文仍持有该委派的一份最终报告，且没有委派工具行。
  - 步骤 3 是冷启动：一个全新的委派，其行中没有先前的结论，
    新的 `delegationId`，与先前的链没有关联。无论提示怎么说，
    省略 id 从不继承上下文。
  - 步骤 4 两次都作为工具错误失败。运行中的委派被报告为仍在运行，
    并指示先通过 `TaskWait` 汇聚；什么都不启动，什么都不排队，
    运行中的委派继续工作。
  - 步骤 5 拒绝 `stopped`、`aborted` 以及应用关闭时仍在工作的运行
    （重启后读作 `interrupted`）为不可恢复，各自注明该原因并给出
    全新委派的路径。没有运行启动。
  - 步骤 6 像已完成链一样恢复失败的链：它已做过的读取为新运行
    提供种子，其失败的助手行不被重放。
  - 步骤 7 作为工具错误被拒绝：恢复的运行保留链的模型，消息指向
    通过启动新委派来更换模型。
  - 步骤 8 仍然恢复，使用定义现在解析到的绑定，且委派的生命周期
    详情携带先前的模型 id 作为 `modelChangedFrom`。父级通过它轮询
    的生命周期快照看到它，卡片随运行显示它，因此切换从不静默。
  - 步骤 9 每个定义最多保留两条可复用链：最近最少活跃的已结束链
    被整体逐出，因此其上每个 id 都作为未知委派应答并给出当前可
    复用列表；而最新运行仍在工作的链永不被逐出——分组可能超过
    上限，而不是使活跃委派搁浅。
  - 步骤 10 将超预算的链从可复用列表中移除而不裁剪其历史：之后的
    提示不再提供它，对它的 `resume` 以读取过多、无法廉价恢复为由
    被拒绝，而同一工作的普通委派仍可冷启动成功。
  - 步骤 11 大小写不敏感并容忍文档后缀地匹配定义名称——`Explorer`
    和 `explorer.md` 都能恢复该链——而另一个定义的名称是名称不
    匹配，会列出确实有可复用链的代理。
  - 步骤 12 提供每条链的最新 `delegationId`、其目标，以及它读取的
    最多八个文件，超过则带 `(+N more)` 后缀。刚结束的链在同一会话
    中已经就位，无需应用重启或新会话；运行中、不可恢复、超预算和
    已逐出的链从不出现。
  - 步骤 13 从对话记录重建链关系，因此 `completed` 链在重启后再次
    被提供并如常恢复。
  - 步骤 14 以无记录历史失败，且同一 id 不出现在错误中或任何后续
    提示的可复用 id 列表中：该链离开可复用列表。
  - 整个过程中，对话记录将该链显示为其最新 Task 卡片下的一段连续
    多回合会话，没有 "resumed" 标记，且恢复运行的计数器从 0 开始，
    因此其回合、工具和用量数字描述新运行，而较早轮次在其上方保持
    可读。
- **关联规范**：`03-runtime/02-agent-runtime.md` §5f、ADR 0279
- **验收**：C（会话）、Quality
- **里程碑**：M6+
- **未覆盖（二期）**：复活 `stopped`/`aborted` 委派、链内压缩、
  任务排队和跨会话恢复。
- **状态**：Draft —— 链解析、恢复校验、可复用列表和对话记录链分组
  已有单测/回归覆盖（`packages/agent-runtime/src/delegation-chain.test.ts`、
  `delegation-history.test.ts`、`runtime.test.ts`、
  `apps/desktop/test/assistant-turns.test.mjs`）；桌面旅程需要具备能力
  的环境。必需套件：`test:e2e`、`test:e2e:subagents`、
  `test:e2e:transcript`。

#### E2E-161：委派生命周期行读作子智能体行

- **前置条件**：一个绑定项目的 Agent 会话，带模拟供应商流，先用
  `Task` 启动两个委派（`explorer`、`fixer`），然后调用 `TaskList`、
  `TaskWait` 和 `TaskStop`。
- **步骤**：1）启动两个委派，在两者运行时检查折叠的 `TaskList` 行。
  2）让 `explorer` 完成、`fixer` 失败，然后检查 `TaskWait` 行的摘要、
  徽标和展开正文。3）复用 `explorer` 定义启动第三个委派，调用
  `TaskList`，阅读摘要。4）停止一个运行中的委派并检查 `TaskStop`
  行。5）确认委派卡片自己的子智能体计数不受全部三个生命周期行影响。
  6）在中文中重复。
- **预期**：每个生命周期行按代理名称汇总——从不按其 `delegationIds`
  参数，折叠行中不出现裸 UUID。其徽标使用共享的子智能体状态词汇：
  任何成员运行时为 running，一个成员失败即为 `Failed` / "失败"（即使
  同级已完成），被停止的委派为 `Stopped by request` / "已按请求停止"——
  包括持久化的 `TaskStop` 快照仍显示 `running` 时。拓扑卡片的节点
  与该停止结果匹配，回合结束后不标记为工作中。重复的定义按计数
  （`explorer ×2`）而不是列出两次。展开正文显示合并的报告：一条
  notice，随后每个子智能体一行带状态、运行时长和回合数的命名行，
  且不包含美化打印的 `delegations[]` JSON。委派卡片仍只报告 `Task`
  调用的数量，因此生命周期行从不夸大拓扑计数。
- **关联规范**：`04-ux/08-component-spec.md` §9.9、
  `03-runtime/02-agent-runtime.md` §5f、ADR 0062、ADR 0089、decisions-log D269
- **验收**：C（会话）、Quality

#### E2E-155：子智能体生命周期由父级判定；运行时投递报告

- **前置条件**：一个绑定项目的 Agent 会话，带支持 Bash 的 `explorer`
  定义和模拟供应商流。
- **步骤**：1）启动一个委派，让父级在其仍运行时停止调用工具；确认
  持久化回合保持打开且委派不被中止。2）让委派完成，确认父级收到其
  报告提示而无需用户发送 "continue"。3）让 `TaskWait` 在委派仍运行
  时过期，阅读父级收到的心跳。4）对运行中的委派执行 `TaskList`，
  确认 elapsed / last-tool 字段。5）`TaskStop` 和用户 Stop 仍然中止。
  6）运行一个文档声明 `maxTurns: 2` 的委派，让它经过两个工具调用
  回合；确认该键被忽略且委派继续运行。7）在另一个模型上启动一个
  委派，耗尽父级 HTTP 429 预算，点击 Continue；确认剩余委派中止，
  会话空闲，Continue 被接受，失败的助手错误界面保持可见。8）定义
  一个带显式 `maxTokens` 的委派和一个不带的，运行两者，阅读两个
  发出的供应商请求。9）启动足够多的委派使其合并报告超过限界的
  `TaskWait` 结果，然后让父级空闲。
- **预期**：空闲和时长看门狗从不触发。父级空闲不中止委派。完成
  报告被投递到同一持久化回合。`TaskWait` 过期报告 "Still running
  after Ns"，包含心跳，并说明这不是失败。没有回合计数结束委派，
  也没有状态报告回合数。Explorer 的目录包含 `Bash`，而
  code-reviewer 保持只读。终止性的父级 429 中止剩余委派，且
  Continue 不是 `AGENT_BUSY`（D352）。在步骤 8 中，受限委派的请求
  携带声明的输出上限，未受限的携带模型公布的上限，因此该上限覆盖
  推导的 `max_tokens` / `max_completion_tokens` / `max_output_tokens`，
  而不干扰会话自己的请求（D383）。在步骤 9 中，从限界的 `TaskWait`
  内容中省略的报告由空闲恢复投递一次，到达父级后不重放。
- **关联规范**：`03-runtime/02-agent-runtime.md` §5f、
  `03-runtime/08-error-codes.md`、`03-runtime/09-logging-and-observability.md`、
  ADR 0166、ADR 0189、decisions-log D328 / D352 / D383
- **验收**：C（会话）、E（工具与权限）、H（诊断）、Quality
- **里程碑**：M6+
- **状态**：单测已覆盖；完整桌面旅程待办。输出上限的解析和收敛在
  `packages/shared` `subagent-definition.test.ts` 中覆盖，其文档往返
  在 host-core `user_subagents` 测试中覆盖；步骤 8 的请求级断言
  仍为手动。

#### E2E-157：全局滚动条保持低调且仍可发现

- **前置条件**：PI-Desktop 打开，侧边栏展开，临时会话超过五行的上限，
  保留的项目会话多到使 Projects 区域溢出。
- **步骤**：1）在浅色和深色主题中检查空闲的 Sessions 和 Projects
  滚动条。2）将指针移入每个列表再移开，确认只有悬停列表的滑块出现。
  3）将指针移回每个列表，拖动其滑块穿过该区域，并键盘聚焦一行，
  确认聚焦的列表保持其滑块可用。4）将指针移离滑块后，用滚轮或触控板
  滚动列表。5）打开一个长会话和一个长的右侧工作面板视图，包括捆绑
  插件启用时的文件管理器视图，在 Windows 上比较它们的空闲、悬停、
  聚焦和滚动状态。
- **预期**：两个区域保持独立可滚动，页脚保持固定。每个应用内滚动条
  无轨道、6px 宽、静止时透明；悬停或聚焦所属滚动容器只显示其滑块，
  滚动则在最后一次滚动事件后显示 300ms。拖动使其保持可见且不改变
  滚动区域的宽度。聊天、代码、设置和右侧工作面板的滚动条都遵循此
  规则。停靠或分离的插件面板获得相同的宿主注入规则；Browser 内的
  外部页面保留其页面自有的滚动条。
- **关联规范**：`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md`、`04-ux/09-interaction-patterns.md`
- **验收**：Quality（侧边栏打磨和独立导航）
- **里程碑**：M6+
- **状态**：单测已覆盖（`interaction-polish.test.mjs`）；渲染场景待办

#### E2E-158：临时会话使用隔离的 scratch 工作区

- **前置条件**：PI-Desktop 打开了一个项目，可以创建临时会话，宿主
  数据目录已知。临时会话以空对话记录开始。
- **步骤**：
  1. 在项目保持最近活跃时创建或选择一个临时会话，然后检查空主页
     hero。
     2. 确认 hero 使用临时会话文案，没有项目下划线或项目切换器；
     确认项目会话和无活跃会话仍使用各自的 hero 状态。
  3. 在临时会话中，对其 `<data_dir>/scratch/<sessionId>` 根下的文件
     使用 Read/Glob/Grep，然后用工作区相对路径 Write/Edit 一个文件
     并运行一个有界 Bash 命令。
  4. 检查工具结果和文件系统，然后切回项目，确认项目根和 git 状态
     不变。
  5. 在临时会话中进入 Plan 或 Goal，确认提交仍因现有的项目根要求
     而失败。
- **预期**：无路径会话将每个原生工具绑定到自己的
  `scratch/<sessionId>` 目录，从不绑定到可见或最近活跃的项目。
  相对路径在该 scratch 根内工作，containment 和
  权限规则保持生效，且不创建任何项目产物。
  临时 hero 已本地化且没有项目切换器；项目和无会话 hero 状态保持不变。
  Plan/Goal 保留其项目根边界。
- **关联规范**：`03-runtime/03-tools-and-permissions.md` §4/§4b、
  `03-runtime/10-session-state-machine.md`、`04-ux/01-ui-ia.md`、
  `04-ux/02-i18n-english-first.md`、ADR 0124
- **验收**：C（会话）、D（工作区）、E（工具与权限）、
  F（持久化）、Security、Quality
- **里程碑**：M6+
- **状态**：单测已覆盖（`crates/host-core/src/rpc/mod.rs`、
  `temporary-session-workspace.test.mjs`）；渲染的桌面旅程待办

#### E2E-159：长对话记录保持有界的挂载窗口

- **前置条件**：PI-Desktop 打开一个对话记录远长于一页 `session.get`
  的会话（数百条消息，包括围栏代码块和展开的工具活动），运行在
  报告过该回归的内存受限 Windows 机器上。
- **步骤**：
  1. 激活会话，确认首次绘制落在最新消息处，没有对话记录顶部闪烁。
  2. 记录渲染器的对话记录行数和堆用量，然后连续向上滚动到最早已
     加载的消息并越过它，以获取更早的页面。
  3. 在视图停止前进的每一点，确认它会恢复：更早的行出现且光标下的
     行不被向下推，更早消息指示器只在实际获取页面时出现。
  4. 向回翻页很远之后重新记录行数和堆用量，然后滚回底部并发送新
     提示。
  5. 回答流式输出时，确认跟随保持钉住且在输入框中打字保持响应。
     流式中途向上滚动，确认跟随释放且跳转到最新胶囊出现。
  6. 在几个高度悬停并点击会话缩略图刻度，然后切换到另一个会话
     再返回。
  7. 激活一个最新页折叠后不足一个视口的长会话（一个工具密集的
     回合），确认大纲存在并带有更早历史的延续入口，点击它会显示
     更早的回合，且它持续前进无需手动滚动手势，直到整个历史加载
     并挂载。
  8. 确认没有更早内容后延续入口消失，且适合一个视口的短已完成
     会话仍不显示轨道。
- **预期**：挂载的对话记录行保持受窗口约束，而不是随用户回滚的
  距离增长，因此向回翻页很远之后记录的行数和堆用量接近之前记录
  的值。向上浏览是连续的：扩大窗口和获取页面都保持视口锚定在
  正在阅读的行上。缩略图的每个消息刻度都跳转到真实行。流式保持
  流畅且输入框响应，钉住跟随和跳转到最新按规格行为，切走再返回
  时按离开时的位置绘制保留的面板。更早的历史从不会搁浅：当行
  被保留或更早页面待获取时，大纲保持可用并带有可操作的更早历史
  延续入口，且当顶部边界保持可见时持续前进，即使挂载的尾部不
  超出一个视口（D269）。当完整历史加载并挂载且对话记录适合一页
  后，延续入口和轨道消失。
- **关联规范**：`04-ux/08-component-spec.md` §7 和 §8、
  `03-runtime/04-data-storage.md`、ADR 0120、ADR 0127、ADR 0130、D108、D269
- **验收**：C（会话）、H（诊断）、Quality
- **里程碑**：M6+
- **状态**：单测已覆盖（`transcript-window.test.mjs`、
  `conversation-minimap.test.mjs`、`interaction-performance.test.mjs`）；
  渲染的桌面旅程和低内存 Windows 测量待办

#### E2E-160：跨显示器拖动窗口保持放置位置

- **前置条件**：PI-Desktop 在并排排列双显示器的机器上打开，最好工作
  区域不同（仅一个显示器有菜单栏或任务栏，或分辨率不同）。在工作
  面板关闭时运行一次，在其以已提交宽度打开时再运行一次。
- **步骤**：
  1. 记下窗口在第一个显示器上的位置，然后通过标题栏将其拖到第二个
     显示器并释放指针。
  2. 确认窗口停留在释放处：不跳动、不吸附到显示器边缘，也没有从
     第一个显示器继承的垂直偏移。
  3. 拖动窗口使其横跨两个显示器的边界并释放，确认它完全收敛到一个
     显示器的工作区域内且不改变大小。
  4. 面板打开时，重复跨显示器拖动，确认面板保持为其已提交渲染器
     宽度的内部列；不重新规划预留，也不应用面板专属的原生几何。
  5. 将窗口拖回第一个显示器，确认应用边界继续跟随放置位置且面板
     不扩张。
  6. 将窗口留在第二个显示器上，退出并重新启动。
  7. 窗口在第二个显示器上时断开该显示器，然后重新连接。
- **预期**：每次指针释放都把窗口留在用户放置它的显示器上的放置
  位置。横跨边界的放置被归一化到一个工作区域内且不调整大小。
  重启在窗口最后使用的显示器（而非启动时的显示器）上重新打开它。
  移除窗口所在的显示器仍会把它迁移到可用的显示器，重新连接保留
  相同的应用边界契约；不恢复工作面板预留。
- **关联规范**：`03-runtime/01-ipc-protocol.md`、
  `04-ux/09-interaction-patterns.md` §8、ADR 0132、ADR 0151
- **验收**：F（持久化）、Quality
- **里程碑**：M6+
- **状态**：单测已覆盖（`work-panel-window.test.mjs`：跨显示器拖动
  采用、先前显示器重规划回归、工作区域收敛）；双显示器桌面旅程和
  重启/热插拔环节待办

#### E2E-167：原生边缘调整大小保持流畅并持久化稳定后的边界

- **前置条件**：PI-Desktop 在 macOS、Windows 或 Linux 上以正常、
  非最大化窗口打开。在工作面板关闭时运行一次，在其以已提交宽度
  打开时再运行一次。
- **步骤**：
  1. 缓慢拖动每个可达的窗口边缘和一个角落，包括手势中短暂停顿，
     然后释放。
  2. 确认窗口连续跟随指针，指针按下期间不跳到默认大小或显示器
     边缘。
  3. 工作面板打开时，向两个方向缓慢拖动其内部分隔条，确认面板
     宽度在现有窗口内改变而原生边界保持固定。在面板最小值以下和
     最大值以上重复，然后验证目标跟随实时预算（`client width - 360px - expanded sidebar`）
     而不是固定上限。
  4. 调整大小稳定后关闭并重启应用。
- **预期**：原生边缘和角落命中区域在无边框外观中保持可用，最小
  尺寸保持 1040×700，恢复看门狗不与缓慢的调整大小流竞争。渲染器
  拥有的分隔条更新有界的面板目标而不改变原生边界；最后稳定的
  窗口边界和已提交的面板宽度在重启后恢复。没有临时工作面板预留
  宽度被持久化或恢复。
- **关联规范**：`03-runtime/01-ipc-protocol.md`、
  `04-ux/01-ui-ia.md`、`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md`、`04-ux/09-interaction-patterns.md`、
  ADR 0029 / ADR 0151
- **验收**：A（应用外壳）、F（持久化）、Quality
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖；原生桌面边缘/角落旅程仍待办

#### E2E-168：展开的侧边栏宽度跟随锚定的调整大小手势

- **前置条件**：PI-Desktop 在聊天外壳中打开，侧边栏展开且一个保留的
  项目/会话可见。
- **步骤**：
  1. 从默认宽度向两个方向拖动侧边栏右边缘手柄，包括带短暂停顿的
     慢速拖动，然后释放。
  2. 确认主面板连续重排，指针按下时侧边栏不跳动。
  3. 工作面板打开时或在支持的小窗口上，继续向最大值调整；主面板
     重排时检查输入框工具栏。
  4. 以低于 240px 和高于实时最大值的目标重复；释放并确认侧边栏
     宽度停在 240px 和实时上限（至多 520px），同时 MainChat 保持在
     450px 或以上。继续拖到 160px 以下，确认侧边栏立即折叠且不
     保存进行中的宽度。
  5. 聚焦边缘手柄并按 ArrowLeft/ArrowRight、Home 和 End；检查分隔
     条的当前 ARIA 值。在 240px 处按 ArrowLeft 不得折叠侧边栏。
  6. 开始调整大小，按 Escape 或取消指针，然后重启应用。
     作为单独检查折叠再展开侧边栏；首选展开宽度必须恢复。
  7. 将手柄拖宽，双击它，确认宽度返回默认 275px。在最小宽度拖动
     之后以及在实时上限为约束边界的受压窗口上重复。
- **预期**：手柄在直接悬停/聚焦时可发现，悬停侧边栏主体时不出现
  全高白色/强调色轨道，没有原生窗口拖动或文本选择副作用，并保持
  锚定在按下点。MainChat 跟随实时宽度直到其 450px 下限。指针释放
  保存一个收敛后的首选宽度；Escape/取消恢复起始宽度而不保存。
  双击手柄恢复默认 275px 宽度，收敛到实时预算，使重置永不突破
  450px 的 MainChat 下限。低于 160px 的指针宽度作为用户操作折叠
  侧边栏，并在重新打开时恢复首选展开宽度。键盘变更立即提交并
  暴露本地化的宽度语义。保存的宽度在重启后保留，并在侧边栏折叠
  后恢复；折叠不把首选宽度转换成图标栏宽度。MainChat 从不低于
  450px，输入框工具栏的左右分组保持在一行内且按钮不受挤压。
  模式/权限标签保持单行并省略号截断；没有工具栏文本被垂直拆分
  或重叠。
- **关联规范**：`04-ux/01-ui-ia.md`、`04-ux/07-ui-design-system.md`、
  `04-ux/08-component-spec.md`、`04-ux/09-interaction-patterns.md`、
  ADR 0141、ADR 0238、ADR 0290、D280、D408、D451
- **验收**：A（应用外壳）、F（持久化）、Quality
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖（`sidebar-preferences.test.mjs`、
  `sidebar-resize.test.mjs`、`sidebar-resize-math.test.mjs`）；渲染的
  桌面拖动和重启旅程仍待办

#### E2E-162：厂商账号和 AI 服务提供相同的模型选择器

- **前置条件**：一个已登录的厂商（OAuth）账号和一个 API 密钥 AI
  服务，两者都有可发现的模型，且至少其中一个暴露支持推理的模型。
- **步骤**：1）打开 Settings → Model configuration。2）编辑 AI 服务，
  展开一个所选模型的 Advanced 展开区，记下其上下文窗口、最大输出
  和思考芯片；取消。3）编辑厂商账号，在其一个所选模型上做同样
  操作。4）在一个支持推理的账号模型上切换思考级别并保存。5）重新
  打开账号编辑器，读取该模型的芯片。6）对于 OpenAI Codex 账号，
  检查 `gpt-6-astra`（或另一个同样在 models.dev 的 `openai` 供应商
  下发布的账号模型），确认其公布的上下文/输出上限和推理级别存在。
  7）在账号编辑器中，手工输入目录未发布的自定义模型 ID，为其启用
  思考级别，并保存。
- **预期**：两个对话框渲染相同的选择器——相同的已发现列表、相同
  的搜索、相同的自由形式自定义模型条目、相同的已选面板、相同的
  Advanced 展开区和相同的芯片——因此账号编辑器不再缺少高级控件。
  在账号模型上启用的级别持久化，并在重新打开编辑器时重现，包括
  目录未发布的级别。OpenAI Codex 的 `openai-codex` 适配器键解析到
  匹配的 `openai` models.dev 记录，因此 `gpt-6-astra` 不会以通用的
  128,000 / 8,192 / 无推理默认值显示。已认证的 ChatGPT 列表本身
  来自固定的 pi-ai 目录（0.85.1 包含 `gpt-6-astra`）；models.dev
  无法添加缺失的 OAuth ID。没有公布记录的模型保留其显式级别，
  并以所有选项可供手动选择开始。账号的默认模型保持为头部绑定。
- **关联规范**：`04-ux/06-settings-ia.md`、
  `04-ux/08-component-spec.md` §19、`03-runtime/11-provider-model-system.md`
  §10、`08-meta/decisions-log.md`（D270 细化 D237/D240）
- **验收**：B（模型配置）、Quality
#### E2E-163：高级模型设置掌管默认思考等级与附件能力

- **前置条件**：一个带有可发现模型的 AI 服务，包括一个发布至少三个思考等级的推理能力模型、一个视觉能力模型，以及一个被 models.dev 描述为纯文本的模型。该服务必须持久化模型本地的 `supportsImages` 覆盖值。
- **步骤**：1) 打开 Settings → 模型配置，编辑该服务并展开某个推理能力模型的 Advanced 折叠区。2) 启用至少三个思考等级，并选择一个并非最低已启用等级的默认值，然后保存。3) 重新打开编辑器并读取默认选择器。4) 禁用当前被选为默认的等级，再次读取选择器。5) 在该模型上启动一个新会话并打开 Composer 的推理菜单。6) 回到 Advanced，在纯文本模型上将 Image input 打开，保存，重新打开并确认该开关报告自身处于被覆盖状态。7) 打开 Composer 模型菜单，确认该模型显示视觉徽标。8) 在已发布的视觉模型上将 Image input 关闭，确认其 Composer 行不再显示视觉徽标。9) 在纯文本模型的会话中附加一张图片。10) 将同一复选框勾回 models.dev 发布的值，保存并重新打开。
  11) 为一个目录条目未声明 PDF 输入的模型打开 PDF input，保存，并附加一个 PDF。12) 配置一个模型，然后将该服务指向一个不再列出它的端点，重新打开编辑器并读取该模型的能力复选框。
- **预期**：默认思考等级可在该绑定启用的等级之中选择，除此之外别无选择；它在重新打开后保持持久，并且是主页草稿徽标和一个新持久化会话的起始等级，而不是最强的已启用等级。禁用已选定的默认等级会将其移到一个仍处于启用状态的等级，而不是留下一个运行时会被钳制掉的等级；当绑定只启用一个等级或一个都不启用时，选择器不出现。已作答的 Image input 开关在两个方向上都覆盖已发布的能力，并且在重新打开后保持有效。Composer 模型菜单对纯文本模型上生效的 `true` 覆盖显示视觉徽标，对已发布视觉模型上显式的 `false` 覆盖隐藏徽标，并在覆盖被重置为 `null` 时跟随发布值。纯文本模型会将附加的图片作为图像内容块传输。将复选框勾回发布值
  存储的是“跟随目录”，而不是一个等值的覆盖，因此之后的目录更正仍可传达到该绑定，无需任何单独的重置控件。即使目录未发布推理支持，全部七个规范思考徽标仍然可用，从而可以显式选择启用某个端点。PDF input 记录该能力而不改变传输方式：PDF 仍是一个有边界的文件引用，模型用自己的文件工具读取它。每项能力都是一个带简短标签的复选框，没有逐行的解释性文案。Advanced 主体是一个紧凑面板：别名提示是 title 工具提示，限制字段隐藏原生数字微调器，思考徽标横跨面板排列且默认选择器位于标签行，附件与委托复选框共享一个可换行的行。第一个被选中的行默认展开。一个已配置但不在实时发现中的模型仍显示其已发布能力，而不是显示为无描述。
- **关联规格**：`03-runtime/11-provider-model-system.md` §6.2，
  `03-runtime/12-provider-config-schema.md`，
  `03-runtime/13-model-catalog-and-selection.md` §11.2，
  `04-ux/08-component-spec.md` §11.7–11.8，
  `04-ux/06-settings-ia.md`，ADR 0218
- **验收**：B（模型配置）、Quality

#### E2E-164：上下文压缩保留活动任务边界

- **前置条件**：一个 provider fixture 可以完成多个顺序任务，在终端边界触发自动检查点，在工具循环期间触发活动回合检查点，并重启会话。
- **步骤**：
  1. 在一个会话中完成任务 A 和任务 B，各自使用不同的指令并给出可见的完成回复。
  2. 在一个已完成回合之后触发检查点，然后发送任务 C 并捕获下一个 provider 请求上下文。
  3. 在任务 D 仍有待处理的工具结果或 `toolUse` 时触发压缩，并捕获下一个 provider 请求。
  4. 重启并重新打开该会话，然后再发送一个提示。
- **预期**：已完成回合的检查点具有空的保留尾部；下一个请求包含其摘要加上任务 C，不含裸露的 A/B 提示。活动检查点恰好保留最新的活动用户提示，不含更早的用户提示或边界之前的 assistant/tool 消息。重启遵循 `retainedTailMode`，而旧版多用户尾部会归一化为最新的用户消息。如果自动摘要生成失败，回退路径即使在已完成回合之后也保留一个有界的近期用户尾部，随后的重试只会移除合成的恢复通知，同时保留任何已携带的摘要。可见转录保持完整，检查点行保持存在。
- **关联规格**：`03-runtime/02-agent-runtime.md`，
  `03-runtime/04-data-storage.md`，`03-runtime/16-tool-result-limits.md`，
  `08-meta/decisions-log.md`（D275），ADR 0136
- **验收**：C（聊天/流）、F（持久化）、Quality
- **里程碑**：M5
- **状态**：单测已覆盖（`packages/agent-runtime/src/runtime.test.ts`，
  `context-compaction.test.mjs`）；provider/UI 旅程为 Draft

#### E2E-165：A2A 与 Peer 工具已被移除

- **前置条件**：Agent 模式；协议 v11 宿主。一个用户子代理定义在其工具列表中包含 `A2A`（或 `Peer`）。两个 Agent 模式会话处于打开状态。
- **步骤**：1) 握手并检查宿主能力。2) 检查父 Agent 工具列表和 `ToolSearch` 结果。3) 加载命名了 `A2A`/`Peer` 的定义。4) 启动两个并发的工作工具委托。5) 询问一个会话能否看到另一个会话。
- **预期**：握手在协议 v11 下成功，且不宣告 `"a2a"`。`A2A` 与 `Peer` 不出现在父目录、延迟工具和 `ToolSearch` 中。未知工具名被丢弃并产生解析警告；其余工作工具仍可生成。并发委托仅通过 `Task*` 汇报——不存在同级通道或父对父通道。`a2a.*` RPC 方法返回 method-not-found。Schema v14 数据库没有 `a2a_*` 表。
- **关联规格**：`03-runtime/02-agent-runtime.md` §5f.2，
  `03-runtime/03-tools-and-permissions.md` §10.2，
  `03-runtime/06-host-rpc-protocol.md` §3–§4，
  `08-meta/decisions-log.md`（D326），ADR 0165
- **验收**：E（工具与权限）+ C（聊天/流）+ Security
- **里程碑**：M5
- **状态**：Draft

E2E-165b、E2E-165c 和 E2E-165d（A2A 推送、跨会话 A2A、父级 A2A）已随 ADR 0165 一并移除。

#### E2E-166：子代理模型选择

- **前置条件**：Agent 模式；至少一个 provider 拥有两个已配置的模型绑定；一个内置子代理定义可用。
- **步骤**：1) 为一个模型绑定启用委托复选框，保存该 provider，重新打开，确认复选框保持启用；重启应用，再次重新打开该 provider，确认它仍处于启用状态。2) 启动一个会话，检查父代理系统提示中的委托模型摘要。3) 用指向已启用绑定的 `model: "provider/modelId"` 委托一个 Task。4) 用指向未为子代理启用的绑定的 `model:` 委托一个 Task。5) 用指向一个完全未配置的模型的 `model:` 委托一个 Task。6) 用不带 `model:` 参数、且定义带有 frontmatter 模型固定的方式委托一个 Task。7) 用不带 `model:` 参数、且定义没有 frontmatter 模型固定的方式委托一个 Task。8) 在没有任何已启用委托模型的情况下，分别用不带 `model:` 和用重复当前会话 `provider/modelId` 的 `model:` 各委托一次 Task。9) 将一个未选中的模型固定到某个定义上；尝试将其用作另一个定义的显式覆盖，然后不带覆盖调用其所有者定义。10) 移除一个先前已启用的覆盖键，并在同一个空闲会话中再发起一个提示。
- **预期**：
  1. 保存并重新打开 provider 会保留 `availableForSubagents` 的启用选择，包括应用重启之后。
  2. 委托模型摘要出现在父代理的系统提示中，列出每个成功解析且标记为 `availableForSubagents` 的模型，不含仅存在于定义中的固定。Task 定义目录展示每个默认模型，并建议省略 `model` 以保留它。
  3. Task 工具接受 `model` 参数，委托运行在指定模型上而非会话模型上；其委托节点会在子代理名称之后立即显示生效的模型 id。
  4. 如果模型未配置或未为委托启用，Task 返回一个列出可用模型的工具错误。
  5. 解析优先级为 Task.model 参数 → 定义 frontmatter 固定 → 会话模型。
  6. 对于在 provider 设置中启用的模型，通过 `provider.resolveSubagentModel` RPC 的按需解析会成功。
  7. 当没有配置任何委托模型时，省略 `model:` 和显式重复当前会话的 `provider/modelId` 都会在会话模型上启动委托；后者不会被报告为不可用模型。
  8. 私有固定在省略 `model` 时、或当 `Task.model` 重复该定义自身的固定键时仍可由该定义使用，但未选择启用的定义无法为另一个定义选择它。拒绝不会发出任何子 provider 请求。按需授权不会使空闲运行时退役；而更改启动启用选择会，因此陈旧的缓存绑定不授予任何选择权。
- **关联规格**：`03-runtime/02-agent-runtime.md` §5f，
  `03-runtime/11-provider-model-system.md` §7，
  `03-runtime/12-provider-config-schema.md` §2，
  `08-meta/decisions-log.md`（D278）
- **验收**：C（聊天/流）+ B（模型配置）+ E（工具）
- **里程碑**：M6+
- **状态**：部分自动化。`pnpm test:e2e:subagent-models` 通过真实 NDJSON 和一个本地确定性 SSE 模型 fixture 驱动构建后的 sidecar：私有跨定义拒绝、自身固定回显、正常固定使用、允许的覆盖优先级、无需重建运行时的按需授权、精确会话继承，以及跨两个提示的撤销全部通过。运行时单测覆盖相同的选择门控，桌面启动测试验证了独立启用、撤销以及共享 vendor 别名的账户；接线测试检查唯一的按需匹配。设置复选框的 UI/持久化旅程以及真实外部 provider 执行仍为手动；该 fixture 不声称覆盖完整的原生 UI 旅程。

#### E2E-170：外壳标题栏使用无边框 chrome

- **前置条件**：PI-Desktop 打开在聊天页、至少一个目标页面，以及支持浅色或深色主题的 Settings。在 Windows/Linux 上，渲染器绘制的窗口控件可见。
- **步骤**：1) 检查聊天、目标页面和 Settings 界面上的顶部条带。2) 在浅色与深色主题之间切换并重复检查。3) 在 Windows/Linux 上，检查窗口控件条带及其与相邻界面的边界。4) 拖动标题栏并激活每个窗口控件按钮。
- **预期**：共享的 46px 顶部条带保持稳定且可拖动，但其下边缘在任一主题或路由下都没有可见的边框线。Windows/Linux 控件条带没有底部线条；只有其原有的微弱侧边接缝将控件与相邻界面分隔开。焦点环、悬停状态、窗口操作和内容间隙保持不变。
- **关联规格**：`04-ux/01-ui-ia.md`，`04-ux/07-ui-design-system.md`，
  `04-ux/08-component-spec.md`
- **验收**：A（应用外壳）、Quality
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖（`topbar-consistency.test.mjs`，
  `settings-drag-region.test.mjs`，`window-menu.test.mjs`）；渲染出的浅色/深色桌面旅程仍待完成

#### E2E-172：回合中段的思考选择不会使未固定的会话菜单折叠

- **前置条件**：应用默认是一个推理能力自定义 provider/模型，其绑定发布稀疏的等级集合，例如 `low`/`high`/`max`。默认创建路径（`provider_id`/`model_id` 为 NULL）上存在一个会话。
- **步骤**：1) 发送一个提示，使会话处于运行状态。2) 打开 Composer 的模型 × 推理菜单，选择一个不同的已启用思考等级。3) 不等待回合结束就重新打开思考子菜单。4) 切换到另一个会话再切回。5) 让回合结束。
- **预期**：徽标显示所选等级（而非 Off）。子菜单仍列出所有已启用的绑定等级。切换会话不会使菜单折叠。`agent_end` 之后，排队的配置已持久化。无需重新保存 provider 即可恢复菜单。
- **关联规格**：`03-runtime/01-ipc-protocol.md`，
  `03-runtime/13-model-catalog-and-selection.md`，
  `04-ux/08-component-spec.md` §11
- **验收**：B（模型配置）、C（聊天与流）、Quality
- **里程碑**：M6
- **状态**：单测已覆盖（`session-thinking.test.mjs`，`thinking-ui.test.mjs`，
  `composer-send-state.test.mjs`）；完整 UI 场景为 Draft
  （仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-174：绑定默认思考等级为草稿和新会话播种

- **前置条件**：一个带有推理模型的 AI 服务，其发布的等级不含 `off`（例如 `low` / `high` / `max`），且其 Advanced 默认思考等级是一个非最大的已启用等级，例如 `low`。
- **步骤**：1) 在无活动会话的情况下打开主页 Composer，读取模型 × 推理徽标。2) 不打开推理菜单就创建一个新任务，然后读取徽标和会话存储的 `thinkingLevel`。3) 在主页草稿上通过模型菜单切换到该模型，并在发送前读取徽标。4) 将绑定默认改为另一个已启用等级，保存，并在一个全新的草稿上重复步骤 1–2。
- **预期**：主页草稿徽标、草稿中的模型切换以及新持久化的会话都从绑定存储的默认值开始，而不是从最强已发布或已启用等级开始。在 Settings 中更改默认值会影响下一个草稿和新会话，并且不会改写已存在的会话。
- **关联规格**：`03-runtime/11-provider-model-system.md` §6.2，
  `03-runtime/13-model-catalog-and-selection.md` §4，
  `04-ux/08-component-spec.md` §11.4 / §11.5，`08-meta/decisions-log.md`（D303）
- **验收**：B（模型配置）、C（聊天/流）、Quality
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖（`thinking-levels.test.ts`，
  `thinking-ui.test.mjs`）；渲染出的桌面旅程仍待完成

#### E2E-175：分页的 Read 不显示为截断

- **前置条件**：一个项目绑定的 Agent 会话；工作区包含一个至少 3000 行的文本文件，其行长均短于 16,384 个字符，另有一个首行超过该上限的 fixture。
- **步骤**：
  1. 不带 `offset`/`limit` 对长文件执行 `Read`。
  2. 以报告的下一个 offset 作为 `offset`、并给一个适度的 `limit`，对同一文件执行 `Read`。
  3. 对超长行的 fixture 执行 `Read`。
  4. Grep 一个匹配数超过默认 `headLimit` 的词元。
- **预期**：
  - 步骤 1 返回默认的 2000 行窗口、`truncated: false`、无截断徽标、整个文件的 `totalLines`，以及一个指明下一个 offset 的 `notice`。它不会提示模型去 Grep。
  - 步骤 2 无重叠地继续，并保持 `truncated: false`。
  - 步骤 3 设置 `truncated: true`，在 `notice` 中计入被裁剪的行，并显示截断徽标。
  - 步骤 4 因为仍有剩余匹配而设置 `truncated: true`，并显示徽标。
- **关联规格**：`03-runtime/16-tool-result-limits.md` §2 / §5，
  `04-ux/08-component-spec.md` §9.2，`08-meta/decisions-log.md`（D306）
- **验收**：C（聊天与流）、E（工具与权限）
- **里程碑**：M5
- **状态**：单测已覆盖（host-core `tools` 测试）

#### E2E-176：Settings Info 打开预填的 GitHub bug 表单

- **前置条件**：Settings 可以打开；机器可以启动系统浏览器。
- **步骤**：1) 打开 Settings → Info。2) 确认 Application 行显示当前应用版本。3) 在设置搜索中查找 Report a problem 标签。4) 激活 Open GitHub。
- **预期**：该行被 Settings 搜索索引且停留在 Info。该操作从渲染器调用 `pi-desktop/app/openFeedback`，不携带 URL。Main 打开 `https://github.com/vastsa/PI-Desktop/issues/new`，附带 `template=bug_report.yml`，并预填 `app-version`、`os` 和 `environment`。GitHub bug 表单仍要求填写描述、复现步骤、预期、实际、版本和 OS；空白 issue 保持禁用。
- **关联规格**：`04-ux/06-settings-ia.md`，`03-runtime/01-ipc-protocol.md`，
  `06-delivery/03-ai-development-workflow.md`，`08-meta/decisions-log.md`
  （D313），ADR 0157
- **验收**：H（诊断）、Quality
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖（`github-feedback.test.ts`，
  `feedback.test.mjs`）；渲染出的桌面旅程仍待完成
  （仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-177：切换长时间运行的会话时保持最新提示可见

- **前置条件**：一个会话已保持打开足够久，渲染器持有的内容超过最新 100 条的持久化页（数百条 user/assistant/tool 行）；存在第二个会话以便切换。
- **步骤**：1) 如有需要，中断进行中的回复，然后发送一个新提示。2) 在该回合仍在运行时，切换到另一个会话再切回。3) 确认最新的用户行（以及任何流式尾部）位于转录底部，且会话仍显示为运行中。4) 可选：停止，切走再切回；相同的最新行仍按时间顺序保持。
- **预期**：重新校验不会在有界持久化页之后追加更早的实时历史。已挂载的尾部窗口仍显示刚发送的提示和实时尾部。回合在切换期间继续在后台进行。无需停止即可让提示再次可见。
- **关联规格**：`04-ux/08-component-spec.md` §1.6 / §3.5，
  `04-ux/09-interaction-patterns.md`（会话隔离），ADR 0120，ADR 0137，
  `08-meta/decisions-log.md`（D261，D317）
- **验收**：C（对话与流）、F（持久化）、Quality
- **里程碑**：M5
- **状态**：单测已覆盖（`session-transcript.test.mjs` D317 用例）；完整桌面旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-183：切换空闲会话时保留尚未落盘的已完成回复

- **前置条件**：存在两个对话。源会话有一条已完成的用户提示和一条仍显示在屏幕上的 assistant 回复。该会话的持久化 `session.get` 页仍只有用户行（持久化 outbox 尚未冲刷 assistant 行）。
- **步骤**：1) 等到回合不再运行。2) 切换到另一个会话再切回。3) 确认 assistant 回复仍可见。4) 可选：等到 outbox 排空，再次切走再切回；回复仍在，且此时也存在于 JSONL 中。
- **预期**：空闲时的重新校验将实时快照拼接到持久化页上。仅存在于实时的已完成 assistant/tool 行不会被仅有用户的持久化页替换。实时来源标记在该页包含所有实时 id 之前不会被清除。
- **关联规格**：`04-ux/08-component-spec.md` §1.6 / §3.5，
  `04-ux/09-interaction-patterns.md`（会话隔离），ADR 0137，
  `08-meta/decisions-log.md`（D317，D324）
- **验收**：C（对话与流）、F（持久化）、Quality
- **里程碑**：M5
- **状态**：单测已覆盖（`session-transcript.test.mjs` D324 用例，
  `session-switch-performance.test.mjs`）；完整桌面旅程为 Draft（除非明确要求，否则不在本地运行 E2E）

#### E2E-184：已完成的 AI 回复在关闭并重新打开应用后仍然存在

- **前置条件**：一个带有至少一条已完成用户提示和 assistant 回复的会话。进程退出时，该回复可能仍在持久化 outbox 中，或仅在 `sessions/<id>.inflight.json` 中。
- **步骤**：1) 发送一个提示，等待 assistant 回复完成且会话进入空闲。2) 退出应用（关闭窗口 / 托盘 Quit）并重新启动。3) 打开同一会话。4) 在回复出现在屏幕上之后立即强杀进程，重复上述过程。5) 在多个已完成回合的情况下重复，然后退出并重新打开。
- **预期**：重新启动后，每条用户提示和每条已完成的 assistant 回复都可见。没有会话在答案所在位置出现带空白缺口的用户行。从 `completed` 回合遗留检查点恢复的回复是 `complete`，而不是 `aborted`。已到达 `tool_end` 的工具行同样存在。此前已在磁盘上的回合保持不变。
- **关联规格**：`03-runtime/04-data-storage.md`，
  `03-runtime/07-process-model.md`，`03-runtime/10-session-state-machine.md`，
  ADR 0041，ADR 0153，`08-meta/decisions-log.md`（D327）
- **验收**：C（对话与流）、F（持久化）
- **里程碑**：M5
- **状态**：单测已覆盖（`sessions.rs` D327 inflight 测试，
  `persistence-outbox.test.mjs`，`inflight-checkpoint.test.mjs`）；协议复现位于 issue-42 host+outbox 测试线束；完整桌面旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-178：缺失的 sessions 行被恢复，使 outbox 可以排空

- **前置条件**：一个会话拥有现存的 `sessions/<id>.jsonl` 和 `session-message-outbox.json` 中排队的回合，但其行已从 `pi.sqlite` 的 `sessions` 中消失（WAL/索引丢失）。
- **步骤**：1) 确认侧栏不再列出该会话，且 `session.appendMessage` 会以 `session not found` 失败。2) 重启应用（或以其他方式完成一次会冲刷 outbox 的宿主握手）。3) 可选：删除该会话，确认其 outbox 条目被丢弃而不是被复活。
- **预期**：宿主启动时从 JSONL 重新插入 sessions 行并重建搜索索引。outbox 在头部不停顿地排空。对话连同其消息回到侧栏。被用户删除的会话不会从遗留的 outbox 条目中重建。
- **关联规格**：`03-runtime/04-data-storage.md`，
  `03-runtime/06-host-rpc-protocol.md`，`03-runtime/07-process-model.md`，
  ADR 0041，`08-meta/decisions-log.md`（D318）
- **验收**：C（对话与流）、F（持久化）
- **里程碑**：M5
- **状态**：单测已覆盖（host-core 孤儿会话恢复测试，
  `persistence-outbox.test.mjs`）；完整桌面旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-179：Task 扇出之后的父工具保持在委托卡片之外

- **前置条件**：一个项目绑定的 Agent 会话，其 provider 流可以在一条 assistant 消息中发出两个 `Task` 调用，然后在 `TaskWait` 之前继续工作——思考、`Read`、`Grep`。
- **步骤**：1) 发起一个扇出两个委托的回合，然后在至少一个委托仍在运行时继续进行父级思考和工作区读取。2) 检查展开的委托卡片及其下方的行。3) 让委托完成，检查卡片上的已用时间与父级处理组的对比。4) 重新加载会话并再次展开卡片。
- **预期**：委托卡片只包含主代理根节点和两个 `Task` 节点。父级思考、`Read`、`Grep` 和 `TaskWait` 渲染在独立的处理组中，不紧贴子代理贴片，也不位于“Subagent working”标题之下。卡片与其贴片边缘保持内缩。当一个委托仍在运行时，卡片保持 working 标记、保持打开，并依据该扇出自己的时间戳累计已用时间，即使父级已经继续向前。重新加载后保持相同的分组划分。
- **关联规格**：`04-ux/08-component-spec.md` §9.9，ADR 0062，
  decisions-log D265，D319
- **验收**：C（对话）、Quality
- **里程碑**：M6+
- **状态**：单测已覆盖（`assistant-turns.test.mjs`，
  `subagent-topology.test.mjs`，`subagent-transcript.test.mjs`）；桌面旅程待完成（仅当该界面发生变化时在具备能力的环境中运行）
#### E2E-180：已发送的文件引用保持为徽标并可点击打开

- **前置条件**：一个 Agent 会话，其工作区包含一个嵌套的源文件、一个 HTML 文件，以及一个文件名含空白的文件；另有一个项目组，其第二个文件夹中持有自己的一个源文件。Composer 还可以将 OS 文件粘贴到会话暂存区。内置的 File Manager 插件已加载。
- **步骤**：1) 通过 Composer 徽标附加一个工作区源文件、一个工作区 HTML 文件、一个名称含空白的文件和一个粘贴的暂存文件，然后发送。2) 检查用户气泡。3) 点击 HTML 徽标，然后点击工作区源文件徽标，再点击暂存文件徽标。4) 附加位于项目第二个文件夹中的文件并点击其徽标。
- **预期**：
  - 每个已发送的引用渲染为紧凑的叶子名徽标（图标 + 名称），而不是完整的 `@path`。工具提示和无障碍名称保留规范路径。带引号的路径和暂存区绝对路径也包含在内。
  - 一个徽标加上一个简短提示会使用户面板保持内容自适应大小；它不会拉伸到 `min(82%, 600px)` 的上限。
  - 点击 HTML 徽标会在工作面板浏览器中打开该文件。
  - 点击工作区源文件徽标会在 File Manager 工作面板视图中打开该文件；宿主 `file:` 标签页和 OS 默认应用不再是徽标点击打开的目标。
  - 点击暂存文件徽标会在该文件的绝对路径上打开宿主 `file:` 标签页，因为它位于 File Manager 的项目根之外。
  - 点击项目第二个文件夹中文件的徽标，会在 File Manager 视图中打开该文件：补全搜索整个项目组，主文件夹优先，兄弟文件夹中的文件以绝对路径寻址，因为相对路径总是指主文件夹（ADR 0263）。
  - 持久化的用户消息仍包含供代理使用的规范 `@path` 文本。
- **关联规格**：`04-ux/08-component-spec.md` §8.3 / §11.8，
  `04-ux/09-interaction-patterns.md` §8a.2，`03-runtime/01-ipc-protocol.md`，
  ADR 0163，ADR 0241，ADR 0262，ADR 0263，`08-meta/decisions-log.md`（D320）
- **验收**：C（对话与流）、Quality
- **里程碑**：M5
- **状态**：单测已覆盖（`chat-links.test.mjs`，`transcript-file-chips.test.mjs`，
  `fs-panel-guard.test.mjs`，`transcript-style.test.mjs`）；完整 UI 旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-CHAT-shorthand-file-ref-opens-the-matching-file

- **前置条件**：一个项目组，其主文件夹包含 `img/openimage.js`、`src/dir/a.ts` 和一个更深的第二个 `dir/a.ts`（例如 `packages/app/dir/a.ts`），其第二个文件夹包含 `lib/only-here.ts`。已打开会话的暂存区持有一个同叶子名的文件 `openimage.js` 和一个任何项目文件夹都没有的文件；附件存储持有一个 `attachments/<sha256>` blob。转录渲染 assistant markdown。
- **步骤**：1) 发起一个回复中以行内代码形式提及 `openimage.js` 的回合并点击它。2) 发起一个提及 `dir/a.ts` 的回合并点击它。3) 发起一个提及仅存在于暂存区的文件的回合，点击它，然后对 `attachments/<sha256>` 引用做同样的操作。4) 发起一个提及某项目文件绝对路径的回合（该文件的叶子名也存在于暂存区），并点击它。5) 发起一个提及 `missing-helper.js` 的回合并点击它。6) 发起一个提及 `only-here.ts` 的回合并点击它。
- **预期**：
  - 点击 `openimage.js` 打开项目的 `img/openimage.js`，尽管暂存区持有同叶子名的文件：在考虑暂存区之前，会先对项目进行穷尽搜索。
  - `dir/a.ts` 打开 `src/dir/a.ts`：精确路径胜过简写，更长的匹配尾部胜过裸叶子名，尾部长度相同时最浅的候选胜出，因此更深的 `packages/app/dir/a.ts` 永远不会被打开。
  - 项目无法回答的引用在会话暂存区中解析；两者都无法回答的在附件存储中解析，且 `attachments/<sha256>` 引用打开已存储的 blob。
  - 指向已知根内真实文件的绝对引用直接胜出，无论哪个简写本会匹配。
  - `only-here.ts` 打开第二个文件夹的 `lib/only-here.ts`：先对主文件夹进行穷尽搜索，然后按项目组自身的顺序搜索项目组的其他文件夹，匹配结果会标明回答它的文件夹（ADR 0263）。
  - 从兄弟文件夹回答的文件以绝对路径寻址到工作面板，而主文件夹中的文件保持项目相对路径（ADR 0263）。
  - 无任何匹配的引用弹出错误 toast，内容为 `No file matches missing-helper.js`，且不打开任何内容：不新建工作面板标签页、不出现空面板、不出现空白的侧边浏览器页面，工作面板和转录保持其已有内容。
- **关联规格**：`03-runtime/01-ipc-protocol.md` § fs，
  `04-ux/09-interaction-patterns.md` §8a.2，ADR 0124，ADR 0163，ADR 0249，
  ADR 0262，ADR 0263
- **验收**：C（对话与流）、D（工作区）、Quality
- **里程碑**：M5
- **状态**：单测已覆盖
  （`apps/desktop/test/chat-ref-resolve.test.mjs`）；完整 UI 旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-CHAT-file-ref-opens-the-surface-that-owns-it

- **前置条件**：内置的 File Manager 插件已加载并启用，工作面板处于关闭状态。已打开会话的暂存区持有一个文件，附件存储持有一个 blob。项目是一个项目组，其主文件夹包含一个 `.html` 页面和一个文本文件，其第二个文件夹持有自己的一个文本文件。同一会话的转录带有一个摘要中提及项目文件的 `Read` 行、一个列出项目路径的 `Glob` 结果，以及一个按文件对命中分组的 `Grep` 结果。
- **步骤**：1) 点击 assistant 回复中的一个项目文件引用。2) 在该视图中输入未保存的编辑，再次点击同一引用。3) 点击一个解析到会话暂存区的引用，然后点击 `attachments/<sha256>` 引用。4) 点击 assistant 回复中的工作区 `.html` 引用，以及作为已发送用户徽标的同一引用。5) 点击工具行摘要中的文件路径，然后点击 `Glob` 结果文件列表中的路径和 `Grep` 结果的路径标题。6) 禁用 File Manager 插件，再次点击项目文件引用和工具行摘要，然后重新启用插件并再次各点击一次。7) 点击一个解析到项目第二个文件夹的引用，然后点击一个解析到主文件夹的引用。
- **预期**：
  - 项目文件在 File Manager 工作面板视图中打开该文件，其祖先文件夹展开且该文件被选中；不会为其新增宿主 `file:` 标签页。
  - 再次点击同一引用不会重新加载视图：未保存的编辑仍在编辑器中，且不会出现第二个标签页。
  - 暂存区或附件文件在“打开的资源”下的宿主 `file:` 标签页中以其绝对路径打开，绝不在 File Manager 视图中打开。
  - 项目主文件夹中的 `.html` / `.htm` 页面在工作面板侧边浏览器中打开，无论从 assistant 回复还是用户徽标点击；兄弟文件夹中的页面与任何其他项目文件一样在 File Manager 视图中打开，因为侧边浏览器以主文件夹为根（ADR 0263）。
  - 工具界面到达它所命名文件的目标位置，而不是它自身的目标：工具行的摘要路径以及 `Glob` 文件列表和 `Grep` 路径标题中的路径，都在 File Manager 视图中打开同一个项目文件。是链接的摘要路径直接打开文件而不展开该行，只有当摘要没有可解析目标时才回退到行自身的展开行为。
  - 解析到项目第二个文件夹的引用在 File Manager 视图中打开该文件，通过其绝对路径到达，不新增宿主 `file:` 标签页；来自主文件夹的引用在同一视图中以项目相对路径寻址打开（ADR 0263）。
  - 插件被禁用时，项目文件引用——无论来自回复还是来自工具行或结果列表——回退到宿主 `file:` 标签页，即这些点击此前使用的界面，现在它也能到达项目的其他文件夹；重新启用插件会恢复 File Manager 目标位置。
- **关联规格**：`04-ux/08-component-spec.md` §8.3，§9.6，
  `04-ux/09-interaction-patterns.md` §8a.2，ADR 0104，ADR 0163，ADR 0241，
  ADR 0249，ADR 0262，ADR 0263
- **验收**：C（对话与流）、G（插件）、Quality
- **里程碑**：M5
- **状态**：单测已覆盖
  （`apps/desktop/test/transcript-file-chips.test.mjs` 用于接线，
  `apps/desktop/test/tool-row-file-refs.test.mjs` 用于每种解析形态产生的工作面板入口）；完整 UI 旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-181：导入的 skill 出现在下一个会话目录中

- **前置条件**：Settings > Agent > Skills 已打开。一个符合约定的 `<skill>/SKILL.md` 文档具有非 ASCII 的 frontmatter 名称和折叠式 YAML 描述。在 skill 将被导入的同一项目上有一个空的 Agent 会话可用。
- **步骤**：
  1. 将 `SKILL.md` 导入 Global，然后导入所选项目。
  2. 确认 Skills 页面显示展示名、ASCII id（目录名，而非 `skill`）和扁平化的描述。
  3. 在该项目上启动一个新的 Agent 会话，并要求代理按展示名使用该 skill。
  4. 用另一个同样缺少 ASCII 名称的目录 skill 重复，并用一个描述为 `|` 块的 skill 重复。
- **预期**：
  - 导入成功。目录列出两个 skill，且 id 各不相同。
  - 下一个会话的系统提示包含每个 skill 的 id、名称和扁平化描述。`Skill` 工具按该 id 加载正文。
  - 拼错的 `Skill` id 会在可用 skill 中列出用户 skill id，而不仅是插件 id。
  - 两份文档都不会因为标题为非 ASCII 或因为两个文件都名为 `SKILL.md` 而被丢弃。
- **关联规格**：`03-runtime/01-ipc-protocol.md` §12b，
  `07-plugins/01-plugin-system.md` §12.3，`08-meta/decisions-log.md`（D174，
  D194）
- **验收**：E（工具与权限）、Quality
- **里程碑**：M5
- **状态**：单测已覆盖（host-core `user_skills` / `agent_capabilities`
  测试，`apps/desktop/test/plugin-skills.test.mjs`）；完整 UI 旅程为 Draft
  （仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-182：聊天与 markdown 预览中的相对文件路径可以打开

- **前置条件**：一个 Agent 会话，其工作区包含
  `apps/desktop/src/App.tsx`、`docs/adr/0163-transcript-file-reference-chips.md`、
  `docs/spec/00-baseline.md`，以及一个 Unicode 命名文件，例如 `报告.pdf`。
- **步骤**：1) 打开一个转录中已包含 assistant markdown 的既有会话。2) 发起一个 assistant 回复以裸路径、行内代码、Unicode 路径（例如 `报告.pdf`）和 markdown 链接形式提及 `apps/desktop/src/App.tsx` 的回合。3) 逐一点击。4) 在工作面板文件查看器中打开该 ADR markdown 文件，并点击一个 `../spec/00-baseline.md` 链接。5) 在聊天中包含一个工作区下的绝对路径、一个工作区外的绝对路径和一个 `~/` 路径；确认只有根内的路径成为可点击目标。
- **预期**：
  - 打开会话时转录正常绘制，不抛错。
  - 每个聊天路径都在 File Manager 工作面板视图中打开 `apps/desktop/src/App.tsx`——聊天点击优先的文件视图——而不是宿主 `file:` 标签页。
  - 工作区内的 Unicode 文件名和多段路径会成为目标，而工作区外的绝对路径和 `~/` 路径保持纯文本。
  - 工作区下的绝对路径解析为其工作区相对目标。
  - markdown 文件中的 `../` 链接打开 `docs/spec/00-baseline.md`，而不是工作区根下的 `spec/00-baseline.md`。
  - 来自 `docs/adr` 的 `../../../outside.ts` 链接保持惰性不可点。
- **关联规格**：`04-ux/08-component-spec.md` §8.3，
  `08-meta/decisions-log.md`（D322）
- **验收**：C（对话与流）、D（工作区）、Quality
- **里程碑**：M5
- **状态**：单测已覆盖（`chat-links.test.mjs`，
  `markdown-prose-style.test.mjs`）；完整 UI 旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-185：外部 URL 打开仅限于 http(s) 和 mailto

- **前置条件**：聊天转录可以渲染 markdown 链接。一个插件被授予 `shell.openExternal`。工作面板预览可以加载 http 页面和工作区 HTML 文件。
- **步骤**：1) 修饰键点击 https、mailto、`file:`、`javascript:`、
  `ms-msdt:` 和一个自定义协议的 markdown 链接（`target="_blank"`）。
  2) 从插件调用 `pi.shell.openExternal`，分别传入 https、mailto 和 `file:`。3) 在嵌入式预览中，用 `window.open` 打开一个 https URL 和一个 `file:` URL；对 http 页面和工作区 HTML 文件使用“在浏览器中打开”。
- **预期**：
  - https 和 mailto 在 OS 处理器中打开。`file:`、`javascript:`、
    `data:`、`ms-msdt:` 和自定义协议不会。
  - 插件的 `file:` 以 `INVALID_ARGUMENT` 失败；mailto 成功。
  - 预览中对非白名单协议的 `window.open` 在应用内被拒绝，且不调用 `openExternal`。
  - http(s) 的“在浏览器中打开”使用 `openExternal`；根内文件预览使用 `openPath`，而不是通过 `openExternal` 走 `file:` URL。
- **关联规格**：`05-security/01-security.md`，
  `07-plugins/04-plugin-security.md` §8，`07-plugins/03-plugin-api.md`，
  ADR 0109，ADR 0168，`08-meta/decisions-log.md`（D330）
- **验收**：Security
- **里程碑**：M5
- **状态**：单测已覆盖（`safe-open-external.test.mjs`，
  `feedback.test.mjs`）；完整 UI 旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-186：Token 用量仪表盘由插件持有；宿主仍存储回合总计

- **前置条件**：一个 profile 带有至少一个在本构建之后报告了 provider 用量的已完成 Agent 回合。Settings 可达。插件 `pi.token-insights` 可能已安装。
- **步骤**：1) 完成一个同时结算了子代理的回合。2) 打开 Settings。3) 在设置搜索中查找“tokens”/“用量”。4) 从命令面板（`usage` / `用量`）打开 Token Insights。5) 确认转录的 assistant 徽标。
- **预期**：
  - 侧栏没有 Usage / 用量 目标页。Preferences 为 General、AI、
    Shortcuts。
  - 设置搜索不会浮现用量标签页。
  - `stats.getTokenUsageHistory` 仍返回包含子代理花费的已完成回合总计。
  - 转录下方的 assistant 徽标仍仅显示父级的 provider 用量。
  - Token Insights 是热力图 / KPI 仪表盘。插件安装后，来自宿主回合表的 PI-Desktop 余额会出现在其中，无需改写 `message.usage`。
- **关联规格**：`04-ux/06-settings-ia.md`，
  `03-runtime/01-ipc-protocol.md`，`03-runtime/06-host-rpc-protocol.md`，
  ADR 0171，ADR 0173，`08-meta/decisions-log.md`（D331，D335）
- **验收**：F（持久化）、Quality
- **里程碑**：M5
- **状态**：单测已覆盖（agent-runtime 用量拆分、host-core 历史聚合、
  settings-search / i18n 目录）；插件余额合并由 `pi-desktop-plugins` 覆盖；完整 UI 旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-187：历史附件和本地 markdown 图片内联渲染

- **前置条件**：一个 Agent 会话，其工作区包含
  `docs/pixel.png`。用户此前粘贴过一张图片，因此会话 JSONL 存储了一个带存储 mimeType 的 `attachments/<sha256>` 图片引用。
- **步骤**：
  1. 重新打开会话。确认粘贴的图片渲染为缩略图，而不仅是文件徽标。
  2. 点击缩略图。确认宿主文件查看器打开该附件引用并显示图片。
  3. 发送一个 assistant markdown 包含 `![](docs/pixel.png)` 和
     `![](/etc/passwd)` 的回合。确认工作区图片内联渲染，而根外路径不加载文件字节。
  4. 确认以 `ref: "/etc/passwd"` 和
     `mimeType: "image/png"` 调用 `fs/readImageDataUrl` 返回 `missing`，而不是 data URL。
- **预期**：
  - 根内的图片引用在 5MB 上限之内内联显示。
  - 根外路径以及对非图片扩展名的 mime 伪装保持关闭。
  - 点击已解析的缩略图打开宿主 `file:` 标签页，而不是 OS 处理器。
- **关联规格**：`03-runtime/01-ipc-protocol.md`，
  `04-ux/08-component-spec.md` §8.3，ADR 0172，`08-meta/decisions-log.md`（D334）
- **验收**：C（对话与流）、D（工作区）、Security、Quality
- **里程碑**：M5
- **状态**：单测已覆盖（`fs-panel-guard.test.mjs`，
  `message-image-display.test.mjs`）；完整 UI 旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-188：插件宿主 API 列出模型、读取进行中上下文并完成补全

- **前置条件**：至少一个已认证的 provider；一个被授予 `models.list`、`session.read` 和 `agent.complete` 的开发插件；一个带有先前用户回合的 Agent 会话。
- **步骤**：
  1. 从插件进程调用 `pi.models.list()`。确认只返回就绪的模型，且不出现任何机密字段。
  2. 在工具执行之外调用 `pi.session.getLlmContext()`。确认返回
     `INVALID_ARGUMENT`。
  3. 让 Agent 调用插件工具。在 `execute` 内部，调用
     `getLlmContext()`，然后调用 `agent.complete({ modelKey, includeSessionContext:
     true })`。确认工具结果包含审阅者文本和用量，而不是机密。
  4. 重复 `agent.complete`，直到 60 秒内的第八次调用成功、第九次返回 `RATE_LIMITED`。
  5. 让补全在 provider 处失败（例如一个凭据已被用户撤销的模型）。确认插件读到的是分类码——`PROVIDER_UNAUTHORIZED`——而不是通用失败。
  6. 停止 host-core 并调用 `pi.models.list()`。确认返回 `[]` 且没有警告行。
  5. 停止 host-core 并调用 `pi.models.list()`。确认返回 `[]` 且没有警告行。
- **预期**：凭据绝不离开 Electron main。审计行记录插件 id、模型键、大小和用量——不记录转录或补全文本。Plan 仍然对插件工具返回 `PLUGIN_DISABLED_IN_PLAN`。死亡的宿主传输返回空的模型列表且无警告（D080）。
- **关联规格**：`07-plugins/03-plugin-api.md`，
  `07-plugins/13-plugin-permissions-matrix.md`，ADR 0174，D336
- **验收**：G（插件代理工具）、Security
- **里程碑**：M5
- **状态**：单测已覆盖（`plugin-complete.test.mjs`，
  `plugin-session-context.test.ts`，`subagent-wiring.test.mjs`）；完整 UI
  旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-189：内置 Advisor 插件暂时不可用

- **前置条件**：PI-Desktop 的打包构建或开发构建。
- **步骤**：
  1. 检查内置插件资源，确认 `pi.advisor` 不存在。
  2. 打开命令面板和插件设置。确认 `/advisor`、Advisor 插件及其 `advisor` 工具均不存在。
- **预期**：临时移除不会暴露任何 Advisor 命令、插件、面板、skill 或代理工具。通用的宿主持有的插件补全 API 仍对显式安装的插件可用。
- **关联规格**：`07-plugins/03-plugin-api.md`，ADR 0174，D336
- **验收**：G（插件代理工具）、C（对话）
- **里程碑**：M5
- **状态**：单测已覆盖（`bundled-plugins.test.mjs`）；完整 UI 旅程为 Draft
  （仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-190：Settings Network 代理应用于应用自有 HTTP

- **前置条件**：一个可达的本地 HTTP 或 SOCKS5 代理，或一个用于失败路径的已知坏端口。一个已配置的 provider/model，其端点可通过该代理到达，用于模型请求步骤。
- **步骤**：
  1. 打开 Settings → General。确认有一个 Network 卡片，其 Proxy 模式为
     System、Direct 和 Custom。在从未设置过代理的 profile 上选中 System。
  2. 选择 Custom。确认出现 Proxy URL 字段、Bypass 默认为
     localhost / 127.0.0.1 / ::1 / `<local>`，以及 Test。输入
     `not-a-proxy` 并移开焦点。确认出现行内无效 URL 错误，且设置未被保存。
  3. 输入 `socks5://127.0.0.1:1080` 或 `http://127.0.0.1:7890` 并移开焦点。
     确认 `settings.get` 之后 `AppSettings.networkProxy.mode` 为 `custom`。
  4. 对一个正在监听的代理点击 Test。确认显示 Connected 状态。对一个已关闭的端口点击 Test。确认显示失败状态且已保存的 URL 不变。对需要相应凭据的代理分别输入 `http://user:pass@127.0.0.1:<auth-port>` 和
     `socks5://user:pass@127.0.0.1:<auth-port>`。确认 Test 报告 Connected 而不是
     `net::ERR_NO_SUPPORTED_PROXIES`（issue #490）。
  5. 在 Custom 已保存的情况下，通过已配置的 provider 发送一个简短提示。
     确认 provider 请求和响应经过代理，包括 SOCKS5 代理在一个
     TCP 分块中返回完整 bind 响应的情况。确认随后的 marketplace 刷新和 models.dev
     目录刷新使用该代理（host-core curl `--proxy`，Electron
     `net.fetch`），并确认 Bypass 中的回环 URL 不走代理。
  6. 切换到 Direct，然后切换到 System。确认 Chromium 依次回到
     `mode: "direct"` 和 `mode: "system"`，且 sidecar 在无需重启应用的情况下完成重新配置。
- **预期**：Custom 覆盖模型调用、marketplace、更新、插件
  `net.fetch` 和应用内浏览器。Workspace Bash 的 `env` 不显示来自该设置的
  `HTTP_PROXY` / `ALL_PROXY`。OAuth 仍打开系统浏览器。无效协议（`file:`、`ftp:` 和 SOCKS4）以及格式错误的百分号编码凭据被拒绝。带认证的 HTTP 和 SOCKS5
  URL 可以 Test 并应用，且不会出现 `net::ERR_NO_SUPPORTED_PROXIES`（issue #490）。
  无协议或 schema 版本提升。
- **关联规格**：`04-ux/06-settings-ia.md`，
  `03-runtime/07-process-model.md`，ADR 0177，D340
- **验收**：B（设置）、F（providers）、Security
- **里程碑**：M5
- **状态**：单测已覆盖（`network-proxy.test.ts`，`node-proxy.test.ts`，
  `authenticated-proxy-relay.test.ts`，`settings-general.test.mjs`，
  host-core `network_proxy` 测试）；格式错误的凭据和不支持的
  SOCKS4 协议由共享解析器测试覆盖；完整 UI 旅程为
  Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-191：新发出的 AppError 码保持已注册

- **前置条件**：共享包测试套件可用。
- **步骤**：
  1. 运行共享错误辅助函数测试。
  2. 检查测试所用的新发出的运行时与 Edit 错误码列表。
- **预期**：本次更新引入的每个错误码，包括
  context-compaction、empty-response 和 Edit 恢复失败，都存在于
  `packages/shared/src/errors.ts` 中，且键与值完全一致。保留码在被发出之前保持排除。
- **关联规格**：`03-runtime/08-error-codes.md`
- **验收**：Quality
- **里程碑**：M5
- **状态**：单测已覆盖（`packages/shared/src/errors.test.ts`）；完整 UI
  旅程不适用

#### E2E-209：导入从本地代理存储复制模型配置

- **前置条件**：`~/.claude/settings.json`、`~/.codex/config.toml` `[model_providers.*]`、
  `~/.config/opencode/opencode.json`、`~/.pi/agent/models.json` 或
  `~/.cc-switch/cc-switch.db` 之中至少存在一个受支持的本地配置，其中包括两个端点相同但密钥不同的 API-key profile，以及可选的一个仅 OAuth 的 vendor。
  PI-Desktop 可能已存在等价的 provider。
- **步骤**：
  1. 打开 Settings → Import。确认有 Sessions 卡片和 Model
     configuration 卡片，各自带有独立的 Scan。
  2. 扫描模型配置。确认分组默认折叠，行显示名称、模型数量、host，以及 API key / No API key 徽标，且 UI 或扫描 IPC 载荷中不出现任何机密值。
  3. 导入选中的 providers。确认两个同端点的 profile 作为独立行出现在 Settings → Models 下，并在 Composer 模型菜单中保持可选。再次导入相同选择，确认那些未变化的凭据被跳过。
  4. 如果应用此前没有默认模型，确认第一个导入的 provider 成为默认值。如果默认值已存在，确认它保持不变。
  5. 确认仅 OAuth 的源账户不出现在候选列表中，且会话导入仍可独立工作。
- **预期**：仅显式扫描（D007）。存储的 API key 落入宿主机密存储。只有等价的 provider（归一化 URL + API 风格 + 相同凭据）会被跳过；同一端点下的不同凭据保持独立。无协议或 schema 版本提升。
- **关联规格**：`04-ux/06-settings-ia.md`，
  `04-ux/08-component-spec.md` §18.5，`03-runtime/01-ipc-protocol.md`，
  `03-runtime/11-provider-model-system.md`，ADR 0179，D342
- **验收**：B（模型配置）、F（会话导入）
- **里程碑**：M4
- **状态**：单测已覆盖（`packages/shared/src/model-config-import.test.ts`，
  `apps/desktop/test/model-config-import.test.mjs`）；完整 UI 旅程为 Draft
  （仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-210：文档截图从 GitHub 与 VitePress 解析

- **前置条件**：仓库包含位于 `docs/public/screenshots/app/` 的图库资源；文档依赖已安装。
- **步骤**：
  1. 从 GitHub 文件视图打开 `docs/guide/screenshots.md`。确认图库图片解析到 `docs/public/screenshots/` 下的文件。
  2. 在 VitePress 预览中打开截图页面。确认首页、面板和设置部分的代表性图片正常渲染。
  3. 确认导航 logo 加载 `docs/public/app-icon.png`。
  4. 确认页脚包含指向 `https://aiuo.net` 的 `AIUO.NET` 链接。
  5. 运行 `pnpm docs:build` 并检查生成的页面是否存在图片加载失败。
- **预期**：GitHub 渲染每张图库图片，而不是请求仓库根部的 `/screenshots/` 路径；VitePress 页面从同一份已签入的资源渲染图库。导航使用应用图标，页脚暴露 `https://aiuo.net` 链接，且文档构建成功。
- **关联规格**：ADR 0079，`docs/README.md`，
  `docs/guide/screenshots.md`
- **验收**：Quality
- **里程碑**：M5
- **状态**：静态/文档检查已覆盖（`pnpm docs:build` 和路径审计）；远程 GitHub 与浏览器旅程待完成

#### E2E-196：聊天链接遵循目标设置和上下文菜单操作

- **前置条件**：聊天转录可以渲染 HTTP(S) Markdown 链接。工作面板的 Browser 视图和系统浏览器打开器可用。剪贴板可被观察或打桩，用于复制操作。
- **步骤**：
  1. 在 Settings → AI → Defaults 中选择 **Work panel browser**，并点击聊天回复中的链接。
  2. 选择 **Default OS browser**，再次点击同一链接。
  3. 右键点击链接，用指针激活每个上下文菜单项：Open in default browser、Open in work panel 和 Copy link address。再用键盘焦点和 Arrow/Home/End 导航重复这些菜单操作。
  4. 在按住 Ctrl/Cmd、Shift 和 Alt 的情况下重复链接点击。
- **预期**：
  - Work panel browser 是默认的普通点击目标。
  - Default OS browser 设置将聊天、转录和插件的 HTTP(S) 点击经由 main 持有的外部打开器路由，包括 assistant 回复中的 markdown 链接、自动链接的 URL 和行内代码 URL；更改该设置在重新加载后保持持久。
  - 正文级上下文菜单在被点击时保持可交互。其外部与工作面板操作打开所请求的目标，Copy link address 在显示成功 toast 之前更新剪贴板。被拒绝的剪贴板写入显示错误 toast，而不是成功 toast。
  - 修饰键点击无论设置如何都继续在外部打开链接。
  - 想要工作面板的插件/设置点击会返回聊天以便停靠栏可见，且不记录导航跳点。缺失的会话回退到 OS 浏览器。
  - Workspace HTML 预览、BrowserPreview、OAuth 和 Feedback 保持其既有目标。
- **关联规格**：`04-ux/06-settings-ia.md`，
  `04-ux/08-component-spec.md` §8.3，`03-runtime/01-ipc-protocol.md`，
  `08-meta/decisions-log.md`（D330）
- **验收**：B（设置）、C（对话与流）、Security、Quality
- **里程碑**：M5
- **状态**：单测已覆盖（`apps/desktop/test/markdown-link-menu.test.mjs`、
  locale 目录测试、`apps/desktop/test/open-http-url.test.mjs`）；完整 UI
  旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-201：为已配置模型设置别名并复制模型 id

- **前置条件**：一个已保存且至少带有两个模型绑定的 provider，其中至少一个由目录发布展示名。
- **步骤**：1) 打开 Settings → 模型配置并重新打开该 provider。2) 在实时模型列表中拖选一个模型 id 并复制它；确认剪贴板持有该 id，且该行的复选框未切换。3) 在不选中文本的情况下点击同一行的复选框；确认它仍会切换。4) 在选定行上展开 Advanced 并输入一个短别名。5) 保存并打开 Composer 模型选择器；确认别名命名了该模型，而另一行保留其发布名。6) 分别按别名和真实 id 搜索选择器；两者都能到达该行。7) 清空别名，保存，确认发布的展示名恢复。8) 重新输入别名，保存，重新打开 provider，重启应用，确认别名仍在。9) 在别名输入框中输入超过 60 个字符；确认字段只保留前 60 个，然后直接发送一个带 61 字符别名的 `providers.update` RPC，确认它以 `MODEL_ALIAS_TOO_LONG` 失败。
- **预期**：别名仅是显示标签——provider 请求仍携带 `models[].id`，配置行在别名徽标旁仍显示真实 id。模型 id 和名称在不可选中的外壳内可被选中，携带选区的点击绝不会切换行复选框。空白或已清空的别名回退到目录展示名。
- **关联规格**：`03-runtime/12-provider-config-schema.md`，
  `04-ux/08-component-spec.md`，ADR 0192
- **验收**：B（模型配置）、Quality
- **里程碑**：M2
- **状态**：单测已覆盖（`composer-models.test.mjs`，
  `provider-model-config.test.mjs`）；渲染 UI 旅程为 Draft（仅当该界面发生变化时在具备能力的环境中运行）

#### E2E-MODEL-selected-order-persists：所选模型顺序在保存后保持

- **前置条件**：一个 AI 服务和一个 OAuth vendor 账户各自拥有至少三个已选模型。包含一个带别名和非默认 Advanced 设置的模型。记录它们的绑定值、应用级默认 provider/model，以及一个显式绑定会话的模型选择。一个可控的保存响应可用于使任一编辑器保持忙碌。
- **步骤**：
  1. 打开 Settings → 模型配置并编辑该 AI 服务。通过手柄将最后一个已选模型拖到第一行之前，然后再拖到最后一行之后。确认插入位置和结果顺序。
  2. 按此顺序配置所选 ID：`shown-a`、`hidden-a`、
     `shown-b`、`hidden-b`、`shown-c`。按 `shown-` 过滤，然后将 `shown-c` 拖到 `shown-a` 之前。清除过滤并检查全部五个绑定。
  3. 再次应用过滤。聚焦 `shown-c` 的排序手柄并按 Down，然后按 Up。确认它每次都越过相邻的可见行，且焦点保持在被移动模型的手柄上。对第一个可见模型按 Up、对最后一个按 Down；两者都不改变顺序。
  4. 开始一次拖动并取消，然后开始另一次拖动并放置到所选行之外。两个操作都不改变草稿顺序。
  5. 在发现列表和已选窗格中拖选并复制一个模型 ID。确认不发生重排或复选框切换。点击发现列表的复选框、切换 Advanced、编辑别名、移除一个已选模型；每个操作都保持其既有行为，不触发拖动。
  6. 保存重排后的绑定，重新打开编辑器，然后重启应用并再次重新打开。检查顺序、别名、模型 ID 和 Advanced 设置。检查 provider 默认值和既有会话。在将该服务设为应用默认 provider 的情况下、以及在另一个默认 provider 的情况下重复。
  7. 再次更改顺序，取消编辑器，然后重新打开。上次保存的顺序保持不变。
  8. 在 vendor 账户编辑器中重复拖动、键盘、保存/重开和取消检查，包括带有隐藏已选绑定的过滤列表。
  9. 让一次保存保持在途，尝试拖动和键盘重排。释放该保存，然后过滤到只剩一个可见的已选行再尝试。
- **预期**：两个编辑器都持久化完整的有序绑定数组。在步骤 2 中，完整顺序变为 `shown-c`、`shown-a`、`hidden-a`、`shown-b`、
  `hidden-b`；隐藏的绑定保持存在并保留其相对顺序。移动绑定绝不会重置其 ID、别名或 Advanced 覆盖。保存使 provider 的兼容性默认值保持在头部绑定。当该服务或账户是应用的默认 provider 时，保存还会将应用默认模型更新为头部绑定，从而保留 E2E-005A 的既有行为。
  编辑另一个 provider 不会改变应用默认值。已显式
  绑定的会话保留其存储的模型选择。
  取消或拖到界外的拖拽不会改动草稿；编辑器取消会
  丢弃未保存的移动；忙碌或只有单行可见的表单会禁用
  重排序手柄。文本复制与现有行操作保持独立。
- **关联规范**：`03-runtime/13-model-catalog-and-selection.md` §2，
  `03-runtime/12-provider-config-schema.md`；ADR 0114、ADR 0192
- **验收**：B（模型配置）、F（持久化）、质量
- **里程碑**：M6+
- **状态**：已记录；完整的桌面端旅程尚未运行。

#### E2E-202：子代理的 thinking 遵循其精确的模型绑定

- **前置条件**：某个已配置的 provider 有一个标记为
  `availableForSubagents` 的模型绑定。模型目录要么将该模型报告为
  非推理模型，要么缺少该绑定显式启用的某个级别。某个
  用户子代理定义和内置的 `Task` 目录均可用。
- **步骤**：1) 在 Settings → Model configuration 中，为委派模型启用
  `medium` 和 `high`，并将其标记为可用于子代理。2) 将该
  子代理定义的 thinking 级别设为 `high`，保存并重启应用。
  3) 带着其 frontmatter 模型钉选运行该定义。4) 运行一个内置项，
  用 `Task.model` 选择同一绑定，覆盖按需解析
  路径。5) 在父会话设为 `medium` 的情况下，
  运行一个没有模型钉选的定义。
- **预期**：钉选的和显式选择的委派对象保留该
  绑定所启用的 thinking 级别，并发送所选的非 `off` 级别，即使
  models.dev 声称推理不可用或只发布了稀疏的级别集合。未
  钉选的委派对象继承父级的有效级别。没有
  非 `off` 级别的绑定仍然解析为 `off`。
- **关联规范**：`03-runtime/02-agent-runtime.md`、
  `03-runtime/11-provider-model-system.md`、ADR 0144 / D283
- **验收**：B（模型配置）+ C（聊天/流式）+ 质量
- **里程碑**：M6+
- **状态**：单测/接线已覆盖（`model-capabilities.test.ts`、
  `apps/desktop/test/subagent-wiring.test.mjs`）；完整 UI 旅程为草稿（除非
  明确要求，否则不在本地运行 E2E）

#### E2E-203：省略子代理 thinking 覆盖，并在深色模式下读取所选级别

- **前置条件**：某个已配置的子代理模型支持推理，且
  应用同时具备浅色和深色主题。
- **步骤**：1) 打开 Settings → Agent → Subagents，查看 thinking
  选择器。2) 确认它包含 inherit-session、do-not-send、`off` 以及
  各规范级别。3) 选择 do-not-send，保存，并确认文档
  包含 `thinkingLevel: omit`。4) 通过一个具有
  有意义的适配器默认值的 provider 运行该子代理，并检查出站请求。5) 切换到
  深色模式，打开 Settings → Model configuration，展开某个模型的 Advanced
  区域，并选择多个 thinking 级别徽章。
- **预期**：inherit 继续使用父级级别；do-not-send
  会被持久化且不发送任何 provider thinking 覆盖；显式的 `off` 仍然是
  显式禁用。所选 thinking 徽章在两种主题下都具有实心高对比度填充
  和可读文本，且每个所选级别在视觉上
  可与滑轨区分。
- **关联规范**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/02-agent-runtime.md`、`03-runtime/13-model-catalog-and-selection.md`、
  `04-ux/06-settings-ia.md`、ADR 0194 / D356
- **验收**：B（模型配置）+ C（聊天/流式）+ 质量
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖；完整 UI 旅程为草稿（仅在此界面变化时于具备能力的环境中运行）

#### E2E-203a：会话 thinking omit 不发送 provider 覆盖

- **前置条件**：Composer 中选中了一个已配置的推理模型。
- **步骤**：1) 打开“模型 × 推理”菜单，确认 `omit` 是第一个
  推理选项，其后是该绑定启用的各规范级别。
  2) 选择 `omit`，确认徽章显示 `omit` 且会话存储了
  `thinkingLevel: omit`。3) 发送一轮对话并检查出站请求。
  4) 选择显式的 `off` 并再次发送。
- **预期**：`omit` 被持久化，且请求中没有 thinking/reasoning 字段。
  显式的 `off` 仍会序列化一个禁用。非推理模型保持只有
  `off` 的菜单。
- **关联规范**：`03-runtime/01-ipc-protocol.md`、
  `03-runtime/02-agent-runtime.md`、`03-runtime/13-model-catalog-and-selection.md`、
  ADR 0295 / D456
- **验收**：C（聊天/流式）+ 质量
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖；完整 UI 旅程为草稿

#### E2E-211：Windows 便携版 exe 无需安装程序即可启动（D364）

- **前置条件**：某个 Windows x64 标签或 `dist:win` 打包已通过共享的
  electron-builder 配置同时产出 `PI-Desktop-Setup-<version>.exe` 和
  `PI-Desktop-Portable-<version>.exe`；有一个干净的用户配置文件可用；
  账户为无管理员提权的标准用户。
- **步骤**：1) 检查发布目录和 `latest.yml`。2) 不运行
  NSIS 安装程序，直接启动便携版 exe。3) 确认进程
  环境包含 `PORTABLE_EXECUTABLE_FILE`。4) 调用 Check for Updates。
  5) 确认 Settings → Info 提供的是发布页面，而不是 Restart to
  update。6) 退出并重新启动同一个便携文件。
- **预期**：两个 Windows 产物文件名都不含空格且均已上传。`latest.yml`
  只指向 NSIS 安装程序。便携版 exe 无需安装
  向导或管理员提示即可启动，使用现有应用数据目录，
  并报告更新模式为 `manual`。有可用更新时不会下载或
  运行 `PI-Desktop-Setup-<version>.exe`。重新启动会从同一
  配置文件恢复会话。
- **关联规范**：`01-product/01-product-scope.md`、
  `06-delivery/06-release-runbook.md`、`03-runtime/07-process-model.md`、
  ADR 0197 / D364
- **验收**：质量（发布打包）
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖（`auto-update.test.mjs`）；原生
  Windows 启动仍需运行器验证（仅在此界面变化时于具备能力的环境中运行）

#### E2E-213：Composer 模型菜单的首帧绘制保留已配置别名

- **前置条件**：某个可运行的 provider 至少有一个已配置模型，
  具有非空别名，且该 ID 有已缓存或可发现的模型记录。
  应用已重启，或 provider 模型缓存已失效。
- **步骤**：1) 打开 Composer 的“模型 × 推理”徽章。2) 立即进入 Model
  子菜单并观察第一个可见帧。3) 保持菜单打开，
  直到缓存/实时模型刷新完成。4) 关闭并重新打开菜单。
- **预期**：第一个可见行已使用配置的别名（无别名时
  使用配置的 ID），列表在水合期间绝不闪现为空，
  也不会用目录名/线上 ID 替换别名。刷新后及下次打开时仍保持
  同一个显示名称；选择该行
  仍发送配置的模型 ID。
- **关联规范**：`03-runtime/13-model-catalog-and-selection.md`、
  `04-ux/08-component-spec.md`
- **验收**：质量（首帧稳定）、B（模型选择）
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖（`composer-models.test.mjs`）；
  完整 UI 旅程仍需运行器验证（仅在此界面变化时于具备能力的环境中运行）

#### E2E-214：插件会话导入与所有权边界

- **前置条件**：某个测试插件声明了两个 `contributes.sessionSources`
  条目，并且只获得 P0/P1 会话权限。第二个插件
  无权访问第一个插件的会话。
- **步骤**：1) 导入一个带有外部 project/provider/model 历史、
  user、assistant 和 tool 消息的会话。2) 重复同一导入，
  验证以相同的宿主生成 id 幂等跳过。3) 列出、获取并分页
  消息，包括倒序和内容截断。4) 尝试
  未声明的 source、system/running 消息角色、非法时间戳、
  超大/超深的 tool 值，以及逐一缺失各项权限。5) 从第二个插件重复
  list/get/messages/rename/delete。
- **预期**：source 声明与权限在 Electron 中、
  在宿主分发之前强制执行；id 由 host-core 生成；原始绑定
  仅作历史；返回的消息被标记为 external；保留的 tool 元数据
  被移除；非法输入以稳定错误码失败；第二个插件既看不到
  该行也看不到其转录。
- **关联规范**：`07-plugins/02-plugin-manifest-schema.md`、
  `07-plugins/03-plugin-api.md`、`07-plugins/13-plugin-permissions-matrix.md`、
  ADR 0200、D367
- **验收**：安全、质量
- **里程碑**：M6+
- **状态**：单测/RPC/接线已覆盖；完整 UI 旅程为草稿（仅在此界面变化时于具备能力的环境中运行）

#### E2E-215：插件批量与删除生命周期

- **前置条件**：测试插件可以调用 `session.importBatch`、rename
  和 delete。host-core 以空的 v14 数据库启动。
- **步骤**：1) 运行一个包含有效、重复和无效
  条目的 `skip` 批次。2) 运行一个包含一个无效或冲突条目的
  `fail` 批次，并验证该批次没有任何条目落库。3) 重命名一个
  自有会话并验证列表排序/元数据。4) 将其移入回收站，验证常规 core/插件读取会省略它，
  然后清除它，并再次导入同一个 external id。5) 测试 page-size、
  payload、batch-size 以及滚动导入/删除限制。6) 在
  迁移后的 v13 数据库上重启，并验证现有 core 会话保持活跃。
- **预期**：skip 是部分的，fail 是原子的；list/get/message 操作
  保持按所有权限定作用域；回收站仅能通过所有者清除恢复；
  purge 会删除转录文件并允许重新导入；越界返回
  `LIMIT_EXCEEDED`，滚动限制返回 `RATE_LIMITED`；迁移产生
  没有插件历史 project 行的 schema v14。
- **关联规范**：`03-runtime/04-data-storage.md`、
  `03-runtime/06-host-rpc-protocol.md`、ADR 0200、D367
- **验收**：安全、质量、恢复
- **里程碑**：M6+
- **状态**：宿主/RPC/单测已覆盖；完整 UI 旅程为草稿（仅在此界面变化时于具备能力的环境中运行）

#### E2E-PLUGIN-usage-listTurns：插件 usage 事实列表

- **前置条件**：某个测试插件被授予 `usage.read`。宿主数据库
  中有跨活跃会话和软删除会话的已完成轮次。
- **步骤**：1) 不带权限调用 `pi.usage.listTurns`。2) 带
  权限调用它，按游标分页，并按 session/project/window 过滤。
  3) 传入反转的边界、超过 365 天的窗口以及格式错误的
  游标。4) 确认返回行包含 token 计数器和标题，但没有消息
  正文，且回收站会话不出现。
- **预期**：缺少权限返回 `PERMISSION_DENIED`，且不会
  触达宿主。有效调用返回已完成轮次事实的键集分页。
  非法参数返回 `INVALID_PARAMS`。空标题为 `null`。
- **关联规范**：`07-plugins/03-plugin-api.md`、
  `07-plugins/13-plugin-permissions-matrix.md`、
  `03-runtime/06-host-rpc-protocol.md`、ADR 0173、D335
- **验收**：安全、质量
- **里程碑**：M6+
- **状态**：单测/RPC/接线已覆盖（`plugin-session-api.test.mjs`、
  host-core `plugin_usage`）；完整 UI 旅程为草稿

#### E2E-216：显式插件项目绑定与宿主所有的侧边栏刷新

- **前置条件**：某个测试插件具有 `project.create` 和 `session.import`
  权限，声明了一个 session source，且渲染器正显示
  现有侧边栏。有一个项目路径可用，且不改变当前
  工作区。
- **步骤**：1) 调用 `pi.project.create({ path })` 并记录返回的
  `projectId`。2) 用该 id 导入一个会话，再不带 id 导入一个会话。
  3) 在插件调用完成期间观察渲染器。4) 用同一个 external id 重复
  导入，然后重命名/删除一个自有会话。
- **预期**：项目创建返回一个持久 id，且不激活或
  替换当前工作区。只有带显式 id 的导入具有
  活跃的项目绑定；省略 id 时保持未绑定，其 `projectPath`
  仅作历史。每次成功的写入都会引发一次宿主所有的
  `pi-desktop/session/event/changed`，渲染器通过
  `refreshSessions()` 刷新，侧边栏不需要插件发出的事件。
  被跳过的导入不会触发冗余刷新，且已关闭的项目标签页
  不会仅仅因为其会话列表被刷新而重新打开。
- **关联规范**：`07-plugins/03-plugin-api.md`、
  `07-plugins/13-plugin-permissions-matrix.md`、`03-runtime/01-ipc-protocol.md`、
  `03-runtime/06-host-rpc-protocol.md`、ADR 0201、D368
- **验收**：C（会话）、安全、质量
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖；完整 UI 旅程为草稿（仅在此界面变化时于具备能力的环境中运行）

#### E2E-217：Windows 宿主在干净的 x64 模拟 ARM64 安装上启动

- **前置条件**：一台干净的 Windows 11 x64 或 ARM64 机器/配置文件，未
  单独安装 Visual C++ Redistributable、Node.js 或其他本地
  agent 运行时；x64 NSIS 安装程序可用。
- **步骤**：1) 安装 PI-Desktop。2) 首次启动它。3) 等待
  启动画面让位给主 shell。4) 检查运行时
  日志，然后打开 Settings → Info。
- **预期**：随附的 x64 `pi-desktop-host-core.exe` 启动并完成
  `app.handshake`，不出现 `0xC0000135`（`STATUS_DLL_NOT_FOUND`）；shell 不会
  停留在“Can't reach the local service”；宿主状态健康；
  Settings → Info 报告宿主版本而不是 `host unknown`。
  软件包使用静态链接的 MSVC CRT；无需单独的运行时安装程序。
  原生 Windows ARM64 产物仍不在范围内。
- **关联规范**：`03-runtime/07-process-model.md`、
  `06-delivery/06-release-runbook.md`
- **验收**：A（应用启动）、质量（干净安装打包）
- **里程碑**：M6+
- **状态**：源码契约已覆盖；干净机器上的 Windows x64 和 ARM64
  资格验证仍需运行器验证（仅在此界面变化时于具备能力的环境中运行）

#### E2E-218：提示词增强保留粘贴的图片徽章

- **前置条件**：有一个已配置、已认证的模型可用；某个 Agent
  会话的 Composer 草稿包含一个粘贴的图片徽章，其后跟着
  普通提示词文本。
- **步骤**：1) 将图片粘贴到 Composer 中，并在徽章之后输入提示词。
  2) 点击 `Enhance prompt`。3) 观察请求和更新后的
  Composer 草稿。4) 发送增强后的草稿并检查所派发的
  附件元数据。
- **预期**：图片徽章存在时 Sparkles 操作可用。
  一次性请求只包含可见的提示词文本，成功
  完成，并重写该文本。图片徽章仍位于
  草稿最前，仍可移除，并随
  增强后的提示词恰好被派发一次。增强不会创建转录行，也不会改变
  附件字节。请求由内置系统提示词和
  生效的用户模板构建：没有已保存覆盖时应用内置模板；
  在 Settings 中保存了覆盖时，则应用该文本（E2E-259）。
- **关联规范**：`04-ux/12-prompt-enhancement.md`、
  `04-ux/08-component-spec.md` §11.3/§11.7–11.8、
  `03-runtime/01-ipc-protocol.md` §13、
  `03-runtime/02-agent-runtime.md`
- **验收**：C（对话与流式）、质量
- **里程碑**：M6+
- **状态**：单测/源码契约已覆盖；完整 UI 旅程为草稿（仅在此界面变化时于具备能力的环境中运行）

#### E2E-259：提示词增强遵循可配置的用户模板

- **前置条件**：有一个已配置、已认证的模型可用；某个 Agent
  会话的 Composer 草稿为空；Settings -> AI 可到达。
- **步骤**：1) 打开 Settings -> AI，在没有已保存覆盖的情况下查看 Prompt enhancement 卡片：
  自定义模板开关处于关闭、禁用状态，并说明
  保存模板即可解锁它；该行只提供编辑图标
  按钮。2) 确认卡片上或编辑器中的任何位置都没有
  系统提示词字段。3) 打开编辑器；在面板
  打开期间，从用户模板中清除草稿变量 token 并尝试
  保存。4) 使用插入操作放回草稿变量，保存，并
  确认面板关闭且开关现在已启用并打开。5) 增强一份
  中文草稿，
  其中还提到某个文件（如 `prompt-templates.ts`）。6) 增强一份
  混合语言草稿。7) 解析一个会返回
  包裹在引号中的重写草稿的模型。8) 重新打开编辑器，按 `Escape`，并确认
  编辑被放弃。9) 重新打开编辑器，编辑模板，并通过
  点击背景遮罩关闭它。10) 关闭开关并再次增强，然后
  重新打开开关，确认用户的文本仍在。11) 钉选一个增强
  模型，禁用该 provider，再增强一次。12) 确认推理行
  默认为 `Off (no reasoning)`，且不提供跟随会话的条目；然后
  调高它并再次增强，以观察差异。
- **预期**：没有覆盖时，编辑器以内置默认文本打开，
  因此显示的值等于生效值；卡片完全不显示
  系统提示词字段。保存缺少草稿变量的用户模板
  会在本地被拒绝并给出提示，且不会有任何写入到达 host-core。没有
  已保存模板时开关被禁用；保存一个后它直接启用并打开，
  无需单独的切换。`Escape` 和
  背景遮罩点击都会放弃编辑，存储值保持不变。开关
  关闭时，即使存储了自定义模板，增强也使用内置模板；
  打开时，应用存储的模板。两种情况下请求的系统
  提示词都是内置的，其 user 消息将草稿包含在
  `<draft>` 标签内并完成占位符替换。重写后的草稿保留
  草稿的语言，不带语言元注释，保持 `prompt-templates.ts`
  逐字节一致，并移除了包裹的引号对。将开关
  关闭再打开不会破坏用户存储的文本。已禁用的钉选
  增强 provider 会回退到 Composer 当前模型，
  增强仍然成功，且回退被记录为警告。推理行
  默认为 `Off (no reasoning)`，提供每个规范级别
  加 `Off`，没有跟随会话条目；模型无法
  支持的级别会被钳制而非拒绝。未收到 provider 响应的增强
  会在约 60 秒内以 `TIMEOUT` 失败，并给出指明预算和
  应更改设置的消息；它不会挂起，也不会在会话
  模型上静默重试。
- **关联规范**：`04-ux/12-prompt-enhancement.md` §3/§5、
  `04-ux/06-settings-ia.md`、`03-runtime/01-ipc-protocol.md` §13、
  `03-runtime/04-data-storage.md`、ADR 0121、D447
- **验收**：C（对话与流式）、质量
- **里程碑**：M6+
- **状态**：模板解析、
  校验和引号剥离已由单测/RPC/源码契约覆盖；完整 UI 旅程为草稿（仅在此界面变化时于具备能力的
  环境中运行）

#### E2E-220：本地 MCP 控制驱动一个正在运行的桌面端

- **前置条件**：以
  `PI_DESKTOP_MCP_CONTROL=1` 和干净的配置文件启动 PI-Desktop。有一个本地项目目录
  可用，Electron 用户数据目录可写，且桌面端
  已完成后端启动。
- **步骤**：1) 读取 `mcp-control.json` 并使用其 URL 和 bearer token。2)
  调用 `initialize`、`tools/list` 和 `pi_control_describe`。3) 用
  fixture 项目调用 `pi_project_open`。4) 调用 `pi_session_create`、
  `pi_session_get` 和 `pi_agent_status`。5) 调用 `pi_agent_prompt`，并
  观察现有桌面端会话变化事件选中目标会话。
  6) 为一个已审查的读取操作调用 `pi_desktop_invoke`。7) 在不带确认的情况下尝试
  `pi_session_delete` 和 `pi_session_configure`，然后
  带 `confirm: true` 重试。8) 停止应用并检查 manifest。
- **预期**：未认证的请求收到 401；带有
  不受支持协议版本的 `initialize` 协商到 `2025-06-18`；已认证的 MCP
  握手和工具目录成功；project/session/Agent 操作使用
  与渲染器相同的 IPC 校验和宿主权限边界；变更
  调用会刷新/选中可见的项目和会话，而 `pi_session_get`
  不会；破坏性操作和 `pi_session_configure` 在被确认之前
  以确认错误失败；secret 写入、`plugin/loadDev` 和
  原生选择器通道不出现在 `pi_control_describe` 中；secret 形态的
  字段被剥离；端点只绑定 loopback；不允许的 Origin 和
  不支持的协议版本头被拒绝；manifest 在关闭时
  变为 `active: false`。
- **关联规范**：`02-architecture/01-architecture.md`、
  `03-runtime/01-ipc-protocol.md`、`05-security/01-security.md`、ADR 0203、
  D370、D372
- **验收**：A（应用控制）、C（会话）、安全、质量
- **里程碑**：M6+
- **状态**：MCP 协议/单测由 `apps/desktop/test/mcp-control.test.mjs` 覆盖；
  完整 Electron 旅程已记录，并按无本地 E2E
  策略继续推迟

#### E2E-234：工作区安全拒绝清单与忽略层级

- **前置条件**：一个包含 `.env`、`.env.example`、
  `server.pem`、`keys/id_rsa`、`notes.txt`、`node_modules/pkg/index.js`、
  `generated/out.txt`、`debug.log` 以及根目录 `.pi-desktopignore`（内容为
  `generated/`）的项目。每个文件都包含单词 `needle`。会话是
  `auto` 权限模式下的 Agent。
- **步骤**：1) 请求 `Read` `.env`，然后 `Read` `.env.example`。2) 请求
  `Write` `keys/id_rsa`。3) 运行一次不带作用域的 `Grep` 和 `Glob` 搜索 `needle`。
  4) 分别以 `path: node_modules/pkg` 和 `path: generated` 运行 `Grep`。
  5) 在安装了系统 `rg` 和设置
  `PI_DESKTOP_DISABLE_RG=1` 两种情况下重复步骤 1。
- **预期**：步骤 1 和 2 以 `WORKSPACE_PATH_DENIED` 失败；
  读取 `.env.example` 成功；且不会创建 `keys/id_rsa` 文件。
  不带作用域的搜索只列出 `notes.txt` 和 `.env.example`：`.env`、
  `server.pem`、`node_modules`、`generated` 和 `debug.log` 均不出现。
  显式路径搜索各返回一个命中。进程内遍历器与
  `rg` 快速路径产生相同的文件集。
- **关联规范**：`03-runtime/15-workspace-ignore-rules.md`、
  `03-runtime/08-error-codes.md` §3.3、D032
- **验收**：B（工作区工具）、安全
- **里程碑**：M3+
- **状态**：由 `crates/host-core/src/tools/mod.rs` 单测覆盖
  （`security_denylist_blocks_read_write_edit_and_hides_search_results`、
  `default_ignores_and_workspace_ignore_file_hide_unscoped_walks_only`）以及
  `tools/ignore_rules.rs`；Electron 旅程已记录并按
  无本地 E2E 策略推迟

#### E2E-235：悬空符号链接无法写出工作区

- **前置条件**：一个项目包含 `dangling -> /tmp/outside/planted.txt`
  （目标不存在）和 `inner -> ./not-yet.txt`。Agent 模式，
  `auto` 权限。
- **步骤**：1) 请求 `Write` `dangling`。2) 请求 `Write`
  `dangling-dir/new.txt`（其中 `dangling-dir -> /tmp/outside/dir`）。3) 请求
  `Write` `inner`。
- **预期**：步骤 1 和 2 以 `PATH_OUTSIDE_WORKSPACE` 失败，且
  `/tmp/outside` 下不会出现任何内容。步骤 3 在
  项目内创建 `not-yet.txt`。符号链接循环以 canonicalize 错误失败，而不是挂起。
- **关联规范**：`03-runtime/03-tools-and-permissions.md`、
  `03-runtime/15-workspace-ignore-rules.md` §3
- **验收**：B、安全
- **里程碑**：M3+
- **状态**：由 `crates/host-core/src/workspace.rs` 单测覆盖
  （`blocks_dangling_symlink_escape`、
  `dangling_symlink_inside_workspace_resolves_to_its_target`、
  `dangling_symlink_loop_is_rejected`）

#### E2E-236：插件桌面控制需要用户的原生同意

- **前置条件**：一个被授予 `desktop.control` 的开发插件，其面板调用
  `pi.desktop.invoke({ operation: "session/delete", args: [id], confirm })`。
  存在一个可丢弃的会话。
- **步骤**：1) 以 `confirm: false` 调用。2) 以 `confirm: true`
  调用并在对话框上按 Escape。3) 以 `confirm: true` 调用并点击
  Deny。4) 以 `confirm: true` 调用并点击 Allow 一次。5) 调用一个
  `read` 操作。
- **预期**：步骤 1 以 `CONFIRMATION_REQUIRED` 失败，且不出现对话框。
  步骤 2 和 3 以 `PERMISSION_DENIED` 失败；会话仍
  存在。对话框指明 `session/delete` 及目录描述，绝不显示
  面板编写的文本。步骤 4 删除会话且侧边栏刷新。
  步骤 5 不显示对话框。每次调用都以插件 id、
  操作和风险级别被审计。
- **关联规范**：`07-plugins/03-plugin-api.md`（桌面控制）、
  `07-plugins/04-plugin-security.md` §8.2、
  `07-plugins/13-plugin-permissions-matrix.md`、ADR 0203、ADR 0208、D370、
  D372、D377
- **验收**：D（插件）、安全
- **里程碑**：M6+
- **状态**：运行时由
  `apps/desktop/test/plugin-desktop-control.test.mjs` 覆盖；原生对话框
  旅程已记录并按无本地 E2E 策略推迟

#### E2E-PLUGIN-session-orchestrator-real-workers：Session Orchestrator 创建并协调持久会话

- **前置条件**：市场插件 `pi.session-orchestrator` 已安装并启用；
  父 Agent 会话具有已配置、已认证的 provider/model 和一个
  项目路径。父级处于 Agent 模式。
- **步骤**：1) 要求父级并行审查 Frontend、Electron 和 Rust。
  2) 确认 `SessionTask.spawn` 返回三个不同的真实
  持久 `sessionId`，且每次投递有一个宿主 `messageId`；每个
  worker 在正常会话列表中可见。3) 确认三个 worker
  都收到提示词且未使用 `session/fork`，并可并发运行。4)
  在某个 worker 忙碌时，向该确切 Session ID 发送跟进消息，并验证
  它进入目标收件箱排队，而不是开启第二轮。5)
  从 Agents 面板和侧边栏悬停卡片查看状态；确认两者
  都使用有界的宿主投影，且不获取完整的 worker 转录。
  6) 等待一个 worker，按其确切的 `messageId` 和 `turnId` 查询 `result`，
  并检查父级转录中的一条宿主生成的完成消息。
  7) 重新读取结果并重复结算通知路径；确认
  回调和转录行不会重复。8) 在独立的活跃插件 Agent 工具轮次中发送
  父到 worker、worker 到父的消息；
  在两个转录中验证来源/目标出处及真实目标轮次绑定。
  9) 从 Agents 面板打开一个 worker，用确切返回的
  `sessionId` 向其发送跟进消息，并停止另一个 worker。10) 在
  存在排队投递的情况下重启宿主/插件，确认它保持挂起，而
  被中断的轮次不会被重放。在保持父级可见的情况下，
  用一个大型现有会话列表重复并行创建步骤。11) 在
  某个模型的「Available for AI delegation」保持关闭时，要求父级通过
  `modelKey` 在其上生成一个 worker，然后不带 `modelKey` 再生成一次。
- **预期**：每个 worker 都是一个真实的持久会话，继承父级的
  项目/模型/thinking/权限上限，创建时带有独立的空
  转录。宿主账本将每次投递绑定到实际
  目标持久轮次；结果文本和错误状态源自该轮次的
  终态，而不是轮询 assistant 文本。父级只收到
  有界的、至多一次的完成消息；完整的 worker 转录仍
  可在其各自会话中查看。`sessionId` 是唯一规范的 worker
  身份，后续 `send` 复用同一个会话和上下文，而不会
  创建替代会话。会话消息行与
  人类输入在视觉上明显不同，其出处在重新加载后仍然保留。
  `wait` 在其界限内返回 `timedOut`，而不是占用宿主工具截止时间。
  Cancel 只中断所选的投递/轮次，而不删除会话。
  没有活跃插件工具调用的发送、伪造的来源 id、
  高于来源权限上限的目标、worker 扇出溢出、收件箱溢出
  以及自主回调循环都失败关闭。命名用户
  未为 AI 委派启用的模型的 `spawn`，会在 worker 存在之前
  以 `PERMISSION_DENIED` 被拒绝；而省略 `modelKey`——或命名
  默认模型自身的 key——仍然继承。无关会话和
  现有 Task 系列不受影响，且不发生任何 localhost MCP 调用或 token
  访问。worker 通知的突发会串行化并合并
  会话列表刷新，同时保留最终 worker 列表和
  前台会话。
- **关联规范**：`07-plugins/03-plugin-api.md`、
  `07-plugins/04-plugin-security.md`、`07-plugins/11-plugin-storage-isolation.md`、
  `03-runtime/01-ipc-protocol.md`、`03-runtime/06-host-rpc-protocol.md`、
  `03-runtime/04-data-storage.md`、`03-runtime/11-provider-model-system.md`、
  ADR 0237、ADR 0239、ADR subagent-model-opt-in
- **验收**：C（并行持久会话）、D（插件安全）、质量
- **里程碑**：M6+
- **状态**：宿主账本覆盖由
  `pnpm test:e2e:collaboration` 自动化；市场插件测试覆盖插件
  运行时，host-core/桌面单测覆盖新增的宿主原语。
  完整的真实 provider/Electron 旅程在无本地 E2E 策略下
  仍需运行器验证

#### E2E-SESSION-independent-top-level-communication：SessionTask 发现并与现有会话通信

- **前置条件**：市场插件 `pi.session-orchestrator`
  已安装并启用。两个现有 Agent 会话由
  常规 New Task 流程创建，且未被链接为 Session Orchestrator worker。
  调用方是一个具有已配置、已认证 provider 的活跃 Agent 会话。
- **步骤**：1) 以 `action: "list"` 调用 `SessionTask`，通过其持久
  `sessionId` 识别这两个现有会话。2) 向其中一个
  独立会话发送消息，并验证它进入该会话的收件箱排队。
  3) 从目标会话向原始会话发送回复。4) 用
  返回的 ID 调用 `status` 和 `result`，并检查两份转录。
- **预期**：`list` 包含对现有可通信
  Agent 会话的有界引用，不要求插件所有的历史，也不将其视为
  worker。`send` 使用真实目标 Session ID 双向可用，
  保留每个目标现有的模型/项目/上下文/权限，
  绝不创建替代会话。宿主记录来源和目标
  出处，结果仍绑定到实际持久轮次，且列表
  响应不包含转录、项目路径、凭据或消息
  预览。非 Agent 会话仍被现有宿主策略拒绝。
- **关联规范**：`07-plugins/03-plugin-api.md`、
  `07-plugins/04-plugin-security.md`、`03-runtime/01-ipc-protocol.md`、
  `03-runtime/04-data-storage.md`、ADR 0239、ADR 0240
- **验收**：C（对话与流式）、D（插件安全）、
  G（插件）、质量
- **里程碑**：M6+
- **状态**：宿主发现和双向投递由
  `pnpm test:e2e:collaboration` 自动化；插件和 host-core 回归覆盖
  已自动化。真实多会话 provider/Electron 旅程在无本地 E2E
  策略下仍需运行器验证

#### E2E-SESSION-completion-notice-allows-silence：可信的完成通知可以在没有确认的情况下结束

- **前置条件**：某个候选提交拥有自己的已构建 host-core 和运行时
  sidecar。本地 SSE provider 确定性地返回可见文本或
  成功的空响应；不需要真实凭据。
- **步骤**：1) 通过真实的宿主协作账本和
  sidecar 投递一个任务，读取其成功结果，并完成协调者摘要。
  2) 通过生产 Main 输入
  解析器解析排队的完成回调，并针对一个空 SSE 响应运行接收方。3) 在同一接收方运行时上，
  针对空响应再运行一个人类请求、一次复制的完成框架、一个账本任务和一条账本消息。
- **预期**：原始结果保持不变。该完成有
  一次 provider 请求、没有错误、一个终态生命周期、已完成的账本状态，
  且没有确认回调。每个普通输入仍重试一次并
  以 `EMPTY_MODEL_RESPONSE` 结束；接收方在
  静默通知之后发送的任何请求都不携带空的 assistant 消息。单测覆盖
  另外拒绝缺失的 reply-to ID/错误目标、在工具批次上消耗例外、
  在 provider 重试间保留它、一旦已接受的
  用户引导进入上下文就撤销它，并将已接受的静默排除在
  运行时条目和 pi 转录状态之外。
- **关联规范**：`03-runtime/02-agent-runtime.md` §5e、
  `03-runtime/08-error-codes.md`、ADR 0239（D446 修订）
- **验收**：C（对话与流式）、D（出处）、质量
- **里程碑**：M6+
- **状态**：在已提交、
  已 rebase 的候选上、于其专用 worktree 中由 `pnpm test:e2e:session-completion` 自动化。
  测试装置驱动真实的宿主
  RPC、生产出处解析器、sidecar 和本地 SSE，并在
  宿主结算前持久化运行时消息。它不测试 Electron 的
  队列/发件箱 UI，也不使用真实 provider。候选/基准 SHA 与结果
  应记录在验证报告中；现有账本覆盖通过
  `pnpm test:e2e:collaboration` 单独运行。

#### E2E-SESSION-hover-card-model-and-links：会话悬停卡片展示可读模型与创建导航

- **前置条件**：应用有一个协作创建的会话、一个
  独立会话，以及一个带可读目录名称的已配置 provider/model。
  侧边栏同时包含两个会话。
- **步骤**：1) 悬停或键盘聚焦协作创建的会话。
  2) 查看模型元数据、创建者引用和已创建会话列表。
  3) 用键盘激活创建者和一个已创建会话引用。
  4) 删除（或以其他方式移除）一个被引用的会话，或使用一个
  引用已经过期的会话，然后再次查看卡片。5) 同时查看一个
  独立会话的卡片。
- **预期**：卡片显示模型的显示名称，
  回退到 provider 的可读名称，而不是 provider ID。
  协作创建的会话显示其创建者，创建者显示其有界的
  已创建会话列表。每个有效引用都是原生可键盘聚焦的按钮，
  具有可访问的 open-session 名称；激活它会打开该持久会话并聚焦
  Composer。会话已不存在的引用以文本形式呈现，
  带有“不可用”指示，且不是可键盘聚焦的导航
  控件；激活一个已不存在的会话（例如在
  快照与点击之间被删除的会话）会显示可见错误，而不是
  切换到空转录。独立会话仍是没有
  伪造创建者链接的有效本地会话。悬停轮询保持
  有界且不加载转录：超过截止时间的读取
  会被放弃，失焦窗口保持较慢的空闲轮询，而不是
  停止或超限。
- **关联规范**：`03-runtime/01-ipc-protocol.md` §5.7、
  `03-runtime/04-data-storage.md`、`04-ux/08-component-spec.md`、
  `04-ux/09-interaction-patterns.md`、ADR 0240
- **验收**：C（对话与流式）、质量
- **里程碑**：M6+
- **状态**：源码契约和投影测试已自动化；渲染后的
  指针/键盘验证仍需运行器验证

#### E2E-237：插件 fetch 在每次重定向时重新检查出站

- **前置条件**：一个具有 `net.domains: ["allowed.test"]` 和
  `net.fetch` 的开发插件。`allowed.test` 上的本地服务器
  以 302 应答 `/hop` 指向
  `http://undeclared.test/leak`，以 200 应答 `/ok`，以 429 和
  `Retry-After: 2` 应答 `/limited`。
- **步骤**：1) 调用 `pi.net.fetch({ url: "https://allowed.test/ok" })`。2)
  调用 `pi.net.fetch({ url: "https://allowed.test/hop" })`。3) 调用
  `pi.net.fetch({ url: "https://allowed.test/limited" })`。
- **预期**：步骤 1 返回 200。步骤 2 以指明
  `undeclared.test` 的 `PERMISSION_DENIED` 失败，且未声明的服务器没有记录任何请求。
  审计日志显示被拒绝的跳转。步骤 3 返回 429 且其 `Retry-After`
  头保持完整，服务器恰好记录一次请求，且审计
  日志显示 `ok: false` 及所宣告的 `retryAfter`——宿主不做任何重试。
- **关联规范**：`07-plugins/04-plugin-security.md` §8.0、
  `07-plugins/03-plugin-api.md` §7
- **验收**：D、安全
- **里程碑**：M4+
- **状态**：运行时由 `apps/desktop/test/plugin-egress.test.mjs` 覆盖
  （逐跳出站与失败调用审计）

#### E2E-238：针对未知会话的工具请求不回退

- **前置条件**：host-core 正在运行；一个 JSON-RPC 探针连接到其
  stdio。
- **步骤**：1) 发送 `tools.execute`，带 `sessionId: "missing"` 和一个对
  `README.md` 的 `Read`。2) 用同一个 id 发送 `plans.enter`。
- **预期**：两者分别以 `SESSION_NOT_FOUND`（数值 `1007`）和
  `PLAN_SESSION_NOT_FOUND` 失败；不读取最后打开的
  工作区下的任何文件。
- **关联规范**：`03-runtime/06-host-rpc-protocol.md` §7、
  `03-runtime/08-error-codes.md` §3.1
- **验收**：B、安全
- **里程碑**：M3+
- **状态**：由 `crates/host-core/src/rpc/mod.rs` 单测覆盖
  （`temporary_session_uses_its_own_scratch_workspace`）

#### E2E-239：旧版本指明更新的数据 schema，而不是循环重启

- **前置条件**：一个数据目录最近由更新的 PI-Desktop 打开过，其
  host-core 已将其迁移到此版本所支持的 schema 之后。
- **步骤**：1) 在该数据目录上启动旧的打包应用。
  2) 观察横幅和 `logs/app/runtime.log`。
- **预期**：host-core 退出一次；不再记录进一步的重启尝试。
  致命横幅说明此 PI-Desktop 比本地数据旧，显示
  两个 schema 编号，并告知用户安装更新版本。
  数据目录不被修改。
- **关联规范**：`03-runtime/07-process-model.md`（启动结果）
- **验收**：B
- **里程碑**：M3+
- **状态**：源码契约由
  `apps/desktop/test/host-boot-diagnostics.test.mjs` 覆盖

#### E2E-240：Apple Silicon 上的 Intel macOS 构建指向原生下载

- **前置条件**：Apple Silicon Mac；x64 macOS 软件包已安装并
  在 Rosetta 2 下运行。
- **步骤**：1) 启动应用。2) 阅读标题栏下方的横幅。
  3) 点击其关闭操作。
- **预期**：应用正常启动。一个可关闭的提示说明这是
  Apple Silicon 机器上的 Intel 构建，并请用户安装
  Apple Silicon 构建。关闭后本次会话内不再显示；原生 arm64
  软件包不显示提示。
- **关联规范**：`03-runtime/07-process-model.md`（启动结果）
- **验收**：B
- **里程碑**：M3+
- **状态**：源码契约由
  `apps/desktop/test/host-boot-diagnostics.test.mjs` 覆盖

## Remote Agent Control 目标场景（MVP 之后）

以下场景需要经批准的远程测试装置。现在将其
记录在案，使协议和安全工作有明确的验收
目标。除非请求明确授权相应环境，否则不要针对
本地桌面端或生产 Gateway 运行它们。D374 将本节
所有场景修订为修订后的契约：`{ epoch, sequence }`
游标、临时增量、宿主所有的轮次队列、完整的本地审批
词汇、远程权限上限、宿主链路中继，以及
浏览器 cookie 配置文件。D375 重新排序了里程碑：E2E-231 和
E2E-232 是已排期的 SSH 隧道和
集成里程碑的验收目标，而 E2E-227 和 E2E-228 在 Gateway 和
浏览器里程碑排期时运行。

#### E2E-221：RACP 初始化协商能力与策略

- **前置条件**：一个测试 Agent Host 和一个已认证客户端支持
  `RACP-WS` v1。Host 有一个可见的空闲 Session，以及已配置的
  `remoteMaxPermissionMode` 和 `approvalLifetimeMs`。
- **步骤**：1) 不初始化直接连接并发送请求。2) 发送
  `connection/initialize`，携带支持的绑定以及 `turnQueue`、
  `hostEvents` 和 `history` 能力。3) 发送
  `notifications/initialized`。4) 用不受支持的主版本号重试。
  5) 在直连 Host 连接上调用 `host/list`。
- **预期**：初始化前的请求被拒绝；有效握手
  返回协商的协议、连接 id、主体角色、
  包括 `maxQueuedTurnsPerSession` 和 `replayWindowEvents` 在内的限制、
  所宣告的能力，以及信息性的 `policy` 块；
  不受支持的主版本返回 `PROTOCOL_MISMATCH`；`host/list` 返回
  `METHOD_NOT_FOUND`，因为没有 Gateway。
- **关联规范**：`03-runtime/19-remote-agent-control-protocol.md` §3 和
  §7.7、`05-security/02-remote-control-security.md` §3
- **验收**：安全、质量
- **里程碑**：Post-MVP
- **状态**：草稿；需要远程测试装置

#### E2E-222：远程轮次流式输出有序的持久事件与实时增量

- **前置条件**：一个已认证控制器连接到一个空闲
  Session，带有一个确定性 fixture Agent，其轮次包含两轮模型、
  一次工具调用和一次压缩。
- **步骤**：1) 连接并从当前游标订阅。2) 调用
  `turn/start`。3) 收集每个事件信封直到终止事件，
  将持久事件（带 `sequence`）与临时事件（带
  `afterSequence`）分开。4) 将最终快照与仅由
  持久事件重建的状态比较。5) 将每个 `payload.event` 与桌面端
  为同一轮次记录的本地 `AgentEvent` 比较。
- **预期**：`turn/start` 快速返回一个 `turnId`；持久
  序列在同一 epoch 内严格递增；`item.delta`、
  `tool.progress` 和 `turn.activity` 携带 `afterSequence`，绝不携带
  `sequence`；恰好发出一个 `turn.completed`，在本地的
  `agent_end` 处，中间的 `turn_end` 处不发出；压缩
  表现为一个 `itemType: "compaction"` 的 `item`；终态不可变；
  最终快照等于由持久事件
  加上 `item.completed` 载荷内容重建的状态。
- **关联规范**：`03-runtime/19-remote-agent-control-protocol.md` §§5–8、
  `03-runtime/10-session-state-machine.md`、
  `02-architecture/05-remote-agent-control.md` §8
- **验收**：C（对话与流式）、质量
- **里程碑**：Post-MVP
- **状态**：草稿；需要远程测试装置

#### E2E-223：重连重放持久事件或按 epoch 重新同步

- **前置条件**：一个轮次正在产生至少五个持久事件和一条
  长时间流式的 assistant 消息；测试装置可以关闭并重开
  客户端连接，并重启 Host。
- **步骤**：1) 记录最后应用的游标。2) 在
  流式消息中间断开。3) 带 `after` 重连并订阅。4) 在
  游标被逐出有界重放窗口之后重复。5) 在
  空闲期间重启 Host 并用旧游标重连。6) 通过
  `RACP-HTTP` 使用 `epoch:sequence` 形式的 `Last-Event-ID` 重复
  步骤 3。
- **预期**：保留的游标恰好重放之后的每个持久事件
  一次，且不重放任何增量；快照的 `activeItems` 携带
  断开前已流式输出的文本；被逐出的游标返回 `resync.required`
  和完整快照；来自上一个 epoch 的游标返回
  `CURSOR_EXPIRED` 和带新 epoch 的快照；持久缺口绝不导致
  客户端猜测或乱序应用状态；SSE 路径行为
  完全一致。
- **关联规范**：`03-runtime/19-remote-agent-control-protocol.md` §§5.3、
  5.4、7.2 和 8，`02-architecture/05-remote-agent-control.md` §8
- **验收**：恢复、质量
- **里程碑**：Post-MVP
- **状态**：草稿；需要远程测试装置

#### E2E-224：远程审批携带本地词汇且保持宿主所有

- **前置条件**：某个 Session 策略要求工具审批；fixture
  Agent 在同一轮中提交一个 Plan 并提出一个多选 asktool 问题；
  Host 策略允许远程会话授权；第二个 Session
  配置为 `permissionMode: "auto"`，Host 上限为 `ask`。
- **步骤**：1) 从控制器启动轮次。2) 观察工具
  审批请求。3) 先以 viewer 尝试做出决定，再用过期的
  revision 尝试。4) 由授权审批者以 `allow-session`
  解决。5) 在 Plan 审批提出后连接第三个客户端并读取其
  快照。6) 先以 `approve` 且不带 `permissionMode` 解决 Plan，
  再以 `permissionMode: "accept-edits"` 解决。7) 用一个
  多选回答和一个 `null` 回答输入请求。8) 过期后重复
  步骤 4。9) 在不带 `approver` 的情况下，从控制器在 `auto`
  Session 上启动一个轮次。
- **预期**：viewer 和过期响应分别以 `FORBIDDEN`
  和 `APPROVAL_STALE` 失败关闭；`allow-session` 恢复轮次，且该
  Session 中同一工具的后续调用无需审批；迟到客户端的快照
  列出待处理的 Plan 审批；不带模式的 approve 被拒绝，
  显式带模式的则以 `accept-edits` 在 Agent 模式下排队执行；
  桌面端自己的审批卡片在远程决定到达时关闭；
  asktool 回答作为本地 `AskToolResolution` 到达 Agent；过期
  返回 `APPROVAL_EXPIRED` 且绝不执行工具；`auto`
  Session 轮次报告 `effectivePermissionMode: "ask"` 并提出审批，
  而持久会话模式保持 `auto`。
- **关联规范**：`03-runtime/19-remote-agent-control-protocol.md` §§5.5、
  7.3、7.5 和 9，`05-security/02-remote-control-security.md` §§4 和 7，
  `03-runtime/10-session-state-machine.md`
- **验收**：E（工具与权限）、安全、恢复
- **里程碑**：Post-MVP
- **状态**：草稿；需要远程测试装置

#### E2E-225：客户端断开时轮次继续，队列由宿主所有

- **前置条件**：两个已认证控制器可以访问同一个
  Session；fixture Agent 有一个延迟的确定性轮次；本地
  桌面渲染器打开在同一个 Session 上。
- **步骤**：1) 客户端 A 启动轮次。2) 在运行
  期间断开 A。3) 从客户端 B 观察该 Session。4) 以 viewer 身份重连 A。
  5) 从 B 以 `admission: "reject_if_busy"` 调用 `turn/start`，
  然后以 `admission: "queue"` 调用两次。6) 从 B 取消
  第二个排队的轮次。7) 从 B 调用 `turn/stop`。8) 将队列填满到
  `maxQueuedTurnsPerSession` 并再启动一次。
- **预期**：A 断开后轮次继续；B 观察到同一个
  轮次和持久序列；A 按游标追平；第一次启动返回
  `AGENT_BUSY`；排队的启动返回带位置的 `turn.queued`，且
  桌面渲染器显示相同的排队提示词；取消发出
  `turn.canceled`；`turn/stop` 在下一个边界将活跃轮次结束为
  `completed`，剩余排队的轮次开始；溢出的启动
  返回带 `details.queueFull` 的 `AGENT_BUSY`。
- **关联规范**：`02-architecture/05-remote-agent-control.md` §§6、9
  和 10，`03-runtime/19-remote-agent-control-protocol.md` §§7.3–7.4 和 8
- **验收**：C（对话与流式）、恢复
- **里程碑**：Post-MVP
- **状态**：草稿；需要远程测试装置

#### E2E-226：角色、作用域与撤销被强制执行

- **前置条件**：存在一个租户、两个 Host、两个 Session，以及具有
  viewer、controller、approver 和 owner 角色的主体。
  多租户测试装置配置文件在可用时会增加第二个租户。
- **步骤**：1) 用每个角色尝试每个目录操作，包括 `session/history`、
  `turn/cancel` 和 host 作用域的 `events/subscribe`。
  2) 替换成另一个 Host 的 Session、Host 和审批 id；
  多租户配置文件激活时，再替换成另一个租户的。3) 以
  controller 排队一个轮次，然后撤销该主体并用其现有
  连接重试。
- **预期**：角色矩阵被强制执行，包括 `allow-session`
  策略行；外部标识符返回 `FORBIDDEN` 或 `NOT_FOUND`，
  不泄露存在性；撤销会关闭连接、阻止新的变更，
  并取消被撤销主体的排队轮次；审计记录标识
  被拒绝的主体，而不记录提示词或 secret 内容。
  跨租户用例仅在多租户配置文件中要求。
- **关联规范**：`05-security/02-remote-control-security.md` §§3–9 和
  §11、`03-runtime/19-remote-agent-control-protocol.md` §§6 和 13
- **验收**：安全、质量
- **里程碑**：Post-MVP
- **状态**：草稿；需要远程测试装置

#### E2E-227：Host 链路为入站防火墙/NAT 之后的客户端提供中继

- **前置条件**：Agent Host 运行在一个拒绝
  入站连接的测试防火墙之后。Gateway 可被两个测试客户端公开访问。
- **步骤**：1) 用一次性凭据登记 Host。2) 建立
  出向 mTLS Host 链路。3) 连接两个客户端并运行一个会提出
  工具审批的轮次。4) 从收到中继服务器请求的客户端
  回答它，然后尝试从另一个客户端再次回答。
  5) 通过 Gateway 上传目标上传一个附件，并在一个轮次中
  引用它。6) 断开链路并允许其重连。7) 撤销 Host
  并尝试用旧凭据重新登记。
- **预期**：不打开任何桌面端入站端口；Gateway 只路由到
  已认证的 Host；审批请求恰好在一个
  逻辑连接上投递，第二次回答返回带
  `alreadyResolved` 的已存结果；附件字节以有界分块跨越链路，
  Host 校验哈希，Gateway 的副本在
  `attachment/complete` 之后消失；本地执行跨越链路
  中断继续进行，两个客户端都从可恢复游标恢复；重连
  不重复轮次；被撤销的凭据无法重新登记。
- **关联规范**：`02-architecture/05-remote-agent-control.md` §5.3、
  `03-runtime/19-remote-agent-control-protocol.md` §§10 和 11.4、
  `05-security/02-remote-control-security.md` §§3.2 和 6、
  `06-delivery/07-remote-control-rollout.md` §2
- **验收**：安全、恢复、质量
- **里程碑**：Post-MVP
- **状态**：草稿；在 Gateway 里程碑排期之前不予排期（D375）

#### E2E-228：已交付绑定与浏览器配置文件保持语义行为

- **前置条件**：同一个确定性命令/事件 fixture
  可通过 `RACP-WS` 和 `RACP-HTTP` 使用；`RACP-GRPC` 仅
  在该保留绑定已交付时可用。浏览器测试装置可以持有 Gateway
  会话 cookie。
- **步骤**：1) 在 header 配置文件下通过每个已交付绑定运行 fixture。
  2) 在事件流期间断开。3) 用同一个幂等键
  重试一次变更。4) 比较归一化的响应、错误、持久
  序列和最终快照。5) 在浏览器测试装置中，以允许的 Origin
  在 cookie 配置文件下打开 WebSocket 和 SSE 流，
  然后用不允许的 Origin，再然后把 token 放在 URL 中，
  最后发送一个不带 CSRF token 的变更。
- **预期**：所有已交付绑定接受和拒绝相同的操作，
  保持持久事件顺序和终态，返回相同的语义
  错误码，并在重试下产生一个变更结果；cookie
  配置文件仅在允许的 Origin 下成功；不允许的 Origin、
  URL token 和无 CSRF 的变更被拒绝。
- **关联规范**：`03-runtime/19-remote-agent-control-protocol.md` §§11
  和 14，`05-security/02-remote-control-security.md` §§3.1 和 5，
  `06-delivery/07-remote-control-rollout.md` §§3–4
- **验收**：质量、恢复、安全
- **里程碑**：Post-MVP
- **状态**：草稿；浏览器配置文件步骤在浏览器里程碑排期之前不予排期（D375）；一致性步骤在第二个绑定交付时运行

#### E2E-229：附件与工作区边界在远程被强制执行

- **前置条件**：某个 Session 有项目根目录和私有 scratch 根目录。某个
  控制器可以上传一个有效 fixture 和一个无效 fixture，
  直接上传以及通过 Gateway 中继上传。
- **步骤**：1) 用正确哈希上传字节，并在一个轮次中引用该附件。
  2) 用错误哈希、超大正文、本地绝对
  路径、`file://` URL 和过期上传目标重复。3) 通过
  Gateway 中继重复步骤 2。4) 尝试 Session 根目录之外的工具路径。
  5) 不带路径调用 `project/list` 和 `session/create`。
- **预期**：只有经过验证的附件被接受；无效上传
  在两条路径上都在轮次准入之前失败；没有本地客户端路径
  到达 Host；`project/list` 返回标签和 id，不含绝对路径；
  `session/create` 按 id 绑定项目；现有
  `PATH_OUTSIDE_WORKSPACE` 边界仍然权威。
- **关联规范**：`03-runtime/19-remote-agent-control-protocol.md` §§5.7、
  7.7 和 10，`05-security/02-remote-control-security.md` §6，
  `03-runtime/03-tools-and-permissions.md`
- **验收**：E（工具与权限）、安全
- **里程碑**：Post-MVP
- **状态**：草稿；需要远程测试装置

#### E2E-230：故障恢复不重放已准入的工作

- **前置条件**：一个确定性的 Host、Gateway 和客户端可以注入
  进程、链路和响应丢失故障；一个轮次正在运行，两个在排队。
- **步骤**：1) 在 `turn/start` 被准入后丢弃响应。2) 用同一个幂等键
  重试。3) 在轮次运行期间使 Host 崩溃。
  4) 重启 Host 并从最后的游标重连。5) 在审批
  响应被接受后丢弃它并重试。
- **预期**：第一次重试返回原始轮次；执行只发生
  一次；Host 恢复按本地
  恢复策略标记被中断的轮次；重连收到新 epoch 和一个
  队列为空的快照，两个排队轮次都不会被启动或重放；没有
  已完成条目被作为新轮次重放；重试的审批返回
  带 `alreadyResolved` 的已存决定，且不重复执行。
- **关联规范**：`02-architecture/05-remote-agent-control.md` §10、
  `03-runtime/19-remote-agent-control-protocol.md` §§7–8 和 9.3、
  `06-delivery/07-remote-control-rollout.md` §4
- **验收**：恢复、安全、质量
- **里程碑**：Post-MVP
- **状态**：草稿；需要远程测试装置

#### E2E-231：桌面端通过 SSH 隧道驱动远程 Host

- **前置条件**：一台 Linux 测试机器运行 `sshd`，并持有一个
  桌面端可以用用户 SSH 密钥访问的项目。一个 GitHub Releases fixture
  以桌面端的版本为该平台提供 `pi-host` 包，
  另有一个其他版本的包，以及一个校验和被篡改的包。
  桌面端打开了一个本地会话，配置了一个用户 MCP 服务器，
  并安装了一个其工具需要工作区访问的插件。
- **步骤**：1) 从桌面端添加远程机器，让上传的
  引导脚本通过 SSH 下载、验证并启动 `pi-host`。
  2) 观察配对交换和产生的设备 token。3) 通过 `project/list` 和
  `session/create` 在远程项目下创建
  会话。4) 启动一个轮次，其 fixture 在远程项目中读取、编辑并运行
  命令，并从桌面端卡片批准该命令。5) 在空闲时用 `session/configure`
  将会话切换到 Plan 模式再切回，然后在轮次运行时尝试。6) 打开远程会话的
  文件标签页和 diff 标签页。7) 从桌面端宣告中继，运行
  一个调用桌面端 MCP 工具的轮次，然后在
  第二次调用期间关闭桌面端。8) 在远程会话上打开终端并运行命令。
  9) 在终端打开的情况下于轮次中途杀掉 SSH 会话，恢复它，并
  让桌面端重连。10) 查看远程工具目录。11) 尝试
  从远程机器上的非 loopback 地址连接，然后用
  已复用的配对 token 连接。12) 将引导指向被篡改的包，然后
  指向另一个版本，并重连。
- **预期**：文件只在远程机器上变化，命令在那里
  运行；审批卡片以本地词汇出现在桌面端；
  远程 host-core 只绑定 loopback；`session/configure`
  空闲时成功、运行时返回 `CONFLICT`；文件和 diff 来自
  远程会话根目录，其之外的路径返回
  `PATH_OUTSIDE_WORKSPACE`；桌面端 MCP 工具在桌面端执行，
  其结果到达远程转录，而第二次调用以
  `TOOL_FAILED` 失败且轮次继续；终端在远程
  机器上、会话根目录内运行；轮次跨越 SSH 中断继续，
  桌面端按游标恢复且不重复，终端输出
  从重放环形缓冲恢复；远程目录列出中继的 MCP 工具，
  但不列出需要工作区的插件工具；非 loopback 对端和
  复用的配对 token 被拒绝；被篡改的包在
  启动前被拒绝，Settings toast 指明校验和失败，而不是
  一个裸的 SSH 退出码；被拒绝的 SSH 登录在该 toast 中
  显示 ssh 的最后一行 stderr；版本不匹配返回
  `PROTOCOL_MISMATCH` 并提供重新下载；本地会话全程不受影响。
- **关联规范**：`02-architecture/05-remote-agent-control.md` §§5.2 和
  6.3，`03-runtime/19-remote-agent-control-protocol.md` §§6.2、9.4 和
  11.1，`05-security/02-remote-control-security.md` §§3.4、4.3、5.1 和 7，
  `06-delivery/07-remote-control-rollout.md` §2
- **验收**：E（工具与权限）、安全、恢复、质量
- **里程碑**：Post-MVP（rollout R2）
- **状态**：草稿；需要带 Linux SSH 目标的远程测试装置

#### E2E-REMOTE-HOST-ssh-password-authentication

- **前置条件**：一台 Linux 测试机器以
  `PasswordAuthentication yes` 和 `PubkeyAuthentication no` 运行 `sshd`，
  因此登录只能通过密码到达；用户本地 SSH agent 没有
  可用于它的密钥。一个 GitHub Releases fixture 以桌面端的版本
  为该平台提供 `pi-host` 包。第二台机器只接受用户的密钥。
- **步骤**：1) 在 Settings → Remote Hosts 中，用密钥
  认证方式通过 SSH 安装，并确认表单显示 identity-file 字段。
  2) 将认证模式切换为密码，确认 identity-file 字段
  被掩码密码字段替换，并将其显示一次。
  3) 尝试提交空密码。4) 将表单指向
  仅密码机器，输入密码，并引导它。
  5) 退出桌面端，重新启动，并让该 host 重连。
  6) 通过重新配对将已保存密码改为错误值，然后强制
  重连。7) 用提供的密码引导仅密钥机器。
  8) 在密码认证的 host 已连接时，检查桌面端的进程参数和
  `remote-hosts.json`。9) 尝试直接通过 IPC 通道提交
  包含换行符的密码。
- **预期**：密钥模式与今天的行为逐字节一致——`BatchMode=yes`，
  且任何位置都没有凭据文件。密码模式下密码字段替换
  identity-file 字段，显示切换可显示并重新隐藏值，
  空密码保持提交禁用。仅密码机器完成安装
  和配对。重新启动后 host 无提示重连，证明
  使用了已保存凭据。错误密码每次连接恰好产生一次失败尝试
  （没有辅助程序驱动的重试风暴），host 显示为离线，而不是
  使应用崩溃或显示登录被拒对话框。Settings toast
  携带 ssh 的最后一行 stderr（例如 `Permission denied`），而不是
  裸的退出码 255。仅密钥机器在密码模式下失败，因为该
  模式设置 `PubkeyAuthentication=no`；有密钥的用户应选择密钥模式。
  没有任何 `ssh` 参数包含密码；连接完成后不残留
  askpass 文件或目录；磁盘上的记录只将密码
  以 keychain 密文存储——绝不以明文存储。包含换行符的
  密码在任何远程命令运行之前以 `INVALID_ARGUMENT` 被拒绝。
- **关联规范**：`05-security/02-remote-control-security.md` §§3.4 和 13
  （gate 21）、`02-architecture/05-remote-agent-control.md` §5.2、
  `06-delivery/07-remote-control-rollout.md` §2
- **验收**：安全、D（界面）、质量
- **里程碑**：Post-MVP（rollout R2b）
- **状态**：草稿；需要带仅密码 Linux SSH 目标的远程测试装置。
  凭据接缝本身已由
  `apps/desktop/test/remote-host-ssh-password.test.mjs` 离线覆盖。

#### E2E-232：出向消息集成中继事件与命令

- **前置条件**：一个 Host 运行时配置了集成适配器，指向一个 webhook 接收端
  （sink）和一个长轮询机器人夹具，包含一个已关联聊天和一个未
  关联聊天。Host 机器上没有开放任何入站端口。
- **步骤**：1) 运行一个 turn 直至完成。2) 启动一个会触发工具
  审批的 turn 并保持其待决状态。3) 在 turn 运行期间从已关联
  聊天发送 stop 命令。4) 从未关联
  聊天发送相同命令。5) 让 webhook 接收端在一分钟内返回错误，然后恢复。
  6) 检查投递的每一个负载。
- **预期结果**：接收端和机器人收到 `turn.completed` 与 `approval.requested`
  的脱敏摘要，仅包含 id 和有界摘要
  文本；已关联聊天的 stop 映射为已关联
  主体角色下的 `turn/stop`，且该 turn 在下一个边界处结束；未关联
  聊天的命令不产生任何效果且被审计；投递失败会在界限内重试，
  且从不延迟或阻塞 turn；Host 不打开任何
  监听器。
- **关联规格**：`02-architecture/05-remote-agent-control.md` §4,
  `06-delivery/07-remote-control-rollout.md` §2 (R3),
  `05-security/02-remote-control-security.md` §10
- **验收**：安全、质量
- **里程碑**：MVP 之后（rollout R3）
- **状态**：草稿；需要集成夹具

## 受信扩展场景（R7 v1）

以下场景是 D387 / ADR 0214 与
`07-plugins/16-trusted-extensions.md` 的验收目标。无头运行器在
运行时于隔离的临时目录中生成其六个插件形态夹具。

#### E2E-241: 发现列表列出受信扩展且启用是显式的

- **前置条件**（D388）：一个 pi 扩展目录 `hello/`，内含
  `index.ts`；以及一个插件包，声明 `contributes.agentExtensions`
  且 `agent.extension` 的激活范围限定于夹具
  项目；另有第二个项目在该范围之外。
- **步骤**：1) 插件 → 导入 pi 扩展，接受确认，选择
  `hello/`。2) 在夹具项目中发送一个提示词。3) 打开已导入
  插件的行详情。4) 禁用该插件并发送一个提示词。5) 切换
  到第二个项目并发送一个提示词。6) 加载一个清单
  列出 `agentExtensions` 但缺少权限的插件。
- **预期结果**：导入会创建 `plugins/imported/hello`，其清单
  持有 `agent.extension`，并将该插件以 `agentExtension`
  能力和权限徽标列出；下一个 turn 列出其工具且
  行显示 `loaded` 及已注册名称；禁用插件会使运行时
  退役，下一个 turn 没有扩展工具；限定项目范围的
  插件在其项目之外不贡献任何内容；缺少
  权限的清单以 `PLUGIN_INVALID` 被拒绝；`~/.pi/agent/settings.json`
  从不会被写入。
- **关联规格**：`07-plugins/16-trusted-extensions.md` §2, §3, §11; D007; D387
- **验收**：安全、质量
- **里程碑**：MVP 之后（R7 v1）
- **状态**：部分自动化（`pnpm test:e2e:trusted-extensions`）；无头旅程覆盖了插件发现/投影、项目范围、加载状态与诊断，而原生选择器导入和显式启用仍属于渲染器/平台验证。

#### E2E-PLUGIN-imported-pi-package-wrapper: 已导入包的模块类型保留插件初始化

- **前置条件**：隔离的本地 Pi 包声明 `type: module`、
  `type: commonjs`，或不含 `type`；每个都有扩展与技能贡献。
  第四个夹具代表一个较旧的已导入 ESM 包，带有生成的
  CommonJS `main.js` 和匹配的清单。
- **步骤**：运行 `node --test apps/desktop/test/imported-package-skills-runtime.test.mjs`。
  通过生产导入器生成每个插件，通过
  `PluginRuntime` 和真实的子进程插件宿主加载它，读取其技能目录
  和正文，并检查其声明的扩展。在不加载较旧夹具的情况下
  重新导入它，然后加载较旧夹具本身。
- **预期结果**：每个新清单指向一个已存在的 `main.cjs`；三种包类型的初始化
  全部成功。源和两个复制出的 `package.json`
  文件保留相同字节。重复导入具有不同的路径/id 且
  加载成功；生成它不会改动较旧的清单、包装器和
  包文件。加载较旧夹具会将其生成的
  `main.js` 就地重写为 `main.cjs`，保留复制出的 `package.json` 字节，并
  完成初始化。被定制的 `main.js` 不会被重写。
- **关联规格**：`07-plugins/16-trusted-extensions.md` §3.2; ADR 0215。
- **验收**：质量
- **状态**：自动化的"导入到插件宿主"夹具。在并入最新 `origin/main` 之后针对已提交的
  任务候选运行；在交付证据中记录所测试的
  候选、基线、结果与环境。原生选择器、
  npm 依赖安装、Windows 执行，以及在 provider turn 期间执行第三方扩展，
  均不在此夹具覆盖范围内。

#### E2E-PLUGIN-imported-pi-package-skills: 显式包导入通过插件授权暴露技能

- **前置条件**：一个位于 npm 风格
  `node_modules/@fixture/package-skills` 路径下的本地夹具包，声明
  `pi.extensions` 和
  `pi.skills`。其技能包括一个直接的 Markdown 文件、一个含有
  `SKILL.md` 的目录，以及一个包含两个不同 `SKILL.md` 文件的集合。
  其中存在引用文件、资源、一个 `node_modules-note.txt` 资源，以及一个内部
  `node_modules` 依赖。第二个夹具只声明
  `pi.skills`。不需要下载第三方代码或安装依赖。
- **步骤**：
  1. 通过"插件 → 导入 pi 扩展"选择混合包，并
     检查生成的清单与复制的资源。用于无头
     验证时，将显式选定的路径传给同一个导入器。
  2. 在真实的 `PluginRuntime` 中加载生成的目录；检查
     `getSkills()` 并用 `loadSkillBody(id)` 读取每个文档。
  3. 仅授予 `agent.extension` 重新加载，然后仅授予
     `agent.prompt.inject` 重新加载。卸载插件并尝试旧的技能 ID。
  4. 导入仅含技能的包；确保辅助性的 `index.js` 不会被当作
     扩展。通过真实的
     Host `plugins.installFromPath` 安装一个生成的双技能夹具，列出它，读取其已安装清单和
     技能文件，然后卸载它。
  5. 尝试使用绝对路径、`..`、缺失或不支持的
     文件、内部依赖路径或后代符号链接的声明。超过
     32 个技能或 256 个目录的扫描上限，并检查失败清理。
- **预期结果**：四个已声明技能全部以独立的稳定 ID 出现，
  包括重复的 `SKILL.md` 基名，且加载它们会返回
  移除了 frontmatter 的正确正文。被导入的扩展仍是一个
  独立的贡献。资源及其相对路径在复制后保持完好；
  npm 安装祖先不会抑制该包，仅排除选择范围内
  的依赖目录片段。缺少技能授权时不产生任何
  技能目录条目，并产生既有的权限审计；
  授权可以在不改变 ID 的情况下恢复。卸载会移除两个目录，
  旧技能 ID 返回 `NOT_FOUND`。仅含技能的导入只声明
  `agent.prompt.inject`，且 Host 报告 `skills` 能力，
  同时保留两个技能文档。非法声明会失败，且不导入
  外部数据、不保留部分复制的插件。没有任何东西会自动
  导入 `~/.pi` 或运行 npm 生命周期脚本；显式的依赖路径
  可以运行 E2E-PLUGIN-import-extension-installs-dependencies 中描述的有界 npm 安装器。
- **关联规格**：`07-plugins/16-trusted-extensions.md` §3.2;
  `07-plugins/02-plugin-manifest-schema.md`; D007
- **验收**：E（工具与权限）、G（插件）、质量
- **里程碑**：MVP 之后（R7 v1）
- **状态**：部分自动化。`imported-package-skills.test.mjs` 覆盖
  导入发现、资源复制、授权和非法路径处理。
  `imported-package-skills-runtime.test.mjs` 驱动生成的空操作插件
  通过真实的插件宿主子进程，并验证目录/正文加载、
  授权移除/恢复和卸载。2026-09-13，一个独立的临时
  双技能夹具通过了真实 Host `plugins.installFromPath` → `plugins.list`
  → 已安装清单/正文读取 → `plugins.uninstall`；它只报告了
  `agent.prompt.inject` 和 `skills` 能力。原生选择器、
  渲染的插件行，以及在 provider turn 中调用已导入技能的流程
  在本场景中尚未执行；不声明完整的桌面旅程。

#### E2E-242: 扩展工具与钩子在 turn 中生效

- **前置条件**：一个已启用的夹具扩展，注册工具 `fx_add`，
  处理 `before_agent_start`（向系统提示词追加标记）、
  `tool_call`（带理由地阻止 `bash`），以及 `tool_result`（
  替换 `fx_add` 的输出）。
- **步骤**：1) 在 Agent 模式下启动一个 turn，其夹具模型先调用 `fx_add`
  再调用 `bash`。2) 检查 provider 请求。3) 检查工具结果。
  4) 切换到 Plan 模式并重复。5) 注册第二个扩展，声明
  一个名为 `read` 的工具。
- **预期结果**：系统提示词带有该标记；`fx_add` 在
  sidecar 中执行，无权限提示，且其结果是被替换后的值；
  `bash` 以扩展给出的理由被阻止，且该阻止在
  转录中可见；一条审计行记录扩展 id、工具名和耗时，
  不记录参数；在 Plan 模式下 `fx_add` 遵循非核心模式门控；
  `read` 冲突被拒绝并附带诊断，核心工具
  保持不变。
- **关联规格**：`07-plugins/16-trusted-extensions.md` §6, §7; ADR 0214
- **验收**：B（agent）、安全、质量
- **里程碑**：MVP 之后（R7 v1）
- **状态**：部分自动化（`pnpm test:e2e:trusted-extensions`）；Agent 模式的工具分发、ToolSearch 延迟、钩子、阻止和结果替换已通过，而 Plan 模式门控和核心工具冲突仍属额外验证。

#### E2E-TRUSTED-EXTENSION-custom-agent-stream-and-binding: 插件自有 agent 的流式与会话绑定

- **前置条件**：一个已启用的受信扩展调用 `registerAgent`，带有一个
  模型和一个夹具 `stream`/`complete` 实现。该夹具 provider
  没有 Host provider 行，也没有 Host 密钥。
- **步骤**：1) 加载扩展并检查 `ctx.modelRegistry` 中
  脱敏后的模型。2) 在空闲时调用 `pi.setModel(model)`。3) 运行一个 turn 并
  检查回调的 model/context/options。4) 重启或创建下一个
  turn。5) 尝试通过注册表读取 Host provider 密钥/secret 引用。
- **预期结果**：`registerAgent` 出现在已加载契约中，且该模型
  可被选择；`setModel` 只在
  `extension-agent:` provider id 下持久化当前会话绑定；插件回调流式输出助手
  响应并接收取消；下一个 turn 重新加载扩展并
  恢复相同的 agent 实现；注册表暴露模型元数据
  和认证可用性，但不暴露 Host 密钥、secret 引用、OAuth token 或任意
  Host 头。具有相同插件自有流式形态的 `registerProvider`
  行为等价。
- **关联规格**：`07-plugins/16-trusted-extensions.md` §5, §10; ADR 0258;
  D426
- **验收**：B（agent）、C（对话与流式）、安全、质量
- **里程碑**：MVP 之后（R7 v1）
- **状态**：部分自动化（`pnpm test:e2e:trusted-extensions`）：已加载
  契约、两种注册形式（`registerAgent` 与 `registerProvider`
  别名，各自的所有调用形式）、插件行上的自定义 agent 名称、
  脱敏注册表、`extension-agent:` id 下空闲时 `setModel` 的持久化，
  以及下一个 turn 通过插件自有传输恢复，均已通过。
  通过 `options.signal` 的取消、`stream` 形式回调的
  model/context/options 检查，以及跨会话模块共享，仍属
  额外验证。

#### E2E-243: 扩展命令与 UI 提示经渲染器往返

- **前置条件**：一个已启用的夹具扩展，注册命令 `greet`，
  依次调用 `ui.input`、`ui.select`、`ui.confirm`、
  `ui.notify`，并重命名会话。
- **步骤**：1) 打开全局搜索并检查命令区。2) 从
  输入框运行 `/greet`。3) 回答每个提示。4) 再次运行 `/greet`，
  并在输入提示打开时中止 turn。5) 在无
  活动会话的情况下运行 `/greet`。6) 挂接一个远程控制器（夹具）并运行 `/greet`。
- **预期结果**：`greet` 列在内置命令和插件命令之后，带
  扩展标签；每个提示显示扩展标签和路径；答案
  按顺序到达扩展；toast 出现；会话被重命名
  并触发 `session_info_changed`；被中止的提示解析为 `undefined`
  且命令结束；无会话时该入口被禁用并带工具提示；
  在远程控制下提示以 `UNSUPPORTED` 失败，且命令
  报告该失败。
- **关联规格**：`07-plugins/16-trusted-extensions.md` §8, §9, §10;
  `07-plugins/09-plugin-command-palette.md`
- **验收**：A（应用控制）、质量
- **里程碑**：MVP 之后（R7 v1）
- **状态**：部分自动化（`pnpm test:e2e:trusted-extensions`）；全局/输入框命令发现、提示代理往返、中止、会话重命名、exec 和 Host 自有队列已通过，而无会话和远程控制情形仍属额外验证。

#### E2E-244: 不支持的 API、加载错误和处理器超时降级为诊断

- **前置条件**：三个已启用的夹具扩展：一个在顶层导入
  `@earendil-works/pi-tui` 并调用 `ui.setWidget`；一个
  模块在加载时抛出异常；一个的 `context` 处理器永不解析。
- **步骤**：1) 启动一个 turn。2) 为每个条目打开诊断抽屉。
  3) 等待超过 30 秒的处理器上限。4) 禁用抛出异常的扩展并
  再启动一个 turn。
- **预期结果**：pi-tui 导入成功，`setWidget` 返回一个惰性的
  `dispose`，且每个成员记录一条诊断；抛出异常的
  扩展显示 `error`，附消息和堆栈，输入框显示一条
  单行通知，其余扩展仍正常加载；停滞的处理器
  在 30 秒后被放弃并记录一条诊断，且该 turn 以
  未修改的 context 完成；禁用后，通知在下一个 turn
  边界处消失，且没有运行中的 turn 被打断。
- **关联规格**：`07-plugins/16-trusted-extensions.md` §4.2, §4.4, §5, §6
- **验收**：质量
- **里程碑**：MVP 之后（R7 v1）
- **状态**：部分自动化（`pnpm test:e2e:trusted-extensions`）；加载错误和惰性的终端 UI API 降级为诊断，而停滞处理器超时和边界处禁用的旅程仍属额外验证。

#### E2E-245: 打包后的 sidecar 通过 jiti 加载 TypeScript 扩展

- **前置条件**：桌面应用的打包构建；一个夹具
  `~/.pi/agent/extensions/typed.ts`，使用 TypeScript 语法，导入
  `@earendil-works/pi-coding-agent` 和 `typebox`，并注册一个工具。
- **步骤**：1) 启动打包后的应用。2) 启用 `typed.ts`。3) 启动一个
  其夹具模型调用该工具的 turn。4) 检查 sidecar 打包产物
  清单中三个 pi 包的版本。
- **预期结果**：扩展加载无转译或解析错误；
  别名导入解析到 sidecar 自身的副本；工具执行；
  三个 pi 包版本完全一致，且 CI 版本锁定检查
  通过。
- **关联规格**：`07-plugins/16-trusted-extensions.md` §4.2, §13; ADR 0214
- **验收**：质量、发布
- **里程碑**：MVP 之后（R7 v1，最初作为打包技术验证交付）
- **状态**：由 `packages/agent-runtime/src/extensions/bundle.test.ts` 单元覆盖（从临时目录运行 esbuild 打包）；打包应用的 jiti 旅程仍为草稿，且不由无头运行器伪造。
#### E2E-PLUGIN-import-extension-installs-dependencies: 导入带 npm 依赖的扩展时，在首次加载前安装依赖

- **前置条件**：一个本地 pi 扩展包，含 `package.json`、`pi.extensions`、
  一个固定版本的纯 JavaScript `is-number@7.0.0` 依赖、一个 `workspaces` 字段，且
  没有 `node_modules`；已构建的工作区包和 npm 可用。
- **步骤**：1) 从本地目录生成已导入插件。2) 运行
  真实的有界安装器。3) 检查复制出的包、锁文件、已安装模块、
  生命周期标记和受信扩展加载报告。
- **预期结果**：插件根目录保存复制出的 `package.json`，其中 `workspaces`
  已被剥离。安装器运行两个仅限 registry、带 `--ignore-scripts` 的 npm 步骤；
  锁文件中每个 `resolved` URL 都仅限 registry，`node_modules/is-number` 存在，
  不写入任何生命周期标记，且受信扩展运行器报告 `loaded`，
  并已注册由依赖支撑的命令。
- **关联规格**：`07-plugins/16-trusted-extensions.md` §3.2, §10.2; ADR 0244
- **验收**：安全、质量
- **里程碑**：MVP 之后（R7 v1）
- **状态**：由 `pnpm test:e2e:plugin-import-deps` 自动化，覆盖确定性的
  安装器边界；完整的选择器/渲染器/turn 旅程仍是一个独立的
  验证面。

#### E2E-PLUGIN-import-extension-reports-missing-dependency: 依赖安装失败或依赖不可加载会被显式呈现，绝不静默

- **前置条件**：三个本地 pi 扩展包，其 `package.json`
  依赖使用不支持的 `file:`、git 和 HTTP tarball 来源；都没有
  `node_modules` 或锁文件。
- **步骤**：1) 生成每个已导入插件。2) 调用真实的依赖
  安装器。3) 检查返回的错误和生成的插件目录。
- **预期结果**：每个失败都是显式的，且发生在 npm 启动之前；已导入
  插件及其清单保持已注册状态，同时不残留任何可加载的 `node_modules` 或生成的
  锁文件。渲染器 toast/加载错误的旅程单独覆盖。
- **关联规格**：`07-plugins/16-trusted-extensions.md` §3.2, §4.4, §10.2; ADR 0244
- **验收**：安全、质量
- **里程碑**：MVP 之后（R7 v1）
- **状态**：由 `pnpm test:e2e:plugin-import-deps` 自动化，覆盖确定性的
  registry 来源拒绝边界；渲染器警告 toast 和 `load_error`
  行为仍是一个独立的验证面。


---

#### E2E-233: 纯图标操作以当前语言说明其用途

- **前置条件**：桌面应用正在运行，且视情况具备一个项目、一条聊天错误、
  一个 toast、一条更新通知、一个对话框、一个侧栏行、一个拉取请求和
  一个工作面板文件；UI 语言可以在英文和
  简体中文之间切换。
- **步骤**：1) 在错误、toast/更新、
  对话框、能力搜索、侧栏、拉取请求和文件查看器各个界面上，
  悬停每个纯图标操作。2) 用键盘聚焦相同的控件。
  3) 将 UI 语言切换为简体中文后重复。
- **预期结果**：每个控件在悬停和聚焦时暴露本地化的操作
  用途，具有相同的本地化无障碍名称，且不暴露原始图标
  名称或 URL 作为其操作标签。装饰性图标对辅助
  技术保持静默。英文和简体中文显示不同的目录值。
- **关联规格**：`04-ux/08-component-spec.md`,
  `04-ux/09-interaction-patterns.md`
- **验收**：无障碍、质量
- **里程碑**：M6+
- **状态**：源码契约已覆盖；桌面悬停/聚焦自动化待完成

#### E2E-PLAN-005: Plan 模式下带 `planSafeActions` 的插件工具是只读的（D384）

- **前置条件**：PI-Desktop 构建时启用了捆绑的 Browser
  插件（`pi.browser`），且工作区暴露一个
  规划器可达的 http(s) URL。目录列表使用默认的
  捆绑目录；本场景不需要安装第三方
  插件。
- **步骤**：1) 创建一个新会话，并从
  模式选择器将其切换到 Plan 模式。2) 发送提示词"Use the browser plugin to
  read `https://example.com`, summarize the page, and tell me what
  to change."。3) 等待规划器调用
  `plugin_pi_browser_Browser`（先 `action="navigate"`，随后
  `action="snapshot"`），并提交一份包含所请求
  摘要的计划。4) 批准该计划并确认 Agent 运行完成。
  5) 拒绝该计划，在 Plan 模式下重新发送相同提示词，并
  确认规划器仍可调用 `navigate` + `snapshot`。
  6) 通过浏览器插件要求规划器"click the sign-in button"，并确认
  该调用以
  `PERMISSION_DENIED` 被拒绝（Plan 调用永远不能点击）。7) 检查
  活动会话的工具列表，确认它显示 Browser 插件，
  且描述后缀为 `Plan mode: only navigate, snapshot,
  screenshot, console actions`。8) 切回 Agent 模式并
  确认相同提示词允许模型调用 `click` 和 `fill`，
  且没有该后缀。
- **预期结果**：Plan 模式可以为四个
  已声明只读操作驱动 Browser 插件，描述会告知模型哪些
  操作被允许，且任何变更性操作都会在插件看到该
  调用之前，以结构化的 `PERMISSION_DENIED` 错误被拒绝。
  Agent 模式保留完整的插件能力面。
- **关联规格**：`03-runtime/02-agent-runtime.md`,
  `03-runtime/03-tools-and-permissions.md`, `07-plugins/README.md`,
  ADR 0211
- **验收**：功能性、质量
- **里程碑**：M6
- **状态**：部分自动化：`test:e2e:plan` 覆盖 Plan 模式的宿主
  准入、持久模式/操作列表转发，以及夹具边界的
  变更拒绝；完整的 Electron Browser 旅程仍为草稿（仅在
  此界面发生变化时，于具备能力的环境中运行）

#### E2E-250: 上下文用量显示偏好切换检查器的主显数字

- **前置条件**：一个 Agent 会话已完成至少一个
  报告了 token 用量的 turn。设置 → AI → 默认值可达。
- **步骤**：
  1. 确认输入框工具栏的上下文环显示剩余容量
     （环接近满，百分比 ≈ 剩余 %，工具提示和 aria-label
     使用剩余量词汇）。
  2. 打开设置 → AI → 默认值，将上下文用量显示
     分段控件从"剩余"切换为"已用"。
  3. 返回聊天并检查上下文环：环的弧度现在
     按 `usedRatio` 填充（占用率低时接近空），百分比
     显示 ≈ 已用 %，弹层标题显示已用 token + 百分比，
     且工具提示/aria-label 使用已用容量词汇。
  4. 确认警告/临界环颜色仍遵循剩余容量：
     在剩余 > 25 % 时，即使已用 % 很高，环也保持中性色。
  5. 切回"剩余"并确认恢复原始显示。
- **预期结果**：显示模式一致地翻转环弧度、百分比、token
  计数、标题、工具提示和 aria-label。颜色阈值
  在两种模式下都基于剩余容量。
  全新配置文件的默认值是"剩余"。
- **关联规格**：`04-ux/06-settings-ia.md`, `04-ux/08-component-spec.md`,
  ADR 0223, `08-meta/decisions-log.md` (D398)
- **验收**：C（对话与流式）、质量（偏好）
- **里程碑**：M5
- **状态**：单元已覆盖（`context-usage.test.mjs`,
  `settings-general.test.mjs`）；完整场景为草稿

#### E2E-251: 自定义下拉菜单浮动显示，不改变页面布局

- **前置条件**：一个桌面构建，配置了 provider，至少一个
  项目/会话，以及默认深色主题。设置、插件、项目、
  聊天输入框、工作面板和侧栏界面均可达。
- **步骤**：1) 从设置、
  项目、插件、侧栏、输入框、Plan 批准和 Scope 打开每个可用的自定义
  下拉/菜单。2) 在触发器靠近窗口底部和右侧
  边缘时，以及周围页面/卡片有可滚动
  内容时重复。3) 在菜单保持打开时滚动所属窗格并调整窗口
  大小。4) 用 Escape 和点击外部关闭每个菜单。
- **预期结果**：每个自定义下拉菜单都是一个 body 级的固定图层，覆盖
  内容而不增加行/卡片高度，也不改变页面/侧栏/工作面板
  的分配。它保持在视口内，空间紧张时翻转或钳制，
  在滚动/调整大小后跟随其触发器，不被设置卡片或页面
  溢出裁剪，并在关闭时将焦点恢复到其触发器。原生 `<select>`
  弹层被排除在外，因为它们由操作系统渲染。
- **关联规格**：`04-ux/07-ui-design-system.md`,
  `04-ux/09-interaction-patterns.md`
- **验收**：质量、响应式布局、无障碍
- **里程碑**：M5+
- **状态**：源码契约已覆盖（`fixed-dropdown-surfaces.test.mjs`）；
  桌面旅程为草稿（仅在此界面发生变化时，于具备能力的环境中运行）

#### E2E-253: 项目组支持手动拖拽和键盘重排序

- **前置条件**：侧栏至少包含三个项目组，
  其中一个包含已置顶或已归档的项目，且每个项目都有稳定的
  宿主工作区/路径/目录。
- **步骤**：
  1. 按住一个项目标题，将其移动到另一个项目组
     上方或下方，观察插入线，然后释放。
  2. 点击一个项目标题，确认它仍然选中该项目并
     切换折叠，且不改变顺序。
  3. 聚焦同一标题并按 `ArrowUp` 或 `ArrowDown`；每个
     方向各重复一次。
  4. 重启应用并检查项目顺序。
  5. 从重排序后的项目打开一个会话，确认其宿主工作区、
     路径和目录保持不变。
- **预期结果**：项目组按释放时的顺序渲染，且
  手动顺序在重启后保持。没有重排序手柄，也没有 400ms
  延迟。插入线显示放置位置。标题暴露一个
  键盘可达的重排序操作，短点击不会重排序，
  `Escape` 取消进行中的拖拽，且既有的置顶/归档
  优先级规则保持完好。重排序从不改变项目的宿主
  工作区、路径、目录或会话排序。
- **关联规格**：`04-ux/08-component-spec.md`,
  `04-ux/09-interaction-patterns.md`, `03-runtime/04-data-storage.md`,
  `08-meta/decisions-log.md` (D399, D402, D403)
- **验收**：D（工作区）、F（持久化）、质量
- **里程碑**：M5
- **状态**：源码契约已覆盖（`app-store-sidebar.test.mjs`,
  `sidebar-preferences.test.mjs`, `sidebar-project-reorder.test.mjs`）；
  渲染的桌面旅程为草稿

#### E2E-254: 技能在第一个 Agent turn 加载

- **前置条件**：当前项目至少有一个激活的 Skill，已配置
  provider，会话在 Agent 模式下运行，且存在另一个
  按需能力（例如 `BrowserPreview` 或插件工具）。
- **步骤**：
  1. 打开一个新的 Agent 对话，发送与激活
     Skill 描述匹配的提示词。
  2. 检查第一个 provider 请求及其工具列表。
  3. 确认模型以精确的 id 调用 `Skill`，且未先调用
     `ToolSearch`，返回的文档是技能正文。
  4. 从输入框发送 `/<skill-id>` 并检查随后的 turn。
  5. 将会话切换到 Plan 模式并再次检查工具列表。
  6. 禁用或移除所有 Skill，再启动另一个 Agent turn。
- **预期结果**：只要技能目录非空，`Skill` 就随
  第一个请求发出，且从不出现在 `# On-demand tools` 之下，因此无论
  是匹配任务还是 `/skill-id` 调用都能加载正文，无需发现
  往返。`ToolSearch` 对其他按需能力仍然存在，且
  从不返回 `Skill`。Plan 模式省略该工具和 `# Skills` 区块，
  空目录则完全不注册 `Skill` 工具。
- **关联规格**：`03-runtime/02-agent-runtime.md` (§7.1),
  `03-runtime/03-tools-and-permissions.md` (§2.1),
  `04-ux/04-builtin-commands.md` (§8), `08-meta/decisions-log.md` (D404),
  ADR 0048, ADR 0219, ADR 0230
- **验收**：C（对话与流式）、E（工具与权限）、质量
- **里程碑**：M5
- **状态**：单元已覆盖（`packages/agent-runtime/src/runtime.test.ts`）；
  渲染的桌面旅程为草稿
  （仅在此界面发生变化时，于具备能力的环境中运行）

#### E2E-255: 顿号打开斜杠菜单

- **前置条件**：有中文输入法可用，输入框草稿为空，
  且至少存在一个斜杠条目（内置别名、模板、插件命令
  或 Skill）。
- **步骤**：
  1. 草稿为空时输入 `、`，检查输入框。
  2. 继续输入命令名并接受高亮行。
  3. 输入在其他字符之间包含 `、` 的草稿。
  4. 发送一个首字符输入为 `、` 但未接受任何
     行的草稿。
- **预期结果**：已确认的 `、` 被就地改写为 `/`，普通
  斜杠菜单打开，其过滤和键盘行为与输入
  `/` 相同，且光标停留在被替换字符之后。草稿中
  任何靠后位置的 `、` 保持为未触碰的文本，`@` 文件菜单从不
  响应该符号。
- **关联规格**：`04-ux/04-builtin-commands.md` (§9),
  `04-ux/08-component-spec.md` (§11), `08-meta/decisions-log.md` (D405),
  ADR 0024, ADR 0231
- **验收**：C（对话与流式）、本地化、质量
- **里程碑**：M2
- **状态**：单元已覆盖（`packages/shared/src/composer-trigger.test.ts`,
  `apps/desktop/test/composer-ime.test.mjs`）；渲染的桌面旅程为草稿
  （仅在此界面发生变化时，于具备能力的环境中运行）

#### E2E-256: 空主页项目名在侧栏项目间切换

- **前置条件**：侧栏中至少打开两个本地项目；
  可见聊天是一个空的、绑定项目的会话。
- **步骤**：
  1. 确认主视觉标题为当前项目名加下划线。
  2. 点击带下划线的名称并检查菜单。
  3. 搜索一个侧栏项目，选择另一个项目，并检查
     主视觉和侧栏。
  4. 重新打开菜单并选择"打开项目"，然后选择一个文件夹或取消。
  5. 重新打开菜单，选择"克隆 git 项目"，粘贴仓库 URL，然后
     选择一个父文件夹或取消。
  6. 打开一个临时的空会话，确认下划线不存在。
- **预期结果**：点击打开一个可搜索的、固定定位的切换器，列出侧栏
  已打开的项目，而不是文件夹选择器。选择另一个项目
  会激活它并落到该项目的空主页（存在空
  会话时复用之）。"打开项目"仍使用文件夹选择器。"克隆
  git 项目"先要求 URL，再要求文件夹，运行 `git clone`，并打开
  克隆出的项目。临时和无会话的主视觉保持没有切换器。
  Escape 和点击外部关闭菜单。
- **关联规格**：`04-ux/01-ui-ia.md`, `04-ux/08-component-spec.md`
- **验收**：质量（导航与无障碍）
- **里程碑**：M5
- **状态**：单元已覆盖（`home-project-switcher.test.mjs`,
  `git-clone.test.mjs`, `sidebar-preferences.test.mjs`）；完整 UI 场景为草稿
  （仅在此界面发生变化时，于具备能力的环境中运行）

#### E2E-CLONE-public-hostname-rejects-private

- **前置条件**：主页项目切换器的"克隆 git 项目"操作可用。
- **步骤**：1) 输入 `https://127.0.0.1/org/repo.git`、`http://localhost/org/repo.git`、`https://10.0.0.5/org/repo.git` 和 `git@127.0.0.1:org/repo.git`。2) 输入 `https://github.com/org/repo.git` 和 `git@github.com:org/repo.git`。
- **预期结果**：私有、回环和链路本地远程地址在 `git clone` 运行之前被拒绝。公开的 GitHub HTTPS 和 SSH 远程地址仍能解析出文件夹名。`file:` 和带密码的 URL 保持被拒绝。
- **关联规格**：`04-ux/01-ui-ia.md`, ADR 0247, D416
- **验收**：安全、D（工作区）
- **里程碑**：M5
- **状态**：单元已覆盖（`apps/desktop/test/git-clone.test.mjs`）


#### E2E-258: 创建项目对话框可以从 git 仓库开始

- **前置条件**：创建项目对话框从 Projects 标题打开
  （不要求已存在项目）；已安装 `git`。
- **步骤**：
  1. 将来源选择器切换为"Git 仓库"。
  2. 粘贴 `https://github.com/octocat/Hello-World.git`，确认项目
     名称字段预填为 `Hello-World`，然后输入自定义名称。
  3. 选择克隆目标文件夹，确认目标行显示它。
  4. 确认"创建"并检查工作区、侧栏和项目归档。
  5. 重新打开对话框，切换到"Git 仓库"，粘贴一个私有或
     格式错误的远程地址。
- **预期结果**：对话框将文件夹列表替换为仓库 URL 字段加
  克隆目标行，并保留一个项目名称字段。来源选项和
  字段是无描边的填充瓦片；键盘焦点使用共享的
  强调色描边环。"创建"保持
  禁用，直到 URL 解析成功且已选择文件夹。确认后运行
  `git clone` 到所选文件夹，且渲染器仍拥有项目
  创建：检出内容成为主根目录，输入的名称命名该
  组。私有、回环、链路本地、带凭据和格式错误的
  远程地址使"创建"保持禁用（ADR 0247），且不写入任何文件夹。
- **关联规格**：`03-runtime/01-ipc-protocol.md` §9, `04-ux/08-component-spec.md`,
  ADR 0273, ADR 0233, ADR 0247
- **验收**：质量（项目入口）、D（工作区）
- **里程碑**：M5
- **状态**：单元已覆盖（`apps/desktop/test/project-create-dialog.test.mjs`,
  `apps/desktop/test/git-clone.test.mjs`）；完整 UI 场景为草稿（仅在
  此界面发生变化时，于具备能力的环境中运行）
#### E2E-257: 导入到已归档项目会恢复其可见性

- **前置条件**：一个持久项目已在渲染器
  侧栏偏好中被归档，并从默认侧栏隐藏。一个核心导入
  候选带有该项目的路径，且一个测试插件能以
  显式宿主项目 id 导入会话。
- **步骤**：
  1. 打开设置 → 项目归档，确认已归档项目
     在那里仍可用，而默认侧栏省略它。
  2. 扫描并导入项目路径属于该
     已归档项目的核心候选。
  3. 确认该项目及其已导入会话出现在默认
     侧栏中，然后再次归档该项目。
  4. 使用插件的 `session.importBatch`，传入现有项目的 id，并
     在宿主刷新事件后检查侧栏。
  5. 在不导入任何内容的情况下刷新会话，导入一个无路径会话，
     并重复导入一个已导入过的会话。
- **预期结果**：每个成功的、新增项目绑定会话的导入，会针对该
  精确规范化项目路径清除归档呈现状态，并
  使项目/会话可被发现。普通刷新、无路径
  会话、被跳过的导入，以及没有显式
  项目绑定的插件历史路径，都不会改变归档状态；不删除或
  重建任何宿主项目行或转录。
- **关联规格**：`04-ux/06-settings-ia.md`, `04-ux/08-component-spec.md`,
  `03-runtime/04-data-storage.md`, ADR 0236, D407
- **验收**：C（对话与流式）、F（持久化）、G（插件）、
  质量
- **里程碑**：M6+
- **状态**：单元/源码契约已覆盖（`sidebar-session-groups.test.mjs`,
  `project-import-archive.test.mjs`, `plugin-session-refresh.test.mjs`）；
  渲染的桌面旅程为草稿（仅在此界面发生变化时，于具备能力的
  环境中运行）

#### E2E-IMPORT-codex-scan-filters-synthetic-titles

- **前置条件**：一个 Codex 归档，其会话以合成
  注入开头（`# Context from my IDE setup:`, `# In app browser:`,
  `# Browser comments:`, `# Files mentioned by the user:`,
  `# Diff comments:`, `# Selected text:`, `# Review findings:`,
  `# AGENTS.md`, `You are Codex`, `<environment>`），且至少有一个会话
  的存储时间戳损坏或超出范围。
- **步骤**：
  1. 在该归档上运行 设置 → 会话导入 → 扫描。
  2. 检查候选标题和每个会话显示的 createdAt/updatedAt。
  3. 导入一个其第一条真实用户消息位于合成
     注入之后的会话。
- **预期结果**：候选标题来自第一条真实用户消息——
  合成注入从不作为标题出现，而真正粘贴的
  以 `#` 开头的 markdown（例如 `# Role: …`）会被保留。用户
  消息全部为合成内容的会话不会作为候选出现。
  损坏或超出范围的存储时间戳回退到源文件的
  mtime，绝不回退到导入时刻。
- **关联规格**：`03-runtime/01-ipc-protocol.md`,
  `04-ux/06-settings-ia.md`, D320
- **验收**：C（对话与流式）、F（持久化）、质量
- **里程碑**：M6+
- **状态**：单元已覆盖（`importer-codex-scan.test.mjs`）；UI 旅程为草稿
  （仅在此界面发生变化时，于具备能力的环境中运行）

#### E2E-LAYOUT-three-column-width-priority

- **前置条件**：一个桌面会话在非设置路由中打开，具有
  持久化的首选工作面板宽度，且窗口足够宽以容纳三
  列。
- **步骤**：
  1. 打开工作面板并请求用户的首选宽度。
  2. 向内分隔条向 MainChat 左边缘拖动，包括
     指针预览期间，然后释放。
  3. 在布局折叠侧栏之后手动重新打开侧栏。
  4. 关闭工作面板并确认侧栏恢复；在
     手动折叠侧栏后重复。
  5. 用 `ArrowLeft`、`ArrowRight`、`Home` 和 `End` 重复分隔条变更。
  6. 在工作面板关闭的情况下导航到真实的"插件"、"拉取请求"和"计划"路由，
     然后折叠侧栏。在浅色和深色主题中，
     测量两个标题栏操作，并将其静止/悬停样式与
     共享的工作面板开关对比。重新打开侧栏，再次折叠它，并在每个路由上使用
     "新建任务"返回到可编辑的聊天输入框。
- **预期结果**：普通的 `.main-titlebar` 操作（没有预览 chrome
  祖先）渲染为居中的 28px 方形目标，具有共享的透明
  静止表面、次级墨色、圆角和语义化悬停底色/主墨色。
  悬停不改变几何；侧栏和"新建任务"操作保持可用。
  原生窗口宽度从不改变。MainChat 的测量值从不
  低于 450px——包括拖拽中，以及 `sidebar-out` 仍占用 flex
  空间时。面板的有效最大值是客户端宽度减去 450px
  MainChat 下限和展开的侧栏宽度，没有固定像素上限。当
  该预算耗尽时，展开的侧栏立即折叠，之后面板
  可以继续增长。手动重新打开会先消耗面板宽度；
  尽可能保留 MainChat，否则落到 460px 的重新打开
  目标。关闭面板只恢复被布局折叠的侧栏。
  分隔条的 ARIA 最小/最大值遵循相同的动态预算。面板
  头部的 `+`、最大化和视口固定的折叠开关解析为单个
  控件间距（`--ds-work-panel-control-gap`），操作组自身没有分隔线、内边距或外边距，
  且三者都是共享的 chrome 图标控件：
  透明底座上的 28px 方形，仅有语义化悬停底色，因此
  头部显示安静的图标而非填充或凸起的方块。折叠
  开关的打开状态只改变其字形和墨色。
- **在运行中的应用中测量的覆盖层覆盖范围**：在"插件"路由上打开一个插件
  模态框；在标题栏带内，工作面板开关处的最顶层命中是
  模态框遮罩；标题栏带在那里不是最顶层命中，因此它不会
  绘制在模态框遮罩之上；关闭模态框后路由保持干净。
  `pnpm test:e2e:layout` 将这四个命中断言为渲染器 DOM/CDP 证据，
  而非原生命中测试证明。
- **关联规格**：`04-ux/01-ui-ia.md`, `04-ux/07-ui-design-system.md` §10,
  `04-ux/08-component-spec.md` §1 和 §5, `04-ux/09-interaction-patterns.md` §8,
  ADR 0238
- **验收**：F（持久化）、质量
- **里程碑**：M6 后桌面外壳维护
- **状态**：自动化（`scripts/e2e-three-column-layout.mjs` 经由
  `pnpm test:e2e:layout`——固定窗口宽度不变性、指针拖拽全程的 450px 下限、
  在该下限处一个不换行的输入框工具栏（模型芯片折叠为 32px 图标）、侧栏
  让位/恢复、460px 重新打开目标、面板操作组的共享
  控件间距、预览模式，以及普通"插件"/"拉取请求"/"计划"标题栏
  源码契约。`chrome-control-geometry.test.mjs` 中的源码契约还覆盖共享
  禁用状态和面板控件的透明底座；面板表面仍
  需要上述的人工目检。DOM/CDP 检查确立渲染器行为，而非
  原生 Windows/Linux 命中测试；原生平台检查
  保持独立。
  单元覆盖见
  `work-panel-resize.test.mjs`

#### E2E-LAYOUT-work-panel-maximize

- **前置条件**：一个桌面会话已打开且工作面板可见。
  1. 记录当前面板宽度。如果侧栏已展开，折叠它；
     然后点击面板头部的 `+` 操作打开一个真实的工作面板标签页。
  2. 点击面板头部的预览开关。
  3. 在侧栏折叠和展开状态下，于 macOS 窗口化/全屏和 Windows/Linux 上
     检查头部边框盒和标签页对齐。确认
     覆盖行和占位块既不声明 drag 也不声明 no-drag，且不以不透明
     绘制覆盖面板控件。
  4. 使用原生指针输入，点击侧栏和
     "新建任务"控件的中心和边缘；确认侧栏切换，且"新建任务"退出预览进入
     可编辑输入框。重新进入预览，操作标签页、关闭、添加、恢复、
     面板开关和原生控件，然后拖动头部空白区域并确认
     原生窗口移动。在浅色/深色主题和两种侧栏状态下重复。
- **预期结果**：进入预览模式会停止渲染 MainChat 并把它的
  宽度让给面板，因此面板跨越客户端区域减去展开的
  侧栏（侧栏折叠时为整个客户端区域）。原生
  窗口从不改变大小。预览模式开启时分隔条
  是惰性的（`aria-disabled`）。离开预览模式恢复之前的面板宽度，
  并保持用户最后选择的侧栏状态。该模式是瞬态的：
  不持久化，且面板关闭时结束。预览模式在 MainChat
  缺席时保持外壳的新建任务、侧栏和系统窗口操作可达。
  面板头部是预览窗格中唯一的拖拽所有者。其
  实际边框盒和第一个标签页在每个平台上都至少在外壳操作之后 8px
  处开始，包括展开侧栏时的"新建任务"。左内边距为 8px，
  但折叠侧栏窗口化 macOS 除外（88px）。预览行将共享的
  `--ds-window-lead-inset`（76px 原生控件簇边缘加 12px 间隙）
  渲染为其自身的左内边距；检查读取的是解析后的内边距，而不是
  复述该数字。全屏保留 8px 内边距的操作通道。
  右侧原生控件的边界排除保持完好。控件接收
  原生点击而不移动窗口；头部空白区域仍可拖动窗口。
  头部高度的背景绘制填满被排除的通道而不隐藏控件。
- **关联规格**：`04-ux/01-ui-ia.md`, `04-ux/07-ui-design-system.md` §10,
  `04-ux/08-component-spec.md` §5, `04-ux/09-interaction-patterns.md` §8,
  ADR 0238 §6, issue #289
- **验收**：F（持久化）、质量
- **里程碑**：M6 后桌面外壳维护
- **状态**：部分自动化（`scripts/e2e-three-column-layout.mjs`——
  预览进入/退出、DOM 操作行为、头部边框盒排除、行/占位块
  拖拽所有权，以及两种侧栏状态下全平台/全屏 CSS 夹具）。
  DOM 点击和 CDP 输入不是原生命中测试证明；原生指针、
  窗口拖拽和视觉检查仍是每个平台必需。分支上
  的运行是探索性的，不满足集成主干的门禁。

#### E2E-LAYOUT-sidebar-project-group-fold

- **前置条件**：通过宿主播种的四个保留的侧栏项目组：
  一个持有跨四个日期分桶的五个会话，一个持有单个
  会话，一个持有零个会话，一个持有十个置顶会话。
  `prefers-reduced-motion` 未设置。
- **步骤**：
  1. 检查各组：主体分层、行数和日期标签数、空
     状态、每个展开的组贡献给下一组的尾部，以及
     非项目列表的预算。
  2. 用真实指针点击其目录行折叠多行组——
     滚动到可见并确认命中该按钮——并在约半秒内
     逐帧读取组主体的高度、不透明度、解析后的 `grid-template-rows` 和
     到下一组的距离，同时记录折叠自身的
     `transitionrun` / `transitionend`。
  3. 再次展开它并确认打开状态的几何恢复。
  4. 在同一次动画内折叠并重新展开。
  5. 在模拟 `prefers-reduced-motion: reduce` 下重复折叠。
  6. 将置顶列表滚动到最后一行。
- **预期结果**：一个项目组是一个网格行（`grid-template-rows: 1fr`），
  在 200ms 正常时长内动画到 `0fr`——没有 `max-height` 钳制，没有
  不透明度过渡——因此折叠是单一连续的高度渐变，没有
  平台期后接突跳，且每一帧 `opacity` 都保持 1：行被
  裁剪，从不淡出。折叠触发一次过渡，其自身事件报告
  200ms 正常时长。行被一个内部 `min-height: 0`
  盒子裁剪，1px 行距加上组的 2px / 7px 内边距位于该裁剪
  之内的列表上，因此内边距随行一起移动。展开组的 7px 内边距
  加上 1px 滚动条间隙，读起来是对下一组的 8px 尾部；列表中
  最后一组没有邻居，因此改为对其自身内边距和
  裁剪进行检查。折叠组的尾部随行一起离开，其区块是
  头部加 1px 滚动条间隙，其行在组为 `aria-hidden` 和 `inert`
  期间保持挂载于裁剪边缘之外。飞行中途反转会在
  它到达的帧上转向，并落回打开高度而无
  过冲，空组以同样方式折叠其空状态。在
  减少动效下两个端点都保留，移动过程被去掉。置顶
  列表在 `min(233px, 30vh)` 内持有八行并滚动到其余
  行，独立列表保持其 flex 列和 146px 预算。组的
  缩进、排序和工作区状态不变。
- **关联规格**：`04-ux/01-ui-ia.md`, `04-ux/07-ui-design-system.md` §6.1 和
  §13, `04-ux/08-component-spec.md` §6.2, `08-meta/decisions-log.md`
  (2026-09-16, 侧栏列表节奏与项目组折叠)
- **验收**：质量
- **里程碑**：M6 后桌面外壳维护
- **状态**：自动化（`scripts/e2e-three-column-layout.mjs` 经由
  `pnpm test:e2e:layout`——宿主播种的组和置顶、命中测试的 CDP 指针
  点击、跨真实折叠的逐帧高度和不透明度采样、
  过渡自身报告的时长、飞行中途反转，以及减少动效
  模拟）。单元覆盖见
  `apps/desktop/test/sidebar-collapse-animation.test.mjs` 和
  `apps/desktop/test/sidebar-pinned-rendering.test.mjs`。采样值是
  渲染器几何，不是人工目检。

#### E2E-LAYOUT-sidebar-row-states

- **前置条件**：宿主播种的项目、置顶和独立对话；
  一个当前工作区；使用隔离数据和配置目录构建的桌面。
- **步骤**：在深色和浅色主题中，选中一个项目对话，悬停其
  项目标题和一个未选中的对话，然后悬停已选中的行。
  演练窗口失焦处理器、放置目标样式、项目操作悬停
  和键盘 Tab/Shift+Tab 焦点。折叠并重新打开所选对话的
  组。选中置顶和独立对话。打开设置并返回。
  启用减少动效并检查两种行过渡时长。
- **预期结果**：项目和对话的悬停背景、圆角和过渡
  一致。标题按钮保持透明。只有对话使用选中
  填充，它优先于悬停；工作区标识仍是一个独立的圆点，
  没有持久的头部填充。折叠从不把项目提升为选中。
  置顶和独立行使用相同的选中表面。键盘焦点
  保留轮廓，操作按钮保留局部反馈，放置目标绘制
  优先于悬停，失焦会释放悬停而不清除选中。设置
  替换侧栏导航，返回时恢复对话和工作区
  上下文，且不出现第二个选中行。渲染组件测试还
  覆盖无选中会话、待决目的地和非聊天页面状态。
- **关联规格**：`04-ux/01-ui-ia.md`, `04-ux/08-component-spec.md`,
  `04-ux/09-interaction-patterns.md` §9.1c
- **验收**：C、D、质量
- **里程碑**：M6 后桌面外壳维护
- **状态**：经由 `pnpm test:e2e:layout` 和
  `scripts/e2e/sidebar-row-states.mjs` 自动化：真实 CDP 指针/键盘输入和
  计算样式断言。窗口失焦/聚焦事件和放置目标类
  是为这些样式检查注入的；这不是原生焦点/拖拽测试。
  单元覆盖：`sidebar-navigation.test.mjs`, `sidebar-pinned-rendering.test.mjs`。

#### E2E-LAYOUT-sidebar-settings

- **前置条件**：构建的桌面，隔离的宿主/配置，可见的聊天侧栏。
- **步骤**：
  1. 在深色/浅色调色板和 darwin/win32/linux CSS 分支中，比较
     主页侧栏和设置导航栏的颜色、图像层、尺寸和位置。
     检查透明祖先和不透明的设置内容/标题栏。
  2. 通过"返回应用"返回，同时追踪侧栏插入、宽度和
     animationstart 事件。重复快速往返、先前折叠的
     侧栏，以及打断入场动画的设置导航。
  3. 显式重新打开折叠的侧栏，然后在减少动效下重复设置
     返回。在旧式和规范
     主题色覆盖及侧栏背景图像下重复材质比较。
- **预期结果**：两个导航表面共享一种材质。设置导航
  和外壳没有入场动画；只有其不透明窗格内嵌套的内容进入包装器
  有动画，且该动画仅限不透明度，因此不会
  困住 `position: fixed` 覆盖层。设置对话框覆盖整个窗口，包括导航栏。在 macOS
  上，导航栏背后的所有祖先都是透明的，而右侧
  内容和标题栏保持不透明。返回到展开的侧栏时，
  以 275px 开始并保持，没有 sidebar-in 事件；折叠的侧栏保持缺席。
  真正的重新打开仍产生 sidebar-in 和宽度渐变。旧式主题色
  输入对两个导航栏都保持支持，且规范覆盖优先。
- **关联规格**：`04-ux/06-settings-ia.md`, `04-ux/07-ui-design-system.md`,
  `04-ux/08-component-spec.md` §1.4 和 §1.7
- **验收**：A、C、质量
- **里程碑**：M6 后桌面外壳维护
- **状态**：经由 `pnpm test:e2e:layout` 和
  `scripts/e2e/sidebar-settings.mjs` 自动化，使用可信 CDP 指针/键盘输入、
  变更时刻和后续几何采样、动画事件和计算
  样式。CDP 焦点模拟使隔离页面在其原生
  窗口被遮挡时继续绘制；否则 Chromium 会冻结 CSS 动画和悬停输入。
  平台分支和调色板是渲染器模拟，不是原生
  Windows/Linux 或 OS 材质/主题验证。可选的
  `PI_DESKTOP_LAYOUT_ARTIFACT_DIR` 捕获渲染器截图。
  `sidebar-settings-return.test.mjs` 中的状态测试覆盖初始呈现、两个被打断的
  阶段、隐藏状态变化和反转。`settings-dialog-overlay.test.mjs`
  覆盖全窗口覆盖层契约。`pnpm test:e2e:theme-surfaces`
  在真实 Chromium 中验证不透明回退和旧式主题覆盖。

#### E2E-AGENT-alt-enter-steers-active-turn: Enter 追加跟进，Alt+Enter 引导活动 turn

- **前置条件**：一个配置了模型且带有可控
  流式响应/工具的会话；附件情形需要一个支持图像的模型。
- **步骤**：
  1. 启动一个提示词，然后输入跟进内容并按 Enter。确认出现一个 FIFO 行。
  2. 在同一 turn 期间，输入一条更正并按 Alt+Enter。用
     一个图像芯片，以及在当前请求结束前两条更正，分别重复。
  3. 完成当前响应/工具批次，检查下一个模型输入、
     转录和持久 turn id。让 turn 结束并观察跟进。
  4. 在关闭 Enter 发送、自动补全菜单打开、Shift+Enter、
     Alt+Shift+Enter 和中文输入法候选确认的情况下重复。检查 macOS
     （`⌥+Enter`）和 Windows/Linux（`Alt+Enter`）上的发送工具提示。
  5. 让引导与 turn 完成、停止和待决计划批准竞速；
     在被拒绝的请求待决时切换会话。
  6. 在运行中更改下一 turn 的模型，然后引导。验证活动
     模型和权限配置保持不变。
  7. 在父级等待后台代理时引导；让它们继续运行
     并验证父级在其报告完成前收到更正。
  8. 完成后重新加载，并在引导已保留一个流式回复
     之后模拟崩溃。检查行序、恢复的文本和所属 turn。
  9. 在引导被接受但其回复开始前重新加载渲染器，
     然后按停止并检查持久化的转录。
- **预期结果**：Enter 排队一个普通跟进。Alt+Enter 在当前
  turn 中创建一个用户行，没有队列行，也没有新的公开 `agent_start`。
  已开始的工具先完成，然后下一个请求包含更正/图像。
  普通 FIFO 只在持久 turn 定案后开始。输入法和
  换行操作从不提交；空闲时 Alt+Enter 正常发送。过期/已关闭的
  目标把草稿留在其自己的会话中，从不会使活动 turn 失败。
  已接受的输入在停止后不会独立重放。已完成的回复
  和已接受的引导输入在渲染器重新加载和停止后保留在历史中。
  终态助手快照就地替换临时快照；崩溃
  恢复保留最新
  检查点和相邻的引导行，且无重复。
- **关联规格**：`03-runtime/01-ipc-protocol.md` (§5.1a),
  `03-runtime/02-agent-runtime.md` (§4.0), `03-runtime/04-data-storage.md`,
  `04-ux/09-interaction-patterns.md` (§3.5), ADR active-turn-steering
- **验收**：C（对话与流式）、E（工具与权限）、质量
- **里程碑**：M5
- **状态**：草稿。现有回归套件覆盖周边行为；
  渲染的引导旅程尚未运行
  （除非明确要求，否则不在本地运行 E2E）。

#### E2E-SESSION-content-search-and-message-navigation

- **范围**：桌面全局搜索、宿主搜索投影，以及原始
  对话导航（issue #270, ADR session-content-search）。
- **前置条件**：至少 65 个可见会话，带有共享的正文关键词；
  一个会话有 125 条匹配的用户/助手消息。包括仅正文
  关键词、仅元数据匹配、一个已归档会话、一个软删除会话、
  一/两个字符的 CJK 词、字面量 `%`、`_`、引号和一个路径。包括一个
  匹配位于最近 100 条消息之外的长会话，以及一条
  匹配文本位于 100,000 个字符之后的消息。包括一个正在流式输出的
  对话，以及一个具有重复物理消息行的夹具。
  包括一个嵌套助手回答，其 Task 在其 60 行页面之外、
  该 Task 的一份较后终态副本、折叠的活动、隐藏的 Markdown 链接
  目标、强调定界符，以及文件芯片目录。
  添加被无关中英文句子包围的短匹配
  句子、匹配之前的多条短行、一个带引号的句子、一个含
  句点的文件路径，以及一条长于 180 个字符的匹配句子。
- **步骤**：搜索仅正文的用户和助手词，然后重命名所属
  会话并重复。检查聚合计数和发送者/时间/片段标签。
  加载每个结果页。打开一个会话标题及其两个片段；
  验证每个片段都关闭搜索、打开同一原始对话，
  并滚动到各自的匹配文本。标题选中其第一个片段。
  检查普通 Markdown、消息操作和输入框。用同一 turn 中的两个助手
  片段、一个最近页面之外的旧目标，以及
  100,000 个字符之后的匹配重复。验证可见高亮，且布局
  稳定不会把目标拉走。向上阅读并无间隙地加载较后消息。
  使用最新消息控件恢复实时转录。在
  活动对话内滚动，重新打开搜索，并选中它自己的结果；在
  同一窗格内定位目标。编辑、重试、分支和删除一条旧消息。重新打开搜索并检查保留的查询。
  用 CJK 和符号重复。验证连续的中文短语可匹配，
  而在其字词之间插入空格只匹配带该空格的文本。
  在延迟的第一页
  和后续页请求乱序解析时快速更改查询。在加载中关闭/重新打开。
  在瞬时搜索错误后重试。
  打开嵌套回答并验证所属 Task 被揭示，且其
  既有停靠区滚动到该回答。在长前缀之后搜索隐藏的 URL、定界符和
  芯片目录；验证相应的可见元素
  被高亮。用滚轮/按键手势打断布局校正。
  在输出流式时翻页普通历史，然后用
  搜索、另一个结果、新 turn 打断一个待决页面，并回到最新。在不改变
  消息 ID 的情况下更改修订版本。编辑/重试一条可见但显示被截断的
  消息，并验证规范的完整文本成为操作输入。
  搜索一个运行中的对话并返回其实时流，然后切换
  对话。使用方向键、Enter、Escape、Tab 和 CJK 输入法确认，并
  演练页面/设置/插件命令结果。
  搜索一个位于中间句子的词，验证
  结果显示该句子，且字面匹配处有背景高亮。
  在多处换行之后，以及浅色和
  深色主题的窄窗口宽度下重复。长句截断必须保持整个匹配查询
  可见；短预览必须省略无关的相邻句子。
- **预期结果**：每个匹配的可见会话都可达；计数覆盖全部
  125 条消息，无重复会话行。归档可见性遵循
  既有的显式搜索规则，已删除会话从不出现。每个
  片段直接打开其所属对话，没有中间
  上下文阅读器、纯文本替换或"返回对话"操作。
  每个选中的片段都落到其精确消息和匹配的渲染文本，
  包括旧历史和单个助手片段。阅读窗口
  加载不覆盖实时输出。新 turn 返回实时转录。
  对历史消息的操作正常工作，且不残留过时行。
  嵌套回答落到原始 Task 停靠区；仅源文本的匹配落到
  其渲染所有者。普通翻页保留当前流式内容。
  被打断的读取不能重新打开停靠区或恢复过期/加载中视图，
  同 ID 编辑会替换过时的显示内容。消息操作从不使用
  被裁剪的文本作为输入。
  快速选择另一个结果会拒绝过期目标/页面完成。
  在选择前删除结果会报告失败，而不是落到末尾。
  较新的查询所有权优先于过期结果/错误。输入法 Enter 不
  执行操作。搜索传输失败是显式的。
  既有命令、页面、设置和键盘导航仍然工作。
- **状态**：草稿；Rust 和渲染器单元回归覆盖数据/查询
  边界。完整的渲染 E2E 需要显式授权的运行。

### MCP 市场场景（`pnpm test:e2e:mcp-market`，无头协议级）

| ID | 场景 | 验证 |
|---|---|---|
| E2E-MCP-MARKET-NET-BOUNDARY | URL 守卫拒绝凭据、回环、私有、特殊用途 IPv4、v4 映射、ULA、站点本地和链路本地绕过形式（含结尾点号）；Main 钉住所检查的公开地址并复查 HTTPS 重定向 | 确定性守卫断言；DNS 钉住和有界响应的源码契约覆盖 |
| E2E-MCP-MARKET-SEMANTICS | Registry 记录映射到安装模板，保留包版本、命名/位置运行时/包参数以及必需/可选环境变量 | 确定性映射断言 |
| E2E-MCP-MARKET-INSTALL | 内置目录条目经 `resolveCatalogEntry` 解析并通过宿主 `mcp.upsert` RPC 安装；记录落在 `~/.agents/servers/` | 真实宿主二进制，隔离临时 HOME |


#### E2E-SKILL-MARKET-NET-BOUNDARY: 公开 HTTPS 技能来源拒绝私有和回环 URL

- **前置条件**：共享的公开网络助手和主进程
  公开 HTTPS 客户端，带可注入的 fetch/DNS/route。
- **步骤**：1) 分类结尾点号 localhost、IPv4 回环、IPv4 映射
  IPv6、ULA、链路本地、RFC1918 和 `http://` URL。2) 将一个公开
  主机名解析到私有 A 记录。3) 跟随一个 Location 为
  `https://127.0.0.1/` 的 302。4) 报告一条代理路由和一个 TUN fake-IP 应答
  （`198.18.0.1`）、同一应答在 `DIRECT` 路由上、在不可读路由上，
  以及在提供 `DIRECT` 的路由列表上。5) 让第一跳走代理而
  其重定向目标直连。
- **预期结果**：每种绕过形式都被拒绝。公开 CDN URL 被接受。
  解析出私有地址的 DNS 和重定向到回环都抛出
  策略错误，且不获取私有目标。判定性的拒绝不
  重试；未应答任何内容的本地解析器会重试，并报告为
  `NETWORK_RESOLVE_FAILED`（`kind` `unresolved`）而非地址检查
  拒绝——守卫没有得出裁决，因此任何东西都不得声称它得出了。代理
  fake-IP 段（`198.18.0.0/15`，Clash 的默认）中的地址，在守卫
  判定了它的地方——直连或不可读路由——被拒绝且不
  重试，而在代理路由上被接受，并报告为 `kind` `fake-ip`，
  `addressKind` `benchmark`，`reason` `non-public-address`——区别于
  真实私有目标（`kind` `policy`, `addressKind` `private`），因为守卫
  在第二种情况判定了目标，而在第一种情况只判定了代理的占位符。其余
  每种拒绝都携带 `NETWORK_POLICY_BLOCKED`（spec 08 §3.1）及
  其 `reason`、解析到的地址、该地址的类别，以及
  作出判定的路由，因此安装页可以说明原因并提供
  重试，而不是让安装按钮无解释地保持禁用，
  市场列表也可以把被拒绝的来源与单纯不可达的来源区分开。其余
  每种非公开类别仍在所有路由上拒绝，且每个重定向跳都在
  其自身路由上判定（ADR 0272）。
- **关联规格**：`05-security/01-security.md`, ADR 0243, ADR 0272,
  `03-runtime/01-ipc-protocol.md` §12b
- **验收**：安全、质量
- **里程碑**：M6+
- **状态**：自动化（`pnpm test:e2e:skill-market`,
  `apps/desktop/test/public-https-fetch.test.mjs`,
  `apps/desktop/test/public-https-fetch-route.test.mjs`,
  `apps/desktop/test/skill-market-scan.test.mjs`,
  `apps/desktop/test/skill-market-failure.test.mjs`,
  `apps/desktop/test/skill-market-policy-refusal.test.mjs`,
  `packages/shared/src/public-network.test.ts`）

#### E2E-SKILL-MARKET-EXPANSION: 相邻 markdown 资源在安装前内联

- **前置条件**：一个 jsDelivr 技能文档，其目录列出 FORMS.md
  和 REFERENCE.md（单元测试中模拟列表；E2E 中扩展助手）。
- **步骤**：拆分 SKILL.md，将列出的同级 markdown 文件扩展为围栏
  附录，并确认超过 128 KiB 的文档被标记为过大。
- **预期结果**：预览/安装正文包含技能文本加
  `# Attached resource:` 附录。非 markdown 同级文件被省略。
  会超过宿主 `MAX_SKILL_BYTES` 的正文不被写入。
- **关联规格**：`04-ux/06-settings-ia.md`, ADR 0243
- **验收**：质量
- **里程碑**：M6+
- **状态**：自动化（`pnpm test:e2e:skill-market`,
  `apps/desktop/test/skill-market-scan.test.mjs`）

#### E2E-SKILL-MARKET-INSTALL: 市场安装通过 skills.create 写入用户技能

- **前置条件**：宿主二进制；隔离的 HOME。一个内置目录条目，带
  组装好的 markdown 正文。
- **步骤**：握手；用组装好的名称/描述/正文调用 `skills.create`；
  读取 `~/.agents/skills/pdf.md`；`skills.list`。
- **预期结果**：文件具有渲染的 frontmatter 和指令正文。
  技能出现在 `skills.list` 中。除 `skills.create` 之外不使用任何路径。
- **关联规格**：`03-runtime/01-ipc-protocol.md` §12b, ADR 0243
- **验收**：质量
- **里程碑**：M6+
- **状态**：自动化（`pnpm test:e2e:skill-market`）

#### E2E-SKILL-MARKET-ID-ALIGN: 扫描出的技能 id 匹配宿主 valid_capability_id

- **前置条件**：共享的 `sanitizeSkillCatalogId`。
- **步骤**：清洗 `Frontend_Design`、`1-pdf` 和一个空余量。
- **预期结果**：宿主合法的 slug（`frontend-design`, `1-pdf`, `skill-7`），因此
  `installedIds` 匹配创建的记录。
- **关联规格**：`03-runtime/01-ipc-protocol.md` §12b
- **验收**：质量
- **里程碑**：M6+
- **状态**：自动化（`pnpm test:e2e:skill-market`）

#### E2E-TRAY-bounded-session-navigation

- **范围**：原生托盘分组、隐藏/重建窗口激活，以及未读
  语义（issue #293, ADR tray-session-shortcuts）。
- **前置条件**：跨两个项目至少各有四个运行中、四个未读和四个置顶
  会话；包括重叠、已读最新/较旧未读
  通知、已归档/已删除会话、一个已归档项目、空标题、
  多行标题、长 CJK/emoji 标题，以及字面 & 符号。还覆盖
  一个七项的单一有内容分组和一个超过九项的分组，另外
  两个分组为空，以演练回收的份额。使用
  隔离配置。在 macOS 和 Windows/Linux 上重复原生激活。
- **步骤**：隐藏主窗口并打开托盘菜单。检查组顺序、
  计数、重复项、标题和不变的未读记录。选择来自另一个项目的
  第三行，然后在侧栏折叠且
  保留搜索查询的情况下从设置中选择"查看更多"。在隐藏时
  完成/中止任务；读取一个结果、置顶/取消置顶、重命名、归档/恢复，并删除一个会话。
  在任务运行时关闭 macOS 窗口并让它完成，然后在新渲染器
  引导一个待决计划时激活其托盘行。在较新的偏好更新、删除
  或宿主重启到达时延迟一次宿主
  读取。通过悬停/右键托盘重试一次瞬时读取失败。
  在清除所有组成员资格并更改随附语言环境后重复。
  选择"退出"然后"取消"，再选择"退出"并确认。
- **预期结果**：运行中 → 未读 → 置顶；总计至多九行。每个
  非空分组保留至多三行，溢出分组按优先级顺序回收
  较小分组未使用的份额：七个运行中会话
  且没有未读或置顶时显示全部七个，一个持有超过
  九项的单一分组在"查看更多"后显示九项。在限额之前去重，
  因此被隐藏的"运行中"溢出不能
  以未读/置顶出现。空分组和过期快捷方式消失。未读
  使用每个会话的最新终态结果，最新在前。标题
  在上限内保持一行，包括字面 & 符号。打开 macOS
  菜单时窗口保持隐藏并记录未读。选择一行恰好打开
  该会话/项目，正常确认它，并优先于启动导航。
  "查看更多"从设置返回，关闭搜索，并展开会话导航。隐藏/关闭的窗口接收新的分组；
  过期读取、已归档/已删除目标和失败的后端不能恢复
  过期快捷方式。打开、本地化、取消退出和关机都工作。
- **关联规格**：`03-runtime/01-ipc-protocol.md` §13b,
  `03-runtime/07-process-model.md`, `04-ux/08-component-spec.md`,
  `04-ux/09-interaction-patterns.md`, ADR tray-session-shortcuts.
- **验收**：A（应用/窗口生命周期）、C（对话导航）、
  F（未读持久化）、质量（有界的本地化菜单）。
- **里程碑**：M6 后桌面外壳维护。
- **状态**：草稿；原生 E2E 需要显式授权的运行。

#### E2E-PLUGIN-turn-ended-once-per-host-turn: 插件每个宿主 turn 恰好观察到一个 turn 结束事件

- **前置条件**：一个带工具并监听
  `session:turnEnded` 事件的插件已加载并启用；其面板记录每个收到的
  负载及其工具通过工具上下文收到的 `turnId`。
- **步骤**：
  1. 提交一个其回复在一个 turn 中发出三个工具调用的提示词。
  2. 记录插件收到的 `session:turnEnded` 负载数量，并
     将其 `turnId` 与插件工具看到的比较。
  3. 提交另一个提示词，然后用 `Cmd/Ctrl + .` 停止它。
  4. 提交第三个失败的提示词，使该 turn 以错误结束。
  5. 检查插件设置页是否有新的权限审查。
- **预期结果**：步骤 2 恰好收到一个 `reason`
  为 `completed` 的 `session:turnEnded`，其 `turnId` 等于工具上下文的 `turnId`。步骤 3
  恰好收到一个 `reason` 为 `aborted` 的事件——中止之后绝不再出现第二个
  `completed`。步骤 4 恰好收到一个 `reason` 为
  `error` 的事件。从未开始的 turn 不发出任何事件，且即使
  终态事件到达多次，也没有插件为一个 turn 收到两个
  事件。步骤 5 不显示新的权限审查，且订阅未知事件
  名称不会呈现错误。
- **关联规格**：`07-plugins/03-plugin-api.md`, `07-plugins/13-plugin-permissions-matrix.md`,
  ADR 0252
- **验收**：质量（协议与插件契约）
- **里程碑**：M6+
- **状态**：模块已覆盖（`apps/desktop/test/session-turn-ended.test.mjs`,
  `apps/desktop/test/queued-turn-finalization.test.mjs`）；桌面旅程为草稿
  （仅在此界面发生变化时，于具备能力的环境中运行）

### E2E-SESSION-native-pi-continue-appends-original-jsonl

- **前置条件**：一个合成 Pi v3 会话包含分支、压缩
  元数据（包括 `retainedTail`）、模型/thinking 变更、自定义和
  携带 context 的自定义消息条目，以及有效的项目 cwd。在夹具
  Pi agent 目录中配置了一个伪本地模型/认证绑定；
  Desktop provider 密钥缺失。一个夹具扩展在
  `session_start` 中恢复自定义状态，并通过 `resources_discover` 贡献一个技能。
- **步骤**：以仅夹具的 agent/会话目录启动 PI-Desktop；
  刷新会话；打开 Desktop 行旁的原生行；提交一个文本
  提示词；停止或让伪响应落定；在成功之前
  以可重试的响应再次发送相同文本；反复重选/刷新；通过
  新的 Pi `SessionManager` 重新打开；调用原生压缩和队列 push/list。
- **预期结果**：原始夹具 JSONL 收到原生 SDK 条目，其
  parent 从先前的当前叶子开始；所有先前字节/未知条目
  保持不变；刷新后新叶子可见；不创建 Desktop SQLite
  会话或 Desktop 转录副本；Desktop 自有的行仍
  遵循其既有运行时和存储路径。原生请求暴露零个
  内置或扩展模型工具；启动和被发现的技能有效。
  恰好两个持久 SDK-ID 用户行保留，包括中止之后；智能停止
  从不重写原生历史。重试/压缩保持运行且可停止，
  直到一次终态完成；自有的空闲租约接受第二次发送。
  压缩和队列 push/list 在宿主访问之前拒绝。不透明的宿主 turn 队列
  remove/prioritize 保持仅 Desktop，因为原生路径不创建条目。
- **规格**：runtime §12; storage §12; security §12; ADR 0254。
- **状态**：已记录；在集成到主干后运行。

### E2E-SESSION-native-pi-external-change-fails-closed

- **前置条件**：一个可写的合成原生 v3 夹具已列出。
- **步骤**：获取 Desktop 续写所有权，然后在下一次 SDK 追加之前
  模拟一次外来的追加/替换；同时尝试第二个 Desktop
  租约和所有者分别为存活、远程、格式错误或不确定的过期租约。
  在宿主所有者已死、扩展字节不变或
  仅追加完整的情况下刷新列表/详情，然后通过正常 UI 能力提交提示词。
- **预期结果**：第二个写入者被拒绝；外部分歧会
  以可见的只读/错误原因拆除续写；不追加任何请求的条目，
  也不截断或重写任何字节；租约在正常
  处置时释放，且仅在宿主所有者已死且
  目标不变、或同文件前缀保持的完整父链扩展时，
  崩溃之后才被回收。不协作的 Pi 客户端仍可与 OS 追加竞速；
  不声称共享锁保证。
- **规格**：runtime §12; storage §12; security §12; ADR 0254。
- **状态**：已记录；在集成到主干后运行。

### E2E-SESSION-native-pi-incompatible-session-is-read-only

- **前置条件**：夹具覆盖缺失 cwd、缺失结尾换行、
  v1/v2 头部、不可用的已保存 provider/认证，以及不受信的项目资源。
- **步骤**：刷新并打开每个夹具。
- **预期结果**：每个都保持可浏览并带具体原因，输入框
  被禁用，不发生迁移/修复/回退，且源字节和 mtime
  保持不变。
- **规格**：IPC native routing; runtime §12; storage §12; security §12。
- **状态**：已记录；在集成到主干后运行。


### E2E-SUBAGENT-ordered-model-fallback-preserves-work

- **前置条件**：一个已配置的主模型和至少三个备选使用
  确定性的本地传输；一个定义声明了有序
  备选。第二个定义没有备选，且都没有为 Task 覆盖
  启用备选。
- **步骤**：在设置中添加两个备选，重新排序，保存并重新打开；
  在不改变列表的情况下更改另一个字段。运行子代理，完成一个
  工具调用，然后使主请求失败。使第一个备选失败，
  完成第二个。运行一个矩阵：在成功模型之前分别有零、一、二、三个不可用
  模型，成功后留一个未使用的模型。
  在四个模型全部不可用、混合 401/403/404 失败、
  两个连续模型的瞬时/429 重试耗尽、
  不可用/重复的钉住、显式授权的 Task 主模型，
  以及恢复期间停止的情况下重复。移除所有备选，保存，并重新打开。
- **预期结果**：列表顺序和清除/保留语义完整往返。provider
  重试预算优先于回退；每个不同的已配置绑定使用
  一次。原始任务和已完成的工具结果到达下一个模型；
  已完成的工具不重放。适配器/认证/请求头和 thinking 匹配
  每个所选模型。失败诊断和总用量在结算后保留；
  有效模型/thinking 在重新加载后保留。停止会取消链条；宿主/工具
  错误不切换模型。耗尽会显式失败。备选从不
  为第二个定义授权 Task 覆盖。无备选时保留
  既有的单模型行为。
- **关联规格**：`03-runtime/02-agent-runtime.md` §5f,
  `03-runtime/13-model-catalog-and-selection.md` §Subagent editor,
  ADR subagent-model-fallback.
- **验收标准**：C——对话与流式；质量（兼容性
  和权限隔离）。
- **里程碑**：M6+。
- **状态**：通过共享/运行时回归测试和 `test:e2e:subagents` / `test:e2e:subagent-models`
  实现自动化注册表与运行时覆盖。sidecar 套件针对真实 HTTP 请求顺序、
  实时/已结算 Task 元数据、有序失败诊断和成功的子代理报告，
  检查零到三个失败的矩阵和
  四模型耗尽。已完成工具保留和独立重试预算使用真实传输的运行时测试。
  配置编辑器旅程已在 WSL 下通过；
  任务转录重新加载
  验收仍未完成。必需的集成后套件：`test:e2e`,
  `test:e2e:subagents`, `test:e2e:subagent-models`。

#### E2E-PLUGIN-declared-provider-appears-in-the-native-provider-list: 插件声明的 provider 是宿主自有的只读行

- **前置条件**：一个已安装的本地插件在
  `contributes.providers` 中声明一个 provider，具有 `provider.register` 权限、一个模型、一个
  夹具 `baseUrl`，以及用户通过设置存储一次的密钥。
- **步骤**：1) 启用插件并打开 设置 → Providers。2) 将该
  行选为会话模型并运行一个 turn。3) 通过用户路径
  尝试编辑它，然后删除它。4) 禁用插件，检查列表和已存储的
  凭据，然后重新启用。5) 卸载插件；重新安装并启用
  它，然后从其清单中移除声明并重新加载。6) 加载一个
  声明了 providers 但没有 `provider.register` 的清单。7) 加载一个
  声明 `oauth` 块和 `authKind: "oauth"` 的清单。
- **预期结果**：步骤 1 在原生 provider 列表中显示一行，
  `ownerPluginId` 设为该插件，行 id 为
  `plugin:<pluginId>:<declaredId>`。步骤 2 像任何 provider
  行一样绑定会话。步骤 3 以一个消息以
  `PROVIDER_OWNED_BY_PLUGIN` 开头的错误拒绝两个操作，且行保持不变。步骤 4 保留该行
  并设置 `enabled = 0`，而 `secret:provider:<id>:api_key` 保持已存储，因此
  重新启用会恢复凭据。步骤 5 以两种顺序——卸载，以及
  不再声明该 provider 的清单——删除这些行和两个
  凭据引用（`:api_key` 和 `:oauth`）。步骤 6 和 7 以
  `PLUGIN_INVALID` 未通过清单验证——缺少权限的消息和
  `plugin OAuth providers are not supported in this release` /
  `unsupported authKind oauth`——且两个失败都不改变插件启用状态。
- **关联规格**：`07-plugins/02-plugin-manifest-schema.md` §4, §5.4, §7;
  `07-plugins/13-plugin-permissions-matrix.md`; `03-runtime/04-data-storage.md`
  §4.3, §7; `03-runtime/12-provider-config-schema.md` §2, §9;
  `03-runtime/06-host-rpc-protocol.md`; ADR 0259; D427
- **验收**：B（模型配置）、E（工具与权限）、F（持久化）、
  G（插件）、安全、质量
- **里程碑**：MVP 之后（R7 v1）
- **状态**：部分自动化（`pnpm test:e2e:trusted-extensions`）：声明的行
  以 `plugin:<pluginId>:<declaredId>` 及其 `ownerPluginId`、端点和模型
  物化到原生 provider 列表中，且没有其他插件拥有的行，均已
  通过。所有权拒绝（`PROVIDER_OWNED_BY_PLUGIN`）、
  禁用/启用、取消声明和卸载清理，以及清单拒绝
  由 host-core 单元测试覆盖；渲染器的只读行呈现
  仍属额外验证。

#### E2E-CHAT-disclosure-toggle-keeps-reading-position

- **范围**：在滚动器钉在底部时，手动展开/收起转录
  或代理运行停靠区中的工具、thinking 或活动标题
  （issue #324）。
- **前置条件**：一个超过一屏的会话，停在底部且
  跟随模式开启，持有一个工具行、一个 thinking 行和一个活动组，其
  展开的详情高于其头部，另加一个展开的、
  拥有嵌套滚动器的代理运行。在已完成的 turn（`isRunning` 为假）和
  turn 流式期间分别重复。
- **步骤**：在钉在底部时点击一个工具行、一个 thinking 行和一个活动组的
  标题，并在 turn 完成后再次点击。在
  视口停在转录中部、用键盘激活
  （在聚焦的标题上先 Enter 后 Space），以及从折叠栏操作时重复。在
  展开的代理停靠区内展开一个工具行。然后用滚轮滚动、
  在标题聚焦时按 ArrowUp、点击跳到最新控件，并发送新
  提示词。
- **预期结果**：被点击的标题在详情展开和收起的
  动画期间保持其屏幕位置，转录从不在其下方
  重新沉底；跟随模式退出并出现最新消息控件。保持的位置
  在动画活动组的每一帧都存活，也覆盖
  标题上方同时发生的高度变化。嵌套停靠区保持其自身
  位置，其后的转录也不重新沉底。真实滚动
  输入、跳转控件、新 turn 和每次导航都会释放保持，
  重新跟随实时尾部，而向上滚动的读者
  保持其位置。Space 仍激活聚焦的标题，方向键仍滚动。
- **关联规格**：`04-ux/09-interaction-patterns.md` §9.1;
  ADR transcript-reading-ownership; D287, D302, D430
- **验收**：C（对话与流式）、E（工具与权限）、质量
- **里程碑**：M6+
- **状态**：部分自动化。`pnpm test:e2e:transcript-disclosure` 在真实的
  600 CSS px Electron 视口中挂载真实的转录滚动钩子和真实工具行，
  并用真实 DOM 点击点击标题，断言
  标题相对滚动器顶部的偏移和转录
  及嵌套跟随滚动器的滚动偏移；没有该修复时，同一夹具报告
  标题移动了打开的详情的整个高度。应用样式表未
  链接，因此高度来自内联填充和组件自身的
  固有尺寸。`disclosure-anchor.test.mjs` 覆盖纯锚点和输入
  数学，`transcript-disclosure-reading.test.mjs` 覆盖接线。键盘、
  滚轮和动画活动组路径仍属额外验证。
#### E2E-PLUGIN-fs-root-follows-the-calling-session: 插件工具的 fs 根跟随其自身会话，而非可见工作区

- **前置条件**：两个项目 A 和 B，各持有一个对方没有的文本文件，
  以及一个已启用的插件，注册一个 agent 工具，其 execute
  对根相对路径调用 `pi.fs.readText` 和 `pi.fs.glob`，并声明
  `fs.read`，根为 `workspace`。两个项目都有一个插件工具可用的
  活动会话，且窗口显示项目 A。
- **步骤**：
  1. 在不切换窗口可见工作区的情况下，
     从会话 A 对只有项目 A 持有的文件调用该工具，然后从
     会话 B（项目 B）对只有项目 B 持有的文件调用。
  2. 把可见工作区切换到项目 B，重复两次调用。
  3. 在可见工作区为项目 B 时，让会话 A 的工具请求一个
     只存在于项目 A 下的路径，让会话 B 的工具请求同一路径。
  4. 打开插件面板，在项目 A 可见时通过面板桥接执行相同的读取，
     然后在项目 B 可见时执行。
  5. 把一个会话移到临时聊天，使没有工作区可见，
     从该会话调用工具，然后在相同状态下调用面板桥接。
- **预期结果**：步骤 1 和 2 每次都从发起调用会话自己的项目作答：
  会话 A 读取和 glob 项目 A 的文件，会话 B 读取项目 B 的文件，
  且可见工作区在两个项目之间移动时，两个答案都不改变。
  步骤 3 为会话 A 返回项目 A 的文件，为会话 B 返回
  `NOT_FOUND`，因此一个会话永远无法到达另一项目的根。步骤 4 与之前
  一致：每次面板调用解析可见工作区，因此其
  答案跟随屏幕上的项目，而不是任一会话。步骤 5 按会话保持
  工作——会话的插件工具解析其自己的项目——
  面板调用仍以 `NOT_FOUND` 失败（"No workspace is open"）。任何地方的
  门控都不放松：被拒绝的名称、`..` 或绝对路径、指向根之外的
  符号链接，以及超出声明范围的路径，其行为与单一
  可见工作区时相同。
- **关联规格**：`07-plugins/03-plugin-api.md` §3,
  `07-plugins/13-plugin-permissions-matrix.md` §6, ADR 0016, ADR 0249, ADR 0266,
  D093
- **验收**：G（插件）、安全、质量
- **里程碑**：M6+
- **状态**：部分自动化
  （`apps/desktop/test/plugin-fs-session-root.test.mjs`）：工具调用在
  发起会话的项目下写入和读取，面板调用和未跟踪
  会话回退到可见工作区，`userSelected` 模式保持
  所选目录，且当窗口不显示项目时会话
  根顶位。双活动会话的桌面旅程和面板步骤为草稿
  （仅在此界面发生变化时，于具备能力的环境中运行）

#### E2E-MODEL-catalog-window-correction-reaches-saved-bindings

- **目标**：一个 models.dev 上限更正到达已保存的绑定，无需
  删除并重新添加模型，同时用户在设置中输入的数字
  从不被覆盖。
- **步骤**：
  1. 配置一个 provider，选择一个 models.dev 发布了 `limit.context`
     的模型，并保存。打开该行的"高级"主体，读取上下文窗口字段
     及其提示。
  2. 为该模型提供一个更正后的目录记录（不同的已发布
     窗口），重新打开设置，读取该行、上下文检查器，以及
     新会话启动时使用的窗口。
  3. 在"高级"字段中输入一个窗口——预设阶梯一次、
     手输 `128000` 一次——保存，然后提供另一次目录更正，
     重新打开设置和检查器。
  4. 保存并重新打开一个绑定不携带
     `contextWindowSource` 的 provider 行：一次用通用 `128000` 种子，
     一次用任何其他已存储值。
- **预期结果**：步骤 1 显示已发布数字，带"follows models.dev"
  提示。步骤 2 在使用有效窗口的所有地方显示更正后的数字
  （设置行、上下文检查器、会话启动），无需删除并重新添加。
  步骤 3 在设置行、检查器和发出的请求中保留输入的数字，
  包括为已发布窗口更大的模型手输的 `128000`，
  且提示消失。步骤 4 确定性地解析：
  `128000` 种子跟随目录，其余所有值保持已存储。每个步骤都在
  provider 行的保存/读取往返中保留标记，且在标记之前
  写入的配置保持可读。
- **关联规格**：`03-runtime/13-model-catalog-and-selection.md` §9.1,
  `03-runtime/12-provider-config-schema.md` §2,
  `03-runtime/11-provider-model-system.md` §2, `04-ux/06-settings-ia.md` §2
- **验收**：B（模型配置）、F（持久化）、质量
- **里程碑**：M6+
- **状态**：部分自动化：
  `apps/desktop/test/model-binding-catalog-source.test.mjs` 驱动主进程
  解析器（目录来源的更正到达暴露的行，用户值
  在其后存活，通用种子仍跟随目录，继承的值保持
  被标记）；`packages/shared/src/model-catalog.test.ts` 覆盖四条来源规则；
  `crates/host-core/src/providers/catalog.rs` 覆盖配置往返、
  未标记记录和被丢弃的未知标记。端到端设置旅程
#### E2E-PLUGIN-official-channel-resolves-through-the-platform: 官方渠道安装经平台解析，并从第一个可用镜像安装

- **前置条件**：官方渠道上的干净配置，一个存在于 `plugins.aiuo.net/catalog.json` 中的插件，以及平台和两个镜像主机的请求日志（每个都可用本地桩代替）。
- **步骤**：1) 打开 扩展 → 市场，确认来源行显示"官方渠道"且目录来自 `plugins.aiuo.net`。2) 安装该插件。3) 捕获平台收到的请求。4) 检查哪个镜像提供了包。5) 安装第二个插件，然后再次安装第一个插件的相同版本。
- **预期结果**：每次安装或更新恰好发送一个 `POST /api/v1/download/resolve`，JSON 正文携带 `deviceId`、`pluginId`，以及在已选定版本时的版本；包来自 `downloads` 中第一个应答的条目，且其字节在解压任何东西之前匹配返回的 `sha256` 和 `sizeBytes`；不可达或失败的镜像被放弃，无需用户交互即使用下一个；重新安装相同版本会发出新的 resolve 调用，而不是复用先前的应答，因为响应从不缓存；已安装插件通过普通权限审查，且其记录将官方渠道命名为其来源。
- **关联规格**：`07-plugins/07-plugin-marketplace.md` §2, `07-plugins/15-plugin-center.md` §10
- **验收**：G（远程市场来源）
- **里程碑**：M6+
- **状态**：草稿

#### E2E-PLUGIN-mirror-digest-mismatch-falls-through-to-the-next-mirror: 字节摘要不匹配的镜像在解压前被拒绝

- **前置条件**：一个官方渠道安装，其 `downloads` 列表至少有两个条目，第一个镜像提供的字节不匹配返回的 `sha256`（过期的分发，或一个为 `pi.todo-0.6.5` 提供 CNB 时代字节的桩），外加安装缓存和插件目录的视图。
- **步骤**：1) 开始安装。2) 观察第一个镜像的下载和摘要检查。3) 在安装完成前检查安装缓存和插件目录。4) 让安装继续。5) 用第一个镜像仅在宣告的 `sizeBytes` 上失败的桩重复。
- **预期结果**：不匹配的字节被丢弃，不被解压或交给安装器，插件目录中不落下任何东西，且拒绝在安装进度中报告而非被吞掉；下一个镜像的字节按相同摘要验证，安装从那里完成；大小不匹配的情形行为相同；当每个条目都失败时，安装以被报告的失败结束，而不是部分安装的插件。
- **关联规格**：`07-plugins/07-plugin-marketplace.md` §2
- **验收**：G（远程市场来源）+ 安全
- **里程碑**：M6+
- **状态**：草稿

#### E2E-PLUGIN-platform-unreachable-install-falls-back-to-the-catalog-url: 平台不可达时安装回退到目录 URL

- **前置条件**：官方目录已从一次成功刷新缓存，且 `plugins.aiuo.net` 对安装变得不可达（被阻断的桩，或被拒绝的 DNS/代理路由）。
- **步骤**：1) 在平台可达时刷新目录，然后使其不可达。2) 安装一个目录条目携带相对 `url` 的插件。3) 确认哪个主机提供了包，以及平台是否收到 resolve 请求。4) 恢复可达性，依次安装平台分别以 `403 NOT_PUBLISHED`、`403 PLUGIN_ARCHIVED`、`404`、`429` 和 `503` 拒绝的版本。
- **预期结果**：安装从目录自身的 URL 解析包——`artifactBaseUrl` 加相对 `url`——并在相同的 shasum 验证后完成；该安装没有 resolve 请求到达平台，回退安装不计数；失败的 resolve 调用在安装日志中可见而非被隐藏；平台再次应答后，每个拒绝产生自己的消息——未发布且无重试、已归档使插件从安装和更新选择中隐藏、未找到、速率限制的一次 `Retry-After` 等待，以及 `503` 的部署错误——且没有拒绝静默切换到另一渠道或另一版本。
- **关联规格**：`07-plugins/07-plugin-marketplace.md` §2
- **验收**：G（远程市场来源）
- **里程碑**：M6+
- **状态**：草稿

#### E2E-PLUGIN-device-identifier-is-stable-and-never-the-machine-code: 设备标识符跨启动稳定，且不是原始机器码

- **前置条件**：一台机器标识符可读的宿主（Windows `MachineGuid`、macOS 平台 UUID，或 `/etc/machine-id`），一个不可读的第二环境，以及 `POST /api/v1/download/resolve` 的请求日志桩。
- **步骤**：1) 在一个会话中触发两次安装，比较记录的 `deviceId` 值。2) 重启应用并触发第三次安装。3) 将该值与宿主的原始机器标识符比较。4) 在设置、市场界面和已安装插件详情视图中搜索该值。5) 在没有机器标识符可读的情况下重复步骤 1 和 2，然后检查应用数据目录。
- **预期结果**：来自一次安装的每个 resolve 请求都携带相同的 64 字符小写十六进制值，包括重启之后，以及机器标识符不变时应用重装之后；该值既不是机器码也不是其前缀，且等于 `sha256("pi-desktop.device.v1:" + <machine identifier>)`；该标识符从不出现在 UI 中，且没有设置可以揭示或重置它；在不可读的情况下，该值是一个不同的 64 位十六进制字符串，生成一次并持久化在 `plugins/market/device.json` 下，随后跨重启重复。
- **关联规格**：`07-plugins/07-plugin-marketplace.md` §2, ADR 0276
- **验收**：G（远程市场来源）+ 安全
- **里程碑**：M6+
- **状态**：草稿

#### E2E-PLUGIN-install-progress-shows-phases-and-mirror: 官方渠道安装报告其阶段和正在使用的镜像，然后完成

- **前置条件**：官方渠道上的干净配置，一个 resolve 应答列出至少两个条目的插件，一个失败或缓慢到可观察到第二次尝试的第一个镜像，以及订阅了 `plugin.installProgress` 的渲染器。
- **步骤**：1) 从市场详情页开始手动安装。2) 记录运行时到达的报告。3) 安装成功后悬停对话框。4) 安装结束后查看已安装插件。5) 用大包再次安装，统计至少一秒窗口内的报告。
- **预期结果**：对话框按顺序显示阶段——`resolve`, `download`, `verify`, `install`, `enable`——带 `mirror n/N · name` 和来自 `receivedBytes` / `totalBytes` 的确定性进度条；每个报告携带 `pluginId` 和 `version`，只有指明镜像的报告携带 `source`，`attempt` 在 `attempts` 内从 1 计数，镜像切换使 `attempt` 递增而不改变 `attempts`；字节报告至多每 200 ms 到达一次，每次阶段变更多一个报告，外加一个终态报告；安装以无 `error` 结束，插件在普通权限审查后安装并启用；对话框在成功约两秒后关闭，悬停时该倒计时暂停，后台自动更新以相同方式安装且完全不打开对话框。
- **关联规格**：`07-plugins/07-plugin-marketplace.md` §2, `07-plugins/15-plugin-center.md` §10, ADR 0276 §7
- **验收**：G（远程市场来源）
- **里程碑**：M6+
- **状态**：草稿

#### E2E-PLUGIN-cancel-during-download-installs-nothing: 下载期间取消会停止安装，不留下任何已安装内容，并无错误地关闭对话框

- **前置条件**：一个官方渠道安装，包足够大或镜像足够慢，使下载阶段持续；一个应答 `market.cancelInstall` 的途径；以及插件目录、安装缓存和"已安装"列表的视图。
- **步骤**：1) 开始安装并等待下载阶段。2) 按对话框中的取消操作。3) 观察对话框并捕获 RPC 应答。4) 安装结束后检查插件目录、安装缓存和"已安装"列表。5) 对同一 id、对未在运行的安装、以及在下载完成后，再次发送 `market.cancelInstall`。
- **预期结果**：取消调用对运行中的安装应答 `{ cancelled: true, id }`，安装以 `PLUGIN_CANCELLED`（JSON-RPC code 1019）失败；对话框关闭且不报告错误；没有任何东西被安装——没有插件目录、没有已安装行、没有启用的插件——缓存中也不留存部分包；同一 id 的第二次调用、对未运行安装的调用，以及下载完成后的调用应答 `{ cancelled: false, id }` 且不改变任何东西，因此取消永远不能打断插件目录的写入。
- **关联规格**：`07-plugins/07-plugin-marketplace.md` §2, ADR 0276 §7
- **验收**：G（远程市场来源）+ 安全
- **里程碑**：M6+
- **状态**：草稿

#### E2E-PLUGIN-failed-install-lists-tried-mirrors: 失败的安装保持对话框打开，并列出尝试过的镜像和复制操作

- **前置条件**：一个官方渠道安装，其每个镜像都失败——例如第一个摘要 mismatch、第二个网络错误——渲染器订阅了 `plugin.installProgress`，且有剪贴板回读。
- **步骤**：1) 开始安装。2) 让每个镜像失败。3) 读取终态报告和对话框。4) 在镜像重新提供有效字节后，使用复制操作，然后使用重试操作。
- **预期结果**：终态报告携带 `error` 和按尝试顺序每个镜像一个 `tried[]` 条目，各指明其 `source`、`url` 和该镜像应答的错误；对话框保持打开，显示可读错误加该列表；复制操作把尝试过的镜像放到剪贴板；重试操作开始相同版本的新安装，并在镜像应答时完成，不复用失败尝试的部分状态；失败的尝试没有安装任何东西。
- **关联规格**：`07-plugins/07-plugin-marketplace.md` §2, ADR 0276 §7
- **验收**：G（远程市场来源）
- **里程碑**：M6+
- **状态**：草稿

### E2E-CHAT-turn-process-and-thinking-display

- **前置条件**：一个带 thinking、多个工具、中间进度
  和最终答案的 turn；详细和紧凑显示模式。
- **步骤**：流式输出该 turn；完成它；展开/收起其过程；搜索一条
  中间消息；通过 设置 → AI → 默认值切换显示模式。
  用被停止的部分答案、助手错误和失败的工具重复。
- **预期结果**：已完成的工作有一个折叠的过程加其最终答案。
  手动选择在更新后存活；搜索揭示其目标；实时答案文本
  保持可读。错误和被停止的尾部文本保持可见。紧凑模式
  不暴露推理文本或摘录，显示实时指示器，且不留下
  已完成的仅 thinking 头部。工具和进度保持可访问。切换
  到详细模式从未变更的消息恢复推理。保存的模式在
  应用重启后存活；没有该字段的旧设置 blob 使用详细模式。
- **自动化**：`test:e2e:transcript` 覆盖挂载的渲染器交互、
  设置控件和未变更组的性能。`test:e2e:transcript-disclosure`
  覆盖滚动锚定；`test:e2e:theme-surfaces` 覆盖共享主题
  控件。隔离的宿主 `settings.set/get` 检查验证两种模式跨
  进程重启，以及在无关部分设置写入期间的保留。
  仅渲染器夹具不能证明设置持久化。
- **规格**：04-ux/06-settings-ia, 04-ux/08-component-spec,
  04-ux/09-interaction-patterns; ADR turn-process-and-thinking-display。

### E2E-RPC-unicode-separators

- **前置条件**：构建的 host-core、shared 包和 agent 运行时；隔离
  临时数据目录；仅回环的夹具 provider。无实时凭据。
- **步骤**：追加一条包含 U+2028/U+2029、CJK 文本、emoji 和
  转义 CR/LF 的用户消息；读取它，重启宿主，再读取一次。通过
  AgentSidecar 发送 Unicode 提示词；通过父宿主代理
  恢复历史；流式输出并持久化一个 Unicode 回答。发送一个包含
  相同字符的未知方法，然后发送健康请求。
- **预期结果**：文本在持久化和所有 stdio 方向上不变地
  存活。请求结算且无 RPC 超时；错误回复和后续
  请求保持可用。不需要迁移现有会话。
- **自动化**：`pnpm test:e2e:rpc-unicode`；`packages/shared/src/ndjson.test.ts`
  还检查每个 UTF-8 拆分边界、连续帧、CRLF、EOF 和处置。
- **规格**：03-runtime/06-host-rpc-protocol §2。
- **验收**：A（运行时）、C（会话）。
- **里程碑**：M6+。
- **状态**：自动化；针对任务/PR 集成候选运行。
