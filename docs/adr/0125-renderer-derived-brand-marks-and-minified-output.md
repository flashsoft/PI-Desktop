# ADR 0125: 渲染进程输出派生的品牌标识和压缩产物

- Status: Accepted
- Date: 2026-08-26
- Related: ADR 0083, D079, D094
- Baseline: `0.10.8`

## 背景

渲染进程输出为 31 MiB，其中三项成本是意外产生的而不是产品决策：

1. `electron-vite` 的渲染进程预设硬默认 `minify: false`，与原生 Vite
   不同。`apps/desktop/electron.vite.config.ts` 没有覆盖它，因此每个
   生产构建都输出未压缩的 chunk；仅入口 chunk 就有 108,273 行。
2. KaTeX 的样式表为每种字体声明了 `woff2`、`woff` 和 `truetype`
   来源。打包的 Chromium 全面支持 `woff2`，因此 40 个
   `.woff`/`.ttf` 文件（0.78 MiB）被产出却从未被使用。
3. D079 和 D094 把 `build/icon_1024.png` 定为规范品牌标识，
   `BrandLogo` 直接导入了它。该文件是 `scripts/make-icon.py` 用来
   派生 `build/icon.icns` 的 1024x1024 母版。`BrandLogo` 以 16、20
   和 64 CSS px 渲染，因此渲染进程带着 1.04 MiB 的 PNG 只为画一个
   64 px 的标识。

这些都不是 Electron 自身的体积。未打包的应用约 279 MB，但一个不含
应用代码的纯净 Electron 43.4.0 外壳已经约 277 MB，因此渲染进程是
唯一值得调优的部分。

## 决策

1. 渲染进程构建显式设置 `minify: "esbuild"`。该设置由
   `packaging-footprint.test.mjs` 断言，因为框架默认值会静默地撤销
   它。
2. 一个 `pi-drop-legacy-font-fallbacks` Vite 插件以 `enforce: "pre"`
   在 Vite 把 `url()` 值注册为资源之前，从 CSS 中移除 `woff` 和
   `truetype` 的 `src` 条目。之后再剥离会让资源已被产出。只有以
   逗号开头的回退条目会被移除，因此单一来源为 `woff` 或 `truetype`
   的字体会保留它。
3. `build/icon_1024.png` 和 `build/logo_dark.png` 仍是规范的品牌
   母版和安装包图标的事实来源。这在一点上修订了 D079 和 D094：
   渲染进程改为导入 `apps/desktop/src/assets/brand/logo-light.png`
   和 `logo-dark.png` 处的**派生**标识，而不是母版。派生文件为
   192x192，覆盖 3x 设备像素比下的 64 px 渲染。每当规范标识变化时，
   用 `sips -Z 192` 从母版重新生成它们；视觉形象不变。

两个打包的 CJK 字体保持不做子集化。ADR 0083 第 2 节把
`Noto Sans SC` 追加到每个字体栈，使中文文本在离线时保持可读，而
子集化会从用户提供的内容中丢弃字形。要削减那 15 MiB 需要修订
ADR 0083，而不是改构建配置。

## 后果

- `out/renderer` 从 31 MiB 降到 24 MiB：JavaScript 从 12.53 降到
  7.72 MiB，旧字体回退从 0.78 MiB 降到 0，PNG 品牌资源从 1.23 降到
  0.06 MiB。
- 压缩后的渲染进程堆栈跟踪需要 devtools 的源码视图；不产出
  sourcemap，与之前的发布行为一致。
- 品牌标识现在存在于两个位置。`packaging-footprint.test.mjs` 断言
  渲染进程不从 `build/` 导入，因此未来的贡献者重新引入母版路径时
  测试套件会失败，而不是静默地多带回 1 MiB。
- 剥离旧字体格式之所以安全，只是因为应用只运行在打包的 Chromium
  中。插件面板会把自己的主题 CSS 清洗为 `data:` URI，无法引用渲染
  进程的字体资源，文档站点使用独立的主题。
