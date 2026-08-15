# Kronika 82 — uruchomienie Supabase CMS

Ten plik opisuje jedyne kroki, których nie da się wykonać bez dostępu do panelu Supabase/Vercel.

## 1. Utwórz / wybierz projekt Supabase

Potrzebne będą:
- Project URL
- publishable key (lub starszy `anon`)
- secret key (lub starszy `service_role`)

Nigdy nie wpisuj `service_role` do plików HTML ani JS ładowanych przez przeglądarkę.

## 2. Uruchom SQL

W Supabase SQL Editor uruchom kolejno:
1. `supabase-schema.sql`
2. `supabase-seed.sql`
3. `migrations/20260812_newsletter.sql`
4. `migrations/20260814_article_images.sql`

Schema tworzy:
- `profiles`
- role `author`, `editor`, `admin`
- workflow `draft`, `review`, `published`, `archived`
- autorstwo i pola audytowe
- RLS zależne od roli
- Storage `article-images`
- unikalny główny artykuł
- jawne granty Data API i blokadę samodzielnej zmiany roli przez użytkownika

Seed importuje obecne trzy artykuły Kroniki 82.

Migracja newslettera tworzy minimalną tabelę `subscribers` oraz pola zajawki i znaczników wysyłki w `articles`. Tabela nie jest dostępna bezpośrednio dla klienta.

Migracja dodatkowych zdjęć tworzy `article_images`, kolejność i metadane zdjęć oraz RLS zgodne z rolami CMS. To trwały snippet SQL pierwszego etapu galerii.

## 3. Pierwszy administrator

Utwórz pierwszego użytkownika w Supabase Auth, a następnie w SQL Editor:

```sql
update public.profiles
set role='admin', active=true
where email='TWOJ_EMAIL';
```

Publiczną rejestrację użytkowników wyłącz. Nowe osoby mają trafiać do redakcji przez zaproszenie administratora.

W **Authentication → URL Configuration** ustaw docelowy `Site URL` i dodaj do `Redirect URLs` adres panelu preview oraz docelowe `/admin.html`, zanim zaczniesz testować zaproszenia.

## 4. Konfiguracja klienta

W `supabase-config.js` wpisz wyłącznie dane publiczne:
- Project URL
- publishable key (lub starszy `anon`)

Nie wpisuj tam `service_role`.

## 5. Zmienne środowiskowe Vercel

W projekcie Vercel ustaw:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` — wartość publishable albo starszy `anon`
- `SUPABASE_SERVICE_ROLE_KEY` — wartość secret albo starszy `service_role`
- `SITE_URL=https://the82chronicle.vercel.app`
- `RESEND_API_KEY` (pozostaw puste do czasu prawdziwej wysyłki)
- `NEWSLETTER_FROM`
- `NEWSLETTER_SIGNING_SECRET`

Opcjonalnie nowy klucz `sb_secret_*` można zapisać jako `SUPABASE_SECRET_KEY`; ma wtedy pierwszeństwo. Oba warianty sekretu są używane wyłącznie przez funkcje server-side. Pełne objaśnienie newslettera znajduje się w `NEWSLETTER_SETUP.md`.

## 6. Test ról

### Autor
- loguje się
- tworzy szkic
- może zmienić `draft` na `review`
- nie może publikować
- nie może ustawić `featured`
- nie może edytować cudzych tekstów

### Redaktor
- widzi wszystkie teksty
- edytuje je
- publikuje
- ustawia artykuł główny

### Administrator
- ma prawa Redaktora
- zaprasza użytkowników
- zmienia role
- blokuje/odblokowuje konta

## 7. Test publikacji

1. Autor tworzy artykuł jako `draft`.
2. Autor wysyła go jako `review`.
3. Redaktor poprawia i publikuje.
4. Artykuł pojawia się na stronie głównej/dziale/archiwum.
5. Link ma postać `/a/<slug>`.
6. Źródło HTML `/a/<slug>` musi zawierać `og:title`, `og:description`, `og:image`.

## 8. Przed merge do main

Sprawdź:
- mobile 360/390/430
- tablet ~768
- desktop 1280/1440/1920
- konto Author/Editor/Admin
- upload zdjęcia
- publikację
- zmianę głównego artykułu
- WhatsApp preview
- brak dostępu z nieaktywnym kontem

Dopiero po tym merge `redesign/times-layout` do `main`.
