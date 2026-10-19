# 上传交接（等待用户在另一个对话中授权上传）

本目录为已经验收、尚未提交的隔离开发仓库，当前分支 codex/ui-design。上传目标 origin = https://github.com/Locust-july/-.git。

用户明确要求由另一个对话负责上传。本设计对话不再提交或上传，也不向其他对话主动发消息。

## 当前文件

- public/index.html：完整设计页面，白底深蓝；与功能快照工具接口接通。
- docs/UI-DESIGN-HANDOFF.md：接口、预览、验收、限制及最小集成边界。
- docs/ui-design-integration.patch：仅页面的集成补丁；相对于功能工作区当时的页面，已做 git apply --check，没有应用。后续功能工作区若变化须重新核对。
- docs/function-snapshot-20261019.json：复制的功能源码与测试哈希及页面补丁基线。
- scripts/preview-design.mjs：独立模拟审阅，不写真实任务/安装数据；scripts/check-design-ui.mjs 为浏览器验收。
- scripts/check-design-real.mjs：真实 HTTP MCP 页面检查；指定软件文件才执行只读版本属性检测。
- scripts/start-design-preview.mjs 与根目录“启动设计预览.cmd”：恢复本机审阅服务，默认 8796。
- README 已同步功能分支说明，并补充设计预览入口；src/test 为功能工作区已完成源码的隔离快照，不是本轮重新开发的功能。

## 上传前

1. 先检查 GitHub 最新分支、原功能工作区状态和此目录 diff。不要覆盖原目录的未提交成果。
2. 原基线 bd0c7b9，功能快照 HEAD=2a9bedf 加未提交成果。相对 main 的 diff 同时包含功能依赖与设计，不应误称“只有 CSS 修改”。可在独立分支提交完整已验收快照供审阅，或先协调功能分支后只应用 UI 补丁。
3. 不上传 node_modules、runtime、dist、截图、日志或本机运行数据。这些已被忽略；截图在 runtime/design-*.png，可本机查看。
4. 31 项源码测试、构建、2 项构建产物 MCP 与模拟/真实 HTTP 预览浏览器检查已通过；真实 Codex 安装原生选择确认/取消仍待人工验收。
5. 本轮曾尝试创建远端分支，但 GitHub 连接返回 403 Resource not accessible by integration；分支未创建。Git 直连 github.com:443 失败。尚无成功的上传、提交、PR 或合并。
6. 已清理新增交接文档中的本机真实绝对路径；上传前仍应审查 diff 与必要隐私信息。

## 预览边界

运行“启动设计预览.cmd”或 node scripts/start-design-preview.mjs 后，访问 http://127.0.0.1:8796 。界面上方始终标明测试数据。服务停止后链接无法访问；这不是已经安装在 Codex 中的插件。未经明确授权不要更新已安装副本。

## 本次追加范围（群青与时间显示）

除页面 UI 补丁外，上传/集成需加入 docs/ui-time-integration.patch 的最小功能增量（src/locations.mjs、src/mcp.mjs、src/preview.mjs 及两个对应测试）。这些文件在隔离副本中为输出时间新增了真实文件系统字段，并让工作台采用刷新后的结果；原功能目录未修改。新增精确时间不是分析完成时间。当前测试为 32 项通过；群青主题、查询转圈/运行绿灯与产出时间浏览器验证通过。请以 UI-DESIGN-HANDOFF.md 最后章节为最新范围。

最新微调：时间按本机时区显示，不固定北京时间；去掉精度说明，顶部品牌区域新增细群青边框。已同步 public/index.html 与 UI 集成补丁。

标题装饰最终为顶部群青线，不是环绕边框。

## 上传复验 2026-10-19

用户已授权将本交付上传至 GitHub。上传前复验 32 项源码测试、构建、2 项构建产物 MCP 测试及 Edge 完整设计交互检查均通过。

GitHub 连接创建分支返回 403 Resource not accessible by integration；Git 直连在沙箱内外均无法连接 github.com:443。远端读取确认 main 为 bd0c7b9；尚不能将本地交付称为已上传。真实 Codex 安装与原生选择确认或取消的人工验收仍未完成。
