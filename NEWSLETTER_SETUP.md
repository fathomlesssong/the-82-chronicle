# Kronika 82 — newsletter rodzinny

Szkielet można rozwijać bez logowania do Supabase. Uruchomienie zapisu i prawdziwej wysyłki wymaga później wykonania migracji oraz ustawienia sekretów w Vercel.

## Co jest przygotowane

- prosty formularz zapisu na stronie głównej,
- minimalna tabela `subscribers`: `email`, `active`, `created_at`, `unsubscribed_at`,
- endpointy server-side zapisu, wypisania i wysyłki,
- dostęp do listy odbiorców wyłącznie przez `service_role`,
- formularz CMS z polami „Wyślij newsletter”, „Zajawka newslettera” i „Nowy fragment aktualizacji”,
- automatyczna zajawka z leadu i początku artykułu (do 500 znaków),
- wiadomość HTML i tekstowa z nagłówkiem Kronika 82, tytułem, zdjęciem, leadem, zajawką, przyciskiem „Czytaj dalej” oraz podpisanym linkiem wypisu,
- tryb `AKTUALIZACJA` wykorzystujący nowy fragment,
- klucze idempotencji Resend i znaczniki wysyłki ograniczające przypadkowe duplikaty.

Bez kompletu `RESEND_API_KEY`, `NEWSLETTER_FROM` i `NEWSLETTER_SIGNING_SECRET` endpoint wysyłki kończy się statusem `503` i nie kontaktuje się z dostawcą poczty.

## 1. Migracja Supabase

Po `supabase-schema.sql` i `supabase-seed.sql` uruchom `migrations/20260812_newsletter.sql`.

RLS jest włączone, a role `anon` i `authenticated` nie mają bezpośrednich praw do `subscribers`. Formularz publiczny korzysta z `/api/newsletter-subscribe`, a klucz `service_role` pozostaje na serwerze.

## 2. Zmienne środowiskowe Vercel

| Zmienna | Zakres | Znaczenie |
| --- | --- | --- |
| `SUPABASE_URL` | server | adres projektu Supabase |
| `SUPABASE_ANON_KEY` | klient/server | publishable lub starszy anon; weryfikacja sesji redaktora |
| `SUPABASE_SERVICE_ROLE_KEY` | server, sekret | secret lub starszy service_role; zapis odbiorców i odczyt listy |
| `SUPABASE_SECRET_KEY` | server, sekret, opcjonalna | nowa nazwa dla `sb_secret_*`; ma pierwszeństwo |
| `SITE_URL` | server | bazowy adres linków, bez końcowego `/` |
| `RESEND_API_KEY` | server, sekret | klucz Resend; brak wyłącza wysyłkę |
| `NEWSLETTER_FROM` | server | nadawca z domeny zweryfikowanej w Resend |
| `NEWSLETTER_SIGNING_SECRET` | server, sekret | podpis linków wypisu, minimum 32 znaki |

Sekret linków można wygenerować lokalnie poleceniem `openssl rand -hex 32`.

Żadnej z wartości `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` ani `NEWSLETTER_SIGNING_SECRET` nie wolno wpisywać do HTML, `newsletter.js`, `admin.js`, `supabase-config.js` ani innych plików wysyłanych do przeglądarki.

## 3. Resend

1. Utwórz konto/projekt Resend i zweryfikuj domenę nadawcy (SPF i DKIM).
2. Ustaw `NEWSLETTER_FROM`, np. `Kronika 82 <rodzina@twoja-domena.pl>`.
3. Dodaj `RESEND_API_KEY` wyłącznie jako sekret Vercel.

Integracja używa serwerowego API Resend bez biblioteki klientowej. Każdy odbiorca otrzymuje własny podpisany link wypisu.

## 4. Workflow redakcyjny

### Nowy artykuł

1. Redaktor ustawia status `Opublikowany`.
2. Zostawia automatyczną zajawkę lub poprawia ją do około 300–500 znaków.
3. Zaznacza „Wyślij newsletter” i zapisuje artykuł.

### Aktualizacja

1. Redaktor zaznacza „Oznacz jako aktualizację” i ustawia nową datę aktualizacji.
2. Wpisuje „Nowy fragment aktualizacji”.
3. Zaznacza „Wyślij newsletter” i zapisuje artykuł.

Wiadomość otrzymuje oznaczenie `AKTUALIZACJA`. Ta sama wersja artykułu lub aktualizacji nie może być normalnie wysłana ponownie. Po częściowym błędzie klucze idempotencji zabezpieczają ponowną próbę w 24-godzinnym oknie Resend.

## 5. Test bez wysyłania

Bez `RESEND_API_KEY` można sprawdzić formularz, CMS, migrację i wygląd preview. Próba wysyłki ma zwrócić komunikat, że artykuł zapisano, lecz newsletter czeka na konfigurację. To oczekiwane zachowanie i żaden e-mail nie zostanie wysłany.

Po dodaniu sekretów sprawdź zapis i reaktywację adresu, potwierdzenie wypisu, wysyłkę nowego artykułu, blokadę duplikatu oraz wiadomość `AKTUALIZACJA` z nowym fragmentem.
