// Development-only launcher; keeps the clearly labelled review host alive after this command exits.
import {spawn} from 'node:child_process';
import {mkdirSync,openSync,closeSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));const port=Number(process.env.DESIGN_PORT||8796);const url='http://127.0.0.1:'+port;
async function probe(){try{const r=await fetch(url,{signal:AbortSignal.timeout(1000)});const html=await r.text();if(!html.includes('生信小助手 · 设计审阅'))throw Error('端口已被其他服务占用：'+port);return true}catch(e){if(e.message.startsWith('端口'))throw e;return false}}
if(await probe()){console.log('设计审阅预览已运行：'+url);process.exit(0)}
mkdirSync(path.join(root,'runtime'),{recursive:true});const out=openSync(path.join(root,'runtime/design-preview.stdout.log'),'a');const err=openSync(path.join(root,'runtime/design-preview.stderr.log'),'a');
const child=spawn(process.execPath,['scripts/preview-design.mjs'],{cwd:root,env:{...process.env,DESIGN_PORT:String(port)},detached:true,windowsHide:true,stdio:['ignore',out,err]});child.on('error',e=>{console.error('启动失败：'+e.message);process.exitCode=1});child.unref();closeSync(out);closeSync(err);
for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,250));if(await probe()){console.log('设计审阅预览已启动：'+url+'（模拟数据）');process.exit(0)}}
console.error('预览启动超时，请查看 runtime/design-preview.stderr.log');process.exitCode=1;
