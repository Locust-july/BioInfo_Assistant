// Opt-in real Windows integration. Supply installed AliView and BEAST EXEs via env.
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,copyFile,writeFile,rm} from 'node:fs/promises';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const ali=process.env.BIOINFO_FLOW_ALIVIEW,beast=process.env.BIOINFO_FLOW_BEAST;
assert.ok(ali&&beast,'Set BIOINFO_FLOW_ALIVIEW and BIOINFO_FLOW_BEAST to installed EXEs');
await mkdir('runtime',{recursive:true});const root=await mkdtemp(path.resolve('runtime','task-flow-'));
const second=path.join(root,'alternate','AliView.exe');await mkdir(path.dirname(second),{recursive:true});await mkdir(path.join(path.dirname(second),'app'));
await copyFile(ali,second);await copyFile(path.join(path.dirname(ali),'app','aliview.jar'),path.join(path.dirname(second),'app','aliview.jar'));
const client=new Client({name:'real-task-flow-acceptance',version:'1'});
const report={checkedAt:new Date().toISOString(),softwareExecuted:false,checks:[]};
await client.connect(new StdioClientTransport({command:process.execPath,args:['dist/server.mjs'],env:{...process.env,BIOINFO_ASSISTANT_DATA_DIR:path.join(root,'state')}}));
async function call(name,args,key){const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));return key?r.structuredContent[key]:r.structuredContent;}
try{
 const created=await call('create_task_software',{summary:'验收链路：准备序列检查与贝叶斯系统发育所需软件（不执行分析）',requirements:[
  {name:'AliView',knownInfo:{executablePaths:[ali,second]}},{name:'BEAST',knownInfo:{executablePaths:[beast]}},
  {name:'UnregisteredAligner-Validation'},{name:'BEAST 2'},{name:'BLAST',knownInfo:{executablePaths:[path.join(root,'no-blast.exe')]}}
 ]},'task');
 const taskId=created.taskId;assert.equal(created.chatRead,false);assert.equal(created.requirements[2].resolution.status,'unknown');assert.equal(created.requirements[3].resolution.status,'ambiguous');
 const detected=await call('inspect_task_software',{taskId},'task');const a=detected.requirements[0],b=detected.requirements[1];
 assert.equal(a.candidates.length,2);assert.ok(a.candidates.every(c=>c.version==='1.32'&&c.launcherVersion.productVersion==='1.32.47'));
 assert.equal(b.candidates[0].version,'1.8.3');assert.equal(detected.requirements[4].localState,'not_found');assert.equal(a.usage.length,0);
 report.checks.push('explicit task input / unknown / ambiguous / missing / two real AliView paths / launcher vs application versions');
 await call('select_task_installation',{taskId,requirementId:a.requirementId,installationId:a.candidates[0].installationId},'task');
 await call('select_task_installation',{taskId,requirementId:b.requirementId,installationId:b.candidates[0].installationId},'task');
 const material=await call('get_software_materials',{id:'aliview',version:'1.32'},'materials');assert.ok(material.citations.length);assert.ok(material.missing.includes('download'));
 const source='https://www.ormbunkar.se/aliview/index.html';
 await call('supplement_software_materials',{softwareId:'aliview',softwareName:'AliView',links:['homepage','documentation','download'].map(kind=>({kind,url:source,source,checkedAt:'2026-10-18',status:'verified',evidence:'官方 AliView 页面包含下载、安装和帮助信息；由本轮调用者 AI 核验页面，作为入口，不声称为直接下载文件。'}))},'materials');
 const completed=await call('get_software_materials',{id:'aliview',version:'1.32'},'materials');assert.deepEqual(completed.missing,[]);
 const mismatch=await call('get_software_materials',{id:'beast',version:'2.7'},'materials');assert.equal(mismatch.citations.length,0);assert.ok(mismatch.researchRequest);
 const missing=await call('get_software_materials',{id:'blast',version:'2.15'},'materials');assert.ok(missing.missing.includes('citation'));
 report.checks.push('official link supplement with caller provenance / matching references / version mismatch / missing bibliography research request');
 const exported=await call('export_task_citations',{taskId,requirementIds:[a.requirementId,b.requirementId],format:'bibtex'},'citationExport');assert.equal(exported.citations.length,2);assert.equal(exported.status,'ready');
 const unresolved=await call('export_task_citations',{taskId,requirementIds:[a.requirementId,created.requirements[2].requirementId]},'citationExport');assert.equal(unresolved.status,'incomplete');assert.match(unresolved.text,/未解决/);
 const warnings=await call('export_citations',{selections:[{id:'rdp4'}],format:'bibtex'},'citationExport');assert.match(warnings.text,/% 待确认/);
 const view=await call('open_bioinfo_assistant',{taskId});assert.equal(view.scope,'task_software_list');assert.ok(view.software.length<27);assert.equal(view.task.requirements.length,5);
 report.checks.push('version-driven task export / warnings copied visibly / task-only workspace');
 if(process.env.BIOINFO_FLOW_REVEAL==='1'){const revealed=await call('reveal_path',{path:ali},'location');assert.equal(revealed.status,'reveal_requested');report.checks.push('Explorer reveal request for selected actual AliView EXE');}
 report.result='passed';
}finally{
 await client.close();await writeFile('runtime/task-flow-report.json',JSON.stringify(report,null,2));assert.ok(root.startsWith(path.resolve('runtime')+path.sep));await rm(root,{recursive:true,force:true});
}
console.log(JSON.stringify(report,null,2));
