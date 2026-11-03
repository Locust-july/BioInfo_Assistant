import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,utimesSync,readFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {createLocationRegistry} from '../src/locations.mjs';

for(const mode of ['memory','same registry','separate registry']){
 for(const update of ['relink','label']){
  test(`refresh preserves a newer ${update} from ${mode}`,{skip:process.platform!=='win32'},async()=>{
   const runtime=path.resolve('runtime');mkdirSync(runtime,{recursive:true});const root=mkdtempSync(path.join(runtime,'refresh-concurrency-'));
   try{
    const original=path.join(root,'original.txt'),selected=path.join(root,'selected.txt');
    writeFileSync(original,'original');writeFileSync(selected,'selected');
    utimesSync(original,new Date('2020-01-01Z'),new Date('2020-01-01Z'));
    utimesSync(selected,new Date('2022-01-01Z'),new Date('2022-01-01Z'));
    const directory=mode==='memory'?undefined:path.join(root,'state');
    const registry=createLocationRegistry({directory});
    const marked=registry.record({kind:'output',path:original,label:'old annotation',trackingRoot:root});
    utimesSync(original,new Date('2021-01-01Z'),new Date('2021-01-01Z'));
    // refresh() has captured the old record and yielded at its first real stat.
    const pending=registry.refresh();
    const writer=mode==='separate registry'?createLocationRegistry({directory}):registry;
    const updated=writer.record({...marked,path:update==='relink'?selected:original,label:'new annotation'});
    const [row]=await pending;
    const stored=(directory?createLocationRegistry({directory}):registry).list()[0];
    for(const actual of [row,stored]){
     assert.equal(actual.path,update==='relink'?selected:original,'refresh must not restore the previous path');
     assert.equal(actual.label,'new annotation','refresh must not restore the previous label');
     assert.equal(actual.recordedAt,updated.recordedAt,'refresh must preserve the newer annotation time');
     assert.equal(actual.fileModifiedAt,update==='relink'?'2022-01-01T00:00:00.000Z':'2021-01-01T00:00:00.000Z');
     assert.equal(actual.fileCreatedAt,updated.fileCreatedAt);
     assert.deepEqual(actual.fileIdentity,updated.fileIdentity);
    }
    assert.equal(row.status,'file');
    assert.equal(row.fileTimestampsStatus,'current_identity_verified');
   }finally{assert.ok(root.startsWith(runtime+path.sep));rmSync(root,{recursive:true,force:true});}
  });
 }
}

test('refresh leaves an unchanged persisted annotation intact',{skip:process.platform!=='win32'},async()=>{
 const runtime=path.resolve('runtime');mkdirSync(runtime,{recursive:true});const root=mkdtempSync(path.join(runtime,'refresh-unchanged-'));
 try{
  const original=path.join(root,'original.txt'),directory=path.join(root,'state');writeFileSync(original,'original');
  const registry=createLocationRegistry({directory}),marked=registry.record({kind:'output',path:original});
  const filename=path.join(directory,marked.locationId+'.json'),before=readFileSync(filename,'utf8');
  const [row]=await registry.refresh();
  assert.equal(row.recordedAt,marked.recordedAt);
  assert.equal(readFileSync(filename,'utf8'),before,'an unchanged refresh must not rewrite the snapshot check time');
 }finally{assert.ok(root.startsWith(runtime+path.sep));rmSync(root,{recursive:true,force:true});}
});
