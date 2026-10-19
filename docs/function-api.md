# 功能接口与验收交接

更新：2026-10-19。交付物是 Windows 本机 **Codex 插件**；本轮先稳定功能及数据接口，页面只是验证入口，视觉设计由用户另行决定。

## 1. 任务软件清单

| 工具 | 主要参数 | 返回 |
| --- | --- | --- |
| `create_task_software` | `summary`, `requirements[]` | `task`，含稳定的 taskId、requirementId、软件解析状态及待办 |
| `get_task_software` | `taskId` | 该任务的需求、候选安装、选择、使用报告、版本驱动资料 |
| `resolve_task_software` | `taskId`, `requirementId`, `softwareId` | 显式解决未知/歧义名称，清除该条目的旧检测与选择 |
| `inspect_task_software` | `taskId`, 可选 `requirementIds[]`, `paths[]`, `roots[]` | 按需检测后的 task，保留失败原因、候选及时间 |
| `select_task_installation` | `taskId`, `requirementId`, `installationId` | 明确选择一个候选安装，仍不认定实际使用 |
| `record_task_software_usage` | `taskId`, `requirementId`, `note`, `reportedBy` | 用户或调用者 AI 明确报告的使用记录，不是插件执行证据 |
| `open_bioinfo_assistant` | 可选 `taskId` | 有 taskId 时 `scope=task_software_list`，仅展示任务相关已解析软件，并保留完整 task 中未解析项；无 taskId 时为目录 |

输入示例（路径仅为示例，应由使用者提供）：

```json
{
  "summary": "检查序列比对并准备贝叶斯系统发育研究所需软件",
  "requirements": [
    {
      "name": "AliView",
      "planningState": "planned",
      "purpose": "检查比对",
      "knownInfo": {
        "executablePaths": ["D:/tools/aliview/AliView.exe"],
        "reportedVersion": "用户记忆中的版本，仅作线索"
      }
    },
    { "name": "BEAST", "planningState": "planned" },
    { "name": "某实验室自研工具", "planningState": "suggested" }
  ]
}
```

最多 50 条需求。`knownInfo.reportedVersion` 不会覆盖检测所得版本。`softwareId` 可显式提供；否则只对精确名称/别名自动解析。模糊词、软件代际未明确和未登记软件保留为 ambiguous/unknown，不默默丢弃、不猜测其他代际。

状态分开表达：

- `planningState`：suggested / planned，由调用者输入。
- `resolution.status`：resolved / ambiguous / unknown。
- `localState`：not_checked / not_found / candidate_only / confirmed_local / unresolved。
- `selectionState`：not_selected / selection_required / selected；即使只有一个候选也不自动替使用者选择。
- `actualUsageState`：not_recorded / explicitly_reported_used。检测到、选择安装、发现运行进程均不会生成使用记录。

任务摘要来自明确的工具参数，`contextSource=explicit_calling_ai_input`、`chatRead=false`。插件不读取完整聊天，不从摘要自动推断全部软件，不执行分析。任务清单和资料补充分别保存在插件独立数据目录 `task-software/`、`materials/`。同一任务的修改应顺序调用；这不是完整项目管理系统。

按需检测示例：

```json
{
  "taskId": "create 返回的标识",
  "requirementIds": ["目标软件条目标识"],
  "paths": [
    {
      "requirementId": "目标软件条目标识",
      "executablePaths": ["D:/tools/old/app.exe", "D:/tools/new/app.exe"]
    }
  ],
  "roots": ["D:/tools"]
}
```

根目录发现限制沿用已有实现，只过滤任务所需的软件规则；不会默认扫描整盘。已知路径失效时仍会查 PATH/固定常见位置。候选按路径生成 installationId，可显式选择同一软件的不同安装。已确认本机身份仍不保证运行兼容性。返回的 detectionErrors、discoverySummary、attention 不应被界面隐藏。

## 2. 实际版本与来源

