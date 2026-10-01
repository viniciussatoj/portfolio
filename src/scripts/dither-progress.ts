/**
 * Laboratorio da barra de progresso em pixel art com dithering.
 *
 * A barra e uma grade de cols x rows celulas, cada uma um bloco nitido
 * de `cellW` x `cellH` px, com `gap` px entre elas. As cores nunca se misturam: a paleta e
 * exatamente a lista de stops, e o dithering decide, celula a celula,
 * qual dos stops vizinhos aparece. E isso que da a cara de pixel art.
 *
 * O gradiente e fixo no tamanho da barra (mesma ideia da barra dos
 * titulos): o preenchimento descobre as cores em vez de comprimi-las.
 */

export type Estilo =
  | "bayer2"
  | "bayer4"
  | "bayer8"
  | "blue"
  | "linhas"
  | "ruido"
  | "ign"
  | "floyd"
  | "atkinson"
  | "nenhum";

export const ESTILOS: { id: Estilo; nome: string }[] = [
  { id: "bayer2", nome: "Bayer 2×2" },
  { id: "bayer4", nome: "Bayer 4×4" },
  { id: "bayer8", nome: "Bayer 8×8" },
  { id: "blue", nome: "Blue noise" },
  { id: "linhas", nome: "Linhas" },
  { id: "ruido", nome: "Ruído branco" },
  { id: "ign", nome: "Ruído gradiente (IGN)" },
  { id: "floyd", nome: "Floyd–Steinberg" },
  { id: "atkinson", nome: "Atkinson" },
  { id: "nenhum", nome: "Nenhum (faixas)" },
];

/** Como a cor de cada coluna vira cores da paleta. */
export type Modo = "vizinhos" | "proxima" | "matiz";

export const MODOS: { id: Modo; nome: string }[] = [
  { id: "vizinhos", nome: "Vizinhos no gradiente" },
  { id: "proxima", nome: "Cor mais próxima (OKLab)" },
  { id: "matiz", nome: "Matiz + luminosidade" },
];


/** De onde vem a paleta: os stops, ou N cores tiradas do gradiente. */
export type Paleta = "stops" | "niveis";

/** Cor em qualquer string CSS que o DialKit devolva (hex, rgb, oklch, p3). */
export type Stop = { id: number; pos: number; color: string };

export type Config = {
  /** Largura e altura de cada celula, em px. Nao precisam ser iguais. */
  cellW: number;
  cellH: number;
  /** Espaco entre celulas vizinhas, em px. */
  gap: number;
  cols: number;
  rows: number;
  estilo: Estilo;
  /** 0 = faixas duras, 1 = dithering pleno. */
  intensidade: number;
  /** Empurra a escolha para a cor seguinte (+) ou anterior (-) do gradiente. */
  vies: number;
  modo: Modo;
  paleta: Paleta;
  /** Cores tiradas do gradiente (paleta "niveis") e degraus de luz (modo "matiz"). */
  niveis: number;
  stops: Stop[];
  /** Inclinacao das faixas de cor, em graus. 0 = fronteiras verticais;
   *  positivo inclina como "/" (a linha de cima vai na frente), como o
   *  angulo do preenchimento. O gradiente segue da esquerda para a direita. */
  anguloGradiente: number;
  /** Cor de toda celula ainda vazia, como o skeleton de uma tela
   *  carregando: a grade inteira aparece desde o inicio, e cada celula
   *  troca esta cor pela final ao encher. */
  esqueleto: string;
  /** Multiplicador da rolagem: 2 = a barra enche na metade da pagina. */
  velocidade: number;
  /** Fracao que toda barra mostra cheia antes de a rolagem chegar nela:
   *  o aviso de que ali tem algo para carregar. */
  minimo: number;
  /** Barras das secoes: comecam a encher quando o topo delas passa desta
   *  altura da janela e completam nesta outra (0 = topo, 1 = pe). */
  inicioTela: number;
  fimTela: number;
  /** Curva de Bezier do progresso das barras das secoes: como a posicao
   *  do titulo na janela vira fracao cheia. */
  curvaRolagem: [number, number, number, number];
  /** Inclinacao da frente do preenchimento, em graus. 0 = colunas. */
  angulo: number;
  /** Largura de cada faixa diagonal do sorteio, em celulas. */
  faixa: number;
  /** Quantas faixas incompletas, a partir da esquerda, entram no sorteio. */
  janela: number;
  /** Quanto tempo cada celula leva para aparecer, em ms. */
  duracao: number;
  /** Intervalo medio entre uma celula e a proxima, em ms. */
  delay: number;
  /** Curva de Bezier [x1, y1, x2, y2] do ritmo ao longo da barra: x e o
   *  tempo, y o preenchimento. Linear = delay constante. */
  curva: [number, number, number, number];
};

