// Monta <projeto>/index.html a partir de src/index.template.html.
// Rodar na raiz do projeto:  node ../../.claude/skills/_motor/montar.mjs
// - __CAPTIONS__ : legenda palavra a palavra a partir de assets/transcript.json
//                  (correções em assets/caption-fixes.json: {"errado": "certo", "apaga-me": ""} (sem ligar para maiúscula/pontuação) ou [{"at": 36.0, "text": "certo"}])
// - __DUR__      : duração do clean.mp4;  __CAP_TOP__ : de reel.json {"capTop": 1380}
// - __ACCENT__   : cor de destaque (perfil.json cor_destaque → senão amarelo #FFD21F)
// - __FONT_TITLE__ : fonte de título (perfil.json fonte_titulo → senão a do template)
// - todo emoji vira <img class="emo"> com arte Twemoji (licença CC-BY 4.0), em cache na pasta _motor
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { corrige } from "./correcoes.mjs";

const motor = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync("assets/transcript.json", "utf8"));
const dur = t.audio_duration_secs;
const fix = existsSync("assets/caption-fixes.json") ? JSON.parse(readFileSync("assets/caption-fixes.json", "utf8")) : {};
const perfil = lerPerfil();

// ---- palavras (junta o que o Whisper separa, tipo "e" + "-mail" e "100" + "%")
const words = [];
for (let i = 0; i < t.words.length; i++) {
  const w = t.words[i], n = t.words[i + 1];
  if (n && (n.text.startsWith("-") || n.text === "%")) { words.push({ text: w.text + n.text, start: w.start, end: n.end }); i++; continue; }
  const txt = corrige(w, fix);
  if (txt) words.push({ text: txt, start: w.start, end: w.end });
}

// ---- uma legenda por palavra (do início dela até a próxima, máx. 1,2 s)
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const caps = words.map((w, i) => {
  const next = words[i + 1] ? words[i + 1].start : dur;
  const d = Math.min(next - w.start, 1.2);
  if (d <= 0.01) return "";
  return `<div class="w clip" id="w${i}" data-start="${w.start.toFixed(3)}" data-duration="${d.toFixed(3)}" data-track-index="5">${esc(w.text)}</div>`;
}).join("\n");

// Ajustes por vídeo (reel.json): capTop = topo da legenda em px — no peito, logo abaixo do queixo.
const cfg = { capTop: 1380, ...(existsSync("reel.json") ? JSON.parse(readFileSync("reel.json", "utf8")) : {}) };
const accent = /^#[0-9a-fA-F]{6}$/.test(perfil.cor_destaque || "") ? perfil.cor_destaque : "#FFD21F";
let html = readFileSync("src/index.template.html", "utf8")
  .replaceAll("__DUR__", dur.toFixed(3)).replace("__CAPTIONS__", caps).replaceAll("__CAP_TOP__", String(cfg.capTop))
  .replaceAll("__ACCENT__", accent).replaceAll("__FONT_TITLE__", perfil.fonte_titulo || "Archivo Black");

// ---- emoji: cada sequência vira um PNG local (Twemoji, CC-BY 4.0 — crédito em LEIA-PRIMEIRO)
const cache = join(motor, "emoji-cache");
mkdirSync(cache, { recursive: true });
mkdirSync("assets/emoji", { recursive: true });
const re = /(\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*|[\u{1F1E6}-\u{1F1FF}]{2})/gu;
const dentroTag = (s, idx) => s.lastIndexOf("<", idx) > s.lastIndexOf(">", idx);
html = html.replace(re, (m, _a, _b, idx, s) => {
  if (dentroTag(s, idx) || s.lastIndexOf("<script", idx) > s.lastIndexOf("</script>", idx)) return m;
  const code = [...m].map((c) => c.codePointAt(0).toString(16)).filter((c) => c !== "fe0f").join("-");
  const file = join(cache, `${code}.png`);
  if (!existsSync(file)) {
    try { execFileSync("curl", ["-sfL", "-o", file, `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${code}.png`]); }
    catch { return m; } // sem internet: deixa o emoji do sistema
  }
  copyFileSync(file, `assets/emoji/${code}.png`);
  return `<img class="emo" src="assets/emoji/${code}.png" alt="">`;
});

writeFileSync("index.html", html);
const meta = JSON.parse(readFileSync("meta.json", "utf8"));
Object.assign(meta, { id: "reel", width: 1080, height: 1920, fps: 30 });
writeFileSync("meta.json", JSON.stringify(meta, null, 2));
console.log(`index.html montado — ${dur.toFixed(2)}s, ${words.length} palavras de legenda, destaque ${accent}`);

function lerPerfil() {
  for (const p of ["../../perfil.json", "perfil.json"]) { try { return JSON.parse(readFileSync(p, "utf8")); } catch {} }
  return {};
}
