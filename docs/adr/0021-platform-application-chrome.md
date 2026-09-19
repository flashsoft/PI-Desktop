# ADR 0021: 平台应用外观（chrome）

- 状态: 部分被 ADR 0025 取代
- 日期: 2026-07-26

## 背景

Electron 的默认外观无法满足 PI-Desktop 使用的全部三种桌面约定。
macOS 需要常规的原生应用菜单和内嵌的 traffic light 按钮。无边框的
Windows 和 Linux 窗口需要可见的应用菜单以及最小化、最大化/还原和
关闭控件。

渲染进程拥有的命令（如 New Task 和 Settings）无法直接在 Electron
主进程内执行。原生编辑、缩放、全屏和窗口操作不得变成一个任意的
特权命令桥。

## 决策

1. macOS 保留 `hiddenInset` traffic light，并安装原生 Electron
   应用菜单。
2. Windows 和 Linux 使用共享的无边框 46px 外壳，带渲染进程菜单栏
   和渲染进程绘制的窗口控件。
3. 渲染进程拥有的菜单命令使用固定的 `APP_MENU_COMMANDS` 白名单。
   原生菜单和窗口操作使用各自独立的固定白名单。
4. Preload 只暴露操作系统标识符和外观所需的白名单 IPC 通道。
5. 原生命令在投递前等待渲染进程就绪确认。窗口创建是 single-flight
   的，关闭或重载窗口会重置该确认。
6. Windows 和 Linux 打包仍是外壳就绪工作。本决策不改变 D010 的
   macOS-arm64 首发范围。

## 后果

- 每个平台都获得熟悉的菜单和窗口控件，而不暴露任意的主进程执行。
- 原生菜单命令可以重建 macOS 窗口，而不会与渲染进程订阅建立竞争，
  也不会创建重复窗口。
- Windows 和 Linux 在发布前需要 native-runner 打包和视觉合格性验证。
- 自定义外观必须在渲染进程重载之间保持键盘、焦点、本地化、拖拽
  区域和最大化状态行为。

## 备选方案

### 在所有平台保留 Electron 默认菜单和边框

否决，因为现有的隐藏标题栏设计在 Windows 和 Linux 上会保持不完整，
而 macOS 会缺少产品专属命令。

### 在渲染进程中实现所有菜单操作

否决，因为原生编辑和窗口操作属于 Electron 主进程，必须保留在
显式的能力边界之后。

### 固定延迟后发送命令

否决，因为渲染进程订阅时机因机器和重载状态而异。确认机制是
确定性的。

## 参考

- `docs/spec/03-runtime/01-ipc-protocol.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/04-ux/09-interaction-patterns.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-067)
- `docs/spec/08-meta/decisions-log.md` (D118)
