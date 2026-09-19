# ADR 0085: 将工作面板快捷键改为开关式

- Status: Accepted for implementation
- Date: 2026-08-14
- Deciders: PI-Desktop core
- Amends: ADR 0068, D207
- Amended by: [ADR 0195](0195-viewport-fixed-work-panel-toggle.md) (the
  viewport-fixed toggle is the pointer equivalent; the header chevron is no
  longer a collapse control)
- Related: [01-ui-ia](../spec/04-ux/01-ui-ia.md) ·
  [08-component-spec §5](../spec/04-ux/08-component-spec.md) ·
  [09-interaction-patterns §1](../spec/04-ux/09-interaction-patterns.md) ·
  E2E-056

## 背景

ADR 0068 将 `Cmd/Ctrl + J` 设为仅打开动作，并拒绝了开关式设计，理
由是面板头部已经拥有折叠控件，且开关可能在用户试图显示面板时把
它隐藏。实际使用中，这种不对称读起来像是快捷键坏了，而不是一种
保护：显示面板的同一个组合键在第二次按下时毫无反应，因此键盘优
先的用户必须移到头部控件才能收起面板。其他所有绑定到组合键的外
壳表面（`Cmd/Ctrl + B` 对应侧边栏）都是开关式的。

0068 所防范的误隐藏风险很小，因为该快捷键是对称且可立即逆操作
的：保留的上下文、标签页、活动资源和已提交的宽度在折叠后都会保
留，因此误按一次只需再按一次即可撤销。

## 决策

1. `openWorkPanel` 改为开关。当可见面板已打开时，快捷键通过与头部
   折叠控件相同的路径将其折叠；当面板关闭时，快捷键以已提交的宽
   度显示活动会话保留的上下文，且不创建资源标签页。
2. 通过快捷键折叠会完全按照头部控件的方式保留会话上下文——标签
   页、活动资源、浏览器资源和已提交的宽度都会保留，因此第二次按
   下会恢复之前的界面。
3. 快捷键 id 保持为 `openWorkPanel`，使现有的用户按键绑定覆盖继
   续生效；只有设置 → 快捷键中的标签改为描述开关行为。
4. 0068 中无活动会话和设置页面空操作的上下文保持不变，产物驱动
   的资源创建、会话所有权和后台事件隔离也不变。不新增宿主协议、
   IPC 通道或原生应用菜单命令。

## 后果

- 一个组合键既可显示也可收起工作面板，与侧边栏一致。
- 头部折叠控件仍为指针用户保留，现在是同一 store 动作的两个等价
  入口之一。
- ADR 0068 中被拒绝的"将 `Cmd/Ctrl + J` 设为开关"替代方案不再成
  立；0068 的其余条款继续有效。

## 考虑过的替代方案

### 保持仅打开并增加单独的关闭组合键

被拒绝。第二个绑定会把稀缺的组合键空间花在一个现有绑定的逆操作
上，而且第一个组合键仍然感觉没有反应。

### 仅在面板没有标签页时切换

被拒绝。依赖不可见标签页状态的行为不如纯粹的开关可预测，而且保
留的上下文使折叠有内容的面板无论如何都是非破坏性的。

## 参考

- `docs/adr/0068-work-panel-keyboard-entry.md`
- `docs/spec/04-ux/01-ui-ia.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/04-ux/09-interaction-patterns.md`
- `docs/spec/08-meta/decisions-log.md` (D128, D142, D207, D221)
