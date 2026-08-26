# Durable decisions

## DEC-001 — Canonical production origin

- State: `DONE`
- Decision: Use `https://kronika82.vercel.app` as the canonical production origin in public metadata, sitemap entries, runtime URL fallbacks, and production documentation.
- Rationale: A single stable origin prevents duplicate canonical identities and keeps generated links aligned with the renamed Vercel project.

## DEC-002 — Server-only secrets

- State: `DONE`
- Decision: Supabase privileged keys, newsletter credentials, and the reader access password remain server-side environment values and are never embedded in public assets.
- Rationale: Browser-delivered files are public and cannot safely contain privileged credentials.

## DEC-003 — Explicit test-file runner

- State: `DONE`
- Decision: `npm test` discovers sorted `scripts/test-*.cjs` files and runs each one in a separate Node process through `scripts/run-tests.mjs`.
- Rationale: Passing a shell-expanded list of test files directly to Node executes only the first file and treats the remaining paths as arguments.

## DEC-004 — Shared article image layout classifier

- State: `DONE`
- Decision: Use `article-layout.js` as the single classifier for SSR-emitted and client-rendered article markup, based on the loaded image's natural width and height.
- Rationale: Both delivery paths must assign identical layout classes for identical image dimensions without duplicating ratio logic or assuming that every article image is compact.

## DEC-005 — Admin CSS ownership boundary

- State: `DONE`
- Decision: Keep confirmed CMS and auth-recovery selectors in `admin-dashboard.css`, loaded last by admin/auth-recovery pages and never by public pages.
- Rationale: A single admin owner removes unused CSS from the public payload while preserving the established cascade, responsive behavior, and computed styles.

## DEC-006 — Homepage shell and banner CSS ownership

- State: `DONE`
- Decision: Keep `.home-layout`, its feed boundary, and `.home-ad*` layout, visibility, sticky, and natural-size rules exclusively in `front-final.css`, preserving the `900.98px`/`901px` switch.
- Rationale: A single late-loaded owner removes legacy crop and fixed-height overrides while preserving the established homepage geometry and banner behavior.
