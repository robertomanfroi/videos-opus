// Cria o projeto de um vídeo e faz a transcrição rápida (só para decidir o corte).
// Uso (na raiz da pasta EdicaoAutomatica):
//   node .claude/skills/_motor/novo-projeto.mjs "<video>" <slug> <pasta-da-skill-de-estilo>
// Cria video-projects/<slug>/ com assets/raw.mp4 (1080x1920 30fps), assets/raw.json (tempo por palavra),
// assets/palavras.txt (leitura humana com pausas), fontes e src/index.template.html do estilo.
import { execFileSync } from "node:child_process";
import { videoEncoder, filtroHDR, HWDEC } from "./encoder.mjs";
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { lerProjeto, marcarEtapa } from "./projeto.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";

const [src, slug, estiloDir] = process.argv.slice(2);
if (!src || !slug || !estiloDir) { console.error('uso: novo-projeto.mjs "<video>" <slug> <pasta-da-skill-de-estilo>'); process.exit(1); }
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { console.error("slug: só letras minúsculas, números e hífen"); process.exit(1); }
const motor = dirname(fileURLToPath(import.meta.url));
const estilo = resolve(estiloDir);
const proj = resolve("video-projects", slug);

if (!existsSync(src)) { console.error(`não achei o vídeo: ${src}`); process.exit(1); }
const st = statSync(src);
const origem = { origem: resolve(src), tamanho: st.size, mtime: st.mtimeMs };
const nomeEstilo = basename(estilo);

// estilo com criador próprio (ex.: estilo-anuncio/scripts/novo-anuncio.mjs) só entra por ele
const criador = existsSync(join(estilo, "scripts")) && readdirSync(join(estilo, "scripts")).find((f) => /^novo-.*\.mjs$/.test(f));
if (criador && process.env.EDICAO_VIA !== criador) {
  console.error(`PARE: o ${nomeEstilo} tem criador próprio. Use: node ${join(".claude/skills", nomeEstilo, "scripts", criador)} "<video>" ${slug}`);
  process.exit(1);
}
// nome já usado: só reaproveita se for o MESMO vídeo e o mesmo estilo (retomada); senão manda usar outro nome
if (existsSync(proj)) {
  const p = lerProjeto(proj);
  const mesmo = p && p.origem === origem.origem && p.tamanho === origem.tamanho && p.estilo === nomeEstilo;
  if (!mesmo) {
    let n = 2; while (existsSync(resolve("video-projects", `${slug}-${n}`))) n++;
    console.error(`PARE: já existe um projeto "${slug}" ${p ? `com outro vídeo ou estilo (${p.estilo}, ${basename(p.origem)})` : "sem registro de origem"}. Use "${slug}-${n}".`);
    process.exit(1);
  }
  console.log(`retomando o projeto "${slug}" (etapa: ${p.etapa})`);
}
if (!existsSync(proj)) execFileSync(process.execPath, ["scripts/new-video.mjs", slug], { stdio: "inherit" });
if (!lerProjeto(proj)) marcarEtapa(proj, "criado", { slug, estilo: nomeEstilo, ...origem, criado: new Date().toISOString() });
mkdirSync(join(proj, "src"), { recursive: true });
mkdirSync(join(proj, "assets", "prints"), { recursive: true });
if (existsSync(join(estilo, "template", "fonts"))) cpSync(join(estilo, "template", "fonts"), join(proj, "assets", "fonts"), { recursive: true });
if (!existsSync(join(proj, "src", "index.template.html"))) cpSync(join(estilo, "template", "index.template.html"), join(proj, "src", "index.template.html"));
if (existsSync(join(estilo, "template", "DESIGN.md"))) cpSync(join(estilo, "template", "DESIGN.md"), join(proj, "DESIGN.md"));

const a = join(proj, "assets");
if (!existsSync(join(a, "raw.mp4"))) {
  console.log("Preparando o vídeo (1080x1920)…");
  // o ffmpeg aplica a rotação do celular: sai em pé
  execFileSync("ffmpeg", ["-y", "-v", "error", ...HWDEC, "-i", src, "-map", "0:v:0", "-map", "0:a:0",
    "-vf", `${filtroHDR(src)}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`,
    ...videoEncoder(), "-r", "30", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", join(a, "raw.mp4")], { stdio: "inherit" });
}
const jaTranscrito = existsSync(join(a, "raw.json")) && statSync(join(a, "raw.json")).mtimeMs > statSync(join(a, "raw.mp4")).mtimeMs;
if (!jaTranscrito) {
console.log("Transcrevendo o vídeo — no seu computador pode levar alguns minutos…");
const nomes = lerNomes();
execFileSync(process.execPath, [join(motor, "transcrever.mjs"), join(a, "raw.mp4"), join(a, "raw.json"), "--rapido", "--quieto", ...(nomes ? ["--nomes", nomes] : [])],
  { stdio: ["ignore", "inherit", "inherit"] });
}
marcarEtapa(proj, "transcrito");

const t = JSON.parse(readFileSync(join(a, "raw.json"), "utf8"));
let out = "", linha = "", ls = 0, prev = 0;
for (const w of t.words) {
  if (w.start - prev > 0.5 || linha.length > 90) {
    if (linha) out += `${ls.toFixed(2).padStart(7)} ${linha}\n`;
    if (w.start - prev > 0.5) out += `        --- pausa ${(w.start - prev).toFixed(1)}s\n`;
    linha = ""; ls = w.start;
  }
  linha += `${w.text}@${w.start.toFixed(2)} `; prev = w.end;
}
out += `${ls.toFixed(2).padStart(7)} ${linha}\n`;
writeFileSync(join(a, "palavras.txt"), out);
console.log(`pronto: ${proj}  (duração ${t.audio_duration_secs}s, ${t.words.length} palavras; veja assets/palavras.txt)`);

function lerNomes() {
  try { const p = JSON.parse(readFileSync("perfil.json", "utf8")); return [p.nome, p.usuario, p.nicho, ...(p.termos || [])].filter(Boolean).join(", "); } catch { return ""; }
}
