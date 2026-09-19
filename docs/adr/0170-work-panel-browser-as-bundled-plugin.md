# ADR 0170: 将工作面板浏览器作为基于公开 CDP 的捆绑插件发布

- 状态：已接受
- 日期：2026-09-06
- 决策者：PI-Desktop 核心团队
- 相关：[ADR 0019](0019-work-panel-subsystems.md) ·
  [ADR 0104](0104-plugin-contributed-work-panel-views.md) ·
  [ADR 0105](0105-files-as-a-bundled-plugin.md) ·
  [07-plugins](../spec/07-plugins/README.md)

## 背景

工作面板浏览器此前是宿主构建的启动器行（`HEADER_TOOLS`）加一个主进程
拥有的 `WebContentsView` guest。Files 已经证明第一方界面可以作为捆绑
插件通过公开的 `contributes.views` 通道发布。用户同样需要整个浏览器——
外壳、预览和 agent CDP——以同样方式成为可选项：在插件页启用/禁用，
永不卸载。

插件页面不能*成为*浏览器。插件视图是沙箱化的，`webviewTag: false`，并
受 `net.domains` 约束。任意 http(s) 和工作区文件，加上 Chrome DevTools
Protocol，必须留在宿主拥有的 guest 上。

## 决策

1. **`pi.browser` 是一个捆绑插件**，位于 `apps/desktop/resources/plugins/`，
   默认启用，可禁用，不可卸载。它贡献视图 `browser`（图标 token
   `browser`，顺序 10），并注册 agent 工具 `Browser`。
2. **guest `WebContentsView`（`persist:work-browser`）和调试器保持宿主
   所有。** 插件外壳是一个普通的插件视图。guest 堆叠在外壳通过
   `pi.browser.setBounds` 上报的内容相对空洞上。
3. **`browser.cdp` 是公开权限**（high）。`pi.browser.*` 是公开的宿主
   API。任何声明该权限的插件都可以调用它。边界被钳制在发起调用的插件
   视图内，使 guest 无法覆盖聊天/composer。
4. **原始 CDP 采用允许列表，默认拒绝。** Cookie、存储、target 和网络
   拦截方法被拒绝。不暴露 DevTools websocket。
5. **宿主 `BrowserPreview` 保持为薄门面**（Plan/子 agent 名称稳定性）。
   如果 `pi.browser` 被禁用则报错；否则在该会话的外壳可见时把工作区
   文件加载进 guest，并显示插件视图。插件 CDP 保持仅 Agent 可用
   （`plugin_*`）。
6. **v1 是单例 guest。** 会话位置会被记住，并在来源会话的插件标签页
   显示时重新绑定（D142）。后台会话不会窃取可见的 guest。

本 ADR 取代 ADR 0105 第 4 条（浏览器保留为宿主构建的启动器）和
ADR 0019 的宿主启动器条款。guest 所有权和导航策略不变。ADR 0108 的
"浏览器作为宿主构建工具"条款同样被取代：面板的可启动界面均为插件
视图。

## 后果

- 禁用 `pi.browser` 会移除启动器行、agent CDP 和 guest。URL 芯片回退到
  `openExternal`。`BrowserPreview` fail-closed。
- 声明了 `browser.cdp` 的第三方插件共享同一个 guest；最后的外壳
  `setBounds` 生效。
- Plan 仍然看到 `BrowserPreview`。Browser 插件工具在 Plan/Goal 中对四个
  `planSafeActions`（`navigate`、`snapshot`、`screenshot`、`console`）也
  可见；click/fill/evaluate/cdp 保持仅 Agent 可用（ADR 0211）。

## 已考虑的替代方案

### 在插件视图内加载网页

否决：这需要 `webviewTag`、通配的 `net.domains`，并且会把 CDP 附加到
错误的 WebContents 上。

### 仅 `pi.browser` 可调用的私有宿主 API

否决：Files 的标准是第一方功能必须证明公开通道可行。

### 保留 React `BrowserTab` 外壳，只把启动器插件化

否决：那不是"整个默认浏览器是一个插件"。
