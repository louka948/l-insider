#!/usr/bin/env node
// Génère dev-preview.html : imposteurfoot_11.html + screens/*.jsx assemblés
// (voir build/assemble.js), non minifié, directement ouvrable dans un
// navigateur — pour regarder/tester le jeu à l'œil sans passer par npm test.
//
// Nécessaire depuis l'Étape 5 du plan de remise en ordre de l'architecture :
// imposteurfoot_11.html seul ne suffit plus à jouer (les composants d'écran
// sont dans screens/*.jsx, à part). dev-preview.html est un fichier généré,
// jamais versionné (voir .gitignore) — à régénérer à chaque fois avec :
//
//   node build/dev-preview.js
//
// puis ouvrir dev-preview.html dans un navigateur normal.

const fs = require("fs");
const path = require("path");
const { assemble } = require("./assemble");

const OUT_FILE = path.join(__dirname, "..", "dev-preview.html");

const { html } = assemble();
fs.writeFileSync(OUT_FILE, html);
console.log(`OK — ${OUT_FILE} régénéré. Ouvre-le dans un navigateur pour prévisualiser.`);
