# ADR 0180: 自定义全局 UI 字体比例

- 状态：已接受（已修订）
- 日期：2026-09-08
- 基线：`0.4.16`
- 协议：不变（渲染进程拥有的 `AppSettings` JSON 字段）
- 存储 schema：不变（可选的 `AppSettings.fontScale`）
- 相关：D343、ADR 0083、`04-ux/06-settings-ia.md`、
  `04-ux/07-ui-design-system.md`

## 背景

`--text-*` 梯度是一组冻结的产品字号（`--text-base` 为 14px，配有更密
的界面装饰和更大的标题）。应用菜单暴露了 Zoom In / Zoom Out / Reset
Zoom，但它们缩放整个窗口，包括布局和控件。想要更密或更大字体的用户
没有一个被记住的偏好，能保持正文、界面装饰和标题之间的相对梯级。

本决策的早期草案存储仅阅读的 px 值，只重映射 transcript 和 composer。
这让侧边栏和设置停留在产品字号，要求用户挑选一个 px 数字，且无法缩放
那些已经使用同一梯度不同梯级的界面。

## 决策

1. **设置 → 常规 → 外观** 在字体下方新增**字号**行。四个星巴克式杯型
   预设（Tall 85% / Grande 100% / Venti 115% / Trenta 125%；zh-CN：中杯 /
   大杯 / 超大杯 / 超超大杯）位于百分比滑块之上。有效值为 80%–150%，
   步进 2.5%。缺省表示 100%。UI 从不要求 px 值。

2. **持久化**为可选的 `AppSettings.fontScale`（`1` = 产品梯度）。无效
   写入在渲染进程边界被拒绝；读取通过 `normalizeFontScale` 钳制。未
   发布版本的遗留 `fontSize` px 字段如果在没有 `fontScale` 的情况下
   存在，按 `px / 14` 迁移。不提升宿主协议或存储 schema 版本。

3. **应用**是全局的。渲染进程在 `document.documentElement` 上设置
   `--font-scale`。每个 `--text-*` token 和 `--leading-row` 都是
   `calc(<product px> * var(--font-scale))`，因此正文、界面装饰、标题、
   代码、侧边栏和设置无需重载即可保持比例。共享的 Lucide 包装器用
   `calc(<px> * var(--font-scale))` 调整字形大小，使工具栏、侧边栏、
   composer 和设置图标跟随同一乘数。

4. **缩放保持独立。** 菜单和快捷键的 Zoom In / Zoom Out / Reset Zoom
   继续缩放整个窗口。字体比例与缩放相互叠加。

## 后果

- 一个控件缩放所有 `--text-*` 消费者；已经比正文小或大的位置保持相对
  更小或更大。
- 用户不需要挑选一个只匹配 `--text-base` 的 px 数字。
- 较大的比例也会放大紧凑的界面装饰，包括 Lucide 字形。高度是固定 px
  值（而非 `--leading-row`）的行仍可能感觉更挤；150% 的上限约束了这
  一点。

## 替代方案

- **仅重映射 `.thread-wrap` / `.composer-dock` 的阅读区域：** 能保持
  界面装饰紧凑，但用户随后在一个窗口中有两种字号，且仍需为正文梯级
  挑选 px 数字。
- **只用 Zoom In/Out：** 已经存在；它把界面装饰和文本一起缩放，不是
  一种字体偏好。
- **修改 `html { font-size }` 并把梯度切换为 rem：** 重构更大；产品
  梯度是 px token，且 token 守卫禁止组件 CSS 中出现裸 rem。
