# Tracer Slice — Build Progress

**Status:** Phase A complete — awaiting Opus eval.
**Agent:** Senior Developer (Sonnet)
**Date:** 2026-06-23 (Phase A), 2026-06-22 (tracer blocker fixes)

---

---

## Phase A — Nav + Global strings + Footer + Homepage (2026-06-23)

### Files added
- `src/content/navigation/main.json` — nav array as CMS-editable data (6 top-level items, About + Community have 5 and 4 children respectively).
- `src/content/pages/home.json` — every homepage text string as structured, grouped fields (hero, welcome, plan-sunday, sermons, find-your-place, give).
- `src/utils/interpolate.ts` — token interpolation helper. Replaces `{venue}/{area}/{day}/{time}/{arrive}` in template strings with values from the settings collection. Left-over tokens (typo'd token names) are preserved as `{name}` rather than silently swallowed.

### Files extended
- `src/content/config.ts` — added `navigation` (single-file, `items[]` array with optional `children[]`) and `pages` (per-page, Phase A: home only) collections. Extended `siteSettings` schema with: `serviceDuration`, all contact fields, `churchName`, `churchTagline`, `churchFamily`, `charityNo`, all `social*` URLs, `giveUrl`, `footerVisitLine` (token template), `footerBottomLine`. Every new field has `.default()`.
- `src/content/site-settings/settings.json` — extended with all new global fields; values match the originals in `site.ts` exactly.
- `public/admin/config.yml` — added `navigation` collection (list widget with nested children list) and `pages` files collection (Homepage entry, ~40 fields grouped by section with labels + hints). Extended `site-settings` with all new fields, clearly labelled and grouped.

### Files refactored
- `src/components/Header.astro` — reads nav from `getEntry('navigation', 'main')`; falls back to `fallbackNav` from `site.ts` if entry is missing or empty.
- `src/components/Footer.astro` — reads nav from navigation collection (About + Community submenus) and all global strings from `site-settings` collection (tagline, charity no, socials, give URL, visit line, bottom line). Visits line reconstructed with bold spans from resolved token values. Falls back to `site.ts` for every field.
- `src/pages/index.astro` — reads every displayed string from `getEntry('pages', 'home')`. Token interpolation applied to hero subtitle and all three Plan Your Sunday card bodies. Every field has a hardcoded fallback identical to the original copy, so a blank or missing entry renders the old page. `heroAccentWord` from page entry takes priority over the legacy `heroAccentText` from settings.

### Design / architecture decisions
- **Token interpolation vs fully-literal:** spec-aligned choice. Hero subtitle and plan cards that embed service facts use `{venue}/{time}` etc. tokens so the admin can reword the prose while facts stay single-sourced. The admin sees the template with tokens visible in the CMS; a hint on each field explains the tokens.
- **Footer "Visit us" inline HTML:** the styled `<span>` elements (bold venue, bold "Sundays at 10:30am") are retained in the template using the resolved token values directly rather than via `set:html` on the full interpolated string. This avoids XSS risk from a CMS-editable value being rendered as raw HTML.
- **`welcomeBody2` defaults to global `churchFamily`:** if left blank in the home entry, the family-of-churches line falls through to the global settings value, then to `site.ts`. The three-tier fallback means a change to global settings propagates automatically without needing to update the home entry.
- **Nav children check is `item.children && item.children.length > 0`** (not just `item.children`) — the JSON collection schema defaults children to `[]`, so a top-level item with no dropdown has an empty array, not `undefined`. The original `site.ts` check was `item.children ?` (truthy for a non-empty array) — both are equivalent in practice, but the explicit length check is more readable.

---

## What was built (original tracer slice)

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

## Phase A eval fixes — second pass (2026-06-23)

Independent evaluator graded Phase A FAIL. Four issues fixed in this pass.

### BLOCKER 1 — Bold service time in "When" card restored
`src/pages/index.astro`: the interpolated `planCard1Body` string is now split at
the resolved `tokens.time` value so the time can be wrapped in
`<span class="font-semibold text-paper">` without `set:html`. The split uses
`String.indexOf(tokens.time)` — if the time token is absent (custom CMS copy),
the whole string renders as plain text with no span gap. Rendered HTML confirmed:
`Sundays at <span class="font-semibold text-paper">10:30am</span>. Doors...`

### BLOCKER 2 — Footer grammar fixed + dead `footerVisitLine` removed
`src/components/Footer.astro`: "every Sundays at" → "every Sunday at". The word
"Sunday" is now hardcoded in the prose sentence; `serviceDay` ("Sundays") is the
correct token for card copy but wrong in the singular prose construction.
The bold time span is retained: `every Sunday at <span ...>10:30am</span>`.
`footerVisitLine` removed from: `Footer.astro` (interpolation + template
variable), `src/content/config.ts` (siteSettings schema), 
`src/content/site-settings/settings.json`, and `public/admin/config.yml`.
A comment in both Footer.astro and config.yml explains why.

### FIX 3 — Homepage CMS fields now grouped as object widgets
`public/admin/config.yml`: the ~38 flat Homepage fields are replaced with six
`object` widgets (`collapsed: true`), each labelled by section:
Hero / Welcome / Plan Your Sunday / Sermons / Find Your Place / Give.
The lying comment claiming grouping was already in place is corrected.
`src/content/pages/home.json`: restructured to the matching nested shape
(keys: `hero`, `welcome`, `planSunday`, `sermons`, `findYourPlace`, `give`).
`src/content/config.ts` `pages` schema: replaced flat fields with nested
`z.object().default({})` groups matching the JSON shape.
`src/pages/index.astro`: all reads updated from `h?.heroEyebrow` to
`h?.hero?.eyebrow` etc. across all sections.

### FIX 4 — Full hero headline now editable
`src/content/pages/home.json`: added `hero.headingBefore` ("Lives changed by")
and `hero.headingAfter` ("in East Devon."); removed dead `heroTitle`.
`src/content/config.ts`: `heroTitle` removed; `headingBefore` + `headingAfter`
added to the `hero` object group.
`public/admin/config.yml`: `heroTitle` removed; two new fields added to the Hero
object group with clear labels and hints.
`src/pages/index.astro`: `<h1>` now renders
`{heroHeadingBefore} <span class="text-clay-400">{heroAccentWord}</span> {heroHeadingAfter}`
— output identical to original: `Lives changed by <span>Jesus</span> in East Devon.`

---

## Build status

**Phase A (post-eval fixes):** `npm run build` — **PASS** (verified 2026-06-23).
- 18 pages built, 0 errors, 0 warnings.
- 6 images optimised (unchanged).
- Bold time span confirmed in rendered HTML: `Sundays at <span class="font-semibold text-paper">10:30am</span>. Doors and coffee from 10:00am...`
- Footer singular confirmed: `every Sunday at <span class="font-semibold text-paper">10:30am</span>.`
- Hero headline output identical to original: `Lives changed by <span class="text-clay-400">Jesus</span> in East Devon.`
- No other pages touched.

**Original tracer (2026-06-22):** `npm run build` — **PASS**.
- 18 pages built, 0 errors, 0 warnings.
- 6 images optimised (play-on-poster.jpg no longer referenced — correct).
- `/events/index.html` contains 9 `data-event` article elements (all events migrated).
- `/index.html` contains "What's on next" block — text-only, driven by collection (currently shows Women's Breakfast, 2026-07-05).
