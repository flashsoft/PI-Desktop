# ADR response-annotations: 作为提示附件的响应批注
> 已被 ADR 0268 取代。

- 状态：已被 ADR 0268 取代
- 日期：2026-09-11
- 决策者：PI-Desktop 运行时与桌面 UI 维护者
- 修订：D-LOCAL-message-quotes 决策 3（针对 assistant 轮次）
- 保留：D209、D301、D097、D128
- 相关：[04-ux/08-component-spec.md](../spec/04-ux/08-component-spec.md) ·
  [04-ux/09-interaction-patterns.md](../spec/04-ux/09-interaction-patterns.md) ·
  [03-runtime/11-provider-model-system.md](../spec/03-runtime/11-provider-model-system.md) ·
  ADR message-quotes-and-side-chats · E2E-CHAT-annotation-attachments、E2E-CHAT-annotation-session-state · 修订案：2026-09-12（评论编辑器）

## 背景

ADR message-quotes-and-side-chats（D-LOCAL-message-quotes）把引用做成了一次
**草稿编辑**：摘录变成输入框中以 `> ` 为前缀的 Markdown 文本，并以
`chat.quoteSource` 归属。这简单且可见，但它把模型的话复制进了用户正在
撰写的草稿中，使"引用这一段"与"我自己写这段文字"无法区分。复用多个
片段会把摘录和指令混在同一个可编辑缓冲区中，而且一段长回答只能作为
一整块被引用。

参考实现（ChatGPT 桌面应用）用**批注**解决同一个问题。在响应中选中文本
并选择"添加到聊天"，会把一个带编号的批注附加到该响应上：被批注的片段
获得一个行内编号标记，输入框显示一个批注附件，而下一条提示在一个结构化
块中携带这些摘录：

```text
# Response annotations:
Each item contains text selected from an earlier Codex response and may include a user comment. …
<response-annotations>
[{"text":"…","annotation":"…","source":{…}}]
</response-annotations>

## My request:
…the user's own prompt…
```

用户自己的话保持为用户自己的话；摘录作为数据随提示一起传递，并带有编号，
使模型可以指向 `Annotation 1`、`Annotation 2`，依此类推。

## 决策

1. 在一个 **assistant 轮次**内选中文本并激活选区浮层的 **添加到聊天**，
   会创建一条批注，而不是编辑草稿。一条批注携带 id、锚定轮次
   （`messageId`）、摘录（Markdown，上限 2000 字符，超出以省略号结尾）、
   一个空的 `annotation` 评论字段，以及创建时间。
2. 批注是**渲染进程所有的会话状态**，按会话 id 作为 key，按捕获顺序
   排列。数组顺序就是编号：第一条批注是 `Annotation 1`。对已经附加的
   摘录重复批注是无操作，因此没有摘录会在两个编号下被发送两次。批注
   不持久化，不单独发送给 host，也不能在重启后存活。
3. 渲染：
   - 本应用**绝不装饰**回答正文。批注只在模型引用它的地方出现在模型的
     回答中，与参考实现完全一致：回答源码中的一个
     `:codex-annotation{index="N"}` 指令会变成一个小巧的强调色编号引用
     （一个 remark 处理把该 token 变成标记元素；sanitizer 在其 href 上
     保留该标记方案），其提示文本是被批注的摘录及任何评论。标记是引用，
     而不是用户选取的文本：它不参与选区、引用或复制，也绝不打断它所在
     的行。
   - 输入框在输入区上方显示一个批注附件 chip，带计数
     （`chat.annotationChip`），其提示文本按条列出 `N. excerpt`，外加一
     个丢弃全部批注的控件（`chat.clearAnnotations`）。该 chip 不是草稿
     chip：它绝不进入可编辑文本，因此 D209 的智能 Stop 和 D301 的按会话
     草稿保留不受影响。它也是模型回答之前用户自己的批注唯一可见的
     位置。
