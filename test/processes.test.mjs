import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectRunningSoftware } from '../src/processes.mjs';
const query=(rows)=>({platform:'win32',probe:async()=>rows});
test('process paths distinguish multiple installations, snapshots never imply completion',async()=>{
 const rows=[{pid:1,name:'BEAST v1.8.3.exe',executablePath:'D:\\beast\\BEAST v1.8.3.exe',cpuSeconds:20},{pid:2,name:'BEAST v1.8.3.exe',executablePath:'C:\\other\\BEAST v1.8.3.exe'}];
 const result=await inspectRunningSoftware('beast','d:/beast/BEAST v1.8.3.exe',query(rows));
 assert.equal(result.running,true);assert.equal(result.processes[0].pid,1);assert.equal(result.candidates.length,1);assert.equal(result.analysisState,'unknown');
 const later=await inspectRunningSoftware('beast',undefined,query([]));assert.equal(later.status,'not_observed');assert.equal(later.running,null);
 assert.equal((await inspectRunningSoftware('beast',undefined,query(rows))).status,'candidate_processes');
});
test('Java matching excludes unrelated applications and argument-only class names',async()=>{
 const rows=[{pid:10,name:'java.exe',commandLine:'java -cp "D:\\beast\\beast.jar" dr.app.beast.BeastMain run.xml'},
 {pid:11,name:'java.exe',commandLine:'java -jar unrelated.jar dr.app.beast.BeastMain'},
 {pid:12,name:'javaw.exe',commandLine:'java -cp other.jar other.Main dr.app.beast.BeastMain'},
 {pid:13,name:'java.exe',commandLine:'java -jar unrelated.jar'}];
 const result=await inspectRunningSoftware('beast',undefined,query(rows));assert.deepEqual(result.processes.map(p=>p.pid),[10]);
 assert.ok(result.processes.every(p=>p.commandLine===undefined));
 const jar=await inspectRunningSoftware('beast','D:/beast/beast.jar',query([{pid:15,name:'java.exe',commandLine:'java -jar "D:\\beast\\beast.jar"'}]));
 assert.equal(jar.processes[0].evidence,'java_jar_path_match');
 const launcher=await inspectRunningSoftware('beast','D:/beast/BEAST v1.8.3.exe',query([{pid:16,name:'javaw.exe',commandLine:'"C:\\Program Files\\Java\\bin\\javaw.exe" -Xmx2048m -jar "D:\\beast\\BEAST v1.8.3.exe" -window -options'}]));
 assert.equal(launcher.processes[0].pid,16);assert.equal(launcher.processes[0].evidence,'java_jar_path_match');
});
test('unreadable process metadata and query failure remain unknown',async()=>{
 assert.equal((await inspectRunningSoftware('beast',undefined,query([{pid:8,name:'beast.exe'}]))).running,null);
 assert.equal((await inspectRunningSoftware('beast',undefined,{platform:'win32',probe:async()=>{throw Error('access denied')}})).status,'query_failed');
 assert.equal((await inspectRunningSoftware('beast',undefined,{platform:'linux'})).status,'unsupported_platform');
 await assert.rejects(()=>inspectRunningSoftware('unknown'),/未登记/);
});
