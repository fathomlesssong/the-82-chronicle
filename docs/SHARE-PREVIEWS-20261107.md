# Public share previews — 2026-11-07

Base: b2eb06358847f81d164d5c27889327c9246304a7, verified production READY before implementation.
Working directory: existing .git/editor-release-20261107 within canonical repository. Original dirty canonical files remain untouched.

Public /s/:slug and /api/share expose only title, summary and allowlisted public main image for status=published. The query does not select content, gallery, profiles or secrets; anon/publishable credentials retain RLS. A second status/slug check fails closed. GET/HEAD only, no-store at browser/CDN, generic errors. JavaScript navigates humans to unchanged gated /a/:slug; crawlers receive HTTP 200 HTML without a User-Agent exception. No JavaScript is required to parse OG; a readable article link remains without JavaScript. Missing/draft/review/archived rows return identical 404 without OG. External/signed image URLs fall back to the existing public image.

Share and copy controls emit /s links on SSR and legacy dynamic article pages. Old slugs and old links remain unchanged; past /a messages cannot acquire public metadata automatically. Editor preview uses title/lead and selected/recovered/stored main photo; no extra schema or persistence fields. Optional independent OG overrides deferred to avoid a database/autosave migration in this release.

Robots permits only /s/ and /assets/ while retaining global disallow and noindex headers. Existing Supabase table/storage policies are not changed. Already retrieved social cards/images can remain in platform caches after unpublication; server requests always recheck publication.

Validation before release: all existing tests and new API/middleware tests pass. Live Supabase read-only audit confirms anon SELECT is limited to published rows but includes article body columns; the reader password is a website gate, not a database confidentiality boundary. Public article-images storage also predates this release. This change does not broaden those policies. There are no live draft rows at audit time, so draft denial is covered with adversarial mocked responses and anon query returning no rows; no editorial records are created for testing.

Final browser sharing verification and release: pending.
