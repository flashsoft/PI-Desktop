# ADR 0011: 冻结宿主 RPC、存储所有权和模式默认值

- 状态: 已接受；模式配置条款部分被 ADR 0053 取代
- 日期: 2026-07-25

## 背景

基线 0.3.0 之后，实现仍依赖于若干高影响的默认值：

- Electron ↔ Rust 传输方式
- SQLite 所有权
- 默认交互模式
- 原受限配置档的工具划分（已被 ADR 0053 取代）
- 权限超时行为

## 决策

为实现冻结以下默认值：

1. 传输 = **Rust sidecar + stdio JSON-RPC (NDJSON)**
2. SQLite 所有权 = **仅 Rust host-core**
3. 默认模式 = **Agent**
4. 原受限配置档为只读；该模式配置条款被 ADR 0053 取代，
   ADR 0053 取代了 ADR 0052 中的历史性运行状态决策，
   并以当前的 Plan 工作流取而代之
5. 权限超时 = **120 秒后拒绝**
6. 会话级授权 = **按 toolName**
7. 首发平台 = **仅 macOS arm64**
8. TS schema = **typebox**
9. i18n = **i18next**

## 后果

### 正面
- M1/M2 可以继续推进，无需重新争论核心选择
- 进程和数据所有权清晰
- 宿主拥有的运行状态和权限策略明确

### 负面
- JSON-RPC 文本协议后续可能需要升级为二进制
- Rust 独占数据库所有权要求宿主 RPC 尽早达到成熟的覆盖度

## 相关文档

- `docs/spec/08-meta/decisions-log.md`
- `docs/spec/03-runtime/06-host-rpc-protocol.md`
- `docs/spec/03-runtime/07-process-model.md`
- `docs/spec/04-ux/03-permission-ux.md`
