# ADR 0211: 用于只读检查的 Plan 安全插件动作

- Status: Accepted
- Date: 2026-09-10
- Deciders: PI-Desktop core
 - Amended by: D438 (the window-summon shortcut in §7 becomes one
  window-visibility toggle) and D439 (that toggle ships on `Alt+Shift+W`
  because macOS owns `Cmd+W`; the plan-safe plugin-action opt-in is unchanged)
 - Related: ADR 0052, ADR 0053, ADR 0170, E2E-PLAN-005

## Context

PI-Desktop 将会话分为 Agent 和 Plan（以及 Goal）运行状态。ADR 0052 和
ADR 0053 锁定了契约：Plan 暴露 `Read`、`Glob`、`Grep`、
`BrowserPreview`（工作区 HTML 预览）、`Bash`、`EnterPlanMode` 和
`SubmitPlan`，并拒绝每一个插件工具、`Write`、`Edit` 和未知工具。插
件 agent 工具是仅限 Agent 的贡献；它们的变更性动作（click、fill、
evaluate、原始 CDP 等）正是该契约意在阻止 Plan 模式执行的东西。

每当规划者需要读取外部世界时，这条硬线的代价就会显现。一个让 Plan
模式“看看公司的 bug 追踪器，告诉我要改什么”的用户，得到的回复是
索取 URL 而不是 bug 列表，因为 Plan 模式无法打开 `pi.browser` 插件或
任何其他有检查能力的插件。同样的缺口也覆盖那些只抓取 URL、搜索归档
或读取日历条目的 MCP 工具：协议层面只读，但按当前策略仅限 Agent。

修复方法不是放松契约。契约是正确的：Plan 模式绝不得 click、fill、
evaluate 或发送任意 CDP。修复方法是让插件以与宿主权限门槛相同的严
谨性声明它的哪些动作足够安全、可以在 Plan 模式中调用，并在三个地方
强制执行该声明（隐藏不安全工具的运行时、接纳安全工具的宿主，以及实
际执行的插件），使错误声明无法把一次 Plan 调用变成一次变更。

## Decision

### 1. 插件工具声明 plan-safe 动作

插件工具可以在其注册描述符上设置 `planSafeActions` 数组（位于
`packages/plugin-sdk`）。该数组列出插件作者认为在 Plan 和 Goal 模式
中安全的确切动作字符串。省略该字段或发送空数组，保持现有的“插件
工具被 Plan 拒绝”行为；没有任何插件获得它未显式选择加入的 Plan 访
问权。

运行时在注册时校验该声明。每个条目必须是非空字符串。当 schema 的
`properties.action` 是枚举时，每个条目必须是枚举值之一；不对齐的声
明会导致注册失败，而不是成为 Plan 时的绕过。

### 2. 运行时按模式过滤插件工具

`packages/agent-runtime/src/runtime.ts` 在 Agent 模式中像今天一样把
插件工具暴露给模型。在 Plan 和 Goal 模式中，它只暴露
`planSafeActions` 为非空数组的插件。插件工具的 `description` 会被标
注上允许的动作列表，使模型知道它实际可以调用哪些动作。完整的插件工
具对渲染进程仍然可用（skill 目录、插件页面）；过滤作用于 agent 可见
的工具列表，而不是注册。

### 3. 运行时将声明转发给 host-core

当运行时为 `plugin_*` 工具调用 `tools.execute` 时，它会在 RPC 参数中
带上该工具的 `planSafeActions` 列表。Host-core 把该列表视为本次调用
契约的一部分，并在 `plugins.execute` 通知中连同会话模式一起转发给桌
面运行器。

### 4. Host-core 在契约模式中接纳 plan-safe 插件工具

`crates/host-core/src/permissions.rs` 保留现有的契约模式硬拒绝
（`plan_mode_allows`），针对 `Write`、`Edit`、未知工具，以及未携带
`planSafeActions` 到达的插件工具。携带非空 `planSafeActions` 列表到
达的插件工具现在可以通过契约门槛。该列表不改变任何其他规则：低风
险自动允许、外部路径提示、会话授权和 `auto` 模式的权限姿态，都以与
任何 Agent 模式插件调用相同的方式适用。

### 5. 插件运行时强制执行动作限制

`apps/desktop/electron/main/plugin-runtime.ts` 在注册时根据每个插件工
具的 schema 校验其 `planSafeActions`，并把规范化后的列表存储在
`RegisteredPluginTool` 上。当桌面运行器收到 `plugins.execute` 通知
时，它现在会在传给工具 `execute` 的 `ctx` 参数中携带会话模式。在
`plan` 和 `goal` 模式中，如果声明的列表为空，或调用的 `action` 不在
列表中，运行器以 `PERMISSION_DENIED` 拒绝该调用。这个检查是第三层：
即使是让不安全调用漏过的运行时或 host-core bug，也无法到达插件。

### 6. 内置 Browser 插件声明其四个只读动作

