/**
 * Painel de calibragem do noise do fundo, em DialKit.
 *
 * Importado sob demanda, so com ?calibrate na URL. Mexe direto nas
 * custom properties do <html>, que o Base.astro ja preenche no build.
 */
import { createDialKit } from "dialkit/vanilla";
import { dialRoot } from "./dial-root";
import { NOISE, noiseUrl } from "./noise-config";

export function mountNoisePanel() {
  dialRoot();

  const kit = createDialKit(
    "Noise do fundo",
    {
      ligado: NOISE.ligado,
      intensidade: [NOISE.intensidade, 0, 0.4, 0.005],
      cor: NOISE.cor,
      frequencia: [NOISE.frequencia, 0.1, 2.5, 0.05],
    },
    { id: "noise-fundo", persist: true }
  );

  const raiz = document.documentElement.style;
  const parar = kit.subscribe((v: any) => {
    raiz.setProperty("--noise-opacity", v.ligado ? String(v.intensidade) : "0");
    raiz.setProperty("--noise-img", noiseUrl({ cor: v.cor, frequencia: v.frequencia }));
  });

  return () => {
    parar();
    kit.destroy();
  };
}
