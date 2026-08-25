-- =============================================================================
-- Imposteur Foot — bucket de stockage pour les photos de profil
-- ---------------------------------------------------------------------------
-- Où l'exécuter : même endroit que docs/schema-comptes-premium.sql — SQL
-- Editor de ton projet Supabase, colle, Run. Peut être relancé sans risque
-- (le "on conflict do nothing" évite une erreur si le bucket existe déjà).
--
-- Ce que ça crée : un bucket de stockage "avatars", public en LECTURE
-- (nécessaire pour afficher les photos dans le jeu sans authentification à
-- chaque fois) mais verrouillé en ÉCRITURE : chaque utilisateur ne peut
-- déposer/remplacer/supprimer que les fichiers dans SON PROPRE dossier
-- (convention de chemin : "<id utilisateur>/avatar.xxx"), jamais celui de
-- quelqu'un d'autre.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars lisibles par tous"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Un utilisateur dépose son propre avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Un utilisateur remplace son propre avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Un utilisateur supprime son propre avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
