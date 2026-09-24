import { PARAMS, load } from "./crt-config";

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;

uniform vec2  uResolution;
uniform float uTime;
uniform sampler2D uLogo;
uniform vec2  uLogoScale;
uniform vec3  uColorHi;
uniform vec3  uColorLo;
uniform float uGlitch;
uniform float uLogoAlpha;
uniform vec3  uVignetteColor;
/* Raio de cada canto, em px de dispositivo: (topo-esq, topo-dir,
   base-dir, base-esq). O card usa os quatro iguais; o banner dos cases
   arredonda so o lado que encosta na borda do painel. */
uniform vec4  uRadii;

uniform float uCurvature, uScanIntensity, uScanCount, uScanSpeed, uMask,
              uAberration, uVignette, uGlare, uNoise, uFlicker, uBrightness;
/* Chuvisco de TV fora do ar: 0 e a cena normal, 1 e so estatica. Entra
   antes das scanlines e da mascara, entao a estatica sai vestida com o
   mesmo vidro do resto — que e o ponto. */
uniform float uStatic, uStaticScale, uStaticSpeed;
uniform float uBlockAmount, uBlockSize, uRgbSplit, uWave, uJitter, uDropout;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float hash1(float x){ return fract(sin(x * 12.9898) * 43758.5453123); }

/* Distancia com sinal ate um retangulo de cantos arredondados. Negativa
   dentro, positiva fora. E com ela que o proprio shader recorta os
   cantos: clip-path e border-radius no elemento nao vencem a camada de
   composicao propria que o canvas WebGL ganha no GPU. */
