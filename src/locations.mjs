import path from 'node:path';
import { stat, readdir } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, renameSync, statSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { resolvePaths } from './core.mjs';
import { spawn } from 'node:child_process';

export function normalizeLocation(value) {
  const target = value.trim().replace(/^"(.*)"$/, '$1');
  if (!/^[a-z]:[\\/]/i.test(target) || /[\x00-\x1f"<>|?*]/.test(target) || target.slice(2).includes(':')) throw Error('请输入本机盘符开头的绝对文件或文件夹路径');
  return path.win32.normalize(target);
}

function fileTimes(info){const iso=(value,date)=>{if(value===undefined||value===null)return null;const n=Number(value);if(!Number.isFinite(n)||n<=0)return null;return date instanceof Date&&Number.isFinite(date.getTime())?date.toISOString():new Date(n).toISOString()};return {fileCreatedAt:iso(info.birthtimeMs,info.birthtime),fileModifiedAt:iso(info.mtimeMs,info.mtime),fileTimestampsSource:'filesystem_stat'}}
export async function describeLocation(value, options = {}) {
  const target = normalizeLocation(value);
  const base = { path: target, parentPath: path.win32.dirname(target), checkedAt: new Date().toISOString() };
  try {
    const info = await (options.stat || stat)(target);
    return { ...base,...fileTimes(info), status: info.isDirectory() ? 'directory' : info.isFile() ? 'file' : 'unsupported', exists: true,
      revealMode: info.isDirectory() ? 'open_directory' : info.isFile() ? 'select_file' : null };
  } catch (e) {
    return { ...base, status: ['ENOENT','ENOTDIR'].includes(e.code) ? 'missing' : 'unreadable', exists: false, revealMode: null, reason: e.code || e.message };
  }
}

export async function revealLocation(value, options = {}) {
  if ((options.platform || process.platform) !== 'win32') return { status: 'unsupported_platform', reason: '一键定位目前仅支持 Windows 文件资源管理器' };
  const location = await describeLocation(value, options);
  if (!location.revealMode) return { ...location, reason: '路径不存在、无法读取或不是普通文件/文件夹；请重新标注位置' };
  const explorer = path.win32.join(options.systemRoot || process.env.SystemRoot || 'C:\\Windows', 'explorer.exe');
  const args = location.revealMode === 'select_file' ? ['/select,', location.path] : [location.path];
  const launch = options.launch || ((exe, args) => new Promise((resolve,reject)=>{
    const child = spawn(exe,args,{shell:false,detached:true,stdio:'ignore'});
    child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});
  }));
  try { await launch(explorer,args); return { ...location, status: 'reveal_requested', reason: '已向文件资源管理器发送定位请求；尚未确认窗口显示结果' }; }
  catch(e) { return { ...location, status: 'reveal_failed', reason: e.message }; }
}

function fingerprint(info) { return {dev:String(info.dev),ino:String(info.ino),birthtimeMs:String(info.birthtimeMs)}; }
function sameFile(a,b){return a && b && a.ino!=='0' && a.dev===b.dev && a.ino===b.ino && a.birthtimeMs===b.birthtimeMs;}
// Per-record atomic files preserve unrelated updates from concurrent plugin processes.
export function createLocationRegistry({directory} = {}) {
  const records = new Map();
  function load(){if(!directory || !existsSync(directory))return;for(const name of readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.json$/.test(n))){const data=JSON.parse(readFileSync(path.join(directory,name),'utf8'));normalizeLocation(data.path);records.set(name.slice(0,-5),data);}}
  function save(key,value){if(!directory)return;mkdirSync(directory,{recursive:true});const temp=path.join(directory,key+'.'+randomUUID()+'.tmp');writeFileSync(temp,JSON.stringify(value,null,2),'utf8');renameSync(temp,path.join(directory,key+'.json'));}
  return {
    record(record) {
      load();
      const target=normalizeLocation(record.path);
      const duplicate=[...records.entries()].find(([,r])=>r.path.toLowerCase()===target.toLowerCase()&&r.kind===record.kind&&r.softwareId===record.softwareId&&r.taskId===record.taskId);
      const key=record.locationId || duplicate?.[0] || createHash('sha256').update([record.kind,record.softwareId || '',record.taskId || '',target.toLowerCase()].join('|')).digest('hex');
      if(!/^[a-f0-9]{64}$/.test(key))throw Error('位置标识无效');
      if(!records.has(key) && records.size>=500) throw Error('本机位置标注达到 500 条上限');
      let identity=record.fileIdentity,times={};try{const info=statSync(target,{bigint:true});identity=fingerprint(info);times=fileTimes(info);}catch{}
      const trackingRoot=normalizeLocation(record.trackingRoot || path.win32.dirname(target));
      const relative=path.win32.relative(trackingRoot,target);if(relative.startsWith('..')||path.win32.isAbsolute(relative))throw Error('标注路径必须位于追踪目录内');
      if(path.win32.parse(trackingRoot).root===trackingRoot)throw Error('追踪目录不能是整个盘符，请选择软件/项目文件夹');
      const location={...record,...times,locationId:key,path:target,trackingRoot,fileIdentity:identity,parentPath:path.win32.dirname(target),recordedAt:new Date().toISOString()};
      save(key,location);records.set(key,location); return structuredClone(location);
    },
    list() { load();return structuredClone([...records.values()]); },
    async refresh() {
      const result=[];let remaining=5000;
      for(const record of this.list()){
        const checked=await describeLocation(record.path);
        if(checked.exists){
          const identity=fingerprint(await stat(record.path,{bigint:true}));
          result.push({...record,...checked,...(record.fileIdentity&&!sameFile(record.fileIdentity,identity)?{status:'replaced',reason:'原路径现为另一文件，请重新选择确认'}:{})});continue;
        }
        if(checked.status!=='missing'){result.push({...record,...checked});continue;}
        let count=0,truncated=false;const matches=[];
        async function walk(dir,depth){
          if(remaining<=0){truncated=true;return;}
          try{for(const entry of await readdir(dir,{withFileTypes:true})){
            if(++count>5000 || --remaining<0){truncated=true;return;}if(entry.isSymbolicLink())continue;
            const candidate=path.join(dir,entry.name);const identity=fingerprint(await stat(candidate,{bigint:true}));
            if(sameFile(record.fileIdentity,identity))matches.push(candidate);
            if(entry.isDirectory()&&depth<5)await walk(candidate,depth+1);
          }}catch{}
        }
        if(record.fileIdentity)await walk(record.trackingRoot,0);
        if(matches.length===1&&!truncated){const moved=this.record({...record,path:matches[0],previousPath:record.path});result.push({...moved,...await describeLocation(moved.path),trackingStatus:'relocated'});}
        else result.push({...record,...checked,trackingStatus:truncated?'search_limit':matches.length>1?'ambiguous':'manual_relink_required',reason:'未能在追踪目录内唯一找回原文件，请重新选择位置'});
      }
      return result;
    },
  };
}
export const locations = createLocationRegistry({directory:path.join(resolvePaths().dataRoot,'locations')});
