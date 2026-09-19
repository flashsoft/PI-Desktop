# ADR 0268：移除引用、注解和 side chat

- Status: Accepted
- Date: 2026-09-16
- Deciders: PI-Desktop runtime and desktop UI maintainers
- Supersedes: ADR message-quotes-and-side-chats, ADR response-annotations, ADR floating-annotation-index
- Amends: ADR 0254（其「Amendment: native side-chat forks」，2026-09-14）
- Preserves: D097, D128, D134, D209, D254, D261, D301
- Related: [04-ux/08-component-spec.md](../spec/04-ux/08-component-spec.md) ·
  [04-ux/09-interaction-patterns.md](../spec/04-ux/09-interaction-patterns.md) ·
  [06-delivery/04-e2e-test-plan.md](../spec/06-delivery/04-e2e-test-plan.md)

## 背景

三个渲染进程持有的界面围绕 transcript 和 composer 生长出来。ADR
message-quotes-and-side-chats 在消息动作行新增了 **Quote** 动作、选中
文本浮层，以及 docked 在工作面板中的渲染进程持有 side chat。ADR
response-annotations 把 assistant turn 上的 Add to chat 变成编号注解附
件，在生成的 `# Response annotations:` prompt 块中携带给模型；ADR
floating-annotation-index 新增了浮动索引、来源徽标和高亮，以及评论编
辑器。ADR 0254 的原生 side-chat fork 修订使这些面板对 `native-pi:`
session 工作。

合起来，它们超出了产品所用的界面。浮层和动作行都必须从渲染的 DOM 恢
复摘录；注解增加了第二种 prompt 序列化，每个显示界面（transcript、编
辑种子、队列预览）都必须反转它；side chat 是第二个 session 生命周期，
其唯一的持久产物——fork 出的子级——`session.fork` 已经能产生。
Copy、edit、fork 和 retry 覆盖其余。

## 决策

1. **消息动作行。** 从用户消息和 assistant turn 的悬停动作行移除
   **Quote**、**Annotate** 和 **Open/Ask in side chat**。Copy、Edit 和
   Delete（用户消息）、Fork、Retry/Regenerate 在位置、行为、标签和快
   捷键上保持原样。
2. **选中浮层。** 完全移除选中文本工具条：在 transcript 中选中文本不
   再浮出动作条。删除 `lib/selection-quote.ts`、`lib/chat-quotes.ts`、
   `SelectionQuoteButton` 组件及其样式。Composer 不保留引用预填路径：
   `appendComposerDraftText` 和 `quoteMessageIntoComposer` 及其 store
   动作一并移除。
3. **注解。** 移除注解功能：评论编辑器、浮动注解索引、回答来源徽标和
   高亮、composer 注解附件 chip、注解 store 切片和注解锚点模块都被删
   除。回答中的 `:codex-annotation{index="N"}` 指令不再被识别；它渲染
   为普通的 Markdown 文本。
4. **Prompt 组装。** 发送路径不再组装 `# Response annotations:` 块：
   `api.prompt` 和 `enqueuePrompt` 按用户所写的文本使用，没有生成的
   标题、指令句或 `<response-annotations>` 载荷。显示层的还原
   `requestTextWithoutAnnotations` 随之删除，因此已经包含生成块的旧
   存储 prompt 在 transcript、编辑种子和队列预览中逐字显示，而不是被
   还原回请求。
5. **Side chat。** 移除 side chat 功能：创建子 session 的首次 Send 草
   稿生命周期、渲染进程 transcript 投影（`projectSideChatEvent`）、
   `sidechat:` 工作面板标签页类型及其 `SideChatTab`、注册/释放/级联
   清理规则，以及可用性阻塞原因报告都被删除。`session.fork` 保留为
   能力，Fork 动作保留为其唯一入口。
