# CMS Migration Plan — The Community Church demo

**Status:** Proposed — awaiting Joe's decision on the forks at the end of this doc. PLAN ONLY; nothing is built until alignment.
**Author:** Solution Architect (planning agent)
**Date:** 2026-06-22
**Goal:** Let Joe — or another **non-technical** church admin — edit **content** and **some design** of the site self-service, without a developer making changes and deploying. Bias: free/near-free, low-maintenance, not fragile.

---

## 0. What the codebase and live site actually are (verified, not assumed)

I read the repo and probed the live WordPress REST API. The findings change the obvious answer, so they lead.

**The Astro app** (`/Users/joe/Desktop/AGENTIC STUFF/community-church-demo`):
- Astro 4.16 + Tailwind 3.4, fully static (`@astrojs/tailwind`, no SSR adapter). `astro.config.mjs` pins `site`/`base` to the GitHub Pages sub-path `/community-church-demo`.
- **Two distinct content patterns, and the split is the whole story:**
  1. **Clean structured data** — `src/data/sermons.ts` (12 sermons: title, series, speaker, date, scripture) and `src/data/events.ts` (9 events: title, category, date, when, location, description, recurring). `sermons.astro` and `events.astro` are *pure renderers* over these arrays, including the client-side filter UI. **These two are trivially CMS-able.**
  2. **Prose hardcoded inside page markup** — `index.astro`, `im-new.astro`, `about/*.astro`, `community/*.astro` etc. carry their copy *inline in JSX* (hero headline, welcome paragraphs, "Plan your Sunday" cards, FAQ arrays, the 11 belief statements, the Apostles' Creed). The homepage even **hand-duplicates** the next event ("Play On") as literal markup rather than reading `events.ts`. **These are real migration work**, because the text is woven through layout.
- `src/data/site.ts` is a single well-structured config object (service times, contact, socials, nav IA). High-value, low-effort to expose.
- Design is **tightly tokenised**: `global.css` defines 3 CSS vars (`--paper`, `--ink`, `--clay`); `tailwind.config.mjs` defines the full palette (clay/teal/sand), the two fluid type scales (`hero`, `display`), and fonts (Archivo/Inter). This bounded token set is the *only* part of "design" a non-dev can realistically be handed (see §2).
- 9 images in `src/assets/img`, imported through Astro's `astro:assets` pipeline (hashed, optimised at build). Swapping images therefore needs a build step or a different image strategy — you can't just drop a file on a server.

**Deploy / git (verified):**
- Repo `github.com/Sephatron/community-church-demo`, single branch `main`. No `.github/` workflows. `dist/` is force-pushed to `gh-pages` **manually**.
- `gh auth` token scopes are **`gist, read:org, repo`** — **no `workflow` scope**. This is the actual blocker: the token literally cannot create/modify GitHub Actions workflows, so CI auto-publish on GitHub Pages is impossible *with current credentials*. Pushes from Joe's Mac need `git push --no-thin` (Apple Git pack-upload bug).

**The live church WordPress (verified against `https://www.thecommunitychurch.co.uk/wp-json/`):**
- REST API is **open for reads**, `wp/v2` present. **But the data model is fragmented and heavier than the brief implies:**
  - `wp/v2/posts` returns **`[]` — empty.** The church doesn't blog. There is **no source of post-style content** to pull.
  - **No sermon/talk/series post type exists at all.** Sermons on the live site are SoundCloud, not structured WP data. Our demo's sermon model has **no upstream** — it would have to be authored fresh wherever it lives.
  - **Events live in The Events Calendar plugin** (`tribe_events`, routes under `/tribe/events/v1/`), *not* a clean `wp/v2` custom post type. Venues and organisers are separate linked entities. Editing means the admin works inside The Events Calendar's UI, and our frontend consumes a third-party plugin schema with its own quirks and pagination.
  - The install also carries WooCommerce, MailPoet, Yoast, CookieYes, Burst, WP Google Maps, Contact Form 7. It is a **real, heavy, production WP** — "reuse what the church already has" means inheriting and depending on all of that, plus its uptime and its admins.

**Net consequence:** the seductive "headless WordPress, the content's already there" story is **mostly false for the two things our demo structures well**. Events exist (in plugin shape); sermons don't; posts are empty. That reframes the decision — see §1.

---

## 1. Options analysis

Three realistic approaches. For each: editing UX, *honest* design-editing ceiling, accounts/auth, hosting + publish pipeline, cost, migration effort, fragility.

### Option A — Headless WordPress (live church WP as backend) + Astro frontend

**Content-editing UX:** Admin edits in the WordPress dashboard they (maybe) already know. Astro fetches via REST at build time. Events through The Events Calendar UI; pages through Gutenberg.

**Design-editing ceiling — LOW for *our* frontend.** This is the trap. The church's WP theme controls the *WordPress* site's look, **not our Astro design**. Editing a page in Gutenberg gives them WP's block styles, which our Astro renderer would have to re-map or ignore. They get content control; they get **zero** control over the Astro design unless we also expose tokens separately (§2). Gutenberg's "design" power applies to the WP-rendered site, which we're not shipping.

**Accounts/auth:** WP admin accounts on the church's production site (the church/its current webmaster controls these — likely DA-adjacent or a third party, *not* Joe). For reads, none. For *writes from our side*, none needed (we only read). But we'd be coupling our build to **someone else's production CMS** that Joe doesn't administer.

**Hosting + publish pipeline:** Astro builds consuming live REST → static output → host (Pages/Netlify/CF). Publishing on content change needs a **webhook from WP → build**, which means a WP plugin or admin action, on a site Joe doesn't own.

**Cost:** £0 extra (WP already exists). But *operational* cost is high: two systems, cross-team dependency.

**Migration effort:** **High and awkward.** Sermons have no source → must be created as a new WP custom post type (plugin or code) on production. Events schema is plugin-specific → adapter code. Page prose → re-modelled into WP pages/ACF fields. We'd be *adding structure to someone else's production WP* to feed our demo. That's a big, politically-entangled change.

**Fragility:** **Highest.** Our site breaks if: the church changes a plugin, the REST shape shifts, The Events Calendar updates, the site goes down, or a webmaster locks the API. Joe is not the admin of the failure surface. Strong ✗ against "not fragile."

**Verdict:** Reuses a tool the church knows and content that *partly* exists — but couples our deliverable to a heavy third-party production system Joe doesn't control, gives **no** design editing for our frontend, and still requires building sermon structure from scratch. **Reject** for this goal.

---

### Option B — Git-based CMS (Decap / Sveltia / Pages CMS) editing markdown/JSON in-repo

The CMS is an admin UI that reads/writes content files **in this repo** and commits via Git. Astro reads those files (Astro **Content Collections** are built for exactly this). Candidates: **Decap CMS** (formerly Netlify CMS — mature, widely used, but maintenance has slowed), **Sveltia CMS** (modern Decap-compatible rewrite, actively maintained, better UX, drop-in config), **Pages CMS** (clean, GitHub-native, nice media handling).

**Content-editing UX:** Admin logs into a hosted admin page (e.g. `/admin`), sees friendly forms defined by us (a "Sermon" form, an "Event" form, a "Homepage" form), edits, hits publish → a Git commit → triggers a rebuild. For structured types (sermons, events) this is **excellent and exactly the shape our data already has**. For page prose, we expose a markdown/rich-text field per section.

**Design-editing ceiling — MODERATE, and the most honest fit for the ask.** We can surface a **"Theme" / "Site settings" collection** with: the 3–6 palette colours, the service times/contact (site.ts), nav labels, hero image, and **section on/off toggles + section ordering** for the homepage (treat the homepage as an ordered list of typed "blocks"). That delivers *real, safe* design control — recolour the site, swap hero imagery, reorder/hide homepage sections, edit every section's copy — **without** letting a non-dev break the layout. It is **not** free-form drag-and-drop visual page-building (see §2 for why that's a different class of tool). For a church admin, theme tokens + block toggles is the right ceiling: powerful enough to feel ownership, safe enough not to call a developer.

