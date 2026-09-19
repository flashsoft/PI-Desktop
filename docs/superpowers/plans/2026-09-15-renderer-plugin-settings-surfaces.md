# 渲染进程插件设置界面实施计划

> **给 Agent 工作者：**必需的子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施本计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：**用渲染进程合成的、沙箱化的插件 iframe 替换不透明的原生 Settings 扩展视图，使风景背景在整个 Settings 目的地中保持可见。

**架构：**一个新的宿主拥有的 `plugin-settings:` 协议只服务当前已加载、拥有 `ui.settings` 授权的插件包内的资源，并附加 CSP 头。其合成桥接脚本暴露 `window.pluginBridge` 并使用 `postMessage`。`PluginSettingsDestination` 拥有一个沙箱化 iframe，只把经过来源校验、绑定目的地的桥接请求通过一个新的主进程 IPC 处理器，转发到既有的 `PluginRuntime.invokePanelBridge` 授权路径。原生 `PluginViewHost` 仅保留给工作面板视图。

**技术栈：**Electron 自定义协议与 IPC、React/TypeScript、既有 Plugin Runtime 桥接、Node 契约测试。

**Spec：** `docs/superpowers/specs/2026-09-15-renderer-plugin-settings-surfaces-design.md`

## 全局约束

- 不修改 Nexus，也不改变 BrowserWindow 的透明 / 原生调整大小模型。
- iframe 必须是 `sandbox="allow-scripts"`；没有 same-origin、弹窗、顶层导航、表单、下载、Electron、Node 或宿主 DOM 能力。
- `plugin-settings:` 只服务拥有 `ui.settings` 的已加载插件，只服务包内静态资源，带宿主编写的 CSP，且无网络出口。
- Settings 目的地不得实例化 `WebContentsView`；原生工作面板视图保持当前实现。
- 保留既有 `PluginRuntime.invokePanelBridge` 的通道校验、权限、审计边界和插件身份校验。
- 更新插件架构 / 安全 / 设置 specification、一份 ADR 和 E2E 计划。除非被要求，否则不运行 E2E。

---

### 任务 1：定义 Settings 资源协议与桥接契约

**文件：**
- 创建：`apps/desktop/electron/main/plugin-settings-protocol.ts`
- 修改：`apps/desktop/electron/main/bootstrap/startup.ts`
- 修改：`apps/desktop/electron/main/services/plugin-services.ts`
- 修改：`apps/desktop/electron/main/ipc/plugin-ui-ipc.ts`
- 修改：`packages/shared/src/protocol.ts`
- 测试：`apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

**接口：**
- 产出 `registerPluginSettingsScheme(): void`，在 Electron 就绪之前调用。
- 产出 `installPluginSettingsProtocol(resolve): void`，其中 `resolve(pluginId, path)` 只对活动的 `ui.settings` 目的地返回 `{ absolutePath, isEntry } | null`。
- 产出 `pluginSettingsUrl(pluginId, destinationId): string`，供渲染进程在宿主校验后使用。
- 产出 IPC `pluginSettingsBridgeInvoke({ pluginId, destinationId, requestId, channel, payload })`，校验活动的贡献点并委托给 `PluginRuntime.invokePanelBridge`。

- [ ] **步骤 1：写一个失败的契约测试**

```js
test("Settings destinations use a host-owned sandbox resource protocol instead of a native view", () => {
  const protocol = read("electron/main/plugin-settings-protocol.ts");
  const ipc = read("electron/main/ipc/plugin-ui-ipc.ts");
  assert.match(protocol, /plugin-settings/);
  assert.match(protocol, /registerSchemesAsPrivileged/);
  assert.match(protocol, /Content-Security-Policy/);
  assert.match(protocol, /connect-src 'none'/);
  assert.match(ipc, /pluginSettingsBridgeInvoke/);
  assert.match(ipc, /invokePanelBridge/);
  assert.doesNotMatch(ipc, /pluginSettingsViews\.open/);
});
```

- [ ] **步骤 2：运行测试确认它失败**

运行：`node --test apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

预期：FAIL，因为协议和桥接 IPC 尚不存在。

- [ ] **步骤 3：实现协议和经过校验的桥接端点**

```ts
export const PLUGIN_SETTINGS_SCHEME = "plugin-settings";

protocol.handle(PLUGIN_SETTINGS_SCHEME, (request) => {
  const resource = resolve(pluginIdFromUrl(request.url), pathFromUrl(request.url));
  if (!resource) return notFound();
  return responseForPluginSettingsResource(resource);
});

handle(IPC.invoke.pluginSettingsBridgeInvoke, async (payload) => {
  const destination = requireActiveSettingsDestination(payload.pluginId, payload.destinationId);
  return plugins.invokePanelBridge(destination.pluginId, payload.channel, payload.payload);
});
```

