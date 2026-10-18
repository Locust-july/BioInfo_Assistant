import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
// By default install Playwright locally. A development environment may explicitly
// point PLAYWRIGHT_PACKAGE_JSON at an existing package, without tracking its path.
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON || new URL('../package.json', import.meta.url));
const { chromium } = require('playwright');
mkdirSync('runtime', { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
try {
 const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:8787');
 await page.getByText('清单已刷新', { exact: true }).waitFor();
 await page.screenshot({ path: 'runtime/preview-desktop.png', fullPage: true });
 await page.getByRole('button', { name: '任务记录', exact: true }).click();
 await page.getByText('还没有分析任务', { exact: true }).waitFor();
 await page.getByRole('button', { name: '关于插件', exact: true }).click();
 await page.getByText('目录与数据', { exact: true }).click();
 await page.getByRole('button', { name: '软件清单', exact: true }).click();
 await page.getByRole('button', { name: '刷新清单', exact: true }).click();
 await page.setViewportSize({ width: 390, height: 844 });
 await page.screenshot({ path: 'runtime/preview-mobile.png', fullPage: true });
 if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Narrow layout overflow');
 // A simulated MCP Apps host exercises the iframe bridge without claiming
 // to replace acceptance in the actual desktop client.
 await page.route('**/__bridge_test', route => route.fulfill({
  contentType: 'text/html',
  body: `<iframe title="workspace" src="/" style="width:100%;height:850px"></iframe><script>
   window.calls = 0; window.failRefresh = false;
   addEventListener('message', event => {
    const frame = document.querySelector('iframe');
    if(event.source !== frame.contentWindow) return;
    const m = event.data;
    const reply = result => event.source.postMessage({jsonrpc:'2.0',id:m.id,result}, '*');
    if(m.method === 'ui/initialize') reply({protocolVersion:'2026-01-26',hostInfo:{name:'test-host',version:'1.0.0'},hostCapabilities:{}});
    if(m.method === 'ui/notifications/initialized') event.source.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:{software:[{name:'Bridge test fixture',version:'test-only',citation:'Testing only',operations:[]}]}}}, '*');
    if(m.method === 'tools/call') { window.calls++; reply(window.failRefresh ? {isError:true,content:[{type:'text',text:'Test refresh failure'}]} : {structuredContent:{software:[]}}); }
   });
  </script>`,
 }));
 await page.goto(new URL('/__bridge_test', process.env.PREVIEW_URL || 'http://127.0.0.1:8787').href);
 const frame = page.frameLocator('iframe');
 await frame.getByText('已连接客户端', { exact: true }).waitFor();
 await frame.getByRole('heading', { name: 'Bridge test fixture', exact: true }).waitFor();
 await frame.getByText('版本', { exact: true }).click();
 await frame.getByText('test-only', { exact: true }).waitFor();
 await frame.getByRole('textbox', { name: '搜索软件' }).fill('no-match');
 await frame.getByText('没有匹配的软件', { exact: true }).waitFor();
 await frame.getByRole('textbox', { name: '搜索软件' }).fill('');
 await frame.getByRole('button', { name: '刷新清单', exact: true }).click();
 await frame.getByText('清单已刷新', { exact: true }).waitFor();
 if (await page.evaluate(() => window.calls) !== 1) throw new Error('Refresh must call the host tool exactly once');
 await page.evaluate(() => { window.failRefresh = true; });
 await frame.getByRole('button', { name: '刷新清单', exact: true }).click();
 await frame.getByText('刷新失败：Test refresh failure', { exact: true }).waitFor();
 if (await frame.getByRole('button', { name: '刷新清单', exact: true }).isDisabled()) throw new Error('Refresh remains disabled after failure');
 if (errors.length) throw new Error(errors.join('\n'));
 console.log('Browser checks passed');
} finally { await browser.close(); }