/* ---------------- matrizes e limiares ---------------- */

/** Bayer n x n (n potencia de 2), ja normalizada para (0, 1). */
function bayer(n: number): number[][] {
  let m = [[0]];
  for (let k = 1; k < n; k *= 2) {
    const prox: number[][] = [];
    for (let y = 0; y < k * 2; y++) {
      prox.push([]);
      for (let x = 0; x < k * 2; x++) {
        const base = m[y % k][x % k] * 4;
        const quad = [0, 2, 3, 1][(y >= k ? 2 : 0) + (x >= k ? 1 : 0)];
        prox[y].push(base + quad);
      }
    }
    m = prox;
  }
  return m.map((l) => l.map((v) => (v + 0.5) / (n * n)));
}

const BAYER = { 2: bayer(2), 4: bayer(4), 8: bayer(8) };
const LINHAS = [0.125, 0.625, 0.375, 0.875];

/** Ruido estavel por celula: o padrao nao "ferve" ao rolar. */
function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Blue noise 64x64 pelo void-and-cluster (Ulichney, 1993): cada ponto
 * novo vai para o maior vazio, entao o ruido nao tem grumos nem
 * repeticao visivel. Gerado uma vez, na primeira vez que for pedido.
 */
const AZUL = 64;
let azul: Float32Array | null = null;

function blueNoise(): Float32Array {
  if (azul) return azul;
  const N = AZUL, T = N * N, SIGMA = 1.5;

  /* Energia que um ponto espalha, por deslocamento toroidal. */
  const g = new Float32Array(T);
  for (let dy = 0; dy < N; dy++) {
    for (let dx = 0; dx < N; dx++) {
      const x = Math.min(dx, N - dx), y = Math.min(dy, N - dy);
      g[dy * N + dx] = Math.exp(-(x * x + y * y) / (2 * SIGMA * SIGMA));
    }
  }
  const energia = new Float32Array(T);
  const ponto = new Uint8Array(T);
  const mexer = (p: number, sinal: number) => {
    const px = p % N, py = (p / N) | 0;
    for (let y = 0; y < N; y++) {
      const ry = ((y - py + N) % N) * N;
      for (let x = 0; x < N; x++) energia[y * N + x] += sinal * g[ry + ((x - px + N) % N)];
    }
  };
  const extremo = (ocupado: number, maior: boolean) => {
    let melhor = -1, v = maior ? -Infinity : Infinity;
    for (let i = 0; i < T; i++) {
      if (ponto[i] !== ocupado) continue;
      if (maior ? energia[i] > v : energia[i] < v) { v = energia[i]; melhor = i; }
    }
    return melhor;
  };

  /* Semente com 10% dos pontos (gerador fixo: o padrao e sempre o
     mesmo), relaxada tirando do maior grumo e pondo no maior vazio ate
     parar de mudar. */
  let semente = 1;
  const rand = () => (semente = (semente * 48271) % 2147483647) / 2147483647;
  let inicial = 0;
  while (inicial < T / 10) {
    const p = Math.floor(rand() * T);
    if (!ponto[p]) { ponto[p] = 1; mexer(p, 1); inicial++; }
  }
  for (let volta = 0; volta < T; volta++) {
    const grumo = extremo(1, true);
    ponto[grumo] = 0; mexer(grumo, -1);
    const vazio = extremo(0, false);
    ponto[vazio] = 1; mexer(vazio, 1);
    if (vazio === grumo) break;
  }

  const rank = new Int32Array(T);
  const prototipo = ponto.slice();
  const energiaProto = energia.slice();
  /* Fase 1: ranqueia os pontos da semente, tirando grumo a grumo. */
  for (let r = inicial - 1; r >= 0; r--) {
    const grumo = extremo(1, true);
    ponto[grumo] = 0; mexer(grumo, -1);
    rank[grumo] = r;
  }
  /* Fases 2 e 3: volta ao prototipo e preenche vazio a vazio. */
  ponto.set(prototipo);
  energia.set(energiaProto);
  for (let r = inicial; r < T; r++) {
    const vazio = extremo(0, false);
    ponto[vazio] = 1; mexer(vazio, 1);
    rank[vazio] = r;
  }

  azul = new Float32Array(T);
  for (let i = 0; i < T; i++) azul[i] = (rank[i] + 0.5) / T;
  return azul;
}

