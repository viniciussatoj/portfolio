/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — ScreenMap (Hubees / journeys)
 *
 * Hover (ou foco) num componente da lista acende a area
 * equivalente na tela do app ao lado.
 *
 *    0ms   uma caixa vermelha translucida aparece sobre a
 *          area do componente na tela
 *  ~350ms  assentada (curva padrao)
 *
 * Passando de um componente a outro, a caixa desliza de uma
 * area para a outra (posicao e tamanho) em vez de sumir e
 * reaparecer — inclusive atravessando o vao entre dois itens
 * da lista. So saindo da lista inteira ela some.
 *
 * Hover num componente: ele sobe 1px e cresce 1,5% (ELEVACAO).
 *
 * Convite (so desktop) — sugere que a lista responde ao hover:
 *
 *    0ms     a lista entra na tela
 * 1000ms     o primeiro componente da um tremido curto
 *            (~700ms, 2 idas e voltas que vao morrendo)
 *  +1500ms   depois do fim de cada tremido, outro
 *    ...     ate o primeiro hover (ou foco) em qualquer
 *            componente; dai nunca mais
 *
 * Saindo da tela o convite pausa; voltando, espera de novo.
 *
 * Mobile (ate 900px) — sem listas nem hover:
 *
 *    uma barra azul com dois radios ("Components", "Text
 *    style") cobre a barra de status da tela e gruda no topo
 *    da janela enquanto a tela passa; solta quando o fim da
 *    tela chega nela
 *    escolher uma opcao: o conjunto inteiro acende de uma vez
 *    (fade, mesma curva e cor do desktop)
 *    trocar de opcao: um conjunto apaga enquanto o outro acende
 *    tocar na opcao ja escolhida: limpa, nada aceso
 *
 *    previa (uma vez por visita), a partir da barra grudar:
 *      0ms     barra gruda no topo da janela
 *    500ms     "Components" marca sozinho, conjunto acende
 *   2000ms     limpa — a barra volta ao estado inicial
 *    um toque na barra antes ou durante cancela a previa
 *
 * Valores calibraveis com ?calibrate (screen-map-panel.ts).
 * ───────────────────────────────────────────────────────── */

import type { TransitionConfig } from "dialkit/vanilla";
import { resolverCurva } from "./stack-entrada";

/** Area na tela, em px do mockup a 1x (360 x 1118). */
export type Area = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Raio so desta area, em px; sem ele vale o raio do painel. */
  raio?: number;
};

export type DestaqueConfig = {
  cor: string;
  /** Opacidade do preenchimento. */
  opacidade: number;
  /** Raio da caixa, em px. */
  raio: number;
  /** Folga em volta da area, em px. */
  folga: number;
  curva: TransitionConfig;
};

