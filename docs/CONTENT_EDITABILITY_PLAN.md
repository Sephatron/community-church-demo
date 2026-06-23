# Content Editability Plan — make ALL visible text CMS-editable

**Status:** Proposed — PLAN ONLY. Awaiting Joe's decisions (see DECISIONS FOR JOE) before any code is written.
**Author:** Software Architect (independent planning agent, Opus)
**Date:** 2026-06-23
**Builds on:** `docs/CMS_MIGRATION_PLAN.md` (the chosen architecture) and `docs/TRACER_SLICE_PROGRESS.md` (the Events + site-settings tracer already shipped).

---

## 0. The bar (Joe's words)

> "Nowhere near enough control. I want to change text — **including headings and nav** — at a minimum."

So the goal of this plan is concrete: **every word a visitor can read must be editable by a non-developer through Sveltia CMS** — every page's hero eyebrow/title/subtitle, section headings, body paragraphs, card text, CTA/button *labels*, the **footer**, and the **navigation** (labels + structure). The bold bespoke design stays exactly as it is. We are exposing **text into the existing slots**, not building a page-builder.

This is a **personal project** (church demo). The TeamUpdraft coding standards do not apply; confirm with Joe if in doubt.

---

## 1. What the code actually is (verified — this drives the model)

I read all 18 pages, `site.ts`, both components, the content config, and the live `config.yml`. The text falls into a **small, finite set of recurring shapes**. That is the good news: a handful of well-designed field groups covers the whole site. The shapes are:

| Pattern | Where it appears | Fields it needs |
|---|---|---|
| **Hero (full-bleed)** | homepage, `im-new` (bespoke, in-page) | eyebrow, title, subtitle, 2× button label, (image) |
| **Hero (`PageHero` component)** | all inner pages | eyebrow, title, subtitle, (image, tone) |
| **Two-col text + image** | Welcome, Sermons, Finding-us, Kids&Youth | eyebrow, heading, 1–N paragraphs, button label(s), (image), optional "stat badge" (number + caption) |
| **Card grid (icon + text)** | Plan-Your-Sunday, Sundays "practical bits" | section eyebrow + heading; per-card: heading, body (icon stays in code) |
| **Ordered list** | `im-new` timeline (6), beliefs (11) | section eyebrow + heading; per-item: {time?, title, body} or just a paragraph |
| **FAQ accordion** | `im-new` | section eyebrow + heading; per-item: {question, answer} |
| **People grid** | `team` (elders, trustees) | section eyebrow + heading; per-person: {name, role} |
| **CTA banner** | Give, "still got a question" | heading, body, 1–2 button labels |
| **Embed** | SoundCloud, Google Maps | surrounding copy only (the embed src is derived from facts/config) |

### Three hard truths the model must respect

These are the architecture-shaping constraints. Ignoring any one of them produces either a broken site or a CMS a volunteer can't use.

