# ADR 0083: 自定义全局 UI 字体

- Status: Accepted for implementation
- Date: 2026-08-14
- Baseline: `0.4.16`
- Protocol: v9 (one additive Electron-main IPC channel; host RPC unchanged)
- Storage schema: v10 (optional `AppSettings.fontFamily` JSON field)

## 背景

外壳排版是单一硬编码的 token 栈（`--font-sans`）。用户希望在设置
中选择全局 UI 字体——包括可安全商用的开放许可字体——类似于 dbx
桌面客户端的字体选择器，它会枚举系统字体并内置一个 OFL 字体家族。

渲染进程位于 preload IPC 白名单之后的沙箱中，且应用分发的是打包
后的渲染包，因此字体来源必须是本地的（不使用 CDN/CSS 字体服务，
见 [07-ui-design-system §2](../spec/04-ux/07-ui-design-system.md)）。

## 决策

### 1. 设置选择器与持久化

设置 → 基础 → 外观新增一个**字体**行，带可搜索的选择器。所选值持
久化为 `AppSettings.fontFamily`，即一个 CSS `font-family` 栈字符
串。缺失或空值表示使用内置 token 栈；选择器始终将**系统默认**列
在首位。选择系统默认会持久化一个空栈（`fontFamily: ""`）而不是移
除该键：`settings.set` 会将提供的字段合并进已存储的设置，且 JSON
序列化会丢弃 `undefined`，因此省略该键无法清除已存储的覆盖值。

选择器菜单以 portal 形式挂载到 `document.body`，作为 body 级固定
浮层（相对触发元素测量并钳制在视口内），因此设置卡片的
`overflow` 无法裁剪或挤压它；它遵循组件规范中的 body 级浮层契约。

### 2. 内置开放许可字体家族

四个字体家族以 `woff2` 随应用分发，均采用 SIL Open Font License
1.1（可免费商用和再分发；许可证文本随附于
`apps/desktop/src/assets/fonts/licenses/`）：

| 字体家族 | 文字覆盖 | 来源 |
|---|---|---|
| Geist | Latin (variable) | vercel/geist-font |
| Inter | Latin (variable) | rsms/inter |
| Noto Sans SC | CJK (variable) | google/fonts (Source Han Sans lineage) |
| LXGW WenKai | CJK kai (regular) | lxgw/LxgwWenKai |

每个字体栈都追加一个 CJK 回退层（`Noto Sans SC`、`PingFang SC`、
`Hiragino Sans GB`、`Microsoft YaHei`、`sans-serif`），使所选家族
没有 CJK 字形时中文文本仍保持可读。等宽栈（`--font-mono`）不变。

### 3. Electron 主进程中的系统字体枚举

Electron 主进程仅使用平台工具解析已安装的系统字体家族（不使用原
生模块），使主进程包保持自包含：

- macOS: `osascript` JXA 桥接
  `CTFontManagerCopyAvailableFontFamilyNames` —— 与
  `font_kit::all_families()` 使用的同一个 CoreText 查询，在数十毫
  秒内返回规范的 CSS 家族名 —— 当 osascript 不可用时保留
  `system_profiler SPFontsDataType -json` 作为回退
- Windows: PowerShell `[Windows.Media.Fonts]::SystemFontFamilies`
- Linux: `fc-list -f "%{family[0]}\n"`

结果会去重、过滤（排除以 `.` 开头的隐藏家族）、排序，并按进程缓
存 60 秒。渲染进程通过一个新的白名单 IPC 通道
`pi-desktop/app/systemFonts` 访问它们。

### 4. 应用方式

渲染进程根据 `AppSettings.fontFamily` 在 `document.documentElement`
上覆盖 `--font-sans`；`body` 和每个 `var(--font-sans)` 消费方无需
重载即可生效。内置字体家族的 `@font-face` 规则位于
`apps/desktop/src/styles/fonts.css`，在 token 层之前导入。

## 后果

- 用户一次选择全局 UI 字体；它跨重启持久化，并从内置文件离线渲
  染。
- 借助追加的回退层，每个选项的 CJK 覆盖都保持正确。
- macOS 枚举通过快速 CoreText 路径在数十毫秒内完成（此前的
  `system_profiler` 路径耗时 2–5 秒，现在仅作回退）；结果按进程
  缓存 60 秒，并返回规范家族名（如 `PingFang SC`），而非
  system_profiler 的本地化别名（如 `苹方-简`）。
- 内置字体文件使安装包增大 16 MB 左右。
- `@font-face` 的 `font-weight` 描述符被豁免于样式 token 检查，因
  为它们描述的是字体文件，而非 UI 排版。

## 替代方案

- **host-core 中的 `font_kit`**（dbx 的做法）：快速的原生枚举，但
  需要新增一个宿主 RPC 方法，为一个仅渲染进程使用的偏好扩大宿主
  协议面；Electron 主进程通过 `osascript` JXA 桥接即可得到相同的
  CoreText 家族列表，无需扩大协议。
- **`font-list` npm 包**：API 干净，但其内部目录
  `require("./libs/core")` 无法通过 electron-vite 主进程打包，且其
  macOS 助手是预编译二进制，需要 asar 解包。
- **`queryLocalFonts()`（Local Font Access API）**：在沙箱渲染进程
  中受权限门控，且在 Electron 中仍是实验性 API。
