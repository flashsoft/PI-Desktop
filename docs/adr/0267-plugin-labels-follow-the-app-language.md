# ADR 0267：插件标签跟随应用语言

- **Status**: Accepted
- **Date**: 2026-09-16
- **Related**: [ADR 0009](0009-english-first-globalization.md) ·
  [ADR 0160](0160-shipped-locale-registry-and-language-picker.md) ·
  [ADR 0182](0182-traditional-chinese-shell-locale.md) ·
  [ADR 0280](0280-plugin-owned-ui-localizes-from-host-locale.md) ·
  [07-plugins/02-plugin-manifest-schema](../spec/07-plugins/02-plugin-manifest-schema.md) ·
  [07-plugins/07-plugin-marketplace](../spec/07-plugins/07-plugin-marketplace.md)

## 背景

插件的显示名称和描述来自其 manifest，marketplace 卡片的来自其目录条目。
两者都是用作者所用语言写的单一字符串，因此 Extensions 页面、插件启动
器和 marketplace 在英文 shell 下绘制中文名称、在中文 shell 下绘制英文
名称。插件仓库自己的校验器自首个发布以来就要求顶层 `i18n` 块——
`{ "en": { name, description, safetyNotes }, "zh-CN": { … } }`——目录也
在每个条目上随附相同的块。桌面 shell 完全不读它：行逐字渲染 `name` 和
`description`，因此作者已翻译成用户语言的插件仍以错误的语言到达。

Shell 已经拥有修复所需的每一块：`@pi-desktop/i18n` 拥有已发布的
locale 注册表，应用语言在主进程中解析（`settings.language`，或为
`auto` 时的 OS locale），而本地化 manifest 字段（`ui.title`、视图标题、
命令和目的地标签）已经由宿主通过 `resolvePluginLocalizedString` 以英文
回退解析。

## 决策

1. `manifest.i18n` 和 marketplace 目录条目上的相同块成为插件契约的一
   部分，包含 `name`、`description` 和 `safetyNotes`。`en` 和 `zh-CN`
   是契约 locale；不要求插件把自己翻译成其他已发布的 shell locale。
2. 每个中文 shell locale 读 `zh-CN`；其他每个 locale 读 `en`。因此
   `zh-TW` 读英文而不是半共享的 `zh-CN` 猜测，与
   `resolvePluginLocalizedString` 一致（ADR 0182）。
3. 解析发生在**宿主**，而不是渲染进程：行作为完成的字符串离开进程，
   与插件视图标题完全一样。缺失的 locale、缺失的字段或空字符串按字
   段回退到另一个契约 locale，再从那里回退到作者的扁平 `name` /
   `description`，因此部分翻译绝不会让行变空白。
4. 桌面 shell 在应用语言每次变化时向下推送它（`plugins.setLocale`），
   然后发出 `pluginChanged`，使各界面重新读取。注册表保留作者自己的
   字符串：语言变化绝不重写持久化的行，`i18n` 块既不被持久化也不通
   过 RPC 发送。
5. 畸形的块（不是 locale → object 的对象，或非字符串的
   `name`/`description`/`safetyNotes`）使 `validateManifest` 失败。条目
   内的未知 locale 和未知字段被忽略，因此发布者可以携带多于契约要求
   的内容。

## 后果

- 翻译过的插件现在在 Extensions 页面、插件启动器和 marketplace 以用户
  的语言显示，其 `safetyNotes`——解释安装能触碰什么的文本——也以该
  语言显示。
- 目录搜索匹配每个 locale 的名称和描述，因此用户输入他们在一种语言中
  看到的内容，切换后仍能找到该条目。
- 插件作者想的话可以继续发布单语言 manifest：扁平字段保持为回退，块
  中没有任何字段是加载所必需的。
- 宿主多持有一份状态（显示 locale）。它由 shell 推送而不是按请求读
  取，因此行不依赖于恰好携带 locale 的那个 RPC。

## 替代方案

- **在渲染进程解析**：渲染进程知道 `i18n.language`，会立即切换，但它
  必须接收每个 manifest 的 `i18n` 块，这与渲染进程绝不读取 manifest
  的规则矛盾，而且会复制宿主已经拥有的回退规则。
- **在每个插件 RPC 上加按请求的 locale 参数**：对 `plugins.list` 可行，
  但会让宿主自己返回的摘要（安装结果、权限变更、marketplace 更新检
  查）不被本地化，并给每个调用点增加一个 locale。
- **把名称留给作者的语言**：插件仓库已经要求该块，因此 shell 会继续
  忽略其生态系统发布的数据——这正是被报告的 bug。
