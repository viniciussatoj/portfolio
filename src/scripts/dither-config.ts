/**
 * Parametros das barras de gradiente em pixel art dos titulos de secao.
 *
 * Fonte unica: barra.ts le daqui em producao; o painel (DialKit, so com
 * ?calibrate nos cases, ou sempre no laboratorio /dither-progress)
 * comeca daqui. Com `astro dev`, a acao "Salvar em dither-config.ts" do
 * painel reescreve os valores abaixo (plugins/salvar-dither-config.mjs);
 * os comentarios ficam. Valem para os tres cases.
 */
import type { Config, Stop } from "./dither-progress";

/** Tudo menos o numero de colunas, que sai da largura de cada barra. */
export type Ajustes = Omit<Config, "cols">;

export const DITHER: Ajustes = {
  /* Grade */
  cellW: 2,
  cellH: 2,
  gap: 1,
  rows: 8,
  /* Cor de toda celula vazia, como um skeleton de carregamento. */
  esqueleto: "#24242400",

  /* Dithering */
  estilo: "ign",
  intensidade: 1,
  vies: 0,
  modo: "matiz",
  paleta: "stops",
  niveis: 6,

  /* Inclinacao das faixas de cor: 0 = fronteiras verticais, positivo
     inclina como "/". */
  anguloGradiente: -75,

  /* Cores do laboratorio e de qualquer pagina sem case. Nos cases valem
     as de CORES, abaixo. */
  stops: [
    { id: 1, pos: 0, color: "#EE3D40" },
    { id: 2, pos: 0.34, color: "#FDD802" },
    { id: 3, pos: 0.66, color: "#00FF2B" },
    { id: 4, pos: 1, color: "#2600FF" },
  ],

  /* Rolagem: a barra enche enquanto o titulo sobe de inicioTela a
     fimTela (fracoes da altura da janela, 0 = topo), por curvaRolagem. */
  velocidade: 2,
  minimo: 0.05,
  inicioTela: 0.75,
  fimTela: 0.5,
  curvaRolagem: [0.67, 0.01, 0.25, 1],

  /* Preenchimento celula a celula */
  angulo: -75,
  faixa: 1,
  janela: 1,
  duracao: 20,
  delay: 0.5,
  curva: [0.42, 0, 0.58, 1],
};

/** Os cases, pelo data-case do <body> (Base.astro). */
export type Caso = "livup" | "investai" | "hubees";

/**
 * Cores da barra de cada case. Comecam no accent do case (tokens.css):
 * o tom de base, o ponto mais claro e um claro alem dele — a barra fica
 * dentro da mesma familia de cor do resto da pagina.
 *
 * O painel ?calibrate edita e salva so as do case aberto.
 */
export const CORES: Record<Caso, Stop[]> = {
  livup: [
    { id: 1, pos: 0, color: "#FF8FA6" },
    { id: 2, pos: 0.35, color: "#D22047" },
    { id: 3, pos: 0.67, color: "#840027" },
    { id: 4, pos: 0.89, color: "#84002700" },
  ],
  investai: [
    { id: 1, pos: 0, color: "#B5F59A" },
    { id: 2, pos: 0.3, color: "#47B02D" },
    { id: 3, pos: 0.67, color: "#146F0F" },
    { id: 4, pos: 0.93, color: "#01450000" },
  ],
  hubees: [
    { id: 1, pos: 0.04, color: "#6e73ff" },
    { id: 2, pos: 0.29, color: "#453EF5" },
    { id: 3, pos: 0.59, color: "#1246E2" },
    { id: 4, pos: 0.85, color: "#00004200" },
  ],
};

const ehCaso = (c: string | undefined): c is Caso => !!c && c in CORES;

/** Ajustes para uma pagina: os de DITHER com as cores do case, se houver. */
export function ajustesDoCaso(caso: string | undefined): Ajustes {
  return ehCaso(caso) ? { ...DITHER, stops: CORES[caso] } : DITHER;
}
