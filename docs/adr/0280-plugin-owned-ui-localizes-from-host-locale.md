# ADR 0280: 插件自有 UI 跟随宿主语言本地化

- **状态**：已接受
- **日期**：2026-09-17
- **相关**：[ADR 0009](0009-english-first-globalization.md) ·
  [ADR 0082](0082-localized-plugin-panel-chrome.md) ·
  [ADR 0159](0159-plugin-generated-settings-and-local-shortcuts.md) ·
  [ADR 0160](0160-shipped-locale-registry-and-language-picker.md) ·
  [ADR 0267](0267-plugin-labels-follow-the-app-language.md) ·
  [07-plugins/02-plugin-manifest-schema](../spec/07-plugins/02-plugin-manifest-schema.md) ·
  [07-plugins/03-plugin-api](../spec/07-plugins/03-plugin-api.md)

## 背景

宿主已经解析两类由它自己渲染的插件文案：用于身份信息的 `manifest.i18n`
（`name` / `description` / `safetyNotes`），以及少数 chrome 标签上的内联
`{ en, "zh-CN" }`（`ui.title`、视图标题、设置目的地、会话来源）。把同样的
映射放到生成的 `contributes.settings` 上（然后再扩展到命令、工具、主题），
会在 manifest 内部长出第二个不完整的 i18n 系统：只有两个契约语言、两种
声明形态，而且面板或小组件仍然没有办法给自己的 HTML 换标签。

插件进程已经可以读取应用语言（`pi.app.getLocale`、
`pi.app.getAppearance().locale`）。打开的面板已经可以收到
`appearance:changed`。插件进程此前收不到。

## 决策

1. 对于**插件自有**的文案，宿主只发布当前语言，不做别的：
   `pi.app.getLocale()`、`getAppearance().locale`，以及把
   `appearance:changed` 发给打开的面板**和**已加载的插件进程。
2. 插件自有 UI（面板、视图、小组件、设置目的地、toast、运行时命令标题）
   根据该语言标记自行本地化。作者可以选用任何目录表；宿主不负责翻译。
3. 不再向贡献字段添加更多 `PluginLocalizedString` 映射。生成的
   `contributes.settings` 的 `title` / `description` / `enum[].label` 保持为
   作者语言的纯字符串。需要本地化设置界面的插件应提供
   `settingsDestinations`。
4. 不运行插件代码、由宿主渲染的界面保持其已有契约：`manifest.i18n`
   （ADR 0267）和背景部分第 (2) 点中已发布的 chrome 标签。

## 后果

- 切换语言会实时重排插件自有 UI 的样式，无需重载，也无需重写注册表。
- 作者不必为每一项设置维护双语映射。
- 现有宿主 chrome 本地化不变。

## 替代方案

- **在每个贡献字段上由宿主解析语言映射**：一个 manifest 两套模型，仍只有
  `en` / `zh-CN`，插件 HTML 问题依旧没解决。
- **在渲染进程中解析插件文案**：已被 ADR 0267 拒绝；渲染进程仍然不得解析
  manifest。
