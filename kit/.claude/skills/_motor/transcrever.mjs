#!/usr/bin/env node
// Motor de transcrição do pacote (substitui o transcrever.py): whisper.cpp portátil + detector de voz, sem Python
// e sem internet. Mesma interface e mesmo JSON do transcrever.py, para o resto do motor não mudar.
//
// Uso (pelo lançador da skill videos-opus, que põe os programas no PATH):
//   node transcrever.mjs <video> <saida.json>                # qualidade de legenda
//   node transcrever.mjs <video> <saida.json> --rapido       # aceito por compatibilidade (o modelo é o mesmo)
//   node transcrever.mjs <video> --janelas 12.4,30.1,...      # texto de 3 s em volta de cada emenda
//   node transcrever.mjs <video> <saida.json> --txt --srt    # também gera .txt e .srt ao lado
// Opções: --idioma pt · --span 3 · --nomes "Suellen, MIRA" · --quieto
// JSON: {"language_code", "audio_duration_secs", "text", "words": [{text,start,end}]}
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, mkdtempSync, statfsSync } from "node:fs";
import { join, dirname, resolve, relative, basename } from "node:path";
import { tmpdir, cpus } from "node:os";
import { binarios } from "./binarios.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const flag = (k) => args.includes(`--${k}`);
const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !["--rapido", "--txt", "--srt", "--quieto", "--cpu"].includes(args[i - 1])));
const [midia, saida] = pos;
const idioma = opt("idioma", "pt"), span = Number(opt("span", 3)), nomes = opt("nomes", "").trim(), quieto = flag("quieto");
const log = (m) => { if (!quieto) console.log(m); };
const { ffmpeg, ffprobe, whisper, modelo, vad } = binarios();

if (!midia || !existsSync(midia)) { console.error(`ERRO: arquivo não encontrado: ${midia}`); process.exit(1); }
if (!existsSync(modelo)) { console.error(`ERRO: modelo de transcrição não encontrado (${modelo}). Reinstale a skill videos-opus.`); process.exit(1); }

const tmp = mkdtempSync(join(tmpdir(), "transcrever-"));
const threads = String(Math.max(2, Math.min(8, cpus().length - 1)));

function paraWav(inicio, dur) {
  const wav = join(tmp, `a${Date.now()}${Math.random().toString(36).slice(2, 6)}.wav`);
  const a = ["-v", "error", "-y"];
  if (inicio != null) a.push("-ss", inicio.toFixed(3));
  a.push("-i", midia);
  if (dur != null) a.push("-t", dur.toFixed(3));
  a.push("-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav);
  const r = spawnSync(ffmpeg, a, { encoding: "utf8" });
  if (r.status !== 0) { console.error(`ERRO: não consegui ler o áudio de '${midia}'. O arquivo tem som? Está corrompido?`); process.exit(1); }
  return wav;
}

// O whisper.cpp não abre caminhos com acento no Windows (C:\\Users\\Conceição\\… trava com 0xC0000409):
// roda a partir da pasta do modelo, com caminhos relativos, que não carregam o nome da usuária.
function rodarWhisper(wav, extra, base) {
  const cwd = dirname(modelo), rel = (p) => relative(cwd, p) || ".";
  const a = ["-m", basename(modelo), "-f", rel(wav), "-l", idioma, "-t", threads, "-np", "-oj", "-of", rel(base), ...extra];
  if (nomes) a.push("--prompt", nomes);
  if (vad && existsSync(vad)) a.push("--vad", "-vm", rel(vad));
  const r = spawnSync(whisper, a, { encoding: "utf8", maxBuffer: 1 << 26, cwd });
  if (r.status !== 0 || !existsSync(`${base}.json`)) {
    console.error(`ERRO: a transcrição falhou: ${(r.stderr || "").trim().split("\n").slice(-3).join(" | ")}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(`${base}.json`, "utf8")).transcription || [];
}

const limpar = (t) => t.replace(/\[[^\]]{1,30}\]/g, "").trim();

try {
  // ---- modo janelas: confere as emendas do corte
  const janelas = opt("janelas", "");
  if (janelas) {
    for (const t of janelas.split(",").map(Number).filter((x) => !Number.isNaN(x))) {
      const ini = Math.max(0, t - span / 2);
      const segs = rodarWhisper(paraWav(ini, span), [], join(tmp, `j${t}`));
      console.log(`[${t.toFixed(2).padStart(8)}] ${segs.map((s) => limpar(s.text)).filter(Boolean).join(" ")}`);
    }
    process.exit(0);
  }

  if (!saida) { console.error("uso: transcrever.mjs <video> <saida.json> [--rapido] [--txt] [--srt]"); process.exit(1); }
  mkdirSync(dirname(resolve(saida)), { recursive: true });
  try { const f = statfsSync(dirname(resolve(saida))); if ((f.bavail * f.bsize) / 1e6 < 500) { console.error("ERRO: menos de 500 MB livres no disco. Libere espaço e tente de novo."); process.exit(1); } } catch {}

  const dur = Number(spawnSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", midia], { encoding: "utf8" }).stdout.trim()) || 0;
  log(`  transcrição no processador (whisper.cpp small, ${threads} threads, detector de voz ${vad && existsSync(vad) ? "ligado" : "desligado"})`);
  const segs = rodarWhisper(paraWav(), ["-ml", "1", "-sow"], join(tmp, "t"));
  const words = [];
  for (const s of segs) {
    const bruto = s.text || "";
    const t = limpar(bruto);
    if (!t) continue;
    const start = s.offsets.from / 1000, end = s.offsets.to / 1000;
    // pedaço colado na palavra anterior (sem espaço na frente): "e" + "-mail", "100" + "%"
    if (words.length && !/^\s/.test(bruto)) { const p = words[words.length - 1]; p.text += t; p.end = +end.toFixed(3); continue; }
    words.push({ text: t, start: +start.toFixed(3), end: +end.toFixed(3) });
  }
  if (!words.length) { console.error("ERRO: transcrição vazia. O vídeo tem fala? O som está muito baixo?"); process.exit(1); }

  // frases (para .txt/.srt e para o log)
  const frases = [];
  let f = [];
  words.forEach((w, i) => {
    f.push(w);
    const n = words[i + 1];
    if (!n || /[.?!]$/.test(w.text) || n.start - w.end > 0.6 || f.length >= 14) { frases.push({ start: f[0].start, end: w.end, text: f.map((x) => x.text).join(" ") }); f = []; }
  });
  for (const fr of frases) log(`[${fr.start.toFixed(2).padStart(7)}] ${fr.text}`);

  writeFileSync(saida, JSON.stringify({ language_code: idioma, audio_duration_secs: +dur.toFixed(3), text: words.map((w) => w.text).join(" "), words }, null, 1));
  const base = saida.replace(/\.json$/i, "");
  if (flag("txt")) writeFileSync(`${base}.txt`, frases.map((x) => x.text).join("\n") + "\n");
  if (flag("srt")) {
    const ts = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3.6e6), m = Math.floor(ms / 6e4) % 60, se = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(se).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
    writeFileSync(`${base}.srt`, frases.map((x, i) => `${i + 1}\n${ts(x.start)} --> ${ts(x.end)}\n${x.text}\n`).join("\n"));
  }
  console.log(`PRONTO dispositivo=cpu palavras=${words.length} -> ${saida}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
