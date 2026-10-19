# 界面设计与功能层对接（2026-10-19）

本轮按用户选择使用纯白底＋群青点缀。隔离目录为 <隔离设计工作区>，分支 codex/ui-design；未改动功能工作目录、未安装、未提交/推送/合并/发布。

## 来源与隔离

- 隔离仓库原始远端基线 bd0c7b989514df5e15d2a4e1a14024c9149e4eb2。
- 功能快照来自 <功能工作区> 的 codex/software-catalog 未提交工作，HEAD=2a9bedf。开始时已检查 status/diff、STATUS、function-api 和“功能一”的最近进度，未向其他对话发消息。
- 2026-10-19 两次 ls-remote 均因 github.com:443 连接失败，无法确认较新远端。不能把 bd0c7b9 称为本轮已确认的最新提交。
- src/ 与 test/ 从功能目录只读复制至隔离副本；本轮未改动所复制功能源码。function-snapshot-20261019.json 保存 SHA-256，交付前同时对比原功能目录及隔离文件，差异为空。
- 前版设计及旧宿主版本文件备份在忽略的 runtime/design-v1-backup。本隔离副本移除了前版遗留的 src/client-version.mjs 与 test/client-version.test.mjs，现有功能分支本就没有这两个文件。当前 UI 不调用旧 get_client_version。

## 可审阅界面

- http://127.0.0.1:8796 ：明确标注的模拟宿主。可在顶部切换任务清单/资料目录，点击多安装选择、资料、导出、运行快照、路径选择与重新关联。所有安装路径、状态、选择窗口和定位反馈都是测试数据；没有启动研究软件，也不会写入真实资料或任务目录。
- http://127.0.0.1:8795 ：真实本机 HTTP/MCP 预览，27 项目录为已有登记资料，默认不声称已安装。操作仅在用户点击时调用真实工具。数据隔离在 runtime/real-preview-data，不修改已安装插件的数据。无 Codex iframe 宿主，不能用它代替 Codex 安装验收。
- 启动真实预览：设置 PORT=8795、BIOINFO_ASSISTANT_DATA_DIR 为隔离数据目录，node src/preview.mjs。
- 启动模拟预览：node scripts/preview-design.mjs（默认 8796）；旧 preview-ui-fixture.mjs 为兼容入口。测试脚本自行启动 8797，避免改变用户正在审阅的 8796 状态。

## 设计与已接入能力

默认只有任务摘要/目录、搜索工具栏、软件清单与必要状态；没有统计横幅、占位软件或虚构分析进度。论文与官网、版本与路径、运行快照点击展开；任务项另有使用记录。产出位置在独立标签页。

- task.requirements 是任务列表的唯一依据；未知/歧义项保留，使用 resolution 显式选择登记软件，不用完整目录补成“任务需要的软件”。
- planningState、localState、selectionState、actualUsageState 分开显示。只有用户勾选确认并填写说明，才调用 record_task_software_usage(reportedBy=user_reported)。检测、选安装、进程快照均不生成使用记录。
- inspect_task_software、select_task_installation、inspect_software、discover_software、locate_software 按现有参数接入；支持多个安装、指定文件和受限目录。检测后保持面板展开。切换查看的安装/检测后清除旧运行快照。
- applicationVersion.version 为应用版本；fileVersion 与 launcherVersion 是结构化对象，不转成应用版本。来源、源文件、资源条目、身份、时间均在证据展开层。官网版本快照单列。宿主版本仅显示 ui/initialize.hostInfo 自报值，不扫描其他应用；插件版本读 workspace.version。三者不混用，也不宣称宿主自报值一定是桌面安装包版本。
- 当前查看版本改变后调用 get_software_materials 重新匹配资料。不以旧的“版本未知”提示或其他代际引用替代。待核验推荐关系、缺失项、排除论文和补全请求可见；补全请求可复制给调用者 AI，页面不假装自动联网。
- 引用勾选是导出选择，不是实际使用。任务导出用 export_task_citations；目录用 export_citations。弹窗显示 status/warnings/unresolved，复制始终使用 citationExport.text，绝不单独复制 bibliographyText。BibTeX 提示保留百分号注释；selectionEvidence、researchRequests 可展开。
- choose_path/get_path_selection 异步查询；取消保留原输入。Windows 原生确认/取消返回值在真实 Codex 内仍未验收。
- record_file_location/reveal_path 保留 locationId、kind、softwareId、taskId。显示缺失/替代/重新关联；软件与产出位置均可复制/定位。产出标注不表示研究执行证据。
- inspect_running_software 仅按钮触发；失败清旧快照并恢复按钮。not_observed 不表示完成；运行进程不表示分析成功。没有执行、停止、持续监控或项目管理。
- 外部文本用 textContent；链接仅 HTTP(S) 且不含凭据，target=_blank 使用 noopener noreferrer。

## 最小集成边界

功能层已经在原目录，**不要将隔离仓库的 src/test 整体覆盖回去**。实际产品界面变更仅 public/index.html。docs/ui-design-integration.patch 是相对本轮功能工作区页面生成的 UI-only patch；在原目录运行 git apply --check 已通过（只检查，没有应用）。基线页面 SHA-256 在快照清单中。如果原页面继续变动，先重新审查，不强制覆盖。

