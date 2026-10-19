# 软件引用资料核验记录

核验日期：2026-10-18。书目字段从 DOI 对应的 Crossref 注册元数据读取，保存为本地静态记录；产品使用时不自动访问网络。完整作者、标题、期刊、年份、卷期、页码/文章号、DOI 和 BibTeX 位于 src/citations-data.json。

“官方推荐关系”与“论文确实存在”分别记录。有官方证据才标为推荐关系已核验。目录候选和本机文件属性不代表实际使用，也不保证版本适用；引用具体模型、算法、插件、并行库时可能仍需补充论文。

| 软件 | DOI / 论文 | 适用范围 | 官方推荐证据 |
| --- | --- | --- | --- |
| rdp4 | [RDP4: Detection and analysis of recombination patterns in virus genomes](https://doi.org/10.1093/ve/vev003) | RDP4 软件论文；不能替代 RDP5 或具体方法论文。 | 待确认（当前只核验书目） |
| aliview | [AliView: a fast and lightweight alignment viewer and editor for large datasets](https://doi.org/10.1093/bioinformatics/btu531) | AliView 软件论文；文件启动器版本不用于判断论文适用性。 | [官方来源](https://www.ormbunkar.se/aliview/index.html) |
| beast, beauti | [Bayesian Phylogenetics with BEAUti and the BEAST 1.7](https://doi.org/10.1093/molbev/mss075) | BEAST 1.7/1.8 与 BEAUti 框架论文；不适用于 BEAST 2。模型/方法需另行引用。 | [官方来源](https://beast.community/first_tutorial) |
| treeannotator, logcombiner | [Bayesian Phylogenetics with BEAUti and the BEAST 1.7](https://doi.org/10.1093/molbev/mss075) | BEAST 1 套件框架论文候选；未核验为本辅助程序的独立官方推荐引用。 | 待确认（当前只核验书目） |
| tracer | [Posterior Summarization in Bayesian Phylogenetics Using Tracer 1.7](https://doi.org/10.1093/sysbio/syy032) | Tracer 1.7 系列；不用于 TreeTracer。 | [官方来源](https://beast.community/tracer.html) |
| mafft | [MAFFT Multiple Sequence Alignment Software Version 7: Improvements in Performance and Usability](https://doi.org/10.1093/molbev/mst010) | MAFFT 7 概述论文；特殊算法/选项可能需追加方法论文。 | [官方来源](https://mafft.ddbj.nig.ac.jp/alignment/software/) |
| muscle | [MUSCLE: multiple sequence alignment with high accuracy and high throughput](https://doi.org/10.1093/nar/gkh340) | MUSCLE 早期/3.x 软件论文候选；不能替代 MUSCLE 5 论文。官方推荐关系待复核。 | 待确认（当前只核验书目） |
| fasttree | [FastTree 2 – Approximately Maximum-Likelihood Trees for Large Alignments](https://doi.org/10.1371/journal.pone.0009490) | FastTree 2 系列；不用于旧版 FastTree 1。 | [官方来源](https://morgannprice.github.io/fasttree/) |
| phyml | [New Algorithms and Methods to Estimate Maximum-Likelihood Phylogenies: Assessing the Performance of PhyML 3.0](https://doi.org/10.1093/sysbio/syq010) | PhyML 3.0 软件论文；PhyTime/PhyREX 和其他方法另需引用。 | [官方来源](https://github.com/stephaneguindon/phyml) |
| mrbayes | [MrBayes 3.2: Efficient Bayesian Phylogenetic Inference and Model Choice Across a Large Model Space](https://doi.org/10.1093/sysbio/sys029) | MrBayes 3.2 系列；并行、BEAGLE 与具体模型可能需追加引用。 | [官方来源](https://nbisweden.github.io/MrBayes/manual.html) |
| raxml | [RAxML version 8: a tool for phylogenetic analysis and post-analysis of large phylogenies](https://doi.org/10.1093/bioinformatics/btu033) | RAxML 8；不用于 RAxML-NG 或未确认的旧版本。 | [官方来源](https://cme.h-its.org/exelixis/web/software/raxml/index.html) |
| simplot | [SimPlot++: a Python application for representing sequence similarity and detecting recombination](https://doi.org/10.1093/bioinformatics/btac287) | SimPlot++ 正式发表软件论文；不是原始 SimPlot 论文。官方推荐关系待复核。 | 待确认（当前只核验书目） |
| sdt | [SDT: A Virus Classification Tool Based on Pairwise Sequence Alignment and Identity Calculation](https://doi.org/10.1371/journal.pone.0108277) | SDT 软件论文；分类阈值与具体病毒分类规范需另行核验。 | [官方来源](https://web.cbio.uct.ac.za/~brejnev/) |
| clustalw | [Clustal W and Clustal X version 2.0](https://doi.org/10.1093/bioinformatics/btm404) | Clustal W/X 2.0 软件论文；不用于 ClustalW 1 或 Clustal Omega。官方推荐关系待复核。 | 待确认（当前只核验书目） |

## 接口与页面

- 页面软件卡片 → 引用论文 → 一键引用，复制完整参考文献；复制 BibTeX 用于文献管理器导入。剪贴板不被允许时显示手动选择提示。只修改原复制按钮名称，没有更改卡片布局。
- export_citations({selections:[{id,version?}],format:"reference"|"bibtex"|"doi"}) 返回 citationExport.text、citations、warnings、unresolved 和 status。仅对用户选择的软件按 DOI 去重，未知版本/官方推荐待确认返回 review_required，有缺失或代际不符返回 incomplete。不要忽略 warnings 和 unresolved。
- 所传 version 应为实际应用版本，不能把 Java 启动器文件版本当成应用版本。未传版本仍可预览/复制候选论文，但必须核对范围。
- 还未登记论文的软件（如本轮无真实样本的 BLAST+、IQ-TREE 等）继续显示待确认；不能把当前目录说成引用覆盖完整。

## 验证

当前项目 16 项测试、构建、构建产物 stdio MCP 引用导出通过。scripts/check-citations-ui.mjs 使用本轮页面与目录启动临时本机服务，通过 Edge 读回真实剪贴板核验完整引用和 BibTeX（Windows 换行归一化），并检查 390px 窄屏；截图在忽略的 runtime/citation-*.png。测试使用开发源码，不代表已安装插件副本通过验收。
