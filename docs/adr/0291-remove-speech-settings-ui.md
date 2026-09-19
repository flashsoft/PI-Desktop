# ADR 0291: 移除语音设置 UI

- 状态：已接受
- 日期：2026-09-19
- 决策者：PI-Desktop 核心
- 修订：[ADR 0281](0281-host-speech-capability.md)（其 v1 产品入口）
- 相关：[04-ux/06-settings-ia.md](../spec/04-ux/06-settings-ia.md) ·
  [04-ux/08-component-spec.md](../spec/04-ux/08-component-spec.md) ·
  [03-runtime/20-speech.md](../spec/03-runtime/20-speech.md) ·
  [06-delivery/04-e2e-test-plan.md](../spec/06-delivery/04-e2e-test-plan.md)

## 背景

ADR 0281 增加了宿主语音能力：基于可选 `AppSettings.speech` 的
`transcribe` / `synthesize`、两个内置协议、高风险的
`speech.adapter.register` 插件适配器，且音频字节不进入渲染进程。它的第 5
条把 v1 产品入口定为设置 → AI 中的一张**语音**卡片，外加 Composer 的转写
和草稿朗读。

为此构建了两个渲染进程界面。Composer 工具栏在 `useComposerSpeech` 钩子之上
暴露了麦克风（转写）和朗读（speak）按钮，设置 → AI 承载了**语音**卡片。
Composer 控件已于 2026-09-18 移除（`344ef4ec2`，PR #555），而宿主服务和
面向插件的语音 API 保留。此后该卡片成为唯一的渲染进程界面：`speech/getStatus`、
`speech/transcribe` 和 `speech/synthesize` 的唯一消费者，以及
`settings.speech*` 目录表的唯一读者。为被移除控件编写的文案——
`chat.transcribe`、`chat.transcribing`、`chat.transcribeFailed`、
`chat.speak`、`chat.speaking`、`chat.speakFailed`、`chat.speakSaved`——留在
全部八个目录表中且没有调用方，而 `04-ux/08-component-spec.md` §2.5 和
ADR 0281 第 5 条中的陈述比它们描述的控件活得更久。

产品不希望在设置中放置语音配置界面。那会为一个今天唯一的客户是插件和
直接 IPC 调用方的能力，在应用外壳里放上每个角色第二个 provider 选择器，
外加 Whisper / TTS 词汇。

## 决策

1. **移除语音卡片。** 设置 → AI 不再渲染语音界面。
   `apps/desktop/src/features/settings/voice-settings.tsx` 及其在
   `features/settings/SettingsPage.tsx` 中的 `VoiceSettingsCard` 挂载被删除。
2. **移除渲染进程残留。** `lib/settings-search.ts` 中的 AI 目的地不再索引
   `settings.speechTitle`、`settings.speechTranscribe` 或
   `settings.speechSynthesize`；`.settings-row:has(.settings-speech-fields)`、
   `.settings-speech-fields` 和 `.settings-speech-lead` 规则离开
   `styles/settings.css`；十三个 `settings.speech*` 键离开全部八个随附语言
   目录表；为已撤回的 Composer 控件编写的七个无引用的
   `chat.transcribe*` / `chat.speak*` 键也一并离开。
3. **保留能力。** ADR 0281 第 1–4 条和第 6 条继续有效：`speech/getStatus`、
   `speech/transcribe`、`speech/synthesize`、`validateSpeechSettings`、内置的
   `openai_audio` / `openai_chat_audio` 协议、插件的
   `speech.adapter.register` 权限，以及 `lib/api.ts` 中的渲染进程 API 桥
   均不变。音频字节仍然从不进入渲染进程。
4. **绑定仍由调用方写入。** `AppSettings.speech` 保持其形态、校验和持久化
   语义；绑定通过宿主设置 API（`settings/set`）写入，其消费者是插件和
   IPC 调用。不运行迁移，也不丢弃任何已存储的绑定。
5. **Composer 入口保持撤回状态，并修正相关陈述。** ADR 0281 第 5 条的
   Composer 转写和草稿朗读动作保持撤回：它们描述的控件已在 `344ef4ec2`
   中移除，因此其文案被退役，`04-ux/08-component-spec.md` §2.5 不再描述
   它们。`04-ux/06-settings-ia.md` 声明语音不是设置界面。

## 后果

- 用户不能再从应用内配置转写或语音 provider。宿主能力对插件、IPC 调用方
  和已存储的绑定仍然可达，但桌面不提供创建绑定的 UI。
- 移除渲染进程唯一的语音消费者也移除了它对协议目录的使用：
  `speech/getStatus` 现在没有任何渲染进程模块调用，而 IPC 通道及其契约
  保留。
- 渲染进程卸下了卡片、其样式、其搜索关键词，以及它在八个目录表中的语言
  键；不伴随任何宿主、协议、权限或 schema 变更。
- 用户可见的语音词汇（Whisper、TTS、voices）完全不再出现在应用外壳中，
  因此聊天模型选择器是唯一的模型界面。

## 考虑过的替代方案

### 保留卡片但藏在开发者开关后面

被拒绝：隐藏的界面仍拥有样式、语言键和一个 provider 协议目录，而且会在
一个语音消费者是插件的应用里让第二个 provider 选择器继续存活。

### 连同 UI 一起移除宿主能力

被拒绝：该能力是已发布的契约，有一份 ADR、一个 IPC 接口面和一项高风险
插件权限。移除它会破坏插件适配器，并在没有迁移的情况下使已存储的
`AppSettings.speech` 绑定失效——而本次请求只要求从设置中移除界面。

### 保留卡片并发布 Composer 动作

被拒绝：Composer 控件在同一发布周期内被构建并被有意移除（`344ef4ec2`，
PR #555）。重新发布它们是一个已经被推翻的产品决定，而且本次请求是移除
设置界面，不是扩展功能。改为修正过时陈述，使任何 spec 都不再描述不存在
的控件。
