// Corta raw.mp4 em clean.mp4 a partir de keeps.json, removendo cada pausa medida, com J/L cuts nas emendas.
// Rodar dentro de <projeto>/assets:  node ../../../.claude/skills/_motor/cortar.mjs [--jl 4] [--no-jl]
// Entradas: raw.mp4, keeps.json ({fps, keeps:[{from,to,why}]}), silences.txt (gerado aqui se faltar).
// Saídas: clean.mp4, edit-decisions.json (linha do tempo do áudio = linha do tempo da legenda).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { videoEncoder } from "./encoder.mjs";
import { marcarEtapa } from "./projeto.mjs";

const args = process.argv.slice(2);
const JL = args.includes("--no-jl") ? 0 : Number(args[args.indexOf("--jl") + 1] || 4); // quadros
const { keeps, fps = 30 } = JSON.parse(readFileSync("keeps.json", "utf8"));
const frame = (t) => Math.round(t * fps) / fps;

// 1. silêncios medidos (ffmpeg silencedetect, -30 dB, 0.15 s)
if (!existsSync("silences.txt")) {
  const r = spawnSync("ffmpeg", ["-v", "info", "-i", "raw.mp4", "-vn", "-af", "silencedetect=noise=-30dB:d=0.15", "-f", "null", "-"], { encoding: "utf8" });
  const s = [...r.stderr.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => `${m[1]} ${m[2]}`);
  writeFileSync("silences.txt", s.join("\n"));
}
// Guarda uma cauda curta depois da fala e uma entrada um pouco maior antes da próxima palavra.
const CAUDA = 0.05, ENTRADA = 0.08;
const silencios = readFileSync("silences.txt", "utf8").trim().split(/\s*\n/).filter(Boolean).map((l) => l.trim().split(" ").map(Number))
  .map(([a, b]) => [a + CAUDA, b - ENTRADA]).filter(([a, b]) => b - a > 0.06);

// 2. pedaços de áudio = trechos mantidos menos silêncios
const pedacos = [];
for (const k of keeps) {
  let cur = k.from;
  for (const [a, b] of silencios) {
    if (b <= cur || a >= k.to) continue;
    if (a > cur) pedacos.push({ s: frame(cur), e: frame(a), why: k.why });
    cur = b;
  }
  if (k.to > cur) pedacos.push({ s: frame(cur), e: frame(k.to), why: k.why });
}
const segs = pedacos.filter((p) => p.e - p.s >= 2 / fps);
if (!segs.length) { console.error("nenhum trecho sobrou: confira keeps.json"); process.exit(1); }

// 3. pedaços de vídeo: mesma duração, mas nas emendas reais a imagem corta deslocada do som (J e L alternados).
const d = JL / fps;
const vsegs = segs.map((g) => ({ s: g.s, e: g.e }));
let flip = 0;
for (let i = 0; i < segs.length - 1 && d > 0; i++) {
  const gap = segs[i + 1].s - segs[i].e;
  if (gap < 0.25) continue; // não é uma emenda visível
  if (flip++ % 2 === 0) { vsegs[i].e += d; vsegs[i + 1].s += d; }
  else { vsegs[i].e -= d; vsegs[i + 1].s -= d; }
}

let out = 0;
const decisoes = segs.map((g, i) => {
  const r = { source_start: g.s, source_end: g.e, video_start: +vsegs[i].s.toFixed(3), video_end: +vsegs[i].e.toFixed(3), output_start: +out.toFixed(3), output_end: +(out + g.e - g.s).toFixed(3), reason: g.why };
  out += g.e - g.s;
  return r;
});

const f = segs.map((g, i) => {
  const v = vsegs[i], dur = g.e - g.s;
  return `[0:v]trim=${v.s.toFixed(4)}:${v.e.toFixed(4)},setpts=PTS-STARTPTS[v${i}];` +
    `[0:a]atrim=${g.s}:${g.e},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${(dur - 0.012).toFixed(3)}:d=0.012[a${i}];`;
}).join("") + segs.map((_, i) => `[v${i}]`).join("") + `concat=n=${segs.length}:v=1:a=0[v];` + segs.map((_, i) => `[a${i}]`).join("") + `concat=n=${segs.length}:v=0:a=1[a]`;
writeFileSync("cut-filter.txt", f);
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", "raw.mp4", "-/filter_complex", "cut-filter.txt",
  "-map", "[v]", "-map", "[a]", ...videoEncoder(), "-r", String(fps),
  "-c:a", "aac", "-b:a", "192k", "-shortest", "clean.mp4"], { stdio: "inherit" });
writeFileSync("edit-decisions.json", JSON.stringify({ source: "assets/raw.mp4", fps, jl_frames: JL, duration: +out.toFixed(3), segments: decisoes }, null, 1));
if (existsSync("../projeto.json")) marcarEtapa("..", "cortado", { corte: { trechos: segs.length, duracao: +out.toFixed(3) } });
console.log(`trechos=${segs.length} emendas_jl=${flip} duração=${out.toFixed(2)}s`);
