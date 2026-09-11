// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://viniciussato.com',
  integrations: [mdx(), sitemap()],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        // Near-lossless: sem a subamostragem de cor do WebP com perda, que
        // borrava texto pequeno colorido e linhas finas das telas de UI.
        // quality aqui e o nivel de pre-processamento (60 = a variante
        // aprovada na comparacao). Os componentes nao passam quality
        // proprio, senao sobrescreveriam este valor.
        webp: { nearLossless: true, quality: 60, effort: 6 },
      },
    },
  },
});
