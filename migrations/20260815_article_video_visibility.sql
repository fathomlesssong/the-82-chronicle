alter table public.articles
  add column if not exists video_show_in_article boolean not null default false,
  add column if not exists video_homepage boolean not null default false;

create unique index if not exists one_homepage_video
on public.articles (video_homepage)
where video_homepage = true;
