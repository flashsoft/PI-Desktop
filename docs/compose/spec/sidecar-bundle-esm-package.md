---
feature: sidecar-bundle-esm-package
status: delivered
updated: 2026-09-17
branch: fix/sidecar-bundle-esm-package
commits: 8d826433868f6bcc992c29bae2f799cc6de1e069..7d6890ebc7816675c31f707460efcf0601310e40
---

# Sidecar Bundle ESM package.json

## 报告

**构建了什么** — 打包安装通过 electron-builder `extraResources` 把
`packages/agent-runtime/dist-bundle` 复制到 `resources/agent-runtime`。
该目录此前只包含 esbuild ESM 的 `sidecar.js`，因此 Node 把入口当作
CommonJS，agent 运行时在启动时死于
`SyntaxError: Cannot use import statement outside a module`
（issue #507）。现在 `bundle` script 在 esbuild 之后链式写入
`dist-bundle/package.json`（`{"type":"module"}`）。桌面打包和
sidecar spawn 路径不变。回归测试锁定了 extraResources 目录复制映射
和 bundle 写入步骤契约（包括在临时目录中真实执行写入命令）。

**验证** —
- `pnpm -C packages/shared build` — PASS
- `pnpm -C packages/agent-runtime bundle` — PASS；`dist-bundle/{sidecar.js,package.json}`，带 `"type":"module"`
- 在 `apps/desktop` 运行 `node --test test/agent-runtime-bundle-package.test.mjs test/packaging-footprint.test.mjs` — PASS 13/13
- 对 `8d826433..7d6890eb` 的独立评审 — 无关键发现

**过程日志** —
- issue #507 的「VPN」说法不被日志支持：模型发现返回 HTTP 401
  （鉴权），而 agent 路径失败在 sidecar ESM 打包。范围保持在打包
  缺陷上。
- 全新 worktree 需要先 `pnpm -C packages/shared build` 再执行
  `agent-runtime` bundle；冷 esbuild 会在写入步骤运行之前因缺少
  shared 的 `dist/` 导出而失败。
- 单元测试刻意跳过完整 esbuild（shared 重建 + 数秒 CPU）；契约 +
  写入步骤执行覆盖了打包不变量，完整 bundle 另行带外验证。
- 桌面单元测试运行器是 `node --test test/*.test.mjs`——
  `pnpm --filter @pi-desktop/desktop test -- <file>` 无法隔离单个文件。

## [S1] 问题

Issue #507（v0.14.8 Windows 打包安装）显示 agent sidecar 在启动时
崩溃：

```text
SyntaxError: Cannot use import statement outside a module
  at .../resources/agent-runtime/sidecar.js:1
```

`resources/agent-runtime/sidecar.js` 是通过 electron-builder
`extraResources` 从 `packages/agent-runtime/dist-bundle` 复制的
esbuild ESM bundle。`dist-bundle` 只包含 `sidecar.js`。Node 的最近
`package.json` 查找找不到 `"type": "module"`，因此 `.js` 入口被当作
CommonJS 加载，ESM `import` 语句失败。开发环境不受影响，因为仓库
包自身声明了 `"type": "module"`。

这与 VPN 无关，也与同一份报告中的另一个
`model list request failed (401)` 鉴权错误无关。

## [S2] 设计

1. `packages/agent-runtime/package.json` 中的 `bundle` script 必须在
   esbuild 之后写入 `dist-bundle/package.json`，至少包含
   `{"type":"module"}`，使 electron-builder 把它与 `sidecar.js`
   一起发布。
2. 不改变 `apps/desktop` 的 `extraResources` 映射：整个
   `dist-bundle` 目录已被复制到 `agent-runtime`。
3. 不改变 `agent-sidecar.ts` 的 spawn 路径或入口文件名。
4. 回归覆盖必须断言打包契约：
   - bundle 成功后，`dist-bundle/package.json` 存在且设置
     `"type": "module"`；
   - 桌面 `extraResources` 仍从
     `../../packages/agent-runtime/dist-bundle` 获取 `agent-runtime`
     （从而新文件被发布）。

## [S3] 范围之外

- 模型发现的 HTTP 401 / API-key UX（用户配置；不是这个 bug）。
- Issue #506 的插件 ESM/CJS main 生成。
- 把入口改名为 `sidecar.mjs` 或把 bundle 切换为 CJS。
- 代理 / VPN 传输行为。

## 任务

- [x] T1：在 agent-runtime bundle script 中输出带 `"type":"module"` 的 `dist-bundle/package.json` — 验收：`pnpm -C packages/agent-runtime bundle` 产出 `dist-bundle/sidecar.js` 和带 `"type":"module"` 的 `dist-bundle/package.json`（覆盖：S2）
- [x] T2：为 ESM package.json 契约添加打包回归测试 — 验收：没有 T1 时测试失败，有了 T1 时通过；同时覆盖 bundle 输出和桌面 extraResources 来源路径（覆盖：S2；依赖：T1）