4. 在存在批注时发送提示，会按参考实现的方式组装提示：
   `# Response annotations:` 标题、说明句、按编号顺序携带
   `[{"text", "annotation", "source": {"messageId"}}]` 的
   `<response-annotations>` 块，然后是 `## My request:` 和用户的文本。
   发送会消费这些批注。可见草稿、乐观行、侧栏标题和输入框的编辑种子
   绝不包含该块；携带该块的已存提示通过 `requestTextWithoutAnnotations`
   展示，它把提示还原为请求。
5. 说明句使用参考实现自己的文本，包括它要求模型用
   `:codex-annotation{index="N"}` 引用它所回应的每一条批注；该指令正是
   决策 3 中渲染为编号引用的东西。一个自己装饰回答的应用会把标记放在
   模型从未声称回应过的位置，这也正是第一版实现不可读的原因。
6. 路由按界面保持显式：浮层的 **添加到聊天** 批注 assistant 轮次，对
   其他任何行保留 D-LOCAL-message-quotes 的草稿引用；assistant 轮次的
   操作行做批注（有选区时用选区，否则用整个回答）；用户消息的操作行和
   侧边聊天的 **添加到主聊天** 保持引用进草稿。
7. 引入的 i18n key：`chat.annotate`、`chat.annotationMarker`、
   `chat.annotationChip`、`chat.clearAnnotations`。浮层的其他操作
   （`chat.addToChat`、`chat.askInSideChat`、`chat.copy`）不变。
8. 边界：不提升 host 协议（v11），不改变存储 schema（v15），不新增
   IPC 通道，不新增权限。批注是参考契约的渲染进程侧投影；到达模型的
   提示是普通提示文本。

## 保留行为

- D-LOCAL-message-quotes 的草稿引用在它适合的模型中保留：引用**用户**
  消息，以及把侧边聊天的最新回答移入主输入框。其契约（`> ` 引用块、
  `chat.quoteSource` 归属、2000 字符上限、追加到草稿、聚焦、不发送）
  不变。
- D209 的智能 Stop 恢复发送前的草稿，D301 的按会话草稿槽不变：批注是
  草稿旁边的会话状态，因此两条路径都不需要了解它们。
- 选区浮层的几何、边界、滚动跟随行为、操作和只读投影排除不变（ADR
  message-quotes-and-side-chats 修订案）。

## 后果

- 模型把每个被批注的片段作为带编号的数据项接收，因此"回应批注 2"是
  明确的，而用户的提示保持为用户输入的原样。
- 用户可以批注一段回答中的多个片段、来自会话中的任何轮次，然后写一条
  覆盖它们的指令；输入框显示一个附件，而不是一团不断增长的引用文本。
- 批注在重启后以及携带它们的发送之后会丢失；想要持久记录的用户仍可以
  引用进草稿或复制该片段。
- 已存提示比用户输入的文本更长（该块是它的一部分），这就是为什么每个
  展示界面都先把它还原为请求。

## 已考虑的替代方案

- **继续把摘录写入草稿（D-LOCAL-message-quotes）：** 对 assistant 轮次
  被拒绝。它把模型的话混入用户自己的提示文本，而且多个引用会变成一
  段没有编号可供模型指向的长可编辑块。
- **通过 host 做批注（新 RPC 或消息字段）：** 被拒绝。提示块是普通提示
  文本，因此不需要协议、schema 或权限变更，而且批注只需要活到发送为止。
- **在回答内标记被批注的片段：** 被拒绝。它会装饰模型尚未回应的文本，
  需要被批注范围在每次重渲染后存活（React 拥有转录树），而且按摘录
  查找放置的标记在选区于词中结束时会落在词中间——第一版实现交付的正
  是那种破坏。模型自己的引用就是参考实现的标记。
- **把批注随消息存储为持久列表：** 暂被拒绝。它需要存储 schema 变更和
  一个持久的批注界面；发送范围的附件与参考行为一致。

## 修订案（2026-09-12）—— 附件打开评论编辑器

