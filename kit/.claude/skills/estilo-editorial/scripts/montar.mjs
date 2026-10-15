// Monta <projeto>/index.html do estilo editorial a partir de src/index.template.html.
// Rodar na raiz do projeto:  node ../../.claude/skills/estilo-editorial/scripts/montar.mjs
// - __CAPTIONS__ : uma legenda por palavra, minúscula, a partir de assets/transcript.json
//     assets/caption-fixes.json  {"errado": "certo", "apaga-me": ""} (sem ligar para maiúscula/pontuação) ou [{"at": 36.0, "text": "certo"}]
//     assets/enfase.json         {"palavras": ["noites"], "em": [12.4], "pequeno": [[3.6, 6.2]], "esconder": [[0.0, 3.6]]}
//        palavras → toda ocorrência vira serifa itálica na cor de destaque;  em → só a palavra dita naquele tempo (±0,15 s)
//        pequeno  → trechos em que a legenda cai para o tamanho de aparte;   esconder → trechos sem legenda
//        (use esconder enquanto uma pilha de frase ou uma tomada de tela já mostra as palavras)
// - __DUR__ : duração do clean.mp4;  __CAP_TOP__ : reel.json {"capTop": 1040}
// - __ACCENT__ : perfil.json cor_destaque → senão #F4E27C (amarelo manteiga do estilo)
// - todo emoji vira <img class="emo"> com arte Twemoji (CC-BY 4.0), no mesmo cache do _motor
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { corrige } from "../../_motor/correcoes.mjs";

const motor = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "_motor");
const t = JSON.parse(readFileSync("assets/transcript.json", "utf8"));
const dur = t.audio_duration_secs;
const fix = existsSync("assets/caption-fixes.json") ? JSON.parse(readFileSync("assets/caption-fixes.json", "utf8")) : {};
const em = { palavras: [], em: [], pequeno: [], esconder: [], ...(existsSync("assets/enfase.json") ? JSON.parse(readFileSync("assets/enfase.json", "utf8")) : {}) };
const perfil = lerPerfil();
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9%]/g, "");
const emPal = new Set(em.palavras.map(norm));
const dentro = (x, rs) => rs.some(([a, b]) => x >= a && x < b);

// ---- palavras (junta o que o transcritor separa, tipo "e" + "-mail" e "100" + "%")
const words = [];
for (let i = 0; i < t.words.length; i++) {
  const w = t.words[i], n = t.words[i + 1];
  if (n && (n.text.startsWith("-") || n.text === "%")) { words.push({ text: w.text + n.text, start: w.start, end: n.end }); i++; continue; }
  const txt = corrige(w, fix);
  if (txt) words.push({ text: txt, start: w.start, end: w.end });
}

// ---- uma legenda por palavra (do início dela até a próxima, máx. 1,0 s)
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const caps = words.map((w, i) => {
  if (dentro(w.start, em.esconder)) return "";
  const next = words[i + 1] ? words[i + 1].start : dur;
  const d = Math.min(next - w.start, 1.0);
  if (d <= 0.01) return "";
  const cls = ["w", "clip"];
  if (emPal.has(norm(w.text)) || em.em.some((x) => Math.abs(x - w.start) <= 0.15)) cls.push("em");
  if (dentro(w.start, em.pequeno)) cls.push("sm");
  return `<div class="${cls.join(" ")}" id="w${i}" data-start="${w.start.toFixed(3)}" data-duration="${d.toFixed(3)}" data-track-index="5">${esc(w.text.toLowerCase())}</div>`;
}).join("\n");

const cfg = { capTop: 1040, ...(existsSync("reel.json") ? JSON.parse(readFileSync("reel.json", "utf8")) : {}) };
const accent = /^#[0-9a-fA-F]{6}$/.test(perfil.cor_destaque || "") ? perfil.cor_destaque : "#F4E27C";
let html = readFileSync("src/index.template.html", "utf8")
  .replaceAll("__DUR__", dur.toFixed(3)).replace("__CAPTIONS__", caps).replaceAll("__CAP_TOP__", String(cfg.capTop)).replaceAll("__ACCENT__", accent);

// ---- emoji → PNG local (Twemoji, CC-BY 4.0)
const cache = join(motor, "emoji-cache");
mkdirSync(cache, { recursive: true });
const re = /(\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*|[\u{1F1E6}-\u{1F1FF}]{2})/gu;
const dentroTag = (s, idx) => s.lastIndexOf("<", idx) > s.lastIndexOf(">", idx);
html = html.replace(re, (m, _a, _b, idx, s) => {
  if (dentroTag(s, idx) || s.lastIndexOf("<script", idx) > s.lastIndexOf("</script>", idx) || s.lastIndexOf("<!--", idx) > s.lastIndexOf("-->", idx)) return m;
  const code = [...m].map((c) => c.codePointAt(0).toString(16)).filter((c) => c !== "fe0f").join("-");
  const file = join(cache, `${code}.png`);
  if (!existsSync(file)) {
    try { execFileSync("curl", ["-sfL", "-o", file, `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${code}.png`]); }
    catch { return m; }
  }
  mkdirSync("assets/emoji", { recursive: true });
  copyFileSync(file, `assets/emoji/${code}.png`);
  return `<img class="emo" src="assets/emoji/${code}.png" alt="">`;
});

writeFileSync("index.html", html);
const meta = JSON.parse(readFileSync("meta.json", "utf8"));
Object.assign(meta, { id: "reel", width: 1080, height: 1920, fps: 30 });
writeFileSync("meta.json", JSON.stringify(meta, null, 2));
const nEm = (caps.match(/class="w clip em/g) || []).length;
console.log(`index.html montado — ${dur.toFixed(2)}s, ${words.length} palavras, ${nEm} em serifa, destaque ${accent}`);

function lerPerfil() {
  for (const p of ["../../perfil.json", "perfil.json"]) { try { return JSON.parse(readFileSync(p, "utf8")); } catch {} }
  return {};
}
