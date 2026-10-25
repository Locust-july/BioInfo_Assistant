import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { listSoftware } from './catalog.mjs';
import { inspectSoftware } from './inspect.mjs';
import { discoverSoftware } from './discover.mjs';
import { locateSoftware } from './locate.mjs';
import {registerTaskTools} from './task-tools.mjs';
import {getTaskSoftware} from './task-software.mjs';
import {getMaterials} from './materials.mjs';
import { exportCitations } from './citations.mjs';
import { describeLocation, revealLocation, locations } from './locations.mjs';
import { getSoftware } from './catalog.mjs';
import { pathPicker } from './picker.mjs';
import { inspectRunningSoftware } from './processes.mjs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
export const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
function savedInspection(records) {
 const candidates=records.filter(l=>l.status==='file').map(l=>({
   ...(l.inspection || {id:l.softwareId,status:'found',identity:'unverified',version:null,applicationVersion:{status:'unknown',version:null},reason:'已保存的文件候选；请检测安装以核验身份和应用版本'}),
   executablePath:l.path, savedCandidate:true,
 }));
 if(!candidates.length)return undefined;
 const first=candidates.find(c=>['metadata_match','application_resource_match'].includes(c.identity)) || candidates[0];
 return {...first,candidates};
}
export const workspace = (taskId,marked=locations.list()) => {
 const task=taskId?getTaskSoftware(taskId):null;
  const relevant=task?task.requirements.filter(r=>r.resolution.status==='resolved').map(r=>({...getSoftware(r.resolution.softwareId),taskRequirementId:r.requirementId,version:r.selectedInstallation?.version||undefined,selectedInstallation:r.selectedInstallation})):listSoftware();
  return { product:'生信小助手',version:'0.1.0',scope:task?'task_software_list':'software_catalog',task,
    software:relevant.map(s=>{const saved=marked.filter(l=>l.kind==='software'&&l.softwareId===s.id);const inspection=savedInspection(saved);const materials=getMaterials({id:s.id,version:s.version || inspection?.version});return {...s,inspection,locations:saved,citations:materials.citations,materials,materialWarnings:materials.warnings};}),
    outputLocations:marked.filter(l=>l.kind==='output'),tasks:[],analysisAvailable:false };
};
function rememberCandidates(candidates) {
  for(const c of candidates || []) if(c.executablePath && c.id) locations.record({kind:'software',softwareId:c.id,path:c.executablePath,
    label:c.name || c.id,source:'detected_candidate',identity:c.identity || 'unverified',version:c.version || null,inspection:{...c,candidates:undefined}});
}
export function createMcpServer() {
  const server = new McpServer({ name: 'bioinfo-assistant', version: '0.1.0' });
  registerTaskTools(server);
  const uri = 'ui://bioinfo-assistant/workspace.html';
  server.registerTool('choose_path', {description:'打开 Windows 原生文件或文件夹选择窗口，立即返回 requestId。用户选择后用 get_path_selection 查询结果；取消不更改标注。',inputSchema:{mode:z.enum(['file','folder']).optional(),purpose:z.enum(['software','output']).optional(),initialDirectory:z.string().max(4096).optional()},annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false}},async args=>{try{const selection=pathPicker.begin(args);return {content:[{type:'text',text:'请在 Windows 选择窗口中选择或取消'}],structuredContent:{selection}};}catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}});
  server.registerTool('get_path_selection', {description:'查询系统路径选择窗口的状态或结果，不阻塞等待。selected 后可调用 locate_software 或 record_file_location；不自动运行文件。',inputSchema:{requestId:z.string().max(100)},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},async({requestId})=>{try{const selection=pathPicker.get(requestId);return {content:[{type:'text',text:selection.status}],structuredContent:{selection}};}catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}});

  server.registerTool('inspect_running_software', {
    description:'按需查询已登记 Windows 软件的运行进程快照。提供 executablePath 时按绝对 EXE/JAR 路径匹配；支持 BEAST 等部分 Java 入口识别。同名进程/无法核验路径仅作候选。返回 PID、启动时间、累计 CPU 时间和内存，不返回命令行。进程存在不等于分析推进/完成；不启动、终止或持续监控程序。',
    inputSchema:{id:z.string().min(1).max(80),executablePath:z.string().max(4096).optional()},
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
  },async({id,executablePath})=>{
    try {const runtime=await inspectRunningSoftware(id,executablePath);return {content:[{type:'text',text:runtime.reason || runtime.status}],structuredContent:{runtime}};}
    catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}
  });
  server.registerTool('reveal_path', {
    description: '一键追踪本机软件或产出文件位置：重新检查绝对路径，文件在 Windows 文件资源管理器中选中，文件夹直接打开。不运行目标文件。仅返回定位请求已发送，不能保证窗口已显示。',
    inputSchema: { path: z.string().min(1).max(4096),locationId:z.string().regex(/^[a-f0-9]{64}$/).optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({path,locationId})=>{
    try { if(locationId){const saved=(await locations.refresh()).find(r=>r.locationId===locationId);if(!saved)throw Error('位置标注不存在');if(!['file','directory'].includes(saved.status))return {content:[{type:'text',text:saved.reason||'原文件缺失或已被替换，请重新选择位置'}],structuredContent:{location:{...saved,reason:saved.reason||'原文件缺失或已被替换，请重新选择位置'}}};path=saved.path;}const location=await revealLocation(path);return {content:[{type:'text',text:location.reason}],structuredContent:{location}}; }
    catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}
  });
  server.registerTool('record_file_location', {
    description: '标注软件文件/文件夹或产出文件位置，保留标签、软件 id 和任务标识（可选）。保存于插件独立数据目录，重启保留；可传 trackingRoot 指定有限追踪目录、locationId 重新关联既有标注；登记产出不代表插件生成或验证分析结果。记录时检查存在性，不创建文件。',
    inputSchema: {locationId:z.string().regex(/^[a-f0-9]{64}$/).optional(),trackingRoot:z.string().max(4096).optional(),path:z.string().min(1).max(4096),kind:z.enum(['software','output']),label:z.string().max(200).optional(),softwareId:z.string().max(80).optional(),taskId:z.string().max(200).optional()},
    annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
  },async args=>{
    try {if(args.kind==='software'&&!args.softwareId)throw Error('软件位置请提供 softwareId');if(args.softwareId)getSoftware(args.softwareId);
      const checked=await describeLocation(args.path);const location=locations.record({...args,...checked,source:'manual_annotation'});
      return {content:[{type:'text',text:'已标注位置；当前状态：'+location.status}],structuredContent:{location}};
    }catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}
  });
  server.registerTool('list_file_locations', {
    description:'列出本次进程会话的软件与产出位置标注，并重新检查路径存在性；软件候选不等于已安装，产出标注不等于真实任务执行记录。',
    inputSchema:{},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
  },async()=>{
    const current=await locations.refresh();
    return {content:[{type:'text',text:JSON.stringify(current)}],structuredContent:{locations:current,persistence:'local_disk'}};
  });
  server.registerTool('export_citations', {
    description: '为明确选择的软件生成可一键复制的完整引用、BibTeX 或 DOI，并按 DOI 去重。传入实际应用版本以匹配论文代际；未确认版本/推荐关系会提示，版本不匹配或无资料会保留待办。不会将目录当成实际使用记录，不写剪贴板。',
    inputSchema: { selections: z.array(z.object({ id: z.string().min(1).max(80).optional(),name:z.string().max(200).optional(),doi:z.string().max(300).optional(), version: z.string().trim().min(1).max(80).optional() })).min(1).max(50), format: z.enum(['reference','bibtex','doi']).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ selections, format }) => {
    try { const result = exportCitations(selections, format); return { content: [{ type: 'text', text: result.text || '所选软件尚无匹配引用，请查看待确认信息' }], structuredContent: { citationExport: result } }; }
    catch (e) { return { isError: true, content: [{ type: 'text', text: e.message }] }; }
  });
  server.registerTool('locate_software', {
    description: '自动发现未找到时手动补充软件路径。path 为用户提供的绝对文件夹或 EXE/BAT/CMD/JAR 文件路径，可选 id 指定登记软件核验身份。支持重命名 EXE 和尚未登记的软件文件；不执行文件；候选路径会保存，可用 choose_path 打开系统选择窗口。',
    inputSchema: { path: z.string().trim().min(1).max(4096), id: z.string().min(1).max(80).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ path, id }) => {
    try { const location = await locateSoftware(path, id); rememberCandidates(location.candidates); return { content: [{ type: 'text', text: JSON.stringify(location) }], structuredContent: { location } }; }
    catch (e) { return { isError: true, content: [{ type: 'text', text: e.message }] }; }
  });
  server.registerTool('discover_software', {
    description: '在用户指定的软件目录中有限深度查找已登记软件候选。最多 10 个根目录、深度 3、5000 个条目；不扫描盘符根目录、不跟随链接、不运行程序。文件候选与身份/版本分别返回。',
    inputSchema: { roots: z.array(z.string().max(4096)).min(1).max(10) },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ roots }) => {
    try { const discovery = await discoverSoftware(roots); rememberCandidates(discovery.candidates); return { content: [{ type: 'text', text: JSON.stringify(discovery) }], structuredContent: { discovery } }; }
    catch (e) { return { isError: true, content: [{ type: 'text', text: e.message }] }; }
  });
  registerAppResource(server, 'workspace', uri, {}, async () => ({ contents: [{ uri, mimeType: RESOURCE_MIME_TYPE, text: html }] }));
  registerAppTool(server, 'open_bioinfo_assistant', {
    title: '打开生信小助手', description: '显示生信小助手工作台，查看已登记软件、版本资料和论文引用。登记不代表本机已安装；不执行分析。',
    inputSchema: {taskId:z.string().max(100).optional()}, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: uri }, 'openai/outputTemplate': uri },
  }, async ({taskId}) => {const marked=await locations.refresh();return { content: [{ type: 'text', text: '已打开软件资料目录。本机安装与分析能力需单独核验。' }], structuredContent: workspace(taskId,marked) };});
  server.registerTool('list_software', {
    description: '查询已核验的软件资料、论文引用和官方地址，不代表已安装或已适配。不匹配时返回空列表。',
    inputSchema: { query: z.string().max(200).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ query }) => ({ content: [{ type: 'text', text: JSON.stringify(listSoftware(query)) }], structuredContent: { software: listSoftware(query) } }));
  server.registerTool('inspect_software', {
    description: '检查已登记 Windows 软件的 PATH、固定常见安装位置或指定绝对 EXE 路径，分别读取文件属性和受限应用资源版本，不启动软件。文件存在不等于身份或可运行性已验证。',
    inputSchema: { id: z.string().max(80), executablePath: z.string().max(4096).optional(),allInstallations:z.boolean().optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ id, executablePath, allInstallations }) => {
    try { const knownPaths=executablePath?[]:(await locations.refresh()).filter(l=>l.kind==='software'&&l.softwareId===id&&l.status==='file').map(l=>l.path);const inspection = await inspectSoftware(id, executablePath,{collectAll:allInstallations,knownPaths}); rememberCandidates(inspection.candidates); return { content: [{ type: 'text', text: JSON.stringify(inspection) }], structuredContent: { inspection } }; }
    catch (e) { return { isError: true, content: [{ type: 'text', text: e.message }] }; }
  });
  return server;
}
