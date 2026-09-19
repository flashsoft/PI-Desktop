# Roundtable 讨论插件

一个 PI-Desktop 插件，帮助父 Agent 运行结构化的多 Agent 圆桌讨论。
每个角色是一个独立的 `Task`；父 Agent 收集各角色的报告并进行综合。
被委派的角色之间不会互相通信。

## 提供的能力

- **Skill**（`local.roundtable/roundtable`）：何时使用圆桌讨论、如何
  选择角色，以及如何通过 `Task` / `TaskWait` 运行顺序轮次。
- **Agent 工具**（`roundtable_start`）：返回一份编排计划，父 Agent
  使用 Task 和 TaskWait 按该计划执行。

## 安装（开发加载）

1. 打开 PI-Desktop。
2. 进入 **Plugins**。
3. 打开头部溢出菜单，选择 **Load development plugin**。
4. 选择 `examples/plugins/roundtable` 目录。

插件在启动时激活，Skill 和工具立即可用。

## 用法

让 Agent 运行一次圆桌讨论。例如：

> Run a roundtable on whether we should use GraphQL or REST for the API.

Agent 将会：

1. 携带主题调用 `roundtable_start`。
2. 收到一份逐步的编排计划。
3. 为每个角色并发启动一个 `Task`。
4. 使用 TaskWait 等待并收集独立的报告。
5. 可选地启动后续轮次，其简报中包含第一轮报告。
6. 为用户综合出一份建议。

### 自定义角色与选项

> Run a roundtable on our authentication strategy with roles: security-engineer,
> backend-developer, mobile-developer, devops-engineer. Use 4 rounds and
> produce a concrete implementation plan.

## 工具参数

| 参数 | 类型     | 必填 | 描述                                       |
|-----------|----------|----------|--------------------------------------------|
| `topic`   | string   | 是      | 讨论主题或问题           |
| `agents`  | string[] | 否       | 要包含的角色（默认：architect、security-reviewer、ux-designer） |
| `rounds`  | integer  | 否       | 轮次数，1–5（默认：3）         |
| `goal`    | string   | 否       | 讨论应当产出的结果         |

## 权限

- `agent.prompt.inject` — 将圆桌讨论 Skill 注入 Agent 上下文。
- `agent.tool.register` — 注册 `roundtable_start` 工具。

## 许可证

属于 PI-Desktop 示例的一部分。许可条款见仓库根目录。
