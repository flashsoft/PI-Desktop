# ADR 0260 — 插件运行时主题 API 与侧栏图片 token

- **Status**: Accepted for implementation
- **Date**: 2026-09-15
- **Related**: issue #352, ADR 0248, `07-plugins/03-plugin-api.md`, `07-plugins/13-plugin-permissions-matrix.md`

## 背景

可视化主题编辑器插件（Theme Studio）无法基于已发布的宿主契约交付用户
期望的产品流程：

1. **没有 apply API。** 主题选择只存在于 Settings（渲染进程的
   `settingsSet`）。插件面板无法切换 `AppSettings.theme`，因此「挑选主题
   并立即看到它」在不离开面板的情况下是不可能的。
2. **静态的加载时注册表。** `registerThemes()` 只读取一次
   `contributes.themes`。新主题需要 manifest 槽位和完整的插件重载；在
   生产环境编辑活跃主题的 CSS 需要 disable → enable。
3. **每个插件硬性上限 8 个主题**（`MAX_THEMES_PER_PLUGIN`），这阻碍了
   无限的用户自建主题库。
4. **侧栏绘制仅支持颜色。** `--ds-bg-sidebar` 喂给 `color-mix` 玻璃着
   色、边框和 macOS vibrancy。把 `linear-gradient()` 放进该 token 会破坏
   这些消费方，因此侧栏渐变无法成为受支持的功能。

## 决策

### 1. `app.setTheme`（权限 `ui.theme`）

```ts
pi.app.setTheme(themeId: "system" | "light" | "dark" | `plugin:${string}`): Promise<void>
```

校验 id（内置偏好，或当前已注册的插件主题），通过 host-core
`settings.set` 持久化 `AppSettings.theme`，然后应用完整 settings 路径
也复用的仅主题外观反应（`applyAppThemePreference`）。该入口只触碰主题
状态，因此 `setTheme` 绝不会干扰语言环境、按键绑定或开发者模式菜单
状态。渲染进程收到 `settingsChanged` 使其 store 保持同步；面板像今天
一样收到 `appearance:changed`。

### 2. 运行时主题生命周期（权限 `ui.theme`，仅自己的主题）

```ts
pi.themes.upsert({ id, label, base, css })
pi.themes.remove(themeId)
pi.themes.list()
```

- 生产插件，无需卸载/重载。
- CSS 经过与加载时相同的 `sanitizeThemeCss` + 大小上限。
- Id 使用命名空间 `plugin:<pluginId>:<themeId>`；upsert 替换
  label/base/css。
- 宿主发出 `pluginChanged`（`reason: "themes"`）并刷新面板外观，使更新
  后的**活跃**主题立即重新应用样式。
- 8 主题硬上限被移除。滥用控制仍是 CSS 大小上限、净化器和权限闸门。

### 3. 侧栏图片 token

- `--ds-bg-sidebar` 保持为**颜色**。
- 新的可选 `--ds-bg-sidebar-image` 持有 CSS `<image>`（默认 `none`）。
- `.sidebar` / `.sidebar-rail` 使用 `background-color` + `background-image`。
- macOS vibrancy 把图片层叠在玻璃光泽渐变**之下**。

## 后果

- Theme Studio（以及任何 `ui.theme` 插件）无需重载路径即可应用、创建、
  编辑和删除主题。
- `ui.theme` 不再是「仅增量样式」：它可以改变活跃的应用主题。该权限
  保持低风险，因为 id 由宿主校验、CSS 已经被净化。
- Spec、权限矩阵、E2E 文档和本 ADR 保持为插件作者的契约。
