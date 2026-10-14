/**
 * Desgaste das lombadas VHS (VhsSpine).
 *
 * Fonte unica: a VhsSpine le estes valores no build e o painel do
 * /vhs-lab (DialKit) ajusta ao vivo. O "Copy" do painel devolve os
 * valores para colar aqui.
 *
 * Cada fita tem uma idade de 0 (a mais nova) a 1 (a mais antiga), pelo
 * ano do case. O desgaste vai de `minimo` na mais nova a 1 na mais
 * antiga, e cada efeito abaixo e o valor que ele atinge a 100%.
 */

export type WearConfig = {
  /** Desgaste da fita mais nova, de 0 a 1. A mais antiga e sempre 1. */
  minimo: number;
  /** Quanto a tinta desbota (perda de saturacao), de 0 a 1. */
  desbotar: number;
  /** Quanto a fita escurece (perda de brilho), de 0 a 1. */
  escurecer: number;
  /** Forca dos arranhoes brancos nas quinas e dobras, de 0 a 1. */
  arranhoes: number;
  /** Tamanho extra das manchas das quinas, em px. */
  tamanho: number;
  /** Opacidade da textura (color dodge) na fita mais nova e na mais velha. */
  texturaNova: number;
  texturaVelha: number;
  /** Encardido escuro por cima (multiply), de 0 a 1. */
  encardido: number;
  /** Arredondamento extra das quinas amassadas, em px. */
  quinas: number;
};

export const WEAR: WearConfig = {
  minimo: 0.3,
  desbotar: 0.1,
  escurecer: 0,
  arranhoes: 0.2,
  tamanho: 40,
  texturaNova: 0.3,
  texturaVelha: 0.7,
  encardido: 0.5,
  quinas: 2,
};

/** As custom properties que a VhsSpine le. */
export function wearVars(w: WearConfig): Record<string, string> {
  return {
    "--k-minimo": String(w.minimo),
    "--k-desbotar": String(w.desbotar),
    "--k-escurecer": String(w.escurecer),
    "--k-arranhoes": String(w.arranhoes),
    "--k-tamanho": `${w.tamanho}px`,
    "--k-tex-nova": String(w.texturaNova),
    "--k-tex-velha": String(w.texturaVelha),
    "--k-encardido": String(w.encardido),
    "--k-quinas": `${w.quinas}px`,
  };
}