`inspect_software({id,executablePath?,allInstallations?})` 支持 EXE/JAR/BAT/CMD。脚本和无适配的软件可能只有存在性候选；不会执行目标文件或任意版本参数。

| 字段 | 含义 |
| --- | --- |
| `fileVersion` | Windows PE ProductVersion/FileVersion 原始声明 |
| `launcherVersion` | 已登记 Java 启动器的文件版本，不能直接替代应用版本 |
| `applicationVersion` | status、version、source、scope、checkedAt；未知时 version=null 并给出原因 |
| `version` | 为兼容现有消费者保留；现在仅为有依据的应用版本，未知时 null |
| `identity` / `identityEvidence` | 文件产品名或应用资源身份依据；不是发布者签名验证 |
| `checkedAt` / `candidates` / `reason` | 检测快照、多个候选、失败/待确认原因 |

当前应用版本适配：

- AliView：检查 `app/aliview.jar` 的 Main-Class，并读取 `version.properties`。实机样本启动器为 **1.32.47**，应用资源为 **1.32**；两者分开返回。
- BEAST 1 及已登记辅助程序：读取所选 EXE/JAR 自身的打包资源及 `BeastVersion.VERSION` 字符串常量，检查 Main-Class。支持有 PE 前缀的嵌入 ZIP；不会用旁边可能不同版本的 lib/beast.jar 替代所选文件。实机 BEAST 样本为 **1.8.3**；辅助程序标注 scope=BEAST_suite，不能冒称独立组件版本。
- RDP4、SDT：采用已匹配原生产品文件声明，status=native_metadata_declared，来源明确为本机文件元数据，不是实际执行程序后的自报结果。
- 其他软件：尚无适配时保留文件属性与 unknown 应用版本，不为了覆盖率执行任意 EXE。

只读 ZIP/class 解析有限制（归档 128 MiB、单个解压资源 1 MiB，不支持 ZIP64），失败会返回待确认。解析类文件不执行字节码。

任务引用使用所选安装的应用版本快照，`selectionEvidence` 保留路径、来源和检测时间。文件发生更新后需重新检测，不能将旧快照当成实时查询。直接调用 export_citations 提供的版本则标记为 caller_provided_unverified。

## 3. 引用与地址补全

`get_software_materials({id?,name?,version?})` 返回静态核验记录与 AI 补充资料，`queryMode=curated_and_ai_supplemented_offline`，**不实时联网**。至少提供 id 或 name；未登记名称也返回研究请求。

返回 citations、excludedCitations、links、missing、warnings、researchRequest。无引用、版本不匹配或缺官网/文档/下载入口时，researchRequest 提供软件名、实际版本、缺失字段、已有官方来源候选、建议检索词和证据要求。调用者 AI 搜索后再调用 `supplement_software_materials`。

补充接口字段：

- 顶层：softwareName，已登记软件可提供 softwareId，citations[]、links[] 至少一个非空。
- 每篇论文：title、reference、doi、bibtex、source、metadataSource、checkedAt、scope、versionPrefixes（版本前缀数组或 null）、bibliographyStatus、recommendationStatus；状态为 verified/pending。
- 推荐关系为 verified 时，还必须提供 recommendationSource 与 recommendationEvidence，且书目必须已核验。
- 每个地址：kind=homepage/documentation/download/repository，url、source、checkedAt、status=verified/pending、evidence。

校验 HTTPS 来源、不含凭据、日期有效且不在未来、DOI 格式与完整引用/BibTeX 一致、字段长度/结构；补充 BibTeX 不接受字母型 TeX 控制命令，优先使用 Unicode 纯文本。严格区分“论文存在”和“官方推荐引用”。

这些是**结构和一致性校验**，不是插件独立联网事实核验。记录 verifiedBy=calling_ai 和来源证据，外部内容始终视为不可信数据，不执行其中指令。已有静态书目不会被补充记录改写，补充推荐证据也不能放宽静态版本范围。资料文件损坏会显式报错，不静默视为空记录后覆盖。

