// Script ponctuel de vérification visuelle du flux "mot de passe oublié"
// (session du 23 août 2026, correctifs 🟠 restants de l'audit de sécurité).
// Ouvre dev-preview.html, clique "Compte", bascule vers l'onglet Se
// connecter, clique "Mot de passe oublié ?", vérifie que le formulaire
// dédié apparaît, puis revient en arrière — pas d'appel réseau réel testé
// ici (Supabase est injoignable depuis ce sandbox), juste la navigation UI.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("file://" + path.join(__dirname, "..", "dev-preview.html"));
  await page.waitForSelector("text=Imposteur Foot", { timeout: 10000 }).catch(() => {});

  // Ouvre l'écran Compte (bouton dans l'en-tête).
  const accountBtn = await page.locator('button[aria-label="Mon compte"]').first();
  if (await accountBtn.count()) {
    await accountBtn.click();
  } else {
    // Fallback si le libellé aria a changé : cherche un bouton contenant une icône compte.
    await page.locator("header button").last().click();
  }
  await page.waitForTimeout(300);

  const seConnecter = page.locator('button:has-text("Se connecter")').first();
  await seConnecter.click().catch(() => {});
  await page.waitForTimeout(200);

  const forgotLink = page.locator('button:has-text("Mot de passe oublié ?")');
  const forgotVisible = await forgotLink.isVisible().catch(() => false);
  console.log("Lien 'Mot de passe oublié ?' visible :", forgotVisible);

  if (forgotVisible) {
    await forgotLink.click();
    await page.waitForTimeout(200);
    const formVisible = await page.locator('text=Entre ton email, on t’envoie un lien').isVisible().catch(() => false);
    console.log("Formulaire de demande de réinitialisation affiché :", formVisible);

    const retourBtn = page.locator('button:has-text("Retour")');
    const retourVisible = await retourBtn.isVisible().catch(() => false);
    console.log("Bouton Retour visible :", retourVisible);
    if (retourVisible) {
      await retourBtn.click();
      await page.waitForTimeout(200);
      const backToSignin = await page.locator('button:has-text("Se connecter")').first().isVisible().catch(() => false);
      console.log("Retour à l'écran de connexion :", backToSignin);
    }
  }

  console.log("Erreurs JS pendant le parcours :", errors.length, errors.slice(0, 5));
  await browser.close();
})();