function limiar(estilo: Estilo, x: number, y: number): number {
  switch (estilo) {
    case "bayer2": return BAYER[2][y % 2][x % 2];
    case "bayer4": return BAYER[4][y % 4][x % 4];
    case "bayer8": return BAYER[8][y % 8][x % 8];
    case "blue": return blueNoise()[(y % AZUL) * AZUL + (x % AZUL)];
    case "linhas": return LINHAS[y % 4];
    case "ruido": return hash(x, y);
    case "ign": {
      const v = 0.06711056 * x + 0.00583715 * y;
      const f = 52.9829189 * (v - Math.floor(v));
      return f - Math.floor(f);
    }
    default: return 0.5;
  }
}

/* ---------------- cores ---------------- */

/* O DialKit devolve a cor em qualquer formato CSS (hex, rgb, oklch, p3).
   Quem converte para RGBA e o proprio navegador: pinta um pixel e le. */
const leitor = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
leitor.canvas.width = leitor.canvas.height = 1;
const cache = new Map<string, number[]>();

export function rgba(css: string): number[] {
  let c = cache.get(css);
  if (!c) {
    leitor.clearRect(0, 0, 1, 1);
    leitor.fillStyle = "#0000";
    leitor.fillStyle = css;
    leitor.fillRect(0, 0, 1, 1);
    c = [...leitor.getImageData(0, 0, 1, 1).data];
    cache.set(css, c);
  }
  return c;
}

const hex2 = (v: number) => Math.round(v).toString(16).padStart(2, "0");

export function ordenar(stops: Stop[]) {
  return [...stops].sort((a, b) => a.pos - b.pos);
}

/** Cor suave do gradiente em t, em RGBA 0-255 — interpolada em sRGB,
 *  como o linear-gradient da faixa do painel. `s` ja ordenado. */
function rgbaEm(s: Stop[], t: number): number[] {
  if (t <= s[0].pos) return rgba(s[0].color);
  for (let i = 0; i < s.length - 1; i++) {
    if (t <= s[i + 1].pos) {
      const a = s[i].pos, b = s[i + 1].pos;
      const ca = rgba(s[i].color), cb = rgba(s[i + 1].color);
      const f = b === a ? 0 : (t - a) / (b - a);
      return ca.map((v, k) => v + (cb[k] - v) * f);
    }
  }
  return rgba(s[s.length - 1].color);
}

/** Cor suave do gradiente em t, em hex de 8 digitos — para stops novos. */
export function corEm(stops: Stop[], t: number): string {
  const [r, g, b, a] = rgbaEm(ordenar(stops), t);
  return ("#" + hex2(r) + hex2(g) + hex2(b) + (a >= 255 ? "" : hex2(a))).toUpperCase();
}

/* OKLab (Bjorn Ottosson): distancias nele batem com o que o olho ve,
   coisa que o RGB nao faz. */
type Lab = [number, number, number];

function paraLab([r, g, b]: number[]): Lab {
  const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function deLab([L, a, b]: Lab, alfa: number): number[] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const srgb = (c: number) =>
    255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
  return [
    srgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    srgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    srgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    alfa,
  ];
}

/* ---------------- quantizacao por posicao no gradiente ---------------- */

/**
 * A parte cara roda uma vez por posicao distinta no gradiente (t, de 0
 * a 1), nao por celula: com o gradiente horizontal sao as colunas; com
 * angulo, as posicoes arredondadas de todas as celulas. Cada posicao
 * vira duas decisoes binarias, cada uma com uma fracao f ("quanto" da
 * cor de cima). O padrao de dithering, por celula, so responde "de
 * baixo ou de cima" para cada decisao:
 *
 *   cores[d1 * 2 + d2] = cor final para as escolhas (d1, d2)
 *
 * Os modos com uma decisao so repetem as cores na segunda.
 */
