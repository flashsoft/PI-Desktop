# 宿主渲染风景设置实施计划

> **给 Agent 工作者：**必需的子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施本计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：**用宿主渲染的风景卡片和一个由 Apply 门控的模糊滑块，替换不透明的插件 Settings 页面。

**架构：**插件提交一份经过严格校验的 `scenicThemes` 数据贡献。Electron 主进程校验同插件的主题与资产，然后返回安全的呈现元数据。React 直接在 Settings 中渲染内容，因此风景背景与控件之间既不存在原生子视图，也不存在 iframe。既有带类型的 `themes.setVariables` API 仍是唯一的持久化写入方。

**技术栈：**TypeScript、Plugin SDK manifest 校验、Electron IPC、React、既有主题运行时、CSS、Node 测试运行器。

**Spec：** `docs/superpowers/specs/2026-09-17-host-rendered-scenic-settings-design.md`

## 全局约束

- 不修改 Nexus。
- 保留 `ui.theme`、`ui.settings`、`ui.window.appearance`、原生控件、Settings 导航、工作面板行为和主题隔离。
- 插件不贡献任何 Settings 的 HTML、JavaScript、CSS、DOM、选择器或任意动作。
- 模糊值只接受 0 到 20 的整数。卡片选择立即生效；Apply 是唯一的持久化动作。
- 外层风景目的地保持透明。卡片和模糊控件是仅有的实体界面。

---

### 任务 1：添加封闭的风景 manifest 贡献

**文件：**
- 修改：`packages/plugin-sdk/src/index.ts`
- 修改：`packages/plugin-sdk/src/index.test.ts`
- 修改：`docs/spec/07-plugins/02-plugin-manifest-schema.md`

**接口：** 添加 `PluginScenicThemesContrib`（`id`、本地化 `label`、`description`、`keywords`、`icon: "palette"`、`themes`）和 `PluginScenicThemeCardContrib`（`themeId`、本地化 `label`、本地化 `description`、`previewAsset`）。

- [ ] 编写失败测试：拒绝零张卡片、十三张卡片、重复 `themeId`、只有字符串的卡片文案、无效 ID、非相对预览路径和未知图标 token。
- [ ] 运行 `pnpm --filter @pi-desktop/plugin-sdk test -- index.test.ts`，观察到因 `scenicThemes` 未识别而失败。
- [ ] 实现类型与 manifest 校验。要求 1–12 张卡片、EN/zh-CN 本地化值、合法稳定 id，以及相对的图片资产路径。
- [ ] 运行 SDK 测试转绿，并提交 `feat(plugins): declare scenic Settings contributions`。

### 任务 2：提供宿主校验的风景元数据

**文件：**
- 修改：`packages/shared/src/protocol.ts`
- 修改：`apps/desktop/electron/main/plugin-runtime.ts`
- 修改：`apps/desktop/electron/main/ipc/plugin-ui-ipc.ts`
- 修改：`apps/desktop/src/lib/api.ts`
- 修改：`apps/desktop/test/plugin-appearance-extensions.test.mjs`

**接口：** 添加 `PluginScenicThemesDestinationMeta`，包含目的地身份、解析后的文案、按 manifest 顺序的卡片、命名空间化的自有主题 ID、宿主重写的 `previewUrl`，以及当前 / 默认模糊值。添加 `api.listPluginScenicThemesDestinations()`。

- [ ] 编写失败测试断言：`pluginScenicThemesDestinations`、`previewUrl`、`ui.settings` 与 `ui.theme` 双重检查、同插件主题所有权，以及不依赖 `entry` HTML。
- [ ] 运行 `node --test apps/desktop/test/plugin-appearance-extensions.test.mjs`，观察失败。
- [ ] 实现端点。只包含同时拥有两项授权的已加载插件。校验每张卡片引用一个已注册的同插件主题，且预览属于该主题声明的资产。通过 `plugin-asset://` 重写图片 URL；省略无效目的地。只有当 `--nexus-backdrop-blur` 这个带类型长度变量被声明为 0–20 的整数时，才返回当前 / 默认值。
- [ ] 运行聚焦测试转绿，并提交 `feat(plugins): expose host scenic destination metadata`。

### 任务 3：构建宿主 React 风景目的地

