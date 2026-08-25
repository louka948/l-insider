# Mettre L'Insider en ligne avec un nom de domaine perso

*(Le jeu s'appelait "Imposteur Foot" jusqu'au 23 août 2026 — renommé en
"L'Insider". Ce guide date d'avant le renommage ; l'URL Netlify actuelle
`imposteur-foot.netlify.app` n'a volontairement pas été changée — décision
explicite de l'utilisateur, à revoir seulement une fois l'app publiée pour
de vrai. Les suggestions de nom de domaine ci-dessous restent celles de
l'époque "Imposteur Foot", à réévaluer le moment venu avec le nouveau nom.)*

Ce guide t'accompagne pas à pas pour mettre le jeu en ligne sur ton propre nom de domaine, sans passer par les stores. Coût total : environ **10 à 15€/an** (juste le nom de domaine — l'hébergement reste gratuit).

Le fichier `index.html` fourni à côté est prêt à être déployé tel quel : c'est une application autonome, il n'y a rien à installer ni à compiler.

## Étape 1 — Choisir et acheter le nom de domaine

Quelques idées disponibles à vérifier : `imposteurfoot.fr`, `imposteur-foot.fr`, `undercoverfoot.fr`, `foot-imposteur.fr`.

Registrars recommandés (en français, fiables, pas chers) :
- **[OVH](https://www.ovh.com/fr/domaines/)** — le plus connu en France pour les `.fr`
- **[Gandi](https://www.gandi.net/fr)** — interface simple, bonne réputation

Il suffit de chercher le nom souhaité, vérifier sa disponibilité, et l'acheter (paiement carte bancaire, ~10-15€/an selon l'extension `.fr` ou `.com`).

## Étape 2 — Créer un compte d'hébergement gratuit (Netlify)

1. Va sur [netlify.com](https://www.netlify.com) et crée un compte gratuit (avec ton email ou ton compte Google/GitHub).
2. Une fois connecté, sur le tableau de bord, cherche l'option **"Deploy manually"** ou la zone de **drag & drop** (glisser-déposer un dossier).
3. Mets le fichier `index.html`, le fichier `_headers`, **et le fichier `politique-confidentialite.html`** (les trois fournis à côté de ce guide, à la racine du dépôt) dans le même dossier sur ton ordinateur, puis glisse ce dossier dans la zone de dépôt de Netlify. Le fichier `_headers` (sans extension) active les protections de sécurité du site (anti-clickjacking, etc.) — Netlify ne les applique que s'il le trouve au même niveau que `index.html`. `politique-confidentialite.html` doit lui aussi être au même niveau : le lien "Politique de confidentialité" dans l'écran des règles du jeu pointe vers `./politique-confidentialite.html` (chemin relatif) — ne déploie plus `index.html` seul désormais.
4. En quelques secondes, Netlify te donne un lien du type `https://nom-aleatoire.netlify.app` — le jeu est déjà en ligne et testable à ce stade, avant même de brancher le nom de domaine.

## Étape 3 — Connecter ton nom de domaine

1. Dans Netlify, va dans **Site settings → Domain management → Add custom domain**, et entre ton nom de domaine acheté à l'étape 1.
2. Netlify t'indique les enregistrements DNS à configurer (en général un enregistrement `A` ou des `CNAME`).
3. Retourne chez ton registrar (OVH/Gandi), dans la zone DNS de ton domaine, et ajoute les enregistrements indiqués par Netlify.
4. La propagation DNS prend en général quelques minutes, parfois jusqu'à 24-48h. Une fois propagé, ton jeu est accessible directement sur `https://imposteurfoot.fr` (ou le nom choisi).

Netlify fournit aussi automatiquement le certificat HTTPS (cadenas vert), pas d'action supplémentaire nécessaire.

## Étape 4 — Vérifier que tout fonctionne

Ouvre le lien final sur ton téléphone et sur ordinateur, lance une partie complète pour confirmer que tout s'affiche bien (photos, chrono, classement).

## Et après — mesurer la traction avant d'investir dans les stores

Le fichier `index.html` est déjà préparé pour deux choses, à activer quand tu es prêt (rien n'est actif par défaut, ça ne bloque pas le lancement) :

### Compteur de visites (privé, gratuit) — Cloudflare Web Analytics

1. Crée un compte gratuit sur [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/) et ajoute ton nom de domaine.
2. Cloudflare te donne un token unique.
3. Ouvre `index.html`, cherche le bloc en commentaire tout en haut du fichier (juste après `<link rel="icon"...>`), et décommente les 2 lignes en remplaçant `PASTE_TOKEN_HERE` par ton token. Redéploie le fichier (retour à l'étape 2 : glisser le dossier dans Netlify).
4. Les statistiques (nombre de visites, pages vues) sont visibles uniquement toi, depuis ton compte Cloudflare — jamais publiques, et sans bannière de cookie à ajouter puisque l'outil n'utilise pas de cookies.

### Email optionnel en fin de partie — via Tally

Un petit encart facultatif ("Envie d'être prévenu des nouveautés ?") peut s'afficher à la fin d'une partie, avec un lien vers un formulaire externe — jamais un blocage à l'entrée du jeu.

1. Crée un compte gratuit sur [Tally](https://tally.so) et crée un formulaire simple avec un champ email.
2. Récupère le lien de partage du formulaire (ex. `https://tally.so/r/xxxxxx`).
3. Ouvre `index.html` (ou demande-moi de le faire), cherche la ligne `const NEWSLETTER_URL = "";` (près du début du code du jeu) et colle ton lien entre les guillemets. Redéploie.
4. Les emails récoltés sont visibles dans ton tableau de bord Tally, exportables en CSV.

Donne-moi simplement ton token Cloudflare et/ou ton lien Tally quand tu les as, et je les intègre directement dans le fichier pour toi.

## Pour la pub

Une fois le lien stable, les canaux gratuits ou pas chers à tester en premier pour un jeu comme celui-ci : groupes Facebook / Discord de fans de foot, TikTok/Instagram (courtes vidéos de gameplay), Reddit (r/france, subs foot), et le bouche-à-oreille direct entre amis pour la première vague de retours.