type Coluna = { f1: number; f2: number; cores: number[][] };

const uma = (a: number[], b: number[], f: number): Coluna => ({ f1: f, f2: 0, cores: [a, a, b, b] });

function quantizar(cfg: Config, ts: number[]): Coluna[] {
  const s = ordenar(cfg.stops);
  const n = Math.max(2, Math.round(cfg.niveis));

  /* Paleta: os stops, ou N cores do gradiente igualmente espacadas. */
  const paleta = cfg.paleta === "niveis"
    ? Array.from({ length: n }, (_, j) => rgbaEm(s, j / (n - 1)))
    : s.map((st) => rgba(st.color));

  if (cfg.modo === "vizinhos") {
    /* Posicao continua no indice da paleta: 1.5 = entre a 2a e a 3a. */
    const ultimo = paleta.length - 1;
    const indice = (tt: number) => {
      if (cfg.paleta === "niveis") return tt * ultimo;
      if (tt <= s[0].pos) return 0;
      for (let i = 0; i < s.length - 1; i++) {
        const a = s[i].pos, b = s[i + 1].pos;
        if (tt <= b) return i + (b === a ? 1 : (tt - a) / (b - a));
      }
      return ultimo;
    };
    return ts.map((tt) => {
      const v = indice(tt);
      const i = Math.min(ultimo, Math.floor(v));
      return i >= ultimo ? uma(paleta[ultimo], paleta[ultimo], 0) : uma(paleta[i], paleta[i + 1], v - i);
    });
  }

  if (cfg.modo === "proxima") {
    /* O par de cores da paleta cujo segmento passa mais perto da cor
       alvo, em OKLab. Pode juntar cores que nao sao vizinhas no
       gradiente — e o ponto, quando a paleta nao vai do claro ao escuro. */
    const lab = paleta.map(paraLab);
    return ts.map((tt) => {
      const c = paraLab(rgbaEm(s, tt));
      let melhor = uma(paleta[0], paleta[0], 0), dist = Infinity;
      for (let i = 0; i < lab.length; i++) {
        for (let j = i; j < lab.length; j++) {
          const A = lab[i], B = lab[j];
          const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
          const len = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
          const r = len === 0 ? 0 : Math.min(1, Math.max(0,
            ((c[0] - A[0]) * ab[0] + (c[1] - A[1]) * ab[1] + (c[2] - A[2]) * ab[2]) / len));
          const d = (c[0] - A[0] - r * ab[0]) ** 2 + (c[1] - A[1] - r * ab[1]) ** 2 + (c[2] - A[2] - r * ab[2]) ** 2;
          if (d < dist - 1e-9) { dist = d; melhor = uma(paleta[i], paleta[j], r); }
        }
      }
      return melhor;
    });
  }

  /* Matiz + luminosidade (Alex Charlton, "Dithering on the GPU"): a
     matiz sai dos dois stops vizinhos no circulo de cores, a luz sai de
     N degraus entre o stop mais escuro e o mais claro. Duas decisoes
     independentes; a cor final combina as duas. Stops sem saturacao
     (cinzas) nao tem matiz e so contam para a luz. */
  type Matiz = { C: number; h: number; alfa: number };
  const lch = s.map((st) => {
    const c = rgba(st.color);
    const [L, a, b] = paraLab(c);
    return { L, C: Math.hypot(a, b), h: Math.atan2(b, a), alfa: c[3] };
  });
  const cromaticos = lch.filter((c) => c.C >= 0.02);
  const Lmin = Math.min(...lch.map((c) => c.L));
  const Lmax = Math.max(...lch.map((c) => c.L));
  const degrau = (k: number) => (Lmax === Lmin ? Lmin : Lmin + ((Lmax - Lmin) * k) / (n - 1));
  const TAU = Math.PI * 2;

  return ts.map((tt) => {
    const cor = rgbaEm(s, tt);
    const [L, a, b] = paraLab(cor);
    const C = Math.hypot(a, b), h = Math.atan2(b, a);

    let hA: Matiz = { C: 0, h: 0, alfa: cor[3] }, hB = hA, f1 = 0;
    if (cromaticos.length && C >= 0.02) {
      let dA = Infinity, dB = Infinity;
      for (const c of cromaticos) {
        const abaixo = (((h - c.h) % TAU) + TAU) % TAU;
        const acima = (((c.h - h) % TAU) + TAU) % TAU;
        if (abaixo < dA) { dA = abaixo; hA = c; }
        if (acima < dB) { dB = acima; hB = c; }
      }
      f1 = hA === hB || dA + dB === 0 ? 0 : dA / (dA + dB);
    }

    const pos = Lmax === Lmin ? 0 : ((L - Lmin) / (Lmax - Lmin)) * (n - 1);
    const k = Math.min(n - 1, Math.floor(pos));
    const f2 = k >= n - 1 ? 0 : pos - k;
    const final = (m: Matiz, kk: number) =>
      deLab([degrau(Math.min(n - 1, kk)), m.C * Math.cos(m.h), m.C * Math.sin(m.h)], m.alfa);

    return { f1, f2, cores: [final(hA, k), final(hA, k + 1), final(hB, k), final(hB, k + 1)] };
  });
}

