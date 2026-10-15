// Mede onde está a cabeça da pessoa ao longo do vídeo, a partir da máscara do matte-pessoa.mjs.
// Rodar dentro de <projeto>/assets:  node ../../../.claude/skills/estilo-colagem/scripts/topo-cabeca.mjs [fg-matte.mp4]
// Imprime o topo da cabeça por segundo, mínimo/mediana/máximo e o layout sugerido (zona de elementos e legenda).
import { spawnSync } from "node:child_process";

const src = process.argv[2] || "fg-matte.mp4";
const W = 270, H = 480, S = 1920 / H; // amostra em 1/4 do tamanho, 2 quadros por segundo
const r = spawnSync("ffmpeg", ["-v", "error", "-i", src, "-vf", `fps=2,scale=${W}:${H}`, "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 30 });
if (r.status !== 0) { console.error("não consegui ler " + src + " (rode o matte-pessoa.mjs antes)"); process.exit(1); }
const buf = r.stdout, n = Math.floor(buf.length / (W * H));
const tops = [];
const QUEIXO = 870; // queixo ≈ topo da cabeça + 870 px quando o rosto enche uma selfie (confira em quadros de cada vídeo)
for (let f = 0; f < n; f++) {
  const o = f * W * H;
  let top = H;
  // faixa central x 25%–75%: a cabeça; ignora mãos nas bordas
  for (let y = 0; y < H && top === H; y++) {
    let c = 0;
    for (let x = W * 0.25; x < W * 0.75; x++) if (buf[o + y * W + (x | 0)] > 128) c++;
    if (c >= 6) top = y; // ≥ 6 px de largura = cabelo, não ponta de dedo
  }
  tops.push(Math.round(top * S));
}
const ord = [...tops].sort((a, b) => a - b);
const q = (p) => ord[Math.min(ord.length - 1, Math.floor(p * ord.length))];
let linha = "";
tops.forEach((t, i) => { if (i % 2 === 0) linha += `${(i / 2).toString().padStart(3)}s:${t} `; });
console.log("topo da cabeça (y em px, por segundo):\n" + linha.trim());
const alto = q(0.05); // a cabeça só fica tão alta (ou mais) 5% do tempo
console.log(`topo da cabeça  mín ${ord[0]}  p5 ${alto}  mediana ${q(0.5)}  máx ${ord.at(-1)}  (${n} amostras)`);
console.log(`zona de elementos acima da cabeça: y 270 → ${alto - 10}  (${alto - 280}px de altura)`);
if (alto < 420) console.log("cabeça ALTA: pouco espaço acima dela — use títulos ATRÁS da cabeça e cenas de tela cheia (takeover) em vez de elementos acima.");
const cap = Math.min(1248 - 150, q(0.5) + QUEIXO);
console.log(`legenda NO PEITO, abaixo do queixo: #cap top ≈ ${cap}px (mediana do topo + ${QUEIXO}; teto 1098 para caber na zona segura até y 1248). Confira num quadro.`);
