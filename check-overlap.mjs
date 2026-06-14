import { chromium } from 'playwright';

const viewports = [
  { name: '1920×1080', w: 1920, h: 1080 },
  { name: '1440×900',  w: 1440, h: 900 },
  { name: '1366×768',  w: 1366, h: 768 },
  { name: '1280×800',  w: 1280, h: 800 },
  { name: '1280×720',  w: 1280, h: 720 },
  { name: '1024×768',  w: 1024, h: 768 },
  { name: '800×600',   w: 800,  h: 600 },
  { name: '375×667',   w: 375,  h: 667 },  // mobile iPhone
];

const browser = await chromium.launch({ headless: true });

let allOk = true;

for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(800);

  // Get hero section
  const hero = page.locator('section').first();
  const heroBox = await hero.boundingBox();

  // Get heading spans
  const h1 = page.locator('h1');
  const firstSpan = h1.locator('span').first();
  const secondSpan = h1.locator('span').nth(1);
  const firstBox = await firstSpan.boundingBox();
  const secondBox = await secondSpan.boundingBox();

  // Get computed font sizes
  const fontSize1 = await firstSpan.evaluate(el => getComputedStyle(el).fontSize);
  const fontSize2 = await secondSpan.evaluate(el => getComputedStyle(el).fontSize);

  // Paragraph
  const paragraph = page.locator('h1 + p');
  const pBox = await paragraph.boundingBox();

  console.log(`\n═══ ${vp.name} ═══`);
  console.log(`Font-sizes: line1=${fontSize1}  line2=${fontSize2}`);
  console.log(`Hero: ${heroBox?.width.toFixed(0)}×${heroBox?.height.toFixed(0)}px`);

  if (firstBox && secondBox) {
    const gap = secondBox.y - (firstBox.y + firstBox.height);
    console.log(`Line gap: ${gap.toFixed(1)}px  [line1=${firstBox.height.toFixed(1)}px  line2=${secondBox.height.toFixed(1)}px]`);

    if (gap < 0) {
      console.log(`❌ OVERLAP: Lines overlap by ${Math.abs(gap).toFixed(0)}px`);
      allOk = false;
    } else if (gap < 4) {
      console.log(`⚠️  VERY TIGHT: ${gap.toFixed(1)}px`);
      allOk = false;
    } else {
      console.log(`✅ Gap: ${gap.toFixed(1)}px`);
    }
  }

  if (pBox && secondBox) {
    const pGap = pBox.y - (secondBox.y + secondBox.height);
    if (pGap < 0) {
      console.log(`❌ Paragraph overlaps heading by ${Math.abs(pGap).toFixed(0)}px`);
      allOk = false;
    } else {
      console.log(`✅ Paragraph gap: ${pGap.toFixed(1)}px`);
    }
  }

  // Check if hero bottom is clipped by viewport
  if (heroBox) {
    const heroBottom = heroBox.y + heroBox.height;
    if (heroBottom > vp.h) {
      console.log(`⚠️  Hero extends ${(heroBottom - vp.h).toFixed(0)}px below viewport`);
    } else {
      console.log(`✅ Hero fully visible (bottom at ${heroBottom.toFixed(0)}/${vp.h})`);
    }
  }

  // Screenshot for visual reference
  await page.screenshot({ path: `hero-${vp.name.replace('×', 'x')}.png`, fullPage: false });
  await page.close();
}

console.log(`\n═══════════════════════════════════`);
console.log(allOk ? '✅ All viewports pass' : '❌ Some viewports have issues');
await browser.close();
