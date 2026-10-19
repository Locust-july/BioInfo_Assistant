import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLocation, describeLocation, revealLocation, createLocationRegistry } from '../src/locations.mjs';
const file={isDirectory:()=>false,isFile:()=>true};
test('path marking rejects nonlocal/shell paths and normalizes quoted Windows paths',()=>{
 assert.equal(normalizeLocation('"D:/tools/app.exe"'),'D:\\tools\\app.exe');
 for(const value of ['relative','https://x','shell:AppsFolder','\\\\server\\share','D:\\x\n.exe','D:\\x.exe:stream'])assert.throws(()=>normalizeLocation(value));
 const registry=createLocationRegistry();registry.record({path:'D:/tools/x.exe',kind:'software',softwareId:'rdp4'});registry.record({path:'d:/tools/x.exe',kind:'software',softwareId:'rdp4'});
 assert.equal(registry.list().length,1);const rows=registry.list();rows[0].path='changed';assert.notEqual(registry.list()[0].path,'changed');
});
test('reveal selects existing file, opens directory and never executes target',async()=>{
 const calls=[];const options={platform:'win32',stat:async()=>file,launch:async(exe,args)=>calls.push({exe,args})};
 assert.equal((await revealLocation('D:/tools/a & b.exe',options)).status,'reveal_requested');
 assert.match(calls[0].exe,/explorer\.exe$/i);assert.deepEqual(calls[0].args,['/select,','D:\\tools\\a & b.exe']);
 await revealLocation('D:/results',{...options,stat:async()=>({...file,isDirectory:()=>true,isFile:()=>false})});
 assert.deepEqual(calls[1].args,['D:\\results']);
});
test('deleted or unreadable output cannot trigger Explorer and launch failure is truthful',async()=>{
 const missing={platform:'win32',stat:async()=>{throw Object.assign(Error(),{code:'ENOENT'})},launch:async()=>{throw Error('must not launch')}};
 assert.equal((await revealLocation('D:/deleted.txt',missing)).status,'missing');
 assert.equal((await describeLocation('D:/denied',{stat:async()=>{throw Object.assign(Error(),{code:'EACCES'})}})).status,'unreadable');
 assert.equal((await revealLocation('D:/x',{platform:'win32',stat:async()=>file,launch:async()=>{throw Error('spawn failed')}})).status,'reveal_failed');
 assert.equal((await revealLocation('D:/x',{platform:'linux'})).status,'unsupported_platform');
});

test('output timestamps come from filesystem metadata and are never inferred completion times',async()=>{
 const created=Date.parse('2026-10-19T02:00:12.123Z'),modified=Date.parse('2026-10-19T02:43:27.456Z');
 const result=await describeLocation('D:/results/alignment.fasta',{stat:async()=>({...file,birthtimeMs:created,mtimeMs:modified})});
 assert.equal(result.fileCreatedAt,'2026-10-19T02:00:12.123Z');assert.equal(result.fileModifiedAt,'2026-10-19T02:43:27.456Z');assert.equal(result.fileTimestampsSource,'filesystem_stat');assert.equal(result.completedAt,undefined);
 const absent=await describeLocation('D:/missing.fasta',{stat:async()=>{throw Object.assign(Error(),{code:'ENOENT'})}});assert.equal(absent.fileModifiedAt,undefined);assert.equal(absent.exists,false);
 const unknown=await describeLocation('D:/results/no-times.txt',{stat:async()=>file});assert.equal(unknown.fileModifiedAt,null);
});
