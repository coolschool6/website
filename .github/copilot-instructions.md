## Purpose
Give succinct, actionable guidance for AI coding agents working on this small static web app (Sleek Todo). Focus on the architecture, where to make changes, conventions, and pitfalls visible in the repository.

## Big-picture architecture
- Single-page static front-end served from `Index.html` with CSS in `css/styles.css` and the logic in `js/`.
- Two runtime modes to be aware of:
  - Local-only mode: the app (primary logic in `js/app.js`) persists data to localStorage using keys:
    - `sleek-todo.tasks.v1` (tasks), `sleek-todo.theme.v1` (theme), `sleek-todo.categories.v1` (categories).
  - Supabase-backed mode: optional integration implemented in `js/supabase-client.js`, `js/auth-supabase.js`, and `js/tasks-supabase.js`. These files use the Supabase JS client (ESM) and expect backend table/column names (see "Data shapes" below).

## Where to start for common tasks
- Change UI/markup: edit `Index.html` and `css/styles.css`.
- Client logic, filters, reminders, drag-and-drop and local persistence: `js/app.js` (the main file). Look for constants at top (e.g., STORAGE_KEY, THEME_KEY) and initialization in `init()`.
- Add/modify auth or remote task logic: `js/supabase-client.js`, `js/auth-supabase.js`, `js/tasks-supabase.js`.

## Key patterns & conventions (project-specific)
- LocalStorage keys are versioned (e.g. `sleek-todo.tasks.v1`). Preserve version strings when changing storage shape or add migration code in `loadTasks()`.
- Task ordering: numeric `order` field is used for manual sort; `sort-by` selects 'manual' to respect `order` values.
- Priority is numeric (1 low, 2 med, 3 high) and mapped to CSS classes `tag.low|med|high`.
- Dates: the client uses `dueDateTime` (ISO-like string with time, e.g. `2025-10-26T09:00`) while Supabase code references `due_at` and `created_at`. Be explicit when mapping fields between local and remote.
- Category: client stores category as a string (category name) while the Supabase module expects `category_id` foreign key. When adding remote sync, implement mapping logic.
- Reminders: app.js schedules reminders using setTimeout and caps with MAX_TIMEOUT (~24.8 days). Long-range reminders are intentionally limited; prefer server-side scheduling for production.

## Data shapes (examples to reference)
- Local task object (in `app.js`):
  - id, title, description, category (string), priority (number), dueDateTime (string), reminder: { enabled, offset, unit }, completed (bool), createdAt (ms), order (number)
- Supabase task row (expected by `tasks-supabase.js`):
  - id, title, description, category_id (FK), priority, due_at, reminder (json), completed, created_at, order

When writing code that converts between client/local and remote rows, map `dueDateTime <-> due_at`, `createdAt <-> created_at`, and `category <-> category_id`.

## Integration points & secrets
- `js/supabase-client.js` contains the Supabase URL and a placeholder ANON key. Replace `REPLACE_WITH_ANON_KEY` for real testing. Do NOT commit service_role keys. The client uses ESM imports from a CDN — browsers must load modules (Index.html currently loads `js/app.js` via `defer`; add module type if you import ESM in browser).
- Realtime: `tasks-supabase.js` creates a realtime subscription using `supabase.channel` and Postgres changes; subscriptions filter by current user id (see comment). Ensure `supabase.auth.getUser()` is awaited when used in subscriptions.

## Developer workflows and quick commands
- There is no build step. Serve files with a static HTTP server when testing in a browser (recommended to avoid module CORS/file:// issues). Examples for PowerShell:

```powershell
# from repository root
python -m http.server 8000
# or if you have Node installed
npx http-server -c-1 . -p 8000
```

- Debugging tips:
  - Open DevTools Console and Network tab. Supabase errors will appear as thrown errors from the helper modules.
  - Inspect localStorage keys (above) to see persisted shape and quick-edit values.
  - Check `app.js` console logs for parsing/migration branches in `loadTasks()`.

## Common pitfalls for AI edits (do not introduce these)
- Mixing field names: avoid writing code that assumes both `dueDateTime` and `due_at` are present — convert explicitly.
- Accidentally committing secrets: `js/supabase-client.js` is the place keys live; do not write service_role keys into repo.
- Long-running setTimeouts: app uses MAX_TIMEOUT; large offsets may silently fail — mention this when adding reminder logic.

## Small contract for changes
- Inputs: DOM events (form, filters), localStorage or Supabase rows.
- Outputs: DOM updates, localStorage writes,/or Supabase mutations.
- Error modes: localStorage parse errors (logged), Supabase network/permission errors (throw). Prefer catching and surfacing readable messages.

If anything in this file is unclear or you'd like more examples (for example, a sample migration that maps local tasks to Supabase rows), tell me which area to expand and I'll iterate.
