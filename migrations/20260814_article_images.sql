-- Dodatkowe zdjęcia artykułów. Plik jest trwałą migracją/snippetem RLS
-- dla pierwszego etapu galerii; publiczny frontend nie renderuje jej jeszcze.

create table if not exists public.article_images (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  image_url text not null,
  image_alt text not null,
  image_caption text,
  image_credit text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint article_images_url_not_blank check (btrim(image_url) <> ''),
  constraint article_images_alt_length check (char_length(image_alt) between 1 and 240),
  constraint article_images_caption_length check (image_caption is null or char_length(image_caption) <= 300),
  constraint article_images_credit_length check (image_credit is null or char_length(image_credit) <= 160),
  constraint article_images_sort_order_nonnegative check (sort_order >= 0)
);

create index if not exists article_images_article_sort_idx
on public.article_images (article_id, sort_order, created_at);

comment on table public.article_images
  is 'Uporządkowane dodatkowe zdjęcia artykułów wraz z metadanymi redakcyjnymi.';

create or replace function public.set_article_image_audit_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
  else
    new.created_at = old.created_at;
    new.created_by = old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists article_images_audit_fields on public.article_images;
create trigger article_images_audit_fields
before insert or update on public.article_images
for each row execute function public.set_article_image_audit_fields();

alter table public.article_images enable row level security;

revoke all on table public.article_images from public, anon, authenticated;
grant select on table public.article_images to anon, authenticated;
grant insert, update, delete on table public.article_images to authenticated;
grant select, insert, update, delete on table public.article_images to service_role;

drop policy if exists "public can read published article gallery" on public.article_images;
create policy "public can read published article gallery"
on public.article_images for select to anon
using (
  exists (
    select 1 from public.articles a
    where a.id = article_id and a.status = 'published'
  )
);

drop policy if exists "staff can read permitted article gallery" on public.article_images;
create policy "staff can read permitted article gallery"
on public.article_images for select to authenticated
using (
  exists (
    select 1 from public.articles a
    where a.id = article_id
      and (
        a.status = 'published'
        or a.author_id = (select auth.uid())
        or (select public.is_editor_or_admin())
      )
  )
);

drop policy if exists "staff can add permitted article gallery" on public.article_images;
create policy "staff can add permitted article gallery"
on public.article_images for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.articles a
    where a.id = article_id
      and (
        (a.author_id = (select auth.uid()) and a.status in ('draft','review'))
        or (select public.is_editor_or_admin())
      )
  )
);

drop policy if exists "staff can update permitted article gallery" on public.article_images;
create policy "staff can update permitted article gallery"
on public.article_images for update to authenticated
using (
  exists (
    select 1 from public.articles a
    where a.id = article_id
      and (
        (a.author_id = (select auth.uid()) and a.status in ('draft','review'))
        or (select public.is_editor_or_admin())
      )
  )
)
with check (
  exists (
    select 1 from public.articles a
    where a.id = article_id
      and (
        (a.author_id = (select auth.uid()) and a.status in ('draft','review'))
        or (select public.is_editor_or_admin())
      )
  )
);

drop policy if exists "staff can delete permitted article gallery" on public.article_images;
create policy "staff can delete permitted article gallery"
on public.article_images for delete to authenticated
using (
  exists (
    select 1 from public.articles a
    where a.id = article_id
      and (
        (a.author_id = (select auth.uid()) and a.status in ('draft','review'))
        or (select public.is_editor_or_admin())
      )
  )
);
