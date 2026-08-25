# Checklist Stripe — ce qu'il faut créer avant qu'on câble le paiement

Comme pour Supabase, je ne peux pas créer de compte à ta place (ni entrer
d'informations bancaires) — c'est une règle que je ne peux pas contourner.
Voici la liste précise de ce qu'il faut que tu crées de ton côté sur
[stripe.com](https://stripe.com), avant que je puisse écrire le code du
paiement. Une fois que tu as fait ça, reviens avec les infos demandées et on
avance vite.

## 1. Créer le compte Stripe

Inscription classique sur stripe.com. Pas besoin d'activer le compte pour de
vrai tout de suite : Stripe propose un **mode test** (bascule en haut du
dashboard) qui permet de tout construire et tester avec de fausses cartes
bancaires, sans toucher à de l'argent réel. On développera entièrement en
mode test, et tu activeras le compte (infos bancaires, etc.) seulement au
moment de vraiment lancer les paiements.

## 2. Créer les deux produits (Catalogue de produits)

Dans le dashboard Stripe, section **Produits** :

- **Produit 1 : "L'Insider — Abonnement"** *(renommé le 23 août 2026,
  s'appelait "Imposteur Foot — Abonnement")*
  Prix récurrent, **3,99€/mois**. Pense à activer un **essai gratuit de 7
  jours** sur ce prix (option disponible à la création du prix).
- **Produit 2 : "L'Insider — Accès à vie"** *(renommé le 23 août 2026,
  s'appelait "Imposteur Foot — Accès à vie")*
  Prix unique (one-time), **9,99€**.

Une fois créés, chaque prix a un identifiant du genre `price_1AbCdEfGh...` —
c'est ça qu'il me faudra (pas besoin de me donner le nom du produit, juste
ces deux identifiants `price_...`).

## 3. Le code promo de lancement (-30% le premier mois)

Dans **Produits → Coupons**, crée un coupon -30%, à associer à un code promo
("Promotion codes") avec une date d'expiration (`redeem_by`) correspondant à
la fin du premier mois après le lancement public. On appliquera ça
uniquement sur le prix "Accès à vie" (9,99€ → 6,99€). Pas besoin de le créer
tout de suite si la date de lancement n'est pas encore fixée — on pourra
l'ajouter plus tard sans rien changer au code.

## 4. Récupérer la clé publique (Publishable key)

**Développeurs → Clés API**. Donne-moi uniquement la **Publishable key**
(commence par `pk_test_...` en mode test) — c'est un identifiant public,
sans risque à partager ici, comme pour Supabase.

⚠️ Ne me donne **jamais** la **Secret key** (`sk_test_...` ou `sk_live_...`)
en clair dans la conversation. Elle devra être configurée directement dans
les paramètres sécurisés de la fonction serveur qui parlera à Stripe (une
Supabase Edge Function, prochaine étape technique) — jamais dans le code de
l'appli, jamais visible côté navigateur.

## 5. Ce qui viendra après (pas besoin de s'en occuper maintenant)

Une fois les infos ci-dessus en main, il restera à déployer une fonction
serveur (Supabase Edge Function) qui reçoit les événements Stripe
(webhooks) et écrit dans la table `purchases` déjà créée. Ça demandera
d'installer et de connecter la CLI Supabase — je te guiderai à ce moment-là,
étape par étape, comme pour le reste.

## Résumé — ce qu'il me faut de ta part

- [ ] Price ID de l'abonnement mensuel (`price_...`)
- [ ] Price ID du déblocage à vie (`price_...`)
- [ ] Publishable key Stripe (`pk_test_...`)
- [ ] (Optionnel, peut attendre) Code promo de lancement créé, avec sa date d'expiration
