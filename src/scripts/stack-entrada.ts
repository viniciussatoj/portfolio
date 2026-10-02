/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — tela nova entrando na pilha do StackScroll
 *
 * Read top-to-bottom. Each value is ms after the step fires
 * (with the defaults below: 700ms easing curve).
 *
 *    0ms   card at +100px right, 50px above, scale 0.6,
 *          opacity 0, blur 24px — starts falling in an arc
 *  245ms   opacity reaches 1 (35% of the run)
 *  315ms   scale peaks 0.6 → 1.05 (45% of the run)
 *  700ms   lands in its slot: scale 1.05 → 1.0, blur → 0
 *
 * The arc: x leaves first and y catches up, like a card
 * tossed onto the stack. ARCO pulls the path's control
 * point toward (landing x, start y); 0 is a straight line.
 * ───────────────────────────────────────────────────────── */

import type { TransitionConfig } from "dialkit/vanilla";

export type EntradaConfig = {
  /** De onde a tela sai, relativo ao lugar onde pousa. Y para cima,
   *  como no pad do DialKit: 50 = 50px acima. */
  origem: { x: number; y: number };
  /** Curvatura do caminho: 0 reto, 1 arco cheio. */
  arco: number;
  escala: {
    inicial: number;  // tamanho ao sair
    pico: number;     // o quique antes de assentar
    picoEm: number;   // fracao da duracao em que o pico acontece
  };
  opacidade: {
    inicial: number;  // opacidade ao sair
    ateEm: number;    // fracao da duracao em que chega a 1
  };
  blur: {
    inicial: number;  // px ao sair; some conforme a tela cai
  };
  /** Curva do movimento (caminho e blur). Easing ou spring — o painel
   *  deixa trocar entre os dois. */
  curva: TransitionConfig;
};

