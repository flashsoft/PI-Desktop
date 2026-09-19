# 安全政策

PI-Desktop 是一个处于早期预览阶段、本地优先的桌面应用。我们认真对待
安全报告，并感谢负责任的披露。

## 受支持的版本

安全修复面向 [GitHub Releases 页面](https://github.com/vastsa/PI-Desktop/releases)
上发布的最新版本提供。更旧的版本和开发构建可能无法获得安全修复。

## 报告漏洞

**请不要通过公开的 GitHub issue、pull request 或 discussions 报告安全
漏洞。**

请发送私密报告至 **hhxk666@gmail.com**，邮件主题为：

```text
[PI-Desktop Security] <short description>
```

如果本仓库启用了私密漏洞报告功能，你也可以使用 GitHub 的私密安全
公告表单：

<https://github.com/vastsa/PI-Desktop/security/advisories/new>

请尽量提供以下信息：

- 对漏洞及其安全影响的清晰描述。
- 受影响的 PI-Desktop 版本、操作系统和安装方式。
- 复现步骤或最小化的概念验证（PoC）。
- 受影响的组件、功能、配置或扩展边界。
- 任何相关的日志、截图、堆栈跟踪或修复建议。

发送报告前，请移除 API key、访问令牌、密码、私有源代码、个人数据和
其他敏感信息。不要针对其他用户进行测试，不要访问不属于你的数据，
不要执行破坏性操作。PI-Desktop 目前没有运营漏洞赏金计划。

## 响应与披露

我们的目标是在 7 个自然日内确认收到报告，并在 14 个自然日内给出
初步评估。在适当的时候，我们会就分流、修复和发布计划与报告者保持
沟通。

在漏洞公开之前，请给予我们合理的时间来调查并发布修复。我们会尽
可能与报告者协调披露日期，并且只在获得许可的情况下在发布说明中
署名致谢。

## 范围

当报告影响 PI-Desktop 应用本身、官方发布产物、Electron 主进程或
preload 边界、Rust host core、agent 运行时，或凭据、权限、本地文件、
插件、MCP 服务器、IPC/RPC 消息的处理时，通常属于范围内。

仅影响第三方 Provider、模型服务、操作系统、依赖或用户自行安装的
扩展的问题，也应同时报告给对应的维护者。如果 PI-Desktop 应用引入了
可被利用的集成、权限、沙箱或凭据处理缺陷，这些问题仍属于
PI-Desktop 的范围。
