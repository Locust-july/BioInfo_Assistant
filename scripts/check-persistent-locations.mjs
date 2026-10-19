import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {mkdir,mkdtemp,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
await mkdir('runtime',{recursive:true});const root=await mkdtemp(path.resolve('runtime','persistent-mcp-'));
const data=path.join(root,'data'),files=path.join(root,'files');await mkdir(files);await mkdir(path.join(files,'moved'));
const original=path.join(files,'result.txt'),moved=path.join(files,'moved','renamed.txt');await writeFile(original,'test-only fixture');
let client;
async function connect(){const c=new Client({name:'persistent-acceptance',version:'1'});await c.connect(new StdioClientTransport({command:process.execPath,args:['dist/server.mjs'],env:{...process.env,BIOINFO_ASSISTANT_DATA_DIR:data}}));return c;}
try{
 client=await connect();const marked=await client.callTool({name:'record_file_location',arguments:{path:original,trackingRoot:files,kind:'output'}});const id=marked.structuredContent.location.locationId;
 await client.close();await rename(original,moved);
 client=await connect();const listed=await client.callTool({name:'list_file_locations',arguments:{}});
 assert.equal(listed.structuredContent.persistence,'local_disk');assert.equal(listed.structuredContent.locations[0].path,moved);assert.equal(listed.structuredContent.locations[0].locationId,id);
 const view=await client.callTool({name:'open_bioinfo_assistant',arguments:{}});assert.equal(view.structuredContent.outputLocations[0].path,moved);
 console.log('Real MCP process restart, moved/renamed file recovery and workspace display passed');
}finally{await client?.close();assert.ok(root.startsWith(path.resolve('runtime')+path.sep));await rm(root,{recursive:true,force:true});}
