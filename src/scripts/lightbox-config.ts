/**
 * Parametros da troca de canal do lightbox.
 *
 * Mesma ideia do crt-config: uma fonte unica que o codigo le e o painel
 * (DialKit, so com ?calibrate) ajusta ao vivo. Para fixar um valor novo,
 * copie do painel para ca.
 */

export type LightboxConfig = {
  /** Duracao do chuvisco, do clique ate a imagem nova estar limpa (ms). */
  duracao: number;
  /** Em que ponto do chuvisco a imagem troca (0 a 1). No meio, a troca
   *  acontece escondida atras da estatica. */
  troca: number;
  /** Quanto da estatica cobre a imagem: 1 apaga tudo. */
  intensidade: number;
  /** Tamanho do grao, em px de CSS. Maior = chuvisco mais grosso. */
  grao: number;
  /** Sorteios por segundo. Baixo demais vira textura parada. */
  velocidade: number;
  /** Saida do chuvisco (ms), depois que a imagem nova ja esta no lugar. */
  saida: number;
  /** Opacidade da miniatura que esta no ar. */
  opacidadeNoAr: number;
};

export const LIGHTBOX: LightboxConfig = {
  duracao: 320,
  troca: 0.5,
  intensidade: 1,
  grao: 2,
  velocidade: 24,
  saida: 140,
  opacidadeNoAr: 0.35,
};
