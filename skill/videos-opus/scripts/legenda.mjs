// Legenda queimada pelo FFmpeg/libass: agrupa palavras, aplica correções e gera <pasta>/legenda.ass.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { FONTES } from "./ferramentas.mjs";
import { corrige } from "./correcoes.mjs";

export const CORES = { branco: "FFFFFF", preto: "000000", amarelo: "FFD400", laranja: "F74502", terracota: "C14B22", verde: "19C23A", rosa: "FF3EA5", azul: "2D9CFF", vermelho: "FF2D2D", areia: "F5EFE4", chocolate: "3B1F0E", roxo: "8B5CF6" };
const FONTES_MAP = {
  bebas: { arq: "BebasNeue-Regular.ttf", nome: "Bebas Neue", tam: 150, chars: 15 },
  anton: { arq: "Anton-Regular.ttf", nome: "Anton", tam: 124, chars: 15 },
  montserrat: { arq: "Montserrat-Black.ttf", nome: "Montserrat Black", tam: 98, chars: 14 },
  poppins: { arq: "Poppins-ExtraBold.ttf", nome: "Poppins ExtraBold", tam: 100, chars: 14 },
  garamond: { arq: "EBGaramond-Regular.ttf", nome: "EB Garamond", tam: 104, chars: 18 },
};
export function corASS(c, alfa = "00") {
  const hex = (CORES[String(c).toLowerCase()] || String(c).replace(/^#/, "")).padStart(6, "0").slice(-6).toUpperCase();
  return `&H${alfa}${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}`;
}
const tASS = (t) => { const cs = Math.max(0, Math.round(t * 100)); const h = Math.floor(cs / 360000), m = Math.floor(cs / 6000) % 60, s = Math.floor(cs / 100) % 60, c = cs % 100; return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`; };
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/[{}]/g, "");

function agrupar(palavras, maxPalavras, maxChars) {
  const grupos = [];
  let g = [];
  palavras.forEach((p, i) => {
    g.push(p);
    const prox = palavras[i + 1];
    const chars = g.map((x) => x.t).join(" ").length;
    const proxChars = prox ? chars + 1 + prox.t.length : 0;
    if (!prox || g.length >= maxPalavras || proxChars > maxChars * 2 || /[.?!]$/.test(p.t) || (/,$/.test(p.t) && g.length >= 2) || prox.ini - p.fim > 0.45) {
      grupos.push(g); g = [];
    }
  });
  // não termina legenda em palavrinha solta ("de", "a", "um"): ela passa para a legenda seguinte
  const LIGA = /^(a|o|as|os|e|é|de|da|do|das|dos|em|no|na|nos|nas|um|uma|que|com|por|pra|para|se|ao|à|me|te|eu|tu|sua|seu|meu|minha|mais|mas|nem|ou)$/i;
  for (let i = 0; i < grupos.length - 1; i++) {
    const g = grupos[i], ult = g[g.length - 1];
    if (g.length > 1 && LIGA.test(ult.t.replace(/[^\p{L}]/gu, "")) && !/[.,?!:;]$/.test(ult.t) && grupos[i + 1][0].ini - ult.fim < 0.45) {
      grupos[i + 1].unshift(g.pop());
    }
  }
  return grupos.map((g, i) => ({ palavras: g, ini: g[0].ini, fim: Math.min(grupos[i + 1]?.[0]?.ini ?? Infinity, g[g.length - 1].fim + 0.5) }))
    .map((g, i, arr) => ({ ...g, fim: i + 1 < arr.length ? Math.min(g.fim, arr[i + 1].ini) : g.fim }));
}


export function montarLegenda(pasta, brutas, W, H, op = {}, excluir = []) {
  const fator = Math.min(W, H) / 1080;
  const fix = existsSync(join(pasta, "correcoes.json")) ? JSON.parse(readFileSync(join(pasta, "correcoes.json"), "utf8")) : null;
  const maius = String(op.maiusculas ?? "sim") !== "nao";
  let palavras = brutas.map((w) => ({ ...w, t: corrige({ text: w.t, start: w.ini }, fix) }))
    .filter((w) => w.t).map((w) => ({ ...w, t: maius ? w.t.toLocaleUpperCase("pt-BR") : w.t }));
  // trechos que outra camada já mostra (frases-chave e chamada do modo viral) ficam sem legenda comum
  palavras = palavras.filter((w) => !excluir.some(([a, b]) => w.ini >= a - 0.05 && w.ini < b));
  const limpa = (t) => (op.pontuacao === "sim" ? t : t.replace(/[.,;:]+$/u, "").replace(/\.{3}$/u, ""));
  const estilo = op.estilo || "classica";
  const fonte = FONTES_MAP[String(op.fonte || "bebas").toLowerCase()] || FONTES_MAP.bebas;
  const umaPalavra = estilo === "uma-palavra";
  const tam = Math.round(Number(op.tamanho || fonte.tam * (umaPalavra ? 1.35 : 1)) * fator);
  const cor = corASS(op.cor || (estilo === "caixa" ? "preto" : "branco"));
  const corDestaque = corASS(op.destaque || "amarelo");
  const posicao = op.posicao || "baixo";
  const alin = posicao === "meio" ? 5 : posicao === "cima" ? 8 : 2;
  const margemV = Math.round(posicao === "cima" ? H * 0.16 : posicao === "meio" ? 0 : H * (H > W ? 0.27 : 0.12));
  const caixa = estilo === "caixa";
  const borda = caixa ? 3 : 1;
  // PADRÃO PREMIUM: nada de contorno sólido. Fora do estilo caixa, a "borda" é um halo escuro translúcido e desfocado
  // (\\blur), que lê como sombra suave e garante a leitura em qualquer fundo.
  const contorno = caixa ? Math.round(14 * fator) : Math.round(10 * fator);
  const sombra = 0;
  const fundoCaixa = corASS(op.fundo || "branco");
  const ass = [
    "[Script Info]", "ScriptType: v4.00+", `PlayResX: ${W}`, `PlayResY: ${H}`, "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: L,${fonte.nome},${tam},${cor},${cor},${caixa ? fundoCaixa : "&H50000000"},${caixa ? fundoCaixa : "&HFF000000"},0,0,0,0,100,100,${Math.round(fator)},0,${borda},${contorno},${sombra},${alin},${Math.round(70 * fator)},${Math.round(70 * fator)},${margemV},1`,
    "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const halo = caixa ? "" : `{\\blur${Math.round(12 * fator)}}`;
  const pop = halo + "{\\fscx94\\fscy94\\t(0,180,\\fscx100\\fscy100)}";
  const grupos = agrupar(palavras, umaPalavra ? 1 : Number(op["max-palavras"] || 3), fonte.chars);
  // a legenda comum sai da tela quando entra um trecho que outra camada mostra
  for (const g of grupos) {
    const prox = excluir.filter(([a]) => a > g.ini).map(([a]) => a);
    if (prox.length) g.fim = Math.min(g.fim, Math.min(...prox));
  }
  for (const g of grupos) {
    if (estilo === "destaque") {
      g.palavras.forEach((p, k) => {
        const ini = k === 0 ? g.ini : p.ini, fim = k + 1 < g.palavras.length ? g.palavras[k + 1].ini : g.fim;
        if (fim <= ini) return;
        const txt = g.palavras.map((x, j) => (j === k ? `{\\c${corDestaque}}${esc(limpa(x.t))}{\\c${cor}}` : esc(limpa(x.t)))).join(" ");
        ass.push(`Dialogue: 0,${tASS(ini)},${tASS(fim)},L,,0,0,0,,${k === 0 ? pop : halo}${txt}`);
      });
    } else {
      ass.push(`Dialogue: 0,${tASS(g.ini)},${tASS(g.fim)},L,,0,0,0,,${pop}${esc(g.palavras.map((x) => limpa(x.t)).join(" "))}`);
    }
  }
  writeFileSync(join(pasta, "legenda.ass"), ass.join("\n"), "utf8");
  mkdirSync(join(pasta, "fontes"), { recursive: true });
  copyFileSync(join(FONTES, fonte.arq), join(pasta, "fontes", fonte.arq));
  return { grupos, fonte, estilo, posicao, caixa };
}
