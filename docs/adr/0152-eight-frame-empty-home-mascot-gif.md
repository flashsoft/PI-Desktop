# ADR 0152: 八帧空主页吉祥物 GIF

- Status: Accepted
- Date: 2026-09-04
- Deciders: PI-Desktop core
- Related: D293, D294, E2E-046, E2E-099, US-UI-17
- Supersedes: ADR 0150

## 背景

ADR 0150 用一个 100px 内联 SVG agent 标识替换了随机化的像素画精灵
图集，使空主页主视觉保持安静。现在一个新的八帧挥手吉祥物是预定的
空主页标识，其浅色和深色图稿分别提供且已使用透明背景。之前的
SVG 轨道/呼吸循环不再匹配该图稿，而单一位图在外壳主题变化时效果
不佳。

## 决策

在既有的 100px 空主页槽位用处理过的八帧 GIF 替换内联 SVG。
`HomeMascotLogo` 是装饰性的（`aria-hidden="true"`），渲染四张图片，
CSS 每次显示其中一张：

- `src/assets/home-mascot-light.gif` / `home-mascot-dark.gif` — 循环
  挥手动画，第一帧有短暂的停留
- `src/assets/home-mascot-still-light.png` /
  `home-mascot-still-dark.png` — 匹配的第一帧，仅在
  `prefers-reduced-motion: reduce` 下显示

启用的一对跟随 `document.documentElement[data-theme]`。除 `light`
之外的任何值都使用深色图稿，与 `BrandLogo` 一致。播放由 GIF 原生
驱动。没有随机选择，没有 JavaScript 定时器，指针悬停不改变节奏。

## 后果

- 空主页品牌使用提供的吉祥物动作集，而不是代码原生的 SVG。
- 100px 布局槽位、装饰性角色和减少动效冻结保留。
- 浅色和深色表面各自保留专用的吉祥物处理，而不是通过主题令牌给
  一份资源重新着色。
- 历史的 `home-mascot-groups.png` 图集不在仓库中；GIF 和静止帧
  是源资源。

## 被否决的替代方案

- 保留 SVG 并忽略新帧：这会丢弃所要求的空主页动作集。
- 恢复随机化精灵图集：这会重新引入 ADR 0150 移除的定时器、悬停
  和姿态选择状态。
- 用 JavaScript 驱动八帧：这会增加 GIF 加 CSS 切换已经覆盖的
  定时器和减少动效状态。
- 两个主题共用一个 GIF：提供的浅色和深色图稿会与相反的表面冲突。
