# Editor draft release — 2026-11-07

## Released implementation

Base: `4568d1900e9c02ef29c046860c4f4228b1e1c48e`, confirmed as both origin/main and active Vercel production before release.
Implementation: `c90044c4ce4c7ee35498c3a594d6bd85cc38ab57`, branch `fix/editor-durable-drafts-20261107`, pushed fast-forward to main through the existing Git deployment integration.
Initial deployment: `dpl_DGpHtcdZ8oLXJL9zjdGr2nZ97ZD8`, https://kronika82-p82zgkj98-wade-w.vercel.app — READY, alias https://kronika82.vercel.app, implementation SHA confirmed by authenticated Vercel metadata.

Only editor persistence/recovery, tests, test dependencies and documentation changed. Production main-image processing is byte-identical to the base. Markdown, CSS, PWA, search, reader password, auth controls, robots and security configuration are unchanged. DEC-009 retains publication redirect; DEC-010 defines durable drafts. Existing decisions and completed roadmap entries are retained.

## Verification

- npm ci; browser installation; npm run check: all 14 test files pass, including Chromium and IndexedDB; site audit passes (14 HTML pages / 180 local references).
- node --check for both editor scripts and git diff --check pass.
- GitHub Actions Site audit: https://github.com/fathomlesssong/the-82-chronicle/actions/runs/42360955772 — success for implementation SHA.
- K82_TEST_ORIGIN=https://kronika82.vercel.app node scripts/test-editor-browser.cjs: PASS after correcting the helper-tab asset comparison. The test compares deployed HTML and both editor scripts byte-for-byte with the release source, executes those scripts on the real production origin in a new Chromium profile, and verifies committed local recovery.
- Scenarios: repeated same-user auth notifications, tab refocus, reload, closing/reopening the browser profile, exact original main/gallery photo bytes, captions/credits, two concurrent copies, upload/gallery failures, server-save failure, missing published status or slug, newsletter failure and success, publication redirect and retaining the other copy, server draft retaining its local copy.
- Production editor and scripts: HTTP 200; noindex/nofollow/noarchive response header confirmed. Vercel error/fatal log query for initial deployment returned no entries in the observed window.

## Evidence boundary

All backend authentication, data writes, uploads and newsletter operations in Chromium were mocked and intercepted. No real article was published or newsletter sent. This verifies deployed browser code and real IndexedDB behavior, not a live Supabase publication transaction. No real browser profile or user draft was accessed.

The helper-tab comparison fix and this completed release record are a separate test/documentation follow-up; they do not alter production application files. Its final Git SHA and deployment are to be confirmed again after the normal main push.

## Preservation and remaining work

Original dirty and untracked canonical files were copied without moving them to `.git/codex-recovery-20261107/release-start/`, with a SHA-256 manifest. Every original file matched that manifest before the implementation commit. The canonical checkout stayed on its original branch; the release worktree is inside the same repository at `.git/editor-release-20261107/`. No adjacent project was created and no historical refs were rewritten.

Unrelated user image/CSS/banner changes and archived branches were excluded. The four existing high severity dependency findings remain separate work. Drafts are local to browser/profile/origin, capped at 180 MiB per draft and subject to available browser quota. Clearing site data, private browsing or termination before a committed save can still lose uncommitted changes; there is no cross-device backup.
