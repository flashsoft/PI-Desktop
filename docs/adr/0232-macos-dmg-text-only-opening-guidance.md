# ADR 0232: 保持 macOS DMG 打开指引为纯文本

- Status: Accepted
- Date: 2026-09-12
- Deciders: PI-Desktop release maintainers
- Amends: D371 / [ADR 0204](0204-unsigned-macos-first-launch-helper.md)
- Related: [E2E-196b](../spec/06-delivery/04-e2e-test-plan.md)

## Context

D371 让未签名 macOS 助手在每个发行包中可见，包括 DMG。DMG 的首要动
作是正常的“应用拖到 Applications”安装，而回退方案只在可信的未签名
应用无法打开时才需要。DMG 应当让该回退可被发现，而不在正常安装动作
旁边展示一个可执行命令项。

## Decision

1. macOS DMG 只包含应用、Applications 链接和打开帮助说明。该说明在
   Finder 中显示为 `If app won't open, read this.txt`，可执行的
   `PI-Desktop-macOS-open.command` 不包含、也不暴露在 DMG 内容中。
2. macOS ZIP 包在其根目录保留 `PI-Desktop-macOS-opening-help.txt` 和
   可执行的 `PI-Desktop-macOS-open.command` 两者。助手保持 D371 的固
   定路径、bundle-id、仅 quarantine、不用 `sudo` 的边界。
3. 共享的打开说明以窄范围的终端回退
   `xattr -r -d com.apple.quarantine /Applications/PI-Desktop.app` 开
   头，将其限定于可信的未签名构建，并声明已签名并公证的构建不需要
   该回退。

## Consequences

- DMG 呈现一个聚焦的双图标安装行和一个命名清晰的回退说明。
- ZIP 用户在把应用移动到受支持的 Applications 目录之后保留一键助
  手。
- 遇到未签名启动失败的 DMG 用户必须使用文档化的终端回退；这不会扩
  大 quarantine 清除的范围。

## Verification

`apps/desktop/test/packaging-footprint.test.mjs` 断言 DMG 内容、中文
Finder 标签、该列表中不存在命令助手，以及保留的 ZIP 助手资产。
E2E-196b 覆盖 macOS 上的原生 DMG 和 ZIP 归档检查。
