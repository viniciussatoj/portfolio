/**
 * Parametros do amortecimento da rolagem no desktop.
 *
 * Mesma ideia dos outros: uma fonte unica que o codigo le e o painel
 * (DialKit, so com ?calibrate) ajusta ao vivo.
 */

export type ScrollConfig = {
  /** Ligado ou nao. Serve para comparar com e sem, ao vivo. */
  ligado: boolean;
  /** Quanto da distancia que falta e percorrida a cada quadro. Perto de
   *  1 a rolagem fica seca, como a nativa; perto de 0 ela desliza por
   *  muito tempo depois que a roda para. */
  amortecimento: number;
  /** Multiplica o quanto cada volta da roda pede. Acima de 1 a pagina
   *  anda mais por volta. */
  forca: number;
};

export const SCROLL: ScrollConfig = {
  ligado: true,
  amortecimento: 0.12,
  forca: 1,
};
