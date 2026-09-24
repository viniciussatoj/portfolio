/**
 * Painel de calibragem do crescimento da barra, em DialKit.
 *
 * Importado sob demanda, so com ?calibrate na URL. O controle da curva
 * abre o editor de bezier com as alcas arrastaveis; o "Copy" do DialKit
 * devolve os valores para colar em barra-config.ts.
 */
import { createDialKit } from "dialkit/vanilla";
import { dialRoot } from "./dial-root";
import { BARRA, type BarraConfig } from "./barra-config";

export function mountBarraPanel(aplicar: (cfg: BarraConfig) => void) {
  dialRoot();

  const kit = createDialKit(
    "Barra das secoes",
    {
      entrada: [BARRA.entrada, 0.3, 1.2, 0.01],
      saida: [BARRA.saida, 0, 0.9, 0.01],
      curva: { type: "easing", duration: 0.3, ease: BARRA.curva },
    },
    { id: "barra-secoes", persist: true }
  );

  const parar = kit.subscribe((v: any) => {
    /* O editor deixa trocar de bezier para mola; a mola nao tem curva
       para ler, entao ali o crescimento volta a ser linear. */
    const curva = v.curva?.type === "easing" ? v.curva.ease : [0, 0, 1, 1];
    aplicar({ entrada: v.entrada, saida: v.saida, curva });
  });

  return () => {
    parar();
    kit.destroy();
  };
}
