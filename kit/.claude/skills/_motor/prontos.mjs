// Copia o vídeo final para a pasta "prontos" do kit e para "Vídeos editados" na Área de Trabalho, com um nome legível.
// Uso (na raiz da pasta EdicaoAutomatica): node .claude/skills/_motor/prontos.mjs <slug> [render.mp4]
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { marcarEtapa, marcarUltimo } from "./projeto.mjs";

const [slug, renderArg] = process.argv.slice(2);
if (!slug) { console.error("uso: prontos.mjs <slug> [render.mp4]"); process.exit(1); }
const proj = resolve("video-projects", slug);
const rendersDir = join(proj, "renders");
let render = renderArg ? resolve(renderArg) : null;
if (!render) {
  const mp4s = existsSync(rendersDir) ? readdirSync(rendersDir).filter((f) => f.endsWith(".mp4") && !f.includes(".parcial.")).map((f) => join(rendersDir, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs) : [];
  render = mp4s[0];
}
if (!render || !existsSync(render)) { console.error("nenhum render encontrado em " + rendersDir); process.exit(1); }
mkdirSync("prontos", { recursive: true });
const data = new Date();
const stamp = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
let destino = join("prontos", `${slug}-${stamp}.mp4`);
for (let n = 2; existsSync(destino); n++) destino = join("prontos", `${slug}-${stamp}-v${n}.mp4`);
// nunca entrega um arquivo quebrado
let dur = 0;
try { dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", render], { encoding: "utf8" }).trim()); } catch {}
if (!(dur > 1)) { console.error(`o render ${render} não abre ou está vazio — não entreguei`); process.exit(1); }
copyFileSync(render, destino);
// e uma cópia em "Vídeos editados" na Área de Trabalho real (pode estar no OneDrive), onde a aluna procura
let naMesa = null;
try {
  let mesa = null;
  if (process.platform === "win32") mesa = execFileSync("powershell", ["-NoProfile", "-Command", "[Environment]::GetFolderPath('Desktop')"], { encoding: "utf8" }).trim();
  if (mesa && existsSync(mesa)) {
    const pasta = join(mesa, "Vídeos editados");
    mkdirSync(pasta, { recursive: true });
    let alvo = join(pasta, `${slug}-${stamp}.mp4`);
    for (let n = 2; existsSync(alvo); n++) alvo = join(pasta, `${slug}-${stamp}-v${n}.mp4`);
    copyFileSync(render, alvo);
    naMesa = alvo;
  }
} catch {}
if (existsSync(join(proj, "projeto.json"))) marcarEtapa(proj, "entregue", { entregue: resolve(destino) });
marcarUltimo(".", { slug, arquivo: resolve(destino), duracao: +dur.toFixed(2), projeto: proj });
console.log(naMesa || resolve(destino));
