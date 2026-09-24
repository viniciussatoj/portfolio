/**
 * Enquanto o carrossel passa, a rolagem vertical vira horizontal.
 *
 * O carrossel fica preso no meio da tela e anda de lado conforme a
 * pagina rola; quando chega no fim, ele solta e a pagina volta a rolar
 * normalmente. Na volta acontece o mesmo ao contrario.
 *
 * Nada de interceptar o gesto: quem rola continua sendo a pagina, com a
 * inercia e a barra de rolagem do sistema. O truque e um espacador com a
 * altura da distancia horizontal a percorrer, com a faixa grudada (
 * position: sticky) dentro dele — a conta so traduz quanto do espacador
 * ja passou em quanto a faixa deve ter andado de lado. Interceptar o
 * toque exigiria preventDefault e mataria a inercia nativa.
 *
 * So no mobile, que e onde a faixa e carrossel, e so para quem nao pediu
 * menos movimento.
 */

type Preso = {
  faixa: HTMLElement;
  espacador: HTMLElement;
  grude: HTMLElement;
  /** Distancia horizontal que falta percorrer, em px. */
  extra: number;
  /** Onde a faixa prende, medido do topo da janela. */
  topo: number;
  /** Falso quando a faixa nao cabe na janela: vira carrossel comum. */
  ativo: boolean;
};

const MOBILE = "(max-width: 720px)";
const SELETOR = ".row, .split--3";

export function montarCarrosselPreso() {
  const mq = matchMedia(MOBILE);
  let presos: Preso[] = [];

  function prender(faixa: HTMLElement): Preso | null {
    if (faixa.scrollWidth - faixa.clientWidth < 1) return null;

    const espacador = document.createElement("div");
    const grude = document.createElement("div");
    grude.style.position = "sticky";
    espacador.dataset.carrossel = "";
    faixa.parentElement!.insertBefore(espacador, faixa);
    espacador.appendChild(grude);
    grude.appendChild(faixa);

    /* Com a pagina no comando, a faixa nao rola sozinha: o dedo na
       horizontal brigaria com a conta. Sem JS o overflow continua auto e
       ela rola do jeito comum. */
    faixa.style.overflowX = "hidden";
    faixa.style.scrollSnapType = "none";
    faixa.style.touchAction = "pan-y";

    return { faixa, espacador, grude, extra: 0, topo: 0, ativo: false };
  }

  function soltar(p: Preso) {
    p.espacador.parentElement?.insertBefore(p.faixa, p.espacador);
    p.espacador.remove();
    p.faixa.style.overflowX = "";
    p.faixa.style.scrollSnapType = "";
    p.faixa.style.touchAction = "";
    p.faixa.scrollLeft = 0;
    p.espacador.removeAttribute("style");
  }

  function medir(p: Preso) {
    p.extra = p.faixa.scrollWidth - p.faixa.clientWidth;
    const altura = p.faixa.getBoundingClientRect().height;

    /* Uma faixa mais alta que a janela nao tem como ser presa sem cortar
       o proprio conteudo: fica como carrossel comum, de deslizar com o
       dedo. */
    p.ativo = p.extra > 0 && altura <= innerHeight;
    if (!p.ativo) {
      p.grude.removeAttribute("style");
      p.grude.style.position = "sticky";
      p.espacador.style.height = "";
      p.faixa.style.overflowX = "";
      p.faixa.style.touchAction = "";
      return;
    }

    /* A caixa grudada ocupa a janela inteira, com a faixa centralizada
       dentro. E o que faz nada mais se mexer enquanto o carrossel anda:
       prendendo so a faixa, o texto em volta continuava correndo atras
       dela, que e justamente o que incomodava. */
    p.faixa.style.overflowX = "hidden";
    p.faixa.style.touchAction = "pan-y";
    p.grude.style.top = "0px";
    p.grude.style.height = `${innerHeight}px`;
    p.grude.style.display = "flex";
    p.grude.style.flexDirection = "column";
    p.grude.style.justifyContent = "center";
    p.espacador.style.height = `${innerHeight + p.extra}px`;
    p.topo = 0;
  }

  /* A posicao do espacador e lida na hora, e nao guardada de uma
     medicao anterior: as imagens sao lazy e empurram a pagina para
     baixo depois, o que deixaria qualquer posicao gravada para tras.
     Enquanto o espacador sobe ate o ponto de grude, quanto ele passou
     disso e exatamente quanto a faixa deve ter andado de lado. */
  function andar() {
    for (const p of presos) {
      if (!p.ativo) continue;
      const passou = p.topo - p.espacador.getBoundingClientRect().top;
      const fracao = Math.min(1, Math.max(0, passou / p.extra));
      p.faixa.scrollLeft = fracao * p.extra;
    }
  }

  /* Sem requestAnimationFrame: o evento de rolagem ja chega no maximo
     uma vez por quadro, e o trabalho aqui e ler um retangulo e escrever
     uma propriedade por faixa. */
  const aoRolar = () => andar();

  function ligar() {
    presos = [...document.querySelectorAll<HTMLElement>(SELETOR)]
      .map(prender)
      .filter((p): p is Preso => p !== null);
    if (!presos.length) return;
    presos.forEach(medir);
    andar();
    addEventListener("scroll", aoRolar, { passive: true });
  }

  function desligar() {
    removeEventListener("scroll", aoRolar);
    presos.forEach(soltar);
    presos = [];
  }

  function avaliar() {
    desligar();
    if (mq.matches) ligar();
  }

  /* As imagens sao lazy: a altura muda quando elas chegam, e com ela a
     conta toda. */
  const remedir = () => {
    if (!presos.length) return;
    presos.forEach(medir);
    andar();
  };

  avaliar();
  mq.addEventListener("change", avaliar);
  addEventListener("resize", remedir);
  addEventListener("load", remedir);

  return () => {
    desligar();
    mq.removeEventListener("change", avaliar);
    removeEventListener("resize", remedir);
    removeEventListener("load", remedir);
  };
}
