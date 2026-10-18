import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
export const PLUGIN_VERSION = 'V1.0';

// Only inspect the live ancestry of this MCP server. Another running GPT
// application must never be reported as the host of the current conversation.
export async function probeDesktopVersion() {
  if (process.platform !== 'win32') return null;
  const script = `
$ErrorActionPreference = 'Stop'
$targetProcessId = ${process.pid}
$seen = @{}
for ($depth = 0; $depth -lt 32; $depth++) {
  if ($seen.ContainsKey($targetProcessId)) { break }
  $seen[$targetProcessId] = $true
  $entry = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $targetProcessId)
  if (-not $entry) { break }
  if ($entry.Name -in @('ChatGPT.exe', 'Codex.exe') -and $entry.ExecutablePath) {
    $info = (Get-Item -LiteralPath $entry.ExecutablePath).VersionInfo
    if ($info.CompanyName -match 'OpenAI' -and $info.ProductName -match 'ChatGPT|Codex') {
      $package = Get-AppxPackage '*OpenAI*' | Where-Object { $_.InstallLocation -and $entry.ExecutablePath.StartsWith($_.InstallLocation.TrimEnd([char]92) + [char]92, [StringComparison]::OrdinalIgnoreCase) } | Select-Object -First 1
      if ($package -and $package.Version) {
        @{ version = [string]$package.Version; name = $info.ProductName } | ConvertTo-Json -Compress
        exit 0
      }
    }
  }
  if ($entry.ParentProcessId -eq 0) { break }
  $targetProcessId = [int]$entry.ParentProcessId
}
`;
  const { stdout } = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 7000, maxBuffer: 16384 });
  return stdout.trim() ? JSON.parse(stdout.replace(/^\uFEFF/, '').trim()) : null;
}

export async function getClientVersion(platform = 'unknown', probe = probeDesktopVersion) {
  const result = { clientVersion: 'Error', pluginVersion: PLUGIN_VERSION, checkedAt: new Date().toISOString() };
  if (platform === 'web') return { ...result, clientVersion: 'Web' };
  // Some desktop hosts omit the optional MCP Apps platform field. In that
  // case use the live server ancestry as evidence, never another running app.
  if (!['desktop', 'unknown'].includes(platform)) return { ...result, reason: 'unsupported_platform' };
  try {
    const current = await probe();
    if (current && /^\d+\.\d+\.\d+(\.\d+)?$/.test(current.version)) result.clientVersion = current.version;
    else result.reason = 'desktop_host_not_found';
  } catch { result.reason = 'desktop_probe_failed'; }
  return result;
}