/* ---------------- progresso ---------------- */

/** Progresso da rolagem (0-1) -> fracao da barra a encher, com o
 *  multiplicador de velocidade e o minimo por baixo. */
export function alvoDaBarra(progresso: number, cfg: Pick<Config, "velocidade" | "minimo">) {
  const p = Math.min(1, Math.max(0, progresso) * cfg.velocidade);
  return cfg.minimo + (1 - cfg.minimo) * p;
}

/* ---------------- tamanho ---------------- */

/** Largura total da barra em px, com os espacos entre colunas. */
export function larguraDaBarra(cfg: Pick<Config, "cols" | "cellW" | "gap">) {
  return cfg.cols * cfg.cellW + Math.max(0, cfg.cols - 1) * cfg.gap;
}

/** Quantas colunas cabem em `largura` px. */
export function colunasEm(largura: number, cfg: Pick<Config, "cellW" | "gap">) {
  return Math.max(1, Math.floor((largura + cfg.gap) / (cfg.cellW + cfg.gap)));
}

/**
 * Posicao de cada celula no gradiente. O gradiente corre da esquerda
 * para a direita, e o angulo inclina as faixas de cor: cada linha e
 * deslocada pela altura dela vezes tan(angulo), em px de tela (com
 * tamanho e espaco das celulas), para o angulo valer na tela.
 * Normalizada de 0 a 1 entre as celulas das pontas.
 *
 * (Girar a direcao, como o linear-gradient do CSS, quase nao aparece
 * numa barra muitas vezes mais larga que alta: a inclinacao aparece.)
 *
 * Devolve as posicoes distintas (arredondadas a 1/2048, para que celulas
 * quase na mesma posicao dividam o calculo) e, por celula, o indice da
 * sua posicao nessa lista.
 */
function posicoes(cfg: Config) {
  const { cols, rows } = cfg;
  const inclinacao = Math.tan((cfg.anguloGradiente * Math.PI) / 180);
  const passoX = cfg.cellW + cfg.gap, passoY = cfg.cellH + cfg.gap;
  const meio = (rows - 1) / 2;
  const proj = (x: number, y: number) => x * passoX + (y - meio) * passoY * inclinacao;

  /* As pontas da projecao estao em cantos opostos da grade. */
  const cantos = [proj(0, 0), proj(cols - 1, 0), proj(0, rows - 1), proj(cols - 1, rows - 1)];
  const min = Math.min(...cantos), vao = Math.max(...cantos) - min;

  const ts: number[] = [];
  const vistos = new Map<number, number>();
  const indice = new Uint32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = vao === 0 ? 0 : Math.round(((proj(x, y) - min) / vao) * 2048) / 2048;
      let i = vistos.get(t);
      if (i === undefined) {
        i = ts.length;
        ts.push(t);
        vistos.set(t, i);
      }
      indice[y * cols + x] = i;
    }
  }
  return { ts, indice };
}

/* ---------------- render ---------------- */

const DEGRAUS = 4;

