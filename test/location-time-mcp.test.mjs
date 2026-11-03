import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {mkdtempSync,mkdirSync,writeFileSync,renameSync,utimesSync,rmSync} from 'node:fs';
import path from 'node:path';

test('MCP restart preserves last verified original times during replacement and adopts explicit relink times',{skip:process.platform!=='win32'},async()=>{
 mkdirSync('runtime',{recursive:true});const root=mkdtempSync(path.resolve('runtime','time-mcp-'));let client;
 const connect=async()=>{client=new Client({name:'time-regression',version:'1'});await client.connect(new StdioClientTransport({command:process.execPath,args:[process.env.BIOINFO_TEST_SERVER||'src/server.mjs'],env:{...process.env,BIOINFO_ASSISTANT_DATA_DIR:path.join(root,'data')},stderr:'pipe'}));};
 const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});assert(!r.isError,JSON.stringify(r));return r.structuredContent;};
 try{
  const files=path.join(root,'files');mkdirSync(files);const original=path.join(files,'original.txt'),held=path.join(root,'held.txt');writeFileSync(original,'original');
  await connect();const {location}=await call('record_file_location',{kind:'output',path:original,trackingRoot:files});utimesSync(original,new Date('2021-01-01Z'),new Date('2021-01-01Z'));
  assert.equal((await call('list_file_locations')).locations[0].fileModifiedAt,'2021-01-01T00:00:00.000Z');await client.close();
  renameSync(original,held);writeFileSync(original,'replacement');utimesSync(original,new Date('2022-01-01Z'),new Date('2022-01-01Z'));
  for(let i=0;i<2;i++){
   await connect();const row=(await call('list_file_locations')).locations[0];assert.equal(row.status,'replaced');assert.equal(row.fileModifiedAt,'2021-01-01T00:00:00.000Z');assert.equal(row.fileTimestampsStatus,'last_known_identity_verified');assert.equal(row.fileCreatedAt,location.fileCreatedAt);await client.close();
  }
  await connect();const relink=await call('record_file_location',{kind:'output',path:original,locationId:location.locationId});assert.equal(relink.location.fileModifiedAt,'2022-01-01T00:00:00.000Z');assert.equal((await call('list_file_locations')).locations.length,1);
 }finally{await client?.close();assert.ok(root.startsWith(path.resolve('runtime')+path.sep));rmSync(root,{recursive:true,force:true});}
});
