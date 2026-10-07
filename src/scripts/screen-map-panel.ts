/**
 * Paineis do ScreenMap, em DialKit. Importado sob demanda, so com
 * ?calibrate na URL.
 *
 * - "Destaque": cor, opacidade, raio e folga da caixa, e a curva.
 * - "Areas": posicao e tamanho de cada area na tela, em px do mockup a
 *   1x. "Fixar" deixa uma area acesa para calibrar sem segurar o hover.
 * - "Areas de texto (mobile)": as areas que o "Text style" acende.
 * - "Previa (mobile)": espera e duracao da previa da barra de radio;
 *   "Repetir a previa" mostra de novo na hora.
 * - "Hover": quanto o componente sobe e cresce.
 * - "Convite": o tremido do primeiro componente e os tempos dele.
 *   "Repetir o convite" religa o ciclo mesmo depois de um hover.
 *
 * O "Copy" do DialKit devolve os valores para colar em DESTAQUE, AREAS,
 * ELEVACAO e CONVITE (screen-map.ts).
 */
import { createDialKit } from "dialkit/vanilla";
import { dialRoot } from "./dial-root";
import {
  AREAS, CONVITE, DESTAQUE, ELEVACAO, PREVIA, TEXTOS,
  type Area, type ConviteConfig, type DestaqueConfig, type ElevacaoConfig, type PreviaConfig,
} from "./screen-map";

type Ligacoes = {
  destaque: (cfg: DestaqueConfig) => void;
  areas: (areas: Record<string, Area>) => void;
  fixar: (id: string | null) => void;
  textos: (areas: Record<string, Area>) => void;
  elevacao: (cfg: ElevacaoConfig) => void;
  convite: (cfg: ConviteConfig) => void;
  repetirConvite: () => void;
  previa: (cfg: PreviaConfig) => void;
  repetirPrevia: () => void;
};

/* Teto dos sliders: a tela tem 360 x 1118. */
const W = 360;
const H = 1118;

/** Sliders de x, y, w e h para cada area de um conjunto. */
const slidersDe = (conjunto: Record<string, Area>) =>
  Object.fromEntries(Object.entries(conjunto).map(([id, a]) => [id, {
    x: [a.x, -20, W, 1],
    y: [a.y, -20, H, 1],
    w: [a.w, 4, W + 40, 1],
    h: [a.h, 4, H, 1],
  }]));

export function mountScreenMapPanel({
  destaque, areas, fixar, textos, elevacao, convite, repetirConvite, previa, repetirPrevia,
}: Ligacoes) {
  dialRoot();

  const kitDestaque = createDialKit("Destaque", {
    cor: { type: "color", default: DESTAQUE.cor },
    opacidade: [DESTAQUE.opacidade, 0, 1, 0.01],
    raio: [DESTAQUE.raio, 0, 40, 1],
    folga: [DESTAQUE.folga, 0, 24, 1],
    curva: DESTAQUE.curva as { type: "easing"; duration: number; ease: [number, number, number, number] },
  }, { id: "screen-map-caixa", persist: true });

  const ids = Object.keys(AREAS);
  const kitAreas = createDialKit("Areas", {
    fixar: { type: "select", options: ["nenhuma", ...ids], default: "nenhuma" },
    ...slidersDe(AREAS),
  }, { id: "screen-map-areas", persist: true });

  /* Mobile: as areas do "Text style". Para ver, escolha "Text style" na
     barra de radio da tela (janela estreita). */
  const kitTextos = createDialKit("Areas de texto (mobile)", slidersDe(TEXTOS), {
    id: "screen-map-textos",
    persist: true,
  });

  const kitElevacao = createDialKit("Hover", {
    subida: [ELEVACAO.subida, 0, 12, 0.5],
    escala: [ELEVACAO.escala, 1, 1.15, 0.005],
  }, { id: "screen-map-hover", persist: true });

  const kitConvite = createDialKit("Convite", {
    espera: [CONVITE.espera, 0, 5000, 50],
    intervalo: [CONVITE.intervalo, 200, 6000, 50],
    duracao: [CONVITE.duracao, 100, 2000, 10],
    distancia: [CONVITE.distancia, 0, 20, 0.5],
    giro: [CONVITE.giro, 0, 10, 0.1],
    oscilacoes: [CONVITE.oscilacoes, 1, 8, 1],
    repetir: { type: "action", label: "Repetir o convite" },
  }, { id: "screen-map-convite", persist: true, onAction: repetirConvite });

  const kitPrevia = createDialKit("Previa (mobile)", {
    espera: [PREVIA.espera, 0, 3000, 50],
    duracao: [PREVIA.duracao, 300, 5000, 50],
    repetir: { type: "action", label: "Repetir a previa" },
  }, { id: "screen-map-previa", persist: true, onAction: repetirPrevia });

  const pararDestaque = kitDestaque.subscribe((v) => destaque(v as unknown as DestaqueConfig));
  const pararAreas = kitAreas.subscribe((v) => {
    const { fixar: f, ...resto } = v as unknown as { fixar: string } & Record<string, Area>;
    areas(resto);
    fixar(f === "nenhuma" ? null : f);
  });
  const pararTextos = kitTextos.subscribe((v) => textos(v as unknown as Record<string, Area>));
  const pararElevacao = kitElevacao.subscribe((v) => elevacao(v as unknown as ElevacaoConfig));
  const pararConvite = kitConvite.subscribe((v) => convite(v as unknown as ConviteConfig));
  const pararPrevia = kitPrevia.subscribe((v) => previa(v as unknown as PreviaConfig));

  return () => {
    pararDestaque();
    pararAreas();
    pararTextos();
    pararElevacao();
    pararConvite();
    pararPrevia();
    kitPrevia.destroy();
    kitDestaque.destroy();
    kitAreas.destroy();
    kitTextos.destroy();
    kitElevacao.destroy();
    kitConvite.destroy();
  };
}
