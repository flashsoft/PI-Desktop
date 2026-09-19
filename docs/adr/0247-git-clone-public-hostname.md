# ADR 0247：Git clone 只接受语法上公共的主机

- Status: Accepted
- Date: 2026-09-14
- Deciders: PI-Desktop core
- Related: ADR 0243, ADR 0245, D416

## 背景

首页「Clone git project」用用户提供的远程地址运行 `git clone`
（`apps/desktop/src/lib/git-clone-url.ts`）。解析器已经拒绝 `file:` URL
和内嵌密码，因此 clone 无法读取任意本地路径或在 URL 中夹带凭据。

但它仍接受 `http://127.0.0.1/...`、`git@localhost:...`、RFC1918、
链路本地和 IPv6 loopback 字面量。这是一个与 MCP 和 Skill 市场获取器
（ADR 0243 / 0245）不同的洞：那些获取器在 Electron Main 中把 DNS 钉到
公共 HTTPS socket 上。`git clone` 使用 git 自己的 HTTP 和 SSH 栈，因此
不替换 git 就无法应用 Main 进程的 DNS 钉住。

用户发起的、通过 HTTPS 或 SSH 克隆 GitHub/GitLab 仍是产品需求。

## 决策

1. `parseGitCloneUrl` 对 URL 主机和 `git@host:path` 主机复用
   `packages/shared/src/public-network.ts` 的 `isPublicHostname`。
   Loopback、未指定、私有、CGNAT、链路本地、多播、保留、文档、ULA、
   站点本地、`.localhost`、`.local` 和 `.internal` 名称按照市场 URL
   守卫分类字面量的同样方式被拒绝。
2. 协议保持 `https`、`http`、`ssh` 和 `git`。SSH 的
   `git@github.com:org/repo.git` 和 `https://github.com/org/repo.git`
   仍然有效。`file:` 和 URL 密码仍被拒绝。
3. Git 仍自行解析 DNS 并打开 socket。本决策**不**钉住 clone 流量。
   通过公共 DNS 名称的基于主机名的 rebinding 是用户发起的 git 所接受的
   残余风险，它被记录在案，而不是从市场 HTTPS 钉住悄悄复制过来。

## 后果

- 意外或恶意的、指向 loopback/LAN IP 字面量的 clone 在 `git` 运行之前
  就在渲染进程中失败。
- 通过 DNS 名称克隆公共 git 主机仍然可行，包括 HTTP 远程。
- 通过字面量 IP 从私有 git 主机克隆的运维者必须使用应用外的 git
  remote；这是有意的便利性削减。
- 残余风险：公共主机名仍可能在 git 内部解析为私有地址。

## 已考虑的替代方案

- **把市场 DNS 钉住应用到 git clone：** 被拒绝；git 使用 SSH 和自己的
  HTTP，替换它超出范围。
- **仅 HTTPS 远程：** 被拒绝；SSH `git@host:path` 是常见的 GitHub 路径，
  并且不是 Electron Main 中的 HTTP SSRF 向量。
