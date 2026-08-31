import { PARAMS, load, save, defaults, STORAGE_KEY } from "./crt-config";
import type { Instance } from "./crt";

export type Target = { id: string; brand: string; instance: Instance; hi: string; lo: string };

const CSS = `
.crtp{position:fixed;top:12px;right:12px;z-index:9999;width:320px;max-height:calc(100vh - 24px);
  display:flex;flex-direction:column;font:12px/1.4 ui-monospace,monospace;color:#eee;
  background:#111;border:1px solid #333;border-radius:10px;box-shadow:0 8px 40px rgb(0 0 0/.6)}
.crtp__bar{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #333;cursor:move}
.crtp__bar b{flex:1;font-weight:600;letter-spacing:.04em}
.crtp__bar button{background:#222;color:#eee;border:1px solid #444;border-radius:5px;padding:3px 7px;cursor:pointer;font:inherit}
.crtp__bar button:hover{background:#2c2c2c}
.crtp__body{overflow-y:auto;padding:8px 10px 12px}
.crtp[data-open="0"] .crtp__body{display:none}
.crtp h4{margin:12px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#ffcc00}
.crtp h4:first-child{margin-top:0}
.crtp__row{display:grid;grid-template-columns:1fr 56px;gap:6px;align-items:center;margin-bottom:2px}
.crtp__row label{grid-column:1/-1;color:#aaa;font-size:11px}
.crtp__row input[type=range]{width:100%;accent-color:#ffcc00}
.crtp__row input[type=number]{width:100%;background:#1c1c1c;color:#eee;border:1px solid #3a3a3a;border-radius:4px;padding:2px 4px;font:inherit}
.crtp__col{display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;margin-bottom:6px}
.crtp__col span{color:#aaa}
.crtp__col input[type=color]{width:34px;height:22px;padding:0;border:1px solid #3a3a3a;background:#1c1c1c;border-radius:4px}
.crtp__note{margin-top:10px;color:#777;font-size:10px;line-height:1.5}
`;

