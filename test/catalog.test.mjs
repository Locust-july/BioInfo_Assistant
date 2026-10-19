import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { listSoftware } from '../src/catalog.mjs';
import { inspectSoftware } from '../src/inspect.mjs';

test('catalog keeps RDP4 release and citations separate from actual installation', () => {
  const [s] = listSoftware('rdp4');
  assert.equal(s.version, undefined);
  assert.equal(s.latestRelease.version, '4.101');
  assert.equal(s.citations[0].doi, '10.1093/ve/vev003');
  assert.deepEqual(s.operations, []);
  s.name='modified'; assert.equal(listSoftware('rdp4')[0].name,'RDP4');
  assert.deepEqual(listSoftware('unknown'), []);
});
test('detection does not identify an unrelated EXE as installed RDP4', async () => {
  const result=await inspectSoftware('rdp4',path.resolve('unrelated.exe'),{
    platform:'win32',stat:async()=>({isFile:()=>true}),probe:async()=>({ProductName:'Other app',ProductVersion:'99'})
  });
  assert.equal(result.identity,'unverified'); assert.equal(result.version,null);
});
test('metadata identity and version are returned without launching software', async () => {
  const result=await inspectSoftware('rdp4',path.resolve('RDP4.exe'),{
    platform:'win32',stat:async()=>({isFile:()=>true}),probe:async()=>({ProductName:'RDP4',ProductVersion:'4.101'})
  });
  assert.equal(result.identity,'metadata_match');assert.equal(result.version,'4.101');
});
test('missing PATH and unsupported software have explicit outcomes',async()=>{
  assert.equal((await inspectSoftware('rdp4',undefined,{platform:'win32',env:{PATH:''}})).status,'not_found');
  await assert.rejects(()=>inspectSoftware('unknown'),/未登记/);
  await assert.rejects(()=>inspectSoftware('rdp4','relative.exe',{platform:'win32'}),/绝对/);
});

test('discovery skips an unrelated PATH candidate and checks fixed installation locations', async () => {
 const visited=[];
 const result=await inspectSoftware('rdp4',undefined,{platform:'win32',env:{PATH:'C:\\tools',ProgramFiles:'C:\\Program Files'},stat:async file=>{visited.push(file);return {isFile:()=>true}},probe:async file=>({ProductName:file.includes('Program Files')?'rdp4':'Other',FileVersion:'4.101'})});
 assert.equal(result.identity,'metadata_match');
 assert.ok(result.executablePath.includes('Program Files'));
 assert.ok(result.candidates.some(c=>c.identity==='unverified'));
 assert.ok(visited.every(file=>file.endsWith('.exe')));
});
test('a directory is never treated as executable software', async()=>{
 const result=await inspectSoftware('rdp4',path.resolve('folder.exe'),{platform:'win32',stat:async()=>({isFile:()=>false}),probe:async()=>{throw Error('must not probe')}});
 assert.equal(result.status,'not_found');
});
