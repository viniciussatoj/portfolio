/**
 * Painel das barras de gradiente em pixel art, em DialKit.
 *
 * Serve a dois lugares:
 * - no laboratorio /dither-progress, numa raiz inline dentro de `host`,
 *   com a faixa de gradiente logo acima;
 * - nos cases, com ?calibrate, no popover compartilhado (dial-root.ts)
 *   junto dos paineis do CRT, do lightbox e da rolagem — ali uma segunda
 *   raiz duplicaria todos eles. A faixa flutua sozinha no canto.
 *
 * Os valores iniciais vem de `padrao` (dither-config.ts); o "Copy" do
 * DialKit devolve os ajustes para colar de volta la.
 *
 * Dois paineis: "Cores" (os stops) e "Barra" (grade, dithering,
 * rolagem, preenchimento). Cada stop e uma pasta do DialKit com posicao e
 * cor; adicionar ou remover um stop muda a estrutura do painel, entao o
 * config e refeito com updateConfig.
 *
 * O DialKit nao tem editor de gradiente. A faixa com alcas, no estilo do
 * Figma, fica logo acima dos paineis e e so outra forma de editar os
 * mesmos valores: arrastar uma alca escreve na posicao do stop no painel.
 */
import { createDialKit, createDialRoot } from "dialkit/vanilla";
import "dialkit/vanilla/styles.css";
import "../styles/dither-painel.css";
import { dialRoot } from "./dial-root";
import type { Ajustes } from "./dither-config";
import {
  ESTILOS, MODOS, carregarStops, salvarStops, corEm, ordenar,
  type Estilo, type Modo, type Paleta, type Stop,
} from "./dither-progress";

const nomeStop = (i: number) => `Stop ${i + 1}`;

type Bezier = [number, number, number, number];

/** Os presets do CSS, para o ritmo do delay. */
const CURVAS: Record<string, Bezier> = {
  Linear: [0, 0, 1, 1],
  Ease: [0.25, 0.1, 0.25, 1],
  "Ease in": [0.42, 0, 1, 1],
  "Ease out": [0, 0, 0.58, 1],
  "Ease in-out": [0.42, 0, 0.58, 1],
};

/** O editor do DialKit deixa trocar Bezier por mola; mola nao tem curva
 *  para ler, entao vale como linear. Coordenadas arredondadas para a
 *  comparacao com os presets nao falhar por ruido de float. */
const curvaDe = (c: any): Bezier =>
  c?.type === "easing" ? (c.ease.map((n: number) => Math.round(n * 1000) / 1000) as Bezier) : CURVAS.Linear;
const pct = (pos: number) => Math.round(pos * 100);

const presetDe = (ease: Bezier) =>
  Object.keys(CURVAS).find((nome) => CURVAS[nome].join() === ease.join()) ?? "custom";

type Opcoes = {
  /** Base dos ids do DialKit e da chave dos stops no localStorage. */
  id: string;
  padrao: Ajustes;
  /** Com host: raiz inline e faixa dentro dele. Sem: popover compartilhado. */
  host?: HTMLElement;
  /** Case da pagina: as cores sao so dele (CORES em dither-config.ts),
   *  o resto dos ajustes vale para todos. */
  caso?: string;
};

