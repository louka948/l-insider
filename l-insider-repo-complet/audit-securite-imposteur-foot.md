# Audit de sécurité — Imposteur Foot

Audit statique (code + schéma SQL + config native) et dynamique (appels réels contre le backend Supabase en production, en lecture seule, avec seulement la clé publique `anon`). Aucun fichier n'a été modifié — ce document liste les problèmes trouvés, la correction proposée pour chacun est décrite mais pas encore appliquée.

Date : 23 août 2026. Périmètre : dépôt git complet (`src/`, `supabase/functions/`, `docs/*.sql`, `capacitor.config.ts`, `ios/`, `android/`), plus tests en direct contre `https://pcsvgtpvccpozxsnixux.supabase.co` (tables `purchases`/`users`/`game_history`, fonctions `create-checkout-session`/`create-portal-session`).

---

## Résumé exécutif — l'architecture réelle avant de lire l'audit

Plusieurs sections de ta demande supposent une architecture que ce projet n'a pas *(encore)*. Pour que l'audit reste honnête plutôt que de plaquer un template générique, voici ce qui existe réellement :

- **Pas de backend applicatif à toi** : le backend est Supabase (Postgres + Auth + Storage + Edge Functions) en SaaS géré, pas un serveur que tu opères. La sécurité "backend" = configuration Supabase + RLS + tes 3 fonctions Edge, pas un serveur Node/Express à toi.
- **Paiement = Stripe Checkout hébergé (redirection navigateur), pas Apple/Google IAP.** Section 4 et 13 de ta demande (reçus Apple/Google, `verifyReceipt`, `App Store Server API`) **ne s'appliquent pas tel quel** — mais ça devient un vrai sujet **dès que tu publies sur les stores**, voir plus bas (Apple/Google exigent en général leur propre système d'achat in-app pour du contenu numérique, avec des exceptions récentes liées au DMA européen déjà documentées dans ton projet).
- **Pas de multijoueur réseau.** C'est un jeu "pass-and-play" : un seul téléphone passe de main en main autour de la table, tout l'état de la partie (rôles, votes, scores) vit en mémoire React locale, rien n'est synchronisé en temps réel entre appareils. Section 10 (WebSockets, rooms, codes de partie, matchmaking) **ne s'applique pas** — mais ça change complètement le modèle de menace sur "qui peut voir le rôle secret d'un autre joueur" (voir section 9 plus bas : la menace n'est pas réseau, elle est physique/devtools).
- **Pas d'espace admin.** Aucune route, rôle ou table `admin` dans le code (vérifié par recherche exhaustive) — section 14 sans objet pour l'instant.
- **Pas encore de notifications push, deep links, ou universal links** configurés côté Capacitor.
- **L'app mobile n'est pas encore buildée.** `android/` n'a que le `AndroidManifest.xml`, aucun fichier `.gradle` n'existe encore (jamais ouvert dans Android Studio) — plusieurs points du modèle Android (SDK cible, ProGuard/R8, network security config) sont donc **NON VÉRIFIABLES AVEC LE PROJET ACTUEL**, précisé section par section.

Cela dit, plein de vraies choses ont été trouvées — voir la liste priorisée en section 23. Vue d'ensemble :

| Gravité | Nombre de constats |
|---|---|
| 🔴 CRITIQUE | 0 |
| 🟠 ÉLEVÉ | 2 |
| 🟡 MOYEN | 5 |
| 🟢 FAIBLE | 6 |
| ℹ️ Non vérifiable / à mettre en place avant publication | 4 |

Rien de catastrophique n'a été trouvé (pas de fuite de secret, pas d'accès aux données d'autrui, pas de moyen de se payer un abonnement gratuitement) — mais plusieurs points sont bloquants pour une vraie mise en production, notamment côté RGPD et App Store.

---

## 1. Analyse globale

### Ce qui a été vérifié activement (pas juste lu, testé en conditions réelles)

| Test | Méthode | Résultat |
|---|---|---|
| Un visiteur anonyme peut-il lire les achats/profils d'autrui ? | Requête `fetch()` directe vers `/rest/v1/purchases`, `/rest/v1/users`, `/rest/v1/game_history` avec seulement la clé `anon`, sans jeton utilisateur, exécutée depuis le site en production | `200 []` sur les trois — RLS bloque bien, confirmé empiriquement, pas juste sur le papier |
| `create-checkout-session` et `create-portal-session` acceptent-elles un appel sans jeton valide ? | Appel `POST` sans en-tête `Authorization`, puis avec un jeton fabriqué (`Bearer garbage.invalid.token`) | `401 UNAUTHORIZED_NO_AUTH_HEADER` / `401 UNAUTHORIZED_INVALID_JWT_FORMAT` — rejetées avant même d'atteindre ton code, par la vérification JWT de Supabase elle-même |
| `stripe-webhook` vérifie-t-elle vraiment la signature Stripe ? | Relecture du code : HMAC-SHA256 recalculé manuellement, comparé au header `Stripe-Signature`, avec rejet si l'horodatage dépasse 5 minutes (anti-rejeu) | Implémentation correcte et conforme à l'algorithme documenté par Stripe |
| Une clé secrète (Stripe secret key, Supabase service role) traîne-t-elle dans le code livré au navigateur ? | Recherche par motifs (`sk_live`, `sk_test`, `service_role`, JWT à 3 segments) dans `index.html` et `src/` | Aucune trouvée — seules les clés publiques (`anon`/`publishable`) sont présentes, ce qui est normal |
| Y a-t-il des sinks XSS (`dangerouslySetInnerHTML`, `eval`, `innerHTML =`) dans le code de l'app (hors librairie React elle-même) ? | Recherche exhaustive dans `src/screens/`, `src/engine/`, `src/data/` | Aucun trouvé dans le code applicatif |

### Vulnérabilités / mauvaises pratiques identifiées

Voir la table complète en **section 23**. Les plus notables :

- Aucun en-tête de sécurité HTTP sur le déploiement Netlify (pas de CSP, pas de protection anti-clickjacking) — 🟠 ÉLEVÉ.
- La policy RLS d'`UPDATE` sur `public.users` ne restreint pas quelles colonnes un utilisateur peut modifier sur sa propre ligne — 🟡 MOYEN.
- Aucun flux "mot de passe oublié" implémenté — 🟠 ÉLEVÉ (bloquant pour de vrais utilisateurs, pas juste une question de sécurité).
- Aucune fonctionnalité de suppression de compte — 🟠 ÉLEVÉ, **obligatoire pour la publication Apple** et pour le RGPD.
- `android:allowBackup="true"` dans le manifeste Android — 🟡 MOYEN, expose les données locales (dont le jeton de session Supabase) à une extraction via `adb backup`.
- Dépendance `uuid` vulnérable (CVE, CVSS 7.5) via `@capacitor/cli` → `xcode` — 🟢 FAIBLE en pratique (outil de build, jamais embarqué dans l'app livrée), mais à corriger pour la propreté de la chaîne de dépendances.

### Données qui ne devraient jamais être stockées côté client

Vérifié : aucune donnée de ce type ne l'est actuellement. Ce qui EST côté client (normal, pas un problème) : `SUPABASE_ANON_KEY` (clé publique par design), `STRIPE_PUBLISHABLE_KEY` (publique par design), les deux `Price ID` Stripe (publics), le code d'accès bêta en clair (documenté comme volontaire, juste une friction — pas un mécanisme de sécurité). Ce qui n'y est PAS et c'est très bien : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` — les trois n'existent que dans les secrets des fonctions Edge côté Supabase, jamais dans un fichier versionné ni dans `index.html`.

### Configurations dangereuses ou trop permissives trouvées

- CORS `Access-Control-Allow-Origin: *` sur les 3 fonctions Edge. **Pas un vrai risque ici** : l'authentification se fait par en-tête `Authorization: Bearer`, jamais par cookie — un site tiers ne peut pas forger cet en-tête avec le jeton d'une victime juste parce que CORS est permissif (contrairement à une auth par cookie, où CORS + credentials laxistes serait un vrai problème CSRF). Classé 🟢 FAIBLE, à resserrer par hygiène plutôt que par urgence (voir section 23).
- `android:allowBackup="true"` — voir ci-dessus.
- Aucun `network_security_config.xml` Android, aucune section `NSAppTransportSecurity` iOS — dans les deux cas ça veut dire que les valeurs **par défaut sécurisées** de chaque OS s'appliquent (HTTPS forcé, pas de trafic en clair) — ce n'est PAS un problème en soi, juste à vérifier explicitement une fois le projet Android réellement buildé (NON VÉRIFIABLE avec les fichiers actuels, gradle absent).

---

## 2. Authentification et comptes utilisateurs

| Élément | État | Détail |
|---|---|---|
| Inscription | ✅ Implémenté correctement | `handleSignUp` (`AccountScreen.jsx`) — gère explicitement le cas "email déjà utilisé" sans permettre l'énumération de comptes (Supabase renvoie un objet `user` avec `identities: []` plutôt qu'une erreur explicite ; le code distingue bien ce cas — voir code source, déjà audité une session précédente). |
| Connexion | ✅ Correct | `supabaseClient.auth.signInWithPassword` — délègue entièrement à Supabase Auth, aucune logique maison risquée. |
| Déconnexion | ✅ Correct | `supabaseClient.auth.signOut()`. |
| **Récupération de mot de passe** | ❌ **Absent** | Aucune fonction `resetPasswordForEmail` ni lien "mot de passe oublié" dans `AccountScreen.jsx` — vérifié par recherche exhaustive. Un joueur qui oublie son mot de passe n'a **aucun moyen de récupérer son compte** dans l'app actuellement. 🟠 ÉLEVÉ (UX + sécurité : en pratique certains utilisateurs vont réutiliser un mot de passe faible/déjà connu par cœur faute de pouvoir en changer facilement). |
| Changement de mot de passe (connecté) | ❌ Absent | Pas de section "changer mon mot de passe" dans `AccountScreen.jsx`. |
| Vérification d'adresse e-mail | ⚠️ Dépend d'un réglage dashboard | Le code gère les deux cas ("Confirm email" activé ou non côté Supabase), mais le réglage effectif dans le dashboard n'a jamais été reconfirmé cette session (déjà noté comme point ouvert dans la doc projet). **NON VÉRIFIABLE avec le code seul** — à vérifier dans Authentication → Providers → Email → "Confirm email". |
| Sessions / tokens / refresh tokens | ✅ Délégué à Supabase Auth SDK | Rafraîchissement automatique du JWT géré par le SDK, durée de vie par défaut ~1h pour l'access token. Pas de logique maison qui pourrait mal gérer l'expiration. |
| **Stockage des tokens (spécifique mobile)** | ⚠️ À durcir | Le SDK Supabase JS stocke la session dans `localStorage` par défaut. Dans une WebView Capacitor, ce `localStorage` n'est **pas** le Keychain iOS ni l'Android Keystore — c'est un stockage moins protégé (accessible via `adb backup` si `allowBackup` reste actif, voir plus bas ; ou par un attaquant ayant un accès root/jailbreak à l'appareil). 🟡 MOYEN — voir section 7 pour la correction (plugin de stockage sécurisé). |
| Protection contre le vol de session | ⚠️ Standard uniquement | Rien de spécifique en plus des protections Supabase par défaut (rotation de refresh token). Pas de "device fingerprinting" ni de révocation à distance des sessions actives — fonctionnalité que Supabase ne propose pas nativement de toute façon à ce jour. |
| Brute force / credential stuffing / rate limiting sur la connexion | ⚠️ Délégué à Supabase, non vérifiable finement | Supabase Auth applique des limites par défaut sur les endpoints d'auth (on l'a vu concrètement cette session avec le rate limit d'envoi d'email, 2/h). Le rate-limit spécifique sur les tentatives de connexion par mot de passe n'est pas configurable finement depuis le code de l'app — **NON VÉRIFIABLE avec le projet actuel**, à vérifier dans le dashboard Supabase (Authentication → Rate Limits) et à envisager un CAPTCHA (hCaptcha, supporté nativement par Supabase Auth) si des tentatives de brute force réelles sont un jour constatées. |
| MFA / 2FA | ❌ Non implémenté | Supabase Auth le supporte nativement (TOTP) mais rien n'est câblé dans l'app. Pour un jeu grand public à faible enjeu par compte, **pas prioritaire** — mais pertinent si tu ajoutes un jour un espace admin. |
| Comptes supprimés / désactivés / bannis | ❌ Aucun mécanisme | Pas de colonne `banned`/`status` dans `public.users`, pas de fonctionnalité de suppression de compte côté app (voir section 4/12 — obligatoire pour Apple). Un compte ne peut aujourd'hui être supprimé que manuellement par toi via le dashboard Supabase. |
| Rôles et permissions | N/A | Pas de système de rôles — tout utilisateur connecté a le même statut de base, seul `isPremium` (dérivé de `purchases`, voir section 4) différencie l'accès. |

**Test spécifique demandé — "un utilisateur peut-il modifier une requête pour accéder aux données d'un autre utilisateur ?"** Testé en direct (voir section 1) sur les 3 tables sensibles avec des identifiants anonymes : non, RLS bloque. Un utilisateur *connecté* qui modifierait le paramètre `user_id=eq.<id d'un autre>` dans une requête REST se heurterait à la même policy `auth.uid() = user_id` — Postgres RLS s'applique peu importe ce que le client envoie en paramètre, ce n'est pas une vérification côté application contournable.

---

## 3. Autorisations (IDOR, élévation de privilèges)

C'est le point le mieux protégé du projet, et c'est vérifié empiriquement, pas supposé :

| Scénario redouté | Protection en place | Vérifié comment |
|---|---|---|
| Accéder aux données d'un autre utilisateur (`purchases`, `users`, `game_history`) | RLS Postgres, `auth.uid() = user_id`/`id` sur chaque table | Requêtes réelles anonymes → `[]` (section 1) |
| Modifier son propre statut Premium en local | `isPremium` recalculé côté client **à partir de** `purchases`, table qui n'a **aucune policy INSERT/UPDATE ouverte au client** (vérifié dans `docs/schema-comptes-premium.sql`, ligne 90-94, commentaire explicite : "Volontairement AUCUNE policy insert/update ici") — seule la fonction `stripe-webhook`, avec la Service Role Key (qui contourne RLS), peut écrire dans cette table | Lecture du schéma SQL + test API (section 1) |
| Accéder à des fonctionnalités payantes sans payer en modifiant l'app/le state React | Le "déblocage" `isPremium` est un flag d'UI côté client — **inhérent à une app 100% front-end sans logique de jeu côté serveur**. Un utilisateur qui modifie le JS chargé (devtools, app modifiée) peut forcer `isPremium=true` localement. **Ce n'est pas un contournement du paiement réel** (aucune donnée serveur n'est falsifiée, personne d'autre n'est affecté, aucune fraude sur un tiers), c'est juste "je me débloque le jeu gratuitement sur mon propre téléphone" — impact business (perte de revenu potentiel), pas un incident de sécurité au sens propre (pas de fuite, pas d'usurpation). Voir section 4 pour la nuance complète. |
| Modifier le nombre de parties gratuites restantes | `anonGamesPlayed`/`ANON_GAMES_KEY` en `localStorage`, trivialement modifiable. Même remarque que ci-dessus : soft-limit produit, pas une faille de sécurité — vider le `localStorage` ou jouer en navigation privée suffit, pas besoin de "hacker" quoi que ce soit. |
| Modifier son score/ses statistiques envoyées | `game_history` a une policy `insert with check (auth.uid() = user_id)` sans validation du **contenu** des colonnes (`winner_side`, `num_players`, etc. peuvent contenir n'importe quelle valeur envoyée par le client). Un joueur pourrait s'écrire un historique de victoires fictif dans sa propre ligne. Comme il n'y a ni classement public, ni compétition inter-joueurs, ni récompense liée à ces stats, l'impact réel est nul aujourd'hui — 🟢 FAIBLE, à re-router en 🟡 le jour où un classement public ou une récompense basée sur `game_history` serait ajoutée. |
| Accéder aux données admin | N/A, pas d'espace admin. |

---

## 4. Comptes payants et Premium

C'est la partie la plus critique de ta demande, donc traitée en détail.

### Ce qui est déjà bien fait

Le frontend **n'est pas** la source de vérité du statut Premium pour ce qui a une valeur réelle (argent) — il l'est seulement pour ce qui n'a aucune valeur en dehors du navigateur de l'utilisateur (compteur de parties gratuites). Chaîne de confiance actuelle :

```
Stripe (source de vérité du paiement)
   → événement webhook signé (HMAC vérifié, section 1)
      → fonction Edge stripe-webhook (Service Role Key, contourne RLS)
         → écrit dans public.purchases
            → RLS: lecture seule par le propriétaire (auth.uid() = user_id)
               → le client LIT purchases pour calculer isPremium, n'écrit jamais dedans
```

Concrètement, testé et confirmé cette session : impossible d'appeler `create-checkout-session` ou `create-portal-session` sans un jeton Supabase valide (401 confirmé, section 1) ; impossible d'écrire dans `purchases` depuis le client (RLS sans policy insert/update) ; la signature Stripe du webhook est vérifiée avant tout traitement (donc personne ne peut POSTer un faux événement `checkout.session.completed` pour s'auto-attribuer le statut premium).

### Ce qui manque ou est fragile

| Point demandé | État |
|---|---|
| Achats vérifiés côté serveur | ✅ Oui (webhook signé) |
| Achats rejouables (replay) | ✅ Protégé — fenêtre de 5 minutes sur l'horodatage de signature Stripe, un événement rejoué au-delà expire. **Nuance** : rien n'empêche Stripe lui-même de renvoyer deux fois un webhook légitime en cas de problème réseau de leur côté (comportement documenté et attendu de Stripe) — le code actuel **réagirait deux fois** à un `checkout.session.completed` dupliqué en insérant deux lignes `purchases` pour le même achat. 🟡 MOYEN : ajouter une contrainte d'unicité SQL sur `stripe_payment_intent_id`/`stripe_subscription_id` (avec `ON CONFLICT DO NOTHING`) pour rendre l'insertion idempotente. |
| Reçus Apple/Google vérifiés | N/A pour l'instant — pas d'IAP natif. **Deviendra un vrai sujet à la publication**, voir section 13. |
| Abonnements synchronisés avec le backend | ✅ Oui, via `customer.subscription.updated`/`.deleted` |
| Annulations prises en compte | ✅ Testé en conditions réelles cette session (Customer Portal Stripe → annulation → webhook met à jour `status`) |
| Remboursements pris en compte | ⚠️ Partiellement — le code gère `customer.subscription.updated/deleted`, mais **pas** l'événement `charge.refunded` pour l'accès à vie (paiement unique). Si tu rembourses un accès à vie depuis le dashboard Stripe, la ligne `purchases` (`status: 'active'`) **ne sera jamais mise à jour** — l'utilisateur garde l'accès à vie malgré le remboursement. 🟠 ÉLEVÉ (impact financier direct). |
| Expirations prises en compte | ✅ Le code compare `current_period_end` à la date du jour côté client pour l'affichage, et Stripe envoie `customer.subscription.updated` avec le nouveau statut à l'expiration réelle |
| Webhooks authentifiés | ✅ Signature HMAC vérifiée (section 1) |
| Impossible d'appeler l'API directement pour s'auto-attribuer Premium | ✅ Confirmé (401 sans jeton, pas de policy insert côté RLS) |

### "Quelle architecture serait la plus sûre pour gérer ça ?"

Ce que tu as déjà **est** l'architecture recommandée pour du paiement web (Stripe Checkout + webhook + RLS en lecture seule) — pas besoin de la changer en profondeur. Deux ajouts à prioriser :

1. **Idempotence** sur l'insertion `purchases` (contrainte SQL unique + `ON CONFLICT`), pour ne pas dupliquer un achat si Stripe renvoie deux fois le même webhook.
2. **Gérer `charge.refunded`** dans `stripe-webhook` pour repasser `status` à `'refunded'` sur un accès à vie remboursé, et faire en sorte qu'`isPremium` ignore ce statut.

Quand tu passeras aux stores (IAP natif exigé par Apple pour la plupart des cas hors UE, voir section 13), le même principe s'applique : ne jamais faire confiance au reçu tel qu'envoyé par le client, toujours le revalider server-side (App Store Server API / Google Play Developer API), et laisser ta table `purchases` (déjà bien conçue) être la source de vérité unique, peu importe le fournisseur de paiement.

---

## 5. API et backend

| Vérification | Résultat |
|---|---|
| Authentification | ✅ Chaque fonction sensible vérifie le jeton auprès de `/auth/v1/user`, ne fait jamais confiance à un `user_id` envoyé par le client (relu dans le code, confirmé section 1) |
| Autorisation | ✅ RLS Postgres en dernier rempart, indépendante de la logique applicative |
| Validation des entrées | ⚠️ Partielle — `create-checkout-session` valide bien que `plan` soit `subscription`/`lifetime` (sinon 400), mais aucune fonction ne valide la taille du corps de requête ni son `Content-Type` avant de le parser. Impact faible ici (payloads minuscules), mais bonne pratique à ajouter. |
| SQL/NoSQL Injection | ✅ Pas de risque — tout passe par l'API REST PostgREST de Supabase (requêtes paramétrées par construction) ou par le SDK, jamais de concaténation de chaînes SQL |
| XSS | ✅ Aucun sink trouvé (section 1) |
| CSRF | N/A — auth par `Authorization: Bearer`, pas par cookie, donc pas de surface CSRF classique |
| SSRF | ✅ Aucune fonction n'accepte une URL arbitraire à "aller chercher" côté serveur — les seules requêtes sortantes sont vers des domaines fixes (`api.stripe.com`, l'URL Supabase elle-même) |
| Command injection / path traversal | N/A — pas d'exécution de commande shell, pas de manipulation de chemins fichiers côté serveur |
| Mass assignment | ⚠️ Voir section 3 — `game_history` accepte tout contenu envoyé sur `insert`, sans validation de cohérence des valeurs |
| Rate limiting sur tes 3 fonctions Edge | ❌ Aucun rate limiting applicatif — seulement les limites globales de la plateforme Supabase. Un compte connecté pourrait spammer `create-checkout-session` en boucle (créerait juste beaucoup de sessions Stripe inutilisées côté Stripe, pas un vrai risque de sécurité, mais un abus de ressources possible). 🟢 FAIBLE. |
| Exposition d'informations sensibles dans les erreurs | ✅ Les messages d'erreur renvoyés au client restent génériques ("Erreur Stripe.", "Session invalide.") — pas de stack trace ni de détail interne exposé |

---

## 6. Base de données

Déjà largement couvert (sections 1, 3, 4). Complément :

- **Suppression définitive des comptes** : `on delete cascade` est bien en place sur `purchases.user_id` et `game_history.user_id` référençant `public.users.id`, qui référence lui-même `auth.users.id`. Donc **si** tu supprimes un utilisateur via `auth.admin.deleteUser` (admin API, jamais exposée côté client), toutes ses données dérivées disparaissent proprement. Le problème n'est pas le schéma, c'est l'**absence de bouton pour déclencher cette suppression** (section 4/12).
- **Logs** : Supabase conserve des logs d'auth et d'API côté plateforme (déjà utilisés cette session pour diagnostiquer le SMTP) — rétention et accès **NON VÉRIFIABLE avec le projet actuel**, dépend du plan Supabase souscrit.
- **Sauvegardes** : gérées par Supabase selon le plan (Free tier = pas de PITR/point-in-time recovery). **NON VÉRIFIABLE** — à vérifier dans Settings → Database → Backups si tu veux une garantie de récupération en cas de suppression accidentelle.
- **Accès direct depuis le frontend** : oui, par design (c'est le modèle Supabase — le client parle à la base via PostgREST + RLS plutôt que via un serveur intermédiaire). Ce n'est pas un problème en soi tant que RLS est correcte partout, ce qui est le cas pour les 3 tables sensibles (vérifié).

---

## 7. Application mobile (iOS / Android)

### Ce qu'un attaquant qui décompile l'app pourrait récupérer

Réponse directe à ta question : **tout le code JS/HTML/CSS**, en clair (minifié mais pas obfusqué — voir section 18), plus les 3 clés/valeurs publiques déjà listées (`SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`, les Price ID). C'est **normal et sans risque** — ces valeurs sont conçues pour être publiques (elles n'ouvrent aucun accès sans passer par RLS/l'auth). Ce qu'un attaquant ne peut PAS récupérer en décompilant : les secrets serveur (jamais présents dans le bundle), les données d'autres utilisateurs (protégées par RLS, pas par obscurité du code).

Ce qu'un attaquant *pourrait* récupérer en plus, spécifiquement sur mobile, s'il a un accès physique/logiciel à un appareil donné (pas en décompilant l'app en elle-même, mais en extrayant les données APRÈS qu'un utilisateur légitime s'est connecté dessus) :

| Risque | Détail | Gravité |
|---|---|---|
| Jeton de session via `adb backup` | `android:allowBackup="true"` (valeur actuelle du manifeste) permet d'extraire les données de l'app (dont le `localStorage` contenant le jeton Supabase) via `adb backup` sur un appareil non verrouillé/en mode debug, ou via une sauvegarde cloud selon la config OEM | 🟡 MOYEN |
| Jeton de session en clair dans le stockage WebView | Ni Keychain (iOS) ni Keystore (Android) ne sont utilisés — le SDK Supabase stocke dans `localStorage` par défaut, qui sur Capacitor est un fichier SQLite/LevelDB non chiffré dans le bac à sable de l'app | 🟡 MOYEN |
| Screenshots contenant des infos sensibles | Pas de protection anti-capture d'écran (normale pour un jeu — Apple/Android ne l'exigent que pour des apps bancaires) | Pas un vrai risque ici, pas d'info bancaire affichée dans l'app elle-même (le formulaire de carte est sur le domaine Stripe, hors de l'app) |

### Recommandations concrètes

1. **`android:allowBackup="false"`** dans `android/app/src/main/AndroidManifest.xml` (une ligne à changer) — élimine le vecteur `adb backup`.
2. **Migrer le stockage de session Supabase** vers un stockage réellement sécurisé plutôt que `localStorage` par défaut : Supabase JS permet de fournir un `storage` custom à `createClient()` — combiné au plugin `@capacitor/preferences` (qui peut lui-même être configuré pour utiliser Keychain/Keystore selon la plateforme), ça sort le jeton du `localStorage` WebView. C'est un vrai changement de code (pas juste une config), à planifier avant la publication mobile plutôt qu'après.
3. **WebViews** : Capacitor charge uniquement ton propre `index.html` local (`webDir: 'www'`) — pas de navigation vers des URL externes arbitraires dans la WebView principale, donc pas de risque classique "WebView qui charge n'importe quel site". Confirmé par la config (`capacitor.config.ts` ne déclare aucun `server.url` externe).
4. **Deep links / universal links / intents** : aucun configuré actuellement → aucune surface d'attaque de ce type pour l'instant. Si tu en ajoutes un jour (ex. lien de confirmation d'email qui ouvre directement l'app), il faudra valider que le paramètre reçu ne peut pas être manipulé pour rejouer une action sensible.
5. **NON VÉRIFIABLE avec le projet actuel** : `targetSdkVersion`/`minSdkVersion` Android (aucun `.gradle` généré — il faut ouvrir le projet dans Android Studio ou lancer `npx cap sync android` avec un environnement complet pour les voir), configuration ProGuard/R8 (idem), mode développeur/détection root-jailbreak (voir section 18).

---

## 8. Secrets et clés

Résultat de la recherche exhaustive (section 1) : **aucun secret trouvé dans le code livré au client.** Table récapitulative de ce qui existe et où :

| Secret | Où il vit | Correct ? |
|---|---|---|
| `STRIPE_SECRET_KEY` | Secrets de la fonction Edge `create-checkout-session` (Supabase dashboard) | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Secrets de la fonction Edge `stripe-webhook` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Fourni automatiquement à chaque fonction Edge par Supabase, jamais dans le code du dépôt | ✅ |
| Clé API Resend (SMTP) | Champ mot de passe SMTP du dashboard Supabase (Authentication → Emails), jamais collée par du code | ✅ |
| `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`, Price IDs | `src/data/*.js`, inlinés dans `index.html` | ✅ Normal — ce sont des identifiants publics par design |
| `BETA_ACCESS_CODE` | `src/data/beta-access.js`, en clair | ⚠️ Volontairement public, documenté comme tel — pas un secret, juste une friction. Ne jamais t'en servir pour protéger quelque chose de réellement sensible. |

Aucune action nécessaire ici — c'est la partie la mieux gérée du projet.

---

## 9. Jeu et logique métier

C'est la question la plus intéressante pour ce projet précis, et la réponse est différente de ce qu'on attendrait d'un jeu en ligne classique, à cause de l'architecture "pass-and-play" (un seul téléphone, pas de réseau entre joueurs pendant la partie).

**Le vrai modèle de menace ici n'est pas réseau, il est physique/local.** Tout l'état de la partie (qui a quel rôle, quel mot, qui est l'infiltré) vit dans la mémoire React du navigateur/WebView du téléphone qui circule autour de la table. Il n'y a rien à intercepter sur le réseau puisque rien ne transite par le réseau pendant la partie elle-même.

| Menace demandée | Applicable ici ? | Détail |
|---|---|---|
| Modification des rôles par un joueur | Oui, en théorie, si un joueur ouvre les DevTools/l'inspecteur pendant que le téléphone est entre ses mains | Déjà partiellement traité : le bug corrigé en session précédente empêchait `EliminatedScreen` de fuiter le mot exact d'un joueur éliminé avant la fin de partie. Mais **tous les rôles de tous les joueurs restent en mémoire React pendant toute la partie** (nécessaire pour que le jeu fonctionne) — un joueur techniquement averti qui ouvre l'inspecteur (Web Inspector via USB sur iOS, `chrome://inspect` sur Android en mode debug) pendant qu'il tient le téléphone pourrait lire l'état complet du composant `ImposteurFoot()` et voir tous les rôles. **C'est une limite architecturale inhérente au concept "un seul appareil partagé", pas un bug corrigible par du code** — la seule vraie protection serait un modèle "un appareil par joueur" (donc un vrai backend multijoueur), qui est un changement de produit, pas un patch de sécurité. |
| Découverte du rôle des autres joueurs | Voir ci-dessus — même limite | |
| Modification des votes / du nombre de joueurs / d'infiltrés | Ce sont des réglages **choisis par le joueur qui configure la partie** avant qu'elle commence — il n'y a pas de "triche" possible puisque c'est déjà entièrement sous le contrôle du joueur qui configure, par design du jeu | N/A — ce ne sont pas des paramètres qu'un joueur *devrait* ne pas pouvoir changer |
| Manipulation des scores/récompenses | Voir section 3 — possible en théorie sur `game_history` mais sans impact réel (pas de classement public, pas de récompense liée) | 🟢 FAIBLE |

**Recommandation concrète et réaliste, pas un vœu pieux** : ne pas essayer de "sécuriser" ce qui ne peut pas l'être dans ce modèle (empêcher un joueur d'ouvrir DevTools sur son propre téléphone est illusoire — voir section 18 sur les limites de l'obfuscation/anti-tampering). La vraie protection du jeu, c'est sociale (celui qui triche en fouillant l'app gâche sa propre partie entre amis), pas technique — et c'est cohérent avec le fait que c'est déjà comme ça pour n'importe quel jeu "Loup-Garou"/Undercover physique (quelqu'un peut toujours tricher en regardant la carte du voisin).

---

## 10. Multijoueur et temps réel

**Non applicable** — confirmé, aucun WebSocket, aucune synchronisation réseau entre joueurs pendant une partie. Si tu envisages un jour un vrai mode multijoueur à distance (déjà mentionné comme piste explicitement déprioritisée dans la doc du projet), il faudra refaire cette section de l'audit à ce moment-là — l'architecture actuelle n'a simplement pas cette surface.

---

## 11. Protection contre les abus

| Mécanisme demandé | État actuel |
|---|---|
| Rate limiting sur la création de compte | Délégué à Supabase Auth (limites par défaut de la plateforme) — pas de logique applicative dédiée |
| CAPTCHA à l'inscription | ❌ Absent. Supabase Auth supporte nativement hCaptcha/Turnstile — à activer si des créations de comptes automatisées deviennent un problème réel. Pas urgent à ce stade (pas de signal d'abus constaté). |
| Limitation par IP | Non gérée par le code applicatif — dépend de la plateforme Supabase/Netlify |
| Détection de fraude à l'abonnement | Stripe Radar (protection anti-fraude intégrée à Stripe) s'applique automatiquement à tous les paiements Checkout — **NON VÉRIFIABLE avec le projet actuel** si Radar est en mode "actif avec blocage" ou juste "scoring" dans les réglages Stripe, à vérifier dans Radar → Règles. |
| Création massive de parties / flood | Non applicable au sens "abus serveur" — une partie ne touche jamais le backend tant qu'elle n'est pas terminée par un compte connecté (`finishGame` → `game_history`), donc "créer 1000 parties" ne coûte rien côté infrastructure, ça reste local |
| Exploitation des fonctionnalités gratuites | Voir section 3/4 — possible mais sans impact sécurité, impact business uniquement |

Pas de recommandation urgente ici — le principal signal qui justifierait d'investir dans ces mécanismes serait un abus réel constaté (pic de créations de comptes, spam sur le formulaire, etc.), rien de tel n'est visible aujourd'hui.

---

## 12. Données personnelles et confidentialité (RGPD)

C'est un point concret à traiter avant toute publication visant l'Europe (ce qui semble être le cas, domaine `.fr`, langue française).

### Données réellement collectées

| Donnée | Nécessaire ? | Sensible ? | Durée de conservation actuelle |
|---|---|---|---|
| Email | Oui (identifiant de compte) | Oui (donnée personnelle directe) | Indéfinie — pas de politique de purge |
| Mot de passe (hashé par Supabase Auth, jamais en clair côté toi) | Oui | Oui, mais correctement géré (hash, jamais visible même par toi) | Indéfinie |
| Nom affiché | Non strictement nécessaire (optionnel à l'inscription) | Faible | Indéfinie |
| Photo de profil | Non nécessaire au jeu | Oui potentiellement (photo de visage) | Indéfinie, bucket public en lecture (voir remarque ci-dessous) |
| Historique de parties (`game_history`) | Fonctionnalité produit, pas indispensable | Faible | Indéfinie |
| Données de paiement | Gérées entièrement par Stripe — **toi tu ne stockes que** `stripe_customer_id`/`stripe_subscription_id`/`stripe_payment_intent_id` (des identifiants, pas de numéro de carte) | Ces identifiants sont peu sensibles isolément | Indéfinie |
| Analytics (Cloudflare Web Analytics, mentionné dans la doc projet) | Marketing/mesure d'audience | Faible si correctement configuré (Cloudflare Web Analytics est annoncé sans cookies par Cloudflare) | Selon rétention Cloudflare, **NON VÉRIFIABLE depuis ce projet** |

### Ce qui manque concrètement pour être conforme RGPD (pas des généralités)

1. **Droit à l'effacement (article 17)** : implémenter un vrai bouton "Supprimer mon compte" dans `AccountScreen.jsx`, qui appelle une fonction Edge dédiée (avec la Service Role Key, car `auth.admin.deleteUser` n'est pas accessible depuis le client) — le schéma SQL est déjà prêt pour ça (`on delete cascade` sur les tables dérivées), il manque juste le déclencheur. **C'est aussi une exigence Apple obligatoire depuis 2022**, donc un seul développement répond aux deux besoins.
2. **Politique de confidentialité** : aucune page/document de ce type n'existe dans le projet actuel — à rédiger avant publication (obligatoire pour les stores ET pour le RGPD), décrivant précisément : quelles données, pourquoi, combien de temps, qui y a accès (toi, Supabase en tant que sous-traitant, Stripe en tant que sous-traitant, Resend pour l'envoi d'email), et comment exercer ses droits.
3. **Droit d'accès/de rectification** : un utilisateur peut déjà voir/modifier son nom et sa photo dans `AccountScreen.jsx` — mais pas voir "toutes les données que tu détiens sur lui" en un clic (export de données). Pour une app de ce volume, un simple bouton "M'envoyer mes données par email" (déclenché manuellement par toi en répondant à une demande, pas besoin d'automatiser tout de suite) suffit légalement dans un premier temps.
4. **Minimisation** : `game_history` capture beaucoup de détails (`category`, `championship`, `era`, `game_mode`, `num_players`, etc.) sans finalité déclarée claire au-delà de l'affichage à l'utilisateur lui-même — pas un problème RGPD en soi tant que ce n'est utilisé que pour ça et affiché qu'à son propriétaire (RLS le garantit), mais à mentionner explicitement dans la politique de confidentialité.
5. **Bucket avatars public en lecture** : par design (documenté, nécessaire pour afficher les photos sans authentifier chaque requête) — mais ça veut dire qu'une photo de profil uploadée est **accessible par son URL directe à n'importe qui qui la devine ou l'intercepte**, pas seulement dans l'app. Comme les noms de fichiers suivent le format `<uuid>/avatar.<ext>` (UUID non devinable), le risque pratique est faible, mais à mentionner explicitement dans la politique de confidentialité ("ta photo de profil est accessible via une URL directe, non indexée, mais techniquement publique").
6. **Sous-traitants tiers à lister** dans la politique de confidentialité : Supabase (hébergement/DB, UE ou US selon la région du projet — **NON VÉRIFIABLE avec ce projet**, à vérifier dans Project Settings → General → Region), Stripe (paiement), Resend (email), Netlify (hébergement du site), Cloudflare (analytics).

---

## 13. Paiements (détail Apple/Google, pertinent pour la publication)

Aujourd'hui : 100% Stripe Checkout web, pas d'IAP. Ce que tu devras faire évoluer **spécifiquement pour la publication sur les stores** :

- **Apple** exige en général que le contenu numérique consommé *dans* l'app passe par In-App Purchase (commission Apple ~15-30%, ou ~10-20% pour les abonnés de longue durée) — **sauf** le cas déjà noté dans ta doc projet : depuis la mise à jour DMA d'Apple (octobre 2026), les utilisateurs UE peuvent utiliser un système de paiement tiers (Stripe) directement dans l'app iOS, avec une commission réduite mais toujours due à Apple. **Ce point évolue vite, à reconfirmer sur les pages officielles Apple au moment exact de la soumission** (déjà noté comme tel dans ta doc projet, toujours vrai).
- **Google Play** est historiquement plus souple sur ce point pour certaines catégories, mais les mêmes règles Play Billing s'appliquent en général au contenu numérique consommé dans l'app.
- **Ce qui doit rester côté serveur, quel que soit le fournisseur** : la validation du reçu/de la transaction. Ne **jamais** faire confiance à un statut "achat réussi" renvoyé uniquement par le SDK client (App Store Server API côté Apple, Google Play Developer API côté Google) — exactement le même principe que ce qui est déjà bien fait avec Stripe (webhook signé, jamais le client qui déclare son propre succès).
- **Achats restaurés** ("Restore Purchases", obligatoire sur iOS) : à câbler le jour où l'IAP natif est ajouté — ta table `purchases` déjà en place peut servir de base, il faudra juste un endpoit de synchronisation reçu Apple/Google → ligne `purchases`, sur le même modèle que `stripe-webhook`.

---

## 14. Administration

Non applicable — pas d'espace admin dans le projet actuel (confirmé par recherche exhaustive). Si tu en crées un un jour : compte séparé (pas juste un flag `is_admin` sur `public.users` modifiable par erreur), MFA obligatoire, et toutes les actions sensibles (bannir, rembourser, supprimer) journalisées dans une table d'audit dédiée.

---

## 15. Logs et monitoring

- Les fonctions Edge utilisent `console.error`/`console.warn` pour les erreurs — relu le contenu de ces logs dans le code : aucun ne journalise de mot de passe, jeton, ou donnée de carte. Les erreurs Stripe sont loggées avec l'objet d'erreur complet (`console.error("Erreur Stripe:", session)`), qui peut contenir l'email du client (`customer_email`) — acceptable pour du debug interne visible seulement par toi dans le dashboard Supabase, mais à garder en tête si tu partages un jour ces logs avec un tiers.
- **Monitoring actif d'attaques/fraude** : rien de custom aujourd'hui, tu dépends des outils intégrés à chaque plateforme (Stripe Radar pour la fraude paiement, dashboard Auth de Supabase pour les tentatives de connexion). Pour un projet de cette taille, c'est raisonnable — construire un système de monitoring maison serait disproportionné tant qu'aucun abus réel n'est constaté.

---

## 16. Sécurité réseau

- HTTPS : forcé partout (Netlify sert en HTTPS par défaut, Supabase/Stripe n'exposent que du HTTPS) — rien à configurer de plus ici.
- **En-têtes de sécurité HTTP absents** (déjà signalé section 1) — pas de fichier `_headers`/`netlify.toml` dans le dépôt. À ajouter : `Content-Security-Policy`, `X-Frame-Options: DENY` (ou `frame-ancestors 'none'` en CSP), `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`.
- **Certificate pinning** : **pas pertinent pour cette app**. Le pinning protège contre un attaquant capable d'intercepter le trafic avec un certificat frauduleux (ex. app bancaire, données très sensibles en transit) — ici, la donnée la plus sensible qui transite est un jeton de session de jeu, et le pinning ajoute une vraie contrainte opérationnelle (renouvellement de certificat = mise à jour d'app obligatoire, risque de casser l'app si mal géré). Le rapport coût/bénéfice ne le justifie pas pour ce projet.

---

## 17. Dépendances et supply chain

`npm audit` exécuté sur les deux `package.json` du projet :

| Paquet | Sévérité | Détail | Impact réel |
|---|---|---|---|
| `uuid` (< 11.1.1) | Modérée (CVSS 7.5) | Dépendance transitive de `xcode`, elle-même dépendance de `@capacitor/cli` — GHSA-w5hq-g745-h8pq, dépassement de tampon si un buffer est fourni en paramètre | 🟢 FAIBLE en pratique — `@capacitor/cli` est un **outil de build** (utilisé pour `npx cap sync`), son code ne finit jamais dans le bundle `index.html` ni dans l'app iOS/Android livrée. À corriger par hygiène (`npm audit fix`, ou mise à jour majeure de `@capacitor/cli` proposée par l'audit), pas urgent. |
| `build/` (Babel, Terser) | ✅ 0 vulnérabilité | `npm audit` propre sur ce sous-dossier |

**Stratégie de mise à jour recommandée** : lancer `npm audit` (racine + `build/`) à chaque session de travail importante, et avant chaque publication sur les stores en particulier — pas besoin d'automatiser plus que ça vu la taille du projet (pas de CI/CD constatée dans le dépôt).

---

## 18. Protection du code

Réponse directe à tes questions :

- **Ce qui peut être obfusqué** : le JS applicatif (actuellement seulement *minifié* par Terser via `npm run build`, pas obfusqué — la minification retire les noms de variables/espaces, l'obfuscation va plus loin en rendant la logique difficile à suivre même déminifiée). Tu pourrais ajouter un obfuscateur JS (ex. `javascript-obfuscator`) à l'étape de build.
- **Ce qui NE peut jamais être considéré comme secret**, obfuscation ou pas : tout ce qui doit être lu par le navigateur pour fonctionner. L'obfuscation JS retarde la lecture par un humain, elle ne l'empêche pas — un attaquant motivé peut toujours désobfusquer ou simplement observer le trafic réseau/le comportement runtime pour retrouver la logique. **Ne présente jamais l'obfuscation comme une protection réelle** (ta propre consigne, et elle est juste) — c'est une gêne, pas un mur.
- **Comment protéger les clés** : la seule vraie protection, déjà appliquée ici, c'est de ne jamais mettre de secret réel côté client — l'obfuscation ne protège rien qui doive rester vraiment secret.
- **Root/jailbreak detection** : pertinent seulement si l'app manipule des données à très fort enjeu (paiement in-app natif avec logique de déblocage côté client, DRM). Ici, comme le déblocage premium réel est vérifié côté serveur (section 4), un appareil rooté/jailbreaké ne donne à un attaquant aucun accès qu'il n'aurait pas déjà en modifiant simplement le JS dans un navigateur desktop. **Pas nécessaire pour ce projet.**
- **Détection de modification de l'app** : même logique — pertinent pour empêcher la distribution d'un clone modifié qui trahirait ta marque/ferait de la fraude en ton nom, moins pertinent pour protéger une logique métier qui de toute façon n'a rien de secret à protéger côté client.

---

## 19. Sécurité des mises à jour

- Pas de mécanisme de version minimale forcée aujourd'hui — l'app web (`imposteur-foot.netlify.app`) se met à jour instantanément pour tout le monde à chaque déploiement, donc "ancienne version compromise" n'a pas vraiment de sens côté web. **Ça change avec Capacitor** : une fois publiée sur les stores, une version buggée installée sur un téléphone reste figée tant que l'utilisateur ne met pas à jour manuellement (ou automatiquement selon ses réglages).
- **Recommandation pour bloquer progressivement une ancienne version compromise** : ajouter un petit contrôle de version côté client au démarrage — l'app appelle un endpoint simple (ou lit une valeur publique, ex. un fichier JSON hébergé sur Netlify) donnant la version minimale requise ; si la version embarquée est inférieure, afficher un écran "Mets à jour l'app" avec un lien vers le store, plutôt que de laisser tourner une version qu'on sait vulnérable. Pas nécessaire avant la première publication, mais bon réflexe à prévoir dans les 1-2 premières mises à jour post-lancement.

---

## 20. Architecture cible recommandée

```
┌─────────────────────────────────────────────────────────────┐
│ APPLICATION MOBILE (iOS / Android via Capacitor WebView)      │
│  - UI, état de partie local (rôles/votes en mémoire, jamais   │
│    envoyés au réseau pendant la partie)                       │
│  - Jeton de session : à migrer vers Keychain/Keystore         │
│    (via un storage adapter custom du SDK Supabase)            │
│  - AUCUN secret serveur, uniquement clés publiques            │
└───────────────────────────┬─────────────────────────────────┘
                             │ HTTPS uniquement, Authorization: Bearer
┌───────────────────────────▼─────────────────────────────────┐
│ API / BACKEND — Supabase Edge Functions (Deno)                 │
│  - create-checkout-session, create-portal-session :            │
│    revérifient TOUJOURS le jeton auprès de /auth/v1/user        │
│  - stripe-webhook : vérifie TOUJOURS la signature HMAC          │
│  - Aucune fonction ne fait confiance à un ID envoyé par le client│
└───────────────────────────┬─────────────────────────────────┘
                             │
┌───────────────────────────▼─────────────────────────────────┐
│ AUTHENTIFICATION — Supabase Auth                                │
│  - Email + mot de passe (hash géré par Supabase, jamais par toi)│
│  - JWT courte durée + refresh token rotatif                     │
│  - À ajouter : reset password, delete account, MFA optionnel    │
└───────────────────────────┬─────────────────────────────────┘
                             │
┌───────────────────────────▼─────────────────────────────────┐
│ BASE DE DONNÉES — Postgres (Supabase), RLS activée partout      │
│  - public.users, public.purchases (lecture seule client),        │
│    public.game_history — chaque table : auth.uid() = owner       │
│  - AUCUNE écriture client sur purchases (webhook uniquement,     │
│    Service Role Key, contourne RLS volontairement à cet endroit) │
└───────────────────────────┬─────────────────────────────────┘
                             │
┌───────────────────────────▼─────────────────────────────────┐
│ SERVICES DE PAIEMENT — Stripe (web) + App Store/Play (natif futur)│
│  - Source de vérité du paiement, jamais le client                │
│  - Webhooks signés → seule voie d'écriture de purchases          │
└───────────────────────────┬─────────────────────────────────┘
                             │
┌───────────────────────────▼─────────────────────────────────┐
│ SERVICES EXTERNES — Resend (email), Cloudflare (analytics),      │
│                     Netlify (hébergement web)                    │
│  - Aucun n'a accès aux secrets de paiement/base de données        │
└───────────────────────────────────────────────────────────────┘
```

**Ce qui doit être considéré comme secret, jamais exposé** : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, toute future clé API Apple/Google Server-to-Server pour la validation de reçus.

**Ce qui peut être exposé au client sans risque** : `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`, les Price ID Stripe — tous protégés non pas par leur confidentialité mais par les contrôles d'accès (RLS, vérification serveur) qui s'appliquent peu importe qui les utilise.

---

## 21. Modèle de menace

| # | Attaquant | Ce qu'il pourrait tenter | Protection nécessaire | L'architecture actuelle l'empêche-t-elle ? |
|---|---|---|---|---|
| 1 | Utilisateur normal curieux | Ouvrir les DevTools pour voir "comment ça marche" | Aucune donnée sensible d'autrui accessible depuis le client | ✅ Oui — rien de sensible n'est exposé à la simple curiosité |
| 2 | Utilisateur malveillant | Essayer de lire les données d'un autre compte via l'API | RLS Postgres | ✅ Oui, testé empiriquement (section 1) |
| 3 | Joueur voulant tricher (pendant une partie) | Lire l'état React pour voir le rôle des autres joueurs sur le téléphone qu'il tient | Aucune protection technique possible dans ce modèle "un seul appareil" | ⚠️ Non empêché — limite architecturale assumée, voir section 9 |
| 4 | Utilisateur Premium frauduleux | Se donner `isPremium=true` en local pour débloquer le jeu gratuitement | Le flag local n'a aucune valeur serveur ; aucune donnée d'autrui ni argent réel affecté | ✅ Empêché pour ce qui compte (aucune fraude sur un tiers) — la variable locale reste modifiable mais sans conséquence au-delà du propre appareil de l'utilisateur |
| 5 | Attaquant ayant accès physique au téléphone | Extraire le jeton de session via `adb backup` ou un accès root | `allowBackup=false` + stockage sécurisé du jeton (Keychain/Keystore) | ❌ Pas encore — `allowBackup="true"` actuellement, jeton en `localStorage` non chiffré (section 7) |
| 6 | Attaquant interceptant/modifiant les requêtes (MITM) | Modifier une requête vers l'API Supabase en transit | HTTPS partout, RLS server-side (une requête modifiée reste soumise aux mêmes policies) | ✅ Oui — modifier une requête ne contourne pas RLS, qui s'applique peu importe le contenu envoyé |
| 7 | Attaquant ayant décompilé l'app | Lire tout le JS pour comprendre la logique, chercher des secrets | Aucun secret côté client (vérifié section 1/8) | ✅ Oui — rien à trouver de sensible dans le bundle |
| 8 | Attaquant automatisant les appels API | Spammer `create-checkout-session`, créer des comptes en masse | Rate limiting Supabase par défaut ; pas de protection applicative dédiée | ⚠️ Partiellement — dépend des limites plateforme, pas de CAPTCHA/rate-limit maison (section 11) |
| 9 | Attaquant visant le backend directement | Essayer d'écrire dans `purchases` sans passer par le webhook | RLS sans policy insert/update client | ✅ Oui, confirmé par lecture du schéma |
| 10 | Attaquant visant un compte admin | Élever ses privilèges vers un rôle admin | N/A — pas de rôle admin dans le système actuel | ✅ Sans objet (rien à élever vers) |

---

## 22. Tests de sécurité à effectuer avant publication

| # | Test | Procédure | Résultat attendu | Comportement dangereux à surveiller | Priorité |
|---|---|---|---|---|---|
| 1 | Devenir Premium gratuitement | Modifier `isPremium` en local (devtools), relancer l'app, vérifier que ça persiste après un `purchases` re-fetch depuis un autre appareil/session | Le badge Premium ne doit refléter que ce que `purchases` renvoie réellement côté serveur | Si le statut "survit" à un refresh de session avec un compte sans achat réel, il y a une régression | 🔴 |
| 2 | Accéder aux données d'un autre utilisateur | Avec deux comptes de test, essayer `select` sur `purchases`/`users`/`game_history` avec l'`user_id` de l'autre compte | `[]` ou erreur, jamais les vraies données | Toute ligne appartenant à l'autre compte qui apparaît | 🔴 |
| 3 | Appeler une fonction Edge sensible sans jeton | `POST` direct vers `create-checkout-session`/`create-portal-session` sans en-tête `Authorization` | 401 | Toute réponse 200 avec une URL Stripe valide | 🔴 |
| 4 | Rejouer un webhook Stripe | Renvoyer deux fois le même événement `checkout.session.completed` (via le bouton "Renvoyer" du dashboard Stripe en mode test) | Une seule ligne `purchases` doit exister pour cet achat | Deux lignes créées pour le même paiement | 🟠 (actuellement **échouerait** — voir section 4, idempotence à ajouter) |
| 5 | Contourner la limite de parties gratuites | Vider `localStorage`/naviguer en privé après avoir épuisé les 5 parties | Comportement attendu et déjà assumé : la limite revient à zéro (soft-limit produit, pas un test de sécurité à proprement parler) | N/A — confirmer juste que rien de PIRE ne se produit (pas d'accès à des données serveur en plus) | 🟢 |
| 6 | Utiliser un compte après suppression | Une fois la fonctionnalité de suppression ajoutée (section 12) : supprimer un compte de test, réessayer de se connecter avec ses identifiants | Connexion refusée, toutes ses données dérivées absentes de la base | Connexion encore possible, ou données `game_history`/`purchases` orphelines encore lisibles | 🟠 (fonctionnalité à construire d'abord) |
| 7 | Réutiliser un ancien jeton après déconnexion | Se déconnecter, réessayer d'appeler l'API avec l'ancien `access_token` capturé avant déconnexion | Requête rejetée une fois le jeton expiré (le SDK Supabase ne révoque pas le JWT immédiatement à la déconnexion côté serveur — c'est un jeton court-lived, il expire de lui-même sous ~1h) | **NON VÉRIFIABLE finement sans accès au dashboard Supabase** pour confirmer le comportement exact de révocation | 🟡 |
| 8 | Vérifier l'annulation/le remboursement | Annuler un abonnement test via le Customer Portal (déjà fait cette session ✅), **puis** tester un remboursement d'accès à vie via le dashboard Stripe | Le statut `purchases` doit refléter le remboursement | Aucun changement de statut après remboursement — c'est le comportement **actuel connu** (section 4) | 🟠 |
| 9 | Vérifier les en-têtes de sécurité une fois ajoutés | `curl -I https://imposteur-foot.netlify.app/` | Présence de `Content-Security-Policy`, `X-Frame-Options` | En-têtes absents | 🟠 |
| 10 | Vérifier `allowBackup` une fois corrigé | `adb backup` sur un appareil de test après le fix | Backup vide/refusé pour cette app | Données de l'app présentes dans le backup | 🟡 |

---

## 23. Priorisation finale

### 🔴 CRITIQUE — à corriger avant toute mise en production

*(Aucun trouvé.)* Aucune faille ne permet aujourd'hui d'accéder aux données d'un autre utilisateur, de se payer un abonnement gratuitement de façon exploitable à distance, ou de faire fuiter un secret serveur.

### 🟠 ÉLEVÉ — à corriger avant le lancement si possible

| Problème | Risque | Correction | Fichier concerné |
|---|---|---|---|
| Aucun flux de récupération de mot de passe | Utilisateurs définitivement bloqués hors de leur compte, mauvaise expérience à grande échelle | Ajouter `supabaseClient.auth.resetPasswordForEmail()` + un écran de saisie du nouveau mot de passe (`updateUser`) | `src/screens/AccountScreen.jsx` |
| Aucune fonctionnalité de suppression de compte | Non-conformité RGPD (droit à l'effacement) + **rejet quasi certain par Apple** à la revue de l'app | Bouton "Supprimer mon compte" → nouvelle fonction Edge avec Service Role Key appelant `auth.admin.deleteUser` | Nouveau fichier `supabase/functions/delete-account/index.ts` + `AccountScreen.jsx` |
| Remboursement d'un accès à vie non synchronisé | Un utilisateur remboursé garde l'accès premium indéfiniment — perte financière directe et répétable | Gérer l'événement `charge.refunded` dans le webhook, repasser `status` à `'refunded'`, exclure ce statut du calcul `isPremium` | `supabase/functions/stripe-webhook/index.ts` |
| Aucun en-tête de sécurité HTTP (CSP, anti-clickjacking) sur Netlify | Un site tiers pourrait embarquer le jeu en iframe invisible pour piéger un clic sur "S'abonner" | Ajouter un fichier `_headers` à la racine (voir contenu proposé plus bas) | Nouveau fichier `_headers` (racine du dépôt) |

### 🟡 MOYEN — à corriger rapidement après le lancement

| Problème | Risque | Correction | Fichier concerné |
|---|---|---|---|
| `android:allowBackup="true"` | Jeton de session extractible via `adb backup` sur un appareil non verrouillé | Passer à `android:allowBackup="false"` | `android/app/src/main/AndroidManifest.xml` |
| Jeton de session en `localStorage` non chiffré (WebView) | Extraction possible avec un accès root/jailbreak à l'appareil | Fournir un `storage` custom à `createClient()` basé sur un plugin de stockage sécurisé (Keychain/Keystore) | `src/data/supabase-config.js` |
| Policy RLS `UPDATE` sur `public.users` sans restriction de colonnes | Un utilisateur pourrait modifier `avatar_url`/`display_name`/`email` de sa propre ligne via un appel API direct hors de l'UI prévue — impact limité (pas de XSS, pas de fuite vers d'autres utilisateurs) mais hors du comportement voulu | Ajouter une policy plus stricte ou une fonction RPC dédiée qui valide le format d'`avatar_url` avant écriture | `docs/schema-comptes-premium.sql` (nouvelle migration) |
| ✅ Webhook Stripe non idempotent — **corrigé le 27 août 2026** | Un événement Stripe renvoyé deux fois duplique la ligne `purchases` | Contrainte `unique` sur `stripe_payment_intent_id`/`stripe_subscription_id` (code déjà à jour dans `stripe-webhook/index.ts`, upsert `ON CONFLICT DO NOTHING`) — **reste à lancer manuellement `docs/migration-idempotence-webhook.sql` dans le SQL Editor Supabase du projet réel** pour que la contrainte existe côté base, sinon le code seul ne suffit pas | `docs/schema-comptes-premium.sql`, `docs/migration-idempotence-webhook.sql` (nouveau) + `supabase/functions/stripe-webhook/index.ts` |
| Comparaison de signature Stripe non "constant-time" | Risque théorique d'attaque temporelle sur la vérification HMAC (impact pratique très faible sur un réseau réel) | Remplacer `expected === signature` par une comparaison en temps constant | `supabase/functions/stripe-webhook/index.ts` |

### 🟢 FAIBLE — amélioration de sécurité

| Problème | Risque | Correction | Fichier concerné |
|---|---|---|---|
| Dépendance `uuid` vulnérable via `@capacitor/cli` | Quasi nul — outil de build, jamais livré dans l'app | `npm audit fix` / mise à jour majeure de `@capacitor/cli` | `package.json` (racine) |
| CORS `*` sur les fonctions Edge | Faible — auth par Bearer token, pas par cookie | Restreindre `Access-Control-Allow-Origin` au domaine réel du site en production | Les 3 fichiers `supabase/functions/*/index.ts` |
| Pas de rate limiting applicatif sur les fonctions Edge | Abus de ressources possible en théorie (spam de sessions Stripe inutilisées) | Ajouter une limite simple par utilisateur (ex. table de compteur avec fenêtre glissante) si un abus réel est constaté | `supabase/functions/create-checkout-session/index.ts` |
| `game_history` accepte tout contenu sans validation de cohérence | Un joueur pourrait s'écrire un historique fictif — sans impact tant qu'il n'y a pas de classement public | Ajouter des `check` SQL basiques (`num_players > 0`, `winner_side in (...)`) | `docs/schema-comptes-premium.sql` |
| Pas d'obfuscation JS (seulement minification) | Facilite la lecture du code par un attaquant curieux — sans exposer de secret réel | Ajouter un obfuscateur à l'étape de build si tu veux gêner la copie du concept, pas une urgence sécurité | `build/build.js` |
| Pas de contrôle de version minimale forcée | Une future version buggée/vulnérable pourrait rester installée indéfiniment sur d'anciens téléphones | Ajouter un check de version au démarrage une fois l'app publiée (voir section 19) | `src/app/imposteurfoot_11.html` |

### ℹ️ Non vérifiable avec le projet actuel — à vérifier/mettre en place manuellement

- Réglage exact "Confirm email" côté Supabase Auth (dashboard).
- Rate limiting précis sur les tentatives de connexion par mot de passe (dashboard Supabase → Authentication → Rate Limits).
- Région d'hébergement du projet Supabase (UE ou US — pertinent pour la politique de confidentialité RGPD).
- `targetSdkVersion`/config ProGuard-R8/`network_security_config.xml` Android — projet natif pas encore généré (aucun fichier `.gradle` présent).

---

## Checklist de sécurité finale avant publication App Store / Google Play

### Obligatoire

- [ ] Fonctionnalité de suppression de compte (exigence Apple + RGPD)
- [ ] Politique de confidentialité publiée (lien accessible depuis l'app et les fiches store)
- [ ] Flux de récupération de mot de passe
- [ ] Gestion du remboursement d'accès à vie côté webhook
- [ ] Formulaire "App Privacy" (Apple) / "Data Safety" (Google) rempli honnêtement à partir de la table des données collectées (section 12)
- [ ] Décision définitive et vérifiée sur le mode de paiement (Stripe direct UE via DMA vs IAP natif) avant soumission — règles à reconfirmer sur les pages officielles Apple/Google au moment de soumettre
- [ ] `android:allowBackup="false"`
- [ ] En-têtes de sécurité HTTP sur le site web (`_headers` Netlify)

### Fortement recommandé

- [ ] Migration du jeton de session vers un stockage sécurisé (Keychain/Keystore)
- [ ] Contrainte d'idempotence sur les webhooks Stripe
- [ ] `npm audit` propre (ou vulnérabilités restantes documentées comme acceptées, comme `uuid`/`@capacitor/cli` ici)
- [ ] Test complet de la checklist section 22 sur un vrai appareil (pas seulement le navigateur desktop)
- [ ] Vérification manuelle des réglages Supabase listés en "non vérifiable" ci-dessus

### Optionnel

- [ ] MFA pour les comptes (peu d'intérêt tant qu'il n'y a pas d'espace admin)
- [ ] CAPTCHA à l'inscription (à activer seulement si un abus réel est constaté)
- [ ] Obfuscation JS en plus de la minification
- [ ] Contrôle de version minimale forcée
- [ ] Détection root/jailbreak (non recommandé ici vu le modèle de menace réel du jeu)

---

*Aucun fichier du projet n'a été modifié pendant cet audit. Dis-moi par quoi tu veux commencer — je recommande l'ordre de la section 23 (🟠 d'abord), en particulier "suppression de compte" et "en-têtes de sécurité", qui sont rapides à mettre en place et lèvent les deux plus gros blocages avant publication.*