/* Tela entrando */
export const ENTRADA: EntradaConfig = {
  origem: { x: 100, y: 50 },
  arco: 1,
  escala: { inicial: 0.6, pico: 1.05, picoEm: 0.45 },
  opacidade: { inicial: 0, ateEm: 0.35 },
  blur: { inicial: 24 },
  curva: { type: "easing", duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

/* Telas anteriores: o veu escuro de quem ja foi coberta. O primeiro
   nivel abaixo da de cima recebe `inicial`; cada nivel a mais multiplica
   por `fator`, sem passar de `teto` (opacidade absoluta do preto). */
export type VeuConfig = {
  inicial: number;
  fator: number;
  teto: number;
};

export const VEU: VeuConfig = {
  inicial: 0.25,  // 25% no primeiro nivel
  fator: 1.25,    // x1.25 a cada nivel a mais
  teto: 0.6,      // nunca mais escuro que 60%
};

/** Opacidade do veu de uma tela `nivel` niveis abaixo da de cima. */
export const veuNoNivel = (v: VeuConfig, nivel: number) =>
  Math.min(v.teto, v.inicial * v.fator ** (nivel - 1));

/* ---- curvas ------------------------------------------------------- */

/** Bezier cubica de CSS: dado t (tempo), devolve o progresso. */
function bezier([x1, y1, x2, y2]: [number, number, number, number]) {
  const coord = (a: number, b: number, s: number) =>
    3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  const derivada = (a: number, b: number, s: number) =>
    3 * a * (1 - s) ** 2 + 6 * (b - a) * s * (1 - s) + 3 * (1 - b) * s * s;
  return (t: number) => {
    let s = t;
    for (let i = 0; i < 8; i++) {
      const d = derivada(x1, x2, s);
      if (Math.abs(d) < 1e-6) break;
      s -= (coord(x1, x2, s) - t) / d;
    }
    return coord(y1, y2, Math.min(1, Math.max(0, s)));
  };
}

/** Mola de 0 a 1, simulada. Devolve a duracao ate assentar e o
 *  progresso em funcao do tempo normalizado (pode passar de 1). Mesma
 *  conversao do Motion para visualDuration/bounce. */
function mola(c: Extract<TransitionConfig, { type: "spring" }>) {
  let k: number, amort: number;
  const massa = c.mass ?? 1;
  if (c.visualDuration != null) {
    const raiz = (2 * Math.PI) / (c.visualDuration * 1.2);
    k = raiz * raiz;
    amort = 2 * Math.min(1, Math.max(0.05, 1 - (c.bounce ?? 0.25))) * Math.sqrt(k);
  } else {
    k = c.stiffness ?? 100;
    amort = c.damping ?? 10;
  }
  const dt = 1 / 240;
  const pontos = [0];
  let x = 0, v = 0;
  for (let i = 0; i < 240 * 4; i++) {
    v += ((-k * (x - 1) - amort * v) / massa) * dt;
    x += v * dt;
    pontos.push(x);
    if (Math.abs(1 - x) < 0.0005 && Math.abs(v) < 0.005) break;
  }
  const duracao = ((pontos.length - 1) * dt) * 1000;
  return {
    duracao,
    progresso: (t: number) => pontos[Math.min(pontos.length - 1, Math.round(t * (pontos.length - 1)))],
  };
}

function resolverCurva(c: TransitionConfig) {
  if (c.type === "easing") return { duracao: c.duration * 1000, progresso: bezier(c.ease) };
  return mola(c);
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const saida = (t: number) => 1 - (1 - t) ** 3;
const meio = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/* ---- quadros ------------------------------------------------------ */

/**
 * Os quadros da entrada para a Web Animations API, amostrados um a um:
 * caminho em arco, escala com quique, opacidade e blur. Cada um segue
 * seu proprio relogio, entao nao cabem num keyframe so com easing.
 *
 * `yFinal` e o translateY do lugar onde a tela pousa na pilha.
 */
export function quadrosDaEntrada(cfg: EntradaConfig, yFinal: number) {
  const { duracao, progresso } = resolverCurva(cfg.curva);

  /* Caminho: bezier quadratica do ponto de saida ate (0, 0). O pad tem
     Y para cima; na tela, acima e negativo. */
  const p0 = { x: cfg.origem.x, y: -cfg.origem.y };
  const meioReto = { x: p0.x / 2, y: p0.y / 2 };
  const cheio = { x: 0, y: p0.y };
  const ctrl = {
    x: meioReto.x + (cheio.x - meioReto.x) * cfg.arco,
    y: meioReto.y + (cheio.y - meioReto.y) * cfg.arco,
  };
  const ponto = (m: number) => {
    const a = 1 - m;
    return {
      x: a * a * p0.x + 2 * a * m * ctrl.x,
      y: a * a * p0.y + 2 * a * m * ctrl.y,
    };
  };

  const { inicial, pico, picoEm } = cfg.escala;
  const escala = (t: number) =>
    t <= picoEm
      ? inicial + (pico - inicial) * saida(t / picoEm)
      : pico + (1 - pico) * meio((t - picoEm) / (1 - picoEm));

  const n = Math.max(24, Math.ceil(duracao / 16));
  const quadros: Keyframe[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const m = progresso(t);
    const { x, y } = ponto(m);
    const op = cfg.opacidade.inicial + (1 - cfg.opacidade.inicial) * clamp01(t / cfg.opacidade.ateEm);
    const blur = cfg.blur.inicial * (1 - clamp01(m));
    quadros.push({
      transform: `translate(${x.toFixed(2)}px, ${(y + yFinal).toFixed(2)}px) scale(${escala(t).toFixed(4)})`,
      opacity: op,
      filter: `blur(${blur.toFixed(2)}px)`,
    });
  }
  /* Ultimo quadro exato: entrega para o CSS sem salto. */
  quadros[n] = { transform: `translate(0px, ${yFinal}px) scale(1)`, opacity: 1, filter: "blur(0px)" };

  return { quadros, duracao };
}
