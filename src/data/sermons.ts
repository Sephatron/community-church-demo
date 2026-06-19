// Sermon library data. The six "Walking in the Light" entries are the real, current
// series scraped from the live site (1 John). Earlier entries are representative, so the
// filters have something to work with in the demo. Audio links to the church SoundCloud.

export interface Sermon {
  title: string;
  series: string;
  speaker: string;
  date: string; // ISO
  scripture: string;
}

export const soundcloudProfile = 'https://soundcloud.com/thecommunitychurchhoniton';

export const sermons: Sermon[] = [
  // --- Walking in the Light — 1 John (real) ---
  { title: 'Be what you are', series: 'Walking in the Light', speaker: 'Christian Withers', date: '2026-06-16', scripture: '1 John 1:5–10' },
  { title: 'Living in God’s family', series: 'Walking in the Light', speaker: 'Jamie Masters', date: '2026-06-09', scripture: '1 John 3:1–10' },
  { title: 'Staying on course', series: 'Walking in the Light', speaker: 'Adrian Birks', date: '2026-06-02', scripture: '1 John 2:18–27' },
  { title: 'Realism about the enemy', series: 'Walking in the Light', speaker: 'Dave Norris', date: '2026-05-26', scripture: '1 John 2:15–17' },
  { title: 'Marks of the true Christian', series: 'Walking in the Light', speaker: 'Joe Whittaker', date: '2026-05-05', scripture: '1 John 2:3–11' },
  { title: 'Radical treatment for sin', series: 'Walking in the Light', speaker: 'Adrian Birks', date: '2026-04-28', scripture: '1 John 1:8–2:2' },
  // --- Easter at The Community Church (representative) ---
  { title: 'The risen King', series: 'Easter', speaker: 'Adrian Birks', date: '2026-04-05', scripture: 'Luke 24:1–12' },
  { title: 'It is finished', series: 'Easter', speaker: 'Jamie Masters', date: '2026-04-03', scripture: 'John 19:17–30' },
  // --- Foundations (representative) ---
  { title: 'Why the church matters', series: 'Foundations', speaker: 'Adrian Birks', date: '2026-03-22', scripture: 'Acts 2:42–47' },
  { title: 'Generosity that reflects God', series: 'Foundations', speaker: 'Joe Whittaker', date: '2026-03-15', scripture: '2 Corinthians 9:6–15' },
  { title: 'Prayer that changes things', series: 'Foundations', speaker: 'Christian Withers', date: '2026-03-08', scripture: 'Luke 11:1–13' },
  { title: 'Learning to hear God’s voice', series: 'Foundations', speaker: 'Dave Norris', date: '2026-03-01', scripture: '1 Samuel 3:1–10' },
];

export const series = [...new Set(sermons.map((s) => s.series))];
export const speakers = [...new Set(sermons.map((s) => s.speaker))].sort();
