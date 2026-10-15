import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// 复用浏览器页面内的回归断言，CI 与手动验证执行同一组检查。
const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(new URL('/tests/browser.html', server.resolvedUrls.local[0]).href);
  await page.locator('#results[data-status="passed"], #results[data-status="failed"]').waitFor({
    timeout: 120_000,
  });
  const results = JSON.parse(await page.locator('#results').textContent());
  assert(results.length > 0, '浏览器回归未执行任何检查');
  for (const result of results) {
    console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}`);
    if (result.error) console.error(result.error);
  }
  assert.equal(errors.length, 0, `浏览器未捕获异常：${errors.join('\n')}`);
  assert(
    results.every((result) => result.passed),
    '浏览器回归失败',
  );
  console.log(`浏览器回归通过：${results.length} 项`);
} finally {
  await browser?.close();
  await server.close();
}
