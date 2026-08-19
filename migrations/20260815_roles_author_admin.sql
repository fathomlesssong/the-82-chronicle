-- Kronika 82: uproszczenie ról do author / admin.

update public.profiles
set role = 'admin'
where role = 'editor';

alter table public.profiles
drop constraint if exists profiles_role_author_admin_check;

alter table public.profiles
add constraint profiles_role_author_admin_check
check (role in ('author','admin'));

-- Stary helper pozostaje tymczasowo dla zgodności z istniejącymi politykami,
-- ale po tej migracji oznacza wyłącznie Administratora.
create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_editor_role() = 'admin', false);
$$;

revoke all on function public.is_editor_or_admin() from public, anon;
grant execute on function public.is_editor_or_admin()
to authenticated, service_role;

-- Autor zarządza galerią własnego artykułu również po publikacji.

drop policy if exists "staff can read permitted article gallery"
on public.article_images;

create policy "staff can read permitted article gallery"
on public.article_images
for select
to authenticated
using (
  exists (
    select 1
    from public.articles a
    where a.id = article_id
      and (
        a.status = 'published'
        or a.author_id = (select auth.uid())
        or (select public.is_editor_or_admin())
      )
  )
);

drop policy if exists "staff can add permitted article gallery"
on public.article_images;

create policy "staff can add permitted article gallery"
on public.article_images
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.articles a
    where a.id = article_id
      and (
        (
          a.author_id = (select auth.uid())
          and a.status in ('draft','published')
        )
        or (select public.is_editor_or_admin())
      )
  )
);

drop policy if exists "staff can update permitted article gallery"
on public.article_images;

create policy "staff can update permitted article gallery"
on public.article_images
for update
to authenticated
using (
  exists (
    select 1
    from public.articles a
    where a.id = article_id
      and (
        (
          a.author_id = (select auth.uid())
          and a.status in ('draft','published')
        )
        or (select public.is_editor_or_admin())
      )
  )
)
with check (
  exists (
    select 1
    from public.articles a
    where a.id = article_id
      and (
        (
          a.author_id = (select auth.uid())
          and a.status in ('draft','published')
        )
        or (select public.is_editor_or_admin())
      )
  )
);

drop policy if exists "staff can delete permitted article gallery"
on public.article_images;

create policy "staff can delete permitted article gallery"
on public.article_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.articles a
    where a.id = article_id
      and (
        (
          a.author_id = (select auth.uid())
          and a.status in ('draft','published')
        )
        or (select public.is_editor_or_admin())
      )
  )
);