export const DESTAQUE: DestaqueConfig = {
  cor: "#ff0000",
  opacidade: 0.2,
  raio: 8,
  folga: 4,
  curva: { type: "easing", duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
};

/* Hover num componente da lista. Usa a curva do DESTAQUE. */
export type ElevacaoConfig = {
  /** Quanto sobe, em px. */
  subida: number;
  /** Escala no hover (1.03 = 3% maior). */
  escala: number;
};

export const ELEVACAO: ElevacaoConfig = {
  subida: 1,
  escala: 1.015,
};

/* O tremido que convida ao hover. */
export type ConviteConfig = {
  /** ms depois de a lista entrar na tela ate o primeiro tremido. */
  espera: number;
  /** ms entre o fim de um tremido e o comeco do proximo. */
  intervalo: number;
  /** Duracao de um tremido, em ms. */
  duracao: number;
  /** Deslocamento lateral maximo, em px. */
  distancia: number;
  /** Giro maximo, em graus. */
  giro: number;
  /** Idas e voltas por tremido; cada uma menor que a anterior. */
  oscilacoes: number;
};

export const CONVITE: ConviteConfig = {
  espera: 1000,
  intervalo: 1500,
  duracao: 700,
  distancia: 2,
  giro: 1,
  oscilacoes: 2,
};

/** Quadros do tremido para a Web Animations API: idas e voltas que
 *  decaem ate zero, com um leve giro acompanhando. */
export function quadrosDoTremido(c: ConviteConfig): Keyframe[] {
  const passos = Math.max(1, Math.round(c.oscilacoes)) * 2;
  const quadros: Keyframe[] = [{ transform: "translateX(0) rotate(0deg)" }];
  for (let i = 1; i <= passos; i++) {
    const lado = i % 2 ? 1 : -1;
    const resto = 1 - (i - 1) / passos;
    quadros.push({
      transform: `translateX(${(lado * c.distancia * resto).toFixed(2)}px) rotate(${(lado * c.giro * resto).toFixed(2)}deg)`,
    });
  }
  quadros.push({ transform: "translateX(0) rotate(0deg)" });
  return quadros;
}

/* Medidas da tela "Detalhes da sua estadia" (Figma 463:13888), na ordem
   da lista de componentes. */
export const AREAS: Record<string, Area> = {
  payment: { x: 20, y: 706, w: 320, h: 70 },
  accordion: { x: 36, y: 590, w: 288, h: 28 },
  coupon: { x: 20, y: 868, w: 320, h: 68 },
  /* Pilula, como o botao: o raio passa de qualquer altura e o navegador
     o limita a metade dela. */
  button: { x: 20, y: 978, w: 320, h: 56, raio: 9999 },
  header: { x: 16, y: 40, w: 328, h: 104 },
  ticket: { x: 20, y: 268, w: 320, h: 383 },
};

/* Mobile: no lugar das listas, uma barra de radio presa no topo da tela
   ("Components" / "Text style"). Cada opcao acende o seu conjunto inteiro
   de uma vez — os componentes sao as AREAS acima; os estilos de texto,
   estas. Medidas na mesma tela, onde cada estilo da lista do desktop
   aparece. */
export const TEXTOS: Record<string, Area> = {
  /* Display/MD/Bold */
  titulo: { x: 20, y: 92, w: 280, h: 40 },
  /* Display/XS/Demibold */
  secao: { x: 20, y: 665, w: 172, h: 28 },
  /* Display/XS/Bold: o rotulo do botao */
  botao: { x: 20, y: 978, w: 320, h: 56, raio: 9999 },
  /* Text/LG/DemiBold */
  entrada: { x: 90, y: 729, w: 116, h: 26 },
  /* Text/SM/Regular */
  legenda: { x: 76, y: 906, w: 152, h: 20 },
  /* Text/MD/Regular */
  rotulo: { x: 36, y: 445, w: 118, h: 24 },
};

/** O conjunto acendido no mobile, ou nenhum. */
export type Modo = "componentes" | "textos" | null;

/* Mobile: a primeira vez que a barra gruda, ela se mostra sozinha —
   marca "Components", segura, e limpa. Diz que a barra acende a tela
   sem precisar de texto. Uma vez por visita; um toque na barra antes ou
   durante cancela. */
export type PreviaConfig = {
  /** ms depois de a barra grudar ate marcar "Components". */
  espera: number;
  /** ms com "Components" aceso antes de limpar. */
  duracao: number;
};

export const PREVIA: PreviaConfig = {
  espera: 500,
  duracao: 1500,
};

/** A curva do painel em CSS: duracao e um easing que o transition
 *  aceita. Mola vira linear() amostrado, para caber numa transicao. */
export function curvaCss(c: TransitionConfig) {
  if (c.type === "easing") {
    return { duracao: c.duration * 1000, easing: `cubic-bezier(${c.ease.join(",")})` };
  }
  const { duracao, progresso } = resolverCurva(c);
  const n = 40;
  const pontos = Array.from({ length: n + 1 }, (_, i) => +progresso(i / n).toFixed(4));
  return { duracao, easing: `linear(${pontos.join(",")})` };
}
