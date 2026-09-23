import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const cases = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/cases" }),
  schema: ({ image }) => z.object({
    /** Ordem de exibição na home (1 = primeiro card à esquerda). */
    order: z.number(),
    /** Chave do accent — controla --accent via [data-case] em tokens.css. */
    accent: z.enum(["livup", "investai", "hubees"]),
    brand: z.string(),
    /** Título da página de case, exatamente como no Figma. */
    title: z.string(),
    /** Cargo em negrito antes do travessão. */
    role: z.string(),
    /** Texto após o travessão na linha de cargo. */
    roleDetail: z.string(),
    /** Rótulo mono do card na home: "/Food tech/ ...". */
    category: z.string(),
    /** Descrição do card na home. */
    blurb: z.string(),
    year: z.string(),
    tags: z.string(),
    /** Painel de métricas do topo do case. `onHome: false` esconde a métrica
     *  no card da home — o Hubees mostra 3 no case e 2 na home. */
    metrics: z
      .array(z.object({ k: z.string(), v: z.string(), onHome: z.boolean().default(true) }))
      .min(1)
      .max(3),
    /** Mockup a esquerda do painel de metricas. Resolvido pelo pipeline
     *  de assets do Astro (converte para webp e gera srcset). */
    heroImage: image().optional(),
    /** Alt do mockup do topo. Sem ele o leitor de tela anuncia so "botao"
     *  — a imagem abre o modal, entao precisa se descrever. */
    heroAlt: z.string().optional(),
    description: z.string(),
  }),
});

export const collections = { cases };