export function montarBarra(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  let img: ImageData | null = null;
  /* A cor de cada celula so muda quando um controle muda; a cada quadro
     so o preenchimento e aplicado por cima. */
  let base = new Uint8ClampedArray(0);
  let chave = "";

  /* O canvas tem um pixel por pixel CSS: com espaco entre as celulas, ja
     nao da para ter um pixel por celula e ampliar. */
  function aplicarTamanho(cfg: Config) {
    const w = larguraDaBarra(cfg);
    const h = cfg.rows * cfg.cellH + Math.max(0, cfg.rows - 1) * cfg.gap;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      img = null;
    }
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  function calcularBase(cfg: Config) {
    const { cols, rows, estilo, intensidade: k, vies } = cfg;
    const { ts, indice } = posicoes(cfg);
    const cs = quantizar(cfg, ts);
    base = new Uint8ClampedArray(cols * rows * 4);

    const difusao = estilo === "floyd" || estilo === "atkinson";
    const W = cols + 2;
    const at = (x: number, y: number) => (y + 1) * W + (x + 1);
    /* Um buffer de erro por decisao: matiz e luz difundem separadas. */
    const erros = difusao ? [new Float32Array(W * (rows + 2)), new Float32Array(W * (rows + 2))] : [];

    const espalhar = (erro: Float32Array, x: number, y: number, e: number) => {
      if (estilo === "floyd") {
        erro[at(x + 1, y)] += (e * 7) / 16;
        erro[at(x - 1, y + 1)] += (e * 3) / 16;
        erro[at(x, y + 1)] += (e * 5) / 16;
        erro[at(x + 1, y + 1)] += e / 16;
      } else {
        const p = e / 8;
        erro[at(x + 1, y)] += p;
        if (x + 2 < cols) erro[at(x + 2, y)] += p;
        erro[at(x - 1, y + 1)] += p;
        erro[at(x, y + 1)] += p;
        erro[at(x + 1, y + 1)] += p;
        if (y + 2 < rows) erro[at(x, y + 2)] += p;
      }
    };

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const col = cs[indice[y * cols + x]];
        let d1: number, d2: number;
        if (difusao) {
          /* Decide pela fracao mais o erro acumulado; o vies desloca o
             ponto de corte. */
          const decidir = (erro: Float32Array, f: number) => {
            const v = f + erro[at(x, y)];
            const d = v + vies >= 0.5 ? 1 : 0;
            espalhar(erro, x, y, (v - d) * k);
            return d;
          };
          d1 = decidir(erros[0], col.f1);
          d2 = decidir(erros[1], col.f2);
        } else {
          /* Limiar centrado em 0.5: a intensidade aproxima ou afasta do
             centro, o vies desloca. */
          const thr = estilo === "nenhum" ? 0.5 : 0.5 + (limiar(estilo, x, y) - 0.5) * k;
          d1 = col.f1 + thr + vies >= 1 ? 1 : 0;
          d2 = col.f2 + thr + vies >= 1 ? 1 : 0;
        }
        const c = col.cores[d1 * 2 + d2];
        base.set([c[0], c[1], c[2], c[3]], (y * cols + x) * 4);
      }
    }
  }

  /** cobertura: uma entrada por celula (y * cols + x), 0 = vazia, 1 = cheia. */
  function desenhar(cfg: Config, cobertura: Float32Array) {
    aplicarTamanho(cfg);
    const { cols, rows, cellW, cellH, gap } = cfg;
    img ??= ctx.createImageData(canvas.width, canvas.height);
    /* Um inteiro por pixel: pintar o bloco da celula vira fill(). */
    const px = new Uint32Array(img.data.buffer);
    const W = canvas.width;

    /* So o que muda a cor das celulas entra na chave do cache. */
    const { velocidade, angulo, faixa, janela, duracao, delay, curva, esqueleto: _e, ...doPadrao } = cfg;
    const nova = JSON.stringify(doPadrao);
    if (nova !== chave) {
      chave = nova;
      calcularBase(cfg);
    }

    const vazia = rgba(cfg.esqueleto);
    const cor = new Uint8ClampedArray(4);
    const cor32 = new Uint32Array(cor.buffer);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        /* A celula entra em degraus de 25%, nao num fade continuo: a
           transicao tambem fica com cara de pixel art. */
        const f = Math.floor((cobertura[i] ?? 0) * DEGRAUS) / DEGRAUS;
        const o = i * 4;
        cor[0] = vazia[0] + (base[o] - vazia[0]) * f;
        cor[1] = vazia[1] + (base[o + 1] - vazia[1]) * f;
        cor[2] = vazia[2] + (base[o + 2] - vazia[2]) * f;
        cor[3] = vazia[3] + (base[o + 3] - vazia[3]) * f;
        const x0 = x * (cellW + gap);
        for (let py = y * (cellH + gap), fim = py + cellH; py < fim; py++) {
          const linha = py * W + x0;
          px.fill(cor32[0], linha, linha + cellW);
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  return { desenhar };
}

/* ---------------- preenchimento celula a celula ---------------- */

/**
 * Divide a grade em faixas diagonais, numeradas da esquerda para a
 * direita. Cada celula cai em exatamente uma faixa, pela posicao
 * "inclinada" do seu centro:
 *
 *   posicao = x + (y - meio) * tan(angulo) * (passoH / passoW)
 *
 * passoW e passoH sao celula + espaco: o fator faz o angulo valer na
 * tela, mesmo com celulas retangulares. Com 0° cada faixa de largura 1
 * e uma coluna. Angulo positivo inclina como "/": a linha de cima vai
 * na frente.
 */
function areas(cfg: Config): number[][] {
  const { cols, rows } = cfg;
  const proporcao = (cfg.cellH + cfg.gap) / (cfg.cellW + cfg.gap);
  const inclinacao = Math.tan((cfg.angulo * Math.PI) / 180) * proporcao;
  const largura = Math.max(1, cfg.faixa);
  const meio = (rows - 1) / 2;
  const desvio = Math.abs(inclinacao) * meio;

  const total = Math.floor((cols - 1 + 2 * desvio) / largura) + 1;
  const lista: number[][] = Array.from({ length: total }, () => []);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const pos = x + (y - meio) * inclinacao + desvio;
      lista[Math.min(total - 1, Math.max(0, Math.floor(pos / largura)))].push(y * cols + x);
    }
  }
  /* Nas pontas a diagonal deixa faixas vazias; o agendador ja pula
     faixas completas, e uma vazia conta como completa. */
  return lista;
}

