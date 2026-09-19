# ADR 0273：Git Checkout 作为创建项目的来源

- Status: Accepted for implementation
- Date: 2026-09-17
- Deciders: PI-Desktop desktop UI maintainers
- Amends: ADR 0233, ADR 0247

## 背景

ADR 0233 给渲染进程一个收集名称和本地文件夹的 Create project 界面，首
页切换器已经在 ADR 0247 的公共主机规则下通过 `project/clone` 克隆 git
项目。但完全没有任何项目的用户仍无法从仓库开始：切换器只在项目绑定的
session 的 hero 内渲染，而对话框没有仓库来源。因此全新安装的第一个项
目在任何 clone 入口可达之前就需要一个本地文件夹。

现有的 clone 通过原生对话框选择父目录，并返回渲染进程立即激活的
workspace。在对话框内复用它，要么会让对话框流程半途而废，要么会在组
存在之前激活项目。

## 决策

1. Create project 对话框拥有一个来源选择器，有两个平等的对等项：This
   computer（本地文件夹）和 Git repository。
2. Git 来源保留对话框的单个名称字段，新增仓库 URL 字段和一个 clone 目
   的地行，并在渲染进程中用首页切换器使用的同一套 `parseGitCloneUrl`
   规则解析 URL（ADR 0247）。
3. Main 暴露增量的 `project/cloneCheckout({ url, parentPath })`：它克隆
   到显式的父文件夹，返回 `{ path, name }`，不触碰活跃 workspace，也不
   打开选择器。
4. 项目创建仍通过 `project-group/create` 流动。Checkout 成为一个逻辑组
   的主根，输入的名称命名该组，与文件夹选择完全一样（ADR 0233）。文
   件夹选择和 checkout 在项目切片中共享一个创建 helper。
5. `project/clone` 为首页切换器保持其当前行为；两个 clone 入口不共享
   UI。

## 后果

- 全新安装可以直接从公共仓库创建其第一个项目，无需先打开无关文件夹。
- Clone 目的地是显式的：对话框在 `git clone` 运行之前收集它，因此
  checkout 绝不会落在隐式目录中。
- 私有、loopback、链路本地、携带凭据和畸形的 remote 在 git 运行之前保
  持被拒绝（ADR 0247）；对话框对它们禁用 Create。
- Checkout 成功而组创建失败会把克隆的文件夹留在磁盘上；错误以 toast
  浮现，文件夹可以之后添加。
- 没有协议、schema、宿主 RPC 或存储变更：新通道是狭窄的主进程能力，
  宿主仍拥有每条持久项目记录。

## 已考虑的替代方案

- **把首页切换器的 clone 入口移到空首页：** 被拒绝，因为没有项目绑定
  session 的 hero 没有切换器界面，而创建对话框是文档化的第一个项目入
  口。
- **在对话框内复用 `project/clone`：** 被拒绝，因为它的原生父目录选择
  器和立即 workspace 返回会在组创建之前激活项目。
- **让主进程静默选择目的地：** 被拒绝，因为 `git clone` 绝不应选择自
  己的目的地文件夹。
