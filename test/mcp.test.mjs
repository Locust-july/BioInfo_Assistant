import {mkdtempSync,statSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
test('stdio tools expose curated software, local inspection and interactive resource', async () => {
 const client=new Client({name:'integration-test',version:'1.0.0'});
 const transport=new StdioClientTransport({command:process.execPath,args:[process.env.BIOINFO_TEST_SERVER || 'src/server.mjs'],env:{...process.env,BIOINFO_ASSISTANT_DATA_DIR:mkdtempSync(path.join(os.tmpdir(),'bio-mcp-'))}});
 try {
 await client.connect(transport);
 const {tools}=await client.listTools();
 const tool=tools.find(t=>t.name==='open_bioinfo_assistant');
 assert.ok(tool);
 const runtime=await client.callTool({name:'inspect_running_software',arguments:{id:'beast'}});assert.ok(['running','candidate_processes','not_observed','query_failed','unsupported_platform'].includes(runtime.structuredContent.runtime.status));assert.equal(runtime.structuredContent.runtime.analysisState,'unknown');assert.ok(runtime.structuredContent.runtime.processes.every(p=>p.commandLine===undefined));
 const missingReveal=await client.callTool({name:'reveal_path',arguments:{path:'D:/bioinfo-missing-test-94a5/no-output.txt'}});assert.ok(['missing','unsupported_platform'].includes(missingReveal.structuredContent.location.status));
 if(process.env.BIOINFO_TEST_OUTPUT){
  const marked=await client.callTool({name:'record_file_location',arguments:{path:process.env.BIOINFO_TEST_OUTPUT,kind:'output',label:'Integration output fixture',taskId:'test-only'}});assert.equal(marked.structuredContent.location.status,'file');
  const listed=await client.callTool({name:'list_file_locations',arguments:{}});assert.ok(listed.structuredContent.locations.some(r=>r.kind==='output'&&r.status==='file'));
  const view=await client.callTool({name:'open_bioinfo_assistant',arguments:{}});assert.ok(view.structuredContent.outputLocations.some(r=>r.taskId==='test-only'));const output=view.structuredContent.outputLocations.find(r=>r.taskId==='test-only');assert.equal(output.fileModifiedAt,statSync(process.env.BIOINFO_TEST_OUTPUT).mtime.toISOString());assert.equal(output.fileTimestampsSource,'filesystem_stat');assert.ok(output.recordedAt);assert.equal(output.status,'file');
  if(process.env.BIOINFO_TEST_REVEAL==='1'){const revealed=await client.callTool({name:'reveal_path',arguments:{path:process.env.BIOINFO_TEST_OUTPUT}});assert.equal(revealed.structuredContent.location.status,'reveal_requested');}
 }

 const citations=await client.callTool({name:'export_citations',arguments:{selections:[{id:'beast',version:'1.8.3'},{id:'beauti',version:'1.8.3'}],format:'bibtex'}});assert.equal(citations.structuredContent.citationExport.citations.length,1);assert.match(citations.structuredContent.citationExport.text,/@article/);
 assert.ok(tools.find(t=>t.name==='discover_software'));
 assert.ok(tools.find(t=>t.name==='locate_software'));
 const manualInvalid=await client.callTool({name:'locate_software',arguments:{path:'relative'}});assert.equal(manualInvalid.isError,true);
 const badRoot=await client.callTool({name:'discover_software',arguments:{roots:['relative']}});assert.equal(badRoot.isError,true);
 if(process.env.BIOINFO_TEST_ROOT){const found=await client.callTool({name:'discover_software',arguments:{roots:[process.env.BIOINFO_TEST_ROOT]}});assert.equal(found.isError,undefined);assert.ok(found.structuredContent.discovery.candidates.some(c=>c.id==='rdp4'&&c.identity==='metadata_match'));}
 const result=await client.callTool({name:tool.name,arguments:{}});
 assert.equal(result.structuredContent.software[0].id,'rdp4');
 assert.equal(result.structuredContent.software[0].version,undefined);
 const search=await client.callTool({name:'list_software',arguments:{query:'unknown'}});
 assert.deepEqual(search.structuredContent.software,[]);
 const invalid=await client.callTool({name:'inspect_software',arguments:{id:'unknown'}});
 assert.equal(invalid.isError,true);
 if(process.env.BIOINFO_TEST_EXE){const manual=await client.callTool({name:'locate_software',arguments:{path:process.env.BIOINFO_TEST_EXE,id:'rdp4'}});assert.equal(manual.structuredContent.location.candidates[0].identity,'metadata_match');const actual=await client.callTool({name:'inspect_software',arguments:{id:'rdp4',executablePath:process.env.BIOINFO_TEST_EXE}});assert.equal(actual.structuredContent.inspection.identity,'metadata_match');assert.equal(actual.structuredContent.inspection.runnable,'not_tested');assert.ok(actual.structuredContent.inspection.version);}
 assert.equal(result.structuredContent.analysisAvailable,false);
 const resource=await client.readResource({uri:tool._meta.ui.resourceUri});
 assert.match(resource.contents[0].mimeType,/text\/html/);
 assert.match(resource.contents[0].text,/生信小助手/);
 assert.match(resource.contents[0].text,/ui\/initialize/);
 } finally {await client.close();}
});

