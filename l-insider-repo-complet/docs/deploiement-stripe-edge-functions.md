# Déployer les fonctions Stripe (à faire une fois, côté Supabase)

Le code est prêt (`supabase/functions/create-checkout-session/` et
`supabase/functions/stripe-webhook/`), mais je ne peux pas le déployer
moi-même : ça demande d'être connecté à ton compte Supabase. Voici comment
faire, entièrement depuis le dashboard web (pas besoin d'installer la CLI
Supabase).

## 1. Créer la fonction `create-checkout-session`

Dans ton dashboard Supabase, menu de gauche **Edge Functions** → **New
function**. Nom exact : `create-checkout-session`.

Une fois créée, ouvre-la et remplace tout le contenu de l'éditeur par celui
du fichier `supabase/functions/create-checkout-session/index.ts` (copier-
coller intégral). Sauvegarde/déploie.

Laisse **"Enforce JWT Verification"** activé (réglage par défaut) — cette
fonction est bien appelée avec le jeton de connexion du joueur, c'est normal
qu'elle l'exige.

## 2. Créer la fonction `stripe-webhook`

Même chose : **Edge Functions** → **New function**, nom exact
`stripe-webhook`, colle le contenu de
`supabase/functions/stripe-webhook/index.ts`.

**⚠️ Cette fois, DÉSACTIVE "Enforce JWT Verification"** (décoche la case).
Stripe appelle cette adresse directement, sans jeton Supabase — la
vérification automatique la bloquerait sinon avant même que le code
s'exécute. La sécurité de cette fonction vient d'ailleurs (la signature
Stripe, vérifiée dans le code).

## 3. Ajouter le secret Stripe

Toujours dans **Edge Functions**, section **Secrets** (parfois appelée
"Manage secrets"). Ajoute :

- `STRIPE_SECRET_KEY` → ta clé secrète Stripe (**Développeurs → Clés API**
  sur le dashboard Stripe, celle qui commence par `sk_test_...`, PAS la
  Publishable key que tu m'as déjà donnée). Entre-la directement dans ce
  formulaire Supabase — ne me la donne jamais dans la conversation, je ne
  dois jamais la voir.

Ce secret est partagé par toutes tes fonctions, pas besoin de le répéter.

## 4. Récupérer l'URL du webhook et l'enregistrer côté Stripe

Une fois `stripe-webhook` déployée, son URL est :

```
https://pcsvgtpvccpozxsnixux.supabase.co/functions/v1/stripe-webhook
```

Sur le dashboard Stripe : **Développeurs → Webhooks → Ajouter un
endpoint**. Colle cette URL. Dans la liste des événements à écouter,
sélectionne :

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `charge.refunded` (ajouté le 23 août 2026, pour synchroniser un remboursement d'accès à vie —
  voir `audit-securite-imposteur-foot.md`, section 23)

Valide. Stripe affiche alors une **clé de signature** (commence par
`whsec_...`) — copie-la.

## 5. Ajouter le secret du webhook

Retour sur Supabase → **Edge Functions → Secrets**, ajoute :

- `STRIPE_WEBHOOK_SECRET` → la clé `whsec_...` récupérée à l'étape 4.

## 6. Tester

Avec le site en ligne (une fois redéployé sur Netlify avec ce nouveau
`index.html`), connecte-toi avec un compte, clique "S'abonner" ou
"Débloquer à vie". Stripe te redirige vers une page de paiement — utilise
une carte de test : numéro `4242 4242 4242 4242`, date/CVC/nom au hasard
(n'importe quelle date future, n'importe quel CVC à 3 chiffres). Le
paiement passe, tu es redirigé vers le jeu avec un message de confirmation,
et ton statut dans l'écran de compte doit passer à "Accès à vie" ou
"Abonnement (essai gratuit)" en quelques secondes.

Si quelque chose ne marche pas, regarde les logs de la fonction concernée
(Edge Functions → clique sur la fonction → onglet "Logs") — c'est là que
les erreurs s'affichent, et une capture d'écran de ces logs me permettra de
diagnostiquer le problème.

## Ce qui n'est pas encore fait

Avoir un compte + un achat actif ne change pour l'instant **rien** aux
options débloquées dans le jeu — la limite "5 parties gratuites, options
avancées verrouillées" continue de dépendre uniquement du fait d'avoir un
compte (gratuit ou payant), pas du statut premium réel. C'est un choix
volontaire : je préfère qu'on décide ensemble comment on veut faire pour un
compte gratuit non payant avant de changer ce comportement, plutôt que de le
changer moi-même sans validation.
