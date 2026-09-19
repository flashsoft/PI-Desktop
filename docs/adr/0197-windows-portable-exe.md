# ADR 0197: 发布 Windows 免安装可执行文件

- Status: Accepted
- Date: 2026-09-09
- Deciders: PI-Desktop core
- Related: D120, D126, D364, ADR 0022, E2E-211

## Context

Windows 的 tag 发布此前只发布 NSIS 安装程序
（`PI-Desktop-Setup-<version>.exe`）。将单个可执行文件加入白名单、
或禁止安装程序的企业环境，无法在未经批准安装的情况下运行该产物。
本需求是一个免安装的 `.exe`，而不是改变数据所有权或 NSIS 应用内
更新通道。

electron-builder 的 `portable` 目标会生成用户级自解压可执行文件，
它不会写出 `latest.yml`。将 NSIS 更新器应用于 portable 运行会启动
安装程序，把免安装副本变成已安装的副本。

## Decision

1. Windows x64 发布通道同时发布 NSIS 和 portable 目标。
2. portable 产物文件名不含空格：
   `PI-Desktop-Portable-${version}.exe`。
3. portable 请求 `user` 执行级别，因此启动不需要管理员权限。
4. electron-builder 继续只为 NSIS 写出 `latest.yml`。portable 不会
   成为自动更新载荷。
5. 打包后的 portable 运行通过 `PORTABLE_EXECUTABLE_FILE` 检测，并
   使用“通知并给出链接”的交付方式。NSIS 安装保留应用内下载和
   quit-and-install 流程。
6. 用户数据、日志和密钥仍保留在现有应用数据目录中。本决策不引入
   beside-the-exe 配置文件目录。

## Consequences

- 无法运行安装程序的 Windows 用户可以从 GitHub Release 下载并启动
  单个可执行文件。
- portable 用户在应用内发现更新并打开发布页面；由用户自行替换
  portable 文件。
- NSIS 应用内更新、哈希和 feed 所有权保持不变。
- portable 进程在每次启动时仍会将应用文件解包到 Windows 临时目录
  下。白名单针对的是下载的 portable 可执行文件；如果策略同时禁止
  临时目录中的执行，则可能仍需使用 NSIS 安装。

## Alternatives considered

- 仅打包 `win-unpacked` 的 Zip：被拒绝，因为所要求的产物是免安装
  `.exe`。
- 通过 NSIS 安装程序对 portable 做应用内更新：被拒绝，因为这会安装
  应用并要求安装程序获得白名单许可。
- beside-the-exe 数据目录：被拒绝，因为这是无关的数据所有权变更；
  `PI_DESKTOP_DATA_DIR` 已经可以在需要时重新定位配置文件目录。
