// Opt-in acceptance check. Run outside sandbox with an explicit installed BEAST EXE.
// Starts only an empty application, never passes analysis data; existing instances are preserved.
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const run=promisify(execFile);
const target=process.env.BIOINFO_NATIVE_EXE;
assert.ok(target && path.isAbsolute(target),'Set BIOINFO_NATIVE_EXE to an installed BEAST EXE');
assert.equal(process.platform,'win32');
const client=new Client({name:'native-runtime-acceptance',version:'1'});
const transport=new StdioClientTransport({command:process.execPath,args:[process.env.BIOINFO_TEST_SERVER || 'dist/server.mjs']});
const report={checkedAt:new Date().toISOString(),environment:'explicitly_run_outside_sandbox',id:'beast',checks:[],analysisExecuted:false};
let owned,launchError;
async function snapshot(){
 const result=await client.callTool({name:'inspect_running_software',arguments:{id:'beast',executablePath:target}});
 assert.equal(result.isError,undefined);const state=result.structuredContent.runtime;
 assert.notEqual(state.status,'query_failed');return state;
}
try{
 await client.connect(transport);
 const inspected=await client.callTool({name:'inspect_software',arguments:{id:'beast',executablePath:target}});
 assert.equal(inspected.structuredContent.inspection.identity,'metadata_match');
 report.checks.push({name:'installed_file_identity',version:inspected.structuredContent.inspection.version});
 report.before=await snapshot();
 if(report.before.processes.length || report.before.candidates.length){report.launch='skipped_existing_candidate';}
 else{
  owned=spawn(target,[],{cwd:path.dirname(target),windowsHide:true,stdio:'ignore'});
  owned.on('error',e=>{launchError=e.message});
  report.ownedPid=owned.pid;
  for(let i=0;i<8;i++){
   await new Promise(resolve=>setTimeout(resolve,1000));
   if(launchError)throw Error(launchError);
   report.during=await snapshot();
   if(report.during.running===true)break;
  }
  report.launch='empty_application_only';
  assert.equal(report.during?.running,true,'Empty BEAST application must produce a matching real process');
  report.checks.push({name:'real_running_positive',pids:report.during.processes.map(p=>p.pid)});
 }
}catch(e){report.failure=e.message;process.exitCode=1;}
finally{
 // Only our own still-live root and its process tree; never touch pre-existing instances.
 if(owned?.pid && owned.exitCode===null && !launchError){
  try{await run(path.win32.join(process.env.SystemRoot || 'C:\\Windows','System32','taskkill.exe'),['/PID',String(owned.pid),'/T','/F'],{windowsHide:true});report.cleanup='owned_test_tree_closed';}
  catch(e){report.cleanup='could_not_confirm_cleanup';report.cleanupCode=e.code;process.exitCode=1;}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 // A launcher may exit while its own Java child remains. Recheck parent and
 // creation timestamp before closing only children created by this test.
 if(owned?.pid && owned.exitCode!==null){
  const live=await snapshot();const children=[...live.processes,...live.candidates].filter(p=>p.parentPid===owned.pid && Date.parse(p.startedAt)>=Date.parse(report.checkedAt));
  for(const child of children){
   const current=await snapshot();const same=[...current.processes,...current.candidates].find(p=>p.pid===child.pid&&p.parentPid===owned.pid&&p.startedAt===child.startedAt);
   if(same){await run(path.win32.join(process.env.SystemRoot || 'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true});report.cleanup='owned_java_child_closed';}
  }
 }
 try{report.after=await snapshot();if(report.ownedPid)assert.ok(!report.after.processes.some(p=>p.pid===report.ownedPid));}
 catch(e){report.afterCheckError=e.message;process.exitCode=1;}
 await client.close();await mkdir('runtime',{recursive:true});
 await writeFile('runtime/native-runtime-acceptance.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({launch:report.launch,before:report.before?.status,during:report.during?.status,after:report.after?.status,cleanup:report.cleanup,failure:report.failure,report:'runtime/native-runtime-acceptance.json'},null,2));
}
