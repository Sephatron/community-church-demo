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
// Site-settings collection (single-file — used to expose editable theme tokens,
// key facts, footer text, global brand strings, socials, and contact details
// to the CMS without opening the whole codebase to non-devs).
// ---------------------------------------------------------------------------

const siteSettings = defineCollection({
  type: 'data',
  schema: z.object({
    // Service facts
    serviceTime: z.string().default('10:30am'),
    serviceDay: z.string().default('Sundays'),
    serviceVenue: z.string().default('The Beehive'),
    serviceArea: z.string().default('Honiton'),
    serviceArrive: z.string().default('10:00am'),
    serviceDuration: z.string().default('around 90 minutes'),

    // Contact
    contactEmail: z.string().default('office@thecommunitychurch.co.uk'),
    contactPhone: z.string().default('01404 43800'),
    contactOffice: z.string().default('The King’s Centre, Lees Buildings, High Street, Honiton, EX14 1DH'),
    contactFoodbankEmail: z.string().default('foodbank@thecommunitychurch.co.uk'),
    contactFoodbankPhone: z.string().default('07907 232076'),

    // Brand / identity
    churchName: z.string().default('The Community Church'),
    churchTagline: z.string().default('A community of people in East Devon whose lives have been changed by Jesus.'),
    churchFamily: z.string().default('Part of Commission — a family of churches in the Newfrontiers movement.'),
    charityNo: z.string().default('1162085'),

    // Social URLs
    socialFacebook: z.string().default('https://www.facebook.com/thecommunitychurchhonitonandsidmouth'),
    socialInstagram: z.string().default('https://www.instagram.com/the_community_church_official'),
    socialTwitter: z.string().default('https://twitter.com/tcchoniton'),
    socialSoundCloud: z.string().default('https://soundcloud.com/thecommunitychurchhoniton'),

    // External giving URL (the demo doesn't process payments).
    giveUrl: z.string().default('https://www.thecommunitychurch.co.uk/giving/'),

    // Footer editable strings.
    // The visit-us sentence is hardcoded in Footer.astro with bold spans
    // reconstructed from the service-fact fields above — it does not use a
    // token template so footerVisitLine is not needed.
    footerBottomLine: z.string().default('Concept demo — not the official website.'),

    // Theme tokens — exposed as CSS custom-property overrides at build time.
    // Values must be valid CSS colour strings (hex, hsl, etc.).
    colorClay: z.string().default('#C43C11'),
    colorPaper: z.string().default('#FAF6EF'),
    colorInk: z.string().default('#14100E'),

    // Hero accent text on the homepage (the "Lives changed by ___" span).
    heroAccentText: z.string().default('Jesus'),
  }),
});

// ---------------------------------------------------------------------------
// Navigation collection (single-file — the main menu as editable data).
// Both Header and Footer read from this; the label and href of each item are
// editable in Sveltia. Children arrays enable dropdown submenus.
// ---------------------------------------------------------------------------

const navChild = z.object({
  label: z.string().default(''),
  href: z.string().default('/'),
});

const navItem = z.object({
  label: z.string().default(''),
  href: z.string().default('/'),
  // children is optional — top-level items without dropdowns omit it.
  children: z.array(navChild).optional().default([]),
});

const navigation = defineCollection({
  type: 'data',
  schema: z.object({
    items: z.array(navItem).default([]),
  }),
});

// ---------------------------------------------------------------------------
// Pages collection (per-page content entries — Phase A: homepage only).
// Fields are grouped by section using nested objects so Sveltia CMS renders
// each group as a collapsible block (object widget with collapsed: true).
// Every field has a .default() so a blank CMS field degrades to an empty
// string rather than crashing the build. Pages fall back to hardcoded copy
// strings in their .astro templates, so a missing or blank entry still renders.
// ---------------------------------------------------------------------------

const pages = defineCollection({
  type: 'data',
  schema: z.object({
    // --- Hero section ---
    hero: z.object({
      eyebrow: z.string().default(''),
      // headingBefore and headingAfter are the text on either side of the
      // clay-coloured accent word in the h1 — e.g. "Lives changed by" + "in East Devon."
      headingBefore: z.string().default(''),
      accentWord: z.string().default(''),
      headingAfter: z.string().default(''),
      subtitle: z.string().default(''),
      primaryCtaLabel: z.string().default(''),
      secondaryCtaLabel: z.string().default(''),
    }).default({}),

    // --- Welcome section ---
    welcome: z.object({
      eyebrow: z.string().default(''),
      heading: z.string().default(''),
      body1: z.string().default(''),
      // body2 is the family-of-churches line — separately editable here so
      // the homepage can have different context if needed. Falls back to global.
      body2: z.string().default(''),
      primaryCtaLabel: z.string().default(''),
      secondaryCtaLabel: z.string().default(''),
      badgeNumber: z.string().default(''),
      badgeCaption: z.string().default(''),
    }).default({}),

    // --- Plan Your Sunday section ---
    // Three cards: When, Where, What to expect.
    // Card body text may contain {day}, {time}, {arrive}, {venue}, {area} tokens.
    planSunday: z.object({
      eyebrow: z.string().default(''),
      heading: z.string().default(''),
      card1Title: z.string().default(''),
      card1Body: z.string().default(''),
      card2Title: z.string().default(''),
      card2Body: z.string().default(''),
      card3Title: z.string().default(''),
      card3Body: z.string().default(''),
    }).default({}),

    // --- Sermons / SoundCloud section ---
    sermons: z.object({
      eyebrow: z.string().default(''),
      heading: z.string().default(''),
      body: z.string().default(''),
      ctaLabel: z.string().default(''),
    }).default({}),

    // --- Find Your Place section ---
    // Four image tiles — titles and blurbs only (images and hrefs stay in code).
    findYourPlace: z.object({
      eyebrow: z.string().default(''),
      heading: z.string().default(''),
      tile1Title: z.string().default(''),
      tile1Blurb: z.string().default(''),
      tile2Title: z.string().default(''),
      tile2Blurb: z.string().default(''),
      tile3Title: z.string().default(''),
      tile3Blurb: z.string().default(''),
      tile4Title: z.string().default(''),
      tile4Blurb: z.string().default(''),
    }).default({}),

    // --- Give / CTA band ---
    give: z.object({
      heading: z.string().default(''),
      body: z.string().default(''),
      ctaLabel: z.string().default(''),
    }).default({}),
  }),
});

export const collections = {
  events,
  'site-settings': siteSettings,
  navigation,
  pages,
};
