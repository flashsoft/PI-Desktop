# ADR 0172: 受约束的聊天内图片展示

- 状态：已接受
- 日期：2026-09-07
- 相关：ADR 0019、ADR 0163、ADR 0169、决策 D320/D334、E2E-187
- 修订：桌面 IPC 规格中 `fs/read` 的"仅限工作区"条款

## 背景

粘贴和上传的图片以无扩展名的 `attachments/<sha256>` blob 存储在数据目录
下。本地 Markdown 图片是工作区相对路径。渲染进程 origin 无法加载这些
文件，因此历史轮次显示的是芯片而不是图片。通过 `fs/open` 打开
`attachments/<sha256>` 芯片也会失败，因为路径被当作工作区相对路径处理。

一个通用的"任意绝对路径常规文件"读取通道会让渲染进程窃取任意磁盘
内容。

## 决策

1. `fs/list` 保持仅限工作区。扩展 `fs/read`、`fs/reveal` 和 `fs/open`，
   使它们共享 `resolveOpenablePath`：工作区相对路径、已位于工作区 /
   `<data_dir>/scratch/` / `<data_dir>/attachments/` 内的绝对路径，以及
   内容寻址的 `attachments/<sha256>` 引用。读取还会对目标做 `realpath`
   并重新检查包含关系。
2. 新增仅渲染进程可用的 `fs/readImageDataUrl({ref, mimeType?})`。它返回
   有界的图片 data URL，或 `missing` / `notImage` / `tooLarge`，且永不
   返回非图片字节。它不是插件宿主 API；插件继续使用 `fs.readPreview`。
3. 已知的图片扩展名永远优先于客户端提供的 `mimeType`。无扩展名的附件
   blob 只接受现有的 `IMAGE_MIME` 允许列表。任意的 `image/*` 值被忽略。
4. 聊天缩略图和本地 Markdown 图片通过该通道加载。点击已解析的图片在
   同一 ref 上打开宿主文件查看器。

## 后果

- 当文件仍然存在且在上限之内时，历史附件和本地 Markdown 图片内联渲染。
- 即使伪造 `mimeType`，`/etc/passwd` 和其他根目录之外的路径仍然不可读。
- 插件 Files 视图保持工作区作用域；transcript 制品仍使用宿主 `file:`
  标签页。

## 已否决的替代方案

### 新的无界绝对路径读取

否决，因为渲染进程 IPC 不是用户点击关卡。

### 在聊天渲染进程中复用 `fs.readPreview`

否决，因为该 API 是插件作用域、限定在工作区根目录，无法看到
`attachments/<sha256>` blob。

## 参考

- `apps/desktop/electron/main/fs-panel.ts`
- `apps/desktop/src/lib/use-referenced-image-data-url.ts`
- `docs/spec/03-runtime/01-ipc-protocol.md`
