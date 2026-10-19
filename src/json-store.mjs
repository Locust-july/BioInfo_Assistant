import path from 'node:path';
import { mkdirSync, existsSync, readFileSync, readdirSync, writeFileSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolvePaths } from './core.mjs';
export function jsonStore(namespace, root=resolvePaths().dataRoot) {
 const directory=path.join(root,namespace);
 function file(id){if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('记录标识无效');return path.join(directory,id+'.json');}
 return {
  get(id){const f=file(id);if(!existsSync(f))throw Object.assign(Error('记录不存在：'+id),{code:'RECORD_NOT_FOUND'});return JSON.parse(readFileSync(f,'utf8'));},
  list(){return existsSync(directory)?readdirSync(directory).filter(n=>/^[a-zA-Z0-9_-]{1,100}\.json$/.test(n)).map(n=>JSON.parse(readFileSync(path.join(directory,n),'utf8'))):[];},
  put(id,value){const f=file(id);mkdirSync(directory,{recursive:true});const tmp=f+'.'+randomUUID()+'.tmp';writeFileSync(tmp,JSON.stringify(value,null,2),'utf8');renameSync(tmp,f);return structuredClone(value);},
 };
}
