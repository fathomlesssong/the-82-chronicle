create extension if not exists pgcrypto;

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
  published_at timestamptz not null default now(),
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles
drop constraint if exists articles_section_allowed;

alter table public.articles
add constraint articles_section_allowed check (
  (section = 'Aktualności' and section_slug = 'aktualnosci') or
  (section = 'Infrastruktura' and section_slug = 'infrastruktura') or
  (section = 'Śledztwa' and section_slug = 'sledztwa') or
  (section = 'Kultura' and section_slug = 'kultura') or
  (section = 'Kącik kulinarny' and section_slug = 'kacik-kulinarny')
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

alter table public.articles enable row level security;

create policy "public can read published articles"
on public.articles for select
to anon, authenticated
using (status = 'published' or auth.role() = 'authenticated');

create policy "authenticated editors can insert articles"
on public.articles for insert
to authenticated
with check (true);

create policy "authenticated editors can update articles"
on public.articles for update
to authenticated
using (true)
with check (true);

create policy "authenticated editors can delete articles"
on public.articles for delete
to authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('article-images','article-images',true)
on conflict (id) do update set public = excluded.public;

create policy "public can read article images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'article-images');

create policy "authenticated editors can upload article images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'article-images');

create policy "authenticated editors can update article images"
on storage.objects for update
to authenticated
using (bucket_id = 'article-images')
with check (bucket_id = 'article-images');

create policy "authenticated editors can delete article images"
on storage.objects for delete
to authenticated
using (bucket_id = 'article-images');
