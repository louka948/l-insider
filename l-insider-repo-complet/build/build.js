#!/usr/bin/env node
// Régénère index.html (déploiement, un seul fichier autonome) à partir du
// source lisible imposteurfoot_11.html + les fichiers listés dans
// LOCAL_SCRIPTS ci-dessous (données, moteur de jeu...).
//
// Remplace les incantations "node -e '...'" copiées-collées à chaque
// session précédente : un seul script, documenté, à relancer avec
// `node build/build.js` depuis la racine du projet (ou `npm run build`
// une fois câblé dans package.json).
//
// Étapes (voir claude/etat-imposteur-foot.md pour le détail) :
// 1. Assembler le JSX applicatif complet — noyau de imposteurfoot_11.html +
//    composants d'écran de screens/*.jsx (voir build/assemble.js).
// 2. Extraire le <head> (jusqu'à <div id="root"></div> inclus) du source.
// 3. Inliner chaque script de LOCAL_SCRIPTS à la place de son
//    <script src="..."> — le fichier déployé doit rester autonome, sans
//    dépendance externe (pas de dossier data/, game-engine.js ou screens/
//    à uploader séparément sur Netlify).
// 4. Transpiler le JSX assemblé avec Babel, le minifier avec Terser.
// 5. Réassembler : head (avec scripts locaux inlinés) + React + ReactDOM +
//    script applicatif minifié + fermeture.

const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");
const { minify } = require("terser");
const { assemble } = require("./assemble");

const ROOT = path.join(__dirname, "..");
const OUT_FILE = path.join(ROOT, "index.html");
const REACT_FILE = path.join(__dirname, "react.min.js");
const REACTDOM_FILE = path.join(__dirname, "reactdom.min.js");

// Chemins relatifs (tels qu'écrits dans les <script src="..."> du <head> du
// source, ET relatifs à la racine du projet pour la lecture disque) des
// scripts JS classiques (pas de JSX) à inliner dans le build.
const LOCAL_SCRIPTS = [
  "src/data/players.js",
  "src/engine/game-engine.js",
  "build/supabase-js.min.js",
  "src/data/supabase-config.js",
  "src/data/stripe-config.js",
  "src/data/beta-access.js",
];

async function main() {
  // 1. Assembler le noyau + les écrans (voir build/assemble.js).
  const { appSourceCode } = assemble();

  const src = fs.readFileSync(path.join(ROOT, "src/app/imposteurfoot_11.html"), "utf8");

  // 2. <head> jusqu'à <div id="root"></div> inclus.
  const headMatch = src.match(/^[\s\S]*<div id="root"><\/div>/);
  if (!headMatch) throw new Error("Impossible de trouver <div id=\"root\"></div> dans le source.");
  let head = headMatch[0];

  // 3. Inliner chaque script local (minifié) à la place de son <script src="...">.
  for (const relPath of LOCAL_SCRIPTS) {
    const fileSrc = fs.readFileSync(path.join(ROOT, relPath), "utf8");
    const fileMin = await minify(fileSrc, { compress: true, mangle: true });
    if (fileMin.error) throw fileMin.error;
    const scriptTagPattern = new RegExp(`<script src="${relPath.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}"></script>`);
    if (!scriptTagPattern.test(head)) {
      throw new Error(`<script src="${relPath}"></script> introuvable dans le <head> du source — le build ne peut pas l'inliner.`);
    }
    head = head.replace(scriptTagPattern, `<script>${fileMin.code}</script>`);
  }

  // 4. JSX applicatif assemblé : transpiler, minifier.
  const transpiled = babel.transformSync(appSourceCode, { cwd: __dirname, presets: [["@babel/preset-react", { runtime: "classic" }]] });
  const appMin = await minify(transpiled.code, { compress: true, mangle: true });
  if (appMin.error) throw appMin.error;

  // 5. Réassemblage.
  const react = fs.readFileSync(REACT_FILE, "utf8");
  const reactdom = fs.readFileSync(REACTDOM_FILE, "utf8");
  const out = head + `\n<script>${react}</script>\n<script>${reactdom}</script>\n<script>${appMin.code}</script>\n</body></html>`;

  fs.writeFileSync(OUT_FILE, out);
  console.log(`OK — ${OUT_FILE} régénéré (${out.length} octets).`);
}

main().catch((e) => {
  console.error("Échec du build :", e);
  process.exit(1);
});
