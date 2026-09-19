# ADR 0034: 把命令面板合并进全局搜索

- 状态: 已接受
- 日期: 2026-07-30
- 相关: [08-component-spec §16](../spec/04-ux/08-component-spec.md) ·
  [09-plugin-command-palette](../spec/07-plugins/09-plugin-command-palette.md) ·
  [04-builtin-commands](../spec/04-ux/04-builtin-commands.md) ·
  [04-e2e-test-plan](../spec/06-delivery/04-e2e-test-plan.md) · 决策 D014
- 更新: 移除 [08-component-spec §16](../spec/04-ux/08-component-spec.md)
  中描述的独立命令面板界面

## 背景

应用发布了两个重叠的"查找一切"界面：

- **命令面板**（Cmd/Ctrl+Shift+P），列出内置和插件命令，从专用的
  顶栏按钮和独立的覆盖层打开。
- **全局搜索**（Cmd/Ctrl+K），列出会话、页面和设置。

两者都是可搜索的覆盖层，交互模型相同（输入、方向键、Enter、Esc）。
保持它们分离意味着要维护两个界面、顶栏里多一个按钮，以及用户
心智模型的分裂："命令在这里，其他一切在那里。"顶栏的命令面板
按钮还与搜索按钮争夺空间。

## 决策

1. 移除独立的命令面板覆盖层（`CommandPalette.tsx`）及其顶栏按钮。
2. 把命令列表（内置 + 插件命令）作为 **Commands** 区块渲染在现有
   全局搜索对话框（`SearchDialog.tsx`）内，使用与其他结果组相同的
   `role="listbox"` / `role="option"` 语义和扁平选项索引导航。
3. `openCommandPalette` 快捷键（Cmd/Ctrl+Shift+P，按 D014）现在打开
   全局搜索对话框，其中包含 Commands 区块。`Cmd/Ctrl+K` 继续打开
   同一个对话框。两组按键都能到达命令。
4. 从应用 View 菜单中移除冗余的"Command Palette"条目（View 菜单
   已有"Search"）。快捷键 id 保留，因此键盘快捷键设置页和插件命令
   发现继续工作。
5. 命令数据路径不变：`api.searchCommands` 和 `runPaletteCommand`
   （内置 + 插件桥）被搜索对话框复用。

## 后果

- 一个可搜索界面覆盖会话、页面、设置和命令。
- 顶栏少了一个按钮；搜索成为发现的单一入口。
- `Cmd/Ctrl+Shift+P` 仍然有效，现在落在统一搜索上且命令列表可用；
  肌肉记忆得到保留。
- `CommandPalette.tsx`、其 CSS 界面和 `paletteOpen` 状态被移除。
- 插件命令发现（E2E-023）和禁用即移除贡献（E2E-025）改为针对
  全局搜索表达。

## 备选方案

### 保留两个独立界面

否决：复制交互逻辑和 UI，增加第二个顶栏按钮，并迫使用户判断哪个
界面装什么。合并同时简化代码和 UX。

### 在全局搜索中把命令藏在查询之后

否决：命令面板在空查询时可达（Cmd/Ctrl+Shift+P 显示所有命令）。
因此 Commands 区块即使在空查询时也渲染，使快捷键保持其行为。

## 参考

- `apps/desktop/src/components/SearchDialog.tsx`（Commands 区块）
- `apps/desktop/src/components/ConversationTopbar.tsx`（按钮已移除）
- `apps/desktop/src/App.tsx`（`openCommandPalette` → 打开搜索）
- `apps/desktop/electron/main/application-menu.ts`（菜单项已移除）
- `apps/desktop/src/lib/api.ts`（复用 `searchCommands`）
- `apps/desktop/src/lib/commands.ts`（复用 `runPaletteCommand`）
- `docs/spec/06-delivery/04-e2e-test-plan.md`（E2E-023、E2E-025 已更新）
