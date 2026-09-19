# ADR 0035: 通过 preload 桥暴露 OS 语言区域

- 状态: 已接受
- 日期: 2026-07-30
- 相关: [04-ux/06-settings-ia](../spec/04-ux/06-settings-ia.md) ·
  [04-ux/02-i18n-english-first](../spec/04-ux/02-i18n-english-first.md) ·
  [04-e2e-test-plan](../spec/06-delivery/04-e2e-test-plan.md) · E2E-091
- 更新: [api.ts](../..//apps/desktop/src/lib/api.ts) 中的
  `window.piDesktop` preload 契约

## 背景

Settings → Basics → Language 控件提供 **Auto** 选项，它应跟随用户的
OS 显示语言。最初的实现从渲染进程的 `navigator.language` 解析
"auto"。

在 Electron 中，渲染进程的 `navigator.language` 是内嵌浏览器的语言
区域，无论实际 OS 语言如何都默认为 `en-US`。在中文系统上渲染进程
仍报告 `en-US`，因此即使 OS 是简体中文，"Auto" 也解析为英文。这个
默认值还为首次绘制的初始 i18n 语言提供了种子。

可靠的来源是主进程：`app.getLocale()` 读取 OS 显示语言（macOS
`AppleLanguages`、Windows 用户 UI 语言、Linux `LANG`）。主进程已经
拥有 OS 级事实；渲染进程只需要一种在首次绘制前同步读取它们的方式。

## 决策

1. 从 preload 桥把权威的 OS 语言区域暴露为同步字段
   `window.piDesktop.locale`。主进程在创建窗口时解析
   `app.getLocale()`，并通过 `webPreferences.additionalArguments`
   传递；沙箱化的 preload 代码读取该参数，而不是导入 Electron 仅限
   主进程的 `app` 模块（与现有 `platform` 字段并列）。
2. 在 `api.ts` 的 `window.piDesktop` 类型中增加可选的
   `locale?: string`；非 Electron 上下文不会收到窗口创建参数。
3. 通过 `lib/app-language.ts` 中新的 `resolveOsLocale()` 辅助函数
   解析 "auto" 语言，它优先使用 `window.piDesktop.locale`，并为非
   Electron 上下文（如测试）回退到 `navigator.language` /
   `userLanguage`。
4. 在 `main.tsx` 中用 `resolveOsLocale()` 而非 `navigator.language`
   为初始 i18n `lng` 提供种子。

这使 OS 事实解析保留在主进程中，且不需要新的 IPC 通道（该值像
`platform` 一样在首次绘制前可用）。

## 后果

- "Auto" 语言现在匹配真实的 OS 显示语言（例如中文系统上的简体
  中文），Auto 卡片内联显示检测到的语言（"当前：简体中文"）。
- 首次绘制的初始 i18n 语言对 OS 语言区域是正确的。
- `window.piDesktop` preload 契约增加一个只读字符串字段。
- 非 Electron 上下文（单元测试、潜在的 web 构建）回退到
  `navigator.language` 并保持可用。

## 备选方案

### 继续使用 `navigator.language`

否决：它是误检测的根本原因，并且在 Electron 中无法从渲染进程看到
OS 语言。

### 为 OS 语言区域添加异步 IPC 调用

否决：异步往返会延迟正确语言的首次绘制，并使已经使用 `platform`
的同步绘制前设置复杂化。从桥同步暴露该值更简单且足够。

## 参考

- `apps/desktop/electron/main/index.ts`（通过 `additionalArguments`
  传递 `app.getLocale()`）
- `apps/desktop/electron/preload/index.ts`（读取 locale 参数而不导入
  `app`）
- `apps/desktop/src/lib/api.ts`（`window.piDesktop.locale` 类型）
- `apps/desktop/src/lib/app-language.ts`（`resolveOsLocale`、
  `resolveAppLanguage`）
- `apps/desktop/src/main.tsx`（初始 `lng` 来自 `resolveOsLocale`）
- `apps/desktop/src/pages/SettingsPage.tsx`（Auto 卡片显示检测到的
  语言）
- `docs/spec/06-delivery/04-e2e-test-plan.md`（新增 E2E-091）
