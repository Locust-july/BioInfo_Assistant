import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discoverSoftware } from '../src/discover.mjs';

test('bounded discovery distinguishes EXE, script, directory and unrelated files', async () => {
 const root = await mkdtemp(path.join(os.tmpdir(), 'bio-discovery-'));
 try {
  await mkdir(path.join(root,'rdp4.exe'));
  await writeFile(path.join(root,'BEAST v1.8.3.exe'),'fixture');
  await writeFile(path.join(root,'mafft.bat'),'fixture');
  await writeFile(path.join(root,'unins000.exe'),'fixture');
  const calls=[];
  const result=await discoverSoftware([root],{inspect:async(id,file)=>{calls.push(file);return {id,identity:'unverified',version:null}}});
  assert.deepEqual(result.candidates.map(c=>c.id).sort(),['beast','mafft']);
  assert.equal(calls.length,1);
  assert.equal(result.candidates.find(c=>c.id==='mafft').version,null);
  assert.equal((await discoverSoftware([root],{maxEntries:1})).truncated,true);
  await assert.rejects(()=>discoverSoftware([path.parse(root).root]),/盘符/);
  await assert.rejects(()=>discoverSoftware(['relative']),/绝对/);
 } finally { await rm(root,{recursive:true,force:true}); }
});
