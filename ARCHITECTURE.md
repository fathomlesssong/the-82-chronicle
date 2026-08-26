# Kronika 82 architecture

## System shape

Kronika 82 is a lightweight newspaper site deployed on Vercel. Public pages are static HTML, CSS, and browser JavaScript. Dynamic article rendering and privileged operations are implemented as Vercel Functions under `api/`, with reusable server-only helpers under `lib/`.

The canonical production origin is `https://kronika82.vercel.app`. Preview and historical deployment hosts must never be emitted as canonical or other public production URLs.

## Components

- `index.html`, `archive.html`, `section.html`, and `site.js` render public navigation and article lists.
- `search.html` and `search.js` provide the reader-gated search UI; `api/search.js` reads the published article corpus through the anon/publishable Supabase configuration and returns at most 40 ranked results without full article content.
- `api/article.js` renders server-side article pages under `/a/<slug>` with canonical and Open Graph metadata.
- `article-layout.js` is the shared article-image classifier for SSR-emitted and client-rendered article markup; it derives layout only from the loaded image's natural dimensions.
- `front-final.css` is the single owner of the homepage shell (`.home-layout`) and homepage banner (`.home-ad*`) layout, visibility, sticky positioning, and natural-size behavior.
- `admin*.html` and `admin*.js` provide authenticated editorial workflows.
- `admin-dashboard.css` owns shared CMS/auth-recovery styling extracted from public sheets, including admin primitives, responsive rules, editorial gallery controls, and destructive-action states. Page-specific admin rules may remain beside their page markup; public stylesheets contain no confirmed admin-only selectors.
- `supabase-config.js` contains public browser configuration; `lib/supabase-server.js` and server functions handle privileged Supabase access.
- `middleware.ts` and `vercel.json` define access and routing behavior.
- `manifest.webmanifest`, `pwa.js`, and `sw.js` provide the production PWA shell.
- `robots.txt` and `sitemap.xml` describe public crawler entry points; response-level indexing policy remains controlled by `vercel.json`.

## Major flows

1. Public pages load published content from Supabase and fall back safely when data is unavailable.
2. `/a/<slug>` is rewritten to `api/article.js`, which emits production canonical and Open Graph URLs.
3. `/api/search` pages through published articles, normalizes Polish text accent-insensitively, ranks title/summary/content matches, and fails closed when the corpus exceeds 2,000 records; a future larger corpus should move to database full-text search.
4. Editorial authentication runs in the browser against Supabase. Password-reset links return to `/reset-password.html` on the requesting origin, which must be allow-listed in Supabase.
5. Operations requiring service credentials run only in Vercel Functions.

## Invariants

- Service-role keys, secret keys, newsletter credentials, and access passwords remain server-only and uncommitted.
- Public search uses only the anon/publishable Supabase key, filters `status=published` and non-null `published_at` in PostgREST, and repeats those eligibility checks fail-closed before emitting a result.
- The production origin is the only canonical/public origin emitted by application code and production documentation.
- Preview URLs remain usable for verification but are not rewritten or promoted to canonical URLs.
- SSR-emitted and client-rendered articles use the same `article-layout.js` classifier: images at least as tall as wide are compact, landscape images are wide, and missing or invalid dimensions never imply compact layout.
- Public pages never load `admin-dashboard.css`; every admin page loads it last, after shared public primitives, while `reset-password.html` reuses the same auth-recovery components without becoming a CMS page.
- Homepage CSS switches from the mobile banner and block layout at `max-width:900.98px` to the sticky desktop banner and sidebar grid at `min-width:901px`; banners retain natural proportions without cropping or upscaling.
- Security headers, password gating, indexing policy, and newsletter behavior change only under explicitly scoped work.
