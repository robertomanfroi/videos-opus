// Depois de um RECORTE, move todos os tempos de uma composição pronta para a nova linha do tempo do clean.mp4.
// Casa as palavras da transcrição antiga com a nova (maior subsequência comum) e leva cada tempo pelas palavras casadas
// mais próximas (linear por trechos). Tempos que caem dentro de fala removida grudam na próxima palavra mantida.
// Rodar na raiz do projeto (guarde antes a transcrição antiga como assets/transcript-v1.json):
//   node ../../.claude/skills/estilo-colagem/scripts/remapear-tempos.mjs assets/transcript-v1.json assets/transcript.json
// Reescreve (com cópia .bak): src/index.template.html (data-start/data-duration das cenas e os tempos do bloco TEMPOS:
// pop/rise/slideX/stamp/tilt/draw/out/swapCard/punch/blurIn/blurOut/flash/leak e o último argumento de tl.from/to/set/fromTo),
// assets/sfx.json (t), assets/emphasis.json (at), assets/caption-fixes.json (at, se for lista).
// Avisa cada beat cuja palavra-âncora foi removida. DEPOIS RODE O MATTE DE NOVO (fg.webm velho = fantasma fora de sincronia).
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const [fOld, fNew] = process.argv.slice(2);
if (!fOld || !fNew) { console.error("uso: remapear-tempos.mjs assets/transcript-v1.json assets/transcript.json"); process.exit(1); }
const old = JSON.parse(readFileSync(fOld, "utf8")).words, nov = JSON.parse(readFileSync(fNew, "utf8")).words;
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const A = old.map((w) => norm(w.text)), B = nov.map((w) => norm(w.text));

// maior subsequência comum (programação dinâmica)
const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
const casados = [];
for (let i = 0, j = 0; i < n && j < m;) {
  if (A[i] === B[j]) { casados.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
}
const pares = [[0, 0], ...casados.map(([i, j]) => [old[i].start, nov[j].start])].sort((x, y) => x[0] - y[0]);
// trechos (tempo antigo) que sumiram sem nenhuma palavra nova no lugar
const removidos = [];
let pi = -1, pj = -1;
for (const [i, j] of [...casados, [n, m]]) {
  if (i - pi > 1 && j - pj === 1) removidos.push([old[pi + 1].start - 0.15, old[i - 1].end + 0.15]);
  pi = i; pj = j;
}
const aviso = [];
function mapa(t) {
  for (const [a, b] of removidos) if (a <= t && t <= b) aviso.push(t);
  let lo = pares[0], hi = null;
  for (const p of pares) { if (p[0] <= t) lo = p; if (p[0] >= t && !hi) hi = p; }
  if (!hi) return +(lo[1] + (t - lo[0])).toFixed(3);
  if (hi[0] === lo[0]) return +lo[1].toFixed(3);
  const so = hi[0] - lo[0], sn = hi[1] - lo[1];
  return +(lo[1] + (t - lo[0]) * (so > 0 ? sn / so : 0)).toFixed(3);
}
const fmt = (x) => String(+x.toFixed(3));
const p = "src/index.template.html";
copyFileSync(p, p + ".bak");
const s = readFileSync(p, "utf8");
const corte = s.indexOf("<script>\nconst tl") >= 0 ? s.indexOf("<script>\nconst tl") : s.indexOf("<script>\r\nconst tl");
if (corte < 0) { console.error("não achei o bloco <script> const tl no template"); process.exit(1); }
let cab = s.slice(0, corte), script = s.slice(corte);
cab = cab.replace(/(data-start=")([\d.]+)("\s+data-duration=")([\d.]+)"/g, (_, a, st, c, du) => {
  const ns = mapa(+st), ne = mapa(+st + +du);
  return `${a}${fmt(ns)}${c}${fmt(Math.max(0.05, ne - ns))}"`;
});
const num = "(\\d+(?:\\.\\d+)?)";
script = script.replace(new RegExp(`\\b(pop|rise|slideX|stamp|tilt|draw|out)\\(("[^"]*"), ${num}`, "g"), (_, f, sel, t) => `${f}(${sel}, ${fmt(mapa(+t))}`);
script = script.replace(new RegExp(`\\bswapCard\\(("[^"]*"), ("[^"]*"), ${num}`, "g"), (_, a, b, t) => `swapCard(${a}, ${b}, ${fmt(mapa(+t))}`);
script = script.replace(new RegExp(`\\b(punch|blurIn|blurOut|flash|leak)\\(${num}`, "g"), (_, f, t) => `${f}(${fmt(mapa(+t))}`);
script = script.replace(new RegExp(`\\}, ${num}\\)`, "g"), (_, t) => `}, ${fmt(mapa(+t))})`);
writeFileSync(p, cab + script);
for (const [f, k] of [["assets/sfx.json", "t"], ["assets/emphasis.json", "at"], ["assets/caption-fixes.json", "at"]]) {
  if (!existsSync(f)) continue;
  const d = JSON.parse(readFileSync(f, "utf8"));
  if (Array.isArray(d)) { for (const x of d) if (x && typeof x === "object" && k in x) x[k] = mapa(x[k]); writeFileSync(f, JSON.stringify(d, null, 0)); }
}
console.log("trechos removidos (tempo antigo):", JSON.stringify(removidos.map(([a, b]) => [+a.toFixed(2), +b.toFixed(2)])));
console.log("tempos que caíram em fala removida (confira esses beats):", JSON.stringify([...new Set(aviso.map((x) => +x.toFixed(2)))].sort((a, b) => a - b)));
console.log("AGORA rode o matte-pessoa.mjs de novo no clean.mp4 novo.");
