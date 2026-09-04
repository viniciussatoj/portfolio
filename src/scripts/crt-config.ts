/**
 * Esquema unico dos parametros do efeito CRT + glitch.
 *
 * O painel de calibracao e gerado a partir daqui, e o shader le os mesmos
 * nomes. Adicionar um parametro e uma linha nesta lista — a UI aparece
 * sozinha e o uniform e enviado sozinho.
 */

export type Param = {
  key: string;
  label: string;
  group: "CRT" | "Glitch" | "Lampejo" | "Titulo" | "Cor";
  min: number;
  max: number;
  step: number;
  value: number;
  /** Uniform correspondente no shader. Ausente = so usado no JS. */
  uniform?: string;
};

export const PARAMS: Param[] = [
  // ---- CRT ----------------------------------------------------------
  { key: "curvature",     label: "Curvatura do vidro",    group: "CRT", min: 0,   max: 1.5,  step: 0.01, value: 0.28, uniform: "uCurvature" },
  { key: "scanIntensity", label: "Forca das scanlines",   group: "CRT", min: 0,   max: 1,    step: 0.01, value: 0.32, uniform: "uScanIntensity" },
  { key: "scanCount",     label: "Densidade de linhas",   group: "CRT", min: 60,  max: 900,  step: 10,   value: 340,  uniform: "uScanCount" },
  { key: "scanSpeed",     label: "Rolagem das linhas",    group: "CRT", min: -3,  max: 3,    step: 0.05, value: 0.35, uniform: "uScanSpeed" },
  { key: "mask",          label: "Mascara RGB (aperture)",group: "CRT", min: 0,   max: 1,    step: 0.01, value: 0.22, uniform: "uMask" },
  { key: "aberration",    label: "Aberracao cromatica",   group: "CRT", min: 0,   max: 0.02, step: 0.0002, value: 0.0022, uniform: "uAberration" },
  { key: "vignette",      label: "Vinheta",               group: "CRT", min: 0,   max: 2,    step: 0.01, value: 0.85, uniform: "uVignette" },
  { key: "glare",         label: "Brilho do vidro",       group: "CRT", min: 0,   max: 1,    step: 0.01, value: 0.18, uniform: "uGlare" },
  { key: "noise",         label: "Granulado",             group: "CRT", min: 0,   max: 0.5,  step: 0.005, value: 0.055, uniform: "uNoise" },
  { key: "flicker",       label: "Tremulacao constante",  group: "CRT", min: 0,   max: 0.3,  step: 0.005, value: 0.035, uniform: "uFlicker" },
  { key: "brightness",    label: "Brilho",                group: "CRT", min: 0.4, max: 2,    step: 0.01, value: 1.06, uniform: "uBrightness" },
  { key: "cardRadius",    label: "Raio dos cantos (px)",   group: "CRT", min: 0,   max: 64,   step: 1,     value: 12 },

  // ---- Glitch (escalados pela intensidade animada) --------------------
  { key: "blockAmount",   label: "Deslocamento em blocos",group: "Glitch", min: 0, max: 0.3,  step: 0.002, value: 0.075, uniform: "uBlockAmount" },
  { key: "blockSize",     label: "Altura dos blocos",     group: "Glitch", min: 2, max: 80,   step: 1,     value: 22,    uniform: "uBlockSize" },
  { key: "rgbSplit",      label: "Separacao RGB",         group: "Glitch", min: 0, max: 0.08, step: 0.001, value: 0.018, uniform: "uRgbSplit" },
  { key: "wave",          label: "Ondulacao vertical",    group: "Glitch", min: 0, max: 0.06, step: 0.001, value: 0.012, uniform: "uWave" },
  { key: "jitter",        label: "Tremor horizontal",     group: "Glitch", min: 0, max: 0.05, step: 0.001, value: 0.006, uniform: "uJitter" },
  { key: "dropout",       label: "Falhas de linha",       group: "Glitch", min: 0, max: 1,    step: 0.01,  value: 0.35,  uniform: "uDropout" },

  // ---- Lampejo: a mutacao constante e os picos ocasionais -------------
  { key: "idleMin",       label: "Intensidade base minima", group: "Lampejo", min: 0, max: 1,  step: 0.01, value: 0.04 },
  { key: "idleMax",       label: "Intensidade base maxima", group: "Lampejo", min: 0, max: 1,  step: 0.01, value: 0.16 },
  { key: "burstMin",      label: "Pico minimo",             group: "Lampejo", min: 0, max: 2,  step: 0.01, value: 0.55 },
  { key: "burstMax",      label: "Pico maximo",             group: "Lampejo", min: 0, max: 2,  step: 0.01, value: 1.0 },
  { key: "intervalMin",   label: "Intervalo minimo (s)",    group: "Lampejo", min: 0.2, max: 20, step: 0.1, value: 2.5 },
  { key: "intervalMax",   label: "Intervalo maximo (s)",    group: "Lampejo", min: 0.2, max: 30, step: 0.1, value: 7.0 },
  { key: "burstDuration", label: "Duracao do pico (s)",     group: "Lampejo", min: 0.02, max: 2, step: 0.01, value: 0.22 },
  { key: "burstAttack",   label: "Subida do pico (0-1)",    group: "Lampejo", min: 0.01, max: 1, step: 0.01, value: 0.18 },
  { key: "driftSpeed",    label: "Velocidade da mutacao",   group: "Lampejo", min: 0, max: 3,  step: 0.01, value: 0.5 },

  // ---- Titulo: mesmo algoritmo dos cards, temporizacao propria ---------
  // Texto grande piscando incomoda mais que um card pequeno, entao os
  // padroes aqui sao mais contidos de proposito.
  { key: "titleAberration",  label: "Separacao RGB (px)",      group: "Titulo", min: 0, max: 20, step: 0.5,  value: 6 },
  { key: "titleSlice",       label: "Deslocamento das faixas", group: "Titulo", min: 0, max: 40, step: 0.5,  value: 12 },
  { key: "titleSliceCount",  label: "Numero de faixas",        group: "Titulo", min: 0, max: 6,  step: 1,    value: 2 },
  { key: "titleShake",       label: "Tremor (px)",             group: "Titulo", min: 0, max: 12, step: 0.5,  value: 2 },
  { key: "titleIdleMin",     label: "Intensidade base minima", group: "Titulo", min: 0, max: 1,  step: 0.01, value: 0.02 },
  { key: "titleIdleMax",     label: "Intensidade base maxima", group: "Titulo", min: 0, max: 1,  step: 0.01, value: 0.08 },
  { key: "titleBurstMin",    label: "Pico minimo",             group: "Titulo", min: 0, max: 2,  step: 0.01, value: 0.4 },
  { key: "titleBurstMax",    label: "Pico maximo",             group: "Titulo", min: 0, max: 2,  step: 0.01, value: 0.85 },
  { key: "titleIntervalMin", label: "Intervalo minimo (s)",    group: "Titulo", min: 0.2, max: 30, step: 0.1, value: 4 },
  { key: "titleIntervalMax", label: "Intervalo maximo (s)",    group: "Titulo", min: 0.2, max: 40, step: 0.1, value: 11 },
  { key: "titleBurstDuration", label: "Duracao do pico (s)",   group: "Titulo", min: 0.02, max: 2, step: 0.01, value: 0.18 },
  { key: "titleBurstAttack", label: "Subida do pico (0-1)",    group: "Titulo", min: 0.01, max: 1, step: 0.01, value: 0.15 },
  { key: "titleDriftSpeed",  label: "Velocidade da mutacao",   group: "Titulo", min: 0, max: 3,  step: 0.01, value: 0.4 },

];

/** Cores do card. Ficam fora de PARAMS por serem cor, nao numero. */
export type Colors = { hi: string; lo: string };

export type Config = Record<string, number> & { colors?: Colors };

export function defaults(): Record<string, number> {
  return Object.fromEntries(PARAMS.map((p) => [p.key, p.value]));
}

export const STORAGE_KEY = "crt-calibration-v1";

export function load(): Record<string, number> {
  const base = defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(base, JSON.parse(raw));
  } catch {
    /* localStorage indisponivel — segue com os padroes */
  }
  return base;
}

/**
 * Persiste apenas o que difere dos padroes.
 *
 * Guardar o objeto inteiro congelaria a calibragem: mudar um valor aqui
 * no codigo nao apareceria, porque o localStorage antigo venceria. Com o
 * diff, parametro nao calibrado sempre segue o codigo.
 */
export function save(cfg: Record<string, number>) {
  try {
    const d = defaults();
    const diff = Object.fromEntries(Object.entries(cfg).filter(([k, v]) => v !== d[k]));
    if (Object.keys(diff).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(diff));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sem persistencia, mas a calibracao da sessao continua valendo */
  }
}