参考实现通过一个评论入口附加摘录，而不是一个静默操作：在响应中选中文本
并选择"评论"，会在选区上方打开一个紧凑编辑器，引用已就位。本修订案用
该编辑器替换决策 1 中"以空 `annotation` 字段附加"的读法和决策 2 中
静默的重复无操作；批注结构、提示块和决策 8 的每一条边界不变。

- assistant 轮次上的 **添加到聊天**，以及轮次的批注操作，会打开评论
  编辑器，而不是立即附加摘录。编辑器在多行、可选的评论上方显示摘录
  快照——即选区产生时序列化的 Markdown，在焦点移入编辑器使选区坍缩
  之前取得。**保存** 附加批注（或更新正在编辑的批注），`annotation`
  设为去除首尾空白后的评论；**取消**、IME 组合之外的 **Escape**，以及
  从背景板开始的按下都会丢弃它。把选中文本拖到背景板上不会关闭它。
  Escape 先于应用快捷键被消费；关闭时焦点恢复到触发者，若触发者已不
  存在则恢复到富文本输入框。空评论的保存仍会附加，因此"添加到聊天"
  继续作为普通引用工作。打开或保存编辑器不发送任何东西：没有提示、
  没有会话、没有转录行。
- 对已附加的摘录重复批注会重新打开**那条批注的**编辑器，并带出其存储
  的评论，而不是旧的静默无操作，因此决策 2 的"每个摘录一条批注"规则
  成立，同时评论保持可编辑。编辑保留批注的 id、位置和摘录：只有
  `annotation` 变化。
- 输入框的附件（决策 3）现在是一个可展开的披露。其计数 chip 是一个
  按钮，打开会话的批注列表：每一项显示其编号、摘录和评论，带一个
  编辑它的控件（同一个编辑器，以存储的评论作为种子）和一个只移除该项
  的控件；现有控件仍然丢弃全部（`chat.clearAnnotations`）。chip 的
  提示文本仍按条列出 `N. excerpt`，且该列表不是草稿文本。
- 编辑器属于打开它的会话：会话切换会关闭它，而不是把写了一半的评论
  带进另一个会话；批注已被发送或移除的保存不改变任何东西，也绝不
  重建它。
- 新增的 i18n key：`chat.annotationCommentTitle`、
  `chat.annotationCommentPlaceholder`、`chat.annotationEdit`、
  `chat.annotationRemove`、`chat.annotationReview`。store 操作是
  `openResponseAnnotationEditor`、`saveResponseAnnotationEditor` 和
  `closeResponseAnnotationEditor`，取代 `addResponseAnnotation`。
- 决策 8 的边界不变：不提升 host 协议，不改变存储 schema，不新增 IPC
  通道，不新增权限。评论是现有提示块中普通的 `annotation` 字段内容。

## 上游集成修订案（2026-09-14）

渲染进程保留上游 Composer 的提交/转向钩子和 store 切片。普通发送/排队
会对本会话的批注对象做快照，并在 host 确认后只消费未变化的已提交对象。
拒绝会保留它们；并发新增和评论编辑存活。内部的 `enqueuePrompt` 操作
返回 `Promise<boolean>`，使现有的输入框拒绝恢复也覆盖队列失败和意外的
host 前置异常，且不替换更新的输入。一个按会话的在途提交守卫在确认落定
之前拒绝重复提交，包括草稿到已创建会话的交接。它不阻塞其他会话或转向，
并且总是在退出时释放。不改变 host API。

上游的 Alt+Enter 和转向按钮保持纯文本：批注等待下一次普通发送。仅批注
的转向不做任何事。Shift+Enter 保持为换行，评论编辑器的 Enter/IME 语义
保持独立。队列预览和编辑种子隐藏可识别的生成块，而不改变已存/线上内容。
编辑不会重建此前已消费的附件；普通重试复用已存提示。见
E2E-CHAT-annotation-ack-and-steering。
