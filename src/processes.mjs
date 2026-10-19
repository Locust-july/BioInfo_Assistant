import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getSoftware, matchesExecutable } from './catalog.mjs';
import { normalizeLocation } from './locations.mjs';
const run=promisify(execFile);
const javaEntries={beast:'dr.app.beast.BeastMain',beauti:'dr.app.beauti.Beauti',tracer:'tracer.application.TracerApp',treeannotator:'dr.app.tools.TreeAnnotator',logcombiner:'dr.app.tools.LogCombiner',aliview:'aliview.AliView'};
const javaJars={beast:'beast.jar',tracer:'tracer.jar',aliview:'aliview.jar'};

async function readProcesses(software, options) {
 const env=options.env || process.env;
 const ps=path.win32.join(env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 const names=software.executableNames.filter(n=>n.endsWith('.exe'));
 // Pass identifiers as data; never interpolate paths or user text into PowerShell.
 const script=`$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new();
 $names=@($env:BIOINFO_PROCESS_NAMES | ConvertFrom-Json);$prefix=$env:BIOINFO_PROCESS_PREFIX;
 $java=$env:BIOINFO_PROCESS_JAVA -eq '1';
 $clauses=@($names | ForEach-Object {"Name = '$_'"});if($prefix){$clauses+="Name LIKE '$prefix%.exe'"};if($java){$clauses+="Name = 'java.exe'";$clauses+="Name = 'javaw.exe'"};$filter=$clauses -join ' OR ';
 $rows=@(Get-CimInstance Win32_Process -Filter $filter | ForEach-Object {
 [pscustomobject]@{pid=$_.ProcessId;parentPid=$_.ParentProcessId;name=$_.Name;executablePath=$_.ExecutablePath;commandLine=$(if($_.Name -in @('java.exe','javaw.exe')){$_.CommandLine}else{$null});startedAt=$(if($_.CreationDate){$_.CreationDate.ToUniversalTime().ToString('o')}else{$null});cpuSeconds=([double]$_.KernelModeTime+[double]$_.UserModeTime)/10000000;workingSetBytes=$_.WorkingSetSize}
 }); ConvertTo-Json -InputObject $rows -Compress`;
 const prefix={beast:'beast v',beauti:'beauti v',tracer:'tracer v',treeannotator:'treeannotator v',logcombiner:'logcombiner v',muscle:'muscle',phyml:'phyml_'}[software.id] || '';
 const {stdout}=await run(ps,['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{env:{...env,BIOINFO_PROCESS_NAMES:JSON.stringify(names),BIOINFO_PROCESS_PREFIX:prefix,BIOINFO_PROCESS_JAVA:javaEntries[software.id]?'1':'0'},windowsHide:true,timeout:8000,maxBuffer:2*1024*1024,encoding:'utf8'});
 const rows=JSON.parse(stdout.replace(/^\uFEFF/,'').trim());
 if(!Array.isArray(rows)) throw Error('进程查询返回格式异常');
 return rows;
}

export async function inspectRunningSoftware(id, executablePath, options={}) {
 const software=getSoftware(id);
 const target=executablePath ? normalizeLocation(executablePath) : null;
 const base={id,checkedAt:new Date().toISOString(),requestedPath:target,analysisState:'unknown',scope:'按需进程快照；不代表分析进度、响应性或成功完成，不启动/停止程序'};
 if((options.platform || process.platform)!=='win32') return {...base,status:'unsupported_platform',running:null,processes:[],candidates:[]};
 let rows;
 try {rows=await (options.probe || readProcesses)(software,options);if(!Array.isArray(rows))throw Error('进程查询格式异常');}
 catch(e){return {...base,status:'query_failed',running:null,processes:[],candidates:[],reason:'无法读取系统进程信息（权限、查询超时或系统服务不可用）；请在本机客户端重试',errorCode:String(e.code || 'PROCESS_QUERY_FAILED')};}
 const processes=[],candidates=[];
 for(const row of rows){
  let evidence=null;
  const named=matchesExecutable(software,row.name || '');
  if(named && target && row.executablePath && path.win32.normalize(row.executablePath).toLowerCase()===target.toLowerCase()) evidence='executable_path_match';
  const java=/^javaw?\.exe$/i.test(row.name || '');
  const command=java && typeof row.commandLine==='string' ? row.commandLine : '';
  // Match the Java entry point token, not arbitrary substrings or unrelated Java.
  const tokens=command.match(/"[^"\r\n]*"|[^\s"]+/g)?.map(t=>t.replace(/^"|"$/g,'')) || [];
  let main=null,jar=null;
  const valueOptions=new Set(['-cp','-classpath','--class-path','-p','--module-path','--upgrade-module-path','--add-modules','--add-exports','--add-opens','--add-reads','--patch-module','--limit-modules']);
  for(let i=1;i<tokens.length;i++){
    const token=tokens[i];
    if(token==='-jar'){jar=tokens[i+1];break;}
    if(token==='-m'||token==='--module'||token.startsWith('@'))break;
    if(valueOptions.has(token)){i++;continue;}
    if(token.startsWith('-'))continue;
    main=token;break;
  }
  const entry=!!javaEntries[id] && main===javaEntries[id];
  // Explicit JAR paths require -jar immediately followed by that exact path.
  // Some Windows launchers (including BEAST 1.8) are themselves JAR containers.
  const jarName=jar && ((javaJars[id] && path.win32.basename(jar).toLowerCase()===javaJars[id]) || matchesExecutable(software,path.win32.basename(jar)));
  if(java && target && jar && path.win32.isAbsolute(jar) && path.win32.normalize(jar).toLowerCase()===target.toLowerCase())evidence='java_jar_path_match';
  if(java && !target && entry)evidence='java_entrypoint_match';
  const likely=named || (java && (entry || jarName));
  if(!evidence && !likely)continue;
  const details={pid:row.pid,parentPid:row.parentPid,name:row.name,executablePath:row.executablePath || null,startedAt:row.startedAt || null,
    cpuSeconds:row.cpuSeconds != null && Number.isFinite(Number(row.cpuSeconds))?Number(row.cpuSeconds):null,workingSetBytes:row.workingSetBytes != null && Number.isFinite(Number(row.workingSetBytes))?Number(row.workingSetBytes):null,
    evidence:evidence || (target && row.executablePath && named ? 'different_executable_path' : 'candidate_only')};
  (evidence?processes:candidates).push(details);
 }
 return {...base,status:processes.length?'running':candidates.length?'candidate_processes':'not_observed',running:processes.length?true:null,processes,candidates,
   reason:processes.length?'已匹配运行进程；分析是否推进或完成仍待日志/结果核验':candidates.length?'发现同名或 Java 候选，尚不能确认目标软件实例':'本次查询未观察到匹配进程；权限限制、启动方式或进程已退出均可能影响结果'};
}
