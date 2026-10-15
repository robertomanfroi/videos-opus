// Cria o projeto de um ANÚNCIO e faz a transcrição rápida (só para decidir o corte).
// Uso (na raiz da pasta EdicaoAutomatica):
//   node .claude/skills/estilo-anuncio/scripts/novo-anuncio.mjs "<video>" <slug>
// Faz o mesmo que _motor/novo-projeto.mjs (raw.mp4, raw.json, palavras.txt, fontes, src/index.template.html = modelo de
// esquemas) e ainda: src/classico.template.html (modelo antigo, só se a aluna pedir), assets/img/bruto.jpg (quadro do
// vídeo para os cards de celular) e reel.json com a zona dos esquemas no padrão "topo".
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const [src, slug] = process.argv.slice(2);
if (!src || !slug) { console.error('uso: novo-anuncio.mjs "<video>" <slug>'); process.exit(1); }
const estilo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const motor = resolve(estilo, "..", "_motor");
execFileSync(process.execPath, [join(motor, "novo-projeto.mjs"), src, slug, estilo], { stdio: "inherit", env: { ...process.env, EDICAO_VIA: "novo-anuncio.mjs" } });

const proj = resolve("video-projects", slug);
const a = join(proj, "assets");
cpSync(join(estilo, "template", "classico.template.html"), join(proj, "src", "classico.template.html"));
mkdirSync(join(a, "img"), { recursive: true });
if (!existsSync(join(a, "img", "bruto.jpg")))
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", "3", "-i", join(a, "raw.mp4"), "-frames:v", "1", "-vf", "scale=360:640", "-q:v", "3", join(a, "img", "bruto.jpg")]);
if (!existsSync(join(proj, "reel.json")))
  writeFileSync(join(proj, "reel.json"), JSON.stringify({ faixa: "topo", zonaTop: 280, zonaAltura: 340, capTop: 1205 }, null, 1));
console.log("anúncio pronto para cortar: meça a cabeça (passo 2) e ajuste reel.json");