HTML 响应必须在插件脚本之前引用合成的 `/__pi_bridge__.js` 文件。
桥接脚本只允许使用 `window.parent.postMessage`，不得暴露任何
Electron 或 Node 对象。

- [ ] **步骤 4：运行契约测试确认它通过**

运行：`node --test apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

预期：PASS。

- [ ] **步骤 5：提交**

```bash
git add apps/desktop/electron/main/plugin-settings-protocol.ts apps/desktop/electron/main/bootstrap/startup.ts apps/desktop/electron/main/services/plugin-services.ts apps/desktop/electron/main/ipc/plugin-ui-ipc.ts packages/shared/src/protocol.ts apps/desktop/test/plugin-settings-renderer-surface.test.mjs
git commit -m "feat(plugins): serve settings pages in renderer"
```

### 任务 2：用沙箱化 iframe 替换原生 Settings 占位

**文件：**
- 修改：`apps/desktop/src/components/settings/PluginSettingsDestination.tsx`
- 修改：`apps/desktop/src/lib/api.ts`
- 修改：`apps/desktop/src/styles/settings.css`
- 测试：`apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

**接口：**
- 消费 `api.pluginSettingsDestinationUrl(pluginId, destinationId)` 和 `api.pluginSettingsBridgeInvoke(...)`。
- 产出一个 `<iframe sandbox="allow-scripts">`，其 postMessage 监听器只接受来自它自己的 `contentWindow` 的、有界的桥接请求信封。

- [ ] **步骤 1：扩展失败的契约测试**

```js
test("the renderer owns a Settings extension iframe and preserves native geometry", () => {
  const component = read("src/components/settings/PluginSettingsDestination.tsx");
  assert.match(component, /<iframe/);
  assert.match(component, /sandbox="allow-scripts"/);
  assert.match(component, /event\.source !== frame\.contentWindow/);
  assert.match(component, /pluginSettingsBridgeInvoke/);
  assert.doesNotMatch(component, /pluginSettingsViewSetBounds/);
  assert.doesNotMatch(component, /pluginSettingsViewSetVisible/);
});
```

- [ ] **步骤 2：运行测试确认它失败**

运行：`node --test apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

预期：FAIL，因为旧组件度量的是一个原生子视图。

- [ ] **步骤 3：实现渲染进程拥有的界面**

```tsx
<iframe
  ref={frameRef}
  className="plugin-settings-destination"
  sandbox="allow-scripts"
  src={src}
  title={label}
/>
```

收到桥接请求时，校验消息来源等于 `frameRef.current?.contentWindow`，
校验信封是有限的请求 id 加字符串 channel 和对象 payload，用组件不可
变的 `pluginId` / `destinationId` 调用宿主 API，然后把匹配的响应只
返回给那个 iframe。URL 或桥接建立失败时渲染既有的恢复状态。CSS
必须让 iframe 在宿主层面透明、填满它的 Settings 内容区域，并把滚动 /
拖拽 / 控件所有权留给既有的 Settings 外壳。

- [ ] **步骤 4：运行契约测试确认它通过**

运行：`node --test apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

预期：PASS。

- [ ] **步骤 5：提交**

```bash
git add apps/desktop/src/components/settings/PluginSettingsDestination.tsx apps/desktop/src/lib/api.ts apps/desktop/src/styles/settings.css apps/desktop/test/plugin-settings-renderer-surface.test.mjs
git commit -m "feat(settings): compose plugin destinations in renderer"
```

### 任务 3：移除 Settings 原生视图的生命周期管线并保留桥接事件

**文件：**
- 修改：`apps/desktop/electron/main/services/plugin-services.ts`
- 修改：`apps/desktop/electron/main/bootstrap/window.ts`
- 修改：`apps/desktop/electron/main/bootstrap/shutdown.ts`
- 修改：`apps/desktop/electron/main/bootstrap/app-lifecycle.ts`
- 修改：`apps/desktop/electron/main/index.ts`
- 修改：`apps/desktop/electron/main/ipc/plugin-ipc.ts`
- 测试：`apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

**接口：**
- 移除作为依赖和生命周期界面的 `pluginSettingsViews`。
- 向主渲染进程发出 `pluginSettingsDestinationEvent`，使活动的 iframe 收到经过批准的外观 / 工作区事件。

- [ ] **步骤 1：扩展失败的契约测试**

```js
test("Settings extensions create no WebContentsView and clean up through renderer lifecycle", () => {
  const services = read("electron/main/services/plugin-services.ts");
  const lifecycle = read("electron/main/ipc/plugin-ipc.ts");
  assert.doesNotMatch(services, /pluginSettingsViews/);
  assert.doesNotMatch(lifecycle, /pluginSettingsViews/);
  assert.match(services, /pluginSettingsDestinationEvent/);
});
```

- [ ] **步骤 2：运行测试确认它失败**

运行：`node --test apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

