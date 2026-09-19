# scripts

仓库自动化脚本。这里的每个脚本要么由 `package.json` script 调用，要么
由 GitHub workflow 调用，要么在发布期间手动执行；“别名”列给出其余
文档引用的调用方式。

## 发布关卡

这些是阻塞发布的检查。`release.mjs` 自己运行发布文档关卡，只要任一
版本面不一致就拒绝打标签，因此 `check:release-docs` 全绿是前提条件，
而不是替代品。

| 脚本 | 别名 | 用途 |
|---|---|---|
| `release.mjs` | `node scripts/release.mjs <version> [--tag]` | 提升所有工作区版本面、提交，并可选创建 Release workflow 构建所用的 `vX.Y.Z` 标签 |
| `check-release-docs.mjs` | `pnpm check:release-docs` | 校验 changelog、其测试清单、`APP_VERSION`、工作区版本、Cargo 版本与 README 发布线一致 |
| `check-agent-policy-sync.mjs` | `pnpm check:agent-policy` | 校验 `AGENTS.md` 和 `CLAUDE.md` 拥有相同的 `Policy-Sync` 标记、交叉引用和不可协商策略锚点 |
| `check-marketplace-catalog.mjs` | `pnpm check:marketplace -- --url <url> --plugin <id>` | 插件市场目录预检；拒绝缺少 checksum、包 URL、大小或权限的版本记录，以及 `author` 不是字符串的目录 |
| `check-style-tokens.mjs` | 由桌面端 `lint` script 运行 | 使硬编码数值而不是使用设计系统 token 的渲染进程样式失败 |

## 打包

| 脚本 | 别名 | 用途 |
|---|---|---|
| `notarize-and-staple-macos-release-dmg.sh` | `scripts/notarize-and-staple-macos-release-dmg.sh [release-dir]` | 将 macOS 原生任务产出的单个 DMG 提交到 Apple 公证服务（`xcrun notarytool submit --wait`），要求 `status: Accepted`，然后装订并验证票据（`xcrun stapler staple` / `validate`）；设置了 `sign_macos` 时由 Release workflow 运行。electron-builder 只公证 `.app`，因此 DMG 需要单独提交 |
| `verify-macos-release.sh` | `scripts/verify-macos-release.sh [release-dir]` | 除非发布目录下唯一的 `PI-Desktop.app` 和 DMG 均已 Developer ID 签名、公证并装订，否则失败；由 Release workflow 在装订后运行 |
| `macos-signing-diagnostics.sh` | `scripts/macos-signing-diagnostics.sh [--require-identity]` | 在打包前打印非敏感的签名基线（系统、`codesign`、keychain identities/list/default、Xcode 公证工具、Apple 时间戳可达性）。默认仅作信息输出，因为 Developer ID 身份在打包期间从 `CSC_LINK` 导入；`--require-identity` 使缺失 Developer ID 成为致命错误 |
| `macos-bundle-inventory.mjs` | `node scripts/macos-bundle-inventory.mjs <app-or-release-dir>` | 统计签名阶段需要处理的内容：条目数、Mach-O 二进制、`.dylib`/`.node`/framework/嵌套 bundle、按目录的开销，以及最大的二进制（`signing-candidates`）。仅作信息输出；每次 macOS 打包构建后运行 |
| `macos-signing-watchdog.mjs` | `node scripts/macos-signing-watchdog.mjs [options] -- <command>` | 以心跳、阶段跟踪、停滞诊断（最后的文件、`ps` 状态、codesign 日志尾部）、逐文件 codesign 计时和硬超时（失败而不是挂起）运行长时间静默阶段（`electron-builder` 签名、`notarytool submit --wait`）；原样转发子进程输出和退出码，并对 `CSC_KEY_PASSWORD`/`APPLE_APP_SPECIFIC_PASSWORD`/`CSC_LINK` 的值以及 `--password` 参数做脱敏 |
| `macos-codesign-shim.sh` | 由 `macos-signing-watchdog.mjs` 使用 | PATH shim，为每次 `codesign` 调用记录时间戳，然后执行真正的 `codesign`；除非设置了 `PI_CODESIGN_LOG`，否则不生效 |
| `export-linux-asar.mjs` | `node scripts/export-linux-asar.mjs` | 将 Linux `linux-unpacked/resources/app.asar` 复制为带版本号的发布资产，供系统 Electron 重新打包使用 |
| `check-linux-host-glibc.mjs` | `node scripts/check-linux-host-glibc.mjs [bin]` | 使所需 glibc 高于 2.35 的 Linux host-core 二进制失败 |
| `make-icon.py` | `python3 scripts/make-icon.py` | 从规范 PNG 派生打包 PNG、macOS 托盘模板和 iconset/ICNS |
| `publish-screenshots.py` | `python3 scripts/publish-screenshots.py` | 发布文档截图 |

