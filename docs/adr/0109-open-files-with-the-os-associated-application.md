# ADR 0109: 用操作系统关联应用打开 Files 条目

- Status: Accepted
- Date: 2026-08-20
- Deciders: PI-Desktop maintainers
- Related: [ADR 0105](0105-files-as-a-bundled-plugin.md) ·
  [ADR 0088](0088-declared-file-scope-for-plugins.md) ·
  [07-plugins/03-plugin-api](../spec/07-plugins/03-plugin-api.md) · E2E-153

## 背景

捆绑的 `pi.files` 视图可以在其隔离查看器中检查文本，但图片、文
档、压缩包和其他文件更适合由操作系统的关联应用处理。现有的
`shell.openExternal` API 刻意只接受 web 和 mail URL，因此把工作区
路径转换为 `file:` URL 要么会削弱该边界，要么会给插件一个无作
用域的文件打开器。

## 决策

1. 新增 `pi.fs.openDefault(pathFromRoot)` 及配套的面板桥接通道
   `fs.openDefault`。
2. 该 API 由现有的 `fs.read` 权限覆盖。宿主通过完整的读取门解析
   根相对路径：工作区/用户选择的根、真实路径包含、受保护路径、
   拒绝清单，以及已声明作用域或用户同意。它只接受已存在的常规
   文件。
3. Electron Main 在门之后调用 `shell.openPath`，由操作系统选择
   文件关联。插件永远不会收到绝对路径，也无法选择可执行文件或
   命令行。
4. 捆绑的 Files 视图只在其选中文件查看器中暴露该动作，包括二进
   制和图片文件。成功和失败都按插件 id 和根相对路径审计。
5. 这是新增的插件 API 变更；桌面 IPC 和宿主协议版本不变。现有
   的 `shell.openExternal` URL 限制保持不变。

## 后果

- Files 可以移交应用内文本查看器无法渲染的内容。
- 默认应用可能按照自己的行为复制、转换或同步该文件；移交由用户
  从查看器显式发起。
- 拥有 `fs.read` 的插件仍无法通过此 API 打开凭据、仓库内部、受
  保护的应用数据、任意绝对路径或目录。
- 失败的操作系统移交以 `OPEN_FAILED` 报告给插件，并通过 Files
  视图的错误 toast 可见。

## 考虑过的替代方案

### 用 `file:` URL 复用 `shell.openExternal`

被拒绝：该 API 面向外部链接，会把 URL 出站与本地文件访问混淆。
它也使文件作用域难以一致执行。

### 添加私有的捆绑插件 IPC 通道

被拒绝：Files 刻意是公共插件 API 的消费方。私有桥接会重新制造
ADR 0105 移除的信任边界例外。

### 新增一个独立于 `fs.read` 的权限

此动作被拒绝：宿主不暴露任意打开器。路径必须已经是插件已声明作
用域内的可读文件，且该 UI 动作不允许插件选择可执行文件或 URL。
操作保持被审计，因此后续的策略变更有明确的边界可修订。
