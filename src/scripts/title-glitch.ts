import { load } from "./crt-config";

/**
 * Glitch do headline.
 *
 * Mesmo algoritmo de intensidade dos cards — deriva constante entre
 * idleMin/idleMax com picos sorteados —, mas com temporizacao propria e
 * saida em CSS custom properties em vez de shader. O texto continua sendo
 * texto: selecionavel, indexavel e legivel por leitor de tela.
 */
export function mountTitleGlitch(el: HTMLElement) {
  let cfg = load();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let nextBurst = 0;
  let burstEnd = 0;
  let burstPeak = 0;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  function intensityAt(t: number) {
    const s = cfg.titleDriftSpeed;
    const drift = (Math.sin(t * s) + Math.sin(t * s * 1.7 + 1.3)) * 0.25 + 0.5;
    const base = cfg.titleIdleMin + (cfg.titleIdleMax - cfg.titleIdleMin) * drift;

    if (t >= nextBurst) {
      burstPeak = rand(cfg.titleBurstMin, cfg.titleBurstMax);
      burstEnd = t + cfg.titleBurstDuration;
      nextBurst = burstEnd + rand(cfg.titleIntervalMin, cfg.titleIntervalMax);
    }
    if (t < burstEnd) {
      const p = 1 - (burstEnd - t) / cfg.titleBurstDuration;
      const a = cfg.titleBurstAttack;
      const env = p < a ? p / a : 1 - (p - a) / (1 - a);
      return base + burstPeak * Math.max(0, env);
    }
    return base;
  }

  /* As faixas so trocam de posicao algumas vezes por segundo — a cada
     quadro viraria ruido em vez de corte. */
  let lastSlot = -1;
  function sliceBands(t: number, g: number) {
    const slot = Math.floor(t * 14);
    if (slot === lastSlot) return;
    lastSlot = slot;

    const n = Math.round(cfg.titleSliceCount);
    for (let i = 0; i < 3; i++) {
      if (i >= n || g < 0.05) {
        // faixa inativa: recorta tudo, some
        el.style.setProperty(`--s${i}-top`, "50%");
        el.style.setProperty(`--s${i}-bot`, "50%");
        el.style.setProperty(`--s${i}-x`, "0px");
        continue;
      }
      const top = Math.random() * 80;
      const alt = 4 + Math.random() * 14;
      el.style.setProperty(`--s${i}-top`, `${top}%`);
      el.style.setProperty(`--s${i}-bot`, `${Math.max(0, 100 - top - alt)}%`);
      el.style.setProperty(
        `--s${i}-x`,
        `${(Math.random() - 0.5) * 2 * cfg.titleSlice * g}px`
      );
    }
  }

  function frame(tMs: number) {
    const t = tMs / 1000;
    const g = intensityAt(t);
    el.style.setProperty("--g", g.toFixed(4));
    el.style.setProperty("--ab", `${cfg.titleAberration}px`);
    el.style.setProperty(
      "--shake",
      `${(Math.random() - 0.5) * 2 * cfg.titleShake * g}px`
    );
    sliceBands(t, g);
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

  if (reduced) {
    // sem animacao: fica no repouso, so a aberracao estatica do text-shadow
    el.style.setProperty("--g", "0");
    el.style.setProperty("--shake", "0px");
    el.style.setProperty("--ab", `${cfg.titleAberration}px`);
    sliceBands(0, 0);
  }

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible ? start() : stop();
  });
  io.observe(el);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  // o painel avisa quando um valor muda
  window.addEventListener("crt:config", (e) => {
    cfg = (e as CustomEvent<Record<string, number>>).detail;
    lastSlot = -1;
  });

  el.dataset.glitch = "on";
}
