/**
 * As barras dos titulos de secao: gradiente em pixel art com dithering,
 * que enche celula a celula conforme o titulo sobe pela janela.
 *
 * O desenho (paleta, dithering) e o sorteio das celulas vem de
 * dither-progress.ts; os parametros, de dither-config.ts. Aqui fica so a
 * ligacao com a pagina: medir cada barra, transformar a posicao do
 * titulo em alvo de preenchimento e redesenhar quando algo muda.
 *
 * Funciona com o amortecimento da rolagem (scroll-suave.ts) sem
 * combinar nada com ele: o amortecimento move a rolagem de verdade
 * (scrollTo), e este laco le a posicao dos titulos a cada quadro.
 *
 * Sem JS a barra fica com o gradiente CSS cheio (SectionTitle.astro): a
 * pagina nunca mostra barras pela metade. O canvas so assume quando este
 * script marca a caixa com data-dither.
 */
import { ajustesDoCaso, type Ajustes } from "./dither-config";
import { alvoDaBarra, colunasEm, montarBarra, montarPreenchimento, rolagemAtiva } from "./dither-progress";

const SELETOR = ".sectitle__bar";

/** Cubic-bezier do CSS: dado x (0-1), devolve y. */
export function bezier([x1, y1, x2, y2]: [number, number, number, number]) {
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

export function montarBarras(inicial: Ajustes = ajustesDoCaso(document.body.dataset.case), seletor = SELETOR) {
  const caixas = [...document.querySelectorAll<HTMLElement>(seletor)];

  /* Menos movimento: as barras ja nascem cheias e nao acompanham a
     rolagem nem animam celula a celula. */
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let cfg = inicial;
  /* Uma curva para cada tela; qual vale sai de rolagemAtiva. */
  let curvas = { desktop: bezier(cfg.curvaRolagem), mobile: bezier(cfg.curvaRolagemMobile) };
  let versao = 0;

  const barras = caixas.map((caixa) => {
    const canvas = caixa.querySelector("canvas") ?? caixa.appendChild(document.createElement("canvas"));
    caixa.dataset.dither = "";
    return {
      caixa,
      largura: caixa.clientWidth,
      barra: montarBarra(canvas),
      preenchimento: montarPreenchimento(),
      /* Versao do config e colunas do ultimo desenho: mudou qualquer
         um, redesenha mesmo que o preenchimento esteja parado. */
      desenhada: "",
    };
  });

  /* Largura por ResizeObserver: medir a cada quadro, logo depois de
     redimensionar os canvas, forcaria layout toda vez. */
  const observador = new ResizeObserver((entradas) => {
    for (const e of entradas) {
      const b = barras.find((b) => b.caixa === e.target);
      if (b) b.largura = e.contentRect.width;
    }
  });
  barras.forEach((b) => observador.observe(b.caixa));

  const rolagemInicial = scrollY;
  let raf = 0;

  function quadro(agora: number) {
    const rolagem = rolagemAtiva(cfg);
    const curva = rolagem.mobile ? curvas.mobile : curvas.desktop;
    const inicio = rolagem.inicioTela * innerHeight;
    const fim = rolagem.fimTela * innerHeight;
    const topos = barras.map((b) => b.caixa.getBoundingClientRect().top);

    barras.forEach((b, i) => {
      let alvo = 1;
      if (!reduzido) {
        /* Barra que carregou ja entre o inicio e o fim: o inicio dela e
           onde estava ao carregar, entao nasce no minimo e enche dali em
           diante, em vez de aparecer pela metade. */
        const carregou = topos[i] + scrollY - rolagemInicial;
        const de = carregou < inicio && carregou > fim ? carregou : inicio;
        const bruto = de === fim ? (topos[i] <= de ? 1 : 0) : (de - topos[i]) / (de - fim);
        alvo = alvoDaBarra(curva(Math.min(1, Math.max(0, bruto))), { velocidade: rolagem.velocidade, minimo: cfg.minimo });
      }

      const local = {
        ...cfg,
        cols: colunasEm(b.largura, cfg),
        ...(reduzido ? { duracao: 0, delay: 0 } : {}),
      };
      const cobertura = b.preenchimento.passo(local, alvo, agora);
      const chave = `${versao}|${local.cols}`;
      if (b.preenchimento.consumirMudanca() || chave !== b.desenhada) {
        b.desenhada = chave;
        b.barra.desenhar(local, cobertura);
      }
    });
    raf = requestAnimationFrame(quadro);
  }
  if (barras.length) raf = requestAnimationFrame(quadro);

  return {
    /** O painel chama isto a cada mexida. */
    aplicar(novo: Ajustes) {
      cfg = novo;
      curvas = { desktop: bezier(novo.curvaRolagem), mobile: bezier(novo.curvaRolagemMobile) };
      versao++;
    },
    destroy() {
      cancelAnimationFrame(raf);
      observador.disconnect();
    },
  };
}
