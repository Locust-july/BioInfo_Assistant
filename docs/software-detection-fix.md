# 软件发现与检测接续修复

## 问题与行为

用户在自定义目录已发现软件后，重开工作台仍看到“本机尚未检测”；不填路径再次检测也返回未找到。原因是位置记录没有恢复为目录卡片的候选，普通检测也没有复用已保存路径。刷新后的内存结果还可能遮蔽文件缺失状态。

检测现在优先复检该软件已保存且仍为文件的位置（最多 20 条），再沿用 PATH 和固定目录检查。显式提供路径时仍只检查指定文件。工作台从经过存在性和文件身份检查的位置恢复候选，页面刷新清除旧内存检测结果。

候选保存应用版本、文件版本、身份来源和检测时间。旧记录没有完整证据时保持身份和版本待确认。默认检测不扫描整盘；自定义目录通过“查找软件”或手动路径加入。不执行被检测软件或包装脚本。

同时补齐便携 MCP 配置根部的 schema 声明，修复真实宿主加载器拒绝解析配置的问题。

## 验证与边界

原修复对话记录：源码测试 35/35、构建、构建产物 MCP 测试 5/5、HTTP 页面检测回归和原有模拟宿主设计回归通过。真实宿主重开后验证了已知路径复检、候选恢复、刷新保留以及指定目录发现；脚本候选和代际不匹配的应用仍保持待确认。

可复验命令：

```powershell
pnpm test
pnpm run build
$env:BIOINFO_TEST_SERVER = 'dist/server.mjs'
node --test test/mcp.test.mjs test/task-tools.test.mjs test/detection-flow.test.mjs
Remove-Item Env:BIOINFO_TEST_SERVER
node scripts/check-detection-ui.mjs
node scripts/check-design-ui.mjs
```

页面回归需可解析的 Playwright 及浏览器；可按 README 设置 PLAYWRIGHT_PACKAGE_JSON、BROWSER_CHANNEL 使用已有开发环境。

检测快照不代表软件可运行、实际使用或分析成功。BEAST 2 不因同名文件被确认成 BEAST 1。原生文件/文件夹选择、位置重新关联和完整任务引用链路仍按后续阶段验收。

安装源快照和已安装缓存不会随源码自动更新；重新构建后须按当前插件开发流程更新安装。机器专用路径、隔离测试数据、截图和缓存不纳入源码交付。
