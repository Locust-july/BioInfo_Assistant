import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
test('stdio tool returns an interactive resource and truthful empty state', async () => {
 const client=new Client({name:'integration-test',version:'1.0.0'});
 const transport=new StdioClientTransport({command:process.execPath,args:[process.env.BIOINFO_TEST_SERVER || 'src/server.mjs']});
 try {
 await client.connect(transport);
 const {tools}=await client.listTools();
 const tool=tools.find(t=>t.name==='open_bioinfo_assistant');
 assert.ok(tool);
 const result=await client.callTool({name:tool.name,arguments:{}});
 assert.deepEqual(result.structuredContent.software,[]);
 assert.equal(result.structuredContent.analysisAvailable,false);
 const resource=await client.readResource({uri:tool._meta.ui.resourceUri});
 assert.match(resource.contents[0].mimeType,/text\/html/);
 assert.match(resource.contents[0].text,/生信小助手/);
 assert.match(resource.contents[0].text,/ui\/initialize/);
 const webVersion=await client.callTool({name:'get_client_version',arguments:{platform:'web'}});
 assert.equal(webVersion.structuredContent.clientVersion,'Web');
 assert.equal(webVersion.structuredContent.pluginVersion,'V1.0');
 const unknownVersion=await client.callTool({name:'get_client_version',arguments:{platform:'unknown'}});
 assert.equal(unknownVersion.structuredContent.clientVersion,'Error');
 } finally {await client.close();}
});