export function montarPainel(aplicar: (a: Ajustes) => void, { id, padrao, host, caso }: Opcoes) {
  /* ---------------- estrutura ---------------- */

  const faixaBox = document.createElement("div");
  faixaBox.className = host ? "dp-grad" : "dp-grad dp-grad--flutuante";
  faixaBox.innerHTML = `
    <div class="dp-grad-topo"><span>Gradiente</span><output class="dp-leitura"></output></div>
    <div class="dp-alcas"></div>
    <div class="dp-faixa" title="Clique para adicionar um stop"><div></div></div>`;
  let raiz: { destroy(): void } | null = null;
  if (host) {
    const raizBox = document.createElement("div");
    host.append(faixaBox, raizBox);
    raiz = createDialRoot({ mode: "inline", target: raizBox, theme: "dark" });
  } else {
    document.body.append(faixaBox);
    dialRoot();
  }

  const leitura = faixaBox.querySelector<HTMLOutputElement>(".dp-leitura")!;
  const alcas = faixaBox.querySelector<HTMLElement>(".dp-alcas")!;
  const faixa = faixaBox.querySelector<HTMLElement>(".dp-faixa")!;
  const faixaCor = faixa.firstElementChild as HTMLElement;

  /* ---------------- painel Cores ---------------- */

  const sufixo = caso ? `-${caso}` : "";
  const chaveStops = `${id}:stops${sufixo}`;
  let stops: Stop[] = ordenar(carregarStops(chaveStops, padrao.stops));
  let reestruturando = false;

  function configCores() {
    const cfg: Record<string, any> = {
      adicionar: { type: "action", label: "Adicionar stop" },
      inverter: { type: "action", label: "Inverter stops" },
      restaurar: { type: "action", label: "Restaurar stops" },
    };
    stops.forEach((st, i) => {
      cfg[nomeStop(i)] = {
        "Posição": [pct(st.pos), 0, 100, 1],
        Cor: { type: "color", default: st.color },
        ...(stops.length > 2 ? { remover: { type: "action", label: "Remover stop" } } : {}),
      };
    });
    return cfg;
  }

  function valoresCores() {
    return Object.fromEntries(stops.map((st, i) => [nomeStop(i), { "Posição": pct(st.pos), Cor: st.color }]));
  }

  const cores = createDialKit(caso ? `Cores — ${caso}` : "Cores", configCores(), {
    id: `${id}-cores${sufixo}`,
    onAction(acao) {
      if (acao === "adicionar") return adicionar(maiorVao());
      if (acao === "restaurar") {
        stops = structuredClone(padrao.stops);
        return reestruturar();
      }
      if (acao === "inverter") {
        stops.forEach((s) => (s.pos = 1 - s.pos));
        return reestruturar();
      }
      const m = acao.match(/^Stop (\d+)\.remover$/);
      if (m && stops.length > 2) {
        stops.splice(Number(m[1]) - 1, 1);
        reestruturar();
      }
    },
  });

  /** Refaz as pastas na ordem das posicoes e reescreve os valores: o
   *  updateConfig preserva edicoes por caminho, e depois de reordenar o
   *  "Stop 2" pode ser outro stop. */
  function reestruturar() {
    stops = ordenar(stops);
    reestruturando = true;
    cores.updateConfig(configCores());
    cores.setValues(valoresCores());
    reestruturando = false;
    mudouStops();
  }

  cores.subscribe((v: any) => {
    if (reestruturando) return;
    stops.forEach((st, i) => {
      const pasta = v[nomeStop(i)];
      if (!pasta) return;
      st.pos = pasta["Posição"] / 100;
      st.color = pasta.Cor;
    });
    mudouStops();
  }, false);

  function adicionar(pos: number) {
    stops.push({ id: Math.max(0, ...stops.map((s) => s.id)) + 1, pos, color: corEm(stops, pos) });
    reestruturar();
  }

  /** Meio do maior vao entre stops vizinhos, como o "+" do Figma. */
  function maiorVao() {
    const s = ordenar(stops);
    let melhor = 0.5, vao = -1;
    for (let i = 0; i < s.length - 1; i++) {
      const d = s[i + 1].pos - s[i].pos;
      if (d > vao) { vao = d; melhor = (s[i].pos + s[i + 1].pos) / 2; }
    }
    return pct(melhor) / 100;
  }

  /* Mexer na posicao pelo slider pode tirar os stops de ordem. Reordena
     so quando o gesto acaba, para a pasta nao trocar de nome no meio. */
  const foraDeOrdem = () => stops.some((s, i) => i > 0 && s.pos < stops[i - 1].pos);
  /* No popover o painel nao e nosso; escuta no documento. */
  const alvoGestos: EventTarget = host ?? document;
  const reordenar = () => setTimeout(() => foraDeOrdem() && reestruturar());
  alvoGestos.addEventListener("pointerup", reordenar);
  alvoGestos.addEventListener("keyup", reordenar);

  /* ---------------- faixa com alcas ---------------- */

  function desenharFaixa() {
    const s = ordenar(stops);
    faixaCor.style.background = `linear-gradient(90deg, ${s.map((st) => `${st.color} ${st.pos * 100}%`).join(", ")})`;

    while (alcas.children.length < stops.length) {
      const a = document.createElement("button");
      a.type = "button";
      a.className = "dp-alca";
      a.append(document.createElement("span"));
      alcas.append(a);
    }
    while (alcas.children.length > stops.length) alcas.lastElementChild!.remove();

    stops.forEach((st, i) => {
      const a = alcas.children[i] as HTMLElement;
      a.dataset.i = String(i);
      a.style.left = `${st.pos * 100}%`;
      a.setAttribute("aria-label", `${nomeStop(i)}, ${pct(st.pos)}%`);
      (a.firstElementChild as HTMLElement).style.setProperty("--c", st.color);
    });
  }

  const posNaFaixa = (clientX: number) => {
    const r = alcas.getBoundingClientRect();
    return pct(Math.min(1, Math.max(0, (clientX - r.left) / r.width))) / 100;
  };

  faixa.addEventListener("click", (e) => adicionar(posNaFaixa(e.clientX)));

  alcas.addEventListener("pointerdown", (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(".dp-alca");
    if (!el) return;
    const i = Number(el.dataset.i);
    el.setPointerCapture(e.pointerId);
    el.dataset.ativa = "";
    const mover = (ev: PointerEvent) => {
      stops[i].pos = posNaFaixa(ev.clientX);
      cores.setValue(`${nomeStop(i)}.Posição`, pct(stops[i].pos));
    };
    el.addEventListener("pointermove", mover);
    el.addEventListener("lostpointercapture", () => {
      el.removeEventListener("pointermove", mover);
      delete el.dataset.ativa;
    }, { once: true });
  });

  /* ---------------- painel Barra ---------------- */

  const barra = createDialKit(
    "Barra",
    {
      /* So no dev: o endpoint que grava o arquivo vive no dev server. */
      ...(import.meta.env.DEV ? { salvar: { type: "action", label: "Salvar em dither-config.ts" } } : {}),
      Grade: {
        "Largura da célula (px)": [padrao.cellW, 1, 24, 1],
        "Altura da célula (px)": [padrao.cellH, 1, 24, 1],
        "Espaço entre células (px)": [padrao.gap, 0, 8, 1],
        "Altura (células)": [padrao.rows, 1, 32, 1],
        /* Cor das celulas vazias, o "skeleton" antes de encher. */
        "Célula vazia": { type: "color", default: padrao.esqueleto },
      },
      Dithering: {
        Estilo: { type: "select", options: ESTILOS.map((e) => ({ value: e.id, label: e.nome })), default: padrao.estilo },
        Intensidade: [padrao.intensidade, 0, 1, 0.01],
        "Viés": [padrao.vies, -0.5, 0.5, 0.01],
        Cor: {
          /* Inclina as faixas de cor; 0 = fronteiras verticais. */
          "Inclinação do gradiente (°)": [padrao.anguloGradiente, -75, 75, 1],
          Modo: { type: "select", options: MODOS.map((m) => ({ value: m.id, label: m.nome })), default: padrao.modo },
          Paleta: {
            type: "select",
            options: [{ value: "stops", label: "Stops" }, { value: "niveis", label: "Níveis do gradiente" }],
            default: padrao.paleta,
          },
          "Níveis": [padrao.niveis, 2, 16, 1],
        },
      },
      Rolagem: {
        Velocidade: [padrao.velocidade, 0.25, 5, 0.05],
        "Progresso mínimo": [padrao.minimo, 0, 0.5, 0.01],
        "Início (% da tela)": [Math.round(padrao.inicioTela * 100), 0, 100, 1],
        "Fim (% da tela)": [Math.round(padrao.fimTela * 100), 0, 100, 1],
        /* Como a posicao do titulo entre inicio e fim vira progresso. */
        Curva: { type: "easing", duration: 0.3, ease: padrao.curvaRolagem },
      },
      /* Valem com a janela ate 900px; no desktop, estreite a janela para
         ver o efeito. */
      "Rolagem no mobile": {
        Velocidade: [padrao.velocidadeMobile, 0.25, 5, 0.05],
        "Início (% da tela)": [Math.round(padrao.inicioTelaMobile * 100), 0, 100, 1],
        "Fim (% da tela)": [Math.round(padrao.fimTelaMobile * 100), 0, 100, 1],
        Curva: { type: "easing", duration: 0.3, ease: padrao.curvaRolagemMobile },
      },
      Preenchimento: {
        "Ângulo (°)": [padrao.angulo, -75, 75, 1],
        "Largura da faixa": [padrao.faixa, 1, 8, 1],
        "Faixas no sorteio": [padrao.janela, 1, 16, 1],
        "Duração (ms)": [padrao.duracao, 0, 1000, 10],
        "Delay (ms)": [padrao.delay, 0, 2, 0.05],
        "Ritmo do delay": {
          Preset: {
            type: "select",
            options: [
              ...Object.keys(CURVAS).map((nome) => ({ value: nome, label: nome })),
              { value: "custom", label: "Personalizada" },
            ],
            default: presetDe(padrao.curva),
          },
          /* O Duration do editor do DialKit nao e usado: o ritmo so le a
             forma da curva; quem da a escala de tempo e o Delay. */
          Curva: { type: "easing", duration: 0.3, ease: padrao.curva },
        },
      },
    },
    { id, persist: true, onAction: (acao) => acao === "salvar" && salvar() },
  );

  /* Preset e curva andam juntos: escolher um preset desenha a curva;
     mexer na curva a mao (alcas ou coordenadas) troca o preset para
     "Personalizada". setValue dispara o subscribe de novo, dai a trava. */
  const RITMO = "Preenchimento.Ritmo do delay";
  let valoresBarra: any = barra.getValues();
  let sincronizando = false;
  barra.subscribe((v: any) => {
    if (!sincronizando) {
      const ritmo = v.Preenchimento["Ritmo do delay"];
      const antes = valoresBarra.Preenchimento["Ritmo do delay"];
      const ease = curvaDe(ritmo.Curva);
      sincronizando = true;
      if (ritmo.Preset !== antes.Preset && ritmo.Preset in CURVAS) {
        barra.setValue(`${RITMO}.Curva`, { type: "easing", duration: ritmo.Curva.duration ?? 0.3, ease: CURVAS[ritmo.Preset] });
      } else if (ritmo.Preset in CURVAS && ease.join() !== CURVAS[ritmo.Preset].join()) {
        barra.setValue(`${RITMO}.Preset`, "custom");
      }
      sincronizando = false;
      v = barra.getValues();
    }
    valoresBarra = v;
    emitir();
  }, false);

  /* ---------------- saida ---------------- */

  function mudouStops() {
    salvarStops(chaveStops, stops);
    desenharFaixa();
    emitir();
  }

  /* Os ultimos ajustes emitidos sao o que o botao Salvar grava. */
  let ultimos: Ajustes = padrao;
  let avisoAte = 0;
  const AVISO = "dither-config:aviso";

  async function salvar() {
    const { stops: lista, ...resto } = ultimos;
    const corpo = { ...resto, stops: ordenar(lista).map(({ pos, color }, i) => ({ id: i + 1, pos, color })) };
    try {
      const destino = caso ? `?caso=${encodeURIComponent(caso)}` : "";
      const r = await fetch(`/__salvar-dither-config${destino}`, { method: "POST", body: JSON.stringify(corpo) });
      const txt = await r.text();
      if (!r.ok) return avisar(`Erro ao salvar: ${txt}`);
      if (txt === "igual") return avisar("dither-config.ts já está assim");
      /* O arquivo mudou e o dev server vai recarregar a pagina: o aviso
         fica guardado e aparece depois. */
      try { sessionStorage.setItem(AVISO, "Salvo em dither-config.ts ✓"); } catch {}
      avisar("Salvo em dither-config.ts ✓");
    } catch (erro) {
      avisar(`Erro ao salvar: ${erro}`);
    }
  }

  /** Mensagem na faixa por alguns segundos, por cima da leitura. */
  function avisar(txt: string) {
    leitura.textContent = txt;
    avisoAte = performance.now() + 3000;
    /* Nos cases ninguem mais escreve na leitura; apaga sozinho. */
    setTimeout(() => leitura.textContent === txt && (leitura.textContent = ""), 3000);
  }

  function emitir() {
    const v = valoresBarra;
    ultimos = {
      cellW: v.Grade["Largura da célula (px)"],
      cellH: v.Grade["Altura da célula (px)"],
      gap: v.Grade["Espaço entre células (px)"],
      rows: v.Grade["Altura (células)"],
      esqueleto: v.Grade["Célula vazia"],
      estilo: v.Dithering.Estilo as Estilo,
      intensidade: v.Dithering.Intensidade,
      vies: v.Dithering["Viés"],
      modo: v.Dithering.Cor.Modo as Modo,
      paleta: v.Dithering.Cor.Paleta as Paleta,
      niveis: v.Dithering.Cor["Níveis"],
      anguloGradiente: v.Dithering.Cor["Inclinação do gradiente (°)"],
      velocidade: v.Rolagem.Velocidade,
      minimo: v.Rolagem["Progresso mínimo"],
      inicioTela: v.Rolagem["Início (% da tela)"] / 100,
      fimTela: v.Rolagem["Fim (% da tela)"] / 100,
      curvaRolagem: curvaDe(v.Rolagem.Curva),
      velocidadeMobile: v["Rolagem no mobile"].Velocidade,
      inicioTelaMobile: v["Rolagem no mobile"]["Início (% da tela)"] / 100,
      fimTelaMobile: v["Rolagem no mobile"]["Fim (% da tela)"] / 100,
      curvaRolagemMobile: curvaDe(v["Rolagem no mobile"].Curva),
      angulo: v.Preenchimento["Ângulo (°)"],
      faixa: v.Preenchimento["Largura da faixa"],
      janela: v.Preenchimento["Faixas no sorteio"],
      duracao: v.Preenchimento["Duração (ms)"],
      delay: v.Preenchimento["Delay (ms)"],
      curva: curvaDe(v.Preenchimento["Ritmo do delay"].Curva),
      stops: stops.map((s) => ({ ...s })),
    };
    aplicar(ultimos);
  }

  mudouStops();

  try {
    const aviso = sessionStorage.getItem(AVISO);
    if (aviso) {
      sessionStorage.removeItem(AVISO);
      avisar(aviso);
    }
  } catch {}

  return {
    leitura: (txt: string) => {
      if (performance.now() < avisoAte) return;
      if (leitura.textContent !== txt) leitura.textContent = txt;
    },
    destroy() {
      cores.destroy();
      barra.destroy();
      raiz?.destroy();
      faixaBox.remove();
      alvoGestos.removeEventListener("pointerup", reordenar);
      alvoGestos.removeEventListener("keyup", reordenar);
    },
  };
}
