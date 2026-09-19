# ADR 0169: 面向插件视图的分类文件预览与实时工作区事件

- 状态：已接受
- 日期：2026-09-06
- 决策者：PI-Desktop 核心团队
- 相关：[ADR 0104](0104-plugin-contributed-work-panel-views.md) ·
  [ADR 0105](0105-files-as-a-bundled-plugin.md) ·
  [ADR 0109](0109-open-files-with-the-os-associated-application.md) ·
  [ADR 0111](0111-reveal-files-in-file-manager.md) · D332 · E2E-153

## 背景

捆绑的 `pi.files` 视图是一个公开插件消费者（ADR 0105）。在它取代宿主
Files 工具之后，若干第一方浏览行为缺失或损坏：

1. `fs.readText` 无法分类图片、二进制文件或超大文件，因此插件把图片报
   告为不可用，并且可能把大二进制按 UTF-8 加载。
2. `fs.openDefault` 已存在（ADR 0109），但当 reveal 取代头部动作后
   （ADR 0111），它从 Files UI 中消失了。
3. 诸如 `appearance:changed` 的面板事件只广播给分离的 `ui.panel` 窗口。
   停靠的工作面板视图从未收到它们。
4. `workspace:changed` 只停留在规划中的规格。Files 视图改为每两秒轮询
   一次 `workspace.get`。

## 决策

1. 新增 `pi.fs.readPreview(pathFromRoot)` 和面板通道 `fs.readPreview`，由
   现有的 `fs.read` 权限和完整的声明作用域检查把关。宿主将一个已存在的
   常规文件分类为 `text`、`image`、`binary` 或 `tooLarge`，使用与宿主
   Files 标签页相同的尺寸上限（512 KiB 文本，5 MiB 图片）。图片返回
   data URL；二进制和超大文件不返回负载字节。目录被拒绝。
2. 通过同一个 `pi-plugin-panel-event:<event>` preload 通道，把每个插件
   面板事件同时广播给分离的面板窗口和存活的停靠视图。
3. 每当缓存的工作区路径变化时，向面板和插件进程投递
   `workspace:changed`。负载与 `workspace.get()` 一致：
   `{ path, name } | null`。
4. 在捆绑的 Files 查看器中恢复 **Open with default app**，通过 `fs.glob`
   增加搜索，从用户手势复制根相对路径，并通过 `fs.readPreview` 预览
   图片。不引入任何捆绑插件私有通道。

## 后果

- 第三方插件无需发明第二个读取 API 即可预览图片和超大文件。
- 停靠视图能实时跟随主题、locale 和项目切换。
- Files 插件仍然是公开 API 消费者；transcript 的 `file:<path>` 标签页
  保持宿主所有。

## 已考虑的替代方案

### 复用 `fs.readText` 并在插件内检测图片

否决：对 PNG/JPEG 做 UTF-8 解码是有损的、没有尺寸上限，且没有二进制
通道就无法产生 data URL。

### Files 专用私有 IPC 通道

否决：这会重建 ADR 0105 移除的宿主/插件特例。
