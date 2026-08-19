drop policy if exists "authors can create own drafts"
on public.articles;

drop policy if exists "authors can create own articles"
on public.articles;

create policy "authors can create own articles"
on public.articles
for insert
to authenticated
with check (
  (select public.current_editor_role()) is not null
  and author_id = (select auth.uid())
  and created_by = (select auth.uid())
  and (
    (
      (select public.current_editor_role()) = 'author'
      and status in ('draft','published')
      and featured = false
    )
    or
    (select public.is_editor_or_admin())
  )
);

drop policy if exists "authors can update own unpublished articles"
on public.articles;

drop policy if exists "authors can update own articles"
on public.articles;

create policy "authors can update own articles"
on public.articles
for update
to authenticated
using (
  author_id = (select auth.uid())
  and (select public.current_editor_role()) = 'author'
)
with check (
  author_id = (select auth.uid())
  and status in ('draft','published')
  and featured = false
);
