-- ============================================================
-- Base de données du site Entrepreneuriat BTS MCO (EF3)
-- Comptes élèves : identifiant + code personnel à 6 chiffres,
-- créés par le professeur (aucune adresse e-mail d'élève).
-- Compte professeur : adresse e-mail + mot de passe.
--
-- À exécuter UNE fois dans Supabase : SQL Editor > New query >
-- coller tout ce fichier > Run. Peut être relancé sans danger.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- 1. Les classes -----------------------------------------------
--    « prof = true » : code réservé à la création du compte
--    professeur (il se ferme tout seul après usage).
create table if not exists public.classes (
  code   text primary key,
  nom    text not null,
  actif  boolean not null default true,
  prof   boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Les professeurs (comptes Supabase avec e-mail) -------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nom        text not null default '',
  prenom     text not null default '',
  role       text not null default 'prof' check (role in ('prof')),
  created_at timestamptz not null default now()
);

-- 3. Les élèves -------------------------------------------------
create table if not exists public.eleves (
  id          uuid primary key default gen_random_uuid(),
  classe      text references public.classes(code) on update cascade,
  nom         text not null,
  prenom      text not null,
  identifiant text not null unique,
  code_hash   text not null,
  cle_depot   uuid not null default gen_random_uuid(),
  actif       boolean not null default true,
  echecs      integer not null default 0,
  bloque_jusqua timestamptz,
  derniere_connexion timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists eleves_classe_idx on public.eleves(classe, nom);

-- 4. Les sessions des élèves (jeton gardé dans le navigateur) --
create table if not exists public.sessions_eleves (
  token     uuid primary key default gen_random_uuid(),
  eleve_id  uuid not null references public.eleves(id) on delete cascade,
  created_at timestamptz not null default now(),
  expire_le timestamptz not null default now() + interval '120 days'
);
create index if not exists sessions_eleve_idx on public.sessions_eleves(eleve_id);

-- 5. Le dossier en cours de chaque élève -----------------------
create table if not exists public.dossiers (
  eleve_id   uuid primary key references public.eleves(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  progress   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 6. Les PDF déposés -------------------------------------------
create table if not exists public.depots (
  id         bigserial primary key,
  eleve_id   uuid not null references public.eleves(id) on delete cascade,
  path       text not null,
  filename   text,
  size       integer,
  created_at timestamptz not null default now()
);
create index if not exists depots_eleve_idx on public.depots(eleve_id, created_at desc);

-- 7. Qui est professeur ? --------------------------------------
create or replace function public.is_prof()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'prof');
$$;

-- 8. Création du compte professeur ------------------------------
--    Refusée sans code professeur valide ; le code se ferme ensuite.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(trim(coalesce(new.raw_user_meta_data->>'classe', '')));
begin
  if not exists (select 1 from public.classes where code = v_code and actif and prof) then
    raise exception 'CODE_PROF_INVALIDE';
  end if;
  insert into public.profiles (id, email, nom, prenom)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'nom', ''),
          coalesce(new.raw_user_meta_data->>'prenom', ''));
  update public.classes set actif = false where code = v_code;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 9. Sécurité : les tables ne sont lisibles que par le professeur.
--    Les élèves passent uniquement par les fonctions ci-dessous.
alter table public.classes         enable row level security;
alter table public.profiles        enable row level security;
alter table public.eleves          enable row level security;
alter table public.sessions_eleves enable row level security;
alter table public.dossiers        enable row level security;
alter table public.depots          enable row level security;

drop policy if exists "classes gérées par le prof" on public.classes;
create policy "classes gérées par le prof" on public.classes for all to authenticated using (public.is_prof()) with check (public.is_prof());
drop policy if exists "profil lu par soi" on public.profiles;
create policy "profil lu par soi" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "élèves lus par le prof" on public.eleves;
create policy "élèves lus par le prof" on public.eleves for select to authenticated using (public.is_prof());
drop policy if exists "élèves modifiés par le prof" on public.eleves;
create policy "élèves modifiés par le prof" on public.eleves for update to authenticated using (public.is_prof()) with check (public.is_prof());
drop policy if exists "dossiers lus par le prof" on public.dossiers;
create policy "dossiers lus par le prof" on public.dossiers for select to authenticated using (public.is_prof());
drop policy if exists "dépôts lus par le prof" on public.depots;
create policy "dépôts lus par le prof" on public.depots for select to authenticated using (public.is_prof());

-- Le hachage des codes n'est jamais renvoyé au navigateur
revoke select on public.eleves from anon, authenticated;
grant select (id, classe, nom, prenom, identifiant, actif, echecs, bloque_jusqua, derniere_connexion, created_at)
  on public.eleves to authenticated;

-- 10. Fonctions réservées aux élèves (accès par jeton) ----------
create or replace function public._eleve_du_jeton(p_token uuid)
returns public.eleves language sql stable security definer set search_path = public as $$
  select e.* from public.sessions_eleves s join public.eleves e on e.id = s.eleve_id
  where s.token = p_token and s.expire_le > now() and e.actif;
$$;
revoke all on function public._eleve_du_jeton(uuid) from public, anon, authenticated;

create or replace function public.eleve_connexion(p_identifiant text, p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  e public.eleves;
  v_token uuid;
begin
  select * into e from public.eleves where identifiant = lower(trim(p_identifiant));
  if not found then
    perform pg_sleep(0.5);
    return json_build_object('erreur', 'IDENTIFIANT_OU_CODE');
  end if;
  if not e.actif then return json_build_object('erreur', 'COMPTE_DESACTIVE'); end if;
  if e.bloque_jusqua is not null and e.bloque_jusqua > now() then
    return json_build_object('erreur', 'TROP_D_ESSAIS', 'minutes', ceil(extract(epoch from e.bloque_jusqua - now()) / 60));
  end if;
  if crypt(trim(coalesce(p_code, '')), e.code_hash) <> e.code_hash then
    update public.eleves
       set echecs = case when echecs + 1 >= 5 then 0 else echecs + 1 end,
           bloque_jusqua = case when echecs + 1 >= 5 then now() + interval '15 minutes' else bloque_jusqua end
     where id = e.id;
    perform pg_sleep(0.5);
    return json_build_object('erreur', 'IDENTIFIANT_OU_CODE');
  end if;
  update public.eleves set echecs = 0, bloque_jusqua = null, derniere_connexion = now() where id = e.id;
  delete from public.sessions_eleves where expire_le < now();
  insert into public.sessions_eleves (eleve_id) values (e.id) returning token into v_token;
  insert into public.dossiers (eleve_id) values (e.id) on conflict (eleve_id) do nothing;
  return json_build_object('token', v_token, 'eleve', json_build_object(
    'id', e.id, 'prenom', e.prenom, 'nom', e.nom, 'classe', e.classe, 'identifiant', e.identifiant, 'cle_depot', e.cle_depot));
end;
$$;

create or replace function public.eleve_session(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare e public.eleves;
begin
  e := public._eleve_du_jeton(p_token);
  if e.id is null then return null; end if;
  return json_build_object('id', e.id, 'prenom', e.prenom, 'nom', e.nom, 'classe', e.classe, 'identifiant', e.identifiant, 'cle_depot', e.cle_depot);
end;
$$;

create or replace function public.eleve_charger(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare e public.eleves; d public.dossiers;
begin
  e := public._eleve_du_jeton(p_token);
  if e.id is null then raise exception 'SESSION_EXPIREE'; end if;
  select * into d from public.dossiers where eleve_id = e.id;
  return json_build_object('data', coalesce(d.data, '{}'::jsonb), 'progress', coalesce(d.progress, '{}'::jsonb), 'updated_at', d.updated_at);
end;
$$;

create or replace function public.eleve_enregistrer(p_token uuid, p_data jsonb, p_progress jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare e public.eleves; v_now timestamptz := now();
begin
  e := public._eleve_du_jeton(p_token);
  if e.id is null then raise exception 'SESSION_EXPIREE'; end if;
  if octet_length(p_data::text) > 2000000 then raise exception 'DOSSIER_TROP_GROS'; end if;
  insert into public.dossiers (eleve_id, data, progress, updated_at) values (e.id, coalesce(p_data, '{}'), coalesce(p_progress, '{}'), v_now)
  on conflict (eleve_id) do update set data = excluded.data, progress = excluded.progress, updated_at = v_now;
  return v_now;
end;
$$;

create or replace function public.eleve_deconnexion(p_token uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.sessions_eleves where token = p_token;
$$;

create or replace function public.eleve_depots(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare e public.eleves;
begin
  e := public._eleve_du_jeton(p_token);
  if e.id is null then raise exception 'SESSION_EXPIREE'; end if;
  return coalesce((select json_agg(json_build_object('id', id, 'path', path, 'filename', filename, 'size', size, 'created_at', created_at) order by created_at desc)
                   from public.depots where eleve_id = e.id), '[]'::json);
end;
$$;

create or replace function public.eleve_depot_ajouter(p_token uuid, p_path text, p_filename text, p_size integer)
returns void language plpgsql security definer set search_path = public as $$
declare e public.eleves;
begin
  e := public._eleve_du_jeton(p_token);
  if e.id is null then raise exception 'SESSION_EXPIREE'; end if;
  if split_part(p_path, '/', 1) <> e.cle_depot::text then raise exception 'CHEMIN_INVALIDE'; end if;
  insert into public.depots (eleve_id, path, filename, size) values (e.id, p_path, left(p_filename, 200), p_size);
end;
$$;

-- Utilisée par la règle du stockage : le dossier de dépôt existe-t-il ?
create or replace function public.cle_depot_valide(p_cle text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.eleves where cle_depot::text = p_cle and actif);
$$;

-- 11. Fonctions réservées au professeur -------------------------
create or replace function public._identifiant(p_prenom text, p_nom text)
returns text language sql immutable set search_path = public, extensions as $$
  select trim(both '.-' from regexp_replace(regexp_replace(
    lower(extensions.unaccent(trim(p_prenom) || '.' || trim(p_nom))),
    '[\s'']+', '-', 'g'), '[^a-z0-9.\-]+', '', 'g'));
$$;

create or replace function public._code6()
returns text language sql volatile set search_path = public, extensions as $$
  select lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
$$;
revoke all on function public._code6() from public, anon, authenticated;

create or replace function public.prof_creer_eleves(p_classe text, p_liste jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  item jsonb; v_prenom text; v_nom text; v_base text; v_id text; v_n integer; v_code text;
  resultat json[] := '{}';
begin
  if not public.is_prof() then raise exception 'RESERVE_AU_PROF'; end if;
  if not exists (select 1 from public.classes where code = p_classe and not prof) then raise exception 'CLASSE_INCONNUE'; end if;
  for item in select * from jsonb_array_elements(p_liste) loop
    v_prenom := trim(coalesce(item->>'prenom', ''));
    v_nom := trim(coalesce(item->>'nom', ''));
    continue when v_prenom = '' or v_nom = '';
    v_base := public._identifiant(v_prenom, v_nom);
    v_id := v_base; v_n := 1;
    while exists (select 1 from public.eleves where identifiant = v_id) loop
      v_n := v_n + 1; v_id := v_base || v_n;
    end loop;
    v_code := public._code6();
    insert into public.eleves (classe, nom, prenom, identifiant, code_hash)
    values (p_classe, v_nom, v_prenom, v_id, crypt(v_code, gen_salt('bf', 8)));
    resultat := resultat || json_build_object('prenom', v_prenom, 'nom', v_nom, 'identifiant', v_id, 'code', v_code);
  end loop;
  return array_to_json(resultat);
end;
$$;

create or replace function public.prof_nouveau_code(p_eleve uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_code text := public._code6();
begin
  if not public.is_prof() then raise exception 'RESERVE_AU_PROF'; end if;
  update public.eleves set code_hash = crypt(v_code, gen_salt('bf', 8)), echecs = 0, bloque_jusqua = null where id = p_eleve;
  if not found then raise exception 'ELEVE_INCONNU'; end if;
  delete from public.sessions_eleves where eleve_id = p_eleve;
  return v_code;
end;
$$;

create or replace function public.prof_supprimer_eleve(p_eleve uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_prof() then raise exception 'RESERVE_AU_PROF'; end if;
  delete from public.eleves where id = p_eleve;
end;
$$;

grant execute on function public.eleve_connexion(text, text), public.eleve_session(uuid), public.eleve_charger(uuid),
  public.eleve_enregistrer(uuid, jsonb, jsonb), public.eleve_deconnexion(uuid), public.eleve_depots(uuid),
  public.eleve_depot_ajouter(uuid, text, text, integer), public.cle_depot_valide(text) to anon, authenticated;
grant execute on function public.prof_creer_eleves(text, jsonb), public.prof_nouveau_code(uuid), public.prof_supprimer_eleve(uuid) to authenticated;
revoke execute on function public.prof_creer_eleves(text, jsonb), public.prof_nouveau_code(uuid), public.prof_supprimer_eleve(uuid) from anon;

-- 12. Le stockage des PDF ---------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('depots', 'depots', false, 10485760, array['application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

drop policy if exists "pdf déposé par l'élève" on storage.objects;
create policy "pdf déposé par l'élève" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'depots' and public.cle_depot_valide((storage.foldername(name))[1]));
drop policy if exists "pdf lu par le prof" on storage.objects;
create policy "pdf lu par le prof" on storage.objects for select to authenticated
  using (bucket_id = 'depots' and public.is_prof());

-- 13. Première classe et code professeur (modifiables ensuite) ---
insert into public.classes (code, nom) values ('MCO-2027', 'BTS MCO — session 2027')
on conflict (code) do nothing;
insert into public.classes (code, nom, prof) values ('PROF-HR', 'Compte professeur', true)
on conflict (code) do nothing;
