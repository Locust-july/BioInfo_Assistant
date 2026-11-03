import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,renameSync,utimesSync,statSync,rmSync} from 'node:fs';
import path from 'node:path';
import {createLocationRegistry} from '../src/locations.mjs';

test('identity-verified time snapshots survive refresh, move, replacement, restart and explicit relink',{skip:process.platform!=='win32'},async()=>{
 mkdirSync('runtime',{recursive:true});const root=mkdtempSync(path.resolve('runtime','identity-time-'));
 try{
  const files=path.join(root,'files'),directory=path.join(root,'state');mkdirSync(files);mkdirSync(path.join(files,'sub'));
  const original=path.join(files,'original.txt'),moved=path.join(files,'sub','moved.txt'),held=path.join(root,'held.txt');
  writeFileSync(original,'original');utimesSync(original,new Date('2020-01-01Z'),new Date('2020-01-01Z'));
  let registry=createLocationRegistry({directory});const marked=registry.record({kind:'output',path:original,trackingRoot:files});
  utimesSync(original,new Date('2021-01-01Z'),new Date('2021-01-01Z'));
  const live=(await registry.refresh())[0];assert.equal(live.fileModifiedAt,'2021-01-01T00:00:00.000Z');
  registry=createLocationRegistry({directory});assert.equal(registry.list()[0].fileModifiedAt,live.fileModifiedAt,'latest identity-verified refresh must persist');
  renameSync(original,moved);const relocated=(await registry.refresh())[0];assert.equal(relocated.locationId,marked.locationId);assert.equal(relocated.fileModifiedAt,live.fileModifiedAt);
  renameSync(moved,held);writeFileSync(moved,'replacement');utimesSync(moved,new Date('2022-01-01Z'),new Date('2022-01-01Z'));
  for(let i=0;i<2;i++){
   registry=createLocationRegistry({directory});const replaced=(await registry.refresh())[0];assert.equal(replaced.status,'replaced');assert.deepEqual(replaced.fileIdentity,marked.fileIdentity);assert.equal(replaced.fileCreatedAt,marked.fileCreatedAt);assert.equal(replaced.fileModifiedAt,live.fileModifiedAt);assert.equal(replaced.fileTimestampsStatus,'last_known_identity_verified');assert.ok(replaced.fileTimestampsCheckedAt);
  }
  const replacement=path.join(root,'replacement.txt');renameSync(moved,replacement);const missing=(await registry.refresh())[0];assert.equal(missing.status,'missing');assert.equal(missing.fileModifiedAt,live.fileModifiedAt);
  const linked=registry.record({kind:'output',path:replacement,locationId:marked.locationId});assert.equal(linked.fileModifiedAt,statSync(replacement).mtime.toISOString());assert.notDeepEqual(linked.fileIdentity,marked.fileIdentity);assert.equal(registry.list().length,1);assert.equal((await createLocationRegistry({directory}).refresh())[0].fileTimestampsStatus,'current_identity_verified');
  const absent=registry.record({...linked,path:path.join(root,'not-created.txt')});assert.equal(absent.fileModifiedAt,null);assert.equal(absent.fileIdentity,undefined);assert.equal(absent.fileTimestampsStatus,'unknown');
 }finally{assert.ok(root.startsWith(path.resolve('runtime')+path.sep));rmSync(root,{recursive:true,force:true});}
});
