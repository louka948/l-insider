// Assemble le code applicatif complet à partir de imposteurfoot_11.html
// (le "noyau" : icônes, PlayerAvatar, ImposteurFoot(), styles...) + les
// composants d'écran de screens/*.jsx (Étape 5 du plan de remise en ordre
// de l'architecture — voir claude/etat-imposteur-foot.md côté projet).
//
// Pourquoi cette étape existe : les composants d'écran contiennent du JSX,
// donc le navigateur ne peut pas les charger directement en fichiers
// séparés avec <script src="..."> comme pour data/players.js ou
// game-engine.js (ces deux-là sont du JS classique sans JSX). Charger du
// JSX séparément demanderait soit un serveur local (rejeté : on veut
// continuer à tester en ouvrant le fichier directement, file://), soit une
// étape de build manuelle avant chaque test (rejeté : on veut garder
// npm test instantané, sans rien construire à la main). Cette assemblage
// automatique résout les deux : de vrais fichiers séparés à éditer, zéro
// geste manuel avant de tester.
//
// Comment ça marche : on concatène le texte des fichiers screens/*.jsx à
// la suite du contenu de <script type="text/plain" id="app-source">, AVANT
// la transpilation Babel — donc on obtient exactement le même résultat que
// si tout avait toujours été dans un seul fichier. La position exacte des
// écrans dans le texte assemblé n'a pas d'importance : ce sont des
// déclarations de fonction (`function X() {}`), qui sont "hoisted" en JS
// (disponibles dans tout le scope dès le début de l'exécution du script,
// quel que soit l'endroit où elles sont physiquement déclarées) — voir
// screens/manifest.json pour l'ordre choisi, purement pour la lisibilité.
//
// Utilisé par :
// - build/build.js (fabrique le index.html minifié à déployer)
// - tests/e2e.test.js (fabrique un fichier jouable pour Playwright)
// - build/dev-preview.js (fabrique un fichier jouable pour un humain)

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE_FILE = path.join(ROOT, "src/app/imposteurfoot_11.html");
const SCREENS_DIR = path.join(ROOT, "src/screens");
const MANIFEST_FILE = path.join(SCREENS_DIR, "manifest.json");

const APP_SOURCE_RE = /(<script type="text\/plain" id="app-source">)([\s\S]*?)(<\/script>)/;

// Concatène tous les fichiers screens/*.jsx listés dans manifest.json, dans
// l'ordre du manifeste (ordre choisi pour la lisibilité, sans effet sur le
// fonctionnement — voir l'explication du hoisting plus haut).
function getScreensCode() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
  return manifest.map((name) => fs.readFileSync(path.join(SCREENS_DIR, `${name}.jsx`), "utf8")).join("\n\n");
}

// Retourne { html, appSourceCode } :
// - html : le document complet de imposteurfoot_11.html, mais avec le
//   contenu de #app-source augmenté des écrans assemblés — prêt à écrire
//   tel quel dans un fichier et à ouvrir dans un navigateur.
// - appSourceCode : juste le JSX assemblé (sans le HTML autour), pour qui
//   veut le transpiler/minifier directement (voir build/build.js).
function assemble() {
  const raw = fs.readFileSync(SOURCE_FILE, "utf8");
  const match = raw.match(APP_SOURCE_RE);
  if (!match) {
    throw new Error('<script type="text/plain" id="app-source"> introuvable dans imposteurfoot_11.html.');
  }
  const screensCode = getScreensCode();
  const appSourceCode = `${match[2]}\n\n${screensCode}\n`;
  const html = raw.slice(0, match.index) + match[1] + appSourceCode + match[3] + raw.slice(match.index + match[0].length);
  return { html, appSourceCode };
}

module.exports = { assemble, SOURCE_FILE, SCREENS_DIR };
