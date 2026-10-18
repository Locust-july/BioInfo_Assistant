import { createServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer, html, workspace } from './mcp.mjs';
import { getClientVersion } from './client-version.mjs';
const port = Number(process.env.PORT || 8787);
createServer(async (req, res) => {
  const host = req.headers.host?.split(':')[0];
  if (!['127.0.0.1', 'localhost'].includes(host)) { res.writeHead(403).end(); return; }
  if (req.headers.origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin)) {res.writeHead(403).end();return;}
  const route = new URL(req.url, 'http://localhost').pathname;
  if(req.method === 'GET' && route === '/') {res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
  if(req.method === 'GET' && route === '/api/workspace') {res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify(workspace()));return;}
  if(req.method === 'GET' && route === '/api/client-version') {
    const result = await getClientVersion('unknown');
    res.writeHead(200, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'}).end(JSON.stringify(result));return;
  }
  if(route !== '/mcp') {res.writeHead(404).end();return;}
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => { void transport.close(); void server.close(); });
  try {await server.connect(transport);await transport.handleRequest(req,res);} catch(e) {console.error(e);if(!res.headersSent)res.writeHead(500).end('MCP request failed');}
}).listen(port,'127.0.0.1',()=>console.log(`生信小助手预览：http://127.0.0.1:${port}`));
