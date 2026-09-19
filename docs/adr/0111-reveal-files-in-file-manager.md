# ADR 0111: 在操作系统文件管理器中显示 Files

- Status: Accepted
- Date: 2026-08-22
- Deciders: PI-Desktop maintainers
- Related: [ADR 0105](0105-files-as-a-bundled-plugin.md) ·
  [ADR 0109](0109-open-files-with-the-os-associated-application.md) ·
  [07-plugins/03-plugin-api](../spec/07-plugins/03-plugin-api.md) · E2E-153

## 背景

捆绑的 `pi.files` 查看器此前用其头部动作以操作系统关联应用打开
选中文件。该移交并非对每种文件类型或平台都可靠，且不符合在项目
中定位文件这一主要浏览意图。查看器已经知道选中的根相对路径，宿
主也有原生的文件管理器显示操作。

## 决策

1. 新增 `pi.fs.reveal(pathFromRoot)` 及配套的面板桥接通道
   `fs.reveal`。
2. 用现有的 `fs.read` 权限和完整的已声明文件作用域检查门控该操
   作：根包含、符号链接解析、受保护路径、拒绝清单，以及 manifest
   作用域或用户同意。只接受已存在的常规文件，且插件不提供绝对
   路径。
3. Electron Main 在门之后调用 `shell.showItemInFolder`。平台支持
   时文件管理器可以选中该文件。
4. 捆绑的 Files 查看器把其头部动作替换为**在文件夹中显示**，并
   在显示失败时报告本地化的 toast。`fs.openDefault` 保持可用，作
   为面向明确需要关联应用移交的插件的新增公共 API。
5. 成功和失败的显示都按插件 id 和根相对路径审计。桌面 IPC 和
   host-core 协议版本不变。

## 后果

- 选中文件可以不依赖文件关联地被定位。
- 该动作无法显示凭据、受保护的应用数据、工作区或所选根之外的文
  件，以及插件已声明读取作用域之外的文件。
- 第三方插件可以使用与捆绑 Files 插件相同的有界操作；不引入私
  有的捆绑插件能力。
