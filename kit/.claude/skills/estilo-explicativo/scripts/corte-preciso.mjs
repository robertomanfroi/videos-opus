// Corta raw.mp4 pelo SOM da fala (não pelo silêncio de -30 dB nem pelos tempos do transcritor): tira pausas E
// respirações, preserva o fim das palavras e encaixa cada corte editorial (keeps.json from/to) no vale de energia
// mais próximo, para nenhuma palavra sair cortada.
// Rodar dentro de <projeto>/assets:  node ../../../.claude/skills/estilo-explicativo/scripts/corte-preciso.mjs [saida.mp4]
// Entradas: raw.mp4, keeps.json ({keeps:[{from,to,why, raw?}]}).  Saídas: cut.mp4 (padrão), tight-segments.json
//   "raw": true num keep → mantém o trecho exatamente como está (início de palavra soprado que o detector perderia).
import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { videoEncoder } from "../../_motor/encoder.mjs";
import { binarios } from "../../_motor/binarios.mjs";

const OUT = process.argv[2] || "cut.mp4";
const SR = 16000, HOP = 160, WIN = 480;             // quadros de 10 ms, janela de análise de 30 ms
const LEAD = 0.06, TAIL = 0.14;                     // margem antes da 1ª / depois da última fala (TAIL protege o "s" final)
const HOLE = 0.20, ISLAND = 0.07;                   // fecha quedas menores que HOLE; descarta ruídos de fala menores que ISLAND
const { ffmpeg } = binarios();

const pcm = spawnSync(ffmpeg, ["-v", "error", "-i", "raw.mp4", "-vn", "-ac", "1", "-ar", String(SR), "-f", "s16le", "-"], { maxBuffer: 1 << 30 }).stdout;
const a = new Float32Array(pcm.length >> 1);
for (let i = 0; i < a.length; i++) a[i] = pcm.readInt16LE(i * 2) / 32768;
const n = Math.max(0, Math.floor((a.length - WIN) / HOP));

// energia por faixa com DFT só nos bins que importam (graves 80–900 Hz e agudos 2–7 kHz)
const binHz = SR / WIN;
const lo = [], hi = [];
for (let k = 0; k <= WIN / 2; k++) { const f = k * binHz; if (f > 80 && f < 900) lo.push(k); else if (f > 2000 && f < 7000) hi.push(k); }
const hann = Float32Array.from({ length: WIN }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (WIN - 1)));
const cosT = {}, sinT = {};
for (const k of [...lo, ...hi]) { const c = new Float32Array(WIN), s = new Float32Array(WIN); for (let t = 0; t < WIN; t++) { c[t] = Math.cos((2 * Math.PI * k * t) / WIN); s[t] = Math.sin((2 * Math.PI * k * t) / WIN); } cosT[k] = c; sinT[k] = s; }
const db = new Float32Array(n), tilt = new Float32Array(n), x = new Float32Array(WIN);
for (let i = 0; i < n; i++) {
  let q = 0;
  for (let t = 0; t < WIN; t++) { const v = a[i * HOP + t]; q += v * v; x[t] = v * hann[t]; }
  db[i] = 20 * Math.log10(Math.sqrt(q / WIN) + 1e-9);
  const banda = (ks) => { let e = 0; for (const k of ks) { let re = 0, im = 0; const c = cosT[k], s = sinT[k]; for (let t = 0; t < WIN; t++) { re += x[t] * c[t]; im -= x[t] * s[t]; } e += re * re + im * im; } return e; };
  tilt[i] = 10 * Math.log10((banda(lo) + 1e-12) / (banda(hi) + 1e-12));
}
// fala com voz: alta o suficiente E com graves dominando. Respiração e ruído de boca são agudos ou baixos demais.
const sp = Array.from({ length: n }, (_, i) => (db[i] > -33 && tilt[i] > 12) || (db[i] > -26 && tilt[i] > 0));
const runs = [];
for (let i = 0; i < n;) { if (sp[i]) { let j = i; while (j < n && sp[j]) j++; runs.push([i, j]); i = j; } else i++; }
const merged = [];
for (const [s, e] of runs) { if (merged.length && (s - merged.at(-1)[1]) * 0.01 < HOLE) merged.at(-1)[1] = e; else merged.push([s, e]); }
const regions = merged.filter(([s, e]) => (e - s) * 0.01 >= ISLAND).map(([s, e]) => [s * 0.01, e * 0.01]);

function vale(t, antes = 0.15, depois = 0.03) { // quadro mais quieto perto do corte, procurando PARA FORA do texto mantido
  const i0 = Math.max(0, Math.floor((t - antes) * 100)), i1 = Math.min(n, Math.floor((t + depois) * 100));
  if (i1 <= i0) return t;
  let m = i0; for (let i = i0; i < i1; i++) if (db[i] < db[m]) m = i;
  return m * 0.01;
}
const { keeps } = JSON.parse(readFileSync("keeps.json", "utf8"));
const segs = [];
for (const k of keeps) {
  if (k.raw) { segs.push([k.from, k.to]); continue; }
  const k0 = vale(k.from, 0.15, 0.03), k1 = vale(k.to, 0.03, 0.15);
  for (const [s, e] of regions) { if (e <= k0 || s >= k1) continue; segs.push([Math.max(k0, s - LEAD), Math.min(k1, e + TAIL)]); }
}
segs.sort((p, q) => p[0] - q[0]);
const final = [];
for (const [s, e] of segs) { if (final.length && s - final.at(-1)[1] < 0.08) final.at(-1)[1] = Math.max(final.at(-1)[1], e); else final.push([s, e]); }
if (!final.length) { console.error("nenhum trecho sobrou: confira keeps.json"); process.exit(1); }

// Vídeo numa passada só (select) e áudio de uma segunda abertura do arquivo: um trim por trecho sobre
// a mesma entrada fazia o ffmpeg acumular quadros crus na memória e esgotar a RAM do WSL.
// raw.mp4 é sempre 30 fps fixo (novo-projeto.mjs), por isso o setpts conta quadros.
const janela = final.map(([s, e]) => `gte(t,${s.toFixed(3)})*lt(t,${e.toFixed(3)})`).join("+");
let fc = `[0:v]select='${janela}',setpts=N/(30*TB)[v];`;
final.forEach(([s, e], i) => {
  const d = e - s;
  fc += `[1:a]atrim=${s.toFixed(3)}:${e.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st=${Math.max(0, d - 0.012).toFixed(3)}:d=0.012[a${i}];`;
});
fc += final.map((_, i) => `[a${i}]`).join("") + `concat=n=${final.length}:v=0:a=1[a]`;
writeFileSync("tight-filter.txt", fc);
execFileSync(ffmpeg, ["-v", "error", "-y", "-i", "raw.mp4", "-i", "raw.mp4", "-/filter_complex", "tight-filter.txt", "-map", "[v]", "-map", "[a]",
  ...videoEncoder(), "-r", "30", "-c:a", "aac", "-b:a", "192k", OUT], { stdio: "inherit" });
writeFileSync("tight-segments.json", JSON.stringify(final.map(([s, e]) => ({ from: +s.toFixed(3), to: +e.toFixed(3) }))));
console.log(`trechos=${final.length} duração=${final.reduce((t, [s, e]) => t + e - s, 0).toFixed(2)}s -> ${OUT}`);
