/**
 * Painel de calibragem do amortecimento da rolagem, em DialKit.
 *
 * Importado sob demanda, so com ?calibrate na URL. O "Copy" do DialKit
 * devolve os valores para colar em scroll-config.ts.
 */
import { createDialKit } from "dialkit/vanilla";
import { dialRoot } from "./dial-root";
import { SCROLL, type ScrollConfig } from "./scroll-config";

export function mountScrollPanel(aplicar: (cfg: ScrollConfig) => void) {
  dialRoot();

  const kit = createDialKit(
    "Rolagem",
    {
      ligado: SCROLL.ligado,
      amortecimento: [SCROLL.amortecimento, 0.02, 1, 0.01],
      forca: [SCROLL.forca, 0.2, 3, 0.05],
    },
    { id: "scroll-suave", persist: true }
  );

  const parar = kit.subscribe((v: any) =>
    aplicar({ ligado: v.ligado, amortecimento: v.amortecimento, forca: v.forca })
  );

  return () => {
    parar();
    kit.destroy();
  };
}
