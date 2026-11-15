-- ============================================================
-- Base de données du site Entrepreneuriat BTS MCO
-- À exécuter UNE fois dans Supabase : SQL Editor > New query >
-- coller tout ce fichier > Run.
-- ============================================================

-- 1. Les classes et leur code d'inscription --------------------
create table if not exists public.classes (
  code   text primary key,
  nom    text not null,
  actif  boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Le profil de chaque utilisateur ---------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nom        text not null default '',
  prenom     text not null default '',
  classe     text references public.classes(code) on update cascade,
  role       text not null default 'etudiant' check (role in ('etudiant', 'prof')),
  created_at timestamptz not null default now()
);

-- 3. Le dossier en cours de chaque étudiant --------------------
create table if not exists public.dossiers (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  progress   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 4. Les PDF déposés -------------------------------------------
create table if not exists public.depots (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  path       text not null,
  filename   text,
  size       integer,
  created_at timestamptz not null default now()
);
create index if not exists depots_user_idx on public.depots(user_id, created_at desc);

-- 5. Qui est professeur ? --------------------------------------
create or replace function public.is_prof()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'prof');
$$;

-- 6. Création automatique du profil à l'inscription ------------
--    L'inscription est refusée si le code classe est inconnu ou fermé.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_classe text := upper(trim(coalesce(new.raw_user_meta_data->>'classe', '')));
begin
  if not exists (select 1 from public.classes where code = v_classe and actif) then
    raise exception 'CODE_CLASSE_INVALIDE';
  end if;
  insert into public.profiles (id, email, nom, prenom, classe)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'nom', ''),
          coalesce(new.raw_user_meta_data->>'prenom', ''),
          v_classe);
  insert into public.dossiers (user_id) values (new.id);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7. Sécurité : chacun ne voit que ce qui le concerne -----------
alter table public.classes  enable row level security;
alter table public.profiles enable row level security;
alter table public.dossiers enable row level security;
alter table public.depots   enable row level security;

drop policy if exists "classes lues par le prof" on public.classes;
create policy "classes lues par le prof" on public.classes for select using (public.is_prof());
drop policy if exists "classes gérées par le prof" on public.classes;
create policy "classes gérées par le prof" on public.classes for all using (public.is_prof()) with check (public.is_prof());

drop policy if exists "profil lu par soi ou le prof" on public.profiles;
create policy "profil lu par soi ou le prof" on public.profiles for select using (id = auth.uid() or public.is_prof());

drop policy if exists "dossier lu par soi ou le prof" on public.dossiers;
create policy "dossier lu par soi ou le prof" on public.dossiers for select using (user_id = auth.uid() or public.is_prof());
drop policy if exists "dossier créé par soi" on public.dossiers;
create policy "dossier créé par soi" on public.dossiers for insert with check (user_id = auth.uid());
drop policy if exists "dossier modifié par soi" on public.dossiers;
create policy "dossier modifié par soi" on public.dossiers for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dépôts lus par soi ou le prof" on public.depots;
create policy "dépôts lus par soi ou le prof" on public.depots for select using (user_id = auth.uid() or public.is_prof());
drop policy if exists "dépôt créé par soi" on public.depots;
create policy "dépôt créé par soi" on public.depots for insert with check (user_id = auth.uid());

-- 8. Le stockage des PDF ---------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('depots', 'depots', false, 10485760, array['application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

drop policy if exists "pdf déposé dans son dossier" on storage.objects;
create policy "pdf déposé dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'depots' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "pdf lu par soi ou le prof" on storage.objects;
create policy "pdf lu par soi ou le prof" on storage.objects for select to authenticated
  using (bucket_id = 'depots' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_prof()));

-- 9. Votre première classe (modifiez le code et le nom) ---------
insert into public.classes (code, nom) values ('MCO-2027', 'BTS MCO — session 2027')
on conflict (code) do nothing;
insert into public.classes (code, nom) values ('PROF-HR', 'Compte professeur')
on conflict (code) do nothing;

-- ============================================================
-- APRÈS avoir créé votre propre compte sur le site (avec le code
-- PROF-HR), exécutez cette ligne en remplaçant l'adresse :
--
--   update public.profiles set role = 'prof', classe = null
--   where email = 'votre.adresse@exemple.fr';
--
-- puis fermez le code PROF-HR :
--
--   update public.classes set actif = false where code = 'PROF-HR';
-- ============================================================
