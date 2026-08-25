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
