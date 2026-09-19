# ADR 0243：Skill 市场的公共 HTTPS 目录获取

- Status: Accepted
- Date: 2026-09-13
- Decision: D413
- Amends: ADR 0009
- Issue: #287
- PR: #290

## 背景

Settings → Skills 新增了一个 Market 视图，通过现有的 `skills.create` 写入
路径安装社区 `SKILL.md` 文档。渲染进程 CSP 只允许 localhost，因此目录
发现和文档获取在 Electron main 中运行。用户可以添加任意来源 URL。朴素
的 `net.fetch` 会跟随重定向进入 loopback 或 RFC1918 地址空间。

插件 marketplace 已经使用**固定主机允许列表**。接受用户 GitHub 仓库的
skill 市场无法复用该允许列表。MCP 市场（#285）需要同一个公共 HTTPS
分类器；在两个 `export *` 名称下重复 `isPublicHostname` 会冲突。

Host-core 的 `valid_capability_id` 接受 `[a-z0-9][a-z0-9-]{0,63}`。保留
下划线的扫描会产生被宿主重写的 id，导致 Market 的「Installed」徽标永远
匹配不上。

用户 skill 是单个 markdown 文件，上限 128 KiB。内联同级 `.md` 文件可能
在预览成功之后超过该上限。

## 决策

1. 在 `packages/shared` 中保留单一的无 I/O 分类器（`isSafePublicHttpsUrl`、
   `isPublicHostname`、`isPublicIpLiteral`）。Skill 市场将其包装为
   `isSafeSkillSourceUrl`。未来的 MCP 市场导入同一模块。
2. 主进程获取通过 `createPublicHttpsClient`：仅 HTTPS、对每个解析地址做
   DNS 分类、`redirect: "manual"` 并逐跳重新校验，且仅对非策略性失败
   重试。
3. 渲染进程绝不获取目录或文档 URL。安装仍是 `skills.create`。Host-core
   不感知市场的存在。
4. 扫描和目录 id 在到达 UI 之前被清洗为宿主的 `valid_capability_id`。
5. 预览显示组装后的正文（skill 文本加上内联的同级 markdown）。会超过
   `MAX_SKILL_BYTES` 的文档无法安装。
6. 内置目录标题为英文（ADR 0009）。

## 后果

- 用户添加的 `https://github.com/org/repo` 来源使 main 遍历 git 树并拉取
  jsDelivr 副本。边界是「公共 HTTPS + 公共解析 IP」，而不是主机允许
  列表。查找与 Chromium `net.fetch` 之间的 DNS rebinding 仍是残余风险。
- 安装 skill 仍会写入模型指令。预览就是披露；内置行上的 `verified`
  不是签名。
- MCP 市场必须导入 `public-network.ts`，而不是复制分类器。

## 替代方案

- 插件 marketplace 的主机允许列表：对用户的 GitHub 来源太窄。
- 目录安装（`~/.agents/skills/<slug>/`）：与当前的单文件用户 skill 模型
  不兼容。
- 把获取到的 IP 钉入 undici：对 rebinding 更强，但会跳过 `net.fetch`
  所遵循的 Chromium 代理栈。
