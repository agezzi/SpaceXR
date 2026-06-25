const fs = require('fs');

(async () => {
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    const logs = [];
    const network = [];

    page.on('console', (msg) => {
      try {
        logs.push({ type: 'console', text: msg.text(), location: msg.location ? msg.location() : null });
      } catch (e) {
        logs.push({ type: 'console', text: String(msg) });
      }
    });

    page.on('pageerror', (err) => logs.push({ type: 'pageerror', error: String(err && err.stack ? err.stack : err) }));

    page.on('request', (req) => network.push({ type: 'request', url: req.url(), method: req.method(), resourceType: req.resourceType() }));
    page.on('response', async (res) => {
      try {
        network.push({ type: 'response', url: res.url(), status: res.status(), headers: res.headers() });
      } catch (e) {
        network.push({ type: 'response', url: res.url(), status: res.status() });
      }
    });

    const target = process.argv[2] || 'http://localhost:3000/ar?headless=1';
    console.log('Navigating to', target);
    await page.goto(target, { waitUntil: 'networkidle2', timeout: 60000 });

    // wait a bit more for large model download/render (extended for big GLB)
    await new Promise((res) => setTimeout(res, 60000));

    // capture any debug info exposed on window (e.g. __lastGltfInfo)
    let lastGltfInfo = null;
    try {
      lastGltfInfo = await page.evaluate(() => {
        // eslint-disable-next-line no-undef
        return typeof window !== 'undefined' ? (window.__lastGltfInfo || null) : null;
      });
    } catch (e) {}

    const screenshotPath = 'ar-puppeteer.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const out = { logs, network, lastGltfInfo };
    fs.writeFileSync('ar-debug.json', JSON.stringify(out, null, 2));
    console.log('Wrote', screenshotPath, 'and ar-debug.json');

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Capture failed:', err);
    process.exit(2);
  }
})();
