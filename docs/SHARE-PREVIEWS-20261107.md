# Public share previews — 2026-11-07

Base: b2eb06358847f81d164d5c27889327c9246304a7, verified production READY before implementation.
Working directory: existing .git/editor-release-20261107 within canonical repository. Original dirty canonical files remain untouched.

Public /s/:slug and /api/share expose only title, summary and allowlisted public main image for status=published. The query does not select content, gallery, profiles or secrets; anon/publishable credentials retain RLS. A second status/slug check fails closed. GET/HEAD only, no-store at browser/CDN, generic errors. JavaScript navigates humans to unchanged gated /a/:slug; crawlers receive HTTP 200 HTML without a User-Agent exception. No JavaScript is required to parse OG; a readable article link remains without JavaScript. Missing/draft/review/archived rows return identical 404 without OG. External/signed image URLs fall back to the existing public image.

Share and copy controls emit /s links on SSR and legacy dynamic article pages. Old slugs and old links remain unchanged; past /a messages cannot acquire public metadata automatically. Editor preview uses title/lead and selected/recovered/stored main photo; no extra schema or persistence fields. Optional independent OG overrides deferred to avoid a database/autosave migration in this release.

Robots permits only /s/ and /assets/ while retaining global disallow and noindex headers. Existing Supabase table/storage policies are not changed. Already retrieved social cards/images can remain in platform caches after unpublication; server requests always recheck publication.

Validation before release: all existing tests and new API/middleware tests pass. Live Supabase read-only audit confirms anon SELECT is limited to published rows but includes article body columns; the reader password is a website gate, not a database confidentiality boundary. Public article-images storage also predates this release. This change does not broaden those policies. There are no live draft rows at audit time, so draft denial is covered with adversarial mocked responses and anon query returning no rows; no editorial records are created for testing.

## Release and verification

- Implementation SHA: `457c43b603832b6017c0a007951aa6fedf4d0b84`; pushed fast-forward to main and fix/public-share-previews-20261107.
- Vercel production: `dpl_Aya9f5tGrCKLFmgeZAgLop9cAXyk`, READY, https://kronika82-ki3t6diry-wade-w.vercel.app; production domain https://kronika82.vercel.app.
- GitHub Actions succeeded: https://github.com/fathomlesssong/the-82-chronicle/actions/runs/42362662415.
- Full existing regression suite plus metadata tests passed through npm run check; additional Chromium share test passed separately (16 test files total). HTML audit: 14 pages / 184 local references. Syntax and git diff --check passed.
- `node scripts/verify-share-production.cjs`: PASS on production. Two existing published slugs tested across Mozilla, WhatsApp/2.24.1, facebookexternalhit/1.1 and Facebot. Each returns HTTP 200 and OG title/description/image/url plus Twitter card; main and fallback images return 200 image content type. Missing slug returns 404 with no OG, HEAD returns 200 empty body, POST returns 405. Protected article routes return 303 to gate; article/search APIs return 401, including crawler UAs. Static-extension article slugs remain gated.
- Live Chromium: /s/schody-w-naprawie navigates through /a/schody-w-naprawie to /wejscie.html?next=%2Fa%2Fschody-w-naprawie. With JavaScript disabled the /a link remains usable.
- `K82_TEST_ORIGIN=https://kronika82.vercel.app node scripts/test-editor-browser.cjs`: PASS. Deployed HTML, editor, draft and new preview scripts compared byte-for-byte to source; tests cover auth refresh, tab focus, reload, browser close/reopen, exact photo bytes, metadata, concurrent copies, upload failures and publication redirect. Backend operations are mocked; no live article/newsletter writes. Preview title/photo survive recovery.
- Native share and clipboard controls tested in Chromium for SSR and legacy article URLs; both use /s/stary-slug. Browser APIs were intercepted to avoid sending messages.
- New endpoint selects no content/gallery/profile fields, escapes all HTML attributes, rejects nonpublic/signed/external image URLs, and exposes no privileged credentials in output. Existing public asset version query strings are retained.
- Vercel runtime log check showed one Node DEP0169 url.parse deprecation warning; no failing HTTP response occurred in smoke tests. New code uses WHATWG URL; this warning was not attributed to a specific dependency.
- editor-drafts.js, service worker, styles and Supabase schema are byte-identical to base. Original canonical dirty files and other worktrees remain untouched.

## Evidence limits

No real WhatsApp/Messenger/Facebook message was sent. HTTP crawler requests confirm parseable metadata, not an observed card in those applications or invalidation of their caches. Previously shared /a links remain gated; new share/copy controls supply /s. Optional separate editable OG fields were not added. No live draft existed to probe; draft/review/archived rejection is verified with adversarial tests and publication-filtered anon access.

This report and the reusable production smoke script are committed separately after the application release; they do not alter runtime application code.
