import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { html, workspace } from '../src/mcp.mjs';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON || new URL('../package.json',import.meta.url));
const {chromium}=require('playwright');
const data=workspace();
data.software=[{...data.software[0],locations:[{kind:'software',label:'RDP4',path:'D:\\tools\\rdp4.exe'}]}];
data.outputLocations=[{kind:'output',label:'Test output only',path:'D:\\results\\alignment.fasta'}];
const host=`<style>body{margin:0}iframe{width:100%;height:1100px;border:0}</style><iframe src="/"></iframe><script>
 window.calls=[];window.fail=false;window.runState='running';window.pickCancel=false;
 addEventListener('message',e=>{const frame=document.querySelector('iframe');if(e.source!==frame.contentWindow)return;const m=e.data;const reply=r=>e.source.postMessage({jsonrpc:'2.0',id:m.id,result:r},'*');
 if(m.method==='ui/initialize')reply({protocolVersion:'2026-01-26',hostInfo:{name:'fixture',version:'1'},hostCapabilities:{}});
 if(m.method==='ui/notifications/initialized')e.source.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:${JSON.stringify(data)}}},'*');
 if(m.method==='tools/call'&&m.params.name==='choose_path'){reply({structuredContent:{selection:{requestId:'fixture-pick',status:'pending'}}});return;}
 if(m.method==='tools/call'&&m.params.name==='get_path_selection'){reply({structuredContent:{selection:window.pickCancel?{status:'cancelled'}:{status:'selected',path:'D:\\\\tools\\\\chosen.exe'}}});return;}
 if(m.method==='tools/call'&&m.params.name==='inspect_running_software'){window.calls.push(m.params);reply(window.fail?{isError:true,content:[{type:'text',text:'Test process query failure'}]}:{structuredContent:{runtime:{status:window.runState,reason:window.runState==='running'?'匹配进程；不代表分析完成':'未观察到匹配进程',checkedAt:'test-snapshot',processes:window.runState==='running'?[{pid:42}]:[]}}});return;}
 if(m.method==='tools/call'){window.calls.push(m.params);reply(window.fail?{isError:true,content:[{type:'text',text:'Test missing path'}]}:{structuredContent:{location:{status:'reveal_requested',reason:'定位测试请求已发送'}}});}
 });</script>`;
const server=createServer((req,res)=>res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(req.url==='/host'?host:html));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 const page=await browser.newPage({viewport:{width:1100,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/host`);const frame=page.frameLocator('iframe');
 await frame.getByRole('button',{name:'版本',exact:true}).click();
 await frame.getByRole('button',{name:'一键定位',exact:true}).click();
 await frame.getByText('定位测试请求已发送',{exact:true}).waitFor();
 assert.deepEqual((await page.evaluate(()=>window.calls))[0],{name:'reveal_path',arguments:{path:'D:\\tools\\rdp4.exe'}});
 await frame.getByRole('textbox',{name:'搜索软件'}).fill('RDP4');
 await frame.getByRole('button',{name:'任务记录',exact:true}).click();
 await frame.getByText('已标注的产出位置',{exact:true}).waitFor();
 await frame.getByRole('button',{name:'一键定位',exact:true}).click();
 await page.waitForFunction(()=>window.calls.length>=2);
 assert.equal((await page.evaluate(()=>window.calls))[1].arguments.path,'D:\\results\\alignment.fasta');
 await page.evaluate(()=>{window.fail=true});
 await frame.getByRole('button',{name:'一键定位',exact:true}).click();
 await frame.getByText('定位失败：Test missing path',{exact:true}).waitFor();
 assert.equal(await frame.getByRole('button',{name:'一键定位',exact:true}).isDisabled(),false);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.frames()[1].evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await mkdir('runtime',{recursive:true});await page.screenshot({path:'runtime/locations-narrow.png',fullPage:true});
 await page.evaluate(()=>{window.fail=false});
 await frame.getByRole('button',{name:'软件清单',exact:true}).click();
 await frame.getByRole('button',{name:'版本',exact:true}).click();
 await frame.getByRole('button',{name:'检测运行状态',exact:true}).click();
 await frame.getByText('运行快照：running',{exact:false}).waitFor();
 const last=await page.evaluate(()=>window.calls.at(-1));assert.equal(last.name,'inspect_running_software');assert.equal(last.arguments.id,'rdp4');assert.equal(last.arguments.executablePath,'D:\\tools\\rdp4.exe');
 await page.evaluate(()=>{window.runState='not_observed'});
 await frame.getByRole('button',{name:'检测运行状态',exact:true}).click();
 await frame.getByText('运行快照：not_observed',{exact:false}).waitFor();
 await page.evaluate(()=>{window.fail=true});
 await frame.getByRole('button',{name:'检测运行状态',exact:true}).click();
 await frame.getByText('运行状态：无法确认 · Test process query failure',{exact:true}).waitFor();
 assert.equal(await frame.getByRole('button',{name:'检测运行状态',exact:true}).isDisabled(),false);
 await page.screenshot({path:'runtime/processes-narrow.png',fullPage:true});
 await page.evaluate(()=>{window.fail=false});
 await frame.getByRole('button',{name:'选择软件文件',exact:true}).click();
 await frame.getByRole('textbox',{name:'RDP4 可执行文件路径'}).waitFor();
 await frame.getByText('已选择路径，请点击检测本机版本',{exact:true}).waitFor();
 assert.equal(await frame.getByRole('textbox',{name:'RDP4 可执行文件路径'}).inputValue(),'D:\\tools\\chosen.exe');
 await page.evaluate(()=>{window.pickCancel=true});
 await frame.getByRole('button',{name:'选择软件文件',exact:true}).click();
 await frame.getByText('已取消，保留原路径',{exact:true}).waitFor();
 assert.equal(await frame.getByRole('textbox',{name:'RDP4 可执行文件路径'}).inputValue(),'D:\\tools\\chosen.exe');
 assert.deepEqual(errors,[]);console.log('Software/output location bridge, error recovery and narrow layout checks passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