/**
 * A rolagem diz quantas celulas devem estar cheias; este agendador anda
 * ate esse numero uma celula por vez. O intervalo medio e `delay` ms;
 * a `curva` decide como ele se distribui ao longo da barra (ease-in:
 * comeca devagar e acelera).
 *
 * Para encher: pega as `janela` faixas incompletas mais a esquerda,
 * junta as celulas vazias delas e sorteia uma. Janela 1 = faixa por
 * faixa, com as celulas de cada uma em ordem aleatoria; janelas maiores
 * deixam a frente do preenchimento mais esfarrapada.
 *
 * Para esvaziar (rolando para cima), o espelho: sorteia entre as celulas
 * cheias das `janela` faixas ocupadas mais a direita. Esvaziar e
 * instantaneo; so o encher tem a animacao de `duracao`.
 */
/**
 * Le a curva de Bezier [x1, y1, x2, y2] como "tempo -> quanto da barra
 * esta cheio" e devolve em que tempo (0-1) a barra alcanca cada celula
 * k = 0..n. Varre o parametro da curva em passos finos; o maximo
 * acumulado de y cobre curvas que passam de 1 e voltam.
 */
function temposDaCurva([x1, y1, x2, y2]: [number, number, number, number], n: number) {
  const bez = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  const tempos = new Float32Array(n + 1);
  const PASSOS = 4096;
  let k = 1;
  let topo = 0;
  for (let i = 1; i <= PASSOS && k <= n; i++) {
    const t = i / PASSOS;
    topo = Math.max(topo, bez(y1, y2, t));
    while (k <= n && topo >= k / n) tempos[k++] = bez(x1, x2, t);
  }
  for (; k <= n; k++) tempos[k] = 1;
  return tempos;
}

