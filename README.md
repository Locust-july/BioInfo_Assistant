# 生信小助手

面向 Codex 的 Windows 本地生信软件交互插件。目标版本 V1.0，当前为 0.1.0 界面开发版。

当前支持任务软件清单、软件发现与手工路径、安装选择、版本来源区分、引用和地址资料补全、引用导出与位置/运行快照。尚不执行生信分析；现有页面仅为验证入口，视觉设计由用户另行决定。

## 软件资料与本机检测

- `discover_software`：传入 `roots` 软件目录数组（如自己的 tools 目录），按登记文件名发现候选。最多 10 个根目录、3 层深度、5000 个条目；拒绝盘符根目录，不跟随符号链接/目录联接。返回候选、身份、文件属性版本、警告及是否触及条目上限；不执行程序或脚本。
- `list_software`：按名称、别名或用途查询目录。未知软件返回空列表。
- `inspect_software`：软件 `id` 见 `list_software`（例如 `rdp4`、`beast`、`aliview`），可选传入 `executablePath` 绝对 EXE 路径。不指定时检查 PATH，以及 Program Files、Program Files (x86)、LocalAppData/Programs 下的 RDP4 固定子目录；不递归扫描磁盘，不读取注册表。
- 检测读取 Windows 文件属性或已适配的应用资源，不启动目标程序。文件存在、身份匹配和能否运行分析是不同状态。结果暂不持久化。
- 官网版本为带核验日期的快照，不是实时查询或本机实际版本。
- 页面沿用远端四入口卡片，支持复制论文标题、完整引用、BibTeX 和官方地址。RDP4 与 RDP5 分别处理，具体方法可能另需引用。
- 浏览器预览展示资料，本机检测通过客户端 MCP 调用。目录不代表本次任务实际使用记录。

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

构建生成 `dist/server.mjs`，安装副本不依赖 node_modules。请确保Codex能从 PATH 找到 Node.js；安装 Node.js 后需完全重启客户端。

在项目目录执行：

```powershell
codex plugin marketplace add .
codex plugin add bioinfo-assistant@bioinfo-local
```

重启或刷新Codex，在本地 Work 聊天选择“生信小助手”，发送“打开生信小助手工作台”。修改源代码后重新构建并安装，才能更新客户端加载的副本。

本机开发安装及安装副本的 MCP 调用已验证；用户已确认 Work 聊天中能显示并操作界面，刷新与重开聊天等细分场景仍需逐项验收。当前未打包 Node.js 运行时，尚不是最终用户安装包。

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

客户端管理插件代码；运行数据默认 `%LOCALAPPDATA%\BioinfoAssistant`，支持绝对路径环境变量 `BIOINFO_ASSISTANT_DATA_DIR`。首次标注位置时会在运行数据目录的 locations 子目录中保存位置记录。

本仓库沿用目标仓库已有的 MIT 许可证，详见 LICENSE。

官方接入参考：https://developers.openai.com/plugins/build/plugins

### 软件发现范围

目录增加常用工具的检测规则，资料与引用未核验的条目明确待确认。当前包含 RDP4、AliView、BEAST/BEAUti/TreeAnnotator/LogCombiner、Tracer、MAFFT、MUSCLE、FastTree、PhyML、MrBayes、RAxML、ClustalW、SimPlot++、SDT，以及 BLAST+、IQ-TREE、SAMtools、BCFtools、SeqKit、minimap2、BWA、fastp、FastQC、HISAT2、MEGA 命令行。

只匹配文件名的结果是候选，不能据此确认软件身份或版本。EXE 产品属性完全匹配时报告该文件声明版本；Java 等应用的启动器版本可能不同于实际应用版本，当前不读取 JAR、不执行 `--version`。BAT 只报告候选。未发现仅表示限定范围内未匹配，不表示电脑没有安装。发现结果不持久化，不自动变成任务实际使用记录；界面布局由另一位合作者负责，本轮新增发现工具可由 AI 直接调用。

### 未发现时手动补充

AI 可调用 `locate_software`，参数 `path` 为用户提供的绝对文件夹或文件路径，`id` 可选。指定文件夹时继续有限范围发现；指定 EXE 且有登记 id 时读取文件属性核验，支持文件被重命名的情况。未登记软件和 BAT/CMD/JAR 文件也可以人工补充，但保持身份与版本待确认。缺失路径、权限不足、链接和不支持的文件类型分别返回明确状态；路径输入可带 Windows“复制文件地址”的双引号。

