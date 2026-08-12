create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'author' check (role in ('author','editor','admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role, active)
  values (
    new.id,
    coalesce(new.email,''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name','')),''),
    'author',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_editor_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.active = true
  limit 1;
$$;

create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_editor_role() in ('editor','admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_editor_role() = 'admin', false);
$$;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  section text not null,
  section_slug text not null,
  summary text not null,
  content text not null,
  image_url text,
  image_alt text,
  published_at timestamptz,
  featured boolean not null default false,
  status text not null default 'draft',
  author_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  published_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles add column if not exists author_id uuid references public.profiles(id) on delete set null;
alter table public.articles add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.articles add column if not exists updated_by uuid references public.profiles(id) on delete set null;
alter table public.articles add column if not exists published_by uuid references public.profiles(id) on delete set null;
alter table public.articles add column if not exists submitted_at timestamptz;
alter table public.articles alter column published_at drop not null;
alter table public.articles alter column published_at drop default;

alter table public.articles drop constraint if exists articles_status_check;
alter table public.articles add constraint articles_status_check check (status in ('draft','review','published','archived'));
alter table public.articles drop constraint if exists articles_section_allowed;
alter table public.articles add constraint articles_section_allowed check (
  (section = 'Aktualności' and section_slug = 'aktualnosci') or
  (section = 'Infrastruktura' and section_slug = 'infrastruktura') or
  (section = 'Śledztwa' and section_slug = 'sledztwa') or
  (section = 'Kultura' and section_slug = 'kultura') or
  (section = 'Kącik kulinarny' and section_slug = 'kacik-kulinarny')
);
alter table public.articles drop constraint if exists featured_only_when_published;
alter table public.articles add constraint featured_only_when_published check (featured = false or status = 'published');

create unique index if not exists one_published_featured_article
on public.articles ((featured))
where featured = true and status = 'published';

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

create or replace function public.set_article_audit_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
    new.author_id = coalesce(new.author_id, auth.uid());
  end if;
  new.updated_by = auth.uid();

  if new.status = 'review' and (tg_op = 'INSERT' or old.status is distinct from 'review') then
    new.submitted_at = coalesce(new.submitted_at, now());
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at = coalesce(new.published_at, now());
    new.published_by = auth.uid();
  end if;

  if new.status <> 'published' then
    new.featured = false;
  end if;

  return new;
end;
$$;

drop trigger if exists articles_audit_fields on public.articles;
create trigger articles_audit_fields
before insert or update on public.articles
for each row execute function public.set_article_audit_fields();

alter table public.profiles enable row level security;
alter table public.articles enable row level security;

drop policy if exists "staff can read profiles" on public.profiles;
create policy "staff can read profiles" on public.profiles for select to authenticated
using (public.current_editor_role() is not null);

drop policy if exists "users can update own display name" on public.profiles;
create policy "users can update own display name" on public.profiles for update to authenticated
using (id = auth.uid() and active = true)
with check (id = auth.uid() and active = true);

drop policy if exists "public can read published articles" on public.articles;
create policy "public can read published articles" on public.articles for select to anon
using (status = 'published');

drop policy if exists "staff can read permitted articles" on public.articles;
create policy "staff can read permitted articles" on public.articles for select to authenticated
using (status = 'published' or author_id = auth.uid() or public.is_editor_or_admin());

drop policy if exists "authors can create own drafts" on public.articles;
create policy "authors can create own drafts" on public.articles for insert to authenticated
with check (
  public.current_editor_role() is not null
  and author_id = auth.uid()
  and created_by = auth.uid()
  and ((public.current_editor_role() = 'author' and status in ('draft','review') and featured = false) or public.is_editor_or_admin())
);

drop policy if exists "authors can update own unpublished articles" on public.articles;
create policy "authors can update own unpublished articles" on public.articles for update to authenticated
using (author_id = auth.uid() and public.current_editor_role() = 'author' and status in ('draft','review'))
with check (author_id = auth.uid() and status in ('draft','review') and featured = false);

drop policy if exists "editors can update all articles" on public.articles;
create policy "editors can update all articles" on public.articles for update to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "authors can delete own drafts" on public.articles;
create policy "authors can delete own drafts" on public.articles for delete to authenticated
using (author_id = auth.uid() and public.current_editor_role() = 'author' and status = 'draft');

drop policy if exists "editors can delete articles" on public.articles;
create policy "editors can delete articles" on public.articles for delete to authenticated
using (public.is_editor_or_admin());

insert into storage.buckets (id, name, public)
values ('article-images','article-images',true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public can read article images" on storage.objects;
create policy "public can read article images" on storage.objects for select to anon, authenticated
using (bucket_id = 'article-images');

drop policy if exists "staff can upload own article images" on storage.objects;
create policy "staff can upload own article images" on storage.objects for insert to authenticated
with check (bucket_id = 'article-images' and public.current_editor_role() is not null and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "staff can update permitted article images" on storage.objects;
create policy "staff can update permitted article images" on storage.objects for update to authenticated
using (bucket_id = 'article-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_editor_or_admin()))
with check (bucket_id = 'article-images');

drop policy if exists "staff can delete permitted article images" on storage.objects;
create policy "staff can delete permitted article images" on storage.objects for delete to authenticated
using (bucket_id = 'article-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_editor_or_admin()));

-- Pierwszy administrator po utworzeniu konta:
-- update public.profiles set role='admin' where email='TWOJ_EMAIL';