float rrect(vec2 p, vec2 meio, float r){
  vec2 q = abs(p) - meio + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

/* Curvatura do vidro: empurra as bordas para fora como um tubo. */
vec2 curve(vec2 uv){
  vec2 c = uv * 2.0 - 1.0;
  vec2 off = abs(c.yx) / vec2(5.0, 4.0);
  c += c * off * off * uCurvature;
  return c * 0.5 + 0.5;
}

/* O conteudo do card, procedural: gradiente radial + logo por cima.
   Espelha o radial-gradient do CSS para o canvas casar com o fallback. */
vec3 scene(vec2 uv){
  /* O fundo e amostrado na posicao presa ao intervalo, entao a curvatura
     nao deixa canto vazio. Sem isso sobrava uma moldura preta quadrada
     por cima do clip-path, e o raio parecia nao funcionar. */
  vec2 c = clamp(uv, 0.0, 1.0);
  vec2 p = c - vec2(0.30, 0.80);
  p.x *= uResolution.x / uResolution.y;
  float t = smoothstep(0.0, 1.0, length(p) / 1.15);
  vec3 bg = mix(uColorHi, uColorLo, t);

  /* O logo, ao contrario do fundo, respeita o limite: fora dele nao
     desenha nada, para nao esticar nas bordas. */
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return bg;
  vec2 luv = (uv - 0.5) / uLogoScale + 0.5;
  if (luv.x < 0.0 || luv.x > 1.0 || luv.y < 0.0 || luv.y > 1.0) return bg;
  vec4 tex = texture2D(uLogo, vec2(luv.x, 1.0 - luv.y));
  return mix(bg, tex.rgb, tex.a * uLogoAlpha);
}

void main(){
  vec2 uv = curve(vUv);

  float g = uGlitch;

  /* ondulacao vertical lenta */
  uv.x += sin(uv.y * 12.0 + uTime * 3.0) * uWave * g;

  /* tremor horizontal, atualizado em degraus para nao virar deslize suave */
  uv.x += (hash1(floor(uTime * 30.0)) - 0.5) * uJitter * g;

  /* deslocamento em blocos: so algumas faixas saltam por vez */
  float row = floor(uv.y * uBlockSize);
  float slot = floor(uTime * 12.0);
  float active = step(1.0 - g * 0.8, hash(vec2(row, slot)));
  uv.x += (hash(vec2(row, slot + 3.7)) - 0.5) * uBlockAmount * g * active;

  /* aberracao cromatica constante + separacao RGB que cresce no pico */
  float split = uAberration + uRgbSplit * g;
  vec3 col;
  col.r = scene(uv + vec2(split, 0.0)).r;
  col.g = scene(uv).g;
  col.b = scene(uv - vec2(split, 0.0)).b;

  /* chuvisco: cinza aleatorio em blocos, sorteado de novo a cada degrau
     de tempo — continuo demais viraria textura parada */
  if (uStatic > 0.0) {
    vec2 np = floor(gl_FragCoord.xy / max(uStaticScale, 1.0));
    float seed = floor(uTime * uStaticSpeed);
    /* Um hash so, com coordenadas inteiras, se organiza em faixas
       diagonais — parece tecido, nao neve. Dois sorteios com eixos
       trocados e semente diferente quebram o padrao. */
    float a = hash(np + vec2(seed * 13.7, seed * 7.31));
    float b = hash(np.yx * 1.37 + vec2(seed * 5.23, seed * 11.1));
    float neve = fract(a * 1.618 + b);
    col = mix(col, vec3(0.12 + neve * 0.88), uStatic);
  }

  /* falhas: linhas inteiras apagam por um quadro */
  float drop = hash(vec2(floor(uv.y * uScanCount), floor(uTime * 20.0)));
  col *= 1.0 - step(1.0 - g * uDropout * 0.15, drop);

  /* scanlines rolando devagar */
  float scan = sin((uv.y + uTime * uScanSpeed * 0.05) * uScanCount * 3.14159);
  col *= 1.0 - uScanIntensity * 0.5 * (0.5 + 0.5 * scan);

  /* mascara de abertura: colunas RGB do fosforo */
  float m = mod(gl_FragCoord.x, 3.0);
  vec3 maskCol = vec3(
    m < 1.0 ? 1.0 : 0.75,
    (m >= 1.0 && m < 2.0) ? 1.0 : 0.75,
    m >= 2.0 ? 1.0 : 0.75
  );
  col = mix(col, col * maskCol, uMask);

  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * uNoise;
  col *= 1.0 + sin(uTime * 41.0) * uFlicker * 0.5;

  float glare = pow(max(0.0, 1.0 - distance(vUv, vec2(0.32, 0.22))), 3.0);
  col += glare * uGlare * 0.25;

  /* vig = 1 no centro, 0 na borda. Misturar em vez de multiplicar
     permite vinheta colorida; com preto o resultado e o mesmo de antes. */
  vec2 v = vUv * (1.0 - vUv.yx);
  float vig = clamp(pow(v.x * v.y * 18.0, uVignette * 0.55), 0.0, 1.0);
  col = mix(uVignetteColor, col, vig);

  /* Recorte dos cantos. A meia unidade de suavizacao evita serrilhado na
     curva. Alfa pre-multiplicado, que e o que o canvas espera por padrao. */
  vec2 meio = uResolution * 0.5;
  /* p.x > 0 e a direita, p.y > 0 o topo — vUv.y vale 1 no alto. Cada
     quadrante e simetrico, entao basta escolher o raio do canto e usar a
     mesma conta de sempre. */
  vec2 p = vUv * uResolution - meio;
  float r = p.x < 0.0
    ? (p.y > 0.0 ? uRadii.x : uRadii.w)
    : (p.y > 0.0 ? uRadii.y : uRadii.z);
  float d = rrect(p, meio, r);
  float a = 1.0 - smoothstep(-0.5, 0.5, d);
  if (a <= 0.001) discard;

  gl_FragColor = vec4(col * uBrightness * a, a);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) ?? "erro ao compilar shader");
  }
  return sh;
}

let tinta: CanvasRenderingContext2D | null = null;

/** Qualquer cor CSS em RGB 0-1. Hex vai pelo caminho curto; o resto —
 *  OKLCH, P3, rgb(), que o seletor do DialKit pode devolver — e pintado
 *  num pixel de canvas e lido de volta, que e o navegador convertendo. */
