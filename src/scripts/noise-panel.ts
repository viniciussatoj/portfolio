/**
 * Painel de calibragem do noise do fundo, em DialKit.
 *
 * Importado sob demanda, so com ?calibrate na URL. Mexe direto nas
 * custom properties do <html>, que o Base.astro ja preenche no build.
 */
import { createDialKit } from "dialkit/vanilla";
import { dialRoot } from "./dial-root";
import { noiseDaPagina, noiseUrl, NOISE_COR_CASE } from "./noise-config";

export function mountNoisePanel() {
  dialRoot();

  /* A cor padrao depende da pagina: o accent escuro do case, ou a do site.
     O id do painel tambem, para o ajuste de um case nao vazar para outro. */
  const caso = document.body.dataset.case as keyof typeof NOISE_COR_CASE | undefined;
  const NOISE = noiseDaPagina(caso);

  const kit = createDialKit(
    "Noise do fundo",
    {
      ligado: NOISE.ligado,
      intensidade: [NOISE.intensidade, 0, 1, 0.005],
      cor: NOISE.cor,
      frequencia: [NOISE.frequencia, 0.1, 2.5, 0.05],
    },
    { id: `noise-fundo-${caso ?? "site"}`, persist: true }
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
