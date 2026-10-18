# 生信小助手

面向 Windows 本地 Work 聊天的生信软件交互插件。目标版本 V1.0，当前为 0.1.0 界面开发版。

当前支持软件清单空状态、搜索、详情组件、任务记录空状态、关于页面，以及返回界面的 MCP 工具 `open_bioinfo_assistant`。尚未登记实际生信软件、读取分析数据或执行生信任务。

## 开发启动

安装 Node.js 24 LTS（最低 22）和 pnpm 11.25.0，克隆仓库后进入目录：

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run build
pnpm run preview
```

在浏览器打开 http://127.0.0.1:8787 。预览服务仅监听本机，不能把这个地址直接当作云端 ChatGPT 的远程服务器地址。

## 在本地客户端调用

构建生成 `dist/server.mjs`，安装副本不依赖 node_modules。请确保桌面客户端能从 PATH 找到 Node.js；安装 Node.js 后需完全重启客户端。

在项目目录执行：

```powershell
codex plugin marketplace add .
codex plugin add bioinfo-assistant@bioinfo-local
```

重启或刷新桌面客户端，在本地 Work 聊天选择“生信小助手”，发送“打开生信小助手工作台”。修改源代码后重新构建并安装，才能更新客户端加载的副本。

本机开发安装及安装副本的 MCP 调用已验证；客户端聊天中的 UI 实际渲染仍待确认。当前未打包 Node.js 运行时，尚不是最终用户安装包。

## 测试

- `pnpm test`：配置与真实 stdio MCP 工具发现、调用、页面资源读取。
- `pnpm run build`：生成不纳入 Git 的单文件服务。
- 测试构建产物（PowerShell）：

```powershell
$env:BIOINFO_TEST_SERVER = 'dist/server.mjs'
node --test test/mcp.test.mjs
Remove-Item Env:BIOINFO_TEST_SERVER
```

浏览器检查为可选项，在预览服务运行时，安装 Playwright 到本机开发环境并安装 Chromium 后执行 `pnpm run test:ui`。脚本也可通过 `PLAYWRIGHT_PACKAGE_JSON` 指向已有 Playwright 的 package.json，通过 `BROWSER_CHANNEL=msedge` 使用 Edge。截图存入忽略的 runtime 目录。

GitHub Actions 检查源码测试、构建及构建产物 MCP 调用；不代表已经通过真实 ChatGPT 客户端验收。

## 协作与交接

- [当前进度与下一步](docs/STATUS.md)
- [协作流程](CONTRIBUTING.md)
- [开发规格](docs/development-spec.md)

拉取代码不会同步聊天记录、已安装的插件副本、运行日志、软件路径配置或分析文件。每次交接应同时更新代码和进度文档。

## 目录与安装策略

客户端管理插件代码；运行数据默认 `%LOCALAPPDATA%\BioinfoAssistant`，支持绝对路径环境变量 `BIOINFO_ASSISTANT_DATA_DIR`。当前骨架只计算运行数据路径，不创建该目录。

本仓库沿用目标仓库已有的 MIT 许可证，详见 LICENSE。

官方接入参考：https://developers.openai.com/plugins/build/plugins
