# ADR 0244：为导入的扩展界定依赖安装边界

- Status: Accepted
- Date: 2026-09-14
- Decision: 导入的 pi 扩展依赖使用仅 registry、无生命周期的 npm 边界
- Related: ADR 0214, ADR 0215, `07-plugins/16-trusted-extensions.md` §3.2

## 背景

显式的 `Plugins → Import pi extension` 流程复制本地 pi 包，并可能在首次
sidecar 加载之前安装其声明的依赖。普通的 `npm install` 会继承用户配置，
并可能解析本地路径、git 仓库、私有 registry、代理或 HTTP tarball。仅靠
`--ignore-scripts` 不能提供足够的边界，而打包的 PI-Desktop 构建并不随附
独立的 Node/npm 可执行文件。

## 决策

1. 导入器校验 `dependencies`、`optionalDependencies`、`devDependencies`
   和 `peerDependencies` 中仅 registry 的规格说明，以及递归的
   `overrides`。非法值在 npm 启动之前就失败。
2. npm lockfile 仅在包位置、嵌套依赖规格和每个 `resolved` URL 都是
   registry 安全时才被接受。不支持的 lockfile 格式会被移除；不安全的
   lockfile 不会被复用。
3. 真实的 npm 以最小环境运行：用户/全局配置文件被隔离，registry 固定为
   `https://registry.npmjs.org/`，git 解析被禁用，生命周期
   脚本/audit/fund/更新通知被禁用，npm 使用每次导入独立、完成后移除的
   缓存。
4. 真实的 npm 流量通过一个 loopback 代理，只允许 80/443 端口上的
   `registry.npmjs.org`。这阻止了非 registry 的传递性 HTTP(S) tarball
   和重定向。git 来源被校验或被禁用的 git 解析器拒绝。
5. 依赖解析和安装是分开的有界命令：`npm install --package-lock-only`
   校验完整解析的 lockfile，然后 `npm ci` 安装它。失败会移除部分
   `node_modules`、缓存和生成的 lockfile，同时尽可能保留安全的源
   lockfile。
6. 导入的副本省略凭据文件和仓库元数据，原子地创建目标目录，并从最终
   唯一的目录名派生插件 id。缺少系统 npm 时报告明确的警告；导入保持
   非阻塞，但其依赖不会加载。

## 后果

- 私有 registry、私有依赖 URL、git 依赖、本地路径、npm 别名和生命周期
  构建依赖被此导入路径有意地不支持。
- 显式导入流程在存在依赖时，仍需要用户信任的本地扩展和 `PATH` 上的
  系统 npm。
- 主进程拥有代理和子进程生命周期；依赖安装保持在渲染进程和 sidecar
  之外。
- 依赖安装和完整的 picker/provider 旅程仍是分开的 E2E 验证面；确定性
  的边界和清理测试覆盖安全契约。
