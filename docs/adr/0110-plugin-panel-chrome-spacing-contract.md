# ADR 0110: 为插件面板外框间距契约引入版本

- Status: Accepted
- Date: 2026-08-20
- Deciders: PI-Desktop core
- Related: [ADR 0092](0092-plugin-owned-panel-surface.md) ·
  [ADR 0093](0093-plugin-panel-strict-drag-band.md) ·
  [ADR 0104](0104-plugin-contributed-work-panel-views.md) ·
  [07-plugins](../spec/07-plugins/03-plugin-api.md)

## 背景

宿主拥有的插件胶囊保留严格的 46px 拖拽带。较旧的插件页面使用普
通的 body 内边距，并依赖 preload 添加该带。较新的页面还会读取
`--pi-plugin-titlebar-height`，这使新增的宿主内边距与安全区重复，
并在插件拥有的工具栏或卡片上方留下过多空白。捆绑的 Files 页面和
编写模板需要一个在分离和停靠两种放置下都能工作的确定性契约。

## 决策

1. 当前的插件页面声明 `<meta name="pi-plugin-chrome" content="v2">`。
2. preload 在页面布局之前发布 `--pi-plugin-titlebar-height`：分离面
   板为 `46px`，停靠视图为 `0px`。
3. v2 页面拥有自己的正常流间距，且必须使用该变量。宿主不再添加
   另一段顶部内边距。没有标记的页面保留旧的新增偏移，使现有已安
   装插件保持兼容。
4. 宿主胶囊保持为 46px 带右上角闭合的、随页面自适应的三控件胶
   囊；插件页面拥有自己的标题、工具栏和表面。宿主在外观变化后重
   新采样页面颜色。
5. 第一方示例、捆绑插件和生成的面板模板使用中性的 PI-Desktop
   token 色阶和 v2 标记。

## 后果

- 插件页面不再需要猜测宿主是否已经插入安全区，分离/停靠入口可
  以共享它们的布局。
- 现有第三方页面在作者迁移期间继续渲染。
- 该标记是一个小型公共 HTML 契约，而不是 manifest schema 变更，
  因此插件无需包格式修订即可采用它。
