// Tira um quadro por beat de um render, com a ZONA SEGURA do Instagram desenhada, em folhas de contato para OLHAR.
// Uso (raiz do projeto):  node ../../.claude/skills/estilo-colagem/scripts/folha-beats.mjs renders/x.mp4 snapshots/beats 0.4 1.8 3.2 …
// Grava <prefixo>-1.jpg, -2.jpg … (8 quadros por folha, 270 px cada). Vermelho = zona segura (x 65–1015, y 270–1248).
import { execFileSync } from "node:child_process";
const [src, prefixo, ...tempos] = process.argv.slice(2);
if (!src || !prefixo || !tempos.length) { console.error("uso: folha-beats.mjs <video.mp4> <prefixo> t1 t2 …"); process.exit(1); }
const por = 8;
for (let s = 0; s * por < tempos.length; s++) {
  const ts = tempos.slice(s * por, s * por + por);
  const args = ["-v", "error", "-y"];
  ts.forEach((t) => args.push("-ss", t, "-i", src));
  const f = ts.map((t, i) => `[${i}]scale=270:480,drawbox=x=${65 / 4}:y=${270 / 4}:w=${950 / 4}:h=${978 / 4}:color=red@0.8:t=1,` +
    `drawbox=x=0:y=0:w=60:h=22:color=black@0.8:t=fill[v${i}]`).join(";");
  const pilha = ts.map((_, i) => `[v${i}]`).join("") + `hstack=inputs=${ts.length}`;
  args.push("-filter_complex", `${f};${ts.length > 1 ? pilha : "[v0]copy"}`, "-frames:v", "1", `${prefixo}-${s + 1}.jpg`);
  execFileSync("ffmpeg", args, { stdio: "inherit" });
  console.log(`${prefixo}-${s + 1}.jpg`, ts.join(" "));
}
