alter table public.articles
  add column if not exists video_url text,
  add column if not exists video_caption text;
