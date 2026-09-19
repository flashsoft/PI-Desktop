# ADR 0102: 发布者拥有插件源码，产物存储在 Git 托管的仓库中

> Amended 2026-08-19: artifacts are committed to the existing distribution
> repository rather than published as releases of the center repository. The
> ownership model and every other decision below are unchanged.

- Status: Accepted for implementation
- Date: 2026-08-18
- Deciders: PI-Desktop plugin and distribution maintainers
- Supersedes: ADR 0006 (marketplace postponed)
- Amends: ADR 0007 (plugin package format), ADR 0005 (user-installable plugins)

## 背景

已发布的市场把所有东西都存在一个仓库里。`vastsa/pi-desktop-plugins`
在 `plugins/<id>/` 下保存插件源码，在 `packages/*.piplug` 下保存构建
好的包，以及客户端读取的 `catalog.json`。发布意味着维护者把别人的
源码提交进市场仓库，并用本地脚本重新生成目录。

这个模型无法支撑第三方发布者：

- 插件源码在市场仓库之外没有所有者。发布者无法独立迭代、打标签
  或版本化。
- 市场仓库永远增长二进制包，其 Git 历史在无意中变成了产物存储。
- 没有任何东西把已发布的包与产生它的源码绑定。目录记录的是校验
  和，而不是仓库、commit 或构建者。
- `verified` 是手工编辑的目录字段。拥有提交权限的发布者可以自行
  断言它。
- `download_url` 跟随重定向到任何主机。当每个包 URL 都解析到同一
  个已知仓库之下时这是可接受的，而一旦包 URL 由发布者提供就不
  可接受了。

插件中心设计（`vastsa/pi-plugin-center`）回答了所有权那一半：插
件源码留在发布者自己的仓库中，平台存储经权限验证的快照、构建证
据、评审报告和签名目录。它指定 S3/R2 加 CDN 作为产物存储。

我们想要这个所有权模型，但不想运营对象存储。

## 决策

### 1. 发布者的仓库是事实来源

发布者提交一个仓库坐标——规范的 HTTPS 仓库 URL、路径，以及一个
解析到 40 位十六进制 commit 的 ref。PI-Desktop 绝不把插件源码复
制到项目拥有的仓库中。`pluginId`、`publisherId`、链接的仓库和打
包的 `manifest.json` 身份必须一致，且一个已发布版本固定到恰好一
个 `(repository, commit, path)` 元组。

### 2. 管理和分发是分开的仓库

`vastsa/pi-plugin-center` 是管理面：提交、所有权验证、隔离构建、
评审、策略门，以及记录已发布内容的注册表。

`vastsa/pi-desktop-plugins` 仍是分发仓库。它继续从根目录提供
`catalog.json`，从 `packages/` 提供包，CNB 副本继续镜像它。没有
S3，没有 R2，也没有单独运营的 CDN。

- 发布者在自己的仓库中构建 `<id>-<version>.piplug` 并附加到一
  个 release，或者由中心的隔离运行器从固定的 commit 构建。
- 中心验证字节，然后把包连同重新生成的 `catalog.json` 在一次
  commit 中提交到 `pi-desktop-plugins/packages/`。
- 包 URL 保持相对，因此它们相对于提供目录的那个主机解析。在
  GitHub 和 CNB 镜像之间切换不会把下载引向另一个提供方，也不会
  改变被验证的校验和。

让分发留在原地意味着默认目录 URL 永远不变，已安装的客户端无需
迁移。这也意味着产物字节和描述它们的摘要落在同一个 Git commit
中，这是比 release 附件更强的记录：改变已发布的字节需要改写历
史，而不是重新上传一个文件。残余风险是强制推送，预期由分发仓库
的分支保护来防止。

被接受的代价是仓库增长。提交的二进制是永久的——一个不再使用的
版本可以从 `packages/` 中移除，但仍留在历史中，因此每次 clone 都
要为发布过的每个版本付费。

### 3. 目录 schema v2 是客户端契约

`catalog.json` 获得 `schemaVersion: 2`，并为每个版本携带：源仓
库、ref、commit 和路径；构建者身份；评审结论、风险层级和策略版
本；`yanked` 状态；以及可选的分离签名。客户端继续原样读取 v1 目
录，使现有市场仓库和任何自定义来源在迁移期间保持工作。

### 4. 宿主限制包的来源

因为包 URL 现在受发布者影响，host-core 对市场包强制实施下载主机
白名单：GitHub 的 release 和 raw 资产主机，以及 CNB 主机。重定
向限制为 HTTPS，且最终有效 URL 会再次对照白名单检查。自定义或
企业目录只能从提供其自身目录的主机下载，除非用户显式配置了额
外主机。

### 5. 信任和评审结论由中心签发，绝不由发布者断言

`trust`、`review.decision`、`review.risk` 和 `policyVersion` 由中
心的策略评估器写入。发布者提交的元数据无法设置它们。客户端对任
何无法归因到中心的内容渲染 `community`，绝不把无法验证的声明渲
染为 `verified`。

### 6. 被撤下的版本不可安装

`yanked: true` 将一个版本从安装和更新选择中移除，让它带着原因
在版本历史中保持可见，并把已安装的副本标记为需要关注。

## 后果

- 第三方发布者无需对任何 PI-Desktop 拥有的仓库的写权限即可发布
  插件，并可按自己的节奏版本化。
- 默认目录 URL 不变，因此触达通过中心发布的插件不需要客户端发
  版，也不需要用户操作。
- 客户端无需为此决策改动代码：相对包 URL 已经相对于携带它们的
  目录解析，且下载主机白名单已经覆盖两个分发主机。
- 每个已安装的市场插件都可以追溯到仓库和 commit，桌面端可以在
  安装前展示该来源。
- 失去对象存储的代价是失去 WORM 语义和版本化桶保留。上面的
  Git 记录是防篡改可见而非防篡改的，且分发仓库无界增长。两者都
  是被接受的权衡。
- 在分发仓库同时提供 v1 条目和中心发布的 v2 条目期间，客户端必
  须容忍两种目录 schema。
- 发布者签名密钥仍在范围之外。由中心签名；发布者持有的密钥留在
  ADR 0008 的后续阶段。

## 被拒绝的替代方案

- **把源码留在市场仓库。** 简单、已可用，但无法支持非维护者的发
  布者。
- **只做索引；从发布者仓库下载。** 把中心完全移出下载路径，但发
  布者可以在已发布版本之下删除或替换 release 附件，且客户端需要
  一个开放式的宿主白名单。
- **把产物作为分发仓库的 release 发布。** 让 Git 历史不含二进制
  并允许修剪旧版本，代价是目录必须声明产物基址，且 CNB 镜像必
  须单独复制 release 附件，而不能搭乘已有的 Git 镜像。
- **中心从源码构建每个插件，不接受发布者产物。** 最强的可复现
  性，但使中心从第一天起就负责每个插件的工具链和依赖供应链。保
  留为选择启用的插件的运行器路径，而不是唯一路径。
- **按插件中心文档使用 S3/R2 加 CDN。** 提供 WORM、对象锁和缓存
  控制，代价正是此决策要避免的运营和计费面。
