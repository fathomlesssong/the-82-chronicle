-- Kronika 82
-- Autor może usuwać własne artykuły.
-- Administrator może usuwać wszystkie artykuły.

drop policy if exists "authors can delete own drafts"
on public.articles;

drop policy if exists "authors can delete own articles"
on public.articles;

create policy "authors can delete own articles"
on public.articles
for delete
to authenticated
using (
  author_id = (select auth.uid())
  and (select public.current_editor_role()) = 'author'
);

drop policy if exists "editors can delete articles"
on public.articles;

drop policy if exists "admins can delete articles"
on public.articles;

create policy "admins can delete articles"
on public.articles
for delete
to authenticated
using (
  (select public.is_admin())
);
