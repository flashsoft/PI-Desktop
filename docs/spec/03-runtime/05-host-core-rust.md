# 05. Rust Host Core

## 1. 目的

`host-core` 是 PI-Desktop 的特权本地后端。

它**不**取代 pi。它为以下各方提供安全的宿主能力：

- Electron 外壳
- pi agent 运行时
- 插件系统

## 2. 职责

1. 工作区路径规范化、边界检查，以及经权限门控的显式外部路径
2. 内置工具执行（Read/Glob/Grep/Write/Edit/Bash）
3. 权威的持久会话模式与工具策略评估
4. 权限策略评估，包括 Plan/Goal 的 Bash 提示
5. 不可变 `.pi/plan/*.md` 与 `.pi/goal/*.md` 工件写入器、
   `plan_approvals` broker，以及启动中断栅栏
6. 可选 shell 目录、身份验证、流式输出与进程树关闭
7. 插件注册/安装/生命周期服务
8. 贡献注册记账（与 TS 侧协作）
9. 持久化适配器（会话/设置元数据、`plan_approvals` 工件与执行字段、
   持久通知收件箱，以及会话协作 ledger）
10. 秘密存储集成点
11. 敏感操作的审计日志

## 3. 非职责

- LLM provider SDK
- agent 回合图/编排
- React 渲染
- 市场 Web 前端

## 4. 建议的 crate 布局

```text
crates/host-core/
 src/
 main.rs # sidecar entry
 lib.rs
 rpc/
 tools/
 permissions/
 workspace/
 plugins/
 storage/
 notifications.rs
 secrets/
 audit/
 util/
```

## 5. RPC 传输

冻结：与 Electron main 之间使用 **stdio JSON-RPC NDJSON**
（见 `06-host-rpc-protocol.md`）。

### 5a. 控制管道资源隔离

宿主的 stdin 读取器和 stdout 写入器各自运行在一个具名的专用 OS 线程
上。它们不得使用 Tokio 的 `tokio::io::{stdin, stdout}` 适配器：那些
适配器会为每次操作获取一个阻塞池 worker，耗尽 OS 线程预算可能在
结构化错误到达 Electron 之前就让宿主 panic。专用线程会以短暂延迟重试
`EINTR` 和暂时性的 `EAGAIN`/`EWOULDBLOCK`（`errno` 11 或 35），保持
NDJSON 分帧，并且只在 EOF 或不可恢复的管道错误时停止。任一控制线程
创建失败都属于启动错误，而不是未处理的 panic。

尽力而为的 login-shell PATH 探测遵循同样的规则：探测线程创建失败返回
`None`，Bash 因而回退到宿主环境。

## 5b. RPC 表面（逻辑）

域：

- `app.*`
- `workspace.*`
- `tools.*`
- `permissions.*`
- `plugins.*`
- `session.*`（适配器层）
- `notification.*`（适配器层；持久收件箱）
- `session.collaboration.*`（宿主内部的投递 ledger 与回合绑定）
- `plans.*`（批准 broker 与恢复）
- `shell.*`（目录与默认选择）
- `settings.*`（适配器层）
- `secrets.*`
- `audit.*`

示例：

```text
tools.execute
plans.resolve
plans.pending
permissions.request
plugins.list
plugins.load_dev
workspace.set
secrets.set
notification.list
```

## 6. 安全不变量

1. 工作区工具或 `.pi/plan/*.md` 都不存在未经检查的路径逃逸；显式
   外部路径只在宿主权限评估之后才解析
2. 宿主解析持久会话模式；请求携带的模式永远不具权威性
3. Plan 和 Goal 在权限评估之前拒绝 Write/Edit/插件/未知工具
4. Plan 和 Goal 的 Bash 遵循持久权限模式，并可在 Auto 下变更
5. Plan 和 Goal 的工件字节、路径、哈希、大小和批准/执行身份由
   宿主认证
6. Plan/Goal 批准在进入 Agent 之前由宿主认证、持久且原子
7. 有效 shell ID/方言在 spawn 前检查；设置拒绝不可用/错误平台的
   ID，持久化的不可用选择只在目录选择期间回退
8. 秘密永不返回给渲染器日志
9. 插件、shell 或批准路径中的崩溃失败关闭，不授予也不重放执行
10. 会话协作由宿主认证：来源身份来自活跃的插件调用，目标权限上限
    在回合准入时重新检查，回调至多一次，重启恢复永不重放被中断的
    投递

## 7. 打包

- 每个平台一个构建目标
- 二进制随 Electron 资源一起交付
- 与 Electron/Node 之间做带版本号的协议握手

## 8. MVP 验收

1. Electron 可以启动 Rust host sidecar
2. healthcheck RPC 成功
3. 至少一条工具路径经 Rust 执行
4. 权限拒绝路径可用
5. 未被看到的 completed/failed 回合通过 `session.endTurn` 事务恰好
   创建一条持久通知；已在聚焦的当前聊天中可见的结果和 aborted 回合
   不创建
6. 持久的 Plan 或 Goal 会话无法通过冲突的请求模式授权
   Write/Edit/插件工具，且 Plan/Goal 的 Bash 遵循解析出的权限模式
7. SubmitPlan 把精确的 Markdown 字节写入新的 `.pi/plan/*.md` 工件，
   并在 `plan_approvals` 中存储持久的 path/hash/size 以及结构化
   title/question；批准仅 approve/reject，按会话/回合/版本限定作用域，
   并在 30 个绝对分钟后以 `PLAN_APPROVAL_TIMEOUT` 过期
8. 待处理/排队/运行中的 Plan 或 Goal 工作在宿主重启时被中断且不重放；
   已批准的中断让会话保持 Agent
9. shell 选择/回退、过期 ID/方言拒绝、stdout/stderr 流式、60s 超时、
   有界覆盖以及进程树中止都由宿主强制执行
10. 会话协作的投递、出处、幂等、回调结算、取消、权限上限、跳数限制
    和架构 v16 恢复都是持久的并有测试覆盖，且不改变核心 `Task` 族