export function mountPanel(targets: Target[]) {
  const cfg = load();

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement("div");
  el.className = "crtp";
  el.dataset.open = "1";
  el.innerHTML = `
    <div class="crtp__bar">
      <b>CRT — calibragem</b>
      <button data-act="copy" title="Copia o JSON para colar em crt-config.ts">Copiar</button>
      <button data-act="reset" title="Volta aos padroes">Reset</button>
      <button data-act="toggle">–</button>
    </div>
    <div class="crtp__body"></div>`;
  const body = el.querySelector(".crtp__body") as HTMLElement;

  // ---- cores por case ------------------------------------------------
  const h = document.createElement("h4");
  h.textContent = "Cor do card";
  body.appendChild(h);
  for (const t of targets) {
    const row = document.createElement("div");
    row.className = "crtp__col";
    row.innerHTML = `<span>${t.brand}</span>
      <input type="color" value="${t.hi}" data-role="hi" title="Claro (centro do gradiente)">
      <input type="color" value="${t.lo}" data-role="lo" title="Escuro (borda)">`;
    const [hi, lo] = row.querySelectorAll("input");
    const apply = () => {
      t.hi = (hi as HTMLInputElement).value;
      t.lo = (lo as HTMLInputElement).value;
      t.instance.setColors(t.hi, t.lo);
      saveColors(targets);
    };
    hi.addEventListener("input", apply);
    lo.addEventListener("input", apply);
    body.appendChild(row);
  }

  // Vinheta e propriedade do vidro, nao da marca: uma so para os tres.
  const vigRow = document.createElement("div");
  vigRow.className = "crtp__col";
  vigRow.innerHTML = `<span>Vinheta <em style="color:#666;font-style:normal">(todos)</em></span>
    <input type="color" value="${loadVignette()}" title="Cor para onde as bordas puxam">
    <span></span>`;
  {
    const inp = vigRow.querySelector("input") as HTMLInputElement;
    const apply = () => {
      for (const t of targets) t.instance.setVignetteColor(inp.value);
      saveVignette(inp.value);
    };
    inp.addEventListener("input", apply);
    apply();
  }
  body.appendChild(vigRow);

  // ---- sliders, agrupados -------------------------------------------
  let group = "";
  const inputs: { p: (typeof PARAMS)[number]; range: HTMLInputElement; num: HTMLInputElement }[] = [];

  for (const p of PARAMS) {
    if (p.group !== group) {
      group = p.group;
      const t = document.createElement("h4");
      t.textContent = group;
      body.appendChild(t);
    }
    const row = document.createElement("div");
    row.className = "crtp__row";
    row.innerHTML = `<label>${p.label}</label>
      <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${cfg[p.key]}">
      <input type="number" min="${p.min}" max="${p.max}" step="${p.step}" value="${cfg[p.key]}">`;
    const range = row.querySelector('input[type=range]') as HTMLInputElement;
    const num = row.querySelector('input[type=number]') as HTMLInputElement;

    const set = (v: number) => {
      cfg[p.key] = v;
      range.value = String(v);
      num.value = String(v);
      push();
    };
    range.addEventListener("input", () => set(parseFloat(range.value)));
    num.addEventListener("input", () => set(parseFloat(num.value)));
    inputs.push({ p, range, num });
    body.appendChild(row);
  }

  const note = document.createElement("p");
  note.className = "crtp__note";
  note.textContent =
    "Ajustes salvam sozinhos neste navegador. Use Copiar e cole os valores em src/scripts/crt-config.ts para fixar como padrao do site.";
  body.appendChild(note);

  function push() {
    for (const t of targets) t.instance.setConfig(cfg);
    save(cfg);
  }

  el.querySelector('[data-act="toggle"]')!.addEventListener("click", (e) => {
    const open = el.dataset.open === "1";
    el.dataset.open = open ? "0" : "1";
    (e.target as HTMLElement).textContent = open ? "+" : "–";
  });

  el.querySelector('[data-act="reset"]')!.addEventListener("click", () => {
    const d = defaults();
    for (const { p, range, num } of inputs) {
      cfg[p.key] = d[p.key];
      range.value = String(d[p.key]);
      num.value = String(d[p.key]);
    }
    localStorage.removeItem(STORAGE_KEY);
    push();
  });

  el.querySelector('[data-act="copy"]')!.addEventListener("click", async (e) => {
    const lines = PARAMS.map((p) => `  ${p.key}: ${cfg[p.key]},`).join("\n");
    const cores =
      targets.map((t) => `  ${t.id}: { hi: "${t.hi}", lo: "${t.lo}" },`).join("\n") +
      `\n  vinheta: "${loadVignette()}",`;
    const txt = `// valores calibrados\n{\n${lines}\n}\n\n// cores\n{\n${cores}\n}`;
    try {
      await navigator.clipboard.writeText(txt);
      const b = e.target as HTMLElement;
      b.textContent = "Copiado";
      setTimeout(() => (b.textContent = "Copiar"), 1200);
    } catch {
      console.log(txt);
    }
  });

  // arrastar pela barra
  const bar = el.querySelector(".crtp__bar") as HTMLElement;
  let drag: { x: number; y: number } | null = null;
  bar.addEventListener("pointerdown", (ev) => {
    if ((ev.target as HTMLElement).tagName === "BUTTON") return;
    const r = el.getBoundingClientRect();
    drag = { x: ev.clientX - r.left, y: ev.clientY - r.top };
    bar.setPointerCapture(ev.pointerId);
  });
  bar.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    el.style.left = `${ev.clientX - drag.x}px`;
    el.style.top = `${ev.clientY - drag.y}px`;
    el.style.right = "auto";
  });
  bar.addEventListener("pointerup", () => (drag = null));

  document.body.appendChild(el);
  push();
}

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
    return localStorage.getItem(VIG_KEY) || "#000000";
  } catch {
    return "#000000";
  }
}

function saveVignette(hex: string) {
  try {
    localStorage.setItem(VIG_KEY, hex);
  } catch {
    /* sem persistencia */
  }
}