`discover_software` 无结果时返回 `nextAction: manual_locate` 和手动接口提示。示例：`locate_software({"path":"用户的软件文件夹或完整文件路径","id":"rdp4"})`。该功能目前是 MCP 路径输入接口；现已提供 Windows 文件/文件夹选择窗口；位置记录保存在独立数据目录。界面合作者可直接接入此接口，无需改变检测逻辑。

### 一键引用

已有论文的软件卡片中，展开“引用论文”，点击“一键引用”即可复制完整参考文献，也可单独复制标题或 BibTeX。目前有 13 篇不同论文、覆盖 16 个软件条目；其中部分只有书目核验，官方推荐关系仍待确认，详见 [引用核验记录](docs/software-citations.md)。

AI 可调用 `export_citations`，传入明确选择的软件及实际版本，返回去重后的完整引用/BibTeX/DOI 和未解决事项。不会把全部已发现软件当成实际使用记录。软件代际不匹配时不导出对应论文；未知版本或推荐关系尚未确认时必须阅读返回的警告。

### 位置标注与一键定位

软件检测/手动查找/目录发现会记录本次服务会话中的候选位置。在软件卡片“版本”面板可查看路径、复制路径并点击“一键定位”。文件将在 Windows 文件资源管理器中选中，文件夹直接打开；不会运行目标软件或打开产出文件内容。浏览器预览可复制路径，定位需要已连接的 Codex 本机插件。

- `record_file_location({path,kind:"software"|"output",label?,softwareId?,taskId?})`：标注软件或产出文件/文件夹，软件标注必须提供已登记的 softwareId。产出是位置标注，不等于插件已执行分析或验证结果。
- `list_file_locations({})`：列出标注并重新检查存在性；最多保存 500 条本机标注记录。
- `reveal_path({path})`：点击时重新检查本机绝对路径，发送资源管理器打开/选中请求；文件缺失或无法访问会返回明确原因，不自动定位到其他目录。
- 标注后刷新工作台，软件位置进入对应卡片；产出位置显示于“任务记录”中的“已标注的产出位置”。搜索不会清除产出标注。标注现已落盘，页面刷新和服务重启后保留。

定位仅接受本机盘符绝对路径，当前不支持网络路径/URL/系统虚拟路径。`reveal_requested` 仅表示请求已发送，不能据此判断资源管理器窗口实际显示成功。

### 检测软件是否在运行

软件卡片 → 版本 → 检测运行状态。每次点击读取新的 Windows 进程快照，不后台轮询。`inspect_running_software({id,executablePath?})` 返回匹配进程、候选进程、PID、父 PID、启动时间、累计 CPU 时间和工作集内存，原始命令行不返回。

- 有明确 EXE 路径时按路径匹配；只有名称相同、路径无权限或不同安装目录时仅作候选，不能确认选定软件实例。
- BEAST 等部分 Java 应用支持登记的主类入口识别；也可指定完整 JAR 路径匹配 `java -jar`。不把任意 java.exe 当成 BEAST。Java 启动器退出后如果不能将 JVM 与指定 EXE 关联，保留为候选；可以按实际 JAR 路径复核。启动器尚在并不证明子任务仍在计算。
- `running` 表示已匹配进程，`candidate_processes` 表示尚待核验，`not_observed` 表示本次未观察到匹配进程。查询失败、权限不足、不支持平台时明确无法确认。没有观察到不等于已成功完成。
- `analysisState` 始终为 unknown。累计 CPU 时间不是当前 CPU 百分比，进程存在/耗用 CPU 也不能证明 MCMC 正在有效推进、未卡住、已经收敛或结果正确；这些需要后续按真实任务核验日志/状态/结果。

目前不启动/终止软件，不读取分析文件，不通知完成，不持续监控；此阶段仍以软件发现和状态查询为范围。

### 非沙箱验收

实际运行进程查询需要 Windows 主机允许 CIM 读取；沙箱拒绝访问不等于本机功能不可实现。2026-10-18 已在沙箱外通过构建产物真实 MCP 验证软件发现、RDP4 属性版本、手动路径、产出标注/列表、Explorer 定位请求，并对 BEAST 1.8.3 空程序完成“未观察到 → 运行 → 测试实例退出后未观察到”的正反例。BEAST 未加载数据，不代表长时间分析/收敛/完成判定已验收。

