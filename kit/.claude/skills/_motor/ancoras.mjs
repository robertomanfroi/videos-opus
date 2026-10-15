// Imprime, na linha do tempo do vídeo cortado, quando cada frase é dita — para cronometrar os elementos.
// Rodar na raiz do projeto: node ../../.claude/skills/_motor/ancoras.mjs "menos seguidores" "do que eu" ...
import { readFileSync } from "node:fs";
const w = JSON.parse(readFileSync("assets/transcript.json", "utf8")).words;
const n = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9%]/g, "");
for (const frase of process.argv.slice(2)) {
  const p = frase.split(/\s+/).map(n);
  const hits = [];
  for (let i = 0; i < w.length; i++) if (p.every((x, j) => w[i + j] && n(w[i + j].text) === x)) hits.push(`${w[i].start.toFixed(2)}–${w[i + p.length - 1].end.toFixed(2)}`);
  console.log(`${frase.padEnd(32)} ${hits.join("  ") || "?? (não achei — confira assets/transcript.json)"}`);
}