预期：FAIL，因为原生 Settings 宿主仍连接在服务和生命周期依赖中。

- [ ] **步骤 3：实现生命周期简化**

移除 `pluginSettingsViews` 的构造、sender 解析、browser-window 挂载、
关闭销毁和 close 调用。在渲染进程 URL/桥接端点中保留插件加载状态
作为权威的生命周期检查。新增一个白名单渲染进程事件，携带
`{ pluginId, event, payload }`；`PluginSettingsDestination` 忽略所有不是
发给它不可变插件 id 的事件，其余的经过来源检查的 postMessage 转发。

- [ ] **步骤 4：运行契约测试确认它通过**

运行：`node --test apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

预期：PASS。

- [ ] **步骤 5：提交**

```bash
git add apps/desktop/electron/main/services/plugin-services.ts apps/desktop/electron/main/bootstrap/window.ts apps/desktop/electron/main/bootstrap/shutdown.ts apps/desktop/electron/main/bootstrap/app-lifecycle.ts apps/desktop/electron/main/index.ts apps/desktop/electron/main/ipc/plugin-ipc.ts apps/desktop/test/plugin-settings-renderer-surface.test.mjs
git commit -m "refactor(plugins): retire native settings views"
```

### 任务 4：同步公共扩展契约与交付文档

**文件：**
- 创建：`docs/adr/0250-renderer-composited-plugin-settings-surfaces.md`
- 修改：`docs/adr/README.md`
- 修改：`docs/spec/07-plugins/02-plugin-manifest-schema.md`
- 修改：`docs/spec/07-plugins/03-plugin-api.md`
- 修改：`docs/spec/07-plugins/04-plugin-security.md`
- 修改：`docs/spec/04-ux/06-settings-ia.md`
- 修改：`docs/spec/06-delivery/04-e2e-test-plan.md`
- 测试：`apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

**接口：**
- 记录 `plugin-settings:` 资源隔离、仅沙箱 iframe、宿主消息桥接，以及 Settings/原生控件生命周期。

- [ ] **步骤 1：扩展失败的契约测试**

```js
test("the public contract records the sandbox and one-canvas architecture", () => {
  assert.match(read("../../docs/adr/0250-renderer-composited-plugin-settings-surfaces.md"), /allow-scripts/);
  assert.match(read("../../docs/spec/07-plugins/04-plugin-security.md"), /plugin-settings/);
  assert.match(read("../../docs/spec/06-delivery/04-e2e-test-plan.md"), /renderer-composited Settings destination/);
});
```

- [ ] **步骤 2：运行测试确认它失败**

运行：`node --test apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

预期：FAIL，因为 ADR/spec 场景尚不存在。

- [ ] **步骤 3：撰写 ADR 并更新 specification**

记录 Settings 扩展由渲染进程合成，而面板 / 工作视图保持原生；列举
协议的资产与 CSP 策略；保持固定的桥接与权限边界；并为风景背景、
核心导航、原生标题控件、降低透明度和插件禁用 / 卸载添加手动 E2E
场景。

- [ ] **步骤 4：运行契约测试确认它通过**

运行：`node --test apps/desktop/test/plugin-settings-renderer-surface.test.mjs`

预期：PASS。

- [ ] **步骤 5：提交**

```bash
git add docs/adr docs/spec apps/desktop/test/plugin-settings-renderer-surface.test.mjs
git commit -m "docs(plugins): specify renderer settings surfaces"
```

### 任务 5：验证、刷新、合并与清理

**文件：**
- 预期无生产代码改动。

- [ ] **步骤 1：运行聚焦测试**

运行：

```powershell
node --test apps/desktop/test/plugin-settings-renderer-surface.test.mjs
node --test apps/desktop/test/plugin-appearance-extensions.test.mjs
node --test apps/desktop/test/plugin-themes.test.mjs
git diff --check
pnpm run build:js
pnpm --filter @pi-desktop/desktop exec tsc -p tsconfig.json --noEmit
```

预期：全部命令成功。没有用户明确授权时，刻意不运行 E2E。

- [ ] **步骤 2：在 fork 构建中手动验证**

运行 `pnpm --filter @pi-desktop/desktop dev`，打开 Settings → Extensions → Nexus Scenic Themes，在四张卡片之间切换，然后导航到 General 再返回。确认背景在页面下依稀可辨、没有黑色矩形、标题控件正常工作，且没有面板遮住边栏或调整大小的边缘。

- [ ] **步骤 3：评审、刷新并集成**

```bash
git diff main...HEAD --check
git fetch
git rebase main
```

只解决本请求 worktree 中的冲突。然后遵循仓库的本地 main 合并与清理流程。除非用户明确要求，否则不推送。
