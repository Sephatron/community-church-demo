# The Community Church — concept refresh

A **demo** redesign of [The Community Church, Honiton](https://www.thecommunitychurch.co.uk/) — a structural and visual overhaul exploring a more modern, dynamic direction. This is **not** the official church website.

🔗 **Live demo:** https://sephatron.github.io/community-church-demo/

## What it is

A static site built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com), deployed to GitHub Pages. It reuses the real church content (copy, imagery, sermons, events) presented through a refreshed information architecture and a bold, contemporary design language — grain textures, overlapping rounded sections, scroll-linked motion, filterable sermon and event libraries, and live SoundCloud / map embeds.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321/community-church-demo/
npm run build    # static output to dist/
```

## Notes

- The whole site is `noindex` so it can't be mistaken for the live church site.
- Sermons & events libraries use a baked snapshot of real data (static hosting — no CMS).
- The contact form composes an email via the visitor's mail app (no backend).
