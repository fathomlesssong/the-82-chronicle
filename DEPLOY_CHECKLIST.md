# Kronika 82 — checklista przed produkcją

## A. Bez Supabase — wykonane

- [x] responsywna strona główna mobile/tablet/desktop
- [x] dział najnowszego artykułu oddzielony wizualnie od artykułu głównego
- [x] maksymalnie 6 artykułów na homepage
- [x] responsywne reklamy mobile/desktop
- [x] strony działów
- [x] prawdziwe archiwum
- [x] finalny layout artykułu
- [x] statyczne strony dla obecnych trzech artykułów
- [x] role i RLS przygotowane w SQL
- [x] panel admina przygotowany pod Author/Editor/Admin
- [x] serwerowe endpointy zaproszeń i zarządzania użytkownikami
- [x] routing `/a/<slug>` z serwerowymi meta OG
- [x] fallback `articles.js`
- [x] seed migracyjny istniejących artykułów
- [x] `robots.txt`
- [x] `sitemap.xml`
- [x] `manifest.webmanifest`
- [x] `404.html`
- [x] canonicale i OG statycznych stron
- [x] automatyczny audyt linków i składni JS
- [x] usunięte nieużywane łatki CSS i `.bak`
- [x] szkielet newslettera bez aktywnych sekretów
- [x] bezpieczne endpointy zapisu, wypisu i wysyłki
- [x] szablon HTML/tekst oraz tryb `AKTUALIZACJA`


## A2. Zmiany potwierdzone 14–15.08.2026

- [x] galeria wielu zdjęć w artykule
- [x] publiczny odczyt galerii
- [x] lightbox galerii
- [x] nawigacja poprzednie / następne
- [x] obsługa klawiatury i swipe
- [x] maksymalnie 20 zdjęć galerii
- [x] limit 8 MB na zdjęcie
- [x] automatyczne zmniejszanie dużych zdjęć do maks. 2400 px
- [x] link „Redakcja” na stronie głównej, w działach, archiwum i artykułach
- [x] artykuły w działach mają równą hierarchię i kolejność chronologiczną
- [x] poprawiona orientacja miniaturek
- [x] usunięte ramki i sztuczne tło miniaturek w działach
- [x] powiększone zdjęcie głównego artykułu na homepage
- [x] poprawiony desktopowy układ artykułu
- [x] branding zmieniony z „Kronika 82” na „Kronika 82”
- [x] dodany `commit-ok.sh` z testami i kolorowymi komunikatami

## B. Supabase — stan aktualny

Potwierdzone działanie CMS, artykułów i galerii na podłączonym Supabase.

- [x] wybrać/utworzyć projekt Supabase
- [x] wykonać `supabase-schema.sql`
- [x] wykonać `supabase-seed.sql`
- [ ] wykonać `migrations/20260812_newsletter.sql`
- [x] wykonać `migrations/20260814_article_images.sql`
- [x] utworzyć pierwsze konto redakcyjne
- [x] nadać pierwszemu kontu rolę `admin`
- [ ] wyłączyć publiczny signup
- [x] wpisać Project URL i anon key do `supabase-config.js`
- [x] sprawdzić bucket `article-images`

## C. Vercel — sekrety

Ustawić dla Preview i Production:

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SITE_URL=https://the82chronicle.vercel.app`
- [ ] `RESEND_API_KEY`
- [ ] `NEWSLETTER_FROM`
- [ ] `NEWSLETTER_SIGNING_SECRET`

Nigdy nie umieszczać `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` ani `NEWSLETTER_SIGNING_SECRET` w plikach klientowych.

## D. Newsletter

- [ ] formularz zapisuje poprawny adres
- [ ] ponowny zapis reaktywuje wypisany adres
- [ ] link wypisu wymaga poprawnego podpisu i potwierdzenia
- [ ] Redaktor wysyła tylko dla opublikowanego artykułu
- [ ] wiadomość zawiera nagłówek, zdjęcie, lead, zajawkę i „Czytaj dalej”
- [ ] aktualizacja ma oznaczenie `AKTUALIZACJA` i nowy fragment
- [ ] ta sama wersja nie wysyła się ponownie
- [ ] bez klucza Resend nic nie jest wysyłane

