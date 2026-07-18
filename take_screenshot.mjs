import { chromium } from 'playwright';

(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true
    });
    
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    console.log('Waiting for animation and picking movie (10s)...');
    await page.waitForTimeout(10000); // 10 seconds to make sure splash is gone
    
    await page.screenshot({ path: 'mobile-screenshot.png' });
    await browser.close();
    console.log('Screenshot saved to mobile-screenshot.png');
  } catch (error) {
    console.error('Failed to take screenshot:', error);
  }
})();
