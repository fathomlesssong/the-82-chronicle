-- Minimalny szkielet rodzinnego newslettera The 82 Chronicle.
-- Tabela subscribers jest dostępna wyłącznie przez endpointy server-side
-- korzystające z service_role. Klient nie otrzymuje bezpośredniego dostępu.

create table if not exists public.subscribers (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  constraint subscribers_email_normalized check (email = lower(btrim(email))),
  constraint subscribers_unsubscribe_state check (
    (active = true and unsubscribed_at is null) or
    (active = false and unsubscribed_at is not null)
  )
);

alter table public.subscribers enable row level security;
revoke all on table public.subscribers from anon, authenticated;

alter table public.articles add column if not exists newsletter_teaser text;
alter table public.articles add column if not exists newsletter_update_excerpt text;
alter table public.articles add column if not exists newsletter_sent_at timestamptz;
alter table public.articles add column if not exists newsletter_update_sent_at timestamptz;
alter table public.articles add column if not exists newsletter_update_sent_for timestamptz;

alter table public.articles drop constraint if exists articles_newsletter_teaser_length;
alter table public.articles add constraint articles_newsletter_teaser_length
check (newsletter_teaser is null or char_length(newsletter_teaser) <= 500);

alter table public.articles drop constraint if exists articles_newsletter_update_excerpt_length;
alter table public.articles add constraint articles_newsletter_update_excerpt_length
check (newsletter_update_excerpt is null or char_length(newsletter_update_excerpt) <= 500);

comment on table public.subscribers is 'Minimalna lista odbiorców rodzinnego newslettera Chronicle; dostęp tylko server-side.';
comment on column public.articles.newsletter_teaser is 'Zajawka wiadomości, zwykle 300–500 znaków.';
comment on column public.articles.newsletter_update_excerpt is 'Nowy fragment używany w wiadomości oznaczonej AKTUALIZACJA.';
comment on column public.articles.newsletter_update_sent_for is 'Wartość update_at, dla której wysłano ostatnią aktualizację.';