新增可选开发文件：scripts/preview-design.mjs、check-design-ui.mjs、check-design-real.mjs；scripts/check-ui.mjs 为新版浏览器验证入口；package.json 仅在功能快照上增加 preview:design。资料和宿主接口沿用功能层，无需新增产品工具。

隔离 git diff 相对 bd0c7b9 包含大量功能来源文件，它们不是本轮设计新写的功能。评审应把功能快照清单、UI-only patch 和新预览/验证脚本分别审阅。

## 验收结果与复验

- node --test 'test/*.test.mjs'：31/31 通过（功能快照自身测试）。
- node scripts/build.mjs：通过。
- BIOINFO_TEST_SERVER=dist/server.mjs；node --test test/mcp.test.mjs test/task-tools.test.mjs：2/2，通过构建产物真实 stdio MCP。
- 设置 PLAYWRIGHT_PACKAGE_JSON（如果复用现有 Playwright）、BROWSER_CHANNEL=msedge 后，node scripts/check-ui.mjs：通过。覆盖未知条目不丢失、多安装选择后仍未记录使用、应用/启动器版本、选择/取消、搜索、运行快照正例/未观察/失败恢复、引用与完整提示复制、BibTeX 注释、DOI 去重、键盘/ESC、390px/深色、重新关联/定位及宿主/插件版本区分。
- 真实预览启动后，设置 PREVIEW_URL、可选 BIOINFO_UI_RDP4_PATH，node scripts/check-design-real.mjs：通过。真实 HTTP MCP 读取 27 项，指定既有 RDP4 文件只读返回应用版本 4.101、来源文件与元数据依据；资料随实际版本重新匹配，导出保留推荐关系待确认。没有启动 RDP4。
- git diff --check：通过。功能快照 hashes 与源目录一致。未运行远端 CI。
- 截图已逐项查看：runtime/design-task-desktop.png、design-install-desktop.png、design-export-desktop.png、design-materials-mobile.png、design-dark-mobile.png、design-outputs-mobile.png、design-real-rdp4.png、design-real-export.png。

真实 Codex 安装后的 iframe、宿主剪贴板权限、原生文件/文件夹确认及取消、重新打开后的交互，仍须按 function-api.md 人工验收。此次没有更改已安装插件。

## 最新设计补充：群青、运行指示和产出文件时间

用户要求后追加，优先于上文“功能层未改动/仅 public/index.html”的旧交接范围。本轮依然只改隔离副本，没有修改原功能目录、上传或安装缓存。

- 主色为群青 #303f9f，深色主题对应浅群青。确认安装的颜色保持群青；绿色专用于已观察到匹配进程的运行快照，避免把身份确认误解为运行。
- 卡片右侧新增“运行未查询/查询中/进程运行中·快照/本次未观察到运行/状态未知”提示。查询时转圈，有减弱动态效果适配。失败清旧绿灯；按需查询，不常驻轮询，不据此推断分析成功或完成。
- 产出位置显示 fileModifiedAt 和 recordedAt，格式为北京时间 UTC+08:00、精确到秒。fileCreatedAt 与 checkedAt 在详情中；time.datetime 保留 ISO 时间。缺失/被替代文件显示“最后已知修改”，不冒称当前文件属性。所有文件时间均不是分析完成时间。
- src/locations.mjs 最小新增 filesystem_stat 的 fileCreatedAt/fileModifiedAt。record 保存属性，describe/refresh 重查实际属性。src/mcp.mjs 的工作台使用本次 locations.refresh() 的结果，src/preview.mjs 同步使用刷新结果，避免回显旧时间。
- 因此集成除了 UI-only 的 ui-design-integration.patch，还需要 ui-time-integration.patch（src/locations、src/mcp、src/preview、test/locations、test/mcp）。function-snapshot-20261019.json 保留原功能基线哈希，并单列 designExtensions 当前修改。
- 32 项源码测试、构建、Edge 完整设计检查通过；真实 Windows 构建产物 MCP 使用隔离测试文件核对文件修改时间与系统 stat 一致，通过。原生选择人工验收边界不变。
- 新截图：runtime/design-running-desktop.png、runtime/design-outputs-mobile.png。设计预览顶部“查看运行中提示”可打开模拟进程快照；上方始终标记测试数据。

### 最新视觉微调

按用户进一步反馈：文件时间改用浏览器/本机时区，删除“北京时间 · 精确到秒”和固定 UTC+08:00 文案，仍保留秒级显示和底层 ISO 时间。顶部图标与“生信小助手”标题外增加一圈细群青圆角边框。此条覆盖上一节的固定北京时间展示说明。UI 集成补丁已同步，时间接口字段不变。

用户澄清：品牌装饰仅位于标题上方，已去除环绕边框，改为顶部 3px 群青线。

品牌图标改为群青线条双螺旋，内联 SVG 保持清晰与简洁，无图片或字体依赖。
