-- =============================================================================
-- Migration : idempotence du webhook Stripe (purchases)
-- ---------------------------------------------------------------------------
-- Où l'exécuter : projet Supabase existant, menu de gauche > "SQL Editor" >
-- "New query", colle tout ce fichier, clique "Run".
--
-- Contrairement à docs/schema-comptes-premium.sql (pensé pour un projet
-- NEUF où la table purchases n'existe pas encore), ce fichier AJOUTE une
-- contrainte à une table public.purchases déjà en place — donc à lancer une
-- seule fois, sur le projet réel.
--
-- Pourquoi : voir audit-securite-imposteur-foot.md, section 23 (🟡 MOYEN).
-- Stripe peut renvoyer le même événement checkout.session.completed
-- plusieurs fois (retry réseau si la réponse de la fonction stripe-webhook
-- tarde ou échoue une première fois) — sans contrainte unique, la fonction
-- insérait une deuxième ligne purchases pour le même achat à chaque renvoi.
-- Le code de supabase/functions/stripe-webhook/index.ts a déjà été mis à
-- jour pour upserter (ON CONFLICT DO NOTHING) plutôt qu'insérer en aveugle
-- — mais ça ne prend effet que si la contrainte unique existe réellement
-- en base, d'où cette migration.
-- =============================================================================

-- 1. Vérifier D'ABORD qu'aucun doublon n'existe déjà (une contrainte unique
--    refuse de se créer s'il y a déjà des doublons en base). Lance ces deux
--    requêtes ; si l'une des deux renvoie une ligne, il existe un vrai
--    doublon à nettoyer à la main (garder la ligne la plus récente d'après
--    created_at, supprimer les autres) avant de passer à l'étape 2. Si les
--    deux ne renvoient rien, tout est propre, passe directement à l'étape 2.

select stripe_subscription_id, count(*)
from public.purchases
where stripe_subscription_id is not null
group by stripe_subscription_id
having count(*) > 1;

select stripe_payment_intent_id, count(*)
from public.purchases
where stripe_payment_intent_id is not null
group by stripe_payment_intent_id
having count(*) > 1;

-- 2. Ajouter les contraintes uniques. NULL reste autorisé en plusieurs
--    exemplaires (comportement standard Postgres : NULL n'est jamais égal
--    à NULL) — ça ne gêne donc pas les lignes où l'une des deux colonnes
--    n'est pas renseignée (ex. stripe_subscription_id vide pour un achat à
--    vie, ou l'inverse pour un abonnement sans payment_intent immédiat).

alter table public.purchases
  add constraint purchases_stripe_subscription_id_key unique (stripe_subscription_id);

alter table public.purchases
  add constraint purchases_stripe_payment_intent_id_key unique (stripe_payment_intent_id);

-- Une fois lancé avec succès, la fonction stripe-webhook (déjà mise à jour
-- côté code) devient réellement idempotente : un même événement Stripe
-- renvoyé plusieurs fois ne crée plus qu'une seule ligne purchases.