可重复验收脚本 `scripts/check-native-runtime.mjs` 需显式设置 `BIOINFO_NATIVE_EXE` 为本机 BEAST EXE，默认测试 dist/server.mjs。它会检查已有实例，有既有候选则跳过启动；否则短暂启动空程序，只清理本轮新建的启动器或经父 PID 与创建时间核验的 Java 子进程。报告写入忽略的 runtime/native-runtime-acceptance.json。这个脚本只用于开发验收，产品查询工具本身不会启动或终止软件。

测试在沙箱外通过，不代表Codex 已安装的插件副本已更新，也不保证任何宿主都提供相同本机权限；部署后仍需在实际客户端验收。

### 位置持久化与原生选择窗口（当前实现）

软件及产出位置保存到 `%LOCALAPPDATA%/BioinfoAssistant/locations`（也支持 BIOINFO_ASSISTANT_DATA_DIR），插件服务或 Codex 重启后保留。按记录分别原子写入，避免并行服务覆盖其他条目。此前“会话内保存”的说明已被本节取代。

记录时保存文件系统身份；打开工作台、刷新列表或通过带 locationId 的按钮定位时，原路径丢失会在 trackingRoot 内自动找回同盘移动/重命名的文件并更新路径。默认 trackingRoot 为原父文件夹；可通过 record_file_location 指定软件/项目根目录，最多搜索 5 层、每次刷新共 5000 个条目，不跟随目录链接，不扫描整盘。跨盘移动、移出范围、无文件标识或身份有歧义时，点击“重新选择位置”更新原标注；旧路径被其他文件占用时不会自动当作原文件。

软件版本面板新增“选择软件文件”“选择软件文件夹”；产出区可“选择并标注产出文件”。通过 choose_path 开启原生对话框，get_path_selection 按 requestId 读取结果；不阻塞聊天，取消保留原路径。Windows 原生辅助程序由系统 .NET 编译器从随插件打包的源码在本机生成，无下载依赖；若系统禁用本机编译或无法显示交互窗口，会返回失败，仍可手工输入路径。

本项目交付物是 **Codex 插件**。后续待做的是“更新并验收 Codex 已安装的插件副本”，不是另做一个客户端程序。官方打包说明：https://developers.openai.com/plugins/build/plugins 。

### 任务驱动的软件与资料接口（2026-10-19）

AI 可通过 `create_task_software` 显式传入研究摘要及需求软件；插件不读取聊天。`inspect_task_software` 检测，`select_task_installation` 选择安装，`get_task_software` 返回任务相关清单。建议/计划、候选、确认本机软件和明确报告的实际使用分开保存；未知或歧义软件不会被丢弃。`open_bioinfo_assistant({taskId})` 可展示该任务的清单。

版本现在分别返回 `fileVersion`、`launcherVersion`、`applicationVersion`；兼容字段 `version` 仅表示有依据的应用版本。AliView 实测启动器 1.32.47、应用 1.32；BEAST 从所选 EXE/JAR 的应用资源读取套件版本 1.8.3。没有适配器时待确认，不执行任意版本参数。

`get_software_materials` 返回本地核验目录及已补充资料；缺失或版本不匹配时给 AI 明确的 researchRequest。AI 搜索核验后可用 `supplement_software_materials` 补充带来源、日期、版本范围和推荐证据的数据；插件做结构/一致性校验，记录调用者核验来源，不冒称独立实时联网查询。

`export_task_citations` 使用已选安装的应用版本；引用导出的 `text` 包含 warnings/unresolved，一键引用也显示并复制这些提示。`bibliographyText` 是给设计者分别排版用的正文，不应独自复制而遗漏警告。

完整参数、返回状态、真实链路验证命令及 Codex 原生选择框的人工验收步骤见 [功能接口与验收交接](docs/function-api.md)。

## 界面设计审阅

运行 `node scripts/preview-design.mjs` 打开本机 8796 端口的模拟宿主预览。安装、路径与运行状态均醒目标为测试数据，不写入真实产品目录。实际目录及 MCP 工具预览使用 `node src/preview.mjs`。

纯白底与群青点缀的界面支持任务软件需求、多安装选择、应用版本及来源、论文/官网、带提示的批量引用导出、位置重新关联和按需运行快照。详见 [界面交接](docs/UI-DESIGN-HANDOFF.md) 和 [功能接口](docs/function-api.md)。

浏览器检查使用 `node scripts/check-ui.mjs`（安装 Playwright 后运行；可用 PLAYWRIGHT_PACKAGE_JSON 指向已有包，BROWSER_CHANNEL 指定浏览器）。真实 Codex 安装中的原生选择确认/取消仍待人工验收。
