// Acelera a voz e a imagem (padrão 1,05×) sem mudar o tom: cut.mp4 → clean.mp4.
// Rodar dentro de <projeto>/assets:  node ../../../.claude/skills/estilo-explicativo/scripts/acelerar.mjs [cut.mp4] [clean.mp4] [--vel 1.05]
// 1,05× é o ritmo de notícia: imperceptível como "acelerado", mas tira o ar de conversa lenta.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { videoEncoder } from "../../_motor/encoder.mjs";
import { marcarEtapa } from "../../_motor/projeto.mjs";

const args = process.argv.slice(2);
const iv = args.indexOf("--vel");
const vel = iv >= 0 ? Number(args[iv + 1]) : 1.05;
const pos = args.filter((a, i) => !a.startsWith("--") && i !== iv + 1);
const [ent = "cut.mp4", sai = "clean.mp4"] = pos;
if (!existsSync(ent)) { console.error(`não achei ${ent}: rode o corte-preciso.mjs antes`); process.exit(1); }
if (!(vel >= 0.5 && vel <= 2)) { console.error("--vel entre 0.5 e 2"); process.exit(1); }
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", ent, "-filter_complex", `[0:v]setpts=PTS/${vel}[v];[0:a]atempo=${vel}[a]`,
  "-map", "[v]", "-map", "[a]", ...videoEncoder(), "-r", "30", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", sai], { stdio: "inherit" });
const d = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", sai], { encoding: "utf8" }).trim();
console.log(`${sai} pronto — ${vel}× — ${Number(d).toFixed(2)}s`);
if (existsSync("../projeto.json")) marcarEtapa("..", "cortado", { corte: { duracao: Number(d), velocidade: vel } });
