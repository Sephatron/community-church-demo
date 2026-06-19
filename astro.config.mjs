import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Project site on GitHub Pages: https://sephatron.github.io/community-church-demo/
// `base` must match the repo name so assets/links resolve under the sub-path.
export default defineConfig({
  site: 'https://sephatron.github.io',
  base: '/community-church-demo',
  trailingSlash: 'ignore',
  integrations: [tailwind()],
});
