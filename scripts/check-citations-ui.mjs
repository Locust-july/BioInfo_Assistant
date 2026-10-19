import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { html, workspace } from '../src/mcp.mjs';
import { getSoftware } from '../src/catalog.mjs';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON || new URL('../package.json', import.meta.url));
const { chromium } = require('playwright');
const server = createServer((req,res)=>{
 if(req.url === '/api/workspace') res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(workspace()));
 else res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
 browser = await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],viewport:{width:1100,height:800}});
 const page=await context.newPage();
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.getByText('清单已刷新',{exact:true}).waitFor();
 const card=page.locator('article').filter({has:page.getByRole('heading',{name:'AliView',exact:true})});
 await card.getByRole('button',{name:'引用论文',exact:true}).click();
 await card.getByRole('button',{name:'一键引用',exact:true}).click();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),getSoftware('aliview').citations[0].reference);
 await card.getByRole('button',{name:'复制 BibTeX',exact:true}).click();
 assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),getSoftware('aliview').citations[0].bibtex);
 await mkdir('runtime',{recursive:true});
 await card.screenshot({path:'runtime/citation-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await card.getByRole('button',{name:'一键引用',exact:true}).click();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),getSoftware('aliview').citations[0].reference);
 await card.screenshot({path:'runtime/citation-narrow.png'});
 const rdp=page.locator('article').filter({has:page.getByRole('heading',{name:'RDP4',exact:true})});
 await rdp.getByRole('button',{name:'引用论文',exact:true}).click();
 await rdp.getByRole('button',{name:'一键引用',exact:true}).click();
 const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.match(copied,/待确认/);assert.match(copied,/vev003/);
 console.log('Citation clipboard, warnings and narrow layout checks passed');
} finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