function hexToRgb(cor: string): [number, number, number] {
  const c = cor.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) {
    const h = c.slice(1);
    const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    const n = parseInt(full, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  tinta ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!tinta) return [0, 0, 0];
  tinta.clearRect(0, 0, 1, 1);
  tinta.fillStyle = "#000";
  tinta.fillStyle = c;
  tinta.fillRect(0, 0, 1, 1);
  const [r, g, b] = tinta.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

export type Instance = {
  setConfig(cfg: Record<string, number>): void;
  setColors(hi: string, lo: string): void;
  setVignetteColor(hex: string): void;
  setLogoVisible(v: boolean): void;
  /** Chuvisco: 0 apaga, 1 cobre tudo. scale e o tamanho do grao em px de
   *  dispositivo, speed os sorteios por segundo. */
  setStatic(amount: number, scale?: number, speed?: number): void;
  /** Liga ou desliga o laco de animacao. So faz diferenca com
   *  manual: true — as outras instancias nascem ligadas. */
  setActive(on: boolean): void;
  destroy(): void;
};

export type Options = {
  /** Raio de cada canto em px de CSS, na ordem topo-esq, topo-dir,
   *  base-dir, base-esq. Ausente: os quatro seguem cfg.cardRadius e o
   *  valor tambem vai para o --radius do card, que e o que o painel
   *  calibra. E uma funcao porque o banner muda de canto conforme a
   *  largura — no desktop ele e a metade esquerda, no mobile o topo. */
  radii?: () => [number, number, number, number];
  /** Parametros presos nesta instancia, por cima da calibragem global.
   *  Sobrevivem ao setConfig do painel: sao aplicados na hora de enviar
   *  os uniforms, nao na copia da configuracao. */
  overrides?: Record<string, number>;
  /** Nao anima sozinho ao entrar na tela: so quando setActive(true).
   *  Para efeitos de instante, como o chuvisco do lightbox — um laco a
   *  60fps esperando uma troca de canal que talvez nunca venha pesa a
   *  maquina inteira. */
  manual?: boolean;
  /** Fracao da resolucao do buffer. 0.5 desenha um quarto dos pixels —
   *  para estatica, que e ruido, a diferenca nao aparece. */
  resolucao?: number;
};

/**
 * Liga o efeito num card. O canvas cobre o card e so aparece se o WebGL
 * inicializar — se falhar, o CSS por baixo continua sendo o visual.
 *
 * Sem logo (null) desenha so o fundo: e o caso do banner dos cases, onde
 * o mockup fica por cima do canvas, limpo.
 */
export function mount(
  canvas: HTMLCanvasElement,
  logo: HTMLImageElement | null,
  opts: Options = {}
): Instance | null {
  const { radii, overrides = {}, manual = false, resolucao = 1 } = opts;
  let ativo = !manual;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" });
  if (!gl) return null;

  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link falhou");
  } catch (e) {
    console.warn("[crt] shader falhou, mantendo o fallback CSS:", e);
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  if (logo) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, logo);
  } else {
    /* Um pixel transparente: o shader continua amostrando a textura, mas
       nao desenha nada por cima do gradiente. */
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  }

  /* O raio nao passa pelo shader: o canvas usa border-radius: inherit,
     entao basta escrever o token no card. */
  const host = canvas.closest<HTMLElement>(".card") ?? canvas.parentElement;
  const applyRadius = () => !radii && host?.style.setProperty("--radius", `${cfg.cardRadius}px`);

  const uni: Record<string, WebGLUniformLocation | null> = {};
  const U = (n: string) => (uni[n] ??= gl.getUniformLocation(prog, n));

  let cfg = load();
  let colorHi: [number, number, number] = [0.82, 0.13, 0.28];
  let colorLo: [number, number, number] = [0.54, 0.0, 0.16];
  let colorVig: [number, number, number] = [0, 0, 0];

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* No hover o card expande e o logo do CSS assume a esquerda — o canvas
     apaga o dele e fica so com o fundo CRT. */
  let logoAlpha = logo ? 1 : 0;
  let estatica = 0;
  let estaticaScale = 2;
  let estaticaSpeed = 24;

  // ---- animacao da intensidade -------------------------------------
  let glitch = 0;
  let nextBurst = 0;
  let burstEnd = 0;
  let burstPeak = 0;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  function intensityAt(t: number) {
    // deriva constante entre idleMin e idleMax
    const drift = (Math.sin(t * cfg.driftSpeed) + Math.sin(t * cfg.driftSpeed * 1.7 + 1.3)) * 0.25 + 0.5;
    const base = cfg.idleMin + (cfg.idleMax - cfg.idleMin) * drift;

    if (t >= nextBurst) {
      burstPeak = rand(cfg.burstMin, cfg.burstMax);
      burstEnd = t + cfg.burstDuration;
      nextBurst = burstEnd + rand(cfg.intervalMin, cfg.intervalMax);
    }
    if (t < burstEnd) {
      const p = 1 - (burstEnd - t) / cfg.burstDuration; // 0..1 dentro do pico
      // sobe rapido, cai devagar
      const env = p < cfg.burstAttack ? p / cfg.burstAttack : 1 - (p - cfg.burstAttack) / (1 - cfg.burstAttack);
      return base + burstPeak * Math.max(0, env);
    }
    return base;
  }

  let dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2) * resolucao;
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw(tMs: number) {
    resize();
    const t = tMs / 1000;
    glitch = reduced ? 0 : intensityAt(t);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(U("uResolution"), canvas.width, canvas.height);
    /* O raio vem em px de CSS; o buffer esta em px de dispositivo. */
    const cantos = radii ? radii() : ([cfg.cardRadius ?? 16, cfg.cardRadius ?? 16, cfg.cardRadius ?? 16, cfg.cardRadius ?? 16] as const);
    gl.uniform4f(U("uRadii"), cantos[0] * dpr, cantos[1] * dpr, cantos[2] * dpr, cantos[3] * dpr);
    gl.uniform1f(U("uTime"), reduced ? 0 : t);
    gl.uniform1f(U("uGlitch"), glitch);
    gl.uniform1f(U("uLogoAlpha"), logoAlpha);
    gl.uniform1f(U("uStatic"), estatica);
    gl.uniform1f(U("uStaticScale"), estaticaScale * dpr);
    gl.uniform1f(U("uStaticSpeed"), estaticaSpeed);
    gl.uniform3fv(U("uColorHi"), colorHi);
    gl.uniform3fv(U("uColorLo"), colorLo);
    gl.uniform3fv(U("uVignetteColor"), colorVig);

    // encaixe do logo: mesma regra do CSS (contain, 80% x 66%)
    if (logo) {
      const s = Math.min(
        (0.8 * canvas.width) / logo.naturalWidth,
        (0.66 * canvas.height) / logo.naturalHeight
      );
      gl.uniform2f(
        U("uLogoScale"),
        (logo.naturalWidth * s) / canvas.width,
        (logo.naturalHeight * s) / canvas.height
      );
    } else {
      gl.uniform2f(U("uLogoScale"), 1, 1);
    }

    for (const p of PARAMS) {
      if (p.uniform) gl.uniform1f(U(p.uniform), overrides[p.key] ?? cfg[p.key]);
    }

    gl.uniform1i(U("uLogo"), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---- laco, pausado fora da tela e com a aba oculta ------------------
  let raf = 0;
  let visible = false;
  const loop = (t: number) => {
    draw(t);
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (!raf && ativo && visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      visible ? start() : stop();
      if (reduced && visible) draw(0); // um quadro estatico
    },
    { rootMargin: "100px" }
  );
  io.observe(canvas);

  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVis);

  canvas.dataset.crt = "on";
  applyRadius();
  draw(0);

  return {
    setConfig(next) {
      cfg = next;
      applyRadius();
      if (!raf) draw(performance.now());
    },
    setColors(hi, lo) {
      colorHi = hexToRgb(hi);
      colorLo = hexToRgb(lo);
      if (!raf) draw(performance.now());
    },
    setVignetteColor(hex) {
      colorVig = hexToRgb(hex);
      if (!raf) draw(performance.now());
    },
    setLogoVisible(v) {
      logoAlpha = logo && v ? 1 : 0;
      if (!raf) draw(performance.now());
    },
    setStatic(amount, scale, speed) {
      estatica = amount;
      if (scale !== undefined) estaticaScale = scale;
      if (speed !== undefined) estaticaSpeed = speed;
      if (!raf) draw(performance.now());
    },
    setActive(on) {
      ativo = on;
      on ? start() : stop();
    },
    destroy() {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      delete canvas.dataset.crt;
    },
  };
}
