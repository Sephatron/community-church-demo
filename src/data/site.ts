// Central content store — scraped from the live site (thecommunitychurch.co.uk) on 2026-06-19.
// Editing values here updates the whole demo. This is the single source of truth for church facts.

const RAW_BASE = import.meta.env.BASE_URL; // e.g. "/community-church-demo/"

/** Prefix an internal path with the GitHub Pages base so links resolve under the project sub-path. */
export function link(path: string = '/'): string {
  const base = RAW_BASE.replace(/\/$/, '');
  if (!path || path === '/') return base + '/';
  return base + '/' + path.replace(/^\//, '');
}

export const site = {
  name: 'The Community Church',
  location: 'Honiton, East Devon',
  tagline: 'A community of people in East Devon whose lives have been changed by Jesus.',
  family: 'Part of Commission — a family of churches in the Newfrontiers movement.',
  charityNo: '1162085',
  service: {
    day: 'Sundays',
    time: '10:30am',
    arrive: '10:00am',
    venue: 'The Beehive',
    area: 'Honiton',
    duration: 'around 90 minutes',
  },
  // Real outbound link to the existing giving page (the demo doesn't process payments).
  giveUrl: 'https://www.thecommunitychurch.co.uk/giving/',
  socials: {
    facebook: 'https://www.facebook.com/thecommunitychurchhonitonandsidmouth',
    instagram: 'https://www.instagram.com/the_community_church_official',
    twitter: 'https://twitter.com/tcchoniton',
    soundcloud: 'https://soundcloud.com/thecommunitychurchhoniton',
  },
  contact: {
    email: 'office@thecommunitychurch.co.uk',
    phone: '01404 43800',
    office: 'The King’s Centre, Lees Buildings, High Street, Honiton, EX14 1DH',
    foodbankEmail: 'foodbank@thecommunitychurch.co.uk',
    foodbankPhone: '07907 232076',
  },
  // Used by the embedded Google Map (no API key needed for the basic embed).
  mapQuery: 'The Beehive Honiton EX14',
};

export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

// The restructured, journey-led information architecture (the heart of the overhaul).
export const nav: NavItem[] = [
  { label: "I'm New", href: '/im-new' },
  { label: 'Sundays', href: '/sundays' },
  {
    label: 'About',
    href: '/about',
    children: [
      { label: 'Our Vision & Values', href: '/about/vision-values' },
      { label: 'What We Believe', href: '/about/what-we-believe' },
      { label: 'Meet the Team', href: '/about/team' },
      { label: 'Our Family of Churches', href: '/about/family-of-churches' },
      { label: 'Policies & Safeguarding', href: '/about/policies' },
    ],
  },
  {
    label: 'Community',
    href: '/community',
    children: [
      { label: 'Honiton Foodbank', href: '/community/foodbank' },
      { label: "Children's Ministry", href: '/community/children' },
      { label: 'Youth Ministry', href: '/community/youth' },
      { label: 'Satellites', href: '/community/satellites' },
    ],
  },
  { label: 'Sermons', href: '/sermons' },
  { label: "What's On", href: '/events' },
];
