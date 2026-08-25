# Kronika 82 architecture

## System shape

Kronika 82 is a lightweight newspaper site deployed on Vercel. Public pages are static HTML, CSS, and browser JavaScript. Dynamic article rendering and privileged operations are implemented as Vercel Functions under `api/`, with reusable server-only helpers under `lib/`.

The canonical production origin is `https://kronika82.vercel.app`. Preview and historical deployment hosts must never be emitted as canonical or other public production URLs.

## Components

- `index.html`, `archive.html`, `section.html`, and `site.js` render public navigation and article lists.
- `api/article.js` renders server-side article pages under `/a/<slug>` with canonical and Open Graph metadata.
- `article-layout.js` is the shared article-image classifier for SSR-emitted and client-rendered article markup; it derives layout only from the loaded image's natural dimensions.
- `admin*.html` and `admin*.js` provide authenticated editorial workflows.
- `supabase-config.js` contains public browser configuration; `lib/supabase-server.js` and server functions handle privileged Supabase access.
- `middleware.ts` and `vercel.json` define access and routing behavior.
- `manifest.webmanifest`, `pwa.js`, and `sw.js` provide the production PWA shell.
- `robots.txt` and `sitemap.xml` describe public crawler entry points; response-level indexing policy remains controlled by `vercel.json`.

## Major flows

1. Public pages load published content from Supabase and fall back safely when data is unavailable.
2. `/a/<slug>` is rewritten to `api/article.js`, which emits production canonical and Open Graph URLs.
3. Editorial authentication runs in the browser against Supabase. Password-reset links return to `/reset-password.html` on the requesting origin, which must be allow-listed in Supabase.
4. Operations requiring service credentials run only in Vercel Functions.

## Invariants

- Service-role keys, secret keys, newsletter credentials, and access passwords remain server-only and uncommitted.
- The production origin is the only canonical/public origin emitted by application code and production documentation.
- Preview URLs remain usable for verification but are not rewritten or promoted to canonical URLs.
- SSR-emitted and client-rendered articles use the same `article-layout.js` classifier: images at least as tall as wide are compact, landscape images are wide, and missing or invalid dimensions never imply compact layout.
- Security headers, password gating, indexing policy, and newsletter behavior change only under explicitly scoped work.
