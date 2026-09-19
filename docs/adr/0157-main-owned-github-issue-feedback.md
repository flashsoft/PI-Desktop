# ADR 0157: 由主进程持有的 GitHub issue 反馈

- Status: Accepted
- Date: 2026-09-05
- Deciders: PI-Desktop core
- Related: D120, D313, ADR 0022

## 背景

没有应用版本、操作系统或复现步骤的 bug 报告无法被分诊。
Settings → Info 已经显示版本和日志，但用户没有通往 GitHub issue
创建的应用内路径，且既有的 issue 表单把这些分诊字段视为可选。

## 决策

1. GitHub issue 表单是唯一的接收路径（`blank_issues_enabled: false`）。
   bug 表单要求描述、复现步骤、预期和实际行为、应用版本和操作系统。
   功能表单要求问题和提议的变更。英文是源标签语言；中文保留在相同
   字段上。
2. Settings → Info 暴露一个 **Report a problem** 行。其操作调用白名单
   化的 `pi-desktop/app/openFeedback` 通道。Electron Main 构建一个
   固定的 GitHub bug 表单 URL，从 Main 持有的版本信息预填
   `app-version`、`os` 和 `environment`，并用 `shell.openExternal`
   打开它。渲染进程无法提供 URL。
3. 构建的 URL 必须保持在
   `https://github.com/vastsa/PI-Desktop/issues/new` 并带
   `template=bug_report.yml`。功能请求仍可从 GitHub 的模板选择器
   进入，而不是第二个 Settings 操作。

## 后果

- 分诊数据在接收时收集，而不是在后续评论中补问。
- 打开 GitHub 遵循与 releases 页面相同的 Main 持有 URL 规则。
- 没有宿主协议、存储或更新 feed 变更。

## 备选方案

- 渲染进程用 `window.open` 打开构建的 URL：否决，因为这会让沙箱
  选择目的地，与 `updates/openReleases` 不同。
- 打开模板选择器而不预填版本：否决，因为 Settings 行已经持有权威
  的版本信息。
