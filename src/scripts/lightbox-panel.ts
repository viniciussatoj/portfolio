/**
 * Painel de calibragem da troca de canal, em DialKit.
 *
 * Importado sob demanda, so com ?calibrate na URL — visitante normal nao
 * baixa esse pedaco. Cada mexida chama de volta o lightbox com a
 * configuracao inteira; o "Copy" do DialKit devolve os valores para
 * colar em lightbox-config.ts.
 */
import { createDialKit } from "dialkit/vanilla";
import { dialRoot } from "./dial-root";
import { LIGHTBOX, type LightboxConfig } from "./lightbox-config";

export function mountLightboxPanel(aplicar: (cfg: LightboxConfig) => void) {
  dialRoot();

  const kit = createDialKit("Troca de canal", {
    duracao: [LIGHTBOX.duracao, 80, 1200, 10],
    troca: [LIGHTBOX.troca, 0, 1, 0.05],
    intensidade: [LIGHTBOX.intensidade, 0, 1, 0.01],
    grao: [LIGHTBOX.grao, 1, 8, 0.5],
    velocidade: [LIGHTBOX.velocidade, 1, 60, 1],
    saida: [LIGHTBOX.saida, 0, 800, 10],
    opacidadeNoAr: [LIGHTBOX.opacidadeNoAr, 0.05, 1, 0.05],
    testar: { type: "action", label: "Trocar de canal" },
  }, {
    id: "lightbox-canal",
    persist: true,
    onAction: () => window.dispatchEvent(new CustomEvent("lightbox:testar")),
  });

  const parar = kit.subscribe((v) => aplicar(v as unknown as LightboxConfig));

  return () => {
    parar();
    kit.destroy();
  };
}
