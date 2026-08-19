-- Kronika 82: Kącik kulinarny -> Na Stole

begin;

alter table public.articles
drop constraint if exists articles_section_allowed;

update public.articles
set
  section = 'Na Stole',
  section_slug = 'na-stole'
where
  section = 'Kącik kulinarny'
  or section_slug = 'kacik-kulinarny';

alter table public.articles
add constraint articles_section_allowed check (
  (section = 'Aktualności' and section_slug = 'aktualnosci') or
  (section = 'Infrastruktura' and section_slug = 'infrastruktura') or
  (section = 'Śledztwa' and section_slug = 'sledztwa') or
  (section = 'Kultura' and section_slug = 'kultura') or
  (section = 'Na Stole' and section_slug = 'na-stole')
);

commit;
