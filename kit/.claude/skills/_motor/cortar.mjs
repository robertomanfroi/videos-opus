// Corta raw.mp4 em clean.mp4 a partir de keeps.json, removendo cada pausa medida, com J/L cuts nas emendas.
// Rodar dentro de <projeto>/assets:  node ../../../.claude/skills/_motor/cortar.mjs [--jl 4] [--no-jl]
// Entradas: raw.mp4, keeps.json ({fps, keeps:[{from,to,why}]}), silences.txt (gerado aqui se faltar).
// Saídas: clean.mp4, edit-decisions.json (linha do tempo do áudio = linha do tempo da legenda).
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  // O deslocamento encolhe um dos dois vizinhos: num pedaço curto (um "Mas" entre duas emendas) o trecho de
  // vídeo ficaria vazio ou negativo e a emenda final cortaria o áudio. Nesse caso esta emenda fica reta.
  const sinal = flip % 2 === 0 ? 1 : -1;
  const ei = vsegs[i].e + sinal * d, si = vsegs[i + 1].s + sinal * d;
  if (ei - vsegs[i].s < 2 / fps - 1e-6 || vsegs[i + 1].e - si < 2 / fps - 1e-6) continue;
  vsegs[i].e = ei; vsegs[i + 1].s = si; flip++;
}
const vazio = vsegs.findIndex((v) => Math.round(v.e * fps) - Math.round(v.s * fps) < 1);
if (vazio >= 0) { console.error(`trecho ${vazio} ficou sem nenhum quadro de vídeo: confira keeps.json`); process.exit(1); }

let out = 0;
const decisoes = segs.map((g, i) => {
  const r = { source_start: g.s, source_end: g.e, video_start: +vsegs[i].s.toFixed(3), video_end: +vsegs[i].e.toFixed(3), output_start: +out.toFixed(3), output_end: +(out + g.e - g.s).toFixed(3), reason: g.why };
  out += g.e - g.s;
  return r;
});

// Vídeo: cada trecho é codificado sozinho num arquivo temporário e no fim os arquivos são emendados sem
// recodificar. Cada ffmpeg pula direto para perto do trecho (-ss antes do -i) e, com -copyts, o trim corta pelo
// horário original do arquivo: mesmos quadros do método antigo, na ordem do keeps.json (o gancho pode vir do fim).
// O método antigo (um trim por trecho na mesma entrada) guardava quadros crus na memória: 6 GB num vídeo de 2 min,
// e crescia com o tamanho do vídeo. Assim o ffmpeg só segura um trecho por vez (~500 MB).
const tmp = mkdtempSync(join(tmpdir(), "corte-"));
try {
  const lista = vsegs.map((v, i) => {
    const arq = join(tmp, `v${String(i).padStart(3, "0")}.mp4`);
    // Limites no meio do intervalo entre dois quadros: o quadro da borda nunca fica em dúvida por arredondamento.
    const ini = (Math.round(v.s * fps) - 0.5) / fps, fim = (Math.round(v.e * fps) - 0.5) / fps;
    execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", Math.max(0, v.s - 1).toFixed(4), "-copyts", "-i", "raw.mp4",
      "-vf", `trim=${Math.max(0, ini).toFixed(5)}:${fim.toFixed(5)},setpts=PTS-STARTPTS`, "-an", ...videoEncoder(), "-r", String(fps), arq],
      { stdio: "inherit" });
    return `file 'v${String(i).padStart(3, "0")}.mp4'`; // só o nome: a lista fica na mesma pasta, e um apóstrofo no nome do usuário (D'Ávila) quebraria a lista
  });
  writeFileSync(join(tmp, "lista.txt"), lista.join("\n"));
  // Áudio numa passada só: amostras de som são pequenas, juntar 13 trechos fora de ordem custa poucos MB.
  const f = segs.map((g, i) => {
    const dur = g.e - g.s;
    return `[1:a]atrim=${g.s}:${g.e},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${(dur - 0.012).toFixed(3)}:d=0.012[a${i}];`;
  }).join("") + segs.map((_, i) => `[a${i}]`).join("") + `concat=n=${segs.length}:v=0:a=1[a]`;
  writeFileSync("cut-filter.txt", f);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", join(tmp, "lista.txt"), "-i", "raw.mp4",
    "-/filter_complex", "cut-filter.txt", "-map", "0:v", "-map", "[a]", "-c:v", "copy",
    "-c:a", "aac", "-b:a", "192k", "-shortest", "clean.mp4"], { stdio: "inherit" });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
writeFileSync("edit-decisions.json", JSON.stringify({ source: "assets/raw.mp4", fps, jl_frames: JL, duration: +out.toFixed(3), segments: decisoes }, null, 1));
if (existsSync("../projeto.json")) marcarEtapa("..", "cortado", { corte: { trechos: segs.length, duracao: +out.toFixed(3) } });
console.log(`trechos=${segs.length} emendas_jl=${flip} duração=${out.toFixed(2)}s`);
