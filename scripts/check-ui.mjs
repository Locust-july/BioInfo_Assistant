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
 if (errors.length) throw new Error(errors.join('\n'));
 console.log('Browser checks passed');
} finally { await browser.close(); }
