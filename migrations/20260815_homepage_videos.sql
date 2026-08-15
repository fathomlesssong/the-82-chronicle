create table if not exists public.homepage_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  video_url text not null,
  caption text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create unique index if not exists one_active_homepage_video
on public.homepage_videos (active)
where active = true;

drop trigger if exists homepage_videos_set_updated_at on public.homepage_videos;
create trigger homepage_videos_set_updated_at
before update on public.homepage_videos
for each row execute function public.set_updated_at();

alter table public.homepage_videos enable row level security;

revoke all on table public.homepage_videos from anon, authenticated;
grant select on table public.homepage_videos to anon, authenticated;
grant insert, update, delete on table public.homepage_videos to authenticated;
grant select, insert, update, delete on table public.homepage_videos to service_role;

drop policy if exists "homepage videos public read" on public.homepage_videos;
create policy "homepage videos public read"
on public.homepage_videos
for select
to anon, authenticated
using (active = true);

drop policy if exists "editors manage homepage videos" on public.homepage_videos;
create policy "editors manage homepage videos"
on public.homepage_videos
for all
to authenticated
using ((select public.is_editor_or_admin()))
with check ((select public.is_editor_or_admin()));

insert into public.homepage_videos (
  title,
  video_url,
  caption,
  active,
  created_by
)
select
  title,
  video_url,
  video_caption,
  true,
  author_id
from public.articles
where video_homepage = true
  and video_url is not null
  and not exists (
    select 1
    from public.homepage_videos
    where active = true
  )
limit 1;
