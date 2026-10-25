// Real HTTP MCP + real filesystem fixture; no biological software is executed.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON||new URL('../package.json',import.meta.url));
const {chromium}=require('playwright');
const root=await mkdtemp(path.join(os.tmpdir(),'bio-detection-ui-'));
await writeFile(path.join(root,'mafft.bat'),'@echo MUST_NOT_EXECUTE');
const server=spawn(process.execPath,['src/preview.mjs'],{env:{...process.env,PORT:'8798',PATH:'',BIOINFO_ASSISTANT_DATA_DIR:path.join(root,'data')},stdio:['ignore','pipe','pipe'],windowsHide:true});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8798');
 await page.getByRole('searchbox').fill('MAFFT');
 await page.getByRole('button',{name:'版本与路径',exact:true}).click();
 await page.getByRole('button',{name:'检测安装',exact:true}).click();
 await page.locator('.status').getByText('未找到',{exact:true}).waitFor();
 await page.getByRole('button',{name:'查找软件',exact:true}).click();
 await page.getByRole('textbox',{name:'软件文件夹绝对路径'}).fill(root);
 await page.getByRole('button',{name:'开始查找',exact:true}).click();
 await page.getByText('找到 1 个文件候选',{exact:true}).waitFor();
 await page.locator('.candidate').getByText('仅为候选，软件身份待确认',{exact:true}).waitFor();
 await page.getByRole('button',{name:'检测安装',exact:true}).click();
 await page.locator('.candidate').getByText(path.join(root,'mafft.bat'),{exact:true}).waitFor();
 await page.getByRole('button',{name:'刷新',exact:true}).click();
 await page.locator('.candidate').getByText(path.join(root,'mafft.bat'),{exact:true}).waitFor();
 await page.reload();
 await page.getByRole('searchbox').fill('MAFFT');
 await page.getByRole('button',{name:'版本与路径',exact:true}).click();
 await page.locator('.candidate').getByText(path.join(root,'mafft.bat'),{exact:true}).waitFor();
 assert.equal(await page.locator('.status.good').count(),0);
 await page.getByRole('button',{name:'检测安装',exact:true}).click();
 await page.getByText('文件存在，但需确认确为所选软件；不能据此认定已安装',{exact:true}).waitFor();
 // Removing a known candidate must also clear the in-memory result on refresh.
 await rm(path.join(root,'mafft.bat'));
 await page.getByRole('button',{name:'刷新',exact:true}).click();
 await page.getByText('原路径缺失',{exact:true}).first().waitFor();
 assert.equal(await page.locator('.candidate').count(),0);
 assert.deepEqual(errors,[]);
 console.log('Detection UI passed: initial miss, directory discovery, card candidate, pathless recheck, refresh, reopen, missing-path invalidation.');
}finally{if(browser)await browser.close();server.kill();await new Promise(resolve=>server.once('exit',resolve));await rm(root,{recursive:true,force:true})}
