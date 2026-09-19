# ADR 0051: 把宿主 RPC stdio 与 Tokio 阻塞池隔离

- 状态： 已接受
- 日期： 2026-08-04

## 背景

宿主已经为 RPC 任务、工具类别、shell 进程和排队工作设界。但并发的 Bash 突
发仍可能以 `Resource temporarily unavailable (os error 35)` 结束宿主。
Electron 正确地把该子进程退出映射为 `HOST_UNAVAILABLE`，但该映射对会话隐藏
了进程级失败。

剩余的控制路径风险是 host-core 对 `tokio::io::stdin()` 和
`tokio::io::stdout()` 的使用。Tokio 通过其阻塞池实现这些适配器。当 OS 拒绝
再创建一个 worker 线程时，非强制的阻塞 spawn 路径会 panic，而不是返回普通的
I/O 错误。宿主随后在工具请求仍在途时退出。Unix 登录 shell PATH 探测存在同
一问题的第二个版本，因为普通的 `std::thread::spawn` 在 OS 无法创建线程时也
会 panic。

## 决策

1. host-core 的 NDJSON stdin 读取器运行在一个用 `std::thread::Builder` 创
   建的具名线程上。它的 stdout 写入器运行在第二个具名线程上。异步 RPC 调
   度器通过 channel 与这些线程通信；请求与工具任务从不调用 Tokio stdio 适
   配器。
2. 控制线程以短促的有界延迟重试 `EINTR` 与瞬时的 `EAGAIN`/`EWOULDBLOCK`
   （`errno` 11 或 35）。读取器保留部分输入直到完整一行到达，写入器跟踪部
   分写入，使重试不会重复字节。
3. 创建控制线程失败作为宿主启动错误返回。关闭或不可恢复的管道结束正常的
   宿主生命周期，并对 Electron 的世代感知监督保持可见；它绝不会被转换为
   未处理的 Rust 线程创建 panic。
4. 登录 shell PATH 探测也使用 `thread::Builder`；如果该可选辅助器无法启
   动，Bash 回退到继承的宿主 PATH。现有 RPC 与工具准入限制不变。

## 后果

- 暂时的 OS 线程压力不再到达 Tokio 的"无 worker 即 panic"stdio 路径，移除
  了 `HOST_UNAVAILABLE` 背后已观测到的宿主退出原因。
- 宿主拥有两个长生命周期的控制线程，而不是为每次 stdio 操作创建一个阻塞
  池 worker。
- NDJSON 分帧、响应排序、请求并发与过载代码保持不变。
- 真正不可用的 stdin/stdout 管道仍会结束宿主，并由现有的 Electron 重启/致
  命降级策略处理。

## 备选方案

### 提高 Tokio 阻塞池上限

已拒绝。它会增加争夺同一已耗尽 OS 资源的线程数量，并保留线程创建即
panic 的路径。

### 保留 Tokio stdio 并捕获 panic

已拒绝。围绕异步运行时捕获 panic 会很脆弱，也无法让部分 NDJSON 写入或关
闭顺序显式化。

### 改为移除并发限制

已拒绝。准入限制对工具与子进程仍是必要的；它们解决不了控制管道对动态阻
塞池 worker 的独立依赖。

## 参考

- `crates/host-core/src/rpc/mod.rs`
- `crates/host-core/src/tools/shell.rs`
- `docs/spec/03-runtime/05-host-core-rust.md`
- `docs/spec/03-runtime/06-host-rpc-protocol.md`
- `docs/spec/03-runtime/07-process-model.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- 决定 D187
