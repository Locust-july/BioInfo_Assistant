# 协作开发

## 日常流程

1. 从仓库克隆代码，按 README 安装与验证。
2. 开始工作前执行 git switch main 和 git pull --ff-only。
3. 为任务创建独立分支，例如 git switch -c codex/ui-refresh。
4. 提交代码、必要的测试和 docs/STATUS.md 进度更新。
5. 推送分支，在 GitHub 提交 Pull Request，描述行为变化、验证结果和未完成内容。
6. 另一位协作者检查后合并；其他开发者更新 main 后再开始下一项任务。

项目所有者在 GitHub Settings → Collaborators 中邀请协作者。私有仓库需要接受邀请才能克隆。不要共享密码或访问令牌。

## 分工

可按界面、MCP 接入、软件适配器、资料与验收划分任务。先在 Issue 说明负责模块及接口；对同一文件的重叠改动先沟通。

## 提交前

执行 pnpm test、pnpm run build；涉及 MCP 时再测试构建产物，涉及页面时运行浏览器检查或记录人工检查结果。

不提交本机绝对路径、凭据、node_modules、dist 构建目录、截图日志、用户分析数据或安装缓存。共享源码和锁文件，由每位开发者本机构建和安装。

## 进度同步的边界

GitHub 同步已提交的文件；聊天上下文和本机执行状态不会自动共享。以 docs/STATUS.md、Issue 和 PR 为交接依据。不要只在聊天中记录关键决定。
