# ADR 0020: Configuration provider 工作室

- 状态: 已接受
- 日期: 2026-07-26

## 背景

Agent/Configuration 标签页把默认值和 providers 以堆叠的设置行和
一个密集的常驻表单来承载。这种布局让就绪状态难以扫视，把默认
provider 埋了起来，并让多 provider 管理感觉像一个原始的 CRUD
表单，而不是现代化的桌面控制界面。

紧凑设置目录已经把 Providers 保留在 Agent/Configuration 内，没有
独立的侧栏目标页。信息架构保持不变；只需要改进该区块的呈现和
交互密度。

## 决策

Settings → Agent/Configuration 呈现为 **provider 工作室**：

1. 一张紧凑的 Defaults 卡片，用于默认 provider/模型对
2. 厂商账号区块，每个 OAuth 账号一行，包含编辑、测试连接和
   移除操作
3. 模态的 OpenAI 兼容 provider 添加/编辑编辑器
4. 基于卡片的 provider 管理，带密钥徽章、thinking 预设、测试
   连接、设为默认和删除

密钥保存后保持只写。不引入新的设置侧栏目标页。

## 后果

- 有多个 provider 和账号时，Configuration 更容易扫视
- 页面保持单一的视觉层级，没有独立的摘要 hero
- 空态和已填充状态都有清晰的下一步操作
- Spec、e2e 和 i18n 描述工作室式呈现
- 未来的厂商预设可以作为编辑器入口落地，无需改变侧栏 IA

## 备选方案

### 保留密集的堆叠表单

否决，因为它只为首次录入优化，一旦存在多个 provider 就会退化。

### 把 Providers 拆回独立的侧栏目标页

否决，因为紧凑目录是有意把 Providers 合并进 Agent/Configuration
的；这次重新设计是改进现有区块，而不是重新扩大导航宽度。

## 参考

- `docs/spec/04-ux/06-settings-ia.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/08-meta/decisions-log.md` (D107)
- `docs/adr/0013-compact-settings-directory.md`