## E. Test ról

### Author
- [ ] logowanie działa
- [ ] widzi własne szkice
- [ ] tworzy `draft`
- [ ] edytuje własny `draft`
- [ ] zmienia `draft → review`
- [ ] nie może publikować
- [ ] nie może ustawić `featured`
- [ ] nie może edytować cudzego tekstu

### Editor
- [ ] widzi wszystkie teksty
- [ ] edytuje tekst autora
- [ ] publikuje `review → published`
- [ ] ustawia główny artykuł
- [ ] nie może zarządzać rolami użytkowników

### Admin
- [ ] zaprasza nowego użytkownika
- [ ] zmienia rolę
- [ ] dezaktywuje i aktywuje konto
- [ ] zachowuje wszystkie prawa redaktora

## F. Test publikacji end-to-end

- [ ] Autor tworzy artykuł
- [ ] Autor wysyła do akceptacji
- [ ] Redaktor publikuje
- [ ] artykuł pojawia się na homepage
- [ ] artykuł pojawia się w poprawnym dziale
- [ ] artykuł pojawia się w archiwum
- [ ] homepage pokazuje maks. 6 tekstów
- [ ] najnowszy i główny zachowują niezależne role
- [ ] istnieje tylko jeden `featured=true` wśród opublikowanych
- [ ] upload zdjęcia działa
- [ ] autor/byline są poprawne

## G. Open Graph / WhatsApp

Dla nowego artykułu `/a/<slug>`:

- [ ] źródło HTML zawiera `og:title`
- [ ] źródło HTML zawiera `og:description`
- [ ] źródło HTML zawiera `og:image`
- [ ] canonical wskazuje właściwy adres
- [ ] WhatsApp pokazuje poprawny tytuł, opis i zdjęcie

## H. Responsywność

Sprawdzić ręcznie:

- [ ] 360 px
- [ ] 390 px
- [ ] 430 px
- [ ] 768 px
- [ ] 1280 px
- [ ] 1440 px
- [ ] 1920 px

Na każdym rozmiarze:

- [ ] brak poziomego scrolla strony
- [ ] tytuły nie kolidują ze zdjęciami
- [ ] menu jest dostępne
- [ ] bannery nie dominują treści
- [ ] artykuł jest czytelny
- [ ] formularz admina jest używalny

## I. Wydajność

- [ ] wygenerować WebP dla `chlopiec.png` i `schody.png` przez `scripts/optimize-images.sh`
- [ ] dodać warianty 480 i 1200 px do repo
- [ ] przepiąć `articles.js` i statyczne strony na `picture/srcset`
- [ ] zachować oryginały jako źródło/backup
- [ ] ponownie uruchomić Site audit

## J. Przed merge

- [ ] Vercel Preview = READY
- [ ] GitHub `Site audit` = PASS
- [ ] brak błędów w build logs
- [ ] brak błędów JS w podstawowych ścieżkach
- [ ] użytkownik akceptuje finalny wygląd
- [ ] test Supabase zakończony

Dopiero wtedy:

`redesign/times-layout → main`

Po merge:

- [ ] produkcja odpowiada HTTP 200
- [ ] homepage działa
- [ ] działy działają
- [ ] archiwum działa
- [ ] artykuły działają
- [ ] CMS działa
- [ ] WhatsApp preview działa

## K. Wideo — do wykonania

- [ ] dodać opcjonalne wideo do CMS
- [ ] umożliwić przypisanie wideo do artykułu
- [ ] dodać moduł wideo na stronie głównej
- [ ] dodać miniaturę / poster
- [ ] odtwarzanie dopiero po kliknięciu
- [ ] responsywny player mobile / desktop
- [ ] ustalić miejsce przechowywania plików wideo
- [ ] ustalić limit rozmiaru i obsługiwane formaty