export function montarPreenchimento() {
  let chave = "";
  /** Quando cada celula comecou a encher; -1 = vazia. */
  let inicio = new Float64Array(0);
  let grupos: number[][] = [];
  let porArea = new Uint32Array(0);
  let area = new Int32Array(0);
  let cobertura = new Float32Array(0);
  let cheias = 0;
  let proximo = 0;
  let ocioso = true;
  /** Momento relativo (0-1) em que a barra alcanca a celula k, pela curva. */
  let tempos = new Float32Array(1);
  let chaveRitmo = "";
  let mudou = true;

  /* Mudou a grade ou o desenho das areas: recomeca vazio, e o agendador
     enche de novo ate o alvo. */
  function refazer(cfg: Config) {
    const n = cfg.cols * cfg.rows;
    grupos = areas(cfg);
    inicio = new Float64Array(n).fill(-1);
    porArea = new Uint32Array(grupos.length);
    area = new Int32Array(n);
    grupos.forEach((g, a) => g.forEach((i) => (area[i] = a)));
    cobertura = new Float32Array(n);
    cheias = 0;
  }

  const sortear = (lista: number[]) => lista[Math.floor(Math.random() * lista.length)];

  function encher(janela: number, agora: number) {
    const candidatas: number[] = [];
    for (let a = 0, n = 0; a < grupos.length && n < janela; a++) {
      if (porArea[a] === grupos[a].length) continue;
      n++;
      for (const i of grupos[a]) if (inicio[i] < 0) candidatas.push(i);
    }
    const i = sortear(candidatas);
    inicio[i] = agora;
    porArea[area[i]]++;
    cheias++;
  }

  function esvaziar(janela: number) {
    const candidatas: number[] = [];
    for (let a = grupos.length - 1, n = 0; a >= 0 && n < janela; a--) {
      if (porArea[a] === 0) continue;
      n++;
      for (const i of grupos[a]) if (inicio[i] >= 0) candidatas.push(i);
    }
    const i = sortear(candidatas);
    inicio[i] = -1;
    porArea[area[i]]--;
    cheias--;
  }

  /** Avanca o agendador ate `agora` e devolve a cobertura de cada celula. */
  function passo(cfg: Config, fracao: number, agora: number) {
    const nova = [cfg.cols, cfg.rows, cfg.angulo, cfg.faixa, cfg.cellW, cfg.cellH, cfg.gap].join();
    if (nova !== chave) {
      chave = nova;
      refazer(cfg);
      mudou = true;
    }
    const ritmo = cfg.curva.join() + "|" + inicio.length;
    if (ritmo !== chaveRitmo) {
      chaveRitmo = ritmo;
      tempos = temposDaCurva(cfg.curva, inicio.length);
    }
    const alvo = Math.round(fracao * inicio.length);
    const janela = Math.max(1, cfg.janela);

    /* Parado no alvo, o relogio acompanha o agora: quando a rolagem
       pedir mais, a primeira celula sai na hora, sem rajada acumulada. */
    if (cheias === alvo) {
      ocioso = true;
    } else {
      if (ocioso) proximo = agora;
      ocioso = false;
      while (cheias !== alvo && agora >= proximo) {
        /* O intervalo depende de onde a barra esta: e o trecho da curva
           entre esta celula e a vizinha, escalado para que a media
           continue sendo o delay. */
        const k = cheias < alvo ? cheias : cheias - 1;
        cheias < alvo ? encher(janela, agora) : esvaziar(janela);
        if (cfg.delay > 0) proximo += cfg.delay * inicio.length * (tempos[k + 1] - tempos[k]);
      }
    }

    for (let i = 0; i < inicio.length; i++) {
      const t = inicio[i];
      const v = t < 0 ? 0 : cfg.duracao <= 0 ? 1 : Math.min(1, (agora - t) / cfg.duracao);
      if (v !== cobertura[i]) {
        cobertura[i] = v;
        mudou = true;
      }
    }
    return cobertura;
  }

  /** Se a cobertura mudou desde a ultima consulta. */
  function consumirMudanca() {
    const m = mudou;
    mudou = false;
    return m;
  }

  return { passo, consumirMudanca };
}

/* ---------------- persistencia ---------------- */

/* O DialKit guarda os valores dos controles, mas nao quantos stops
   existem — isso e estrutura do painel. A lista fica guardada aqui. */
export function carregarStops(chave: string, padrao: Stop[]): Stop[] {
  try {
    const salvo = JSON.parse(localStorage.getItem(chave) ?? "null");
    if (Array.isArray(salvo) && salvo.length >= 2) return salvo;
  } catch {}
  return structuredClone(padrao);
}

export function salvarStops(chave: string, stops: Stop[]) {
  try {
    localStorage.setItem(chave, JSON.stringify(stops));
  } catch {}
}
