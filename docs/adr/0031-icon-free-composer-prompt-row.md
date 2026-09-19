# ADR 0031: 保持 composer 提示行不含品牌图标

- 状态: 已接受
- 日期: 2026-07-28
- 相关: [01-ui-ia](../spec/04-ux/01-ui-ia.md) ·
  [07-ui-design-system](../spec/04-ux/07-ui-design-system.md) ·
  [08-component-spec](../spec/04-ux/08-component-spec.md) · 决策 D160

## 背景

D054 在空草稿旁引入了一个可见提示元素，D094 把该提示元素标准化为
thread-docked composer 中的规范 PI-Desktop logo。home composer 后来
移除了该提示元素，使两个提示行在视觉上不一致。在密集的 transcript
中，剩下的装饰性 logo 还占用水平输入空间，而不增加导航、状态或
运行时含义。

由于 D094 是冻结产品基线的一部分，移除其 docked composer 要求需要
一个显式的取代决策，尽管实现仅限于渲染进程展示。

## 决策

1. Home 和 thread-docked composer 的提示行不渲染前导品牌图标。
2. 草稿文本和占位符墨迹从输入行的标准内容边距开始；不为被移除的
   标记保留布局空间。
3. 渲染进程 `BrandLogo` 组件继续在 home hero、展开/折叠侧边栏和
   启动画面中使用规范资产。原生 Dock、应用菜单和 About 身份继续
   使用同一规范资产的各平台特定形式。
4. 会话创建控件保留其专用的 message-plus 图标。
5. 本决策只取代 D054 的前导品牌提示元素要求和 D094 的 docked
   composer logo 放置。所有产品命名和其余品牌资产要求保持不变。

## 后果

- Home 和 transcript composer 共享同一个无图标提示行边界。
- Textarea 获得此前被 15px logo 和间隙占用的宽度。
- 移除渲染进程节点同时移除相关的主题特定 CSS。
- 品牌识别通过周边外壳延续，而无需在文本输入界面内重复产品标记。

## 备选方案

### 保留 docked 的 15px logo

否决。它保留了历史品牌契约，但保持了不一致的输入行结构，并占用
空间而不传达状态或操作。

### 把 logo 加回 home composer

否决。在两个文本输入界面中重复该标记会增加装饰性外观，而不是
简化提示路径。

## 参考

- `docs/spec/00-baseline.md`
- `docs/spec/04-ux/01-ui-ia.md`
- `docs/spec/04-ux/07-ui-design-system.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-046, US-UI-37)
- `docs/spec/08-meta/decisions-log.md` (D054, D094, D160)
