# 内嵌的上游

`pi.file-manager` 是一个第三方插件，同时也通过官方插件市场发布。本目录
是某一个发布版本的内嵌（vendored）副本，让每一次安装都开箱即有文件
视图（ADR 0241）。

## 来源

| 字段 | 值 |
| --- | --- |
| 仓库 | https://github.com/Tioit-Wang/pi-desktop-plugin-file-manager |
| 标签 | `v0.5.2` |
| Commit | `d36ebe9f7fb82ee71e87670b0a65403660b18a00` |
| 许可证 | MIT（见 `LICENSE`；上游没有附带许可证文件） |
| 插件市场 | 已发布到插件中心 <https://plugins.aiuo.net/console/publish/upload>：`pi.file-manager` 0.5.2，审核通过，产物 `c8416b755e5624ad30110176caa512cd433fdf699ef32c7a2ba2df7f2df2b0f5`（1462096 字节） |

标签已推送、发布已上架，因此从市场安装的 0.5.1 现在既可以从市场、
也可以从这份内嵌副本获得 0.5.2。两条路径提供相同的字节。

> 已发布的 `.piplug` 包含插件安装所需的七个文件（`manifest.json`、
> `main.js`、`README.md`、`CHANGELOG.md`、`.gitignore`、
> `views/index.html`、`views/assets/index.js`），而**不**包含
> `views-src/`：产物只带构建好的视图，绝不带它的 React 源码。在仓库
> 根目录执行 `pi-plugin pack` 会打进 `views-src/`，而插件中心的审核
> 会以四个阻塞项拒绝这样的包——应该先从打好标签的树复制一份、删掉
> `views-src/` 再打包。

下面的文件与那个 commit 字节一致，唯一的例外是“本地改动”一节列出
的 manifest 字段。行尾为 LF：上游 commit 存的就是 LF，本仓库的
`.gitattributes` 也保持它为 LF。

## 上游校验和（sha256）

| 文件 | 字节数 | sha256 |
| --- | --- | --- |
| `main.js` | 63234 | `43cface10124728f16e72530e699678177f97353b57190532e89c03186e6960d` |
| `README.md` | 20039 | `8c524f6d13eac557e286fa0ec9b9cf5138bed0bd66d4a7914f3484443e627a01` |
| `views/index.html` | 345 | `771fd3d8afdea7fca75ed1f1918c1ce93ad1c87babdb321cfb85e910465cd2c1` |
| `views/assets/index.js` | 1345417 | `d0a1dc369764bed2ab12ce0e65fe983fe0b4f9919f2f8ff4546b736208d66dac` |
| `manifest.json` | 14171 | `751a5c86d6e4901cf7fc7f5d9e1de99c90c6dc0798b316500d20781d779e4188` |

上游仓库的 `views-src/` 刻意不做内嵌：本目录携带的是插件发布的构建
产物视图，而不是它的 React 源码。

## 本地改动

两处，这样重新同步（re-sync）仍然只是一次复制：

- `manifest.json` 增加了 `"license": "MIT"`（位于 `author` 之后），
  使内嵌副本变为 14191 字节
  （`ba8d60726a0227d7f5530addf885a9849949b86ca75d12786f23ecb82d10fe3e`）。
  每个发布的插件都携带其许可证，而上游 manifest 早于这个约定。
- `package.json` 是**新增的**，内容为 `{"type": "commonjs"}`。它不在
  上游发布中，也不在已发布的 `.piplug` 里。`main.js` 是 CommonJS，
  而 `apps/desktop/package.json` 声明了 `"type": "module"`，因此在
  检出中它下面的每个 `.js`——包括这个——都会被归类为 ESM，宿主的
  `require()` 会以 "require is not defined in ES module scope" 失败。
  这个标记是 Node 自己的机制，并且把修正范围限定在这一个插件；
  `pi.browser` 是 ESM，必须继续继承上级的 `"module"`，所以这个标记
  不能放在上一层目录。在打包后的应用中这个文件不起作用，删掉它只
  会损害开发者体验，绝不会影响用户。

## 重新同步更新的发布

1. 检出新的上游标签，并确认市场条目指向相同的字节。
2. 用标签里的副本替换上面那四个上游文件（`main.js`、`README.md`、
   `views/index.html`、`views/assets/index.js`）以及 `manifest.json`，
   **保持 LF**：`git archive` 会应用检出的行尾转换，因此要从工作树
   中提取 blob（或用 `git cat-file blob`），而不是从归档中提取。
