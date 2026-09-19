# ADR 0145: 发布原生 macOS Intel 产物

- Status: Accepted (amended by D353, ADR 0191, D450 / ADR 0289)
- Date: 2026-09-01
- Deciders: PI-Desktop core
- Related: D126, D285, D353, D354, D450, ADR 0022, ADR 0191, ADR 0289, E2E-092

## 背景

tag 发布工作流此前只发布 Apple Silicon macOS 产物。electron-builder
配置还把两个 macOS target 都锁定为 `arm64`，因此不修改共享的包配置
就无法选择 Intel 构建。Rust 宿主 sidecar 从原生 `target/release`
输出打包，这使得交叉编译的 Electron 包不安全，除非 sidecar 架构被
独立管理和验证。

## 决策

1. 发布矩阵发布两条原生 macOS 通道：`macos-15` 对应 arm64，
   `macos-15-intel` 对应 x64。工作流在准备打包输入之前验证
   `uname -m`。
2. 静态的 macOS electron-builder target 保持为 DMG 和 ZIP，不固定
   `arch`。工作流向 electron-builder 传递显式匹配的 `--arm64` 或
   `--x64` 标志。
3. 每个 macOS runner 在本地构建 `pi-desktop-host-core` 并打包同一个
   原生输出。本地签名发布脚本默认使用宿主架构，并拒绝与之不匹配的
   `MAC_ARCH` 覆盖。
4. 每个 macOS job 在上传前重命名其生成的 `latest-mac.yml`。发布 job
   校验两个 feed，合并它们的文件，并在两种架构的安装包旁发布一份
   合并的 `latest-mac.yml`。
5. D353 最初给 Intel x64 job 指定了目标专属的产物命名模式，发布
   `PI-Desktop-<version>-Intel.dmg` 和
   `PI-Desktop-<version>-Intel-mac.zip`，而 arm64 保留通用名称。
   ADR 0191 取代了该后缀约定：两条通道现在都使用其标准架构标签
   `-arm64` 和 `-x64`，更新器 URL 和校验和从这些最终名称生成。
6. macOS 应用内更新投递由 D450 / ADR 0289 单独限定。本决策只改变
   发布产物覆盖和原生打包；不改变更新器归属。

## 后果

- Intel Mac 用户从每次 tag 发布获得原生 DMG 和 ZIP 产物。
- Rust 宿主和 Electron 可执行文件在两条 macOS 通道上具有确定性且
  匹配的架构。
- 发布需要一步元数据合并，因为 electron-builder 为每种架构产出一份
  macOS 更新器 feed。
- 每个 macOS 公开下载都携带显式的标准 `arm64` 或 `x64` 标记，因此
  两种架构都不依赖只有版本号的通用名称。
- Intel 包体积和原生启动资格必须与既有 arm64 基线分开记录。
- 开发者无法使用本地签名通道交叉构建另一种 macOS 架构，除非先切换
  到匹配的原生 runner。

## 考虑过的替代方案

- 保持 macOS 仅 arm64：否决，因为 Intel 用户仍然无法安装原生发布，
  且未达到所要求的平台覆盖。
- 在 Apple Silicon runner 上构建 Intel 包：否决，因为 Rust sidecar
  由宿主的原生 release target 产出，可能与 Electron 包不匹配。
- 永久发布独立的更新器 feed：否决，因为当前的 macOS 投递模式是
  通知加链接，并且当签名更新通道可用时，GitHub Release 应暴露一份
  macOS feed。

## 修订 (D450 / ADR 0289)

合并的 `latest-mac.yml` 现在驱动应用内 macOS 更新。本 ADR 中的架构
覆盖和原生打包不变。
