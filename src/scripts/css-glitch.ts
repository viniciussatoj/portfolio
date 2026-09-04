import { PARAMS, load } from "./crt-config";

/**
 * Gerador de intensidade para efeitos feitos em CSS.
 *
 * Mesmo algoritmo dos cards — deriva constante entre idleMin e idleMax,
 * com picos sorteados a intervalos sorteados —, mas a saida sao custom
 * properties em vez de uniforms. O conteudo continua sendo DOM: texto
 * selecionavel, imagem real, tudo acessivel.
 *
 * O prefixo escolhe o conjunto de parametros: "title" le titleIdleMin,
 * titleBurstMax e assim por diante; "hero" le heroIdleMin, etc. Cada
 * instancia sorteia seus proprios intervalos, entao dois elementos com o
 * mesmo prefixo ainda piscam fora de sincronia.
 */
export function mountCssGlitch(el: HTMLElement, prefix: string) {
  let cfg = load();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const P = (k: string) => cfg[prefix + k[0].toUpperCase() + k.slice(1)];

  let nextBurst = 0;
  let burstEnd = 0;
  let burstPeak = 0;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  function intensityAt(t: number) {
    const s = P("driftSpeed");
    const drift = (Math.sin(t * s) + Math.sin(t * s * 1.7 + 1.3)) * 0.25 + 0.5;
    const base = P("idleMin") + (P("idleMax") - P("idleMin")) * drift;

    if (t >= nextBurst) {
      burstPeak = rand(P("burstMin"), P("burstMax"));
      burstEnd = t + P("burstDuration");
      nextBurst = burstEnd + rand(P("intervalMin"), P("intervalMax"));
    }
    if (t < burstEnd) {
      const p = 1 - (burstEnd - t) / P("burstDuration");
      const a = P("burstAttack");
      const env = p < a ? p / a : 1 - (p - a) / (1 - a);
      return base + burstPeak * Math.max(0, env);
    }
    return base;
  }

  /* As faixas so trocam algumas vezes por segundo — a cada quadro viraria
     ruido em vez de corte. */
  let lastSlot = -1;
  function bands(t: number, g: number) {
    const slot = Math.floor(t * 14);
    if (slot === lastSlot) return;
    lastSlot = slot;

    const n = Math.round(P("sliceCount") ?? 0);
    for (let i = 0; i < 3; i++) {
      if (i >= n || g < 0.05) {
        el.style.setProperty(`--s${i}-top`, "50%");
        el.style.setProperty(`--s${i}-bot`, "50%");
        el.style.setProperty(`--s${i}-x`, "0px");
        continue;
      }
      const top = Math.random() * 80;
      const alt = 4 + Math.random() * 14;
      el.style.setProperty(`--s${i}-top`, `${top}%`);
      el.style.setProperty(`--s${i}-bot`, `${Math.max(0, 100 - top - alt)}%`);
      el.style.setProperty(`--s${i}-x`, `${(Math.random() - 0.5) * 2 * P("slice") * g}px`);
    }
  }

  /* Publica todo parametro do prefixo como custom property crua, em
     kebab e sem unidade: heroScanSize vira --p-scan-size. O CSS aplica a
     unidade com calc. Assim adicionar um parametro nao exige mexer aqui. */
  const meus = PARAMS.filter((p) => p.key.startsWith(prefix)).map((p) => {
    const resto = p.key.slice(prefix.length);
    const kebab = resto
      .replace(/^./, (c) => c.toLowerCase())
      .replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
    return { key: p.key, cssVar: `--p-${kebab}` };
  });

  function apply(t: number, g: number) {
    el.style.setProperty("--g", g.toFixed(4));
    el.style.setProperty("--ab", `${P("aberration") ?? 0}px`);
    el.style.setProperty("--shake", `${(Math.random() - 0.5) * 2 * (P("shake") ?? 0) * g}px`);
    for (const m of meus) el.style.setProperty(m.cssVar, String(cfg[m.key]));
    bands(t, g);
  }

  function frame(tMs: number) {
    const t = tMs / 1000;
    apply(t, intensityAt(t));
    raf = requestAnimationFrame(frame);
  }

  let raf = 0;
  let visible = false;
  const start = () => {
    if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  // sem animacao: fica no repouso, so o tratamento estatico
  if (reduced) apply(0, 0);

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible ? start() : stop();
  });
  io.observe(el);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  // o painel de calibragem avisa quando um valor muda
  window.addEventListener("crt:config", (e) => {
    cfg = (e as CustomEvent<Record<string, number>>).detail;
    lastSlot = -1;
  });

  el.dataset.glitch = "on";
}
