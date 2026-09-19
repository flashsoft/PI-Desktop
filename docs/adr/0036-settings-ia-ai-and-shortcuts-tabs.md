# ADR 0036: 把 Settings 拆分为 AI 和 Shortcuts 目标页

- 状态: 已接受
- 日期: 2026-07-30
- 决策者: PI-Desktop 核心团队
- 相关: D090, D133, ADR 0013, ADR 0026

## 背景

ADR 0026 把 Settings 目录冻结为五个目标页：Basics、Model
configuration、Import、Project archive 和 Info。随时间推移，Basics
积累了六张互不相关的卡片——Appearance、Defaults、Permissions、
Context management、Keyboard shortcuts 和 Developer——使单个页面
难以扫视，并埋下了两个概念上不同的关注点：

1. **全局 AI 行为**（决定 agent 自主行动程度的权限模式，以及决定
   agent 如何压缩其上下文的上下文管理）是 AI 运行时关注点，不是
   外观层面的基础项。
2. **Keyboard shortcuts** 是一个自包含、被频繁查阅的界面，拥有自己
   的目标页会受益，尤其是现在全局搜索对话框和命令面板会把用户路由
   到快捷键配置。

Model configuration 目标页已经拥有 AI 使用*哪个* provider/模型；
全局 AI 行为控件目前与主题和语言同处一页，这是错误的邻域。
Developer mode 是系统/高级关注点，放在版本、日志和更新旁边比放在
外观旁边更合适。

修改冻结的五目标页目录（D133）需要显式的基线决策，而不是悄悄改写。

## 决策

保持整页 Settings 外壳、返回应用操作、搜索控件、侧栏度量、内容卡片
和主题行为不变。把五目标页侧栏替换为恰好按此顺序排列的七个目标页：

1. **Basics**（`general`，Lucide `SlidersHorizontal`）——Appearance
   和 Defaults
2. **全局 AI / AI**（`ai`，Lucide `Sparkles`）——Permissions 和
   Context management
3. **Shortcuts**（`shortcuts`，Lucide `Keyboard`）——Keyboard
   shortcuts
4. **Model configuration**（`agent`，Lucide `Bot`）——provider
   工作室和默认模型
5. **Import**（`import`，Lucide `Download`）——会话导入
6. **Project archive**（`projects`，Lucide `Archive`）——持久项目
   索引
7. **Info**（`about`，Lucide `Info`）——版本、日志、更新和
   Developer

只移动内容；不添加、移除或重命名任何设置：

- Permissions 和 Context management 卡片从 Basics 移到新的 **AI**
  目标页。
- Keyboard shortcuts 卡片从 Basics 移到新的 **Shortcuts** 目标页。
- Developer 卡片从 Basics 移到 **Info**。
- Basics 只保留 Appearance 和 Defaults。
- Model configuration、Import、Project archive 及其内容不变。

目标页 ID `ai` 和 `shortcuts` 被加入 `settingsTab` 状态联合和共享的
设置搜索索引（`SETTINGS_NAV`），因此全局 Settings 搜索能暴露新目标
页并深层链接到它们。Provider 设置深层链接和模型菜单操作继续指向
Model configuration。Settings 搜索把迁移的行索引到其新的所属目标页
下。

## 后果

- Basics 更短并聚焦于外观；AI 行为、快捷键和开发者控件各一次点击
  即可到达，无需滚动单个长页面。
- D133/ADR 0026 冻结的五目标页数量和顺序仅在目标页数量和排序上被
  取代；没有 IPC、宿主 RPC、数据库、安全或项目激活契约的变更。
- 断言精确五项侧栏顺序的 spec 和 E2E 场景必须更新为七项顺序，包括
  "没有 Keyboard 目标页"的断言（现已反转）。
- Developer mode 从 Basics 移到 Info；Settings 搜索和开发者工具门控
  行为不变。
- 共享的 `settingsTab` 联合和 `SETTINGS_NAV` 索引增加两个条目；现有
  持久化/默认标签页（`general`）不受影响。

## 备选方案

### 把六张卡片全部保留在 Basics

否决，因为单个页面难以扫视，并把不相关的关注点（外观与 AI 权限
策略和快捷键录制并列）混在一起。

### 把 AI 行为合并进 Model configuration

否决，因为 Model configuration 拥有使用*哪个* provider/模型（连接/
身份关注点），而权限模式和上下文压缩是*运行时行为*关注点。合并
它们会让 provider 工作室页面过载，并把全局 AI 行为藏在 provider
设置背后。

### 把 Developer 移到专用的 Advanced 目标页

否决，因为单卡片目标页不值一行侧栏；Info 已经收纳了系统/高级界面
（版本、日志、更新），是开发者工具门控的天然归宿。

## 参考

- `docs/spec/00-baseline.md`
- `docs/spec/04-ux/01-ui-ia.md`
- `docs/spec/04-ux/06-settings-ia.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- `docs/spec/08-meta/decisions-log.md` (D166)
