// Script ponctuel : joue une partie jusqu'au bout (en éliminant toujours
// le joueur N°01) pour capturer l'écran de fin, quel que soit le nombre de
// manches nécessaires. Non versionné au runtime.
const { chromium } = require("playwright");
const path = require("path");

const CHROMIUM_PATH = "/opt/pw-browsers/chromium";
const FILE = path.resolve(__dirname, "..", "index.html");
const OUT = path.resolve(__dirname, "..", "shots");

async function flipAllReveals(page) {
  for (let i = 0; i < 8; i++) {
    const flipHint = page.locator("text=Touche pour ouvrir");
    if ((await flipHint.count()) === 0) break;
    await page.mouse.click(195, 420);
    await page.waitForTimeout(500);
    const nextBtn = page.locator('button:has-text("carte suivante")');
    if ((await nextBtn.count()) > 0) {
      await nextBtn.first().click();
      await page.waitForTimeout(300);
    } else {
      break;
    }
  }
}

(async () => {
  const fs = require("fs");
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`file://${FILE}`);
  await page.waitForSelector('button:has-text("Lancer la partie")', { timeout: 15000 });
  await page.locator('button:has-text("Lancer la partie")').first().click();
  await page.waitForTimeout(400);

  await flipAllReveals(page);

  for (let round = 0; round < 6; round++) {
    const endBtn = page.locator('button:has-text("Nouvelle partie")');
    if ((await endBtn.count()) > 0) break;

    const voteBtn = page.locator('button:has-text("vote")');
    if ((await voteBtn.count()) > 0) {
      await voteBtn.first().click();
      await page.waitForTimeout(400);
    }
    const startVoteBtn = page.locator('button:has-text("commencer")');
    if ((await startVoteBtn.count()) > 0) {
      await startVoteBtn.first().click();
      await page.waitForTimeout(400);
    }

    const voteCard = page.locator('button:has-text("N°01")');
    if ((await voteCard.count()) === 0) break;
    await voteCard.first().click();
    await page.waitForTimeout(300);
    const confirmBtn = page.locator("button:has-text(\"Confirmer l'élimination\")");
    if ((await confirmBtn.count()) === 0) break;
    await confirmBtn.first().click();
    await page.waitForTimeout(600);

    const endBtn2 = page.locator('button:has-text("Nouvelle partie")');
    if ((await endBtn2.count()) > 0) break;

    const continueBtn = page.locator('button:has-text("Manche")');
    if ((await continueBtn.count()) > 0) {
      await continueBtn.first().click();
      await page.waitForTimeout(400);
      await flipAllReveals(page);
    }
  }

  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/08-endscreen.png` });
  await browser.close();
  console.log("OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
