import { chromium } from 'playwright';

async function verifyLanding() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');

  // Check if Tiers section exists (it should NOT)
  const tiersSection = await page.$('#partnerships');
  if (tiersSection) {
    console.error('FAIL: Tiers section (id="partnerships") still exists!');
    process.exit(1);
  } else {
    console.log('PASS: Tiers section successfully removed.');
  }

  // Check if Student Redirect works
  await page.goto('http://localhost:3000/student');
  await page.waitForURL('**/student/login');
  const url = page.url();
  if (url.includes('/student/login')) {
    console.log('PASS: /student redirected to /student/login');
  } else {
    console.error(`FAIL: /student did not redirect correctly. Current URL: ${url}`);
    process.exit(1);
  }

  await browser.close();
}

verifyLanding();
