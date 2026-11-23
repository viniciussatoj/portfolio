/**
 * Parametros do grafico de proporcao (Meter.astro, o "50%+"), separados
 * das barras dos titulos de secao (dither-config.ts).
 *
 * Usa o mesmo desenho em pixel art (barra.ts), mas com ajustes proprios:
 * ja nasce cheio, entao a rolagem nao entra, e as faixas de cor ficam sem
 * inclinacao. O painel ?calibrate tem um par de paineis so dele
 * ("Gráfico — cores" e "Gráfico — barra"); com `astro dev`, a acao "Salvar
 * em meter-config.ts" reescreve os valores abaixo
 * (plugins/salvar-dither-config.mjs), preservando os comentarios.
 */
import type { Ajustes, Caso } from "./dither-config";
import type { Stop } from "./dither-progress";

export const METER: Ajustes = {
  /* Grade */
  cellW: 24,
  cellH: 12,
  gap: 4,
  rows: 2,
  esqueleto: "#d220475c",

  /* Dithering */
  estilo: "ign",
  intensidade: 1,
  vies: 0.05,
  modo: "matiz",
  paleta: "stops",
  niveis: 9,

  /* 0 = fronteiras de cor verticais, como numa barra de grafico. */
  anguloGradiente: 0,

  /* Cores de qualquer pagina sem case. Nos cases valem as de CORES. */
  stops: [
    { id: 1, pos: 0, color: "#EE3D40" },
    { id: 2, pos: 0.5, color: "#FDD802" },
    { id: 3, pos: 1, color: "#00FF2B" },
  ],

  /* Rolagem: sem efeito no grafico, que ja nasce cheio. Ficam aqui so
     porque o desenho compartilhado espera todos os campos. */
  velocidade: 1,
  minimo: 0,
  inicioTela: 0.7,
  fimTela: 0.4,
  curvaRolagem: [0, 0, 1, 1],
  velocidadeMobile: 1,
  inicioTelaMobile: 0.35,
  fimTelaMobile: 0.1,
  curvaRolagemMobile: [0, 0, 1, 1],

  /* Preenchimento: so a ordem em que as celulas acendem; com o grafico
     cheio, aparece tudo de uma vez. */
  angulo: 0,
  faixa: 1,
  janela: 1,
  duracao: 0,
  delay: 0,
  curva: [0, 0, 1, 1],
};

/** Cores do grafico em cada case. Comecam iguais as das barras. */
export const CORES: Record<Caso, Stop[]> = {
  livup: [
    { id: 1, pos: 0, color: "#FF8FA6" },
    { id: 2, pos: 0.35, color: "#D22047" },
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

/** Ajustes do grafico para uma pagina: os de METER com as cores do case. */
export function ajustesDoMeter(caso: string | undefined): Ajustes {
  return caso && caso in CORES ? { ...METER, stops: CORES[caso as Caso] } : METER;
}
