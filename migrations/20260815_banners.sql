-- Banery Kroniki 82: dwa sloty (vertical, horizontal), rotacja sekwencyjna po stronie klienta.
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slot text not null check (slot in ('vertical','horizontal')),
  image_url text not null,
  storage_path text,
  target_url text,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists banners_rotation_idx
on public.banners (slot, active, sort_order, created_at);

drop trigger if exists banners_set_updated_at on public.banners;
create trigger banners_set_updated_at
before update on public.banners
for each row execute function public.set_updated_at();

alter table public.banners enable row level security;

revoke all on table public.banners from anon, authenticated;
grant select on table public.banners to anon, authenticated;
grant insert, update, delete on table public.banners to authenticated;
grant select, insert, update, delete on table public.banners to service_role;

drop policy if exists "active banners public read" on public.banners;
create policy "active banners public read"
on public.banners
for select
to anon, authenticated
using (active = true);

drop policy if exists "admins manage banners" on public.banners;
create policy "admins manage banners"
on public.banners
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

insert into storage.buckets (id, name, public)
values ('banner-images','banner-images',true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public can read banner images" on storage.objects;
create policy "public can read banner images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'banner-images');

drop policy if exists "admins can upload banner images" on storage.objects;
create policy "admins can upload banner images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'banner-images' and (select public.is_admin()));

drop policy if exists "admins can update banner images" on storage.objects;
create policy "admins can update banner images"
on storage.objects
for update
to authenticated
using (bucket_id = 'banner-images' and (select public.is_admin()))
with check (bucket_id = 'banner-images' and (select public.is_admin()));

drop policy if exists "admins can delete banner images" on storage.objects;
create policy "admins can delete banner images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'banner-images' and (select public.is_admin()));

-- Zachowaj dotychczasową reklamę jako pierwszy banner w obu slotach.
insert into public.banners (id,name,slot,image_url,storage_path,target_url,active,sort_order)
values
  ('82000000-0000-4000-8000-000000000001','Myślecki Archeologia','vertical','/assets/ad-myslecki-vertical.webp',null,null,true,10),
  ('82000000-0000-4000-8000-000000000002','Myślecki Archeologia','horizontal','/assets/ad-myslecki-landscape.webp',null,null,true,10)
on conflict (id) do nothing;
