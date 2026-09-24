/**
 * Parametros do crescimento da barra dos titulos de secao.
 *
 * Mesma ideia dos outros: uma fonte unica que o codigo le e o painel
 * (DialKit, so com ?calibrate) ajusta ao vivo. Valem para os tres cases.
 */

export type BarraConfig = {
  /** Onde a barra comeca a crescer, em fracao da altura da janela
   *  contada do topo. 0.9 = quase no pe da tela. */
  entrada: number;
  /** Onde ela completa. Menor que a entrada, porque o titulo sobe. */
  saida: number;
  /** Curva de bezier do crescimento: [x1, y1, x2, y2]. */
  curva: [number, number, number, number];
};

export const BARRA: BarraConfig = {
  entrada: 0.9,
  saida: 0.45,
  curva: [0.25, 0.1, 0.25, 1],
};
