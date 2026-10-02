/**
 * Paineis da pilha de telas do StackScroll, em DialKit.
 *
 * Importado sob demanda, so com ?calibrate na URL. Dois paineis:
 * - "Entrada das telas": a tela nova caindo em arco; "Repetir" a
 *   reapresenta sem precisar rolar.
 * - "Telas anteriores": o veu escuro das que ja foram cobertas.
 *
 * Cada mexida chama de volta com a configuracao inteira. O "Copy" do
 * DialKit devolve os valores para colar em ENTRADA e VEU
 * (stack-entrada.ts).
 */
import { createDialKit } from "dialkit/vanilla";
import { dialRoot } from "./dial-root";
import { ENTRADA, VEU, type EntradaConfig, type VeuConfig } from "./stack-entrada";

type Ligacoes = {
  entrada: (cfg: EntradaConfig) => void;
  veu: (cfg: VeuConfig) => void;
  repetir: () => void;
};

export function mountStackPanel({ entrada, veu, repetir }: Ligacoes) {
  dialRoot();

  const kitEntrada = createDialKit("Entrada das telas", {
    origem: {
      type: "pad",
      x: [ENTRADA.origem.x, -300, 300, 1],
      y: [ENTRADA.origem.y, -300, 300, 1],
      labels: { x: "Direita", y: "Acima" },
    },
    arco: [ENTRADA.arco, 0, 1, 0.01],
    escala: {
      inicial: [ENTRADA.escala.inicial, 0.1, 1, 0.01],
      pico: [ENTRADA.escala.pico, 1, 1.3, 0.01],
      picoEm: [ENTRADA.escala.picoEm, 0.1, 0.9, 0.01],
    },
    opacidade: {
      inicial: [ENTRADA.opacidade.inicial, 0, 1, 0.01],
      ateEm: [ENTRADA.opacidade.ateEm, 0.05, 1, 0.01],
    },
    blur: {
      inicial: [ENTRADA.blur.inicial, 0, 60, 1],
    },
    curva: ENTRADA.curva as { type: "easing"; duration: number; ease: [number, number, number, number] },
    repetir: { type: "action", label: "Repetir a entrada" },
  }, {
    id: "stack-entrada",
    persist: true,
    onAction: repetir,
  });

  /* Teto ate 1: preto cheio, para ver o efeito no exagero e voltar. */
  const kitVeu = createDialKit("Telas anteriores", {
    inicial: [VEU.inicial, 0, 1, 0.01],
    fator: [VEU.fator, 1, 2, 0.01],
    teto: [VEU.teto, 0, 1, 0.01],
  }, {
    id: "stack-veu",
    persist: true,
  });

  const pararEntrada = kitEntrada.subscribe((v) => entrada(v as unknown as EntradaConfig));
  const pararVeu = kitVeu.subscribe((v) => veu(v as unknown as VeuConfig));

  return () => {
    pararEntrada();
    pararVeu();
    kitEntrada.destroy();
    kitVeu.destroy();
  };
}
