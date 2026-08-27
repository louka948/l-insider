-- =============================================================================
-- Imposteur Foot — schéma comptes/premium (v3), à coller dans Supabase
-- ---------------------------------------------------------------------------
-- Où l'exécuter : dans ton projet Supabase, menu de gauche > "SQL Editor" >
-- "New query", colle tout ce fichier, clique "Run". Peut être relancé sans
-- risque sur un projet neuf (les tables n'existent pas encore).
--
-- Correspond au schéma décrit dans docs/schema-comptes-premium-v3.dbml et
-- dans le doc projet "modele-economique-comptes-premium.md".
--
-- Phase actuelle (voir CLAUDE.md / doc projet "Prochaine étape") : on ne
-- câble que les comptes (inscription/connexion/photo de profil) pour l'instant,
-- pas encore Stripe. Les tables purchases/game_history sont créées main-
-- tenant pour ne pas avoir à revenir dessus, mais restent vides tant que ces
-- fonctionnalités ne sont pas branchées côté appli.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users — profil applicatif (nom affiché, photo), lié 1-1 à l'utilisateur
-- Supabase Auth (auth.users, gérée automatiquement par Supabase — table
-- système, jamais créée à la main).
-- -----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Un utilisateur peut lire son propre profil"
  on public.users for select
  using (auth.uid() = id);

create policy "Un utilisateur peut modifier son propre profil"
  on public.users for update
  using (auth.uid() = id);

-- Remplit automatiquement la ligne public.users dès qu'un compte est créé
-- côté Supabase Auth (inscription email/mot de passe) — évite d'avoir à le
-- faire manuellement côté appli à chaque signup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- purchases — abonnement (Stripe Billing) OU déblocage à vie (paiement
-- unique). Pas encore utilisée tant que Stripe n'est pas branché (étape
-- suivante), mais créée maintenant pour que le schéma soit complet.
-- -----------------------------------------------------------------------------
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('subscription', 'lifetime')),
  status text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  price_cents int,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

-- Idempotence webhook Stripe (audit-securite-imposteur-foot.md, section 23,
-- 🟡 MOYEN) : Stripe peut renvoyer le même événement checkout.session.completed
-- plusieurs fois (retry réseau si notre réponse tarde ou échoue) — sans ces
-- contraintes, la fonction stripe-webhook insérerait une deuxième ligne pour
-- le même achat à chaque renvoi. Une contrainte unique sur une colonne
-- nullable autorise plusieurs NULL (comportement standard Postgres : NULL
-- n'est jamais égal à NULL), donc ça ne gêne pas les lignes où l'une des deux
-- colonnes n'est pas renseignée (ex. subscription_id vide pour un achat à
-- vie). Pour appliquer ça à un projet déjà existant (tables déjà créées, pas
-- question de relancer ce fichier depuis zéro), voir
-- docs/migration-idempotence-webhook.sql à la place.
alter table public.purchases
  add constraint purchases_stripe_subscription_id_key unique (stripe_subscription_id);
alter table public.purchases
  add constraint purchases_stripe_payment_intent_id_key unique (stripe_payment_intent_id);

create policy "Un utilisateur peut lire ses propres achats"
  on public.purchases for select
  using (auth.uid() = user_id);

-- Volontairement AUCUNE policy insert/update ici : les lignes purchases ne
-- doivent être écrites que par la future fonction serveur qui reçoit les
-- webhooks Stripe (avec la Secret key, qui contourne RLS) — jamais
-- directement depuis l'appli/le navigateur, pour qu'un utilisateur ne
-- puisse pas se donner le statut premium lui-même.

-- -----------------------------------------------------------------------------
-- game_history — résumé de parties (comptes uniquement, jamais les parties
-- anonymes). Pas de détail round par round pour cette v1.
-- -----------------------------------------------------------------------------
create table public.game_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category text,
  championship text,
  era text,
  game_mode text,
  num_players int,
  num_infiltrators int,
  has_blank_card boolean,
  winner_side text,
  played_at timestamptz not null default now(),
  duration_seconds int
);

alter table public.game_history enable row level security;

create policy "Un utilisateur peut lire son propre historique"
  on public.game_history for select
  using (auth.uid() = user_id);

create policy "Un utilisateur peut ajouter à son propre historique"
  on public.game_history for insert
  with check (auth.uid() = user_id);
