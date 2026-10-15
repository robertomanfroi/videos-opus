// Monta <projeto>/index.html a partir de src/index.template.html (estilo colagem).
// Rodar na raiz do projeto:  node ../../.claude/skills/estilo-colagem/scripts/montar-colagem.mjs
// - __CAPTIONS__ : legenda em blocos CURTOS (≤ 3 palavras / 18 letras), troca seca, no peito. Quebra em pontuação e pausa > 0,25 s.
//     assets/emphasis.json  [{"words": "duas noites", "color": "red"}]  → essa sequência exata vira um bloco GRANDE sozinho
//       (cores: red | blue | yel | white; "at": 12.3 para só uma ocorrência). Compara sem acento e sem maiúscula.
//     assets/caption-fixes.json  {"errado": "certo"} (todas as ocorrências) ou [{"at": 36.0, "text": "porque eu"}] ("" apaga a palavra)
// - __SFX__ : <audio> de assets/sfx.json [{"t": 2.43, "f": "whoosh", "v": 0.15}] (arquivos em assets/sfx/<f>.wav); trilhas sem sobreposição.
// - __MUSICA__ : cama musical assets/fundo.wav (ou .mp3) se existir, volume de reel.json "musica" (padrão 0.06).
// - __DUR__ : duração do clean.mp4 · __CAP_TOP__ : reel.json {"capTop": 1080}
// - __ACCENT__ / __FONT_TITLE__ : perfil.json cor_destaque (senão amarelo #FFD21F) / fonte_titulo (senão Archivo Black).
// - todo emoji vira <img class="emo"> com arte Twemoji (CC-BY 4.0), cache compartilhado em _motor/emoji-cache.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { corrige } from "../../_motor/correcoes.mjs";

const motor = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "_motor");
const ler = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, "")) : d);
const t = ler("assets/transcript.json");
if (!t) { console.error("falta assets/transcript.json (transcreva o clean.mp4)"); process.exit(1); }
const dur = t.audio_duration_secs;
const probe = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

// Trava: tudo que deriva do vídeo tem que vir DESTE clean.mp4 (fg.webm velho depois de recorte = fantasma por cima).
if (existsSync("assets/fg.webm") && existsSync("assets/clean.mp4")) {
  const a = probe("assets/fg.webm"), b = probe("assets/clean.mp4");
  if (Math.abs(a - b) > 0.1) { console.error(`PARE: assets/fg.webm (${a.toFixed(2)}s) não bate com clean.mp4 (${b.toFixed(2)}s). Rode o matte-pessoa.mjs de novo depois do recorte.`); process.exit(1); }
}
const fixes = ler("assets/caption-fixes.json", {});
const enf = ler("assets/emphasis.json", []);
const sfx = ler("assets/sfx.json", []);
const cfg = { capTop: 1080, musica: 0.06, ...ler("reel.json", {}) };
const perfil = (() => { for (const p of ["../../perfil.json", "perfil.json"]) { try { return JSON.parse(readFileSync(p, "utf8")); } catch {} } return {}; })();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// ---- palavras + correções (junta "e" + "-mail" e "100" + "%")
let words = [];
for (let i = 0; i < t.words.length; i++) {
  const w = t.words[i], n = t.words[i + 1];
  if (n && (n.text.startsWith("-") || n.text === "%")) { words.push({ text: w.text + n.text, start: w.start, end: n.end }); i++; continue; }
  words.push({ ...w });
}
words.forEach((w) => { w.text = corrige(w, fixes); });
words = words.filter((w) => w.text);

// ---- marca as sequências de destaque
const marcas = new Array(words.length).fill(null);
for (const e of enf) {
  const seq = e.words.split(/\s+/).map(norm);
  for (let i = 0; i + seq.length <= words.length; i++) {
    if (seq.every((s, k) => norm(words[i + k].text) === s) && (e.at == null || Math.abs(words[i].start - e.at) < 1)) {
      for (let k = 0; k < seq.length; k++) marcas[i + k] = { id: e.words + i, cor: e.color || "white" };
      if (e.at != null) break;
    }
  }
}

// ---- blocos
const blocos = [];
let cur = null;
const fecha = () => { if (cur) blocos.push(cur); cur = null; };
for (let i = 0; i < words.length; i++) {
  const w = words[i], m = marcas[i];
  if (m) {
    if (!cur || cur.marca?.id !== m.id) { fecha(); cur = { text: w.text, start: w.start, end: w.end, marca: m }; }
    else { cur.text += " " + w.text; cur.end = w.end; }
    if (!marcas[i + 1] || marcas[i + 1].id !== m.id) fecha();
    continue;
  }
  if (cur && (cur.marca || w.start - cur.end > 0.25 || cur.n >= 3 || (cur.text + " " + w.text).length > 18)) fecha();
  if (!cur) cur = { text: w.text, start: w.start, end: w.end, n: 1 };
  else { cur.text += " " + w.text; cur.end = w.end; cur.n++; }
  if (/[.!?,;:]$/.test(w.text)) fecha();
}
fecha();
const caps = blocos.map((c, i) => {
  const prox = blocos[i + 1] ? blocos[i + 1].start : dur;
  const d = Math.min(prox, c.end + 0.45) - c.start;
  if (d <= 0.04) return "";
  const cls = ["c", "clip"]; if (c.marca) cls.push("big", c.marca.cor);
  const txt = c.text.replace(/[,;:]$/, "").replace(/\.$/, "");
  return `<div class="${cls.join(" ")}" id="c${i}" data-start="${c.start.toFixed(3)}" data-duration="${d.toFixed(3)}" data-track-index="60">${esc(c.marca ? txt.toUpperCase() : txt)}</div>`;
}).join("\n");

