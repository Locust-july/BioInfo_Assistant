import { createRequire } from 'node:module';
import { getClientVersion } from '../src/client-version.mjs';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON||new URL('../package.json',import.meta.url));
const {chromium}=require('playwright');
const expected=await getClientVersion('desktop');
if(expected.clientVersion==='Error')throw new Error('Precondition: start this regression from a detectable Windows GPT desktop host');
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try {
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:8787');
 await page.getByRole('button',{name:'版本',exact:true}).click();
 const value=page.locator('.client-version');
 await value.filter({hasText:/当前 GPT 客户端版本：(?!获取中)/}).waitFor();
 const actual=await value.textContent();
 if(actual!=='当前 GPT 客户端版本：'+expected.clientVersion)throw new Error('Expected '+expected.clientVersion+' from live desktop host; UI showed '+actual);
 console.log('Local version click matches live desktop host');
}finally{await browser.close()}
