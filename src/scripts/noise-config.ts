/**
 * Noise do fundo da pagina.
 *
 * Mesma ideia dos outros configs: fonte unica que o Base.astro le no
 * build e o painel (DialKit, so com ?calibrate) ajusta ao vivo. O "Copy"
 * do painel devolve os valores para colar aqui.
 */

export type NoiseConfig = {
  /** Ligado ou nao. Serve para comparar com e sem, ao vivo. */
  ligado: boolean;
  /** Opacidade da camada de grao, de 0 a 1. */
  intensidade: number;
  /** Cor do grao fora dos cases (home, about). Nos cases vale a de
   *  NOISE_COR_CASE. Branco clareia o fundo; uma cor tinge. */
  cor: string;
  /** baseFrequency do feTurbulence. Mais alto, grao mais fino. */
  frequencia: number;
};

export const NOISE: NoiseConfig = {
  ligado: true,
  intensidade: 0.2,
  cor: "#0B0C0B",
  frequencia: 1.1,
};

/** Cor do grao em cada case: o accent mais escuro dele, o mesmo de
 *  --accent-livup / --accent-investai / --accent-hubees em tokens.css. */
export const NOISE_COR_CASE: Record<"livup" | "investai" | "hubees", string> = {
  livup: "#840027",
  investai: "#146F0F",
  hubees: "#1246e2",
};

/** A configuracao da pagina: a do site, com a cor do case quando houver. */
export function noiseDaPagina(caseId?: keyof typeof NOISE_COR_CASE): NoiseConfig {
  return caseId ? { ...NOISE, cor: NOISE_COR_CASE[caseId] } : NOISE;
}

/** Lado do ladrilho, em px. Grande o bastante para a repeticao nao saltar
 *  aos olhos, pequeno para o SVG rasterizar rapido. */
const LADO = 240;

/**
 * Monta o ladrilho de ruido como data URI de SVG. O feTurbulence gera o
 * ruido; o feColorMatrix joga a cor escolhida em RGB e usa o proprio
 * ruido como alfa, entao o grao e so a cor, mais ou menos transparente.
 */
export function noiseUrl({ cor, frequencia }: Pick<NoiseConfig, "cor" | "frequencia">) {
  const [r, g, b] = [1, 3, 5].map((i) => (parseInt(cor.slice(i, i + 2), 16) / 255).toFixed(3));
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${LADO}' height='${LADO}'>` +
    `<filter id='n'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${frequencia}' numOctaves='3' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 1 0 0 0 0'/>` +
    `</filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
