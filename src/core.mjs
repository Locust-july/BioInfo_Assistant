import path from 'node:path';
import os from 'node:os';

// Resolve paths only. Startup diagnostics must not modify managed plugin caches.
export function resolvePaths(env = process.env) {
  const custom = env.BIOINFO_ASSISTANT_DATA_DIR;
  if (custom && !path.isAbsolute(custom)) {
    throw new Error('BIOINFO_ASSISTANT_DATA_DIR 必须是绝对路径');
  }
  return {
    applicationRoot: path.resolve(import.meta.dirname, '..'),
    dataRoot: custom || path.join(env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'BioinfoAssistant'),
  };
}

export function diagnostics(env = process.env) {
  return {
    product: '生信小助手',
    targetVersion: '1.0',
    developmentVersion: '0.1.0',
    platform: process.platform,
    nodeVersion: process.version,
    paths: resolvePaths(env),
    targetClient: { name: 'ChatGPT', version: '26.1013.4894.0', mode: 'Work', source: 'user-reported' },
    connection: { status: 'unverified', reason: '尚无本项目 MCP 配置及真实工具调用记录' },
    adapters: [],
    analysisAvailable: false,
  };
}
