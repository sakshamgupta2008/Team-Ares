import puppeteer from 'puppeteer';

async function testPuppeteer() {
  try {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log("Browser launched!");
    const page = await browser.newPage();
    await page.setContent("<h1>Test PDF</h1>");
    const pdf = await page.pdf({ format: 'A4' });
    console.log("PDF generated, size:", pdf.length);
    await browser.close();
    console.log("Test passed!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testPuppeteer();
