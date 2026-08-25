// Script ponctuel (non versionné au runtime) pour capturer des captures
// d'écran de la refonte "Le Dossier" — sert uniquement à l'auto-critique
// pendant la session, pas un test permanent.
const { chromium } = require("playwright");
const path = require("path");

const CHROMIUM_PATH = "/opt/pw-browsers/chromium";
const FILE = path.resolve(__dirname, "..", "index.html");
const OUT = path.resolve(__dirname, "..", "shots");

(async () => {
  const fs = require("fs");
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`file://${FILE}`);
  await page.waitForSelector('button:has-text("Lancer la partie")', { timeout: 15000 });

  await page.screenshot({ path: `${OUT}/01-setup.png` });

  // Ouvre l'accordéon "Infiltrés" n'est pas nécessaire (déjà visible) —
  // lance directement une partie en mode par défaut (3 joueurs, 1 infiltré).
  await page.locator('button:has-text("Lancer la partie")').first().click();
  await page.waitForTimeout(400);

  // Écran de révélation — face avant (pochette scellée)
  await page.waitForSelector("text=Touche pour ouvrir", { timeout: 10000 });
  await page.screenshot({ path: `${OUT}/02-reveal-front.png` });

  // Tap pour retourner la carte
  const flipZone = page.locator("text=Touche pour ouvrir").locator("xpath=ancestor::div[3]");
  await page.mouse.click(195, 420);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/03-reveal-back.png` });

  // Avance tous les joueurs jusqu'au vote
  for (let i = 0; i < 6; i++) {
    const nextBtn = page.locator('button:has-text("carte suivante")');
    if ((await nextBtn.count()) > 0) {
      await nextBtn.first().click();
      await page.waitForTimeout(300);
      const flipHint = page.locator("text=Touche pour ouvrir");
      if ((await flipHint.count()) > 0) {
        await page.mouse.click(195, 420);
        await page.waitForTimeout(600);
      }
    }
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04-after-reveals.png` });

  // Cherche le bouton pour passer à la discussion/vote si présent
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

  await page.screenshot({ path: `${OUT}/05-discussion-or-vote.png` });

  // Si on est sur le vote, sélectionne un joueur puis confirme
  const voteCard = page.locator('button:has-text("N°01")');
  if ((await voteCard.count()) > 0) {
    await voteCard.first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/06-vote-selected.png` });
    const confirmBtn = page.locator('button:has-text("Confirmer l\'élimination")');
    if ((await confirmBtn.count()) > 0) {
      await confirmBtn.first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/07-eliminated.png` });
    }
  }

  await browser.close();
  console.log("Captures enregistrées dans", OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
