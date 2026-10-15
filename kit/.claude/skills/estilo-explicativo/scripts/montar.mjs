// Monta <projeto>/index.html a partir de src/index.template.html (estilo explicativo).
// Rodar na raiz do projeto:  node ../../.claude/skills/estilo-explicativo/scripts/montar.mjs
// - __CAPTIONS__ : legenda em FRASES (não palavra a palavra) a partir de assets/transcript.json, cada frase numa
//     caixa escura opaca (1–2 linhas). Quebra na pontuação, numa pausa > 0,28 s, ou antes de passar de MAX caracteres.
//     assets/caption-fixes.json  {"errado": "certo", "apaga-me": ""} (sem ligar para maiúscula/pontuação) ou [{"at": 36.0, "text": "certo"}]
//     assets/captions.json       {"hide": [[a,b]], "max": 44}   hide → trechos sem legenda (raro; ex.: diagrama cheio)
//   reel.json {"captions": "words"} → UMA palavra por vez, Archivo Black, branca, contorno preto (classe .w).
// - __DUR__ : duração do clean.mp4;  __CAP_TOP__ / __CFG__ : reel.json
//     {"capTop": 1545, "punch": 1.18, "split": {"y": 668, "scale": 1, "origin": "50% 0%"}}
// - __ACCENT__ : perfil.json cor_destaque → senão verde #1f7a63 (o amarelo some no fundo claro do diagrama)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { corrige } from "../../_motor/correcoes.mjs";

const read = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);
const t = JSON.parse(readFileSync("assets/transcript.json", "utf8"));
const dur = t.audio_duration_secs;
const fix = read("assets/caption-fixes.json", {});
const cc = { hide: [], max: 44, ...read("assets/captions.json", {}) };
const cfg = { capTop: 1545, punch: 1.18, ...read("reel.json", {}) };
cfg.split = { y: 668, scale: 1, origin: "50% 0%", ...(cfg.split || {}) };
const perfil = read("../../perfil.json", read("perfil.json", {}));
const accent = /^#[0-9a-fA-F]{6}$/.test(perfil.cor_destaque || "") ? perfil.cor_destaque : "#1f7a63";
const inRange = (x, rs) => rs.some(([a, b]) => x >= a && x < b);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// ---- palavras (junta o que o transcritor separa, tipo "e" + "-mail" e "100" + "%")
const words = [];
for (let i = 0; i < t.words.length; i++) {
  const w = t.words[i], n = t.words[i + 1];
  if (n && (n.text.startsWith("-") || n.text === "%")) { words.push({ text: w.text + n.text, start: w.start, end: n.end }); i++; continue; }
  const txt = corrige(w, fix);
  if (txt) words.push({ text: txt, start: w.start, end: w.end });
}

// ---- agrupa em frases
const phrases = [];
let cur = null;
for (const w of words) {
  if (inRange(w.start, cc.hide)) { if (cur) phrases.push(cur); cur = null; continue; }
  const gap = cur ? w.start - cur.end : 0;
  if (cur && (gap > 0.28 || (cur.text + " " + w.text).length > cc.max)) { phrases.push(cur); cur = null; }
  if (!cur) cur = { text: w.text, start: w.start, end: w.end };
  else { cur.text += " " + w.text; cur.end = w.end; }
  if (/[.!?;:]$/.test(w.text) || (/,$/.test(w.text) && cur.text.length > cc.max * 0.55)) { phrases.push(cur); cur = null; }
}
if (cur) phrases.push(cur);

// ---- modo palavra: um clipe por palavra, do início dela até a próxima (máx. 1,0 s)
const wordCaps = () => words.map((w, i) => {
  if (inRange(w.start, cc.hide)) return "";
  const next = words[i + 1] ? words[i + 1].start : dur;
  const d = Math.min(next - w.start, 1.0);
  if (d <= 0.01) return "";
  return `<div class="w clip" id="w${i}" data-start="${w.start.toFixed(3)}" data-duration="${d.toFixed(3)}" data-track-index="5">${esc(w.text.replace(/[.,;:]$/, ""))}</div>`;
}).join("\n");

// ---- um clipe por frase; fica até a próxima frase (no máx. +0,6 s depois da última palavra)
const caps = phrases.map((p, i) => {
  const next = phrases[i + 1] ? phrases[i + 1].start : dur;
  const d = Math.min(next, p.end + 0.6) - p.start;
  if (d <= 0.05) return "";
  const txt = p.text.replace(/,$/, ""); // mantém . ? ! como na referência
  return `<div class="ph clip" id="p${i}" data-start="${p.start.toFixed(3)}" data-duration="${d.toFixed(3)}" data-track-index="5"><span>${esc(txt)}</span></div>`;
}).join("\n");

const html = readFileSync("src/index.template.html", "utf8")
  .replaceAll("__DUR__", dur.toFixed(3)).replace("__CAPTIONS__", cfg.captions === "words" ? wordCaps() : caps)
  .replaceAll("__CAP_TOP__", String(cfg.capTop)).replace("__CFG__", JSON.stringify(cfg)).replaceAll("__ACCENT__", accent);
writeFileSync("index.html", html);
const meta = read("meta.json", {});
Object.assign(meta, { id: "reel", width: 1080, height: 1920, fps: 30 });
writeFileSync("meta.json", JSON.stringify(meta, null, 2));
console.log(`index.html montado — ${dur.toFixed(2)}s, ${cfg.captions === "words" ? words.length + " palavras" : phrases.length + " frases"} de legenda, destaque ${accent}`);
