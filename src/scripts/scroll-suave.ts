/**
 * Amortecimento da rolagem no desktop.
 *
 * A roda deixa de empurrar a pagina direto: ela move um alvo, e a
 * pagina persegue esse alvo um pouco a cada quadro. O resultado e uma
 * parada macia em vez do corte seco da roda.
 *
 * Quem anda e o scrollTo de verdade, nao um transform na pagina. E o
 * ponto: transladar o conteudo quebraria position: sticky, o calculo da
 * barra dos titulos e qualquer medida de posicao — e nos temos as tres
 * coisas. Do jeito daqui, tudo que escuta rolagem continua funcionando,
 * porque a rolagem continua sendo rolagem.
 *
 * Fica de fora, e de proposito: toque e tablet (o sistema ja tem
 * inercia propria, e somar as duas embrulha), quem pediu menos
 * movimento, e qualquer gesto dentro de um elemento que rola sozinho —
 * a lista de canais do lightbox, por exemplo.
 */
import { SCROLL, type ScrollConfig } from "./scroll-config";

/** Alturas aproximadas para os modos de delta que nao vem em px. */
const LINHA = 16;

export function montarScrollSuave() {
  const desktop = matchMedia("(min-width: 901px) and (hover: hover) and (pointer: fine)");
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)");

  let cfg: ScrollConfig = { ...SCROLL };
  let alvo = scrollY;
  let atual = scrollY;
  let raf = 0;
  let nosso = false;

  const teto = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const ativo = () => cfg.ligado && desktop.matches && !reduzido.matches;

  /* Pagina travada por CSS — e o que o lightbox faz enquanto esta
     aberto. O scrollHeight nao denuncia isso: ele continua o de sempre,
     so a rolagem e que para. Sem esta checagem a roda continuaria sendo
     capturada por baixo do modal. */
  const travada = () => getComputedStyle(document.documentElement).overflowY === "hidden";

  /** Um ancestral que rola sozinho naquele sentido fica com o gesto. */
  function rolaPorConta(alvoDoEvento: EventTarget | null, delta: number) {
    let el = alvoDoEvento instanceof Element ? alvoDoEvento : null;
    while (el && el !== document.body && el !== document.documentElement) {
      const s = getComputedStyle(el);
      const rola = /(auto|scroll)/.test(s.overflowY);
      if (rola && el.scrollHeight > el.clientHeight) {
        const cabe = delta > 0
          ? el.scrollTop < el.scrollHeight - el.clientHeight - 1
          : el.scrollTop > 1;
        if (cabe) return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  function passo() {
    const falta = alvo - atual;
    if (Math.abs(falta) < 0.5) {
      atual = alvo;
      raf = 0;
    } else {
      atual += falta * cfg.amortecimento;
      raf = requestAnimationFrame(passo);
    }
    nosso = true;
    scrollTo(0, atual);
    nosso = false;
  }

  function naRoda(e: WheelEvent) {
    if (!ativo() || e.ctrlKey) return;
    const max = teto();
    if (max <= 0 || travada()) return;
    if (rolaPorConta(e.target, e.deltaY)) return;

    const fator = e.deltaMode === 1 ? LINHA : e.deltaMode === 2 ? innerHeight : 1;
    e.preventDefault();
    alvo = Math.min(max, Math.max(0, alvo + e.deltaY * fator * cfg.forca));
    if (!raf) {
      atual = scrollY;
      raf = requestAnimationFrame(passo);
    }
  }

  /* Rolagem que nao veio da roda — teclado, barra de rolagem, ancora,
     scrollIntoView — recoloca o alvo onde a pagina parou. Sem isto, a
     proxima volta da roda saltaria de volta para o alvo antigo. */
  function naRolagem() {
    if (nosso || raf) return;
    alvo = atual = scrollY;
  }

  addEventListener("wheel", naRoda, { passive: false });
  addEventListener("scroll", naRolagem, { passive: true });

  /** O painel chama isto a cada mexida. */
  function aplicar(novo: ScrollConfig) {
    cfg = novo;
    if (!cfg.ligado && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      alvo = atual = scrollY;
    }
  }

  return Object.assign(
    () => {
      removeEventListener("wheel", naRoda);
      removeEventListener("scroll", naRolagem);
      if (raf) cancelAnimationFrame(raf);
    },
    { aplicar }
  );
}
