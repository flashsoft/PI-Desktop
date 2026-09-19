# ADR 0039: 激活插件 skills 并以第一方 devkit 发布插件创作能力

- 状态: 已接受
- 日期: 2026-07-31
- 相关: [Plugin developer experience](../spec/07-plugins/10-plugin-devex.md)、
  [Plugin permissions matrix](../spec/07-plugins/13-plugin-permissions-matrix.md)、
  [ADR 0008](0008-plugin-runtime-isolation-target.md)、
  [ADR 0037](0037-project-instruction-chain.md)、
  [ADR 0040](0040-plugin-resident-services-and-message-bus.md)

## 背景

`contributes.skills` 从 R1 起就是 manifest v1 的一部分：
`validateManifest` 接受它，`examples/plugins/hello` 也发布了一个
skill 文件。但没有任何东西读取它。声明一个 skill 没有任何可观察的
效果，因此这个贡献点是文档，而不是特性。

创作路径在另一个方向上也不完整。`.piplug` 包可以被安装却无法被
生产：host-core 拥有 `install_from_package`，而仓库中没有任何东西能
写出它接受的仅限商店的 zip。没有模板，没有安装前的 manifest 校验，
而且对开发插件的每一次源码编辑都需要通过原生对话框重新选择其文件夹。

这两个缺口是同一个缺口：PI-Desktop 要求用户编写插件，却没有给他们
闭环——脚手架、运行、检查、打包。

## 决策

1. **Skills 作为一个权限门控的目录到达模型，模型可以从中加载。**
   `PluginRuntime` 在加载时索引每个声明的 skill 文件，仅针对被授予
   `agent.prompt.inject` 的插件，且只通过与门控 `fs` API 相同的收容
   防护。系统提示携带一个 `# Skills` 区块，每个 skill 一行——id、
   名称、适用范围——模型用 `Skill` 工具按需拉取正文，该工具由
   Electron 主进程提供服务，因为插件目录在那里。一个 skill 文档可达
   128 KiB，一个插件可教授 32 个，因为未读的文档没有成本（D174，它
   取代了本 ADR 最初的 16 KiB 全文提示注入）。
2. **提示顺序是宿主 skills，然后插件 skills，然后项目指令。** 更靠
   后的文本权重更大，因此用户自己的指令文件保有最终发言权，安装的
   插件可以细化内置指引，但绝不能反过来。
3. **运行时复用以目录摘要为键，而不是以正文为键。** 启用插件、撤销
   `agent.prompt.inject` 或重命名 skill 会改变模型读取的文本，因此
   会让空闲运行时退役，而不是复用一个过期的提示。对正文的编辑不需要
   退役：`Skill` 工具在调用时读取文件。
4. **插件创作以第一方 devkit 发布，而不是作为插件。**
   `@pi-desktop/plugin-devkit` 拥有 scaffold、check 和 pack；三个界面
   共享这同一个实现——`pi-plugin` CLI、由 Electron 主进程提供服务的
   `PluginScaffold` / `PluginCheck` / `PluginPack` agent 工具，以及
   插件页的模板操作。
5. **内置的插件开发 skill 只为插件 workspace 激活**——workspace 根
   目录有一个 `manifest.json`，或其中有一个已加载的插件目录。普通
   会话只付出三条工具描述的成本，别无其他；脚手架会写入一个
   manifest，这会在下一次提示时激活完整的 skill。
6. **热重载不得扩大权限集合。** 被监视的开发插件在保存时重载，但
   重载会先读取 manifest：超出选择文件夹时批准的集合的权限会以错误
   停止重载，并告知用户重新加载插件。授权确实跟随 manifest 向下
   调整，因此被移除的权限会停止可用。

## 后果

- Skill 文件现在是可执行界面。`agent.prompt.inject` 在权限矩阵中
  保持其高风险层级，并且是唯一的门；安装审查已经展示它。
- `check` 通过意味着安装也会通过，因为 devkit 复现了 host-core
  执行的规则（仅限商店条目、2000 个文件、50 MB、无符号链接、无
  `.git`/`node_modules`）。这些上限在 TypeScript 和 Rust 中重复存在，
  必须一起演进。
- Skill 文件在模型请求时才读取，而不是每次提示都读，因此编辑在下
  一次 `Skill` 调用时生效，不需要 skill 的会话什么也不读。目录元
  数据在加载时索引，所以重命名 skill 仍需要重载——被监视的开发
  插件在保存时会做。
- 失败的热重载让插件处于未加载但仍被监视的状态，因此下一次保存会
  恢复它。host-core 的注册表在该窗口期内仍报告 `ready`：它没有针对
  运行时侧加载失败的 RPC，因此重载通过 toast 和 `pluginChanged`
  报告自己，与插件崩溃时完全一致。
- Skill front-matter 解析位于插件 SDK（`parseSkillFrontmatter`），
  由运行时注册表、内置 skills 和 devkit 的 `check` 共享。

## 备选方案

### 把插件创作作为内置插件发布

否决。插件无法生产 `.piplug`：`HOST_API_ALLOWLIST` 中没有归档 API，
添加一个会把 zip 写入器交给每个插件。脚手架还会要求
`fs.write.workspace`——一个高风险权限——来获得应用本身就应该提供
的能力。第一方意味着始终可用，没有权限提示，也没有先有鸡还是先有
蛋的问题。

### 把插件开发 skill 注入每个会话

否决。在每个系统提示里放一段插件创作入门，对永远不会写插件的用户
来说是纯粹的浪费。三条工具描述足够完成引导，而 workspace 门会在
完整 skill 变得相关的那一刻精确地打开它。

### 与 skills 共享 32 KiB 的指令链预算

否决。Skills 来自第三方代码，而指令来自用户。共享预算会让安装的
插件挤掉项目自己的规则。

### 无论 manifest 如何都用先前授予的权限重载

否决。授权集合是针对特定 manifest 批准的。在 manifest 编辑后复用
它会让一次文件写入在权限网关背后扩大能力——而权限网关正是插件
系统存在要守住的边界。
