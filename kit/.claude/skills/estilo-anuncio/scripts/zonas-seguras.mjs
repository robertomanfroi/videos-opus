// Folha de contato do vídeo com a ÁREA SEGURA dos anúncios da Meta desenhada por cima (x 65–1015, y 270–1248).
// Rodar na raiz do projeto:  node ../../.claude/skills/estilo-anuncio/scripts/zonas-seguras.mjs <video.mp4> <saida.jpg> t1 t2 t3 …
// Olhe CADA quadro: nenhum texto, número, selo, CTA ou legenda pode passar das linhas vermelhas.
// As faixas sombreadas são o que a interface do Reels cobre (perfil e "Patrocinado" em cima; legenda do post e botão embaixo).
// Também serve para snapshots: passe um PNG de 1080×1920 no lugar do vídeo e um só tempo (0).
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [video, saida, ...tempos] = process.argv.slice(2);
if (!video || !saida || !tempos.length) { console.error("uso: zonas-seguras.mjs <video> <saida.jpg> t1 t2 …"); process.exit(1); }
const dir = mkdtempSync(join(tmpdir(), "seguras-"));
const caixa = [
  "drawbox=x=0:y=0:w=1080:h=269:color=red@0.22:t=fill",
  "drawbox=x=0:y=1249:w=1080:h=671:color=red@0.22:t=fill",
  "drawbox=x=0:y=269:w=65:h=980:color=red@0.22:t=fill",
  "drawbox=x=1015:y=269:w=65:h=980:color=red@0.22:t=fill",
  "drawbox=x=65:y=270:w=950:h=979:color=red:t=4",
].join(",");
tempos.forEach((t, i) => execFileSync("ffmpeg", ["-v", "error", "-y", ...(video.endsWith(".png") ? [] : ["-ss", t]), "-i", video, "-frames:v", "1",
  "-vf", `${caixa},scale=360:640`, "-update", "1", join(dir, `f${String(i).padStart(3, "0")}.png`)]));
const cols = Math.min(6, tempos.length), linhas = Math.ceil(tempos.length / cols);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", join(dir, "f%03d.png"), "-vf", `tile=${cols}x${linhas}:padding=6`, "-frames:v", "1", "-update", "1", saida]);
rmSync(dir, { recursive: true, force: true });
console.log(`folha de zonas seguras: ${saida} — quadros da esquerda para a direita, de cima para baixo: ${tempos.join(", ")} s`);
