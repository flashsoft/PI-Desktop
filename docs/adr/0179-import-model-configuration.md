# ADR 0179: 从本地 agent 存储导入模型配置

- 状态：已接受
- 日期：2026-09-08
- 决策者：PI-Desktop 核心团队
- 相关：D007、D342、ADR 0012、
  ADR 0188、
  `04-ux/06-settings-ia.md`、`04-ux/08-component-spec.md` §18.5、
  `03-runtime/01-ipc-protocol.md`、`03-runtime/11-provider-model-system.md`

## 背景

设置 → 导入已经扫描 Claude Code、Codex、OpenCode 和 Pi 的会话存储。这些
工具同样把 provider URL、模型 id 和常见的 API 密钥保存在众所周知的文件
中。转而使用 PI-Desktop 的用户否则要在设置 → 模型中重新输入这些端点。

D007 禁止自动导入 `~/.pi`，使 PI-Desktop 拥有 `~/.pi-desktop`。这对模型
配置同样必须成立：扫描是显式动作，在"导入选中项"之前不写入任何内容。

密钥不能穿越渲染进程。会话导入已经把 `filePath` 保留在主进程的扫描
缓存中；模型导入必须以同样方式保管密钥。

来自这些工具的 OAuth/订阅授权（Codex ChatGPT 登录、Claude 订阅、
OpenCode `type: oauth`）不是 PI-Desktop 的厂商账户凭据。复制刷新令牌
会是错误的安全边界。

## 决策

1. **设置 → 导入** 增加第二张卡片"模型配置"，拥有自己的扫描 / 选择 /
   导入选中项。会话导入不变。

2. **来源**（与会话导入同一族）：
   - Claude Code：`~/.claude/settings.json` 加上 `settings.local.json`
     覆盖层（`env.ANTHROPIC_*`、`model`）
   - Codex：`~/.codex/config.toml` `[model_providers.<id>]`
   - OpenCode：`~/.config/opencode/opencode.json` `provider` map 加上
     `~/.local/share/opencode/auth.json` API 密钥
   - Pi：`~/.pi/agent/models.json`（回退 `~/.pi/models.json`）
   - CC Switch：`~/.cc-switch/cc-switch.db` `providers` 表（遗留
     `config.json`）。每行的 `settings_config` 按应用类型转换。空的官方
     种子和仅 OAuth 的行被省略。与 CC Switch 端点和凭据匹配的存活
     Claude / Codex / OpenCode / Pi 文件不会被列出两次；凭据不同的仍然
     可见。

3. **IPC**（仅 Electron，不提升宿主协议版本）：
   `pi-desktop/modelConfig/importScan` 返回公开草稿（`source`、
   `externalId`、`name`、`baseUrl`、`apiStyle`、`modelIds`、`hasSecret`）。
   `importRun` 在最新的扫描缓存中查找选中项，并调用宿主的
   `providers.create`。

4. **密钥。** 存储的 API 密钥、`env:` / `env_key` 解析结果或
   `Authorization: Bearer` 头被复制进宿主密钥存储。占位符值
   （`YOUR_API_KEY`、`${VAR}`）按缺失处理。没有密钥的 OAuth auth.json
   条目和 Codex `requires_openai_auth` 表被省略，或不带密钥导入。

5. **幂等。** 规范化基础 URL、API 风格和凭据与现有 provider 匹配的
   候选被跳过。凭据不同的保留为独立的 provider 行；凭据比较留在
   Electron 主进程，永不到达渲染进程。命名预设可以设置 `vendorKey`；
   自定义 URL 保持 `custom`。ADR 0188 修订了这条规则。

6. **默认模型。** 如果某次运行中首次成功创建之后
   `settings.defaultProviderId` 为空，该 provider 及其第一个模型成为
   全局默认。已有默认永不覆盖。

## 后果

- 从另一个本地 agent 迁移时，可以同时带来 transcript 和这些 transcript
  使用过的模型，而无需把密钥粘贴进设置。
- PI-Desktop 仍然不会静默摄取 `~/.pi`。
- 只有 ChatGPT/Claude 订阅的用户仍通过厂商账户登录；导入无法冒充该
  授权。

## 替代方案

- 首次启动时自动导入：被 D007 否决。
- 把密钥合并进同 URL 的现有 provider：会覆盖一个正常工作的行。跳过更
  安全；用户可以编辑模型页面。
- 渲染进程侧 `providers.create`、密钥放在 IPC 负载中：扫描缓存已经为
  会话存在；让密钥远离渲染进程。