1. **Service facts are interpolated *inside* prose.** e.g. homepage hero subtitle is literally:
   `"...we meet at {site.service.venue}, {site.service.area}, every Sunday at {site.service.time}..."`
   If we turn that whole sentence into one free-text field, we *freeze* the interpolation — change the service time in one place and this sentence silently goes stale. **Decision point (D2 below):** either (a) keep these as templated sentences fed by the global facts (one edit updates everywhere, but the admin can't reword the sentence), or (b) make them fully literal editable strings (admin can reword, but must remember to update each one). My recommendation is a **pragmatic split** — see §3.

2. **Buttons are `{label, href}` pairs, and `href` routes through the `link()` helper / internal slugs.** Letting a non-dev type a raw `href` is a footgun: one typo and the link 404s, or they break the base-path logic. **The safe ceiling is label-only editing** for the existing buttons (the destinations are part of the site's fixed IA). Where a genuinely editable destination is needed (e.g. the external "Give" URL), expose it as a **separate, clearly-labelled URL field**, not a freeform link inside prose.

3. **Icons and decorative SVG live in JSX and are not realistically editable.** A card is `{icon (SVG), heading, body}`; we expose heading + body, the icon stays in code. This is fine and correct — the admin edits *words*, the design system keeps the icons consistent. Say this plainly in the admin guide so nobody hunts for an icon picker that isn't there.

### What's already done (don't rebuild it)
- **Events** collection (`src/content/events/*.json`) — live, CMS-editable. Pattern proven.
- **site-settings** single file (`src/content/site-settings/settings.json`) — theme colours + service facts + contact + `heroAccentText`, injected via `BaseLayout.astro` and read by `index.astro`. **This is the seed of the global model — we extend it, we do not replace it.**
- The **graceful-fallback pattern** is already established: `settingsEntries[0]?.data?.heroAccentText ?? 'Jesus'`. Every read in this plan follows the same shape.

---

## 2. The content model — recommendation

I evaluated three shapes against four forces: (a) comprehensive text control, (b) non-dev CMS usability, (c) maintainability / no schema-page drift, (d) design preserved.

### Option 1 — One giant global "UI strings" file
Every string on the site in one keyed JSON/YAML.
- ✅ Trivial schema; one file.
- ❌ **Fails usability hard.** A ~400-key flat file is the "500-field monster" the brief explicitly warns against. A volunteer editing the homepage would scroll past contact-form labels and belief statements to find the hero. No per-page mental model. **Reject.**

### Option 2 — Pure per-page collections, nothing global
One entry per page; *every* string (including name, service times, footer) duplicated where used.
- ✅ Perfect per-page grouping; admin opens "Homepage", sees only homepage fields.
- ❌ **Fails maintainability.** The church name, service time, and footer appear on every page — duplicating them means 18 places to change the phone number, and they *will* drift. **Reject as the whole answer.**

### Option 3 — **HYBRID (recommended): per-page content collections + a global settings/strings layer + nav-as-data**
- **Per-page collection** (`pages`): one entry per page, fields grouped by the page's actual sections, typed to the patterns in §1. This is where the bulk of editable copy lives, grouped the way a human thinks ("I want to edit the I'm New page").
- **Global layer** (extend `site-settings`): the strings that are genuinely *shared* — church name, tagline, family-of-churches line, service facts, contact details, social URLs, charity number, **and the footer's editable text**. Edited once, used everywhere.
- **Nav as data** (`navigation`): the menu structure (labels + children) becomes an editable file the Header and Footer read.

**Why hybrid wins:** it is the only shape that satisfies *all four* forces. Per-page grouping gives a non-dev a sane mental model (usability); the global layer kills duplication (maintainability); typed section fields keep schema bound to the real sections (anti-drift); and because every field maps to an existing slot, the design is untouched. It also **reuses the exact patterns already shipped** (Content Collections + site-settings + BaseLayout injection), so the dev is extending a proven groove, not inventing one.

> **Trade-off named:** the hybrid has *two* places a string might live (page entry vs global). The rule that prevents confusion: **"appears on 2+ pages → global; appears on one page → that page's entry."** The admin guide states this once. The cost is a single rule to remember; the benefit is no 18×-duplicated phone number.

### 2.1 Concrete structure

```
src/content/
  events/                 # EXISTS — unchanged
    *.json
  site-settings/          # EXISTS — EXTENDED (global facts + footer + brand)
    settings.json
  navigation/             # NEW — the menu as data
    main.json
  pages/                  # NEW — one entry per page, typed sections
    home.json
    im-new.json
    sundays.json
    about.json
    about-vision-values.json
    about-what-we-believe.json
    about-team.json
    about-family-of-churches.json
    about-policies.json
    community.json
    community-foodbank.json
    community-children.json
    community-youth.json
    community-satellites.json
    sermons.json
    give.json
    contact.json
    events.json           # the events *page's* intro/heading copy (not the event items)
```

**File format:** JSON, matching the Events precedent (the tracer chose JSON over Markdown+frontmatter specifically to dodge YAML apostrophe/encoding pain — the church's copy is full of curly apostrophes, e.g. "King's", "Women's"). Keep that decision. **Exception:** body paragraphs that contain inline emphasis (`<strong>`, e.g. Sundays "**worship**", "**Bible teaching**") need a **markdown widget**, stored as a markdown string inside the JSON and rendered with a small markdown-to-HTML step (or Astro's content rendering). Plain paragraphs stay as `text` widgets. Most paragraphs are plain — reserve markdown for the few that genuinely need it, so the admin mostly sees simple textareas.

**Naming:** flat files with hyphenated path-style names (`about-vision-values.json`) rather than nested folders, because Sveltia `files` collections list cleanly and the slug↔page mapping stays obvious. Each page reads its entry by a **known id**, so there's no slug-guessing.

### 2.2 Schema sketch (illustrative — `pages` is a Sveltia `files` collection, one file per page)

Per-page Zod schema (in `src/content/config.ts`) is **typed per page**, not one mega-union, so a missing field on the Home page can't typecheck against the Contact page. Shared section *shapes* are factored into reusable Zod helpers to stop drift:

```ts
// reusable section shapes (sketch)
const heroBlock = z.object({
  eyebrow: z.string().default(''),
  title: z.string(),
  subtitle: z.string().default(''),
  primaryCtaLabel: z.string().default(''),
  secondaryCtaLabel: z.string().default(''),
});
const sectionHead = z.object({ eyebrow: z.string().default(''), heading: z.string() });
const card = z.object({ heading: z.string(), body: z.string() });
const faqItem = z.object({ question: z.string(), answer: z.string() });
const person = z.object({ name: z.string(), role: z.string().default('') });

// e.g. the Home page entry
const home = z.object({
  hero: heroBlock,
  welcome: sectionHead.extend({ body: z.array(z.string()).default([]),
                                ctaLabels: z.array(z.string()).default([]),
                                statNumber: z.string().default(''),
                                statCaption: z.string().default('') }),
  planSunday: sectionHead.extend({ cards: z.array(card).default([]) }),
  sermons: sectionHead.extend({ body: z.string().default(''), ctaLabel: z.string().default('') }),
  findYourPlace: sectionHead.extend({ tiles: z.array(card).default([]) }),
  give: z.object({ heading: z.string(), body: z.string().default(''), ctaLabel: z.string().default('') }),
});
```

**Every field has a `.default()`** so a blank/missing value yields an empty string or empty array, never a build crash (see §4). The page template then does `entry.data.hero.title || 'fallback'` for anything that must never render empty.

### 2.3 How pages READ content (graceful fallback is mandatory)

Pattern, identical everywhere, mirroring the shipped `heroAccentText` read:

```astro
---
import { getEntry } from 'astro:content';
const page = (await getEntry('pages', 'home'))?.data;
const t = (v, fallback = '') => (v && String(v).trim() ? v : fallback);
---
<h1>Lives changed by <span>{t(page?.hero?.accentWord, 'Jesus')}</span> in East Devon.</h1>
```

- `getEntry('pages', 'home')` — known id, no collection scan.
- A tiny `t()` helper (or `??`) guarantees **a missing field, a deleted file, or a blank string never breaks the build** — it falls back to the original hardcoded copy, which we keep as the fallback literal during migration. After a page is migrated and proven, the fallback can stay as a safety net (cheap) or be trimmed.
- **No new runtime dependency, no SSR.** Content Collections are build-time; the site stays fully static on Cloudflare Pages, exactly as now.

---

## 3. The interpolation problem — the one genuinely hard call (D2)

The service facts (`venue`, `area`, `time`, `day`, `arrive`) appear **both** as standalone facts (Plan-Your-Sunday "When" card) **and** baked into sentences ("…every Sunday at 10:30am…"). Two honest options:

- **3a — Templated (keep interpolation):** the sentence stays as `…every Sunday at {serviceTime}…` fed from global `site-settings`. **One edit to the time updates every sentence + every card.** Admin edits the *fact*, not the sentence. ✅ No drift, ✅ less to maintain. ❌ Admin can't reword that specific sentence (the surrounding words are fixed in code).
- **3b — Literal (full freedom):** the whole sentence becomes one editable string. ✅ Admin can rewrite it entirely. ❌ Changing the service time now means hunting every sentence that mentions it; **they will drift.**

**Recommendation — pragmatic hybrid (the "facts vs prose" line):**
- **Facts** (time/venue/area/day/arrive, contact, name, tagline) → **global `site-settings`, interpolated.** Change once, everywhere updates. These are *data*, not voice.
- **Voice prose** (the welcoming sentences, headings, descriptions) → **literal editable strings** in the page entry, with the *fact* interpolated as a token *only where it currently is*. For the handful of sentences that interpolate a fact, the editable field is the **sentence around the fact** (e.g. `"An ordinary community of people finding a bigger story. We meet at {venue}, {area}, every Sunday at {time} — and you're warmly invited."` becomes an editable template where `{venue}/{area}/{time}` are substituted from globals at build). Sveltia shows the admin the sentence *with the tokens visible* and a hint: "`{venue}`, `{area}`, `{time}` are filled in automatically from Site Settings — leave them in to keep the facts accurate, or remove them to type your own."

This gives the admin **real rewording power** over the prose while **keeping the facts single-sourced**. It is slightly more to explain in the guide (one hint about tokens) but it's the only answer that doesn't force a bad trade. If Joe finds tokens too fiddly for a volunteer, fall back to **3b for the 4–5 affected sentences only** (accept the drift risk on a tiny, well-known set) — but keep facts global everywhere else. **Do not** go full-3b across the site; that resurrects the duplicated-phone-number problem.

---

## 4. Risks and how the model defuses them

| Risk | Why it bites | Mitigation baked into this plan |
|---|---|---|
| **Config sprawl** | `config.yml` could balloon to a 600-line unreadable wall, and the *editor's* sidebar could become a list of 18 cryptic page entries. | (1) Group fields with Sveltia **`collapsed` field-set objects per section** so each page entry reads as Hero / Welcome / Plan Your Sunday… not one flat scroll. (2) Use clear `label` + `hint` on every field (the Events config already models this well). (3) Order pages in the CMS by the site's IA, with friendly labels ("Homepage", "I'm New", "About › Our Team"). |
| **Schema ↔ page drift** | A dev edits the page JSX but forgets the Zod schema (or vice-versa), and a field silently stops rendering. | (1) **Factor shared section shapes into reusable Zod helpers** (§2.2) so a "card" is defined once. (2) Every page read goes through the `t()`/`??` fallback, so drift degrades to "shows the fallback copy", never a crash. (3) Migration is **one page per slice with a byte-for-byte visual diff** at first commit — drift is caught immediately, page by page. |
| **Build fragility** | A blank required field, a deleted content file, or a malformed JSON could break `npm run build` and take the whole site down on the next push. | (1) **Every schema field has `.default()`** → Zod never throws on a missing/blank value. (2) **`getEntry` reads are null-guarded** with `?.` + fallback literal. (3) The page keeps its **original hardcoded copy as the fallback string**, so even a totally missing entry renders the old page. (4) Cloudflare Pages builds on push: a bad commit fails the build and **the previous good deploy stays live** — plus every change is a revertible Git commit. |
| **Editor overwhelm / "where is X?"** | Comprehensive control can mean "I can't find the thing I want to change." | The hybrid's per-page grouping is the antidote. Plus a one-page, screenshot-led admin guide ("to change the homepage hero, open Pages › Homepage › Hero"). |
| **Markdown misuse** | Giving every paragraph a rich-text box invites a volunteer to paste weird HTML and break the layout. | Use **plain `text` widgets for plain paragraphs** (the majority); reserve the **markdown widget only for the ~3 paragraphs that need `<strong>`**. Render markdown through a constrained pipeline (bold/italic/links only). No raw-HTML field anywhere. |

---

## 5. Phased plan (tracer-style, sized for the Sonnet dev, Opus eval at each checkpoint)

Each phase honours the workspace **pseudo-code-first → hard-stop-for-ACK** gate, then implement, then an **independent Opus evaluator** grades against the 6-dimension rubric (any dim at 1 = FAIL; PASS = no dim < 3). The ordering front-loads the **highest-value, lowest-risk, most-visible** wins so Joe can validate the *model and the CMS UX* before we commit to migrating 18 pages.

### Phase A — PROOF: Nav + Global strings + Footer + Homepage (end-to-end)
**The one that earns trust.** It proves the model on the three things Joe named ("headings and nav"), exercises every field-type pattern (hero, two-col, cards, CTA banner), and is fully visible on the landing page.

**A1 — Navigation as data (the early, contained, high-value win — do it first within the phase):**
- Add `src/content/navigation/main.json` mirroring the current `nav` array (label, href, children[]).
- Add a `navigation` collection to `config.yml`: a **`list` widget of nav items**, each with `label` (string, editable) + `href` (string — see note) + optional `children` (nested list of {label, href}).
- Refactor `Header.astro` and `Footer.astro` to read nav from the collection instead of importing `nav` from `site.ts`. Keep `site.ts`'s `nav` as the fallback during the slice, then remove once proven.
- **Href safety:** expose `href` as an **editable but hinted** field ("Use a path like `/about/team` or a full `https://` link"). The labels are the safe, high-frequency edit; hrefs change rarely. (If Joe wants hrefs locked down further, a future enhancement is a dropdown of known page slugs — note it, don't build it yet.)
- **Why first:** smallest blast radius, instantly demonstrates "I can rename a menu item", and both Header and Footer consume it so it proves the rebuild reaches global chrome.

**A2 — Extend global `site-settings` + the Footer text:**
- Add to `site-settings`: `name`, `tagline`, `family` (family-of-churches line), `charityNo`, social URLs, `giveUrl`, office address, foodbank contact, and the **footer's editable strings** (column headings "Explore"/"About"/"Community"/"Visit us", the "We meet at … every Sunday at …" line as a token template per §3, the two footer-bottom lines).
- Update `config.ts` schema + `config.yml` fields (grouped, hinted). Reconcile the **dual source of truth** the tracer flagged: pages currently read service facts from `site.ts` *and* `site-settings` duplicates them — make `site-settings` the single source and have `Footer.astro` (and later pages) read it. `site.ts` keeps only the `link()` helper and any non-content config.

**A3 — Homepage into a `pages/home.json` entry:**
- Create `home.json` with the typed sections (hero, welcome, planSunday, sermons, findYourPlace, give — the tile *labels/captions* are editable copy; the tile destinations stay fixed IA).
- Refactor `index.astro` to read from `getEntry('pages','home')` with the `t()` fallback; keep all current copy as the fallback literals.
- Wire the interpolation tokens (§3) for the two fact-bearing sentences.

**Eval checkpoint A:** a non-dev can, via the CMS only — (1) rename a nav item and add/remove a dropdown child; (2) change the church tagline and see it update in the footer and meta; (3) edit the homepage hero title, the Welcome heading + paragraphs, a Plan-Your-Sunday card, and the Give banner copy. Build is reproducible; **zero visual regression** vs current homepage (visual diff); a blank field falls back, doesn't crash; auth doesn't leak write beyond this repo.

> **Stop here and show Joe.** This is the model-validation gate. If the CMS UX or the field grouping feels wrong to Joe, we adjust the *pattern* now — before paying to migrate 17 more pages against it.

### Phase B — The "I'm New" + "Sundays" journey pages
The two highest-traffic visitor pages, and they exercise the **remaining list patterns** (timeline steps, FAQ accordion, practical-info cards) not covered in Phase A.
- `pages/im-new.json` (hero, timeline steps[], FAQ items[], finding-us copy + access/parking/wear list, CTA) and `pages/sundays.json` (PageHero copy, rhythm prose [markdown — has `<strong>`], practical bits[], kids&youth cards, map copy).
- Refactor both pages to read from their entries; migrate the `steps`, `faqs`, `practical` arrays into structured CMS lists.
**Eval checkpoint B:** admin can edit a timeline step and an FAQ; lists round-trip; layout intact; markdown emphasis renders correctly and can't inject raw HTML.

### Phase C — The About cluster (5 pages)
`about` (landing), `vision-values`, `what-we-believe` (the 11 beliefs list + Apostles' Creed prose), `team` (elders[] + trustees[] people grids), `family-of-churches`, `policies`.
- One entry per page; the beliefs and the two people-grids become structured lists (the `person` shape from §2.2).
- **Note:** the Apostles' Creed is fixed liturgical text — still make it editable (it's visible text) but flag in the guide that it's a creed, edit with care.
**Eval checkpoint C (per 2–3 page batch):** copy matches pre-migration byte-for-byte at first commit; each section editable; people grids add/remove cleanly.

### Phase D — The Community cluster (5 pages) + remaining pages
`community` (landing), `foodbank`, `children`, `youth`, `satellites`, plus `sermons` (page intro copy — the sermon *items* are a separate future collection, out of scope here), `give`, `contact`, and the `events` page's intro/heading copy.
- Same per-page entry pattern. `contact` includes form *labels* (editable strings) but the form's wiring stays in code.
**Eval checkpoint D (per batch):** as Phase C.

### Phase E — Polish, guide, handover
- Update the **screenshot-led admin guide** with every new editable surface ("change a menu item", "edit the homepage hero", "reword the welcome", "update a belief").
- Decide whether to **trim the fallback literals** now that entries are proven (recommend: keep them — they're a cheap insurance policy and cost nothing at runtime).
- Optional: a Sveltia **editorial-workflow / preview** pass so the admin can preview before publish (Sveltia supports a preview pane — currently disabled because it showed raw JSON; with proper page entries a real preview becomes worthwhile — evaluate then).
**Eval checkpoint E:** a non-technical person, using only the guide, renames a nav item, edits a heading, and rewrites a paragraph unaided; revert-commit rollback demonstrated.

### Phasing rationale (the trade-off)
- **Why nav first, inside Phase A:** it's the smallest, most contained change, directly answers Joe's "including nav", and touches global chrome (Header + Footer) so it proves the rebuild propagates. Highest value-to-risk ratio on the board.
- **Why homepage in the proof phase, not later:** it's the most-seen page and exercises the widest set of field patterns in one go — validating the model where it matters most and where mistakes are most visible.
- **Why one page per slice after that:** prose-in-layout is fiddly; an over-eager refactor can nudge the design. Per-page slices with a visual diff catch drift immediately and keep each eval small and gradeable. **Never big-bang.**
- **Why clusters (About, Community) as batches:** they share section shapes, so once the pattern is proven on the first of a cluster the rest are near-mechanical — batching keeps momentum without inflating any single eval.

---

## 6. What this delivers vs the bar

| Joe's requirement | Delivered? |
|---|---|
| Change text including **headings** | ✅ every heading is a typed field |
| Change **nav** (labels + structure) | ✅ Phase A1 — labels, items, dropdown children, all editable |
| Hero eyebrow/title/subtitle | ✅ every page |
| Section headings, body paragraphs, card text | ✅ typed per section |
| CTA / **button labels** | ✅ labels editable (destinations stay fixed IA for safety; external URLs exposed as explicit fields) |
| The **footer** | ✅ Phase A2 — headings, the visit line, bottom lines |
| Non-dev usable, no 500-field monster | ✅ per-page grouping + collapsed section field-sets + hints |
| Bold bespoke design intact | ✅ structured fields into existing slots; no layout/page-building; icons & SVG stay in code |

**What it deliberately does NOT do** (state plainly to Joe): no editing of which *icon* a card uses, no moving/adding/removing sections or changing layouts, no editing button *destinations* freely (label-only, by design, to prevent broken links), no new page types. That is the correct ceiling for a git-CMS + bespoke-design site — it's the line agreed in `CMS_MIGRATION_PLAN.md`. If Joe wants section reordering/show-hide on the homepage, that's the "homepage as composable blocks" idea from Decision 2 of the migration plan — a bolt-on we can add to Phase A, noted but not assumed.

---

## DECISIONS FOR JOE

1. **Interpolation policy (the real fork — §3).** For the ~4–5 sentences that bake a service fact into prose: (a) **[Recommended]** facts stay global/single-sourced, prose is editable with `{venue}/{time}` tokens the admin keeps or removes; or (b) those few sentences become fully literal free-text (admin can reword freely, but the service time can drift across sentences). Pick (a) or (b). *(Everything else is unaffected — facts are global either way.)*

2. **Nav `href` editing.** Labels are editable in all cases. For destinations: (a) **[Recommended for now]** `href` editable with a hint ("use `/about/team` or a full URL"); or (b) lock hrefs (label-only) and treat structure changes as a dev task; or (c) future: a dropdown of known page slugs (more build). Pick the ceiling.

3. **Homepage composable blocks?** Add reorder/show-hide of homepage *sections* to Phase A (more power, slightly more build), or keep sections fixed and only the copy editable? (The migration plan recommended **yes**; this plan defaults to **copy-only** unless you want it.)

4. **Markdown vs plain text for paragraphs.** Default: plain textareas everywhere, markdown only for the ~3 paragraphs needing bold. Confirm you're happy giving volunteers a constrained bold/italic/link rich-text on those few, and nowhere a raw-HTML box.

5. **Fallback literals — keep or trim?** Keep the original hardcoded copy as build-safe fallbacks after migration (recommended — free insurance), or trim them once entries are proven (cleaner, slightly more fragile)?

6. **Phase A scope sign-off.** Confirm the proof phase = **Nav + Global/Footer + Homepage**, stop, and review with you before migrating the other 17 pages. (This is the model-validation gate.)

7. **Confirm scope:** this is a **personal project** (church demo), not TeamUpdraft — confirm so process/standards are right.
