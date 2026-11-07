# Roadmap

- [x] `PLAN-008` `DONE` — Open the saved article after successful publication; retain the editor on errors and preserve draft-save behavior.

- [x] `PLAN-001` `DONE` — Replace the former production host in canonical metadata, public URL generation, the sitemap, PWA production gating, and operational documentation.
- [x] `PLAN-002` `DONE` — Make `npm test` execute every `scripts/test-*.cjs` file deterministically and fail fast.
- [x] `PLAN-003` `DONE` — Unify SSR-emitted and client-rendered article image layout classification through `article-layout.js`.
- [x] `PLAN-004` `DONE` — Isolate confirmed admin-only CSS in `admin-dashboard.css` without visual changes to admin or public pages.
- [x] `PLAN-005` `DONE` — Consolidate homepage shell and banner CSS ownership in `front-final.css` without a visual change.
- [x] `PLAN-006` `DONE` — Add reader-gated, accent-insensitive search over published articles with anon/publishable Supabase access and an explicit corpus limit.
- [x] `PLAN-007` `DONE` — Add safe limited Markdown formatting to article bodies in both public rendering paths.

- [x] `PLAN-009` `DONE` — Integrate durable text/photo drafts and same-user session protection on current main, retaining publication behavior.
- [x] `PLAN-010` `DONE` — Full regression suite and isolated editor release verified on Vercel; production Chromium checks confirm deployed assets and local text/photo recovery. Backend publication operations were mocked to protect real data; see release report.

- [x] PLAN-011 DONE — Public published-only OG links, reader share/copy controls, editor preview and regression/production verification.

- [x] PLAN-012 DONE — Dedicated WhatsApp action in both article views, Unicode/escaping and browser regression checks, then production release verification.