**文件：**
- 创建：`apps/desktop/src/components/settings/PluginScenicThemesDestination.tsx`
- 修改：`apps/desktop/src/features/settings/SettingsPage.tsx`
- 修改：`apps/desktop/src/styles/settings.css`
- 修改：`apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

**接口：** 组件消费 `PluginScenicThemesDestinationMeta`、既有主题选择 API 和带类型变量 API。它渲染宿主拥有的卡片按钮（`aria-pressed`）、原生 `input type="range"`、`output` 和 Apply 按钮。

- [ ] 编写失败测试断言：`SettingsPage` 导入 `PluginScenicThemesDestination`、不含 `PluginSettingsDestination`，组件包含 `aria-pressed`、原生 range、`Apply`，且无 iframe。断言风景包装 CSS 背景透明。
- [ ] 运行 `node --test apps/desktop/test/plugin-settings-renderer-surface.test.mjs`，观察失败。
- [ ] 实现透明外层包装和响应式四卡片网格。点击卡片立即切换主题。滑块只改本地草稿和 output。Apply 为选中的自有主题发送恰好 `{ "--nexus-backdrop-blur": draftBlur }`，只在成功后确认，出错后恢复已确认值，并使用既有 toast 行为。
- [ ] 用宿主 CSS 为独立图片卡片和模糊控件磁贴添加样式。添加选中对勾、可见焦点、窄布局，以及不透明的可读降低透明度回退。不添加页面级面板 / 背景，不修改外框 / 拖拽规则。
- [ ] 运行聚焦测试转绿，并提交 `feat(settings): render scenic plugin themes in host`。

### 任务 4：迁移 Nexus Scenic Themes 包

**文件：**
- 修改：`C:/jcode projects/worktrees/nexus-scenic-settings-20260915/plugins/io.github.akshayxkill.nexus-scenic-themes/manifest.json`
- 删除：`C:/jcode projects/worktrees/nexus-scenic-settings-20260915/plugins/io.github.akshayxkill.nexus-scenic-themes/settings/index.html`
- 删除：`C:/jcode projects/worktrees/nexus-scenic-settings-20260915/plugins/io.github.akshayxkill.nexus-scenic-themes/settings/settings.css`
- 删除：`C:/jcode projects/worktrees/nexus-scenic-settings-20260915/plugins/io.github.akshayxkill.nexus-scenic-themes/settings/settings.js`
- 修改：`C:/jcode projects/worktrees/nexus-scenic-settings-20260915/tests/nexus-scenic-themes.test.mjs`

- [ ] 编写失败的插件测试：要求按 Twilight、Alpine、Obsidian、Emerald 顺序有四张 `scenicThemes` 卡片；要求 `settingsDestinations` 不存在；要求三个页面文件不存在。
- [ ] 在插件检出中运行 `node --test tests/nexus-scenic-themes.test.mjs`，观察失败。
- [ ] 用四张卡片替换 manifest 中的 HTML 目的地，使用既有声明的资产路径与主题。保留三项请求的权限和带类型的模糊变量。移除废弃的页面目录。
- [ ] 运行插件测试转绿，并在插件检出中提交 `feat(nexus-scenic-themes): use host scenic settings`。

### 任务 5：退役 HTML Settings 运行时并同步 spec

**文件：**
- 删除：`apps/desktop/src/components/settings/PluginSettingsDestination.tsx`
- 删除：`apps/desktop/electron/main/plugin-settings-protocol.ts`
- 修改：`apps/desktop/electron/main/bootstrap/startup.ts`
- 修改：`apps/desktop/electron/main/ipc/plugin-ui-ipc.ts`
- 修改：`docs/adr/0255-plugin-appearance-extensions.md`
- 修改：`docs/adr/0287-host-rendered-plugin-scenic-settings-surfaces.md`
- 修改：`docs/spec/07-plugins/04-plugin-security.md`
- 修改：`docs/spec/06-delivery/04-e2e-test-plan.md`
- 修改：`apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

- [ ] 编写失败的退役断言：没有 `PluginSettingsDestination` 导入，没有 `installPluginSettingsProtocol`，ADR 0255 包含 `host-rendered`，且安全 spec 禁止插件 Settings DOM/CSS/HTML。
- [ ] 运行 `node --test apps/desktop/test/plugin-settings-renderer-surface.test.mjs`，观察失败。
- [ ] 移除 iframe/页面协议生命周期，并记录窄化的声明式契约、安全边界、视觉所有权、Apply 语义、清理回退、原生控件和手动 E2E 覆盖。
- [ ] 运行聚焦测试转绿，并提交 `refactor(plugins): retire Settings document surfaces`。

### 任务 6：验证并手动检查

- [ ] 运行：

```powershell
node --test apps/desktop/test/plugin-appearance-extensions.test.mjs apps/desktop/test/plugin-settings-renderer-surface.test.mjs apps/desktop/test/plugin-themes.test.mjs
pnpm --filter @pi-desktop/plugin-sdk test
pnpm --filter @pi-desktop/shared build
pnpm --filter @pi-desktop/desktop exec tsc -p tsconfig.json --noEmit
git diff --check
```

- [ ] 用 `pnpm --filter @pi-desktop/desktop dev` 运行 fork；确认四张图片卡片直接出现在风景画布上、没有外层矩形，Apply 之前的模糊草稿变更不会持久化，Apply 会持久化取值，且 Windows/Linux 控件仍可点击。
- [ ] 评审完整 diff。把本分支 rebase 到本地 main，从主检出合并进本地 main，核对提交，并只移除本请求的 worktree/branch。除非明确要求，否则不推送。
