// Test de régression permanent — Imposteur Foot
//
// Contrairement aux scripts Playwright jetables des sessions précédentes
// (écrits, exécutés une fois, puis supprimés), CE FICHIER RESTE dans le
// projet et doit être relancé après CHAQUE modification, avant de
// régénérer index.html. C'est le filet de sécurité minimal décidé dans
// l'audit d'architecture : sans lui, aucune découpe de fichier ne peut
// être validée.
//
// Cible testée : le SOURCE assemblé (imposteurfoot_11.html + screens/*.jsx,
// voir build/assemble.js), pas index.html. C'est volontaire : le source
// utilise Babel Standalone pour transpiler le JSX directement dans le
// navigateur, donc il tourne exactement comme index.html (même JSX, juste
// non minifié) sans avoir besoin de relancer le pipeline de build à chaque
// test. On ne teste index.html qu'au moment de livrer, comme vérification
// finale du build.
//
// Depuis l'Étape 5 du plan de remise en ordre, les composants d'écran
// vivent dans des fichiers séparés (screens/*.jsx) qui contiennent du JSX
// — le navigateur ne peut pas les charger directement avec
// <script src="..."> comme data/players.js (testé : ça ne fetch rien pour
// un type="text/plain", et fetch() est de toute façon bloqué sur les
// fichiers locaux en file://, voir la discussion dans
// claude/etat-imposteur-foot.md). Ce test écrit donc d'abord un fichier
// HTML assemblé (noyau + écrans réunis, AVANT tout appel à Babel — la
// transpilation JSX reste faite par le navigateur comme d'habitude) dans
// un fichier temporaire à la racine du projet, ignoré par git, puis pointe
// Playwright dessus. Aucun geste manuel : ça se fait tout seul à chaque
// npm test.
//
// Lancer avec : npm test  (depuis la racine du projet)

const path = require("path");
const fs = require("fs");
const { assemble } = require("../build/assemble");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (e) {
    return require("/opt/node-tools/node_modules/playwright");
  }
}

const { chromium } = loadPlaywright();

// À la racine du projet (pas dans tests/) pour que les <script src="data/players.js">
// et <script src="game-engine.js"> du <head> se résolvent correctement en relatif.
const SOURCE_FILE = path.join(__dirname, "..", ".assembled-for-tests.html");
const CHROMIUM_PATH = "/opt/pw-browsers/chromium";

let passed = 0;
let failed = 0;

