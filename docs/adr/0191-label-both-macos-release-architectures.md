# ADR 0191: 为两种 macOS 发布架构添加标签

- 状态：已接受（由 D450 / ADR 0289 修订）
- 日期：2026-09-09
- 决策者：PI-Desktop 核心团队
- 相关：D126、D285、D353、D354、D450、ADR 0145、ADR 0289、E2E-092

## 背景

D353 为原生 macOS x64 制品增加了显式的 `Intel` 标记，但 Apple Silicon
制品仍保留 electron-builder 的通用纯版本号命名。因此像
`PI-Desktop-0.14.4.dmg` 这样的文件仍然无法表明它包含 arm64 还是 x64
代码——当两个下载并列在同一个 GitHub Release 中时会产生歧义。

## 决策

1. 两条原生 macOS 发布通道都向 electron-builder 传入目标特定的制品
   模式。
2. arm64 通道发布 `PI-Desktop-<version>-arm64.dmg` 和
   `PI-Desktop-<version>-arm64-mac.zip`。
3. Intel x64 通道发布 `PI-Desktop-<version>-x64.dmg` 和
   `PI-Desktop-<version>-x64-mac.zip`。
4. 该约定适用于未签名和已签名的 macOS 工作流路径。生成的按架构更新
   源在发布任务合并它们之前保留这些最终的资产 URL 和校验和。
5. 本决策只改变发布资产命名。签名策略和应用内 macOS 分发记录在
   D450 / ADR 0289 中。

## 后果

- 用户仅凭文件名即可识别所需的 macOS 安装包。
- DMG 和 ZIP 名称与发布矩阵的 `arm64` 和 `x64` 值一致，而不是只给一条
  通道使用特殊的 `Intel` 标签。
- 未来版本不复用现有的通用 arm64 和 `-Intel` x64 资产名；命名变化有
  意限定在发布制品范围内。

## 已考虑的替代方案

- arm64 名称保持通用：否决，因为这会让两种架构之一仍然含糊。
- x64 用 `Intel`、arm64 用 `Apple-Silicon`：否决，因为发布矩阵和
  Electron target 使用标准架构标识符，更短且更容易与实际包内容对应。

## 修订（D450 / ADR 0289）

带架构标签的 ZIP 名称仍是应用内更新器的负载。官方 tag 制品经过签名和
公证；`-arm64` / `-x64` 约定不变。
