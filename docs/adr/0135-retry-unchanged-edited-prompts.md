# ADR 0135: 重试未改动的已编辑提示词

- Status: Accepted
- Date: 2026-08-31
- Deciders: PI-Desktop core
- Related: D137, D274, E2E-073, issue #23
- Amends: D137

## 背景

用户消息编辑器是一个编辑并重发的工作流，但它的主要操作标注为
Send，并把未改动的提示词视为空操作。这让一次使用原文的确认看起来
像坏掉了，尽管用户明确要求重放所选轮次。这也让该内联操作看起来像
一次普通的 Composer 新发送，而不是对既有提示词的重试。

## 决策

1. 确认一个有效的用户提示词编辑时，无论去除空白后的提示词文本是否
   与原文不同，都派发既有的 `editUserMessage` / Regenerate 路径。
2. 内联主要操作本地化为 Retry（zh-CN 为 `重试`）；进行中的标注为
   Retrying…（`重试中…`）。次要操作保持本地化为 Cancel（`取消`）。
   Escape 保留其既有的取消行为，Cmd/Ctrl+Enter 触发 Retry。
3. Retry 保留既有的附件处理、斜杠命令展开、基于身份的截断和 D109
   修订归档。不引入 IPC、存储、宿主协议或运行时契约变更。

## 后果

- 重放未改动的提示词会创建一个新的 assistant 轮次，并把被替换的
  回答尾部归档进既有的修订分页器，与该操作的重发语义一致。
- 内联标注区分了重试所选轮次、发送新的 Composer 提示词和取消编辑
  这三种操作。
- 用户仍可通过 Escape 或 Cancel 放弃编辑而不改变 transcript。

## 备选方案

### 保持未改动编辑为空操作

否决。这正是 issue #23 报告的行为，它让一次显式的重发确认看起来
毫无反应。

### 保持主要标注为 Send

否决。该操作并不追加一条新的普通提示词；它通过 Regenerate 路径
重放所选提示词。Retry 传达了这一边界。

## 参考

- `apps/desktop/src/components/ChatTranscript.tsx`
- `packages/i18n/src/locales/en/index.ts`
- `packages/i18n/src/locales/zh-CN/index.ts`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-073)
- `docs/spec/08-meta/decisions-log.md` (D274)
