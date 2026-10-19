import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { locateSoftware } from '../src/locate.mjs';

const file = { isSymbolicLink:()=>false, isDirectory:()=>false, isFile:()=>true };
test('manual exact path accepts renamed EXE and preserves identity inspection', async()=>{
 const target=path.resolve('renamed.exe');
 const result=await locateSoftware('"'+target+'"','rdp4',{lstat:async()=>file,inspect:async(id,file)=>({id,executablePath:file,identity:'unverified',version:null,reason:'身份不匹配'})});
 assert.equal(result.candidates[0].identity,'unverified');
 assert.equal(result.candidates[0].executablePath,target);
 assert.equal(result.candidates[0].version,null);
});
test('manual unknown software and scripts remain unverified without execution',async()=>{
 for(const name of ['custom.exe','custom.jar','mafft.bat','custom.cmd']){
  const result=await locateSoftware(path.resolve(name),undefined,{lstat:async()=>file,inspect:async()=>{throw Error('must not run')}});
  assert.equal(result.status,'file_found');assert.equal(result.candidates[0].identity,'unverified');
 }
 assert.equal((await locateSoftware(path.resolve('app.lnk'),undefined,{lstat:async()=>file})).status,'unsupported_file');
});
test('manual lookup handles missing paths, access errors and directory fallback',async()=>{
 for(const [code,status] of [['ENOENT','not_found'],['EACCES','unreadable']]){
  assert.equal((await locateSoftware(path.resolve('missing'),undefined,{lstat:async()=>{throw Object.assign(Error(),{code})}})).status,status);
 }
 const result=await locateSoftware(path.resolve('tools'),'rdp4',{lstat:async()=>({...file,isDirectory:()=>true}),discover:async()=>({candidates:[{id:'beast'}]})});
 assert.equal(result.nextAction,'provide_exact_file');assert.deepEqual(result.candidates,[]);
 await assert.rejects(()=>locateSoftware('relative'),/绝对/);
 await assert.rejects(()=>locateSoftware(path.resolve('x'),'unknown'),/未登记/);
});
