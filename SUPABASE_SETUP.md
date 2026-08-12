# The 82 Chronicle — uruchomienie Supabase CMS

Ten plik opisuje jedyne kroki, których nie da się wykonać bez dostępu do panelu Supabase/Vercel.

## 1. Utwórz / wybierz projekt Supabase

Potrzebne będą:
- Project URL
- anon/public key
- service_role key

Nigdy nie wpisuj `service_role` do plików HTML ani JS ładowanych przez przeglądarkę.

## 2. Uruchom SQL

W Supabase SQL Editor uruchom kolejno:
1. `supabase-schema.sql`
2. `supabase-seed.sql`
3. `migrations/20260812_newsletter.sql`

Schema tworzy:
- `profiles`
- role `author`, `editor`, `admin`
- workflow `draft`, `review`, `published`, `archived`
- autorstwo i pola audytowe
- RLS zależne od roli
- Storage `article-images`
- unikalny główny artykuł

Seed importuje obecne trzy artykuły Chronicle.

Migracja newslettera tworzy minimalną tabelę `subscribers` oraz pola zajawki i znaczników wysyłki w `articles`. Tabela nie jest dostępna bezpośrednio dla klienta.

## 3. Pierwszy administrator

Utwórz pierwszego użytkownika w Supabase Auth, a następnie w SQL Editor:

```sql
update public.profiles
set role='admin', active=true
where email='TWOJ_EMAIL';
```

Publiczną rejestrację użytkowników wyłącz. Nowe osoby mają trafiać do redakcji przez zaproszenie administratora.

## 4. Konfiguracja klienta

W `supabase-config.js` wpisz wyłącznie dane publiczne:
- Project URL
- anon/public key

Nie wpisuj tam `service_role`.

## 5. Zmienne środowiskowe Vercel

W projekcie Vercel ustaw:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL=https://the82chronicle.vercel.app`
- `RESEND_API_KEY` (pozostaw puste do czasu prawdziwej wysyłki)
- `NEWSLETTER_FROM`
- `NEWSLETTER_SIGNING_SECRET`

`SUPABASE_SERVICE_ROLE_KEY` jest używany wyłącznie przez funkcje server-side. Pełne objaśnienie newslettera znajduje się w `NEWSLETTER_SETUP.md`.

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
