# Kronika 82 repository guidance

## Architecture and scope

- The public site is primarily static HTML, CSS, and browser JavaScript.
- Vercel Functions live under `api/`; shared server helpers live under `lib/`.
- Supabase provides authentication and content data. Never expose service-role or secret keys to browser code, logs, commits, or reports.
- Preserve `vercel.json` security and routing behavior unless a task explicitly changes it.

## Workflow

- Inspect relevant files and current Git state before editing.
- Keep changes narrowly scoped and preserve unrelated worktrees and branches.
- Run `git diff --check` and `npm run check` after code changes.
- Review the final diff before committing.
- Do not push, merge, deploy, or change external service settings unless explicitly authorized.
- Never force-push.

## Documentation

- Keep `ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/ROADMAP.md` aligned with durable architecture and deployment decisions.
- Do not delete completed roadmap items or superseded decisions; mark their state instead.
