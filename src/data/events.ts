// Events library data. "Play On" is the real upcoming event from the live site. The
// recurring rhythm (Sundays, Foodbank, Friday Youth) is real; the seasonal one-offs are
// representative so the category filter has range in the demo.

export interface ChurchEvent {
  title: string;
  category: 'Whole church' | 'Youth' | 'Children & Families' | 'Foodbank' | 'Community';
  date: string | null; // ISO date for one-offs; null for recurring
  when: string; // human-readable
  location: string;
  description: string;
  recurring?: boolean;
}

export const eventCategories = ['Whole church', 'Youth', 'Children & Families', 'Foodbank', 'Community'] as const;

export const events: ChurchEvent[] = [
  {
    title: 'Sunday Gathering',
    category: 'Whole church',
    date: null,
    when: 'Every Sunday · 10:30am',
    location: 'The Beehive, Honiton',
    description: 'Contemporary worship, down-to-earth Bible teaching, and groups for all ages. Coffee from 10:00am.',
    recurring: true,
  },
  {
    title: 'Honiton Foodbank',
    category: 'Foodbank',
    date: null,
    when: 'Tuesdays & Fridays · 12:30–3:00pm',
    location: 'The King’s Centre, Honiton',
    description: 'Our foodbank is open to anyone in Honiton and the surrounding villages who needs a hand. No appointment needed.',
    recurring: true,
  },
  {
    title: 'Friday Youth',
    category: 'Youth',
    date: null,
    when: 'Fridays in term time · 7:00pm',
    location: 'Meadow View, Honiton',
    description: 'Games, food and honest conversation about faith and life for school years 7–11.',
    recurring: true,
  },
  {
    title: 'Women’s Breakfast',
    category: 'Community',
    date: '2026-07-05',
    when: 'Saturday 5 July · 9:00am',
    location: 'The King’s Centre, Honiton',
    description: 'A relaxed breakfast, good company and an encouraging chat. Bring a friend — all women welcome.',
  },
  {
    title: 'Play On — Live Music Night',
    category: 'Community',
    date: '2026-07-11',
    when: 'Friday 11 July · 7:00–9:30pm',
    location: 'Boston Tea Party, Honiton',
    description: 'An evening of live music, great coffee and good company. Everyone’s welcome — bring a friend.',
  },
  {
    title: 'Activ8 Summer Special',
    category: 'Children & Families',
    date: '2026-07-20',
    when: 'Sunday 20 July · 10:30am',
    location: 'The Beehive, Honiton',
    description: 'An all-out summer celebration for our 5–11s — games, stories and plenty of mess.',
  },
  {
    title: 'Satellites Youth Festival',
    category: 'Youth',
    date: '2026-08-22',
    when: '22–25 August',
    location: 'Bath & West Showground',
    description: 'Our annual youth trip to the Satellites Christian festival — teaching, worship and a brilliant weekend away.',
  },
  {
    title: 'Summer Sundays',
    category: 'Whole church',
    date: '2026-08-02',
    when: 'Sundays in August · 10:30am',
    location: 'The Beehive, Honiton',
    description: 'A relaxed, all-age summer season of Sundays — shorter, warmer and full of testimony.',
  },
  {
    title: 'Alpha Course',
    category: 'Community',
    date: '2026-09-17',
    when: 'Wednesdays from 17 September · 7:00pm',
    location: 'The King’s Centre, Honiton',
    description: 'An open, no-pressure space to explore the big questions of life and faith over food. Everyone welcome.',
  },
];
