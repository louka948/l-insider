# L'Insider — conventions du projet

*(Le jeu s'appelait "Imposteur Foot" jusqu'au 23 août 2026 — renommé en
"L'Insider". Les identifiants techniques internes qui datent de l'ancien nom
n'ont volontairement pas été touchés : nom de fichier
`src/app/imposteurfoot_11.html`, fonction orchestratrice `ImposteurFoot()`,
appId Capacitor `com.imposteurfoot.app`, URL Netlify
`imposteur-foot.netlify.app`, nom du dossier/dépôt. Un renommage plus
profond de ces identifiants pourra être fait plus tard si besoin — voir
`claude/etat-imposteur-foot.md` pour le contexte de cette décision.)*

Ce fichier existe pour qu'une nouvelle session Claude Code (ou n'importe quel
contributeur) comprenne en 2 minutes comment le projet est organisé, sans
redécouvrir les mêmes contraintes techniques à chaque fois. Voir aussi
`claude/etat-imposteur-foot.md` dans le projet Claude ("application
undercover foot") pour l'historique fonctionnel complet et les décisions
prises session par session.

## Démarrer

```
npm install                 # une fois, installe Playwright etc. à la racine
cd build && npm install     # une fois, installe Babel/Terser pour le build
cd ..
npm test                    # lance le filet de test e2e (Playwright headless)
npm run dev                 # génère dev-preview.html, à ouvrir dans un navigateur
npm run build                # génère index.html, le fichier à déployer
```

**Règle d'or : après toute modification, lancer `npm test` avant de considérer que c'est fini.**
Si `npm test` échoue, ne pas builder ni déployer.

## Où modifier quoi

| Je veux changer...                                    | Fichier(s)                          |
|---------------------------------------------------------|--------------------------------------|
| L'UI/le texte/le comportement d'un écran précis          | `src/screens/<NomEcran>.jsx`         |
| Un joueur, une photo, la composition d'un championnat    | `src/data/players.js`                |
| Une règle du jeu (appariement, points, catégories, questions) | `src/engine/game-engine.js`     |
| Les composants "cœur" (icônes, PlayerAvatar, orchestrateur `ImposteurFoot()`, styles globaux) | `src/app/imposteurfoot_11.html` |
| Le mécanisme d'assemblage/build lui-même                 | `build/assemble.js`, `build/build.js`, `build/dev-preview.js` |
| Le filet de test                                         | `tests/e2e.test.js`                  |

Un nouvel écran doit être ajouté à `src/screens/manifest.json`, sinon il est
silencieusement ignoré par l'assemblage (l'ordre du manifeste n'a aucun effet
sur le fonctionnement, voir plus bas — c'est juste pour la lisibilité).

## Architecture — pourquoi c'est découpé comme ça

Le jeu est une app React/JSX transpilée **dans le navigateur** par Babel
Standalone (pas de webpack/vite/node au runtime), pour rester déployable en
un seul fichier HTML autonome sur un hébergeur statique (Netlify).

- `src/app/imposteurfoot_11.html` — le fichier source "cœur" : le
  `<head>` (styles globaux, imports Babel/React embarqués), les composants
  transverses (icônes, `PlayerAvatar`, `LeagueFlagIcon`...), l'orchestrateur
  principal `ImposteurFoot()` (état du jeu, handlers `startGame`/`nextReveal`/
  `eliminate`...), et un `<script type="text/plain" id="app-source">` qui
  contient le JSX en clair (pas encore transpilé).
- `src/screens/*.jsx` — chaque écran (SetupScreen, RevealScreen, VoteScreen,
  etc.) dans son propre fichier.
- `src/data/players.js` — données pures (joueurs, clubs, championnats). JS
  classique, zéro JSX, chargé via `<script src="src/data/players.js">`
  (fonctionne même en ouverture directe `file://`, contrairement à `fetch()`).
- `src/engine/game-engine.js` — règles du jeu pures (appariement, score,
  catégories, questions). JS classique, zéro dépendance React.

**Contrainte technique clé (découverte empiriquement, ne pas la
redécouvrir)** : un fichier `.jsx` contenant du JSX ne peut PAS être chargé
individuellement par le navigateur avec `<script src="...">` (ça ne
transpile rien) ni via `fetch()` en ouverture locale `file://` (Chromium
bloque `fetch()` sur les fichiers locaux avec `TypeError: Failed to fetch`).
C'est pour ça que `src/screens/*.jsx` ne peut pas être chargé "à la volée" —
il faut un assemblage texte AVANT que Babel transpile.

**La solution : `build/assemble.js`.** Une seule fonction `assemble()` lit
`src/app/imposteurfoot_11.html`, concatène le contenu de tous les fichiers
`src/screens/*.jsx` (dans l'ordre de `manifest.json`) à l'intérieur du
`<script type="text/plain" id="app-source">`, puis renvoie le document
complet. Cette fonction est le seul endroit qui sait comment assembler le
projet — elle est utilisée par les trois entrées suivantes, jamais dupliquée :

- `npm test` (`tests/e2e.test.js`) — assemble dans un fichier temporaire
  `.assembled-for-tests.html` à la racine (gitignored, supprimé en fin de
  test), lance Playwright dessus.
- `npm run dev` (`build/dev-preview.js`) — assemble dans `dev-preview.html`
  à la racine (gitignored), non minifié, à ouvrir dans un navigateur normal
  pour prévisualiser à l'œil.
- `npm run build` (`build/build.js`) — assemble, puis inline `src/data/players.js`
  et `src/engine/game-engine.js` (minifiés), transpile tout le JSX avec Babel,
  minifie avec Terser, produit `index.html` : le seul fichier à déployer,
  totalement autonome (aucune dépendance externe à uploader séparément).

**⚠️ `src/app/imposteurfoot_11.html` seul ne suffit PAS à jouer** — il faut
toujours passer par `npm run dev` (ou `npm test`) pour obtenir un fichier
jouable, car le dossier `src/screens/` n'y est pas inclus directement.

**Pourquoi l'ordre de concaténation des écrans n'a aucune importance** :
tous les écrans sont déclarés en `function NomEcran(...) {...}` (jamais en
`const NomEcran = () => {...}`). En JavaScript, les déclarations de fonction
sont entièrement "hoistées" (nom + corps remontés en haut de leur scope à
l'analyse du code) — donc peu importe où elles apparaissent physiquement
dans le fichier assemblé, elles sont toutes disponibles dès le début de
l'exécution.

**Pourquoi `data/players.js` et `game-engine.js` sont chargés différemment
des écrans** : ce sont des scripts JS classiques sans JSX, donc
`<script src="...">` fonctionne nativement, même en ouverture locale
`file://` (seul `fetch()` est bloqué, pas le chargement d'un `<script>`).
Plusieurs balises `<script>` classiques (sans `type="module"`) partagent le
même scope global — leurs `const`/`let` de haut niveau (`PLAYERS`,
`LEAGUES`, `scorePair`, etc.) sont donc visibles par le script applicatif
injecté dynamiquement après transpilation.

## Mobile (iOS / Android via Capacitor)

Le jeu peut être empaqueté en vraie appli iOS/Android avec **Capacitor**
(Ionic) — pas de réécriture, la coquille native charge simplement
`index.html` déjà buildé dans une WebView.

```
npm run cap:sync   # build + copie index.html dans www/ + npx cap sync (iOS et Android)
```

- `capacitor.config.ts` — config Capacitor (`appId: com.imposteurfoot.app`,
  `webDir: www`).
- `www/` — **généré** (copie de `index.html`), gitignored, jamais à éditer
  directement. C'est ce que Capacitor copie dans les projets natifs.
- `ios/`, `android/` — vrais projets natifs (Xcode / Android Studio),
  **versionnés** (contrairement à `www/`) car c'est là que vivront les
  réglages spécifiques à chaque plateforme (icônes, permissions, signature).
  `npm run cap:sync` les garde à jour avec le contenu web, mais ne les
  régénère pas de zéro (ne pas relancer `npx cap add`, ça écraserait des
  réglages faits à la main côté natif).
- **iOS a besoin d'un Mac** (Xcode) pour compiler/tester/publier — voir
  `claude/etat-imposteur-foot.md` pour les options sans Mac (Mac loué à
  l'heure + simulateur pour juste voir le rendu, ou build cloud type
  Codemagic + sideload via Sideloadly pour l'installer gratuitement sur un
  iPhone physique). **Android n'a pas cette contrainte** : Android Studio
  tourne sur Windows/Linux, build et installation sur téléphone 100% gratuits
  sans compte développeur.
- Compte développeur nécessaire uniquement pour publier sur les stores (pas
  pour tester) : Apple Developer Program 99$/an, Google Play 25$ une fois.
  Les deux exigent une politique de confidentialité et un formulaire de
  déclaration des données collectées (pertinent ici : Supabase + Stripe
  collectent email/paiement). Apple exige aussi une fonctionnalité
  "supprimer mon compte" dans l'app — pas encore implémentée.
- **Paiement** : grâce au DMA européen (changement Apple d'octobre 2026),
  Stripe reste utilisable directement dans l'app iOS pour les utilisateurs
  UE (au lieu d'être obligé de tout refaire avec Apple IAP) — Apple prend
  quand même une commission (~10-20% selon le cas). Sur Android c'est plus
  simple et moins cher. À revérifier auprès des pages officielles Apple/Google
  au moment de la publication, ces règles évoluent vite.

## Autres dossiers

- `build/` — outillage (scripts Node : `assemble.js`, `build.js`,
  `dev-preview.js`, plus `react.min.js`/`reactdom.min.js` embarqués et son
  propre `node_modules/` pour Babel/Terser — régénérable avec
  `cd build && npm install`).
- `tests/` — `e2e.test.js`, le filet de test permanent (Playwright headless,
  vérifie l'écran de configuration, la sélection d'un championnat, un
  parcours de partie complet, et l'absence d'erreur JS).
- `archive/` — anciennes versions datées du fichier source, obsolètes,
  gardées pour référence seulement.
- `scripts/` — scripts ponctuels des sessions de recherche photos/joueurs
  passées, pas utilisés au runtime.
- `docs/` — documentation annexe (ex. guide de mise en ligne Netlify).
- `tools/verif-photos.html` — outil de diagnostic autonome pour scanner les
  photos de joueurs depuis un navigateur.
- `index.html` (racine) — généré par `npm run build`, jamais à éditer
  directement, c'est le fichier à déployer sur Netlify.
- `dev-preview.html`, `.assembled-for-tests.html` (racine) — générés,
  gitignored, jamais la source de vérité.

## Historique de remise en ordre de l'architecture

Ce projet a fait l'objet d'un audit complet (fichier source de 2853 lignes /
2.7 Mo dans lequel toute modification pouvait casser du code ailleurs sans
filet de test) suivi d'un plan en 6 étapes, exécuté et validé une étape à la
fois avec l'utilisateur :

0. Initialisation d'un vrai dépôt git (aucun n'existait avant).
1. Ajout d'un filet de test e2e permanent (`npm test`), vérifié fiable dans
   les deux sens (vert sur le code sain, rouge explicite sur casse
   volontaire).
2. Rangement du vrac à la racine (`archive/`, `scripts/`, `docs/`, `tools/`),
   pur déplacement, 0 ligne de code touchée.
3. Extraction des données joueurs dans `data/players.js`.
4. Extraction du moteur de jeu pur dans `game-engine.js`.
5. Découpe des ~19 composants d'écran en vrais fichiers `screens/*.jsx`,
   avec le mécanisme d'assemblage `build/assemble.js` (voir plus haut).
6. Rangement final en `src/` par domaine (`src/app/`, `src/data/`,
   `src/engine/`, `src/screens/`) + rédaction de ce `CLAUDE.md`.

Chaque étape a été committée séparément avec un message détaillé — voir
`git log --oneline` pour l'historique complet, et
`claude/etat-imposteur-foot.md` (projet Claude) pour le contexte narratif.
