import path from 'node:path';
import { stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {readApplicationVersion} from './app-version.mjs';
import { getSoftware } from './catalog.mjs';
const run = promisify(execFile);

export async function inspectSoftware(id, executablePath, options = {}) {
  const software = getSoftware(id);
  const platform = options.platform ?? process.platform;
  if (platform !== 'win32') return { id, status: 'unsupported_platform',checkedAt:new Date().toISOString(),identity:'unverified',applicationVersion:{status:'unknown',version:null}, version: null, reason: '本机检测目前仅支持 Windows' };
  const env = options.env ?? process.env;
  const roots = [env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs')].filter(Boolean);
  const candidates = [...new Set(executablePath ? [executablePath] : [
    ...(env.PATH || '').split(path.delimiter).filter(Boolean).flatMap(dir => software.executableNames.map(name => path.join(dir.replace(/^"|"$/g, ''), name))),
    ...roots.flatMap(root => software.executableNames.map(name => path.join(root, software.name, name))),
  ])];
  const observations = [];
  if (executablePath && (!path.isAbsolute(executablePath) || !['.exe','.jar','.bat','.cmd'].includes(path.extname(executablePath).toLowerCase()))) throw new Error('请提供 软件文件的绝对 EXE/JAR/BAT/CMD 路径');
  const fileStat = options.stat ?? stat;
  for (const candidate of candidates) {
    try { if (!(await fileStat(candidate)).isFile()) continue; }
    catch (e) { if (['ENOENT', 'ENOTDIR'].includes(e.code)) continue; throw e; }
    // Read PE metadata only. Never launch an executable supplied by the caller.
    const probe = options.probe ?? (async file => {
      const ps = path.join(env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      const { stdout } = await run(ps, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command',
        "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new(); (Get-Item -LiteralPath $env:BIOINFO_INSPECT_FILE).VersionInfo | Select-Object ProductName,ProductVersion,FileVersion | ConvertTo-Json -Compress"],
        { env: { ...env, BIOINFO_INSPECT_FILE: file }, windowsHide: true, timeout: 10000, maxBuffer: 65536, encoding: 'utf8' });
      return JSON.parse(stdout.replace(/^\uFEFF/, '').trim());
    });
    try {
      const metadata = path.extname(candidate).toLowerCase()==='.exe' ? await probe(candidate) : {};
      let applicationVersion=await (options.appProbe || readApplicationVersion)(id,candidate);
      const fileVersion={productVersion:metadata.ProductVersion||null,fileVersion:metadata.FileVersion||null,source:'Windows_PE_version_info'};
      const product = metadata.ProductName || '';
      // A valid EXE path alone does not establish software identity.
      const metadataMatch = id === 'rdp4' ? /\bRDP\s*4\b|recombination detection program\s*4/i.test(product) : product.toLowerCase() === (software.product || software.name).toLowerCase();
      const verified=metadataMatch || (path.extname(candidate).toLowerCase()==='.jar'&&applicationVersion.status==='resource_verified');
      if(verified && ['rdp4','sdt'].includes(id))applicationVersion={status:'native_metadata_declared',version:metadata.ProductVersion||metadata.FileVersion||null,source:{type:'native_application_metadata',path:candidate},checkedAt:new Date().toISOString()};
      const actual=verified ? applicationVersion.version : null;
      const result = { id, status: 'found', executablePath: candidate, identity: verified ? (metadataMatch?'metadata_match':'application_resource_match') : 'unverified', identityEvidence:metadataMatch?{type:'PE_ProductName',value:product}:verified?applicationVersion.source:null,
        version: actual, applicationVersion, fileVersion, launcherVersion:['aliview','beast','beauti','tracer','treeannotator','logcombiner'].includes(id)?fileVersion:null,
        reportedVersion: metadata.ProductVersion || metadata.FileVersion || null,
        versionSource: actual ? applicationVersion.source.type : 'application_version_unconfirmed', versionScope: actual ? 'application' : 'unknown', productName: product,
        runnable: 'not_tested', reason: verified ? (actual?'身份匹配，应用版本有来源；尚未验证能否运行分析':'身份匹配，但应用版本待确认；文件/启动器版本不能替代应用版本') : '文件存在，但需确认确为所选软件；不能据此认定已安装', checkedAt: new Date().toISOString() };
      observations.push(result);
      if ((verified && !options.collectAll) || executablePath) return { ...result, candidates: observations };
    } catch (e) { observations.push({ id, status: 'metadata_unavailable', executablePath: candidate,identity:'unverified',version:null,fileVersion:null,applicationVersion:{status:'unknown',version:null,reason:'文件身份属性读取失败，无法确认应用版本'},checkedAt:new Date().toISOString(),reason:'文件存在但属性读取失败：'+(e.code||'metadata_read_failed') }); }
  }
  if (observations.length) return { ...(observations.find(c=>['metadata_match','application_resource_match'].includes(c.identity))||observations[0]), candidates: observations };
  return { id, status: 'not_found',checkedAt:new Date().toISOString(),identity:'unverified',applicationVersion:{status:'unknown',version:null}, nextAction: 'manual_locate', manualFallback: { tool: 'locate_software', accepts: ['absolute_directory', 'absolute_file'] }, version: null, candidates: [], reason: executablePath ? '指定路径不是存在的文件' : '未在 PATH 和 Program Files / LocalAppData 的软件固定子目录找到软件；请补充绝对 EXE 路径。未扫描磁盘或注册表。' };
}

