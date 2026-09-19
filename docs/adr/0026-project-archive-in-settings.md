# ADR 0026: 把 Projects 索引移入 Settings 作为归档

- 状态: 部分被 ADR 0036 取代（目标页数量/顺序）
- 日期: 2026-07-27
- 决策者: PI-Desktop 核心团队
- 相关: D066, D090, D093, D133, ADR 0013, ADR 0016

## 背景

home 侧边栏目前同时暴露独立的 Projects 目标页和保留的项目组。活跃
工作通过保留的项目组进行，而 Projects 目标页主要作为持久目录，用于
发现、归档、恢复、重新打开和关闭历史项目记录。

在主导航中同时保留两个界面复制了项目概念，并让归档管理与任务创建
和 Plugins 获得同等的显著性。ADR 0013 冻结的四目标页 Settings 目录
没有这个项目管理层面的位置，所以移动它会改变设置信息架构，需要
基线修订。

## 决策

1. 从 home 侧边栏、应用页面状态和全局页面搜索结果中移除独立的
   Projects 目标页。
2. 在 Settings 中 Import 之后、Info 之前添加 **Project archive**
   （`项目归档`）。Settings 现在有五个目标页：Basics、Model
   configuration、Import、Project archive 和 Info。
3. 在归档中复用持久的 Projects 索引。它保留搜索、添加、激活、
   项目会话展开、固定、归档/恢复和关闭操作。
4. Settings 归档始终包含已归档的项目记录。已归档的项目行保留其
   弱化呈现，并可以从现有操作菜单恢复。展开的项目详情不应用侧边栏
   的已归档会话可见性过滤。
5. 激活一个项目或项目会话会离开 Settings 并返回聊天。归档或关闭
   一个项目时保持 Project archive 目标页可见，包括必须选择回退
   workspace 的情况。
6. Home 侧边栏保留保留的项目组和持久的新建项目操作。项目存储、
   渲染进程展示元数据和单一可见 workspace 激活模型保持不变。
7. Settings 和全局设置搜索索引 Project archive 及其归档、恢复、
   项目标题和项目搜索词条。

## 后果

- Home 侧边栏少了一个主导航目标页，给活跃项目和会话工作更多视觉
  优先级。
- 历史和已关闭项目仍可通过 Settings 恢复，包括未作为侧边栏标签页
  保留的导入路径。
- Settings 从四个增长到五个目标页，仅在目标页数量和顺序上取代
  ADR 0013。
- 没有 IPC、宿主 RPC、数据库、安全或项目激活契约的变更。
- 现有持久化的项目/会话归档元数据保持兼容。

## 备选方案

### 在 home 侧边栏和 Settings 中都保留 Projects

否决，因为重复导航使所有权不清，且不能减少 home 侧边栏的主菜单。

### 只显示已归档的行

否决，因为已关闭但未归档的持久项目会失去其唯一的基于索引的恢复
路径。归档是一个完整的历史目录，始终包含已归档行，而不是仅归档
过滤器。

### 把项目管理放进 Basics

否决，因为完整的可搜索项目索引是目标页规模的工具，而不是应用
默认值行或紧凑设置卡片。

## 参考

- `docs/spec/00-baseline.md`
- `docs/spec/03-runtime/04-data-storage.md`
- `docs/spec/04-ux/01-ui-ia.md`
- `docs/spec/04-ux/06-settings-ia.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-038)
- `docs/spec/08-meta/decisions-log.md` (D133)
