import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
test('MCP task tools preserve unresolved names, task-only view and research/validation errors',async()=>{
 mkdirSync('runtime',{recursive:true});const root=mkdtempSync(path.resolve('runtime','task-mcp-'));
 const c=new Client({name:'task-interface-test',version:'1'});try{
 await c.connect(new StdioClientTransport({command:process.execPath,args:[process.env.BIOINFO_TEST_SERVER||'src/server.mjs'],env:{...process.env,BIOINFO_ASSISTANT_DATA_DIR:root}}));
 const created=await c.callTool({name:'create_task_software',arguments:{summary:'Validation fixture',requirements:[{name:'BEAST'},{name:'BEAST 2'},{name:'Unknown Test Tool'}]}});
 const task=created.structuredContent.task;assert.equal(task.requirements.length,3);assert.equal(task.requirements[1].resolution.status,'ambiguous');
 const view=await c.callTool({name:'open_bioinfo_assistant',arguments:{taskId:task.taskId}});assert.equal(view.structuredContent.software.length,1);assert.equal(view.structuredContent.scope,'task_software_list');
 const exported=await c.callTool({name:'export_task_citations',arguments:{taskId:task.taskId,requirementIds:task.requirements.map(r=>r.requirementId)}});assert.equal(exported.structuredContent.citationExport.status,'incomplete');assert.match(exported.content[0].text,/未解决/);
 const material=await c.callTool({name:'get_software_materials',arguments:{name:'Unknown Test Tool'}});assert.equal(material.structuredContent.materials.researchRequest.nextTool,'supplement_software_materials');
 const rejected=await c.callTool({name:'supplement_software_materials',arguments:{softwareName:'Unknown Test Tool',links:[{kind:'homepage',url:'https://example.org/tool',source:'https://example.org/tool',checkedAt:'2099-01-01',status:'verified',evidence:'fixture'}]}});assert.equal(rejected.isError,true);
 }finally{await c.close();assert.ok(root.startsWith(path.resolve('runtime')+path.sep));rmSync(root,{recursive:true,force:true});}
});