内置的 `pi.browser` 插件（ADR 0170）声明
`planSafeActions: ["navigate", "snapshot", "screenshot", "console"]`。
变更性动作（`click`、`fill`、`evaluate`、`cdp`）保持仅限 Agent，这
与公开的风险模型以及用户“读取 URL”是 Plan 可接受而“填写表单”不
是的预期一致。

### 7. 窗口唤起快捷键

现有键盘快捷键目录新增一个 `summonWindow` id，默认绑定到
`Mod+Shift+W`，位于 `window` 组，与 `closeWindow`（`Mod+W`）并列。
桌面主进程以与 `openPluginLauncher` 相同的方式通过 `globalShortcut`
注册它，原生菜单新增一个调用 `restoreMainWindow` 的“把窗口带回来”
项。该快捷键是 `closeWindow` 的对称对应物：关闭窗口会把它隐藏到托
盘或最小化；唤起则把同一个窗口带回焦点。

*（经 D438 修订：目录现在交付单个 `toggleWindow` id，取代
`summonWindow` / `closeWindow` 这一对；已退役的 `Mod+Shift+W` 组合键
不再被任何东西注册，两个已退役 id 的已存储覆盖在读取时被折叠进该
toggle。隐藏是 `Window.hide()`，绝不是关闭路径。再经 D439 修订：该
toggle 交付在 `Alt+Shift+W` 上，而不是本 ADR 的 D438 修订最初命名的
`Mod+W`，因为该键是进程范围注册的，而 macOS 把 `Cmd+W` 用于自己的
关闭窗口命令。）*

## Consequences

- Plan 和 Goal 模式可以通过任何作者选择加入的插件检查外部资源。内
  置 Browser 插件是第一个受益者；MCP 工具可以用相同的声明做到同样
  的事。
- 插件作者仍然负责声明究竟哪些动作是只读的。错误的声明在插件注册
  时失败，而不是在用户的 prompt 上失败。
- 契约模式对 `Write`、`Edit` 和未知工具的硬拒绝不变。不声明
  `planSafeActions` 的插件保持 ADR 0052 / ADR 0053 行为。
- 插件运行时中的纵深防御检查意味着运行时或 host-core 中的 bug 无法
  把 Plan 调用升级为变更：插件自己会拒绝它。
- `Mod+Shift+W` 唤起快捷键与 `Mod+W` 关闭配对，因此 Windows/Linux
  上窗口驻留在托盘的用户有一个快捷键用来隐藏、一个用来带回。*（经
  D438 修订：那两个键是一个 `Mod+W` toggle。）*

## Alternatives

### 添加一个独立的只读 URL 抓取工具

被拒绝，因为它复制了 Browser 插件基于 CDP 的快照，并绕过了公开的贡
献通道；插件作者将不得不维护两份相同的管线，才能在两种模式下暴露
相同的能力。

### 在 Plan 模式中允许所有插件并信任 manifest

被拒绝，因为它削弱契约，并给插件作者一个隐式的“一切都安全”默认
值。可选加入的 `planSafeActions` 字段使安全声明成为插件注册中显式
的、经过校验的一部分。

### 使用按工具的纯风险标志

被拒绝，因为插件工具在各个动作之间并非一致只读。Browser 插件是明显
的例子：`navigate + snapshot` 是安全的，`click + fill` 不是。按工具
的布尔值要么授权不足（隐藏安全工具），要么授权过度（暴露不安全动
作）。

### 从 schema 自动检测安全动作

被拒绝，因为“没有 `Write` 参数”不等于“没有副作用”。schema 无法
知道一次导航会触发登录流程、一次 `evaluate` 会发表评论，或一次快照
会让用户登录。插件作者拥有这方面的知识。

### 把 `summonWindow` 默认做成仅限托盘的入口

被拒绝，因为托盘图标已经能在点击时唤起；需求是一个不离开当前焦点
就能做同一件事的键盘快捷键。`Mod+Shift+W` 绑定与 `closeWindow`
（`Mod+W`）对称，因此可以从现有菜单中发现。

## References

- `docs/spec/03-runtime/03-tools-and-permissions.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` E2E-PLAN-005
 - `docs/spec/08-meta/decisions-log.md` D384, D438
- `packages/plugin-sdk/src/index.ts`
- `packages/agent-runtime/src/runtime.ts`
- `packages/agent-runtime/src/mode-prompts.ts`
- `crates/host-core/src/tools/mod.rs`
- `crates/host-core/src/permissions.rs`
- `crates/host-core/src/rpc/mod.rs`
- `apps/desktop/electron/main/plugin-runtime.ts`
- `apps/desktop/electron/main/index.ts`
- `apps/desktop/resources/plugins/pi.browser/main.js`
- `packages/shared/src/keyboard-shortcuts.ts`
- `packages/shared/src/protocol.ts`
- `apps/desktop/electron/main/application-menu.ts`
