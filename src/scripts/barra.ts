/**
 * A barra de gradiente dos titulos de secao cresce conforme a pagina
 * rola, da esquerda para a direita.
 *
 * Quem cresce e um clip-path, nao a largura: mudando a largura, o
 * gradiente se comprimiria junto e as cores andariam enquanto a barra
 * cresce. Com o recorte, o gradiente fica parado no tamanho final e vai
 * sendo descoberto.
 *
 * Sem JS a barra nasce cheia (--preenchida vale 1 no CSS), entao a
 * pagina nunca fica com barras pela metade.
 */
import { BARRA, type BarraConfig } from "./barra-config";

const SELETOR = ".sectitle--bar";

/** Cubic-bezier do CSS: dado x (0-1), devolve y. */
function bezier([x1, y1, x2, y2]: [number, number, number, number]) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const emX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const emY = (t: number) => ((ay * t + by) * t + cy) * t;
  const derivada = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    /* Newton primeiro, que converge em poucas voltas; bisseccao quando
       a derivada e pequena demais para confiar nela. */
    let t = x;
    for (let i = 0; i < 6; i++) {
      const erro = emX(t) - x;
      if (Math.abs(erro) < 1e-5) return emY(t);
      const d = derivada(t);
      if (Math.abs(d) < 1e-6) break;
      t -= erro / d;
    }
    let baixo = 0;
    let alto = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const v = emX(t);
      if (Math.abs(v - x) < 1e-5) break;
      v > x ? (alto = t) : (baixo = t);
      t = (baixo + alto) / 2;
    }
    return emY(t);
  };
}

export function montarBarras() {
  const barras = [...document.querySelectorAll<HTMLElement>(SELETOR)];
  if (!barras.length) return () => {};

  /* Menos movimento: a barra ja nasce cheia e nao acompanha a rolagem. */
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (const b of barras) b.style.setProperty("--preenchida", "1");
    return () => {};
  }

  let cfg: BarraConfig = { ...BARRA };
  let curva = bezier(cfg.curva);

  function pintar() {
    const h = innerHeight;
    const de = cfg.entrada * h;
    const ate = cfg.saida * h;
    const vao = de - ate;
    for (const b of barras) {
      const topo = b.getBoundingClientRect().top;
      const bruto = vao === 0 ? (topo <= de ? 1 : 0) : (de - topo) / vao;
      const p = curva(Math.min(1, Math.max(0, bruto)));
      b.style.setProperty("--preenchida", p.toFixed(4));
    }
  }

  const aoRolar = () => pintar();
  pintar();
  addEventListener("scroll", aoRolar, { passive: true });
  addEventListener("resize", aoRolar);
  addEventListener("load", aoRolar);

  /** O painel chama isto a cada mexida. */
  function aplicar(novo: BarraConfig) {
    cfg = novo;
    curva = bezier(novo.curva);
    pintar();
  }

  return Object.assign(
    () => {
      removeEventListener("scroll", aoRolar);
      removeEventListener("resize", aoRolar);
      removeEventListener("load", aoRolar);
    },
    { aplicar }
  );
}