6. **退役标识符（已退役；绝不得重用）。** 决策 ID
   `D-LOCAL-message-quotes`、`D-LOCAL-selection-overlay`、
   `D-LOCAL-response-annotations`、`D-native-sidechat-stream`，以及 E2E ID
   `E2E-CHAT-quote-prefill`、`E2E-CHAT-selection-markdown`、
   `E2E-CHAT-selection-side-chat`、`E2E-CHAT-annotation-attachments`、
   `E2E-CHAT-annotation-session-state`、`E2E-CHAT-annotation-source-index`、
   `E2E-CHAT-annotation-ack-and-steering`、`E2E-CHAT-side-chat-fork`、
   `E2E-CHAT-side-chat-stream`、`E2E-CHAT-side-chat-add-to-main`、
   `E2E-CHAT-side-chat-promote`、`E2E-CHAT-side-chat-close` 和
   `E2E-SESSION-native-side-chat-fork-survives-close` 已退役，绝不得为
   其他场景重用。被取代的 ADR 文件作为历史保留在磁盘上。
7. **边界。** 宿主协议保持 v11，存储 schema 保持 v15：没有新 IPC 通
   道，没有新权限，没有协议或 schema 提升，也没有 Rust 变更。
   `session.fork`、transcript、工作面板和 composer 的其余部分保持其
   现有契约。

## 保留的行为

- **D134 / `session.fork`。** Fork 仍从锚点消息解析持久子级并仍激活它，
  包括 ADR 0254 的 `native-pi:` 路径；ADR 0023 不变。Side chat 是它的
  消费方，而不是它的一部分。
- **D209 / D301。** Smart Stop 仍恢复未回答发送的草稿，按 session 的草
  稿槽位不受影响。草稿旁没有预填和注解快照后，两条路径只是要携带的
  东西更少。
- **D097 / D128 / D254 / D261。** 工作面板保留角色、尺寸、身份键控、
  邻居关闭和按 session 切换；失去 `sidechat:` 标签页类型是移除一种资
  源种类，而不是模型。Transcript 阅读所有权和有界的展开历史窗口不变。
- **动作行的其余部分。** Copy、Edit、Delete、Retry/Regenerate 和 Fork
  保持其当前行为、tooltip 和无障碍名称。
- **已创建的子 session。** 早先从 side chat fork 的 session 仍是侧栏、
  列表、搜索和存储历史中的普通 session。

## 后果

- 用户失去了在 composer 内复用较早 prompt 或回答的捷径，也失去了在主
  对话旁提附带问题的面板；重新组装两者意味着复制文本，或 fork 一个
  session 并切换过去。
- 注解启用期间写入的存储 prompt 可能把生成的 `# Response annotations:`
  标题和载荷显示为纯文本，因为每个显示界面现在原样渲染存储的字符串。
- 渲染进程卸下约 2000 行——浮层、引用恢复、注解编辑器、索引、徽标
  和整个 side-chat 生命周期——外加十一个单元测试文件及其 E2E 场景。
- 没有任何东西越过进程边界：协议 v11、schema v15、IPC 界面、权限集
  和 Rust 宿主都不受影响。

## 已考虑的替代方案

### 隐藏入口并保留代码

被拒绝：死分支仍会拥有 store 切片、i18n 键、CSS 和生成块解析器，而之
后每次对动作行或发送路径的变更都必须让它们在无人使用的情况下继续编
译。

### 保留显示层兼容降级

被拒绝：仅为美化旧 prompt 而保留 `requestTextWithoutAnnotations` 和指
令解析器，恰恰会保留本 ADR 所移除的第二种序列化，而不发送的存储
prompt 作为文本是无害的。旧 transcript 没有它也可读。

### 移除注解和 side chat，保留引用和选中浮层

被拒绝：浮层、引用恢复路径和 composer 预填是这里最大的单一渲染进程
代码块，而引用整条消息或一个句子在 OS 剪贴板和 composer 中有精确的替
代品。

### 把 side chat 变成普通子 session 标签页而不是删除

被拒绝：那就是 Fork 加上现有的 session 列表；新的 docked 标签页种类会
保留注册、投影和清理生命周期，同时增加到达同一持久子级的第四种方式。
