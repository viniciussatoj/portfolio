/**
 * Curvas de tempo do DialKit (Bezier ou mola) em duas formas:
 *
 * - `progresso`: uma funcao u (0..1) -> avanco (0..1), para quem monta os
 *   quadros da animacao na mao (keyframes calculados, Web Animations);
 * - `traduz`: duracao + funcao de tempo do CSS (cubic-bezier / linear()),
 *   para quem anima por `transition`.
 *
 * O editor do DialKit deixa trocar Bezier por mola, entao toda curva que
 * vem do painel pode ser qualquer um dos dois.
 */
export type Bezier = [number, number, number, number];
export type Curva = { type: "easing"; duration: number; ease: Bezier } | { type: "spring"; [k: string]: number | string };

/** Atalho para escrever uma curva Bezier com a duracao em segundos. */
export const facil = (duration: number, ease: Bezier) => ({ type: "easing" as const, duration, ease });

/* ---- Bezier ------------------------------------------------------------ */

/** cubic-bezier(x1, y1, x2, y2) como funcao: tempo (0..1) -> avanco. */
const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (u: number) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    /* Newton: acha o t da curva cujo x e u. */
    let t = u;
    for (let k = 0; k < 8; k++) {
      const e = X(t) - u;
      const d = dX(t);
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    t = Math.min(1, Math.max(0, t));
    return ((ay * t + by) * t + cy) * t;
  };
};

/* ---- Mola --------------------------------------------------------------- */

/** Resposta ao degrau de uma mola amortecida, e o tempo (s) em que assenta. */
function fisicaDaMola(c: any) {
  const m = c.mass ?? 1;
  const w0 = c.stiffness != null ? Math.sqrt(c.stiffness / m) : (2 * Math.PI) / (c.visualDuration ?? 0.4);
  const z =
    c.damping != null && c.stiffness != null
      ? c.damping / (2 * Math.sqrt(c.stiffness * m))
      : Math.max(0.02, 1 - (c.bounce ?? 0.2));
  const T = Math.min(3, Math.max(0.2, -Math.log(0.002) / (z * w0)));
  const posicao = (t: number) => {
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  };
  return { T, posicao };
}

/* ---- API ---------------------------------------------------------------- */

/** Duracao (ms) e avanco da curva. Com `parado` (reduced motion) pula direto ao fim. */
export function progresso(c: Curva, parado: boolean): { ms: number; f: (u: number) => number } {
  if (parado) return { ms: 0, f: () => 1 };
  if (c.type === "easing") return { ms: c.duration * 1000, f: bezier(...c.ease) };
  const { T, posicao } = fisicaDaMola(c);
  return { ms: T * 1000, f: (u) => (u >= 1 ? 1 : posicao(u * T)) };
}

/** Duracao (ms) e funcao de tempo do CSS. A mola vira `linear()` com pontos. */
export function traduz(c: Curva, parado: boolean): { ms: number; fn: string } {
  if (parado) return { ms: 0, fn: "linear" };
  if (c.type === "easing") return { ms: c.duration * 1000, fn: `cubic-bezier(${c.ease.join(", ")})` };
  const { T, posicao } = fisicaDaMola(c);
  const pontos = Array.from({ length: 49 }, (_, i) => posicao((i / 48) * T).toFixed(4));
  pontos[48] = "1";
  return { ms: T * 1000, fn: `linear(${pontos.join(", ")})` };
}
