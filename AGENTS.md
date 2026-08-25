# Kronika 82 repository guidance

## Scope and architecture

- This repository is a static JavaScript site with serverless API helpers.
- `styles.css` contains the base visual language, `mobile.css` contains legacy responsive rules, and `front-final.css` owns the final homepage layout and narrowly scoped visual corrections.
- `site.js` renders the homepage feed, including the optional video, responsive banner, and “Więcej wiadomości” section.
- Preserve banner behavior: no frames, natural horizontal height, proportional downscaling for large images, and no upscaling for small images.

## Workflow

- Inspect the relevant source and generated DOM order before editing.
- Prefer consolidating conflicting CSS rules over appending another exception.
- Keep changes focused on the requested branch; never modify `main` unless explicitly requested.
- When homepage CSS changes, update its cache-busting reference and the service-worker shell entry.
- Run `npm run check`, review `git diff --check`, and inspect the final diff before committing.

## Git safety

- Do not work on a dirty worktree unless the user explicitly authorizes it.
- Do not push, merge, publish, or force-push unless the user explicitly authorizes the action.
