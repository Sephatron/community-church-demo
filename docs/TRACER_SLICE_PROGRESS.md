# Tracer Slice — Build Progress

**Status:** Eval blockers fixed — PASS-conditional resolved. Awaiting Joe's account wiring.
**Agent:** Senior Developer (Sonnet)
**Date:** 2026-06-22 (blocker fixes applied same day)

---

## What was built

### 1. Astro Content Collection — Events

- `src/content/config.ts` — Zod schema for `events` (typed, nullable date, category enum) and `site-settings` (theme tokens + service facts).
- `src/content/events/*.json` — 9 JSON files migrated verbatim from `src/data/events.ts`. JSON chosen over Markdown+frontmatter because events have no long-form prose body and JSON avoids YAML apostrophe/encoding issues.
- `src/content/site-settings/settings.json` — Single file exposing editable tokens: three CSS colour vars, service time/venue/day, contact email/phone, hero accent text.

### 2. Refactored pages

- `src/pages/events.astro` — now reads via `getCollection('events')`. Sort logic, category filter, live count, and card markup are **identical** to before. `eventCategories` constant is kept local so the page is fully self-contained from the collection.
- `src/pages/index.astro` — "Next event" block now reads the earliest upcoming dated event from the collection (falls back to null → block hidden if no upcoming events). Hero accent text (`"Jesus"`) now comes from `site-settings`, with a hardcoded fallback so the page never breaks.
- `src/layouts/BaseLayout.astro` — reads `site-settings` at build time and injects a `<style>` block overriding the three CSS custom properties (`--clay`, `--paper`, `--ink`). Tailwind colour utilities (e.g. `bg-clay/15`) continue to work because they reference these vars at runtime via CSS.

### 3. Sveltia CMS admin

- `public/admin/index.html` — loads Sveltia CMS from unpkg.
- `public/admin/config.yml` — defines the `events` collection (folder, JSON format, all fields with widgets and hints) and a `site-settings` files collection. GitHub backend, branch `main`. `base_url` placeholder set — Joe must fill in the Worker URL after deployment.

### 4. Base-path change

- `astro.config.mjs` — `base` changed from `/community-church-demo` to `/`. `site` updated to `community-church-demo.pages.dev` (Joe can update once the real Pages URL is known). The `link()` helper in `site.ts` is not changed — it reads `import.meta.env.BASE_URL` at build time, which Astro sets from `base`.

### 5. OAuth Worker

- `sveltia-cms-auth/worker.js` — Cloudflare Worker that brokers GitHub OAuth. Handles `/auth` (redirect to GitHub) and `/callback` (exchange code → token → postMessage to CMS window).
- `sveltia-cms-auth/wrangler.toml` — minimal Wrangler config.
- Callback URL pattern: `https://sveltia-cms-auth.<YOUR-SUBDOMAIN>.workers.dev/callback`

---

## Eval blocker fixes (2026-06-22)

The independent evaluator graded the original slice PASS-conditional with 2 blockers, 2 should-fixes, and 1 cleanup. All five resolved in this pass.

### BLOCKER 1 — OAuth worker security (`sveltia-cms-auth/worker.js`)
Full rewrite. Specific changes:

**CSRF `state` flow:**
- `/auth` now generates a 32-hex-char random token via `crypto.randomUUID()`, stores it in a `csrf-state` cookie (`HttpOnly; Secure; SameSite=Lax; Max-Age=600`), and includes it as the OAuth `state` parameter in the GitHub redirect.
- `/callback` reads the cookie via a `parseCookie()` helper, compares it to the `state` query parameter returned by GitHub, and rejects with a `CSRF_DETECTED` error on any mismatch — before the code exchange even starts.
- The cookie is immediately expired (Max-Age=0) on successful token exchange.

**Origin-pinned postMessage:**
- The popup no longer posts the token to `'*'`.
- On page load the popup sends `window.opener.postMessage('authorizing:github', '*')` — a contentless ping with no secret, matching the reference exactly.
- It then waits for the CMS to echo `'authorizing:github'` back. The origin of that echo is captured from `event.origin`.
- The token postMessage is then sent exclusively to that captured origin: `window.opener.postMessage(message, allowedOrigin)`.
- This means the access token can only reach the exact window+origin that opened the popup.

**Scope:** narrowed from `repo,user` to `repo` only — Sveltia CMS does not require `user`.

### BLOCKER 2 — Next-event card image mismatch (`src/pages/index.astro`)
- Removed `playOnImg` import and the two-column image+text layout from the "What's on next" block.
- Block is now a single-column text card (`max-w-3xl`), showing only the dynamically-selected event's title, when, location, description, and a "See all events" link.
- The `play-on-poster.jpg` asset remains in `public/assets` for future use; it is simply no longer referenced at build time (visible in build output: 6 images optimised, down from 7).
- A per-event image field is deferred to a later phase per spec.

### SHOULD-FIX 3 — Curly apostrophes in event JSON
Restored curly right single quotes (') in all four affected files:
- `src/content/events/womens-breakfast.json` — `Women's`, `King's`
- `src/content/events/play-on.json` — `Everyone's`
- `src/content/events/alpha-course.json` — `King's`
- `src/content/events/honiton-foodbank.json` — `King's`

### SHOULD-FIX 4 — CMS config (`public/admin/config.yml`)
Added `editor: { preview: false }` to suppress the raw-JSON preview pane. Added `site_url` and `display_url` pointing to the GitHub Pages URL.

### CLEANUP 5 — Dead file removed
`src/data/events.ts` deleted. Confirmed via grep that the only references in the codebase were comments (not imports) in `src/content/config.ts` and `src/pages/events.astro`.

---

## What was NOT changed

- `src/data/sermons.ts` and all sermon-related pages — untouched per tracer-slice scope.
- `src/data/site.ts` — untouched. Service time etc. are still in `site.ts`; the `site-settings` collection duplicates a subset of those values so the CMS can expose them. A Phase 1 task would reconcile the two sources (make `site.ts` read from the collection or remove it).
- All other pages (`im-new`, `about/*`, `community/*`, etc.) — untouched.
- `gh-pages` branch — untouched, remains as a frozen fallback.

---

## Known limitations / follow-up for Phase 1

1. **Dual source of truth for service facts.** `site.ts` still holds service times used in several pages; `site-settings/settings.json` duplicates them for CMS exposure. Phase 1 should either make pages read from the collection, or remove `site.ts` values that are now in settings.
2. **Next-event block has no poster image.** Removed in eval fix (was hardcoded to wrong event). A per-event image field in the schema + slug→image resolution is the Phase 1 fix.
3. **`base_url` in config.yml needs the real Worker URL** before the CMS OAuth flow works. Fill in after Worker deployment.

---

## Build status

`npm run build` — **PASS** (verified by developer agent, 2026-06-22, post-eval-fix).
- 18 pages built, 0 errors, 0 warnings.
- 6 images optimised (play-on-poster.jpg no longer referenced — correct).
- `/events/index.html` contains 9 `data-event` article elements (all events migrated).
- `/index.html` contains "What's on next" block — text-only, driven by collection (currently shows Women's Breakfast, 2026-07-05).
