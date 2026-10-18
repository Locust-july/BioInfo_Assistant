import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { getClientVersion } from './client-version.mjs';
export const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
export const workspace = () => ({ product: '生信小助手', version: '0.1.0', software: [], tasks: [], analysisAvailable: false });
export function createMcpServer() {
  const server = new McpServer({ name: 'bioinfo-assistant', version: '0.1.0' });
  const uri = 'ui://bioinfo-assistant/workspace.html';
  server.registerTool('get_client_version', {
    title: '获取当前 GPT 客户端版本',
    description: '每次调用重新检查当前宿主版本。明确的网页宿主返回 Web；无法确认返回 Error。插件版本为 V1.0。',
    inputSchema: { platform: z.enum(['web', 'desktop', 'mobile', 'unknown']) },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async ({ platform }) => {
    const result = await getClientVersion(platform);
    return { content: [{ type: 'text', text: result.clientVersion }], structuredContent: result };
  });
  registerAppResource(server, 'workspace', uri, {}, async () => ({ contents: [{ uri, mimeType: RESOURCE_MIME_TYPE, text: html }] }));
  registerAppTool(server, 'open_bioinfo_assistant', {
    title: '打开生信小助手', description: '显示生信小助手交互工作台，查看软件清单和任务记录。目前未登记外部软件，不执行分析。',
    inputSchema: {}, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: uri }, 'openai/outputTemplate': uri },
  }, async () => ({ content: [{ type: 'text', text: '已打开生信小助手。当前尚未登记软件或运行任务。' }], structuredContent: workspace() }));
  return server;
}
