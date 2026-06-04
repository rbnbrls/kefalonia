const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  console.log('Starting favicon generation...');
  
  const svgPath = path.join(__dirname, 'favicon.svg');
  if (!fs.existsSync(svgPath)) {
    console.error('Error: favicon.svg not found!');
    process.exit(1);
  }

  const svgContent = fs.readFileSync(svgPath, 'utf8');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: transparent;
        }
        svg {
          width: 100%;
          height: 100%;
          display: block;
        }
      </style>
    </head>
    <body>
      ${svgContent}
    </body>
    </html>
  `;

  const targets = [
    { file: 'favicon.png', size: 32 },
    { file: 'icon-192.png', size: 192 },
    { file: 'icon-512.png', size: 512 }
  ];

  let browser;
  try {
    browser = await chromium.launch();
    console.log('Browser launched successfully.');

    for (const target of targets) {
      console.log(`Generating ${target.file} (${target.size}x${target.size})...`);
      
      const page = await browser.newPage({
        viewport: { width: target.size, height: target.size },
        deviceScaleFactor: 1
      });

      await page.setContent(htmlContent);
      await page.waitForSelector('svg');

      const outputPath = path.join(__dirname, target.file);
      await page.screenshot({
        path: outputPath,
        omitBackground: true
      });

      console.log(`Saved ${target.file}`);
      await page.close();
    }

    console.log('Favicon generation completed successfully!');
  } catch (error) {
    console.error('Error during generation:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
