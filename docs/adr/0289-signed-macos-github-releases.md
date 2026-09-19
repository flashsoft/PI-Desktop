# ADR 0289: 签名的 macOS GitHub Release 与应用内更新投递

- 状态：已接受
- 日期：2026-09-18
- 决策者：PI-Desktop 核心
- 决策：D450
- 修订：ADR 0022、ADR 0145、ADR 0191、ADR 0204、D078
- 相关：D120、D126、D164、D364、ADR 0197、ADR 0232、ADR 0257、ADR 0278、E2E-196a、E2E-196c、E2E-067A

## 背景

官方 GitHub 标签发布已经产出原生 macOS arm64 和 Intel x64 的 DMG/ZIP 产物，
合并 `latest-mac.yml`，并附带 `electron-updater`。默认 CI 通道仍然禁用身份
发现、跳过公证，并让打包的 macOS 保持"通知加链接"的投递方式，因为未签名
产物无法提供合格的应用内升级。没有证书的本地打包必须保持可行（D078）。
贡献者不得提交证书材料。

团队 `DUV63RKYTW` 的 Developer ID Application 证书现在可用于官方
`vastsa/PI-Desktop` 发布通道。

## 决策

1. 每个 GitHub 标签发布（`vX.Y.Z`）通过 electron-builder 26 对应用做
   Developer ID 签名，并用 `xcrun notarytool` 公证
   （`-c.mac.notarize=true`）。因为 electron-builder 只公证应用本体，最终
   DMG 单独提交（`xcrun notarytool submit --wait`），且必须返回
   `status: Accepted` 才能运行 `xcrun stapler staple`；随后该次运行校验
   应用为 `Notarized Developer ID` 且两张 stapler 票据齐全，然后才上传。
   stapler 重试有界，且只允许在 Apple 接受之后进行。缺失签名或公证密钥
   使任务失败；未签名的 macOS 产物不得从标签发布。
2. 签名证书是 `Developer ID Application: XingYu Liu (DUV63RKYTW)`；Apple
   团队 id 为 `DUV63RKYTW`。CI 用 `CSC_NAME=XingYu Liu (DUV63RKYTW)` 钉住
   它。名称必须是裸 common name：electron-builder 26 拒绝保留
   `Developer ID Application:` 前缀的身份，而校验步骤在比较 `codesign`
   授权时会重新加上该前缀。
3. 证书材料留在 GitHub Actions secrets 中：`CSC_LINK`（p12，文件路径或
   base64）、`CSC_KEY_PASSWORD`、`APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`
   和 `APPLE_TEAM_ID`。这组内容一律不提交、不回显、不写入 electron-builder
   配置。
4. 未配置身份时，本地 `pnpm dist:mac` / `pnpm package` 保持未签名。
   `scripts/release-macos.sh` 仍是本地签名通道。`workflow_dispatch` 只允许
   为产出未签名调试产物而设置 `sign_macos: false`；该路径不得用于
   GitHub Release 标签。
5. 打包的 macOS 使用现有的应用内 `electron-updater` 通道（ZIP + 合并的
   `latest-mac.yml` + `quitAndInstall`），与 Windows NSIS 和 Linux AppImage
   相同。Linux deb/rpm 和 Windows portable 保持"通知加链接"。渲染进程
   IPC、feed 归属、`allowPrerelease = false` 和自动检查时机不变。
6. 不重新引入 `afterPack` / `afterSign` adhoc codesign（ADR 0278）。
   electron-builder 的 Developer ID 流程会签署应用、helper 和
   `pi-desktop-host-core` sidecar。
7. 未签名首次启动提示和 ZIP helper 保留给受信任的本地或调试未签名构建。
   官方 GitHub Release DMG 已签名并公证，不得声称相反情况。
8. Hardened runtime 保持开启。授权保持最小必需集合：V8 JIT、未签名可执行
   内存、禁用 library-validation（Electron helper 和插件加载的原生扩展），
   以及供现有插件采集权限（ADR 0257）使用的麦克风输入，并在 Info.plist 中
   带 `NSMicrophoneUsageDescription`。

## 后果

- 下载带标签 DMG 的用户应当能打开 PI-Desktop 而不遇到 Gatekeeper"身份
  不明的开发者"或隔离损坏警告。
- 打包的 macOS 安装可以检查 GitHub Release、下载对应架构的 ZIP，并重启
  进入新版本。现有的未签名安装可能仍需要先手动安装一次签名 DMG，应用内
  更新才能成功。
- Windows 和 Linux 打包、产物名称和更新模式不变。
- 运维必须在下一个标签之前创建这五个 Actions secrets。

## 考虑过的替代方案

- 保持未签名标签产物、签名可选：被拒绝；这会让生产用户留在 Gatekeeper
  警告路径上。
- 在 `apps/desktop/package.json` 中硬编码身份：被拒绝；没有证书的本地打包
  必须继续工作（D078）。
- Apple API key（`APPLE_API_KEY`）代替 Apple ID + 应用专用密码：暂缓；
  现有的 electron-builder 26 Apple ID 路径已经接好。
- 单独的 macOS 更新器实现：被拒绝；复用 `electron-updater`。
