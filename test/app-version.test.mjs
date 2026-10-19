import test from 'node:test';
import assert from 'node:assert/strict';
import {classVersion,zipEntry} from '../src/app-version.mjs';
import {inspectSoftware} from '../src/inspect.mjs';
import path from 'node:path';
const u2=n=>{const b=Buffer.alloc(2);b.writeUInt16BE(n);return b;};
const u4=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;};
const utf=s=>Buffer.concat([Buffer.from([1]),u2(Buffer.byteLength(s)),Buffer.from(s)]);
test('application class constant reader checks class identity and VERSION field',()=>{
 const bytes=Buffer.concat([u4(0xcafebabe),u2(0),u2(52),u2(8),utf('dr/app/beast/BeastVersion'),Buffer.from([7]),u2(1),utf('VERSION'),utf('Ljava/lang/String;'),utf('ConstantValue'),utf('1.8.3'),Buffer.from([8]),u2(6),u2(1),u2(2),u2(0),u2(0),u2(1),u2(25),u2(3),u2(4),u2(1),u2(5),u4(2),u2(7)]);
 assert.equal(classVersion(bytes,'dr/app/beast/BeastVersion'),'1.8.3');assert.throws(()=>classVersion(bytes,'unrelated/Class'),/identity/);assert.throws(()=>zipEntry(Buffer.alloc(30),'x'),/missing/);
});
test('embedded EXE/JAR offsets resolve the selected archive rather than an adjacent library',()=>{
 const name=Buffer.from('version.properties'),data=Buffer.from('version=1.32');
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
 const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50);directory.writeUInt32LE(data.length,20);directory.writeUInt32LE(data.length,24);directory.writeUInt16LE(name.length,28);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(directory.length+name.length,12);end.writeUInt32LE(local.length+name.length+data.length,16);
 const archive=Buffer.concat([local,name,data,directory,name,end]);
 assert.equal(zipEntry(archive,'version.properties').toString(),'version=1.32');
 assert.equal(zipEntry(Buffer.concat([Buffer.alloc(64),archive]),'version.properties').toString(),'version=1.32');
});
test('launcher version never substitutes application resource version',async()=>{
 const result=await inspectSoftware('aliview',path.resolve('AliView.exe'),{platform:'win32',stat:async()=>({isFile:()=>true}),probe:async()=>({ProductName:'AliView',ProductVersion:'1.32.47'}),appProbe:async()=>({status:'resource_verified',version:'1.32',source:{type:'application_resource'}})});
 assert.equal(result.version,'1.32');assert.equal(result.launcherVersion.productVersion,'1.32.47');assert.equal(result.versionScope,'application');
 const unknown=await inspectSoftware('aliview',path.resolve('AliView.exe'),{platform:'win32',stat:async()=>({isFile:()=>true}),probe:async()=>({ProductName:'AliView',ProductVersion:'1.32.47'}),appProbe:async()=>({status:'unknown',version:null})});
 assert.equal(unknown.version,null);assert.equal(unknown.launcherVersion.productVersion,'1.32.47');
});
