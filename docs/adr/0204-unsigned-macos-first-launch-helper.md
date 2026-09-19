# ADR 0204: 显式的未签名 macOS 首次启动助手

- Status: Accepted (amended by D406 / ADR 0232, D450 / ADR 0289)
- Date: 2026-09-09
- Deciders: PI-Desktop core
- Related: D078, D371, D406, D450, E2E-196b, ADR 0289

## Context

本地和调试用的 macOS 打包保持未签名，以便贡献者和发布操作者无需
Developer ID 凭据即可构建。对该产物的可信下载仍可能携带 Apple 的
quarantine 属性，这可能使 Gatekeeper 报告 PI-Desktop 已损坏。现有的
指引要求用户打开终端并运行 `xattr -cr`，这比导致本次启动失败的单个
属性的范围更大。

## Decision

1. 每个 macOS 发行包都在打开帮助说明旁边包含一个可执行的
   `PI-Desktop-macOS-open.command`。DMG 将该助手放在安装手势下方一个
   可见的首次启动行中。
2. 助手只搜索 `/Applications/PI-Desktop.app` 和
   `~/Applications/PI-Desktop.app`。它会校验 bundle identifier 是否为
   `net.aiuo.pi-desktop`，且用户必须在运行它之前将应用移入这两个目录
   之一。
3. 当已验证的应用携带 `com.apple.quarantine` 时，助手递归地只移除该
   属性，然后打开 PI-Desktop。它绝不使用 `sudo`，不接受任意路径参数，
   不移除其他扩展属性，也不声称未签名应用通过了 Gatekeeper 鉴定。
4. DMG 将包标注为未签名，说明中继续声明已签名并公证的构建不需要该
   助手。
5. Developer ID 签名和公证仍然是正常 Gatekeeper 启动的发布路径；此
   助手是针对可信未签名产物的显式用户操作，而不是签名的替代品。

## Consequences

- 用户可以从 DMG 中读到文档化的未签名首次启动回退方案；ZIP 在正常
  的拖入 Applications 步骤之后保留这个“在 Finder 中双击一次”的
  助手。
- 其他扩展属性保持完整，缩小了 quarantine 规避操作的范围。
- 助手无法修复安装在两个标准 Applications 目录之外的应用；打开说明
  为 `/Applications` 提供了受支持的终端回退方案。
- 同一助手在已签名的包中无害，但在那里并不需要。

## Amendment (D406 / ADR 0232)

DMG 专属的助手放置方式被替换。DMG 现在只暴露打开帮助说明，显示为
`If app won't open, read this.txt`；可执行助手保留在 macOS ZIP 包中。
该说明是 DMG 的回退方案，不再描述一个存在于 DMG 中的助手。

## Alternatives considered

- 保留仅限终端的 `xattr -cr` 指引：被拒绝，因为它不是一键流程，而且
  清除的元数据多于所需。
- 使用 `sudo` 或指向用户选择的任意路径：被拒绝，因为这会扩大安装
  规避手段的权限和应用范围。
- 要求每个本地构建都签名：被拒绝，因为 D078 有意让本地打包在没有
  Developer ID 凭据的情况下保持可用。

## Amendment (D450 / ADR 0289)

官方 GitHub tag 发布使用 Developer ID 签名并公证。首次启动助手和打开
说明仅保留给可信的未签名本地或调试产物。官方 Release DMG 不得声称
自己未签名。
