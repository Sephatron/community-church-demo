import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Cloudflare Pages serves at the root of the domain (e.g. https://community-church.pages.dev/)
// so `base` must be '/' rather than the old GitHub Pages sub-path '/community-church-demo'.
//
// The `link()` helper in src/data/site.ts reads `import.meta.env.BASE_URL` which Astro
// sets from this `base` value at build time — so all internal links continue to resolve
// correctly with no further changes.
//
// The gh-pages branch is deliberately left untouched as a frozen fallback; it was built
// against the old config and must not be rebuilt until Cloudflare Pages is proven.
export default defineConfig({
  site: 'https://community-church-demo.pages.dev',
  base: '/',
  trailingSlash: 'ignore',
  integrations: [tailwind()],
});
