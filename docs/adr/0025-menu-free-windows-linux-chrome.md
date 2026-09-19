# ADR 0025: 让应用菜单退出 Windows/Linux 窗口

- 状态: 已接受
- 日期: 2026-07-27
- 决策者: PI-Desktop 核心团队
- 相关: D118, D129, ADR 0021

## 背景

ADR 0021 引入了原生 macOS 系统菜单和 Windows/Linux 窗口内渲染进程
拥有的 File/Edit/View/Window/Help 菜单栏。窗口内菜单栏占用 46px
标题栏的左侧，并把 macOS 菜单模型套用到无边框的 Windows/Linux
外观上。产品方向现在让该菜单界面专属于 macOS 系统菜单。

移除可见菜单栏后，Windows/Linux 仍需要窗口控件以及常用应用、编辑、
缩放和全屏命令的访问途径。

## 决策

1. macOS 保留 ADR 0021 定义的常规原生 Electron 应用菜单和
   hidden-inset traffic light。
2. Windows/Linux 保留无边框 46px 标题栏和渲染进程绘制的最小化、
   最大化/还原、关闭控件，但窗口内不渲染应用菜单栏。
3. Windows/Linux 标题栏导航收回此前为
   File/Edit/View/Window/Help 保留的空间。
4. Windows/Linux 的常用应用、关闭窗口、缩放和全屏快捷键在没有可见
   菜单的情况下处理。标准编辑快捷键保持原生 web 内容行为。
5. 现有的白名单菜单命令和原生操作 IPC 继续保留，用于 macOS 系统
   菜单、渲染进程就绪和快捷键分发。不引入新的特权接口面。

## 后果

- 窗口标题栏更安静，把整个左边缘让给导航。
- macOS 保留平台标准的系统菜单和所有原生 role。
- Windows/Linux 用户依靠可见的应用内控件、Settings -> Info、命令
  面板和键盘快捷键，而不是窗口内菜单栏。
- F10 和 Shift+F10 不再被渲染进程外壳外观消费。
- 被移除的渲染进程菜单栏组件、样式、焦点模型和本地化弹出行为不再
  需要维护或合格性验证。

## 备选方案

### 保留渲染进程菜单栏但默认隐藏

否决，因为由 Alt/F10 唤出的菜单仍保留了一个产品方向不希望在窗口
内出现的平台概念。

### 移除所有菜单相关 IPC

本次否决，因为 macOS 系统菜单仍在分发白名单渲染进程命令，而且
Windows/Linux 快捷键可以复用有界的原生操作接口面，而不扩大主进程
权限。

## 参考

- `docs/adr/0021-platform-application-chrome.md`
- `docs/spec/03-runtime/01-ipc-protocol.md`
- `docs/spec/04-ux/01-ui-ia.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/04-ux/09-interaction-patterns.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-067)
- `docs/spec/08-meta/decisions-log.md` (D129)