3. 重新为 `manifest.json` 加上 `"license": "MIT"`，并重新创建
   `package.json`——标记是本地的，标签里不带它。
4. 更新这里的 `来源`、校验和表与发布章节，以及
   `bundled-plugins.test.mjs` 固定的 commit 哈希，然后在
   `apps/desktop` 中运行 `node --test test/bundled-plugins.test.mjs`。
5. 不要动 `manifest.json` 中的版本号：它是上游版本，市场基于它提供
   更新。

## 0.5.2 修复了什么

一个看起来生效了、实际没有生效的文件夹切换。宿主以正斜杠报告项目
文件夹（`C:/Users/.../Docs`），而这个插件自己的进程通过 Node 的
`path.resolve` 存储记住的选择，也就是反斜杠（`C:\Users\...\Docs`）。
`samePath` / `matchRoot` 先按字面、再按忽略大小写比较两种形式，但
从不忽略分隔符，于是刚写入的值匹配不到任何 root：包含基点回退到了
主文件夹。视图头部仍显示兄弟文件夹（它比较的是自己那份未被改写的
宿主字符串），而主进程列出和读取的是主文件夹——并且重新打开视图会
完全丢失这个选择。

现在 `canonicalPath` 在两个实现中都把反斜杠折叠为正斜杠（尾部
分隔符和忽略大小写的回退保持原样），因此在本发布之前写入的记忆也
会自愈，没有人需要重新切换。测试补上了它们漏掉的形态：jail 测试
装置现在像真实宿主一样以正斜杠报告文件夹 root，并有一个没有修复
就会失败的用例，纯校验则断言同一目录的两种写法都能命中。

> 已发布的 0.5.2 包的 `manifest.json` 携带 CRLF：它是在一个改写了
> 那一个文件的 Windows 检出中打包的。包里的其他所有文件、以及这份
> 内嵌副本中的所有文件都是 LF——所以重新同步时应以标签的字节为准，
> 而不是产物里的 manifest。

## 0.5.1 修复了什么

0.5.0 在文件夹切换上的两个缺陷：

- 「用默认应用打开」或「在文件管理器中显示」以视图正在浏览的文件夹
  为基准命名条目。宿主按**工作区**根解析相对路径，因此当选中兄弟
  文件夹时，主文件夹里的同名文件会被打开，而只存在于兄弟文件夹的
  文件则报告找不到。现在，当选中的文件夹不是主文件夹时，视图会发送
  绝对路径；宿主接受落在当前打开项目已注册文件夹 root 之内的绝对
  路径（ADR 0253）——仅限这两个动作，且声明的范围、凭据黑名单和
  受保护路径防护保持不变。
- 编辑器面板在其缓冲区仍持有上一个文件夹的文档时就显示了空状态，
  于是切换回相对路径相同的文件、或按下 Ctrl+S，会遇到另一个文件夹
  的内容。现在打开的文件关闭时会清空文档。

## 0.5.0 新增了什么

一个项目可以是一组本地文件夹 root，视图现在能感知这一点：
`pi.workspace.get()` 和 `workspace:changed` 事件在不变的 `path` /
`name` 之外携带 `projectId` 和 `roots`（`{ path, name, primary }[]`，
按组顺序，主文件夹在前）。当组内多于一个文件夹时，视图头部的文件夹
名会变成切换器，选择会按项目记住在视图自己的 `prefs.projectRoots`
里——它绝不改变工作区、Agent 的工具 root、会话的主路径或项目
指令。

包含基点在任何时候仍然恰好是一个已注册 root，绝不是整组的并集：
列表、读取、写入、搜索和 SQLite 都相对选中的文件夹解析，符号链接
与 junction 拒绝规则和凭据黑名单保持不变。宿主请求本视图打开的
绝对路径若落在同项目的另一个文件夹下，会先把基点切换到那个文件夹，
再按相对它解析——正是这一点让补全到兄弟文件夹的聊天文件引用能在
本视图中打开，而不是作为外部文件打开。

## 0.4.0 新增了什么

宿主可以把一个要展示的文件交给被贡献的视图：创建时该引用通过视图
入口 URL 的 `piViewOpen` 查询参数传递，视图加载后通过 `view:open`
preload 事件传递。聊天文件引用利用它在该视图中打开文件，而不是在
宿主的文件标签页中；当宿主请求视图展示某个文件时，视图会收起自己
的左侧文件列表。视图还接受项目根之外的绝对路径——宿主自己选定的
会话临时目录与附件存储——这也是为什么它的 `safetyNotes` 披露了这一
例外，而不是声称项目根包含校验覆盖了它读取的所有内容。
