import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    console.log('Waiting for animation and picking movie (10s)...');
    await new Promise(r => setTimeout(r, 10000));
    
    await page.screenshot({ path: 'mobile-screenshot.png' });
    await browser.close();
    console.log('Screenshot saved to mobile-screenshot.png');
  } catch (error) {
    console.error('Failed to take screenshot:', error);
  }
})();
