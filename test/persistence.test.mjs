import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,writeFileSync,renameSync,rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLocationRegistry } from '../src/locations.mjs';
import { createPathPicker } from '../src/picker.mjs';
test('persistent records survive restart and track same-volume move/rename by file identity',{skip:process.platform!=='win32'},async()=>{
 mkdirSync('runtime',{recursive:true});const root=mkdtempSync(path.resolve('runtime','bio-persist-'));try{
 const directory=path.join(root,'state');const files=path.join(root,'files');mkdirSync(files);mkdirSync(path.join(files,'sub'));
 const original=path.join(files,'result.txt');writeFileSync(original,'fixture');
 const a=createLocationRegistry({directory});const marked=a.record({kind:'output',path:original,trackingRoot:files});
 const b=createLocationRegistry({directory});assert.equal(b.list()[0].path,original);
 const moved=path.join(files,'sub','renamed.txt');renameSync(original,moved);
 assert.equal((await b.refresh())[0].path,moved);assert.equal(b.list()[0].locationId,marked.locationId);
 assert.equal(createLocationRegistry({directory}).list()[0].path,moved);
 rmSync(moved);writeFileSync(original,'unrelated replacement');
 assert.equal((await b.refresh())[0].trackingStatus,'manual_relink_required');
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('picker is nonblocking, supports cancellation and prevents competing dialogs',async()=>{
 let done;const picker=createPathPicker({platform:'win32',launch:(exe,args,options,cb)=>{if(args.includes('-STA'))cb(null,'');else done=cb;}});
 const pending=picker.begin({mode:'folder'});assert.equal(pending.status,'pending');assert.throws(()=>picker.begin(),/已有/);
 await done(null,'{"status":"cancelled"}');assert.equal(picker.get(pending.requestId).status,'cancelled');
 const selected=picker.begin();await done(null,'{"status":"selected","path":"D:/tools/rdp4.exe"}');assert.equal(picker.get(selected.requestId).path,'D:\\tools\\rdp4.exe');
});
