# ADR 0022: 应用更新投递

- 状态: 已接受（经 D364 / ADR 0197、D450 / ADR 0289 修订）
- 日期: 2026-07-26
- 决策者: PI-Desktop 核心团队
- 相关: D120, D126, D364, D010, D450, ADR 0021, ADR 0197, ADR 0289

## 背景

PI-Desktop 需要一条发布更新路径，它要保持渲染进程沙箱、不把 feed
配置暴露给不可信的 UI 代码，并反映各平台安装程序的实际能力。单一
的自动安装策略并不合适：未签名的 macOS 包无法提供合格的应用内升级
通道，而 Windows NSIS 和 Linux AppImage 支持 electron-updater 的
下载并安装流程。

## 决策

1. Electron 主进程独占拥有 `electron-updater`、固定的 GitHub
   Releases feed、更新轮询和安装生命周期。渲染进程 IPC 只暴露白名单
   内的检查、状态、发布链接和安装操作；调用方不能提供 feed URL。
2. 开发构建保持更新禁用。打包的 macOS、Windows NSIS 和 Linux
   AppImage 使用应用内下载和退出即安装的投递。非 AppImage 的 Linux
   （deb/rpm）和 Windows 便携构建（`PORTABLE_EXECUTABLE_FILE`）使用
   通知加链接的投递，这样 NSIS 安装程序就不会替换一个免安装的运行。
   （打包的 macOS 在 D450 / ADR 0289 使签名的应用内通道合格之前
   一直是通知加链接。）
3. 更新器始终设置 `allowPrerelease = false`。否则 electron-updater
   会把预发布安装（例如 `0.2.0-rc.6`）钉在同一个自定义通道（`rc`）
   上，永远不会提供更新的稳定版 GitHub latest release。预发布通道
   策略仍是运营后续事项，以备将来需要专用 RC feed。
4. 自动检查在启动后运行并周期性进行。自动失败保持环境化（ambient）；
   显式检查通过菜单和 Settings -> Info 暴露状态和错误。已下载的
   更新在安装或正常关机之前保持可操作。
5. Feed manifest 和制品哈希由 electron-builder 生成。客户端不携带
   任何 GitHub 凭据，并且在 feed 或包无法校验时失败关闭。
6. D126 后来解除了 D010 的仅 macOS 发布范围，发布发布矩阵产出的
   所有平台制品和更新 manifest。D450 / ADR 0289 在同一 feed 上使
   签名的 macOS 应用内通道合格。
7. 双语言的产品"新功能"文案（D164）在 `packages/shared` 中以 EN +
   zh-CN 目录维护。主进程使用产品 UI 语言为发现的版本格式化说明，
   并作为可选的 `UpdateState.releaseNotes` 附加在现有 updates 路径
   上。GitHub 自动生成的 release 正文保持仅限 web；渲染进程从不
   提供 notes URL。

## 后果

- 更新状态由进程拥有，在应用菜单、Settings 和环境横幅之间保持一致。
- 沙箱化的渲染进程无法重定向更新流量或安装任意包。
- Windows NSIS、Linux AppImage 和打包的 macOS 可以从已发布的 tag
  feed 应用内更新；Linux deb 和 Windows 便携用户从发布页面安装。
- 预发布安装通过同一个 latest feed 升级到更新的稳定版；专用 RC
  通道未启用。
- 应用内双语发布亮点随构建一起发布，跟随产品语言，无需第二个
  网络接口。
- 回滚、分阶段发布和可选的预发布通道策略仍是运营后续事项，而不是
  渲染进程能力。

## 备选方案

- 渲染进程拥有的更新器：否决，因为它违反进程和沙箱边界。
- 调用方提供的 feed URL：否决，因为它会创建任意包安装路径。
- 在所有平台强制单一投递模式：否决，因为各目标的安装程序和签名
  保证不同。

## 修订（D450 / ADR 0289）

官方 GitHub tag 的 macOS 制品经过 Developer ID 签名、公证并装订
（stapled）。因此打包的 macOS 使用与 Windows NSIS 和 Linux AppImage
相同的应用内 `electron-updater` 通道。无证书的本地未签名打包仍然
可用（D078）。