## 开发

| 脚本 | 别名 | 用途 |
|---|---|---|
| `dev-electron.mjs` | `pnpm dev`，经由 `predev` | 针对 dev server 启动 Electron。在 macOS 上，它会构建并复用 `.cache/electron-dev/` 下带指纹的品牌化宿主 bundle |

## 端到端

不要在 Agent 会话中运行这些脚本，也不要手动触发远端任务，除非请求
明确要求（见 `AGENTS.md`）。它们覆盖的场景定义在
[E2E 测试计划](../docs/spec/06-delivery/04-e2e-test-plan.md)中。

| 脚本 | 别名 | 用途 |
|---|---|---|
| `e2e-smoke.mjs` | `pnpm test:e2e` | 针对 host-core 的协议级 E2E，外加可选的实时模型 |
| `e2e-plan.mjs` | `pnpm test:e2e:plan` | Plan 状态、checkpoint 产物与审批流转 |
| `e2e-plan-ui.mjs` | `pnpm test:e2e:plan-ui` | 通过渲染后的 UI 完成 Plan 审批 |
| `e2e-electron-boot.mjs` | `pnpm test:e2e:boot` | Electron 启动探针 |
| `e2e-supervision.mjs` | `pnpm test:e2e:supervision` | 进程监督与重启行为 |
| `e2e-subagents.mjs` | `pnpm test:e2e:subagents` | 先经 RPC 走 Subagent 注册表，再经真实加载器（D202） |
| `e2e-agent-live.mjs` | `node scripts/e2e-agent-live.mjs` | 通过 agent-runtime + host-core 的实时流式对话。需要 `PI_DESKTOP_TEST_API_KEY`、`PI_DESKTOP_TEST_BASE_URL` 和 `PI_DESKTOP_TEST_MODEL`（无默认值），因此没有 `pnpm` 别名 |

## 持续集成

`.github/workflows/ci.yml` 在推送到 `main`、pull request 和手动触发时
运行两个任务；当改动只触及 `docs/**` 或 `**/*.md` 时两个任务都跳过：

- **JS 构建 / typecheck / lint / test** — `pnpm install --frozen-lockfile`、
  `pnpm build:js`、`pnpm --filter @pi-desktop/desktop typecheck`、`pnpm lint`、
  `pnpm -r --if-present test`
- **Rust host-core 测试** — `cargo test -p host-core --locked`

`.github/workflows/docs-check.yml` 覆盖 `ci.yml` 忽略的路径：当
`docs/**`、README、共享 changelog 源文件或检查脚本发生变化时，运行
`pnpm docs:check`（文档语言对检查）。`check:release-docs` 刻意不在
CI 中，因为它按设计会在 rc 版本上失败。

`.github/workflows/release.yml` 基于 `v*.*.*` 标签构建。`verify` 任务
首先重复 `ci.yml` 的检查（推送标签不会触发 `ci.yml`），构建矩阵等待
它完成。随后每个平台 runner 在打包前先对照
`apps/desktop/package.json` 校验标签，再运行原生的 `dist:mac`、
`dist:win` 或 `dist:linux` 命令。Linux 任务使用 Ubuntu 22.04，使
host-core 保持在 glibc 2.35，然后
`scripts/check-linux-host-glibc.mjs` 拒绝需要更新 glibc 的二进制。
Linux runner 还会把 `linux-unpacked` 中确切的 app.asar 导出为带版本号
的发布资产；macOS 矩阵覆盖 arm64 和 Intel x64，publish 任务组装
GitHub Release。标签构建会对 macOS 产物做 Developer ID 签名、公证和
装订；`workflow_dispatch` 只有在构建未签名调试产物时才可以设置
`sign_macos: false`。详见[发布操作手册](../docs/spec/06-delivery/06-release-runbook.md)。
