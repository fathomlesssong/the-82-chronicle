alter table public.articles
  add column if not exists image_caption text,
  add column if not exists image_credit text;

comment on column public.articles.image_caption
  is 'Opcjonalny podpis wyświetlany pod głównym zdjęciem artykułu.';

comment on column public.articles.image_credit
  is 'Opcjonalny autor lub źródło głównego zdjęcia artykułu.';
