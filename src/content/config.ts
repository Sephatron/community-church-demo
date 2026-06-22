import { defineCollection, z } from 'astro:content';

// ---------------------------------------------------------------------------
// Events collection
// Mirrors ChurchEvent from src/data/events.ts. JSON files are used rather than
// Markdown+frontmatter because events have no long-form prose body — they're
// purely structured data and JSON is what Sveltia CMS edits most cleanly for
// this shape (no accidental YAML quoting issues with apostrophes in titles etc).
// ---------------------------------------------------------------------------

const events = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    category: z.enum([
      'Whole church',
      'Youth',
      'Children & Families',
      'Foodbank',
      'Community',
    ]),
    // ISO date string for one-off events; null / absent for recurring rhythms.
    date: z.string().nullable().optional().default(null),
    // Human-readable time string shown to visitors (e.g. "Every Sunday · 10:30am").
    when: z.string(),
    location: z.string(),
    description: z.string(),
    // True for standing weekly/regular rhythms so they sort to the top of the
    // listing and render the "Weekly" badge.
    recurring: z.boolean().optional().default(false),
  }),
});

// ---------------------------------------------------------------------------
// Site-settings collection (single-file — used to expose editable theme tokens
// and key facts to the CMS without opening the whole codebase to non-devs).
// ---------------------------------------------------------------------------

const siteSettings = defineCollection({
  type: 'data',
  schema: z.object({
    // Service facts
    serviceTime: z.string(),
    serviceDay: z.string(),
    serviceVenue: z.string(),
    serviceArea: z.string(),
    serviceArrive: z.string(),

    // Contact
    contactEmail: z.string().email(),
    contactPhone: z.string(),

    // Theme tokens — exposed as CSS custom-property overrides at build time.
    // Values must be valid CSS colour strings (hex, hsl, etc.).
    colorClay: z.string(),
    colorPaper: z.string(),
    colorInk: z.string(),

    // Hero accent text on the homepage (the "Lives changed by ___" span).
    heroAccentText: z.string(),
  }),
});

export const collections = {
  events,
  'site-settings': siteSettings,
};
