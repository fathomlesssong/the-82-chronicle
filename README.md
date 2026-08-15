# Kronika 82

Satyryczna lokalna gazeta spod numeru 82 w Słotwinie.

## Produkcja

- Produkcja: `https://the82chronicle.vercel.app`
- Gałąź produkcyjna: `main`
- Redesign: `redesign/times-layout`
- PR redesignu: #1

Nie mergować redesignu do `main`, dopóki nie zostaną wykonane testy Supabase opisane w `SUPABASE_SETUP.md` i `DEPLOY_CHECKLIST.md`.

## Architektura

Frontend pozostaje lekki i oparty głównie na statycznym HTML/CSS/JS.

- `index.html` — strona główna
- `section.html` — działy
- `archive.html` — pełne archiwum
- `article.html` — awaryjny klientowy widok artykułu z Supabase
- `/a/<slug>` — docelowy serwerowy widok artykułu z Open Graph
- `admin.html` + `admin.js` — panel redakcyjny
- `site.js` — listy artykułów i fallback danych
- `articles.js` — fallback do czasu pełnej migracji Supabase
- `supabase-schema.sql` — schema, role i RLS
- `supabase-seed.sql` — import obecnych artykułów
- `migrations/20260812_newsletter.sql` — minimalna lista odbiorców i pola wysyłki
- `migrations/20260814_article_images.sql` — dodatkowe zdjęcia artykułów, metadane, kolejność i RLS
- `newsletter.js` + `api/newsletter-*.js` — zapis, wypisanie i bezpieczna wysyłka przez Resend
- `api/` — funkcje Vercel do operacji wymagających klucza serwerowego

## Role redakcyjne

- `author` — własne szkice, przekazanie do akceptacji
- `editor` — edycja wszystkich tekstów, publikacja, artykuł główny
- `admin` — prawa redaktora + zarządzanie redakcją

Workflow artykułu:

`draft → review → published → archived`

## Style

Główne arkusze:

- `styles.css` — baza projektu
- `mobile.css` — wspólne zachowanie responsywne i panel admina
- `front-final.css` — finalny layout publicznej części Kroniki 82

Starsze `mobile-home.css`, `mobile-latest-fix.css` i `index.html.bak` zostały usunięte po scaleniu finalnych reguł.

## Wydajność

Publiczna strona ładuje klienta Supabase dopiero po wykryciu prawdziwej konfiguracji w `supabase-config.js`. Przy placeholderach nie pobiera biblioteki Supabase z CDN.

Reklamy używają gotowych wariantów WebP. Artykuł o myszy korzysta z lżejszego JPEG zamiast dużego PNG.

Pozostałe ciężkie obrazy można skonwertować komendą:

```bash
bash scripts/optimize-images.sh
```

Po wygenerowaniu WebP należy dodać pliki z `assets/optimized/` do repo i przepiąć odpowiednie `src/srcset`.

## SEO / PWA

Projekt zawiera:

- `robots.txt`
- `sitemap.xml`
- `manifest.webmanifest`
- `404.html`
- canonicale dla głównych stron i artykułów
- Open Graph dla statycznych artykułów
- docelowy serwerowy Open Graph dla `/a/<slug>`

## Automatyczne testy

GitHub Actions uruchamia `Site audit`, który sprawdza:

- składnię głównych plików JS
- lokalne `href`, `src` i `srcset`
- wymagane pliki publiczne
- podstawowe meta tagi HTML

Audyt lokalny:

```bash
node scripts/audit-site.mjs
```

## Uruchomienie CMS

Kroki wymagające Supabase/Vercel są opisane w:

`SUPABASE_SETUP.md`

Finalna checklista przed produkcją:

`DEPLOY_CHECKLIST.md`

Konfiguracja newslettera i Resend: `NEWSLETTER_SETUP.md`.
