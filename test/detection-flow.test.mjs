import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

test('discovered custom paths survive reopening and are reused by pathless inspection', {skip:process.platform!=='win32'}, async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'bio-detection-'));
 const file=path.join(root,'mafft.bat');
 await writeFile(file,'@echo MUST_NOT_EXECUTE');
 async function session(run){
  const client=new Client({name:'detection-regression',version:'1'});
  try{
   await client.connect(new StdioClientTransport({command:process.execPath,args:[process.env.BIOINFO_TEST_SERVER||'src/server.mjs'],env:{...process.env,PATH:'',BIOINFO_ASSISTANT_DATA_DIR:path.join(root,'data')}}));
   await run(async(name,args={})=>{const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r));return r.structuredContent});
  }finally{await client.close()}
 }
 try{
  await session(async call=>{
   assert.equal((await call('inspect_software',{id:'mafft'})).inspection.status,'not_found');
   const found=(await call('discover_software',{roots:[root]})).discovery;
   assert.equal(found.candidates.length,1);
   assert.equal(found.candidates[0].identity,'unverified');
  });
  await session(async call=>{
   await test('reopened workspace presents saved candidates without asserting identity',async()=>{
    const row=(await call('open_bioinfo_assistant')).software.find(s=>s.id==='mafft');
    assert.equal(row.inspection?.candidates[0].executablePath,file);
    assert.equal(row.inspection.identity,'unverified');
    assert.equal(row.inspection.version,null);
   });
   await test('detect installation rechecks the saved custom path',async()=>{
    const result=(await call('inspect_software',{id:'mafft',allInstallations:true})).inspection;
    assert.equal(result.status,'found');
    assert.ok(result.candidates.some(c=>c.executablePath===file));
    assert.equal(result.identity,'unverified');
   });
  });
 }finally{await rm(root,{recursive:true,force:true})}
});
