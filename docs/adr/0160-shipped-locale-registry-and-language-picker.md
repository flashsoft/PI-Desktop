# ADR 0160: 随产品发布的 locale 注册表与可搜索的语言选择器

- 状态：已接受（由 ADR 0182 修订）
- 日期：2026-09-05
- 决策负责人：PI-Desktop 桌面端/i18n 维护者
- 相关：D012、D073、ADR 0009

## 背景

常规外观卡片以三张预览卡片（Auto / 简体中文 / English）展示语言。这种
控件无法扩展：每新增一个 locale 都需要硬编码一张卡片、示例字形和用于
其名称的目录键。产品现在发布超过两种 UI locale（从土耳其语开始），因此
选择器和 locale 列表必须来自同一个注册表。

插件标签保留 `en` + `zh-CN` 契约并以英文兜底。产品变更日志最初发布
这两种 locale；ADR 0182 增加了繁体中文，同时不要求插件跟随每一个
外壳 locale。

## 决策

1. `@pi-desktop/i18n` 拥有一个 `supportedLocales` 注册表：id、本地名称
   （endonym，永不翻译）和英文名称。`resolveLocale` 将 OS 标签映射到该
   列表（`tr` / `tr-TR` → `tr`，简体中文标签 → `zh-CN`，繁体中文标签 →
   `zh-TW`，其余 → `en`）。`catalogs[locale]` 是渲染进程、应用菜单、
   托盘和原生同意对话框使用的查找表。
2. `AppSettings.language` 为 `"auto"` 加上注册表中的每个 id。Auto 仍然
   通过沙箱化的 preload 桥接跟随 `app.getLocale()`。
3. 设置 → 常规 → 外观中，主题保留为三张预览卡片。语言是一个可搜索的
   选择器行（与字体和服务相同的锚定菜单模式）：Auto 置顶并显示检测到
   的本地名称，随后按本地名称列出已发布的 locale。搜索匹配本地名称、
   英文名称和 locale id。
4. 插件 `PluginLocalizedString` 仍要求 `en` 和 `zh-CN`。其他外壳 locale
   回退到英文。变更日志在存在翻译时跟随已发布的外壳 locale，否则回退
   到英文；其初始的 `en` / `zh-CN` 集合由 ADR 0182 修订加入 `zh-TW`。

## 后果

- 新增一个 UI locale 只需一个目录文件、一行注册表记录、一个
  `AppSettings.language` 联合类型成员和一个 Electron locale 包。选择器
  无需变更。
- 即使用户不认识当前 UI 语言，本地名称仍然可以被找到。
- 插件和发布说明不必在第一天就跟随每一个新的外壳 locale。

## 替代方案

- 语言继续用可换行的预览卡片：超过三四个选项后不可读，且名称仍需
  硬编码。
- 要求插件添加每一个已发布的 locale：会破坏现有 manifest，且相对于
  一个外壳翻译而言代价不成比例。
