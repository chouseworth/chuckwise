import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { attachments } from './src/integrations/attachments';
import { obsidianCallouts } from './src/lib/callouts';

export default defineConfig({
  site: 'https://www.chuckwise.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap(), attachments()],
  markdown: {
    processor: satteri({
      mdastPlugins: [obsidianCallouts],
    }),
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
