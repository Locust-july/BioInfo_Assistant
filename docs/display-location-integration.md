# 工作台自动展开与文件时间归属

## 最终行为

插件清单版本 0.1.5 整合已在本机验收的展示声明与位置时间修复，以及提交前发现的刷新与重新关联并发修正。本机已验收的原组合安装为 0.1.4；新增版本明确区分本次交付。已有服务、package 及 UI 自报版本沿用 0.1.0，宿主版本独立显示。

工作台资源及页面初始化均声明 fullscreen，由支持该模式的宿主选择展示。无临时诊断或重复展开请求，不保证其他宿主的展示方式，也不保证跨聊天恢复同一面板。

位置刷新使用同一次 stat 读取身份与创建/修改时间，只有确认属于原文件时才更新其时间快照。刷新发现修改时间变化会持久保存快照，保留原标注时间；原路径被替换时不使用替换文件时间。缺失、不可读或替换时保留最后已确认的快照，无证据则返回 null；显式重新关联才采纳新选文件的身份与时间。

异步文件检查或追踪期间，若同一标注已被重新关联或修改标签，刷新会重读该条记录并重新检查，避免把旧路径或旧标签写回。重试有上限，持续变动时明确提示重试，不无限等待。覆盖内存及共享目录的多 registry 场景；这不是跨操作系统进程的事务保证，最终同步读取与原子替换之间仍没有独占锁。

新增字段：

| 字段 | 含义 |
| --- | --- |
| fileTimestampsStatus | current_identity_verified、last_known_identity_verified 或 unknown |
| fileTimestampsCheckedAt | 该文件时间快照的核验时间，与当前路径 checkedAt 区分 |

旧记录若身份及 filesystem_stat 来源足以确认同一快照，可使用其原标注时间作为兼容核验时间。文件创建/修改时间、标注时间、快照核验时间均不是分析完成时间。

## 验证

两组变更已有本机真实宿主记录：工作台自动展开、临时诊断移除、位置移动/缺失/替换与显式重新关联、客户端重启后的新增标注保留通过。替换例使用明显不同的修改时间，页面仍保留原文件最后已确认时间；恢复样本后既有 28 条位置记录指纹未变。机器路径、请求标识、截图及安装恢复资料仅保留本地。

自动化复验：

2026-11-03 整合分支本机复验：44/44 源码测试、构建、6/6 构建产物 MCP 测试、独立进程持久化/移动追踪检查及检测页面和既有设计浏览器回归通过。GitHub Actions 与正式宿主 B4 是独立验证边界，不能由上述本机结果替代。

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run build
$env:BIOINFO_TEST_SERVER = 'dist/server.mjs'
node --test test/mcp.test.mjs test/task-tools.test.mjs test/detection-flow.test.mjs test/location-time-mcp.test.mjs
Remove-Item Env:BIOINFO_TEST_SERVER
node scripts/check-detection-ui.mjs
node scripts/check-design-ui.mjs
```

浏览器回归依赖开发环境的 Playwright 和浏览器，设置方式见 README。位置回归使用独立临时样本，覆盖时间变化持久化、移动、替换、重启、缺失、显式重新关联及 stat 失败清除旧归属；不读取研究数据或执行生信软件。

后续 B4 仍须检查实际剪贴板许可和手动复制回退；资源管理器窗口选中、搜索预算耗尽尚未作为真实宿主验收通过。C 完整任务引用链路另行验收。本变更不声称全部 UI 或生信软件执行能力已完成。
