# 11. 插件存储隔离

## 1. 目标

将插件数据与宿主核心数据隔离，避免交叉污染和未授权读取。

## 2. 目录布局

```text
~/.pi-desktop/
 ├── pi.sqlite # host DB (03-runtime/04); plugins never open it
 ├── plugins/
 │ ├── installed/<plugin-id>/
 │ ├── disabled/ # optional
 │ ├── data/<plugin-id>/
 │ ├── logs/<plugin-id>.log
 │ ├── cache/download/
 │ └── registry.json
 └── ...
```

## 3. registry.json（逻辑模型）

```ts
type PluginRegistry = {
 schemaVersion: 1
 plugins: Array<{
 id: string
 version: string
 enabled: boolean
 source: "installed" | "dev" | "marketplace"
 path: string
 installedAt: string
 updatedAt: string
 permissionsGranted: string[]
 marketplace?: {
 providerId: string
 shasum?: string
 publisherId?: string
 }
 }>
}
```

## 4. 插件私有数据

`pi.plugin.getDataPath()` 指向：

```text
~/.pi-desktop/plugins/data/<plugin-id>/
```

用途：
- 缓存
- 本地索引
- 大型插件配置文件

禁止：
- 使用该 API 获取其他 pluginId 的路径

## 5. 设置存储

插件设置可以存储在：

- 宿主 DB 的 `kv` 表中该插件的命名空间下（03-runtime/04 §4.1）
- 或插件数据目录下的 settings.json

推荐集中存储在宿主中，便于备份和卸载清理。

```ts
// kv: ns = `plugin:<plugin-id>`, key, value_json, updated_at
// uninstall cleanup = DELETE FROM kv WHERE ns = 'plugin:<plugin-id>'
```

## 6. 日志隔离

每个插件拥有自己的日志通道：
- 文件：`plugins/logs/<plugin-id>.log`
- UI：可按插件过滤

宿主核心日志不会写入插件文件。

## 7. 会话与秘密隔离

插件不能直接访问：
- pi.sqlite（会话、设置、任何宿主表）
- secrets
- provider key
- 其他插件的私有 registry 数据

经过评审的 `desktop.control` 网关现在提供有界的会话协作投影与变更目录。
它不暴露宿主表、转录文件、凭据、Electron IPC 或 MCP bearer token。宿主
从活跃的 Agent 工具调用推导来源身份，把投递与出处 ledger 持久化在
host-core 中，并审计该插件操作；插件私有状态永远不会被当作授权或会话
身份。

## 8. 卸载清理策略

默认：
- 删除已安装代码
- 删除数据
- 删除日志（或保留最近一份）

高级：
- 保留数据

## 9. 备份建议

未来的导出/备份可以拆分为：
- 仅宿主配置
- 宿主配置 + 插件列表
- 完整（包含插件数据）

MVP 不实现完整的备份协议；只预留目录边界。

## 10. 验收

1. 插件只能写入自己的数据目录
2. 卸载后按策略清理数据
3. registry 可以恢复已安装列表
4. 插件日志可以单独查看
