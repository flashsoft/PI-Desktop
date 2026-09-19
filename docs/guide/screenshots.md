---
title: 界面截图
description: PI-Desktop 的每一个界面，均截取自在运行中的应用。
---

# 界面截图

下面的每一帧都来自支撑 [E2E 测试计划](/spec/06-delivery/04-e2e-test-plan)
的截图装置：应用以 `PI_DESKTOP_CAPTURE=1` 在一个一次性数据目录下运行，
自动走遍每个界面，并写出 PNG，再由 `scripts/publish-screenshots.py`
转换成本页所用图片。因此这些截图展示的是真实发布的应用外壳，而不是
设计稿，包括全新安装启动时看到的空状态。

会话标题和会话内容来自截图夹具，因此应用界面是英文的，而示例对话是
中文的。

## 首页与会话

首页是全新安装看到的第一个界面：一个 hero 区、输入框，以及按项目
分组的会话侧边栏。

![亮色主题下的 PI-Desktop 首页](../public/screenshots/app/en/home-light.webp)

![暗色主题下的 PI-Desktop 首页](../public/screenshots/app/en/home-dark.webp)

![暗色主题下的对话页](../public/screenshots/app/en/dark-home.webp)

对话以流式方式进入 transcript，右侧有一条 minimap 导轨；悬停在导轨
上会放大标记，并预览光标下的消息。

![带 minimap 导轨的会话](../public/screenshots/app/en/minimap.webp)

![光标下放大的 minimap 导轨](../public/screenshots/app/en/minimap-hover.webp)

输入框中的 模型 × 推理 芯片用于切换本会话的模型。在输入框里，`/`
打开命令菜单，`@` 打开文件引用菜单。

![输入框中的模型与推理菜单](../public/screenshots/app/en/model-menu.webp)

![输入框中的斜杠命令菜单](../public/screenshots/app/en/composer-slash.webp)

![输入框中的 @ 文件菜单](../public/screenshots/app/en/composer-at.webp)

## 工作面板

当 Agent 产出产物时，工作面板会在会话旁打开。下面几帧是没有活动
工作区时的面板状态，也就是会话刚开始时的样子。

![Review 面板](../public/screenshots/app/en/panel-review.webp)

![浏览器预览面板](../public/screenshots/app/en/panel-browser.webp)

![文件浏览面板](../public/screenshots/app/en/panel-files.webp)

![工作面板切换菜单](../public/screenshots/app/en/panel-menu.webp)

## 目的地页面

Pull Requests、项目归档和定时任务是从侧边栏进入的整页目的地。

![Pull Requests 页面](../public/screenshots/app/en/pulls-live.webp)

![暗色主题下的 Pull Requests 页面](../public/screenshots/app/en/dark-pulls.webp)

![项目归档](../public/screenshots/app/en/project-archive-live.webp)

![暗色主题下的项目归档](../public/screenshots/app/en/dark-project-archive.webp)

![定时任务](../public/screenshots/app/en/scheduled-live.webp)

## 通知与 Toast

通知收件箱持久记录已完成的工作、权限请求和更新通知。Toast 覆盖同一
范围内转瞬即逝的那一端。

![亮色主题下的通知收件箱](../public/screenshots/app/en/notifications-light.webp)

![暗色主题下的通知收件箱](../public/screenshots/app/en/notifications-dark.webp)

![窄窗口中的通知弹层](../public/screenshots/app/en/notifications-narrow.webp)

![亮色主题下的成功、警告与错误 Toast](../public/screenshots/app/en/toasts-light.webp)

![暗色主题下的成功、警告与错误 Toast](../public/screenshots/app/en/toasts-dark.webp)

## 全局搜索

`⌘K` 打开一个覆盖会话、页面、设置项和命令的对话框。选择一个设置
命中项会跳转到对应标签页并高亮闪烁该行。

![显示最近会话的全局搜索](../public/screenshots/app/en/search.webp)

![命中会话的全局搜索](../public/screenshots/app/en/search-query.webp)

![命中设置项的全局搜索](../public/screenshots/app/en/search-settings.webp)

![命中目的地页面的全局搜索](../public/screenshots/app/en/search-pages.webp)

![从搜索打开的设置命中项](../public/screenshots/app/en/search-anchor.webp)

![暗色主题下的全局搜索](../public/screenshots/app/en/search-dark.webp)

## 插件

已安装插件、插件市场和打包工作流都在插件目的地页面上。

![已安装插件](../public/screenshots/app/en/plugins-live.webp)

![插件市场](../public/screenshots/app/en/plugins-market.webp)

![插件页面菜单](../public/screenshots/app/en/plugins-menu.webp)

![单个插件的行菜单](../public/screenshots/app/en/plugins-row-menu.webp)

![新建插件模板对话框](../public/screenshots/app/en/plugins-template.webp)

## 扩展

MCP 服务器、Skills 和 Subagents 独立于插件管理，各自支持全局或
项目级启用。

![MCP 服务器](../public/screenshots/app/en/extensions-mcp.webp)

![启用范围选择器](../public/screenshots/app/en/extensions-scope.webp)

![MCP 服务器编辑器](../public/screenshots/app/en/extensions-mcp-editor.webp)

![Skills](../public/screenshots/app/en/extensions-skills.webp)

![Subagents](../public/screenshots/app/en/extensions-subagents.webp)

![插件提供的 Subagents](../public/screenshots/app/en/extensions-subagents-provided.webp)

![Subagent 编辑器](../public/screenshots/app/en/extensions-subagent-editor.webp)

![暗色主题下的 Subagents](../public/screenshots/app/en/extensions-subagents-dark.webp)

![暗色主题下的 MCP 服务器](../public/screenshots/app/en/extensions-mcp-dark.webp)

## 设置

设置是一个整页目的地，带有可搜索的标签栏。

![基础设置 — 语言、主题与外观](../public/screenshots/app/en/settings-live.webp)

![暗色主题下的基础设置](../public/screenshots/app/en/dark-settings.webp)

![模型配置的 Provider 默认值](../public/screenshots/app/en/settings-models.webp)

![带目录来源选择器的扩展市场](../public/screenshots/app/en/settings-extensions.webp)

![使用自定义目录 URL 的扩展市场](../public/screenshots/app/en/settings-extensions-custom.webp)

## 重新生成这些截图

构建渲染进程，确认 `target/debug/pi-desktop-host-core` 存在，创建
`/tmp/codex-screens`，然后每个语言环境各运行一次应用并发布该轮截图：

```bash
pnpm --filter @pi-desktop/desktop build
mkdir -p /tmp/codex-screens

# English pass; append --lang=zh-CN for the Chinese pass.
cd apps/desktop && PI_DESKTOP_CAPTURE=1 PI_DESKTOP_DATA_DIR=$(mktemp -d) \
  ELECTRON_RENDERER_URL= ./node_modules/.bin/electron .

python3 scripts/publish-screenshots.py --source /tmp/codex-screens --locale en
```

最后一个场景写出后，装置会打印 `CAPTURE_DONE`。
