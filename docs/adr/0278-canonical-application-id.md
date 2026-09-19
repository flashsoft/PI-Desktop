# ADR 0278: 规范应用 ID `net.aiuo.pi-desktop`

- 状态：已接受
- 日期：2026-09-17
- 决策者：PI-Desktop 打包维护者
- 修订：D141、D371、ADR 0204
- 相关：issue #524 · E2E-196b ·
  [01-product/01-product-scope](../spec/01-product/01-product-scope.md) ·
  [06-delivery/06-release-runbook](../spec/06-delivery/06-release-runbook.md)

## 背景

产品对外宣称的应用 ID 是 `com.pi-desktop.app`，但所有者域名是
`net.aiuo.pi-desktop`。默认的未签名 macOS 打包还会在 `PI-Desktop.app` 上
留下 Electron 的 adhoc 签名（`Identifier=Electron`，`Info.plist=not bound`）。
于是 `usernotificationsd` 要求私有的
`com.apple.private.usernotifications.bundle-identifiers` 授权，并拒绝了产品
bundle ID 的每一个请求（issue #524）。adhoc 签名本身不是缺陷：标识符必须
等于 `CFBundleIdentifier`。

## 决策

1. 规范应用 ID 为 **`net.aiuo.pi-desktop`**。它是 `APP_ID`、electron-builder
   的 `appId`、macOS 的 `CFBundleIdentifier`、unsigned-helper 期望的 bundle
   ID，以及 Windows 的 AppUserModelID。开发用 macOS 主机使用
   `net.aiuo.pi-desktop.dev`。
2. NSIS/AppUserModelID 遵循同一 ID。现有的 `com.pi-desktop.app` 安装在此次
   切换之后属于一个新的身份。
3. 未签名的 GitHub macOS 打包**不**重新签名外层 bundle。在 `afterPack` 中
   做 adhoc `codesign` 会失败，因为嵌套的 Electron helper 仍未签名
   （`code object is not signed at all`）。issue #524 在默认的未签名通道上
   保持开启，直到后续出现已签名或 helper 安全的打包路径。

## 后果

- 打包出的未签名 macOS 产物保留 Electron 的外层标识符。
- 签名/公证构建使用带产品 bundle ID 的 Developer ID。
- 从 `com.pi-desktop.app` 的 NSIS 安装升级的 Windows 用户会得到一个新的
  产品身份；在旧安装被移除之前，用户可能会看到一个并存的快捷方式。

## 考虑过的替代方案

- 保留 `com.pi-desktop.app` 只重新签名：被拒绝，因为所有者域名是
  `net.aiuo.pi-desktop`。
- 只改 macOS bundle ID：被拒绝，因为 D141 要求运行时和打包使用同一个 ID。
- 在 `afterPack`/`afterSign` 中做 adhoc 签名：被拒绝；嵌套 helper 尚未签名，
  打包会失败。