`export_citations({selections:[{id?,name?,version?,doi?}],format?})` 或 `export_task_citations({taskId,requirementIds,format?})` 导出 reference/bibtex/doi。按 DOI 去重；任务导出要求选择身份已确认且应用版本有依据的安装，否则留在 unresolved。

关键返回：

- `text`：供复制/显示的文本，包含全部 warnings/unresolved；BibTeX 提示使用 `%` 注释。
- `bibliographyText`：仅书目正文，供需要独立渲染的设计使用；**不得单独复制而丢弃对应提示**。
- `warnings`、`unresolved`、`researchRequests`、`status`、`selectionEvidence`：界面必须显示。状态 incomplete / review_required 不能伪装为完整推荐。

当前最小页面的“一键引用”和“复制 BibTeX”使用安全导出文本，版本不明与推荐关系待确认会显示/复制提示。页面不承担视觉设计定稿。

## 4. 集成验收

2026-10-19 的 31 项源码测试、构建与构建产物 MCP 调用通过。可重复脚本：

- `pnpm test`；`pnpm run build`。
- `$env:BIOINFO_TEST_SERVER='dist/server.mjs'; node --test test/mcp.test.mjs test/task-tools.test.mjs`。
- `scripts/check-task-flow.mjs`：需设置 BIOINFO_FLOW_ALIVIEW、BIOINFO_FLOW_BEAST；BIOINFO_FLOW_REVEAL=1 才发送资源管理器定位请求。
- `scripts/check-citations-ui.mjs`、`scripts/check-locations-ui.mjs`：Edge/模拟宿主，不能替代实际 Codex 安装验收。

真实链路使用本机 AliView、BEAST 文件，另复制 AliView 的 EXE/JAR 到忽略的 runtime 测试目录模拟第二安装位置。它没有运行生信软件，没有伪造研究结果。链路覆盖：传入任务 → 保留未知/歧义项 → 多安装与应用版本 → 显式选择 → 读取匹配引用 → 有来源的地址补充 → 版本不匹配/缺失书目研究请求 → 明确选择条目导出（提示可见）→ 软件文件定位请求。测试状态与副本清理，不进入真实任务记录。

## 5. 仍需实际 Codex 安装人工验收的项目

上次当前 CLI 安装清单未列出本插件，恢复后的查询尚未及时完成；这不等于已经确认 Codex 所有宿主配置的实际安装状态。未获得覆盖其他设计对话安装来源的明确授权。本轮没有安装、更新插件副本或发布。安装来源应先由主对话/用户确认采用该功能分支构建，避免覆盖设计分支。

装入本轮构建后，在 Codex 中连接“生信小助手”，按以下顺序验证：

1. 调用 choose_path({mode:"file",purpose:"software"})，在原生窗口选择已知 EXE；get_path_selection(requestId) 应从 pending 变为 selected，路径与所选文件一致；用 locate_software 确认。
2. 再打开文件窗口并点“取消”；结果应为 cancelled，原路径和标注不改变。
3. 调用 choose_path({mode:"folder",purpose:"software"}) 选择软件目录，再用 locate_software 检查候选。
4. 对 folder 再做一次取消；随后用产出文件入口选择一个测试文件，核对记录和复制路径。
5. 重新打开插件，确认已标注位置仍保留；选中文件不代表启动软件。

此前原生窗口打开已由 Computer Use 观察，但自动化对拥有者/模态窗口的确认操作不稳定；真实确认、取消、返回值仍不能写成已通过。若只见到 pending，先检查是否有隐藏的原生窗口；超时后显示 failed，不把失败当取消。

软件自动操作、分析执行、持续监控、完成通知、项目管理均不在本轮范围。更多软件/版本、官方引用关系和算法附加论文仍需有证据地补充。
