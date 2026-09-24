/**
 * Painel de calibragem do CRT, em DialKit.
 *
 * Mesmas opcoes do painel antigo: cor de cada card, vinheta, os
 * parametros de crt-config.ts agrupados como la, e as acoes de copiar e
 * de voltar ao codigo. Os controles saem da lista PARAMS — um parametro
 * novo la aparece aqui sozinho.
 *
 * A persistencia continua a de sempre (crt-calibration-v1 e cia.), e nao
 * a do DialKit: e ela que o load() le quando cada card monta, entao a
 * calibragem vale na pagina inteira, com o painel aberto ou nao.
 */
import { createDialKit } from "dialkit/vanilla";
import { dialRoot } from "./dial-root";
import { PARAMS, load, save, defaults, STORAGE_KEY, VIGNETTE, type Param } from "./crt-config";
import type { Instance } from "./crt";

export type Target = { id: string; brand: string; instance: Instance; hi: string; lo: string };

/* O DialKit transforma a chave no rotulo e poe espaco antes de cada
   maiuscula: "RGB" viraria "R G B". Siglas vao em minuscula; o resto do
   rotulo em portugues passa como esta. */
const chave = (texto: string) => texto.replace(/[A-Z]{2,}/g, (s) => s.toLowerCase());

/* Pastas na mesma ordem e agrupamento do painel antigo. */
const PASTA: Record<Param["group"], string> = {
  CRT: "Crt",
  Glitch: "Glitch",
  Lampejo: "Lampejo",
  Titulo: "Titulo",
  Cor: "Cor",
};

type Valores = Record<string, any>;

export function mountPanel(targets: Target[]) {
  dialRoot();
  const cfg = load();
  const vinhetaInicial = loadVignette();

  // ---- configuracao do DialKit, montada a partir de PARAMS -------------
  const cores: Valores = {};
  for (const t of targets) {
    cores[chave(t.brand).toLowerCase()] = {
      claro: { type: "color", default: t.hi },
      escuro: { type: "color", default: t.lo },
    };
  }
  cores.vinheta = { type: "color", default: vinhetaInicial };

  const config: Valores = { "Cor do card": cores };
  for (const p of PARAMS) {
    const pasta = PASTA[p.group];
    config[pasta] ??= { _collapsed: p.group !== "CRT" };
    config[pasta][chave(p.label)] = [cfg[p.key], p.min, p.max, p.step];
  }
  config.copiar = { type: "action", label: "Copiar para crt-config.ts" };
  config.voltar = { type: "action", label: "Voltar aos valores do codigo" };

  const kit = createDialKit("CRT — calibragem", config, {
    id: "crt-calibragem",
    onAction: (acao: string) => (acao === "copiar" ? copiar() : voltar()),
  });

  // ---- valores do painel -> cards --------------------------------------
  function lerParams(v: Valores) {
    for (const p of PARAMS) {
      const n = v[PASTA[p.group]]?.[chave(p.label)];
      if (typeof n === "number") cfg[p.key] = n;
    }
  }

  let vinheta = vinhetaInicial;
  function aplicar(v: Valores) {
    lerParams(v);
    for (const t of targets) t.instance.setConfig(cfg);
    // quem nao e card — o glitch do titulo — escuta este evento
    window.dispatchEvent(new CustomEvent("crt:config", { detail: cfg }));
    save(cfg);

    const c = v["Cor do card"] ?? {};
    let mudouCor = false;
    for (const t of targets) {
      const par = c[chave(t.brand).toLowerCase()];
      if (!par) continue;
      if (par.claro !== t.hi || par.escuro !== t.lo) {
        t.hi = par.claro;
        t.lo = par.escuro;
        t.instance.setColors(t.hi, t.lo);
        mudouCor = true;
      }
    }
    if (mudouCor) saveColors(targets);

    if (c.vinheta && c.vinheta !== vinheta) {
      vinheta = c.vinheta;
      for (const t of targets) t.instance.setVignetteColor(vinheta);
      saveVignette(vinheta);
    }
  }
  const parar = kit.subscribe(aplicar);

  // ---- acoes -----------------------------------------------------------
  /* Mesmo texto do painel antigo: e o formato que vai colado no chat
     para virar padrao em crt-config.ts e tokens.css. */
  async function copiar() {
    const linhas = PARAMS.map((p) => `  ${p.key}: ${cfg[p.key]},`).join("\n");
    const listaCores =
      targets.map((t) => `  ${t.id}: { hi: "${t.hi}", lo: "${t.lo}" },`).join("\n") +
      `\n  vinheta: "${vinheta}",`;
    const txt = `// valores calibrados\n{\n${linhas}\n}\n\n// cores\n{\n${listaCores}\n}`;
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      console.log(txt);
    }
  }

  /* Volta os parametros ao que esta no codigo e apaga a calibragem
     salva. As cores ficam — como no painel antigo, o reset e dos
     controles numericos. */
  function voltar() {
    const d = defaults();
    const atualizacao: Valores = {};
    for (const p of PARAMS) {
      const pasta = PASTA[p.group];
      (atualizacao[pasta] ??= {})[chave(p.label)] = d[p.key];
    }
    kit.setValues(atualizacao as never);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* sem persistencia */
    }
  }

  return () => {
    parar();
    kit.destroy();
  };
}

// ---- persistencia das cores (formato de sempre) ------------------------
const COLOR_KEY = "crt-colors-v1";

function saveColors(targets: Target[]) {
  try {
    const map = Object.fromEntries(targets.map((t) => [t.id, { hi: t.hi, lo: t.lo }]));
    localStorage.setItem(COLOR_KEY, JSON.stringify(map));
  } catch {
    /* sem persistencia */
  }
}

export function loadColors(): Record<string, { hi: string; lo: string }> {
  try {
    return JSON.parse(localStorage.getItem(COLOR_KEY) ?? "{}");
  } catch {
    return {};
  }
}

const VIG_KEY = "crt-vignette-v1";

export function loadVignette(): string {
  try {
    return localStorage.getItem(VIG_KEY) || VIGNETTE;
  } catch {
    return VIGNETTE;
  }
}

function saveVignette(hex: string) {
  try {
    localStorage.setItem(VIG_KEY, hex);
  } catch {
    /* sem persistencia */
  }
}