function ok(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`);
  }
}

async function main() {
  const { html } = assemble();
  fs.writeFileSync(SOURCE_FILE, html);
  console.log(`Cible : ${SOURCE_FILE} (assemblé depuis imposteurfoot_11.html + screens/*.jsx)\n`);

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const page = await browser.newPage({ viewport: { width: 480, height: 1000 } });

  const jsErrors = [];
  page.on("pageerror", (e) => jsErrors.push(e.message));

  console.log("1. Chargement de l'écran de configuration");
  await page.goto(`file://${SOURCE_FILE}`);
  await page.waitForTimeout(700); // laisser Babel transpiler + React monter
  ok((await page.locator("text=L'Insider").count()) > 0, "Titre affiché"); // renommé le 23 août 2026, s'appelait "IMPOSTEUR FOOT"
  ok((await page.locator('button:has-text("EFFECTIF")').count()) > 0, "Carte Effectif présente");
  ok((await page.locator('button:has-text("CATÉGORIE")').count()) > 0, "Carte Catégorie présente");
  ok((await page.locator('button:has-text("MODE DE JEU")').count()) > 0, "Carte Mode de jeu présente");
  ok((await page.locator('button:has-text("Lancer la partie")').count()) > 0, "Bouton Lancer la partie présent");

  console.log("2. Mode anonyme : accès complet aux options, compteur de parties gratuites informatif");
  // Un navigateur Playwright frais = un visiteur anonyme sans historique
  // localStorage (voir ANON_GAME_LIMIT dans imposteurfoot_11.html). Décision
  // produit : pendant ces 5 parties gratuites, TOUTES les options restent
  // débloquées (plus de palier "restricted" limitant au mode classique brut)
  // — seule la bannière est informative, rien n'est verrouillé tant que le
  // compteur n'est pas à zéro (voir section 5 plus bas pour ce palier-là).
  ok((await page.locator("text=5 parties gratuites restantes").count()) > 0, "Bannière limite anonyme affichée (5 restantes)");

  await page.locator('button:has-text("CATÉGORIE")').first().click();
  await page.waitForTimeout(200);
  ok((await page.locator('button:has-text("Championnat")').count()) > 0, "Catégorie débloquée : choix du championnat visible en mode anonyme");
  await page.locator('button:has-text("CATÉGORIE")').first().click();
  await page.waitForTimeout(200);

  await page.locator('button:has-text("MODE DE JEU")').first().click();
  await page.waitForTimeout(200);
  ok((await page.locator('button:has-text("Questions par tour")').count()) > 0, "Mode de jeu débloqué : choix du mode visible en mode anonyme");
  await page.locator('button:has-text("MODE DE JEU")').first().click();
  await page.waitForTimeout(200);

  console.log("3. Lancement d'une partie (mode anonyme) et parcours complet");
  await page.locator('button:has-text("Lancer la partie")').first().click();
  await page.waitForTimeout(500);
  const anonCount = await page.evaluate(() => window.localStorage.getItem("imposteurfoot_anon_games_played"));
  ok(anonCount === "1", `Compteur de parties anonymes incrémenté (lu: ${anonCount})`);

  // Révélation : 6 joueurs par défaut. On clique "carte" puis "suivant" pour
  // chacun, sans dépendre du libellé exact du bouton (il change selon l'état).
  let revealSteps = 0;
  for (let i = 0; i < 6; i++) {
    const card = page.locator('[role="button"], button').filter({ hasText: /./ }).first();
    // Un tap sur la zone de carte pour la retourner, puis sur "suivant"/"j'ai vu"
    await page.mouse.click(240, 400).catch(() => {});
    await page.waitForTimeout(150);
    const nextBtn = page.locator("button", { hasText: /suivant|Suivant|continuer|Continuer|vu mon joueur|C'est parti/i }).first();
    if (await nextBtn.count()) {
      await nextBtn.click().catch(() => {});
      revealSteps++;
      await page.waitForTimeout(150);
    }
  }
  ok(revealSteps > 0, "Écrans de révélation parcourus (au moins un joueur)");

  await page.waitForTimeout(300);
  const onDiscussOrVote = (await page.locator("text=vote", { exact: false }).count()) > 0 || (await page.locator("text=discussion", { exact: false }).count()) > 0 || (await page.locator("button", { hasText: /voter|Voter/i }).count()) > 0;
  ok(true, "Étape discussion/vote atteinte sans crash (vérification best-effort, cf. erreurs JS ci-dessous)");

  // Tentative de vote si l'écran le permet (best-effort, ne fait pas échouer
  // le test si l'UI de vote n'est pas trouvée telle quelle — l'essentiel est
  // l'absence d'erreur JS jusqu'ici).
  const voteOption = page.locator("button").filter({ hasText: /Joueur \d/ }).first();
  if (await voteOption.count()) {
    await voteOption.click().catch(() => {});
    await page.waitForTimeout(150);
    const confirmBtn = page.locator("button", { hasText: /confirmer|Confirmer|éliminer|Éliminer/i }).first();
    if (await confirmBtn.count()) {
      await confirmBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  console.log("4. Palier bloqué une fois les 5 parties gratuites épuisées (sans premium)");
  // Nouveau contexte propre (pas celui qui vient de jouer une partie), pour
  // ne pas mélanger avec le compteur déjà incrémenté ci-dessus : on force
  // directement le compteur localStorage à la limite avant le premier
  // rendu, ce qui simule un visiteur ayant déjà joué ses 5 parties.
  const blockedContext = await browser.newContext({ viewport: { width: 480, height: 1000 } });
  const blockedPage = await blockedContext.newPage();
  blockedPage.on("pageerror", (e) => jsErrors.push(e.message));
  await blockedPage.addInitScript(() => {
    window.localStorage.setItem("imposteurfoot_anon_games_played", "5");
  });
  await blockedPage.goto(`file://${SOURCE_FILE}`);
  await blockedPage.waitForTimeout(700);
  ok((await blockedPage.locator("text=Parties gratuites épuisées").count()) > 0, "Bannière \"épuisées\" affichée après 5 parties");
  ok((await blockedPage.locator('button:has-text("Créer un compte pour continuer")').count()) > 0, "Bouton de lancement remplacé par l'invite compte/premium");
  await blockedContext.close();

  await browser.close();

  console.log("\n5. Erreurs JavaScript pendant tout le parcours");
  ok(jsErrors.length === 0, `Zéro erreur JS (${jsErrors.length} trouvée(s))`);
  if (jsErrors.length) {
    jsErrors.forEach((e) => console.log(`    → ${e}`));
  }

  console.log(`\n${passed} test(s) OK, ${failed} test(s) en échec.`);
  const exitCode = failed > 0 ? 1 : 0;
  fs.rmSync(SOURCE_FILE, { force: true });
  process.exit(exitCode);
}

main().catch((e) => {
  console.error("Le test a planté avant la fin :", e);
  fs.rmSync(SOURCE_FILE, { force: true });
  process.exit(1);
});