// ---- efeitos sonoros em trilhas sem sobreposição
const fins = [];
const sfxHtml = sfx.map((s, i) => {
  const f = `assets/sfx/${s.f}.wav`;
  if (!existsSync(f)) { console.error(`falta ${f} (rode sons.mjs)`); process.exit(1); }
  const len = Math.min(probe(f), dur - s.t);
  let tr = fins.findIndex((e) => e <= s.t); if (tr < 0) { tr = fins.length; fins.push(0); } fins[tr] = s.t + len + 0.02;
  return `  <audio id="sfx${i}" src="${f}" data-start="${s.t.toFixed(3)}" data-duration="${len.toFixed(3)}" data-track-index="${70 + tr}" data-volume="${s.v ?? 0.15}"></audio>`;
}).join("\n");
const musArq = ["assets/fundo.mp3", "assets/fundo.wav"].find(existsSync);
const musica = musArq && cfg.musica > 0 ? `  <audio id="musica" src="${musArq}" data-start="0" data-duration="${dur.toFixed(3)}" data-track-index="3" data-volume="${cfg.musica}"></audio>` : "";

// ---- monta + emoji
const accent = /^#[0-9a-fA-F]{6}$/.test(perfil.cor_destaque || "") ? perfil.cor_destaque : "#FFD21F";
let html = readFileSync("src/index.template.html", "utf8")
  .replaceAll("__DUR__", dur.toFixed(3)).replace("__CAPTIONS__", caps).replace("__SFX__", sfxHtml).replace("__MUSICA__", musica)
  .replaceAll("__CAP_TOP__", String(cfg.capTop)).replaceAll("__ACCENT__", accent).replaceAll("__FONT_TITLE__", perfil.fonte_titulo || "Archivo Black");

// ---- recorte (fg.webm) só nas janelas dos títulos atrás da cabeça (.bh clip).
// O recorte pelo vídeo inteiro injeta um PNG 1080×1920 por quadro e trava o render em PC com pouca memória
// ("capture stalled" sempre no mesmo quadro). Fora dessas janelas ele não muda nada na imagem.
const janelas = [...html.matchAll(/<div class="bh clip"[^>]*data-start="([\d.]+)"[^>]*data-duration="([\d.]+)"/g)]
  .map((m) => [Math.max(0, +m[1] - 0.1), Math.min(dur, +m[1] + +m[2] + 0.1)]).sort((a, b) => a[0] - b[0])
  .reduce((acc, j) => { const u = acc[acc.length - 1]; if (u && j[0] <= u[1]) u[1] = Math.max(u[1], j[1]); else acc.push(j); return acc; }, []);
html = html.replace(/[ \t]*<video id="fg"[^>]*><\/video>\n?/, (tag) => {
  const ind = tag.match(/^[ \t]*/)[0];
  return janelas.map(([a, b], i) => `${ind}<video id="fg${i}" class="fg" src="assets/fg.webm" data-start="${a.toFixed(3)}" data-duration="${(b - a).toFixed(3)}" data-media-start="${a.toFixed(3)}" data-track-index="2" muted playsinline></video>\n`).join("");
});
const cache = join(motor, "emoji-cache");
mkdirSync(cache, { recursive: true });
mkdirSync("assets/emoji", { recursive: true });
const re = /(\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*️?|[\u{1F1E6}-\u{1F1FF}]{2})/gu;
const ini = html.indexOf("<body>"), cab = html.slice(0, ini), corpo = html.slice(ini);
const sc = corpo.indexOf("<script>");
const troca = (s) => s.replace(re, (m, _a, _b, idx, str) => {
  if (str.lastIndexOf("<", idx) > str.lastIndexOf(">", idx)) return m; // dentro de uma tag
  const code = [...m].map((c) => c.codePointAt(0).toString(16)).filter((c) => c !== "fe0f").join("-");
  const file = join(cache, `${code}.png`);
  if (!existsSync(file)) {
    try { execFileSync("curl", ["-sfL", "-o", file, `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${code}.png`]); }
    catch { return m; } // sem internet: deixa o emoji do sistema
  }
  copyFileSync(file, `assets/emoji/${code}.png`);
  return `<img class="emo" src="assets/emoji/${code}.png" alt="">`;
});
html = cab + troca(corpo.slice(0, sc)) + corpo.slice(sc);
writeFileSync("index.html", html);
const meta = ler("meta.json", {});
Object.assign(meta, { id: "reel", width: 1080, height: 1920, fps: 30 });
writeFileSync("meta.json", JSON.stringify(meta, null, 2));
console.log(`index.html montado — ${dur.toFixed(2)}s, ${blocos.length} blocos de legenda (${blocos.filter((c) => c.marca).length} grandes), ${sfx.length} sons em ${fins.length} trilhas${musica ? ", com cama musical" : ""}, destaque ${accent}`);
