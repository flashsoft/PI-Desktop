# ADR 0281: 宿主语音能力

- 状态：已接受，待实现（经 [ADR 0291](0291-remove-speech-settings-ui.md) 修订）
- 日期：2026-09-17
- 决策者：PI-Desktop 核心
- 相关：[ADR 0257](0257-plugin-real-time-capabilities.md) ·
  [03-runtime/20-speech](../spec/03-runtime/20-speech.md)

## 背景

聊天模型、图像生成、转写和语音合成是不同的工作。`@earendil-works/pi-ai`
没有 TTS/ASR 接口面，而 Whisper / MIMO TTS 不得出现在聊天模型选择器中。
本地的 OpenAI-Audio 兼容服务器（Speaches、whisper.cpp、LocalAI）应通过现有
的 `openai_compatible` provider 工作。

## 决策

1. 宿主拥有一个独立于聊天的语音能力：`transcribe(audio) → text` 和
   `synthesize(text) → audio`。
2. 绑定存放在可选的 `AppSettings.speech` 上（不提升 schema 版本）。每个角色
   指定一个现有 provider、一个模型 id 和一个开放的协议 id。
3. 内置协议：`openai_audio`（REST `/audio/transcriptions` 和
   `/audio/speech`）和 `openai_chat_audio`（chat completions 的 `audio` 字段；
   MIMO `mimo-v2.5-tts`）。新厂商增加一个适配器，而不是新的 IPC 通道。
4. 插件可以通过 `pi.speech.registerAdapter` 在高风险权限
   `speech.adapter.register` 下注册协议。句柄留在 guest 内；HTTP 计划由宿主
   用所绑定 provider 的密钥执行，且必须停留在该 origin 上。内置协议 id 保留。
5. v1 的产品入口只有宿主 API：`speech/*` IPC 和插件适配器。不存在设置卡片，
   也不存在 Composer 的转写 / 草稿朗读控件（ADR 0291 撤回了两者）。音频字节
   从不进入渲染进程（路径进，临时文件出）。
6. 范围外：麦克风 / `pi.audio` 设备后端、Realtime、agent 的
   `transcribe`/`speak` 工具、音频作为 LLM 内容块、改动 pi-ai。

## 后果

未配置的角色以 `SPEECH_NOT_CONFIGURED` 失败。删除 provider 会使绑定以
`NOT_FOUND` 失败。插件卸载会丢弃它的协议。