**Accounts/auth:** A **GitHub account** with write access to the repo (Joe's `Sephatron`, or a dedicated low-privilege collaborator). Auth needs an **OAuth path** so the admin isn't pasting tokens:
- On **Netlify/Cloudflare Pages**, an OAuth proxy is a few lines of config/function.
- **Sveltia** supports GitHub OAuth via a tiny serverless function (or a shared community one for testing).
- Optionally a **GitHub fine-grained PAT** scoped to this one repo for the OAuth app.

**Hosting + publish pipeline:** Host on **Netlify or Cloudflare Pages**. Editor saves → commit to `main` → host auto-builds Astro → live in ~1–2 min. **Preview deploys** come free per PR/branch. This *replaces* the manual `gh-pages` force-push and **sidesteps the `workflow`-scope blocker entirely** (Netlify/CF build on push without needing GitHub Actions).

**Cost:** **£0** on Netlify or Cloudflare Pages free tier (a brochure church site is nowhere near limits). CMS software is open-source/free. Domain only if they move off `github.io`.

**Migration effort:** **Low-to-moderate, and front-loaded on the easy bits.** Sermons/events → move arrays into Content Collections (JSON/markdown), point CMS at them: **fast**. Page prose → progressively lift inline copy into per-section markdown fields: **steady, page-by-page, no big bang**. This is the only option where the *tracer bullet is genuinely small* because the data's already structured.

**Fragility:** **Lowest.** Content is plain files in Git — fully versioned, diffable, revertible, no external CMS to go down, no API to rate-limit. If the CMS UI ever broke, the site still builds and a dev can still edit files. Self-contained. Strong ✓ on "not fragile / low-maintenance."

**Verdict:** Best fit on cost, fragility, and the actual shape of our content. Honest about the design ceiling and still delivers meaningful design control. **This is the recommendation.**

---

### Option C — Hosted headless CMS (Storyblok — visual; or Sanity — structured)

A third-party SaaS CMS holds content; Astro fetches via API/SDK.

**Storyblok** specifically markets a **Visual Editor**: the admin sees the *actual rendered page* and clicks components to edit them inline — the closest thing to "edit the design" a non-dev realistically gets. **Sanity** is developer-favourite structured content with a customisable Studio, but its editing is form/structure-based, not visual — so for *this* ask (design editing) Sanity is no better than Option B and adds a SaaS dependency, so I treat Storyblok as the representative here.

**Content-editing UX:** **Best-in-class** with Storyblok's visual editor — live preview, click-to-edit, drag to reorder components. Genuinely impressive for a non-technical admin.

**Design-editing ceiling — HIGHEST of the three, but with caveats.** Storyblok gives real visual page-building: reorder/add/remove components, edit inside a live preview, manage a component library *we define*. **Caveat:** the admin can only place/recolour the components **we build and register**. It is not Webflow — they can't invent new layouts from nothing. So it's "rich visual composition within a developer-defined kit," which for a church is arguably *more* power than they need (and more rope). Requires us to refactor every section into a registered Storyblok "bloks" component — substantial engineering.

**Accounts/auth:** A **Storyblok account** (org + space). **Preview token** (draft content) and **public token** (published) for the Astro build. Webhook secret for publish triggers. This is a **new third-party account the church must own long-term** — and someone must keep paying/administering it.

**Hosting + publish pipeline:** Astro fetches from Storyblok; publish in Storyblok fires a **webhook → Netlify/CF rebuild**. Preview deploys + Storyblok's own live preview. Solid, but two moving systems again.

**Cost:** Storyblok **free Community tier exists** (1 user/limited seats, sufficient for one admin), but the genuinely useful collaboration/roles sit on **paid tiers** (historically ~US$100+/mo). Risk: today's free tier becomes tomorrow's paywall. For a charity, recurring SaaS cost is a real concern. Sanity similarly has a free tier that's fine now but is a standing dependency.

**Migration effort:** **Highest.** Every section becomes a registered component with a schema in Storyblok; sermons/events become content types there; all copy is re-entered or migrated via their API. This is a **rebuild of the content layer against a proprietary system**.

**Fragility:** **Medium.** SaaS uptime is good, but it's an external dependency with vendor lock-in (content lives in their cloud in their format; leaving means an export/migration project). Free-tier terms can change. Not "self-contained."

**Verdict:** The only option that truly delivers "edit the design visually." But it's the heaviest to build, introduces a **standing third-party account + likely future cost** onto a charity, and offers power beyond what a church admin needs. **Hold as the fallback** *if and only if* Joe decides true visual page-building is a hard requirement (see Decision 1).

---

### Scorecard

| Dimension | A: Headless WP | B: Git-CMS (Sveltia) | C: Storyblok |
|---|---|---|---|
| Content editing UX | OK (WP/Tribe) | **Good** (custom forms) | **Best** (visual) |
| Design editing (non-dev, *our* frontend) | **None** | Moderate (tokens + block toggles) | **High** (visual, within our kit) |
| New accounts to own | WP (not Joe's) | GitHub (Joe has) | **Storyblok (new, recurring)** |
| Hosting/auto-publish | webhook on others' WP | **push→build (Netlify/CF)** | webhook→build |
| Cost | £0 (but coupled) | **£0** | Free tier now, **paywall risk** |
| Migration effort | High/awkward | **Low–moderate** | High |
| Fragility / maintenance | **Highest** | **Lowest** | Medium |
| Joe controls the failure surface? | No | **Yes** | Partly |

---

## 2. Recommendation

**Adopt Option B — a Git-based CMS (Sveltia CMS) editing Astro Content Collections in this repo, hosted on Cloudflare Pages (or Netlify) with push-to-build.**

**Rationale:**
- It matches **the actual shape of our content**: sermons and events are already clean structured arrays — they become Content Collections almost verbatim, so the proving loop is small and fast.
- It is the only option that is **genuinely free and genuinely low-maintenance** for a charity. Content is plain versioned files; there is no third-party CMS to go down, rate-limit, or start charging.
- **Joe owns the entire failure surface** (his GitHub, his host) — no dependency on the church's production WordPress or its webmaster, and no new SaaS account anyone has to babysit and fund.
- It **dissolves the `workflow`-scope blocker** by moving off manual `gh-pages` pushes to a host that builds on push.
- Sveltia over Decap: same config format, actively maintained, materially nicer editor UX, better media handling — Decap's slowed maintenance is a real risk for a "set and forget" church site.

**Addressing the "edit the DESIGN as well as content" ask head-on — be honest:**

What a non-dev **realistically gets** with this path:
1. **All content** — every sermon, event, and the prose of every page, via friendly forms/rich-text. ✓ Full.
2. **Theme tokens** — a "Site Theme" form exposing the palette colours (clay/teal/sand/ink/paper), service times, contact details, nav labels, and the hero image. Recolour and re-fact the whole site safely. ✓ Real design control.
3. **Homepage composition** — model the homepage as an **ordered list of typed blocks** (Hero, Welcome, PlanYourSunday, Sermons, Tiles, NextEvent, Give). The CMS lets the admin **reorder, show/hide, and edit the copy/image of each block**. ✓ Meaningful structural control without breaking layout.

What this path **does not** give, stated plainly:
- **No free-form visual page-building** — no dragging arbitrary boxes, no inventing new layouts, no pixel nudging, no live click-on-the-page editing. The admin composes from a **fixed kit of well-designed blocks**; they cannot create new block *types* or restyle a block's internal layout.

**If true visual/freeform design editing is a hard requirement, this is the wrong class of tool and you must move to Option C (Storyblok) or, frankly, a WordPress-with-a-block-theme / Webflow product** — accepting the recurring cost, the heavier build, and the external dependency that comes with it. My strong recommendation: **for a church admin, theme tokens + block reordering is the correct ceiling.** It delivers the *feeling and substance* of design ownership (recolour, reorder, swap imagery, rewrite everything) while keeping the polished, accessible design intact and the system free and unbreakable. Going further trades the site's craft and zero-cost durability for power the admin will rarely use and can easily misuse. I'd push back hard before paying a SaaS bill to let a volunteer drag a hero out of alignment.

---

## 3. Hosting / deploy recommendation

**Move off bare GitHub Pages to Cloudflare Pages (first choice) or Netlify (equivalent, also fine).**

| | GitHub Pages (today) | GitHub Pages + Actions | **Cloudflare Pages / Netlify** |
|---|---|---|---|
| Auto-publish on content change | ✗ manual force-push | ✓ but **needs `workflow` scope we don't have** | **✓ builds on push, no Actions needed** |
| Preview deploys for review | ✗ | clunky | **✓ per-branch/PR URL** |
| CMS OAuth backend (for Sveltia/Decap) | ✗ (static only) | extra setup | **✓ serverless function in-platform** |
| Cost | £0 | £0 | **£0** (free tier ample) |
| Custom domain + HTTPS | ✓ | ✓ | ✓ |

**Why not "just fix GitHub Pages CI":** it requires re-authing `gh` (or a new token/app) with **`workflow`** scope to commit a `.github/workflows/*.yml`, *and* GitHub Pages still can't host the CMS's OAuth callback (static only) — you'd bolt on a separate function host anyway. Cloudflare/Netlify solve **publish + previews + CMS-OAuth in one place, for free.** Recommend **Cloudflare Pages** (generous free tier, fast global edge, Joe-friendly). Netlify is a perfectly good substitute and has the most battle-tested Decap/Sveltia OAuth story — pick by preference.

> Keep the GitHub Pages deploy working as-is until the new pipeline is proven, then cut over. Rollback = repoint DNS / re-enable Pages.

---

## 4. Auth / API / keys Joe must provide (so the orchestrator pings him ONCE)

For the **recommended path (Option B, Sveltia on Cloudflare Pages)**:

1. **GitHub** — confirm `Sephatron` will own the content repo, and decide whether a **separate low-privilege collaborator account** should exist for the church admin (recommended, so the admin can't touch other repos). Either way the dev agent needs nothing secret here beyond repo write (already present).
2. **GitHub OAuth App** (for the CMS login) — someone with access to `Sephatron`'s GitHub settings creates an OAuth App: **Client ID + Client Secret**, callback URL set to the chosen host. *This is the one credential the orchestrator must collect from Joe.* (Fine-grained PAT scoped to just this repo is an alternative for testing.)
3. **Cloudflare account** (or **Netlify account**) — Joe to create/confirm, and connect it to the GitHub repo (one-time OAuth in their dashboard). The dev agent can scaffold config, but **account creation/linking is Joe's click.**
4. **Custom domain (optional)** — if they want to drop `github.io`/`pages.dev`, Joe provides domain + DNS access. Not required to prove the loop.
5. **No church WordPress credentials needed** — the recommendation deliberately avoids the church's production WP. (If Joe instead picks Option A, we'd need WP admin access *on the church's production site*, which Joe likely does **not** control — a reason that option is worse.)
6. **No Storyblok/Sanity account** unless Joe picks Option C — then: Storyblok org + space, **preview token + public token**, webhook secret.

**MCP note:** Notion, Figma, Google Drive, Gmail, Google Calendar MCPs are connected here. **Notion-as-CMS is technically possible** (edit in Notion → API → build) but I do **not** recommend it: it puts the church's site behind Joe's personal Notion, gives the admin no design control, and re-introduces an external dependency Joe must own — strictly worse than Git-CMS for this goal. Figma MCP is useful for *design reference* during the build, not as a runtime CMS. None of these MCPs are needed for the recommended path.

---

## 5. Phased migration plan (tracer-bullet first)

Each phase is sized for a **Sonnet dev agent** and ends at an **eval checkpoint** (Opus, 6-dim rubric per `harness-design-principles.md`: any dim at 1 = FAIL; PASS = no dim < 3). Honour the workspace **pseudo-code-first + hard-stop-for-ACK** gate on each coding phase. **This is a personal project** — confirm with Joe before treating any standard as TeamUpdraft's.

### Phase 0 — Pipeline + tracer bullet: **Events** end-to-end (prove the whole loop on ONE type)
**Why Events first:** `events.ts` is already clean structured data with a typed interface and a finite enum of categories — the lowest-risk thing to lift into a Content Collection, and `events.astro` is already a pure renderer, so the frontend barely changes. (Sermons is an equally-clean second; Events edges it because the homepage's hand-duplicated "Play On" block gives a visible second consumer to prove the rebuild reaches the home page too.)
**Scope:**
- Stand up **Cloudflare Pages (or Netlify)** building this repo on push; confirm parity with the current GitHub Pages build.
- Convert `src/data/events.ts` → an Astro **Content Collection** (`src/content/events/*.{json,md}` + schema mirroring the existing `ChurchEvent` interface). Update `events.astro` to read the collection. Keep output identical.
- Add **Sveltia CMS** at `/admin` with a GitHub OAuth backend (function on the host), configured with **one collection: Events**.
- Prove the loop: **edit an event in the CMS → commit → host rebuilds → live site updates** (events page *and* the homepage "next event" block, which Phase 0 also wires to read from the collection instead of hardcoded markup).
**Eval checkpoint:** loop works for a non-technical user; build is reproducible; no visual regression vs current site; auth doesn't leak write access beyond this repo.
**Risk/rollback:** if CMS OAuth fights the host, fall back to Netlify (best-documented Sveltia/Decap OAuth). Rollback = keep GitHub Pages live; new host is additive until proven. **Do not delete `gh-pages` until Phase 3.**

### Phase 1 — Add **Sermons** + **Site/Theme settings**
- Convert `src/data/sermons.ts` → Sermons collection; add CMS collection (title, series, speaker, date, scripture, optional audio URL).
- Convert `src/data/site.ts` → a **single "Site Settings" + "Theme" entry**: service times, contact, socials, nav labels, **palette colours**, hero image. Wire `global.css` vars + Tailwind to read the theme values (build-time inject). This is where **design tokens become editable**.
**Eval checkpoint:** admin can recolour the site and edit all facts/contact via forms; sermon filters still work; no regression.

### Phase 2 — Page prose into the CMS (the bulk; do it page-by-page, not big-bang)
- For each content page (`index`, `im-new`, `about/*`, `community/*`, `sundays`, `give`, `contact`), lift inline copy into **per-section fields / markdown** in a "Pages" collection, and refactor the page to render from it. Model the **homepage as ordered, toggleable blocks** (Decision 2).
- Migrate the FAQ array, the 11 beliefs, the Creed, the timeline steps into structured CMS lists.
**Eval checkpoint per page batch:** copy matches pre-migration byte-for-byte at first commit; admin can edit each section; layout intact; reorder/hide works on the homepage.
**Risk:** prose-in-layout is fiddly; an over-eager refactor could shift design. Mitigate by **migrating one page per slice** with a visual-diff check, never all at once.

### Phase 3 — Cutover, docs, handover
- Point the custom domain (if any) at the new host; **decommission the manual `gh-pages` force-push**; update `README`.
- Write a **one-page, screenshot-led admin guide** ("how to add an event", "how to change a colour", "how to reorder the homepage") aimed at a non-technical volunteer.
- Optional: a second low-privilege editor account; basic "you broke the build" email notification from the host.
**Eval checkpoint:** a non-technical person, using only the guide, adds an event and changes a colour unaided; rollback path (revert commit → auto-rebuild) demonstrated.

**Overall rollback story:** because content is Git, **every change is a revertible commit** and the host rebuilds on revert — the safest possible undo. The old GitHub Pages path stays alive until Phase 3, so there is always a known-good fallback.

---

## DECISIONS FOR JOE
1. **Design-editing ceiling — the central fork.** (a) **[Recommended]** Theme tokens + reorder/hide homepage blocks + edit all copy (Git-CMS, free, unbreakable, no visual page-builder); **or** (b) true **visual page-building** (Storyblok/Webflow/WP block theme) — accept recurring SaaS cost, heavier build, external dependency. Pick (a) or (b).
2. **Homepage as composable blocks?** Yes = admin can reorder/show-hide homepage sections (more power, slightly more build in Phase 2). No = homepage stays fixed, copy still editable. (Recommend **yes**.)
3. **Host:** Cloudflare Pages **[recommended]** or Netlify? (Either is free; Netlify has the most battle-tested CMS-OAuth.)
4. **Admin identity:** reuse Joe's `Sephatron` GitHub, or create a **dedicated low-privilege collaborator** for the church admin? (Recommend **dedicated**.)
5. **Custom domain** now, or stay on the free `*.pages.dev`/`github.io` for the proof? (Recommend **stay free until the loop is proven**.)
6. **Confirm scope:** this is treated as a **personal project**, not TeamUpdraft — confirm so standards/process are right.

## AUTH NEEDED (recommended path — collect once)
1. **GitHub OAuth App** under `Sephatron` → **Client ID + Client Secret** (+ callback URL once host is chosen). *The one secret the orchestrator must gather.*
2. **Cloudflare Pages account** (or **Netlify account**) — Joe creates/confirms and **connects it to the `community-church-demo` repo** (one-time dashboard OAuth).
3. **GitHub repo write** — already in hand (token has `repo`); only needed if a separate admin collaborator is created (then: invite that account).
4. **(Optional) Custom domain + DNS access** — only if dropping `*.pages.dev`/`github.io`.
5. **NOT needed:** church WordPress credentials; any Storyblok/Sanity/Notion tokens — unless Joe picks Decision 1(b), in which case: **Storyblok space + preview token + public token + webhook secret.**
