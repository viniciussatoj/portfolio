// @ts-check
/**
 * Endpoint do dev server para o botao "Salvar em dither-config.ts" do
 * painel das barras (dither-progress-panel.ts).
 *
 * Recebe os ajustes em JSON e reescreve so os valores dentro do objeto
 * DITHER, linha a linha, preservando os comentarios do arquivo. Chave
 * que nao existe no arquivo e recusada: o painel nao cria campos novos.
 *
 * So existe com `astro dev` (apply: "serve"); o build nao tem isto.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ARQUIVO = fileURLToPath(new URL("../src/scripts/dither-config.ts", import.meta.url));
const ROTA = "/__salvar-dither-config";

/** Numeros com no maximo 4 casas, sem zeros sobrando. */
const num = (n) => String(Math.round(n * 10000) / 10000);

function formatar(valor) {
  if (typeof valor === "number") return num(valor);
  if (typeof valor === "string") return JSON.stringify(valor);
  if (Array.isArray(valor) && valor.every((v) => typeof v === "number")) return `[${valor.map(num).join(", ")}]`;
  throw new Error(`valor nao suportado: ${JSON.stringify(valor)}`);
}

function formatarStops(nome, stops) {
  const linhas = [...stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s, i) => `    { id: ${i + 1}, pos: ${num(s.pos)}, color: ${JSON.stringify(String(s.color))} },`);
  return `  ${nome}: [\n${linhas.join("\n")}\n  ],`;
}

/**
 * Troca os valores no texto do arquivo; devolve o texto novo.
 * Com `caso`, os stops vao para o bloco daquele case em CORES; sem,
 * para os stops de DITHER.
 */
export function aplicarAjustes(texto, ajustes, caso) {
  let saida = texto;
  if (caso !== undefined && !/^[a-z]+$/.test(caso)) throw new Error(`case invalido: ${caso}`);
  for (const [chave, valor] of Object.entries(ajustes)) {
    if (chave === "stops") {
      if (!Array.isArray(valor) || valor.length < 2) throw new Error("stops invalidos");
      const nome = caso ?? "stops";
      const re = new RegExp(`^ {2}${nome}: \\[[\\s\\S]*?\\n {2}\\],`, "m");
      if (!re.test(saida)) throw new Error(`bloco de cores nao encontrado: ${nome}`);
      saida = saida.replace(re, formatarStops(nome, valor));
      continue;
    }
    if (!/^[a-zA-Z]+$/.test(chave)) throw new Error(`chave invalida: ${chave}`);
    const re = new RegExp(`^( {2}${chave}: ).*,$`, "m");
    if (!re.test(saida)) throw new Error(`chave desconhecida: ${chave}`);
    saida = saida.replace(re, `$1${formatar(valor)},`);
  }
  return saida;
}

/** @returns {import("vite").Plugin} */
export function salvarDitherConfig() {
  return {
    name: "salvar-dither-config",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(ROTA, async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end();
        }
        try {
          let corpo = "";
          for await (const parte of req) corpo += parte;
          const ajustes = JSON.parse(corpo);
          const caso = new URL(req.url ?? "/", "http://x").searchParams.get("caso") ?? undefined;
          const atual = await readFile(ARQUIVO, "utf8");
          const novo = aplicarAjustes(atual, ajustes, caso);
          /* Gravar dispara o recarregamento da pagina; igual, nem mexe. */
          if (novo !== atual) await writeFile(ARQUIVO, novo);
          res.statusCode = 200;
          res.end(novo !== atual ? "salvo" : "igual");
        } catch (erro) {
          res.statusCode = 400;
          res.end(String(erro instanceof Error ? erro.message : erro));
        }
      });
    },
  };
}
